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
    { title: 'Capa', notes: ['Apresentar o tema.'] },
    { title: 'Diversidade', notes: ['Primeiro ponto.', 'Segundo ponto.'] },
    { title: 'Sem notas', notes: [] },
    { title: 'Último slide', notes: ['Encerrar.'] }
  ].map(({ title, notes }) => ({
    querySelector() { return { textContent: title }; },
    querySelectorAll() { return notes.map((note) => ({ textContent: note })); }
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
  let now = 0;
  const window = {
    location,
    history: { replaceState(_state, _title, url) { location.href = String(url); } },
    crypto: { getRandomValues(bytes) { bytes.fill(10); } },
    Peer: peerAvailable ? MockPeer : undefined,
    QRious: class {},
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
      createElement: () => ({})
    },
    Reveal: class { constructor() { return deck; } },
    QRious: window.QRious,
    Peer: MockPeer,
    URL, Uint8Array, Date: { now: () => now }, console
  }, { filename: 'app.js' });

  return {
    getElement, peers, deck, location, MockConnection,
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
  assert.equal(new URL(page.getElement('remote-link').href).searchParams.get('v'), '20261102-slide-notes');
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

test('apresentação envia slide e notas ao conectar e após navegação local ou remota', () => {
  const page = runPage('presentation', `?session=${'ab'.repeat(16)}`);
  const connection = new page.MockConnection('remote');
  page.peers[0].emit('connection', connection);
  connection.emit('open');
  assert.equal(JSON.stringify(connection.sent[0]), JSON.stringify({
    action: 'slide-state', h: 0, title: 'Capa', notes: ['Apresentar o tema.']
  }));

  page.deck.slide(1);
  assert.equal(JSON.stringify(connection.sent[1]), JSON.stringify({
    action: 'slide-state', h: 1, title: 'Diversidade', notes: ['Primeiro ponto.', 'Segundo ponto.']
  }));
  connection.emit('data', { action: 'next' });
  assert.equal(JSON.stringify(connection.sent[2]), JSON.stringify({
    action: 'slide-state', h: 2, title: 'Sem notas', notes: []
  }));
});

test('controle conecta diretamente, envia comandos e desabilita ao desconectar', () => {
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

test('controle mostra notas do slide atual e limpa estado ao perder a conexão', () => {
  const page = runPage('remote', `?session=${'cd'.repeat(16)}`);
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  connection.emit('data', { action: 'slide-state', h: 1, title: 'Diversidade', notes: ['Primeiro ponto.', 'Segundo ponto.'] });
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 2 · Diversidade');
  assert.equal(page.getElement('remote-notes-list').hidden, false);
  assert.deepEqual(page.getElement('remote-notes-list').children.map((item) => item.textContent), ['Primeiro ponto.', 'Segundo ponto.']);
  assert.equal(page.getElement('remote-notes-empty').hidden, true);

  connection.emit('close');
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide atual indisponível');
  assert.equal(page.getElement('remote-notes-list').hidden, true);
  assert.equal(page.getElement('remote-notes-list').children.length, 0);

  page.runTimeout(2000);
  const reconnected = page.peers[0].connections[1];
  reconnected.emit('open');
  reconnected.emit('data', { action: 'slide-state', h: 2, title: 'Sem notas', notes: [] });
  assert.equal(page.getElement('remote-current-slide').textContent, 'Slide 3 · Sem notas');
  assert.equal(page.getElement('remote-notes-empty').textContent, 'Sem notas para este slide.');
  assert.equal(page.getElement('remote-notes-empty').hidden, false);
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
