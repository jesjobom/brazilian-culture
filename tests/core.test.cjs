const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function runPage(kind, search = '', peerAvailable = true) {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      const classes = new Set(id === 'remote-overlay' ? ['is-collapsed'] : []);
      elements.set(id, {
        dataset: {}, disabled: true, hidden: false, value: '', textContent: '', listeners: {},
        classList: {
          contains: (name) => classes.has(name),
          add: (name) => classes.add(name),
          remove: (name) => classes.delete(name),
          toggle: (name, force) => force ? classes.add(name) : classes.delete(name)
        },
        setAttribute(name, value) { this[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        replaceChildren(...children) { this.children = children; }
      });
    }
    return elements.get(id);
  };

  class MockConnection {
    constructor(peerId) { this.peerId = peerId; this.events = {}; this.sent = []; this.open = false; }
    on(name, callback) { this.events[name] = callback; }
    emit(name, value) {
      if (name === 'open') this.open = true;
      if (name === 'close') this.open = false;
      this.events[name]?.(value);
    }
    send(data) { this.sent.push(data); }
    close() { this.emit('close'); }
  }

  const peers = [];
  class MockPeer {
    constructor(id, options) {
      this.id = typeof id === 'string' ? id : undefined;
      this.options = typeof id === 'string' ? options : id;
      this.events = {}; this.connections = []; this.disconnected = false; this.destroyed = false; peers.push(this);
    }
    on(name, callback) { this.events[name] = callback; }
    emit(name, value) { this.events[name]?.(value); }
    connect(id) { const connection = new MockConnection(id); this.connections.push(connection); return connection; }
    reconnect() { this.disconnected = false; this.emit('open', this.id); }
  }

  const slides = [
    { title: 'Capa', text: ['Capa', 'Pequenas coisas do Brasil.'], notes: ['Apresentar o tema.'] },
    { title: 'Diversidade', text: ['Diversidade\n brasileira', 'Muitas origens.', 'Japonaises', 'Tailles indicatives.'], excludedText: ['Japonaises', 'Tailles indicatives.'], notes: ['Primeiro ponto.', 'Segundo ponto.'] },
    { title: 'Sem notas', text: ['Sem notas'], notes: [] },
    { title: 'Último slide', text: ['Último slide'], notes: ['Encerrar.'] }
  ].map(({ title, text, excludedText = [], notes }) => ({
    querySelector() { return { textContent: title }; },
    querySelectorAll(selector) {
      const noteElements = notes.map((note) => ({ textContent: note, closest: () => ({}) }));
      if (selector === '.remote-notes li') return noteElements;
      return [...text.map((value) => ({ innerText: value, closest: (selector) =>
        excludedText.includes(value) && selector.includes('[data-remote-exclude]') ? {} : null })), ...noteElements];
    }
  }));
  const deckEvents = {};
  const deck = {
    nextCount: 0, prevCount: 0, currentIndex: 0,
    initialize() {},
    on(name, callback) { deckEvents[name] = callback; },
    emit(name) { deckEvents[name]?.(); },
    next() { this.nextCount += 1; this.currentIndex = Math.min(this.currentIndex + 1, slides.length - 1); this.emit('slidechanged'); },
    prev() { this.prevCount += 1; this.currentIndex = Math.max(this.currentIndex - 1, 0); this.emit('slidechanged'); },
    slide(index) { this.lastSlide = index; this.currentIndex = index; this.emit('slidechanged'); },
    getTotalSlides() { return slides.length; },
    getCurrentSlide() { return slides[this.currentIndex]; },
    getIndices() { return { h: this.currentIndex, v: 0 }; }
  };
  const location = {
    href: `https://example.test/${kind === 'remote' ? 'remote' : 'index'}.html${search}`,
    assign(url) { this.href = String(url); }
  };
  const intervals = [];
  const timeouts = [];
  const errors = [];
  let resolveLocalFetch;
  let requestedLocalUrl;
  const localFetch = new Promise((resolve) => { resolveLocalFetch = resolve; });
  let now = 0;
  const window = {
    location,
    history: { replaceState(_state, _title, url) { location.href = String(url); } },
    crypto: { getRandomValues(bytes) { bytes.fill(10); } },
    Peer: peerAvailable ? MockPeer : undefined,
    QRious: class {},
    fetch(url) { requestedLocalUrl = String(url); return localFetch; },
    clearTimeout(id) { if (timeouts[id - 1]) timeouts[id - 1].cleared = true; },
    setTimeout(callback, delay) { timeouts.push({ callback, delay, cleared: false }); return timeouts.length; },
    setInterval(callback) { intervals.push(callback); return intervals.length; },
    clearInterval() {}
  };

  vm.runInNewContext(source, {
    window,
    document: {
      body: { classList: { contains: (name) => name === `${kind}-page` } },
      getElementById: getElement,
      querySelector: getElement,
      createElement: () => ({})
    },
    Reveal: class { constructor() { return deck; } },
    QRious: window.QRious,
    Peer: MockPeer,
    DOMParser: class {
      parseFromString() {
        return { querySelectorAll: (selector) => selector === '.reveal .slides > section' ? slides : [] };
      }
    },
    URL, Uint8Array, Date: { now: () => now }, console: { error: (error) => errors.push(error) }
  }, { filename: 'app.js' });

  return {
    getElement, peers, deck, location, MockConnection, errors,
    async resolveLocalSlides(response = { ok: true, text: async () => '<html></html>' }) {
      resolveLocalFetch(response);
      await new Promise(setImmediate);
      return requestedLocalUrl;
    },
    advance(milliseconds) { now += milliseconds; intervals.forEach((callback) => callback()); },
    runTimeout(delay) {
      const timeout = timeouts.find((item) => item.delay === delay && !item.cleared);
      assert.ok(timeout, `No active timeout for ${delay}ms`);
      timeout.cleared = true;
      timeout.callback();
    }
  };
}

test('apresentação cria sessão e QR para o mesmo controle sem configuração', () => {
  const page = runPage('presentation');
  const session = new URL(page.location.href).searchParams.get('session');
  assert.equal(session, '0a'.repeat(16));
  assert.equal(new URL(page.getElement('remote-link').href).searchParams.get('session'), session);
  assert.equal(new URL(page.getElement('remote-link').href).searchParams.get('v'), '20261117-offline-notes');
  assert.equal(new URL(page.getElement('remote-link').href).searchParams.get('transport'), 'auto');
  assert.equal(page.getElement('remote-qr').children.length, 1);
  assert.equal(page.peers[0].id, `bc-${session}`);
  assert.equal(page.getElement('connection-mode').value, 'auto');
  assert.equal(page.peers[0].options.config.iceServers.length, 5);
  page.peers[0].emit('open');
  assert.match(page.getElement('remote-status').textContent, /Aguardando/);
});

test('seleção sincroniza o modo de conexão entre apresentação, QR e controle', () => {
  const session = 'ab'.repeat(16);
  const presenter = runPage('presentation', `?session=${session}&transport=direct`);
  assert.equal(presenter.getElement('connection-mode').value, 'direct');
  assert.equal(presenter.peers[0].options.config.iceServers.length, 1);
  assert.equal(new URL(presenter.getElement('remote-link').href).searchParams.get('transport'), 'direct');

  presenter.getElement('connection-mode').value = 'relay';
  presenter.getElement('connection-mode').listeners.change();
  const switchedUrl = new URL(presenter.location.href);
  assert.notEqual(switchedUrl.searchParams.get('session'), session);
  assert.equal(switchedUrl.searchParams.get('transport'), 'relay');
  assert.equal(switchedUrl.searchParams.get('panel'), 'open');
  const switchedPresenter = runPage('presentation', switchedUrl.search);
  assert.equal(switchedPresenter.getElement('remote-overlay').classList.contains('is-collapsed'), false);
  assert.equal(new URL(switchedPresenter.location.href).searchParams.has('panel'), false);
  assert.equal(new URL(switchedPresenter.getElement('remote-link').href).searchParams.get('session'), switchedUrl.searchParams.get('session'));

  const relayPresenter = runPage('presentation', `?session=${session}&transport=relay`);
  const relayUrl = new URL(relayPresenter.getElement('remote-link').href);
  assert.equal(relayUrl.searchParams.get('transport'), 'relay');
  assert.equal(relayPresenter.peers[0].options.config.iceTransportPolicy, 'relay');
  assert.equal(relayPresenter.peers[0].options.config.iceServers.length, 1);
  assert.equal(relayPresenter.peers[0].options.config.iceServers[0].urls, 'turns:na.relay.metered.ca:443?transport=tcp');
  const remote = runPage('remote', `?session=${session}&transport=relay`);
  assert.equal(remote.peers[0].options.config.iceTransportPolicy, 'relay');
  assert.equal(remote.getElement('remote-mode').textContent, 'Somente TURN (TLS/443)');
});

test('apresentação aceita somente comandos de navegação válidos', () => {
  const page = runPage('presentation', `?session=${'ab'.repeat(16)}`);
  const connection = new page.MockConnection('remote');
  page.peers[0].emit('connection', connection);
  connection.emit('open');
  for (const data of [{ action: 'next' }, { action: 'prev' }, { action: 'goto', h: 3 }, { action: 'goto', h: 99 }, { action: 'goto', h: '1' }]) {
    connection.emit('data', data);
  }
  assert.equal(page.deck.nextCount, 1);
  assert.equal(page.deck.prevCount, 1);
  assert.equal(page.deck.lastSlide, 3);
});

test('apresentação envia texto visível e notas ao conectar e após navegação local ou remota', () => {
  const page = runPage('presentation', `?session=${'ab'.repeat(16)}`);
  const connection = new page.MockConnection('remote');
  page.peers[0].emit('connection', connection);
  connection.emit('open');
  assert.equal(JSON.stringify(connection.sent[0]), JSON.stringify({
    action: 'slide-state', h: 0, title: 'Capa', slideText: ['Capa', 'Pequenas coisas do Brasil.'], notes: ['Apresentar o tema.']
  }));

  page.deck.slide(1);
  assert.equal(JSON.stringify(connection.sent[1]), JSON.stringify({
    action: 'slide-state', h: 1, title: 'Diversidade', slideText: ['Diversidade brasileira', 'Muitas origens.'], notes: ['Primeiro ponto.', 'Segundo ponto.']
  }));
  connection.emit('data', { action: 'next' });
  assert.equal(JSON.stringify(connection.sent[2]), JSON.stringify({
    action: 'slide-state', h: 2, title: 'Sem notas', slideText: ['Sem notas'], notes: []
  }));
});

test('controle conectado envia comandos à apresentação', () => {
  const page = runPage('remote', `?session=${'cd'.repeat(16)}`);
  assert.equal(page.getElement('btn-next').disabled, true);
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  assert.equal(connection.peerId, `bc-${'cd'.repeat(16)}`);
  connection.emit('open');
  assert.equal(page.getElement('btn-next').disabled, false);
  page.getElement('btn-next').listeners.click();
  page.getElement('goto-slide').value = '2';
  page.getElement('btn-goto').listeners.click();
  page.getElement('goto-slide').value = '2abc';
  page.getElement('btn-goto').listeners.click();
  assert.equal(JSON.stringify(connection.sent), JSON.stringify([{ action: 'next' }, { action: 'goto', h: 1 }]));
  connection.emit('close');
  assert.equal(page.getElement('btn-next').disabled, true);
});

test('controle mostra o estado sincronizado e volta à consulta local após desconexão', async () => {
  const page = runPage('remote', `?session=${'cd'.repeat(16)}`);
  assert.equal(await page.resolveLocalSlides(), `https://example.test/index.html`);
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 1 · Capa');
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  connection.emit('data', { action: 'slide-state', h: 1, title: 'Diversidade', slideText: ['Diversidade brasileira', 'Muitas origens.'], notes: ['Primeiro ponto.', 'Segundo ponto.'] });
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 2 · Diversidade');
  assert.deepEqual(page.getElement('remote-slide-text-list').children.map((item) => item.textContent), ['Diversidade brasileira', 'Muitas origens.']);
  assert.equal(page.getElement('remote-slide-text-empty').hidden, true);
  assert.equal(page.getElement('remote-notes-list').hidden, false);
  assert.deepEqual(page.getElement('remote-notes-list').children.map((item) => item.textContent), ['Primeiro ponto.', 'Segundo ponto.']);
  assert.equal(page.getElement('remote-notes-empty').hidden, true);

  page.getElement('.remote-reading').scrollTop = 200;
  connection.emit('data', { action: 'slide-state', h: 2, title: 'Sem notas', slideText: ['Sem notas'], notes: [] });
  assert.equal(page.getElement('.remote-reading').scrollTop, 0);

  connection.emit('close');
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 3 · Sem notas');
  assert.equal(page.getElement('btn-next').disabled, false);
  page.getElement('btn-next').listeners.click();
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 4 · Último slide');
  assert.equal(page.getElement('btn-next').disabled, true);
  assert.equal(connection.sent.some((item) => item.action === 'next'), false);

  page.runTimeout(2000);
  const reconnected = page.peers[0].connections[1];
  reconnected.emit('open');
  reconnected.emit('data', { action: 'slide-state', h: 1, title: 'Diversidade', slideText: ['Texto projetado'], notes: ['Nota atual'] });
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 2 · Diversidade');
  assert.deepEqual(page.getElement('remote-notes-list').children.map((item) => item.textContent), ['Nota atual']);
  assert.equal(reconnected.sent.some((item) => item.action === 'goto'), false);
});

test('sem pareamento, controle navega localmente inclusive por número sem mover a apresentação', async () => {
  const page = runPage('remote', `?session=${'de'.repeat(16)}&v=20261117-offline-notes`);
  assert.equal(await page.resolveLocalSlides(), 'https://example.test/index.html?v=20261117-offline-notes');
  assert.equal(page.getElement('btn-prev').disabled, true);
  assert.equal(page.getElement('btn-next').disabled, false);
  page.peers[0].emit('open');
  page.peers[0].emit('error', { type: 'peer-unavailable' });
  page.getElement('btn-next').listeners.click();
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 2 · Diversidade');
  assert.deepEqual(page.getElement('remote-notes-list').children.map((item) => item.textContent), ['Primeiro ponto.', 'Segundo ponto.']);
  page.getElement('goto-slide').value = '4';
  page.getElement('btn-goto').listeners.click();
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 4 · Último slide');
  assert.equal(page.getElement('btn-next').disabled, true);
  page.getElement('btn-next').listeners.click();
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 4 · Último slide');
  assert.equal(page.peers[0].connections[0].sent.length, 0);
});

test('consulta local funciona sem biblioteca ou sessão e informa falha ao carregar conteúdo', async () => {
  const missingLibrary = runPage('remote', `?session=${'ef'.repeat(16)}`, false);
  await missingLibrary.resolveLocalSlides();
  missingLibrary.getElement('btn-next').listeners.click();
  assert.equal(missingLibrary.getElement('remote-current-slide').textContent, 'Consulta local · Slide 2 · Diversidade');

  const invalidSession = runPage('remote', '?session=invalid');
  await invalidSession.resolveLocalSlides();
  invalidSession.getElement('btn-next').listeners.click();
  assert.equal(invalidSession.getElement('remote-current-slide').textContent, 'Consulta local · Slide 2 · Diversidade');

  const failedLoad = runPage('remote', '?session=invalid');
  await failedLoad.resolveLocalSlides({ ok: false, status: 503 });
  assert.match(failedLoad.getElement('remote-slide-text-empty').textContent, /Notas locais indisponíveis/);
  assert.equal(failedLoad.getElement('btn-next').disabled, true);
  assert.match(failedLoad.errors[0].message, /503/);
});

test('carregamento local tardio não substitui o slide sincronizado', async () => {
  const page = runPage('remote', `?session=${'ab'.repeat(16)}`);
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  connection.emit('data', { action: 'slide-state', h: 2, title: 'Ao vivo', slideText: ['Texto atual'], notes: ['Nota atual'] });
  await page.resolveLocalSlides();
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 3 · Ao vivo');
  connection.emit('close');
  assert.equal(page.getElement('remote-current-slide').textContent, 'Consulta local · Slide 3 · Sem notas');
});

test('falha no conteúdo local não impede sincronização pela conexão', async () => {
  const page = runPage('remote', `?session=${'ab'.repeat(16)}`);
  await page.resolveLocalSlides({ ok: false, status: 503 });
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  connection.emit('data', { action: 'slide-state', h: 1, title: 'Ao vivo', slideText: ['Texto atual'], notes: ['Nota atual'] });
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 2 · Ao vivo');
  connection.emit('close');
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide atual indisponível');
  assert.match(page.getElement('remote-notes-empty').textContent, /Notas locais indisponíveis/);
});

test('controle aceita apresentação antiga sem texto e ignora blocos inválidos', () => {
  const page = runPage('remote', `?session=${'cd'.repeat(16)}`);
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  connection.emit('data', { action: 'slide-state', h: 0, title: 'Capa', notes: ['Nota antiga.'] });
  assert.equal(page.getElement('remote-slide-text-list').children.length, 0);
  assert.match(page.getElement('remote-slide-text-empty').textContent, /Atualize/);
  assert.deepEqual(page.getElement('remote-notes-list').children.map((item) => item.textContent), ['Nota antiga.']);
  connection.emit('data', { action: 'slide-state', h: 1, title: 'Inválido', slideText: ['Ok', 3], notes: [] });
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 1 · Capa');
});

test('controle detecta apresentação sem resposta e desabilita comandos', () => {
  const page = runPage('remote', `?session=${'de'.repeat(16)}`);
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  page.advance(10000);
  assert.equal(page.getElement('btn-next').disabled, true);
  assert.match(page.getElement('remote-feedback').textContent, /não responde/);
});

test('controle diferencia sessão ausente de falha ICE', () => {
  const missingSession = runPage('remote', `?session=${'de'.repeat(16)}`);
  missingSession.peers[0].emit('open');
  missingSession.peers[0].emit('error', { type: 'peer-unavailable' });
  assert.match(missingSession.getElement('remote-feedback').textContent, /Sessão não localizada/);

  const iceFailure = runPage('remote', `?session=${'ed'.repeat(16)}`);
  iceFailure.peers[0].emit('open');
  iceFailure.peers[0].connections[0].peerConnection = { iceConnectionState: 'failed' };
  iceFailure.runTimeout(20000);
  assert.match(iceFailure.getElement('remote-feedback').textContent, /Falha ICE/);
});

test('controle rejeita sessão inválida e informa biblioteca ausente', () => {
  const invalid = runPage('remote', '?session=invalid');
  assert.match(invalid.getElement('remote-feedback').textContent, /inválida/);
  assert.equal(invalid.peers.length, 0);
  const missingLibrary = runPage('remote', `?session=${'ef'.repeat(16)}`, false);
  assert.match(missingLibrary.getElement('remote-feedback').textContent, /indisponível/);
  assert.equal(missingLibrary.getElement('btn-next').disabled, true);
});
