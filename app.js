const sessionPattern = /^[a-f0-9]{32}$/;
const presenterPeerId = (sessionId) => `bc-${sessionId}`;

function getSessionId() {
  const url = new URL(window.location.href);
  let sessionId = url.searchParams.get('session');

  if (!sessionId || !sessionPattern.test(sessionId)) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    sessionId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    url.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', url);
  }

  return sessionId;
}

function remoteUrlFor(sessionId) {
  const url = new URL('remote.html', window.location.href);
  url.searchParams.set('session', sessionId);
  url.searchParams.set('v', '20261020-cover-fr');
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
  const remoteUrl = remoteUrlFor(sessionId);
  const status = document.getElementById('remote-status');
  const remoteLink = document.getElementById('remote-link');
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
  const peer = new Peer(presenterPeerId(sessionId));
  peer.on('open', () => setStatus(status, 'Aguardando controle remoto', 'ok'));
  peer.on('connection', (connection) => {
    connection.on('open', () => {
      connections.add(connection);
      setStatus(status, 'Controle remoto conectado', 'ok');
      setOverlayCollapsed(true);
      showToast('Controle remoto conectado');
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
  const feedback = document.getElementById('remote-feedback');
  if (!sessionId || !sessionPattern.test(sessionId)) {
    setStatus(feedback, 'Sessão ausente ou inválida. Abra o QR code da apresentação.', 'error');
    return;
  }
  document.getElementById('remote-session-id').textContent = sessionId;

  if (!window.Peer) {
    setStatus(feedback, 'Biblioteca do controle remoto indisponível', 'error');
    return;
  }

  const buttons = ['btn-next', 'btn-prev', 'btn-goto'].map((id) => document.getElementById(id));
  const setConnected = (connected) => buttons.forEach((button) => { button.disabled = !connected; });
  const peer = new Peer();
  let connection = null;
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
    window.clearTimeout(connectTimeout);
    window.clearInterval(heartbeatId);
    heartbeatId = 0;
    setConnected(false);
    setStatus(feedback, message, 'warn');
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
      candidate.close();
      connectionLost(candidate, message);
    }, 20000);

    candidate.on('open', () => {
      if (connection !== candidate) return;
      window.clearTimeout(connectTimeout);
      setConnected(true);
      setStatus(feedback, 'Conectado. Controle pronto.', 'ok');
      lastPong = Date.now();
      heartbeatId = window.setInterval(() => {
        if (connection !== candidate || !candidate.open) return;
        if (Date.now() - lastPong > 9000) {
          candidate.close();
          connectionLost(candidate, 'Apresentação não responde; tentando novamente');
          return;
        }
        try {
          candidate.send({ action: 'ping' });
        } catch (error) {
          candidate.close();
          connectionLost(candidate, 'Conexão perdida; tentando novamente');
        }
      }, 3000);
    });
    candidate.on('data', (data) => {
      if (connection === candidate && data?.action === 'pong') lastPong = Date.now();
    });
    candidate.on('close', () => connectionLost(candidate, 'Conexão perdida; tentando novamente'));
    candidate.on('error', () => connectionLost(candidate, 'Falha na conexão; tentando novamente'));
  }

  peer.on('open', connect);
  peer.on('disconnected', () => {
    if (!connection?.open) {
      setConnected(false);
      setStatus(feedback, 'Sinalização desconectada; tentando novamente', 'warn');
    }
    scheduleReconnect();
  });
  peer.on('error', (error) => {
    if (connection?.open) return;
    const message = error.type === 'peer-unavailable'
      ? 'Sessão não localizada no PeerJS; confira os códigos de sessão'
      : `Falha no pareamento (${error.type || 'desconhecida'}); tentando novamente`;
    if (connection) {
      connection.close();
      connectionLost(connection, message);
    } else {
      setStatus(feedback, message, 'warn');
      scheduleReconnect();
    }
  });

  function send(action, extra = {}) {
    if (!connection?.open) {
      setStatus(feedback, 'Controle desconectado', 'warn');
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

  document.getElementById('btn-next').addEventListener('click', () => send('next'));
  document.getElementById('btn-prev').addEventListener('click', () => send('prev'));
  document.getElementById('btn-goto').addEventListener('click', () => {
    const raw = document.getElementById('goto-slide').value;
    const slideNumber = Number(raw);
    if (!Number.isSafeInteger(slideNumber) || slideNumber < 1) {
      setStatus(feedback, 'Informe um número de slide válido.', 'error');
      return;
    }
    send('goto', { h: slideNumber - 1 });
  });
}

if (document.body.classList.contains('presentation-page')) initializePresentation();
if (document.body.classList.contains('remote-page')) initializeRemote();
