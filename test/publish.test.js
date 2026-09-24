const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');

/* Loads store.js in a fake browser so the publish rules can be asserted.
   The bug this guards against: the storefront reading the owner's local draft,
   which made unpublished work look published to the owner and to nobody else. */
function loadSHW({ hostname, protocol = 'https:', draft = null, published = null }) {
  const sandbox = {
    console,
    window: {},
    location: { hostname, protocol },
    localStorage: {
      store: draft ? { 'shw-draft-v1': JSON.stringify(draft) } : {},
      getItem(k) { return this.store[k] ?? null; },
      setItem(k, v) { this.store[k] = String(v); },
      removeItem(k) { delete this.store[k]; }
    },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: async () => published
      ? { ok: true, json: async () => published }
      : { ok: false, json: async () => ({}) }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'store.js'), 'utf8'), sandbox);
  return sandbox.window.SHW;
}

const catalogue = (name, updatedAt) => ({
  updatedAt,
  settings: { categories: ['Abayas'] },
  products: [{ id: 1, name, category: 'Abayas', price: 100, images: [] }]
});

test('storefront ignores the owner draft in production', async () => {
  const SHW = loadSHW({
    hostname: 'saamshaya.com',
    draft: catalogue('Draft only piece', 9999),
    published: catalogue('Published piece', 10)
  });
  const data = await SHW.loadStore();                 // storefront: no draft flag
  assert.equal(data.products[0].name, 'Published piece',
    'storefront must show the published catalogue, never the local draft');
  assert.equal(data.publishedAt, 10);
});

test('studio previews the draft when it is newer', async () => {
  const SHW = loadSHW({
    hostname: 'saamshaya.com',
    draft: catalogue('Draft only piece', 9999),
    published: catalogue('Published piece', 10)
  });
  const data = await SHW.loadStore({ draft: true });
  assert.equal(data.products[0].name, 'Draft only piece');
  assert.equal(data.publishedAt, 10, 'studio still knows what is actually live');
});

test('localhost still previews the draft, since there is no publish API', async () => {
  const SHW = loadSHW({
    hostname: 'localhost', protocol: 'http:',
    draft: catalogue('Draft only piece', 9999),
    published: catalogue('Published piece', 10)
  });
  const data = await SHW.loadStore();
  assert.equal(data.products[0].name, 'Draft only piece');
});

test('recording a publish does not re-flag the draft as unpublished', async () => {
  const SHW = loadSHW({ hostname: 'saamshaya.com' });
  const data = { updatedAt: 500, settings: {}, products: [] };
  SHW.writeDraft(data, { touch: false });
  assert.equal(data.updatedAt, 500, 'touch:false must preserve updatedAt');
  SHW.writeDraft(data);
  assert.ok(data.updatedAt > 500, 'a normal save still stamps a new time');
});
