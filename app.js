const sessionPattern = /^[a-f0-9]{32}$/;
const presenterPeerId = (sessionId) => `bc-${sessionId}`;
const transportModes = ['auto', 'direct', 'relay'];
const meteredStun = { urls: 'stun:stun.relay.metered.ca:80' };
const meteredTurn = [
  'turn:na.relay.metered.ca:80',
  'turn:na.relay.metered.ca:80?transport=tcp',
  'turn:na.relay.metered.ca:443',
  'turns:na.relay.metered.ca:443?transport=tcp'
].map((urls) => ({
  urls,
  username: 'a0e375338ea8d09189cd51e1',
  credential: 'HKpHBwSplvTspE6i'
}));

function createSessionId() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function transportMode() {
  const requested = new URL(window.location.href).searchParams.get('transport');
  return transportModes.includes(requested) ? requested : 'auto';
}

function peerOptions(mode) {
  return {
    config: {
      iceServers: mode === 'relay' ? [meteredTurn[3]] : [meteredStun, ...(mode === 'auto' ? meteredTurn : [])],
      iceTransportPolicy: mode === 'relay' ? 'relay' : 'all'
    }
  };
}

function getSessionId() {
  const url = new URL(window.location.href);
  let sessionId = url.searchParams.get('session');

  if (!sessionId || !sessionPattern.test(sessionId)) {
    sessionId = createSessionId();
    url.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', url);
  }

  return sessionId;
}

function remoteUrlFor(sessionId, mode) {
  const url = new URL('remote.html', window.location.href);
  url.searchParams.set('session', sessionId);
  url.searchParams.set('transport', mode);
  url.searchParams.set('v', '20261117-offline-notes');
  url.hash = '';
  return url.toString();
}

function setStatus(element, text, state) {
  if (!element) return;
  element.textContent = text;
  element.dataset.state = state || '';
}

function showToast(message) {
  const toast = document.getElementById('remote-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function setOverlayCollapsed(collapsed) {
  const overlay = document.getElementById('remote-overlay');
  const toggle = document.getElementById('remote-toggle');
  if (!overlay || !toggle) return;

  overlay.classList.toggle('is-collapsed', collapsed);
  toggle.setAttribute('aria-expanded', String(!collapsed));
}

function handleCommand(deck, data) {
  if (!data || typeof data !== 'object') return;
  switch (data.action) {
    case 'next':
      deck.next();
      break;
    case 'prev':
      deck.prev();
      break;
    case 'goto':
      if (Number.isInteger(data.h) && data.h >= 0 && data.h < deck.getTotalSlides()) {
        deck.slide(data.h, 0);
      }
      break;
    default:
      break;
  }
}

function slideStateFromElement(slide, h) {
  if (!slide || !Number.isSafeInteger(h) || h < 0) return null;

  const heading = slide.querySelector('h1, h2');
  const title = (heading?.innerText ?? heading?.textContent ?? '').trim().replace(/\s+/g, ' ') || `Slide ${h + 1}`;
  const slideText = Array.from(slide.querySelectorAll('h1, h2, p, li, figcaption'))
    .filter((element) => !element.closest('.remote-notes, [data-remote-exclude]'))
    .map((element) => (element.innerText ?? element.textContent ?? '').trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  const notes = Array.from(slide.querySelectorAll('.remote-notes li'), (item) => item.textContent.trim()).filter(Boolean);
  return { action: 'slide-state', h, title, slideText, notes };
}

function currentSlideState(deck) {
  return slideStateFromElement(deck.getCurrentSlide(), deck.getIndices().h);
}

async function loadLocalSlides() {
  const remoteUrl = new URL(window.location.href);
  const slideUrl = new URL('index.html', remoteUrl);
  if (remoteUrl.searchParams.has('v')) slideUrl.searchParams.set('v', remoteUrl.searchParams.get('v'));
  const response = await window.fetch(slideUrl);
  if (!response.ok) throw new Error(`HTML da apresentação indisponível (${response.status})`);
  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  page.querySelectorAll('br').forEach((breakElement) => breakElement.replaceWith(' '));
  const slides = Array.from(page.querySelectorAll('.reveal .slides > section'), slideStateFromElement);
  if (!slides.length || slides.some((slide) => !slide)) throw new Error('Nenhum slide encontrado no HTML da apresentação');
  return slides;
}

function sendSlideState(deck, connection) {
  if (!connection.open) return;
  const state = currentSlideState(deck);
  if (!state) return;
  try {
    connection.send(state);
  } catch (error) {
    console.error(error);
  }
}

function connectionTimeoutMessage(connection) {
  const iceState = connection.peerConnection?.iceConnectionState;
  if (iceState === 'failed') return 'Falha ICE entre os dispositivos (rede, NAT ou firewall); tentando novamente';
  if (iceState) return `Canal WebRTC não abriu (ICE: ${iceState}); tentando novamente`;
  return 'Sem resposta da apresentação no pareamento; confira os códigos de sessão';
}

function initializePresentation() {
  const deck = new Reveal({
    width: 1600,
    height: 900,
    margin: 0,
    hash: true,
    slideNumber: true,
    transition: 'slide',
    backgroundTransition: 'fade'
  });
  deck.initialize();

  const sessionId = getSessionId();
  const mode = transportMode();
  const pageUrl = new URL(window.location.href);
  if (pageUrl.searchParams.get('panel') === 'open') {
    setOverlayCollapsed(false);
    pageUrl.searchParams.delete('panel');
    window.history.replaceState({}, '', pageUrl);
  }
  const remoteUrl = remoteUrlFor(sessionId, mode);
  const status = document.getElementById('remote-status');
  const remoteLink = document.getElementById('remote-link');
  const modeSelect = document.getElementById('connection-mode');
  modeSelect.value = mode;
  modeSelect.addEventListener('change', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('session', createSessionId());
    url.searchParams.set('transport', modeSelect.value);
    url.searchParams.set('panel', 'open');
    window.location.assign(url.toString());
  });
  document.getElementById('session-id').textContent = sessionId;
  remoteLink.href = remoteUrl;
  remoteLink.textContent = remoteUrl;

  document.getElementById('remote-toggle')?.addEventListener('click', () => {
    setOverlayCollapsed(!document.getElementById('remote-overlay').classList.contains('is-collapsed'));
  });
  document.getElementById('remote-close')?.addEventListener('click', () => setOverlayCollapsed(true));

  const qrContainer = document.getElementById('remote-qr');
  if (qrContainer && window.QRious) {
    const canvas = document.createElement('canvas');
    qrContainer.replaceChildren(canvas);
    new QRious({ element: canvas, value: remoteUrl, size: 200, foreground: '#111827', background: '#ffffff', level: 'M' });
  } else if (qrContainer) {
    qrContainer.textContent = 'QR code indisponível';
  }

  if (!window.Peer) {
    setStatus(status, 'Biblioteca do controle remoto indisponível', 'error');
    return;
  }

  const connections = new Set();
  deck.on('slidechanged', () => {
    for (const connection of connections) sendSlideState(deck, connection);
  });
  const peer = new Peer(presenterPeerId(sessionId), peerOptions(mode));
  peer.on('open', () => setStatus(status, 'Aguardando controle remoto', 'ok'));
  peer.on('connection', (connection) => {
    connection.on('open', () => {
      connections.add(connection);
      setStatus(status, 'Controle remoto conectado', 'ok');
      setOverlayCollapsed(true);
      showToast('Controle remoto conectado');
      sendSlideState(deck, connection);
    });
    connection.on('data', (data) => {
      if (data?.action === 'ping') {
        if (connection.open) connection.send({ action: 'pong' });
        return;
      }
      handleCommand(deck, data);
    });
    connection.on('close', () => {
      connections.delete(connection);
      setStatus(status, connections.size ? 'Controle remoto conectado' : 'Aguardando controle remoto', 'ok');
    });
    connection.on('error', () => {
      connections.delete(connection);
      setStatus(status, 'Falha na conexão do controle', 'warn');
    });
  });
  peer.on('disconnected', () => {
    setStatus(status, 'Sinalização desconectada; tentando reconectar', 'warn');
    window.setTimeout(() => {
      if (!peer.destroyed && peer.disconnected) peer.reconnect();
    }, 2000);
  });
  peer.on('error', (error) => {
    setStatus(status, error.type === 'unavailable-id' ? 'Sessão já está em uso' : 'Falha no serviço de pareamento', 'error');
    console.error(error);
  });
}

function initializeRemote() {
  const sessionId = new URL(window.location.href).searchParams.get('session');
  const mode = transportMode();
  const feedback = document.getElementById('remote-feedback');
  const currentSlide = document.getElementById('remote-current-slide');
  const reading = document.querySelector('.remote-reading');
  const slideTextList = document.getElementById('remote-slide-text-list');
  const slideTextEmpty = document.getElementById('remote-slide-text-empty');
  const notesList = document.getElementById('remote-notes-list');
  const notesEmpty = document.getElementById('remote-notes-empty');
  const prevButton = document.getElementById('btn-prev');
  const nextButton = document.getElementById('btn-next');
  const gotoButton = document.getElementById('btn-goto');
  let connection = null;
  let localSlides = [];
  let localIndex = 0;
  let lastPresentedIndex = null;
  let showingLiveState = false;
  let localLoadError = false;

  function updateNavigation() {
    const connected = Boolean(connection?.open);
    prevButton.disabled = !connected && (!localSlides.length || localIndex === 0);
    nextButton.disabled = !connected && (!localSlides.length || localIndex === localSlides.length - 1);
    gotoButton.disabled = !connected && !localSlides.length;
  }

  function clearSlideState(message) {
    currentSlide.textContent = 'Slide atual indisponível';
    reading.scrollTop = 0;
    slideTextList.replaceChildren();
    slideTextEmpty.textContent = message;
    slideTextEmpty.hidden = false;
    notesList.replaceChildren();
    notesList.hidden = true;
    notesEmpty.textContent = message;
    notesEmpty.hidden = false;
  }

  function renderSlideState(data, local = false) {
    if (!Number.isSafeInteger(data.h) || data.h < 0 || typeof data.title !== 'string' ||
        (data.slideText !== undefined && (!Array.isArray(data.slideText) || data.slideText.length > 40 ||
          data.slideText.some((text) => typeof text !== 'string' || text.length > 1000))) ||
        !Array.isArray(data.notes) || data.notes.length > 20 ||
        data.notes.some((note) => typeof note !== 'string' || note.length > 1000)) return false;

    currentSlide.textContent = `${local ? 'Consulta local · ' : ''}Slide ${data.h + 1} · ${data.title}`;
    const textBlocks = (data.slideText ?? []).map((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    });
    slideTextList.replaceChildren(...textBlocks);
    slideTextEmpty.textContent = data.slideText === undefined
      ? 'Texto indisponível. Atualize a apresentação.'
      : 'Sem texto neste slide.';
    slideTextEmpty.hidden = textBlocks.length > 0;
    const items = data.notes.map((note) => {
      const item = document.createElement('li');
      item.textContent = note;
      return item;
    });
    notesList.replaceChildren(...items);
    notesList.hidden = items.length === 0;
    notesEmpty.textContent = 'Sem notas para este slide.';
    notesEmpty.hidden = items.length > 0;
    reading.scrollTop = 0;
    return true;
  }

  function showLocalSlide() {
    if (localSlides.length) renderSlideState(localSlides[localIndex], true);
    else clearSlideState(localLoadError ? 'Notas locais indisponíveis. Verifique o acesso à apresentação.' : 'Carregando notas para consulta local...');
    updateNavigation();
  }

  function navigateLocal(action, h) {
    if (!localSlides.length) return;
    const nextIndex = action === 'next' ? localIndex + 1 : action === 'prev' ? localIndex - 1 : h;
    if (!Number.isSafeInteger(nextIndex) || nextIndex < 0 || nextIndex >= localSlides.length) {
      if (action === 'goto') setStatus(feedback, 'Slide fora da consulta local', 'warn');
      return;
    }
    localIndex = nextIndex;
    showLocalSlide();
  }

  prevButton.addEventListener('click', () => send('prev'));
  nextButton.addEventListener('click', () => send('next'));
  gotoButton.addEventListener('click', () => {
    const raw = document.getElementById('goto-slide').value;
    const slideNumber = Number(raw);
    if (!Number.isSafeInteger(slideNumber) || slideNumber < 1) {
      setStatus(feedback, 'Informe um número de slide válido.', 'error');
      return;
    }
    send('goto', { h: slideNumber - 1 });
  });

  showLocalSlide();
  loadLocalSlides().then((slides) => {
    localSlides = slides;
    if (lastPresentedIndex !== null && lastPresentedIndex < slides.length) localIndex = lastPresentedIndex;
    if (!showingLiveState) showLocalSlide();
    else updateNavigation();
  }).catch((error) => {
    console.error(error);
    localLoadError = true;
    if (!showingLiveState) showLocalSlide();
  });

  if (!sessionId || !sessionPattern.test(sessionId)) {
    setStatus(feedback, 'Sessão ausente ou inválida. Abra o QR code da apresentação.', 'error');
    return;
  }
  document.getElementById('remote-session-id').textContent = sessionId;
  document.getElementById('remote-mode').textContent = {
    auto: 'Automático (direto → TURN)',
    direct: 'Direto (sem TURN)',
    relay: 'Somente TURN (TLS/443)'
  }[mode];

  if (!window.Peer) {
    setStatus(feedback, 'Biblioteca do controle remoto indisponível', 'error');
    return;
  }

  const peer = new Peer(peerOptions(mode));
  let retryTimer = 0;
  let connectTimeout = 0;
  let heartbeatId = 0;

  function scheduleReconnect() {
    if (retryTimer || peer.destroyed) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = 0;
      if (peer.disconnected) peer.reconnect();
      else connect();
    }, 2000);
  }

  function connectionLost(candidate, message) {
    if (connection !== candidate) return;
    connection = null;
    window.clearTimeout(connectTimeout);
    window.clearInterval(heartbeatId);
    heartbeatId = 0;
    setStatus(feedback, message, 'warn');
    showingLiveState = false;
    showLocalSlide();
    scheduleReconnect();
  }

  function connect() {
    if (peer.disconnected || peer.destroyed || connection?.open) return;
    setStatus(feedback, 'Conectando à apresentação...', 'warn');
    const candidate = peer.connect(presenterPeerId(sessionId));
    connection = candidate;
    let lastPong = 0;
    connectTimeout = window.setTimeout(() => {
      if (connection !== candidate || candidate.open) return;
      const message = connectionTimeoutMessage(candidate);
      connectionLost(candidate, message);
      candidate.close();
    }, 20000);

    candidate.on('open', () => {
      if (connection !== candidate) return;
      window.clearTimeout(connectTimeout);
      updateNavigation();
      setStatus(feedback, 'Conectado. Controle pronto.', 'ok');
      lastPong = Date.now();
      heartbeatId = window.setInterval(() => {
        if (connection !== candidate || !candidate.open) return;
        if (Date.now() - lastPong > 9000) {
          connectionLost(candidate, 'Apresentação não responde; tentando novamente');
          candidate.close();
          return;
        }
        try {
          candidate.send({ action: 'ping' });
        } catch (error) {
          connectionLost(candidate, 'Conexão perdida; tentando novamente');
          candidate.close();
        }
      }, 3000);
    });
    candidate.on('data', (data) => {
      if (connection !== candidate) return;
      if (data?.action === 'pong') lastPong = Date.now();
      if (data?.action === 'slide-state' && renderSlideState(data)) {
        showingLiveState = true;
        lastPresentedIndex = data.h;
        if (data.h < localSlides.length) localIndex = data.h;
      }
    });
    candidate.on('close', () => connectionLost(candidate, 'Conexão perdida; tentando novamente'));
    candidate.on('error', () => {
      connectionLost(candidate, 'Falha na conexão; tentando novamente');
      candidate.close();
    });
  }

  peer.on('open', connect);
  peer.on('disconnected', () => {
    if (!connection?.open) {
      setStatus(feedback, 'Sinalização desconectada; tentando novamente', 'warn');
      showingLiveState = false;
      showLocalSlide();
    }
    scheduleReconnect();
  });
  peer.on('error', (error) => {
    if (connection?.open) return;
    const message = error.type === 'peer-unavailable'
      ? 'Sessão não localizada no PeerJS; confira os códigos de sessão'
      : `Falha no pareamento (${error.type || 'desconhecida'}); tentando novamente`;
    if (connection) {
      const candidate = connection;
      connectionLost(candidate, message);
      candidate.close();
    } else {
      setStatus(feedback, message, 'warn');
      scheduleReconnect();
    }
  });

  function send(action, extra = {}) {
    if (!connection?.open) {
      navigateLocal(action, extra.h);
      return;
    }
    try {
      connection.send({ action, ...extra });
      setStatus(feedback, 'Comando enviado', 'ok');
    } catch (error) {
      setStatus(feedback, 'Falha ao enviar comando', 'error');
      console.error(error);
    }
  }

}

if (document.body.classList.contains('presentation-page')) initializePresentation();
if (document.body.classList.contains('remote-page')) initializeRemote();
