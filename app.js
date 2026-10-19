const config = window.PRESENTATION_CONFIG || {};
const channelPrefix = config.channelPrefix || 'brazilian-culture:';
const sessionPattern = /^[a-f0-9]{24}$/;

function getSessionId() {
  const url = new URL(window.location.href);
  let sessionId = url.searchParams.get('session');

  if (!sessionId || !sessionPattern.test(sessionId)) {
    const bytes = new Uint8Array(12);
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

function createClient(authUrl, status) {
  if (!authUrl) {
    setStatus(status, 'Controle remoto não configurado', 'warn');
    return null;
  }
  if (!window.Ably) {
    setStatus(status, 'Biblioteca Ably indisponível', 'error');
    return null;
  }

  try {
    return new Ably.Realtime({ authUrl });
  } catch (error) {
    setStatus(status, 'Falha ao iniciar conexão', 'error');
    console.error(error);
    return null;
  }
}

function initializePresentation() {
  const deck = new Reveal({
    hash: true,
    slideNumber: true,
    transition: 'slide',
    backgroundTransition: 'fade'
  });
  deck.initialize();

  const sessionId = getSessionId();
  const remoteUrl = remoteUrlFor(sessionId);
  const sessionElement = document.getElementById('session-id');
  const remoteLink = document.getElementById('remote-link');
  const status = document.getElementById('ably-status');

  sessionElement.textContent = sessionId;
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

  const client = createClient(config.presentationAuthUrl, status);
  if (!client) return;

  const channel = client.channels.get(`${channelPrefix}${sessionId}`);
  client.connection.on('connected', () => setStatus(status, 'Conectado', 'ok'));
  client.connection.on('connecting', () => setStatus(status, 'Conectando...', 'warn'));
  client.connection.on('disconnected', () => setStatus(status, 'Desconectado', 'warn'));
  client.connection.on('suspended', () => setStatus(status, 'Conexão suspensa', 'warn'));
  client.connection.on('failed', () => setStatus(status, 'Falha de autenticação ou conexão', 'error'));

  channel.subscribe('presence', (message) => {
    if (message?.data?.action === 'remote-connected') {
      setOverlayCollapsed(true);
      showToast('Controle remoto conectado');
    }
  });

  channel.subscribe('command', (message) => {
    const data = message?.data || {};
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
        console.warn('Comando desconhecido', data);
    }
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
  const client = createClient(config.remoteAuthUrl, feedback);
  if (!client) return;

  const channel = client.channels.get(`${channelPrefix}${sessionId}`);
  const buttons = ['btn-next', 'btn-prev', 'btn-goto'].map((id) => document.getElementById(id));
  const setConnected = (connected) => buttons.forEach((button) => { button.disabled = !connected; });

  client.connection.on('connected', () => {
    setConnected(true);
    setStatus(feedback, 'Conectado. Controle pronto.', 'ok');
    channel.publish('presence', { action: 'remote-connected' });
  });
  client.connection.on('connecting', () => {
    setConnected(false);
    setStatus(feedback, 'Conectando...', 'warn');
  });
  client.connection.on('disconnected', () => {
    setConnected(false);
    setStatus(feedback, 'Desconectado', 'warn');
  });
  client.connection.on('suspended', () => {
    setConnected(false);
    setStatus(feedback, 'Conexão suspensa', 'warn');
  });
  client.connection.on('failed', () => {
    setConnected(false);
    setStatus(feedback, 'Falha de autenticação ou conexão', 'error');
  });

  function publish(action, extra = {}) {
    channel.publish('command', { action, ...extra }, (error) => {
      setStatus(feedback, error ? `Falha ao enviar: ${error.message || error}` : 'Comando enviado', error ? 'error' : 'ok');
    });
  }

  document.getElementById('btn-next').addEventListener('click', () => publish('next'));
  document.getElementById('btn-prev').addEventListener('click', () => publish('prev'));
  document.getElementById('btn-goto').addEventListener('click', () => {
    const raw = document.getElementById('goto-slide').value;
    const slideNumber = Number(raw);
    if (!Number.isSafeInteger(slideNumber) || slideNumber < 1) {
      setStatus(feedback, 'Informe um número de slide válido.', 'error');
      return;
    }
    publish('goto', { h: slideNumber - 1 });
  });
}

if (document.body.classList.contains('presentation-page')) initializePresentation();
if (document.body.classList.contains('remote-page')) initializeRemote();
