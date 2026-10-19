const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function runPage(kind, configured = false, search = '') {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      const classes = new Set(id === 'remote-overlay' ? ['is-collapsed'] : []);
      elements.set(id, {
        dataset: {},
        disabled: true,
        value: '',
        textContent: '',
        listeners: {},
        classList: {
          contains: (name) => classes.has(name),
          add: (name) => classes.add(name),
          remove: (name) => classes.delete(name),
          toggle: (name, force) => {
            if (force) classes.add(name);
            else classes.delete(name);
          }
        },
        setAttribute(name, value) { this[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        replaceChildren(...children) { this.children = children; }
      });
    }
    return elements.get(id);
  };

  const channels = new Map();
  const connectionEvents = {};
  class MockAbly {
    constructor(options) {
      this.options = options;
      this.connection = { on: (name, callback) => { connectionEvents[name] = callback; } };
      this.channels = {
        get: (name) => {
          if (!channels.has(name)) {
            channels.set(name, {
              subscriptions: {},
              publications: [],
              subscribe(event, callback) { this.subscriptions[event] = callback; },
              publish(event, data, callback) {
                this.publications.push({ event, data });
                callback?.(null);
              }
            });
          }
          return channels.get(name);
        }
      };
    }
  }

  const deck = {
    nextCount: 0,
    prevCount: 0,
    initialize() {},
    next() { this.nextCount += 1; },
    prev() { this.prevCount += 1; },
    slide(index) { this.lastSlide = index; },
    getTotalSlides() { return 3; }
  };
  const location = { href: `https://example.test/index.html${search}` };
  const window = {
    location,
    history: { replaceState(_state, _title, url) { location.href = String(url); } },
    crypto: { getRandomValues(bytes) { bytes.fill(10); } },
    Ably: { Realtime: MockAbly },
    QRious: class {},
    clearTimeout() {},
    setTimeout() { return 1; },
    PRESENTATION_CONFIG: {
      channelPrefix: 'brazilian-culture:',
      presentationAuthUrl: configured ? '/presentation-token' : '',
      remoteAuthUrl: configured ? '/remote-token' : ''
    }
  };
  if (kind === 'remote') location.href = `https://example.test/remote.html${search}`;

  vm.runInNewContext(source, {
    window,
    document: {
      body: { classList: { contains: (name) => name === `${kind}-page` } },
      getElementById: getElement,
      createElement: () => ({})
    },
    Reveal: class { constructor() { return deck; } },
    QRious: window.QRious,
    Ably: window.Ably,
    URL,
    Uint8Array,
    console
  }, { filename: 'app.js' });

  return { elements, getElement, channels, connectionEvents, deck, location };
}

test('apresentação gera sessão compartilhada e funciona sem Ably configurado', () => {
  const page = runPage('presentation');
  const session = new URL(page.location.href).searchParams.get('session');
  assert.equal(session, '0a'.repeat(12));
  assert.equal(new URL(page.getElement('remote-link').href).searchParams.get('session'), session);
  assert.equal(page.getElement('remote-qr').children.length, 1);
  assert.match(page.getElement('ably-status').textContent, /não configurado/);
});

test('apresentação executa somente comandos válidos da sessão', () => {
  const page = runPage('presentation', true, `?session=${'ab'.repeat(12)}`);
  const channel = page.channels.get(`brazilian-culture:${'ab'.repeat(12)}`);
  channel.subscriptions.command({ data: { action: 'next' } });
  channel.subscriptions.command({ data: { action: 'prev' } });
  channel.subscriptions.command({ data: { action: 'goto', h: 2 } });
  channel.subscriptions.command({ data: { action: 'goto', h: 99 } });
  assert.equal(page.deck.nextCount, 1);
  assert.equal(page.deck.prevCount, 1);
  assert.equal(page.deck.lastSlide, 2);
});

test('controle só habilita botões conectado e publica comandos válidos', () => {
  const page = runPage('remote', true, `?session=${'cd'.repeat(12)}`);
  const channel = page.channels.get(`brazilian-culture:${'cd'.repeat(12)}`);
  assert.equal(page.getElement('btn-next').disabled, true);
  page.connectionEvents.connected();
  assert.equal(page.getElement('btn-next').disabled, false);
  page.getElement('btn-next').listeners.click();
  page.getElement('goto-slide').value = '2';
  page.getElement('btn-goto').listeners.click();
  page.getElement('goto-slide').value = '2abc';
  page.getElement('btn-goto').listeners.click();
  assert.equal(JSON.stringify(channel.publications.map(({ event, data }) => [event, data.action, data.h])), JSON.stringify([
    ['presence', 'remote-connected', null],
    ['command', 'next', null],
    ['command', 'goto', 1]
  ]));
  page.connectionEvents.disconnected();
  assert.equal(page.getElement('btn-next').disabled, true);
});

test('controle sem configuração não aceita sessão inválida nem envia comandos', () => {
  const invalid = runPage('remote', false, '?session=invalid');
  assert.match(invalid.getElement('remote-feedback').textContent, /inválida/);
  const missingAuth = runPage('remote', false, `?session=${'ef'.repeat(12)}`);
  assert.match(missingAuth.getElement('remote-feedback').textContent, /não configurado/);
  assert.equal(missingAuth.getElement('btn-next').disabled, true);
});
