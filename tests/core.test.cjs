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
        dataset: {}, disabled: true, value: '', textContent: '', listeners: {},
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
    constructor(id) { this.id = id; this.events = {}; this.connections = []; this.disconnected = false; this.destroyed = false; peers.push(this); }
    on(name, callback) { this.events[name] = callback; }
    emit(name, value) { this.events[name]?.(value); }
    connect(id) { const connection = new MockConnection(id); this.connections.push(connection); return connection; }
    reconnect() { this.disconnected = false; this.emit('open', this.id); }
  }

  const deck = {
    nextCount: 0, prevCount: 0,
    initialize() {},
    next() { this.nextCount += 1; },
    prev() { this.prevCount += 1; },
    slide(index) { this.lastSlide = index; },
    getTotalSlides() { return 3; }
  };
  const location = { href: `https://example.test/${kind === 'remote' ? 'remote' : 'index'}.html${search}` };
  const intervals = [];
  let now = 0;
  const window = {
    location,
    history: { replaceState(_state, _title, url) { location.href = String(url); } },
    crypto: { getRandomValues(bytes) { bytes.fill(10); } },
    Peer: peerAvailable ? MockPeer : undefined,
    QRious: class {},
    clearTimeout() {},
    setTimeout() { return 1; },
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

  return { getElement, peers, deck, location, MockConnection, advance(milliseconds) { now += milliseconds; intervals.forEach((callback) => callback()); } };
}

test('apresentação cria sessão e QR para o mesmo controle sem configuração', () => {
  const page = runPage('presentation');
  const session = new URL(page.location.href).searchParams.get('session');
  assert.equal(session, '0a'.repeat(16));
  assert.equal(new URL(page.getElement('remote-link').href).searchParams.get('session'), session);
  assert.equal(page.getElement('remote-qr').children.length, 1);
  assert.equal(page.peers[0].id, `bc-${session}`);
  page.peers[0].emit('open');
  assert.match(page.getElement('remote-status').textContent, /Aguardando/);
});

test('apresentação aceita somente comandos de navegação válidos', () => {
  const page = runPage('presentation', `?session=${'ab'.repeat(16)}`);
  const connection = new page.MockConnection('remote');
  page.peers[0].emit('connection', connection);
  connection.emit('open');
  for (const data of [{ action: 'next' }, { action: 'prev' }, { action: 'goto', h: 2 }, { action: 'goto', h: 99 }, { action: 'goto', h: '1' }]) {
    connection.emit('data', data);
  }
  assert.equal(page.deck.nextCount, 1);
  assert.equal(page.deck.prevCount, 1);
  assert.equal(page.deck.lastSlide, 2);
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

test('controle detecta apresentação sem resposta e desabilita comandos', () => {
  const page = runPage('remote', `?session=${'de'.repeat(16)}`);
  page.peers[0].emit('open');
  const connection = page.peers[0].connections[0];
  connection.emit('open');
  page.advance(10000);
  assert.equal(page.getElement('btn-next').disabled, true);
  assert.match(page.getElement('remote-feedback').textContent, /não responde/);
});

test('controle rejeita sessão inválida e informa biblioteca ausente', () => {
  const invalid = runPage('remote', '?session=invalid');
  assert.match(invalid.getElement('remote-feedback').textContent, /inválida/);
  assert.equal(invalid.peers.length, 0);
  const missingLibrary = runPage('remote', `?session=${'ef'.repeat(16)}`, false);
  assert.match(missingLibrary.getElement('remote-feedback').textContent, /indisponível/);
  assert.equal(missingLibrary.getElement('btn-next').disabled, true);
});
