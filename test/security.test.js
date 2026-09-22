const test = require('node:test');
const assert = require('node:assert/strict');
const { isSameOrigin } = require('../api/_auth');
const { sanitiseCatalogue } = require('../api/_catalog');

test('same-origin guard accepts the site and rejects foreign origins', () => {
  const req = { headers: { origin: 'https://www.samshaya.shop', host: 'www.samshaya.shop', 'x-forwarded-proto': 'https' } };
  assert.equal(isSameOrigin(req), true);
  req.headers.origin = 'https://evil.example';
  assert.equal(isSameOrigin(req), false);
  delete req.headers.origin;
  assert.equal(isSameOrigin(req), false);
});

test('catalogue sanitiser blocks script URLs and constrains unsafe values', () => {
  const result = sanitiseCatalogue({
    updatedAt: 7,
    settings: { categories: ['Abayas', 'Abayas'], heroImage: 'javascript:alert(1)', paymentApiUrl: 'http://bad' },
    products: [{ id: 1, name: '<script>x</script>', category: 'Abayas', price: -5, images: ['javascript:alert(1)'], sizes: ['M'] }]
  });
  assert.equal(result.updatedAt, 7);
  assert.deepEqual(result.settings.categories, ['Abayas']);
  assert.equal(result.settings.heroImage, '');
  assert.equal(result.settings.paymentApiUrl, '');
  assert.equal(result.products[0].price, 0);
  assert.deepEqual(result.products[0].images, []);
});

test('catalogue accepts stored product images but rejects document URLs as images', () => {
  const result = sanitiseCatalogue({
    settings: { categories: ['Abayas'] },
    products: [{ id: 1, name: 'Afiya', category: 'Abayas', images: [
      'https://example.public.blob.vercel-storage.com/products/afiya.jpg',
      'https://www.samshaya.shop/'
    ], sizes: ['M'] }]
  });
  assert.deepEqual(result.products[0].images, ['https://example.public.blob.vercel-storage.com/products/afiya.jpg']);
});

test('catalogue sanitiser rejects invalid document shapes', () => {
  assert.equal(sanitiseCatalogue(null), null);
  assert.equal(sanitiseCatalogue({ settings: {}, products: 'not-an-array' }), null);
  assert.equal(sanitiseCatalogue({ settings: {}, products: Array(501).fill({}) }), null);
});
