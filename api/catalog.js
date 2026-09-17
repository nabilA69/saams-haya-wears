const fs = require('node:fs/promises');
const path = require('node:path');
const { list, put } = require('@vercel/blob');
const { isAuthenticated } = require('./_auth');

const BLOB_PATH = 'catalog/current.json';

async function starterCatalogue() {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), 'data', 'catalog.json'), 'utf8'));
}

async function liveCatalogue() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return starterCatalogue();
  const result = await list({ prefix: BLOB_PATH, limit: 1 });
  const match = result.blobs.find(blob => blob.pathname === BLOB_PATH);
  if (!match) return starterCatalogue();
  const response = await fetch(match.url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Cloud catalogue could not be read');
  return response.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method === 'GET') {
    try { return res.status(200).json(await liveCatalogue()); }
    catch { return res.status(200).json(await starterCatalogue()); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Your owner session has expired.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Cloud catalogue storage is not configured.' });
  const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!data || !Array.isArray(data.products) || data.products.length > 500 || typeof data.settings !== 'object') return res.status(400).json({ error: 'Invalid catalogue.' });
  data.updatedAt = Date.now();
  delete data.settings.adminPin;
  const body = JSON.stringify(data);
  if (Buffer.byteLength(body) > 4_000_000) return res.status(413).json({ error: 'Catalogue is too large. Reduce the number or size of photos.' });
  await put(BLOB_PATH, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0 });
  return res.status(200).json({ ok: true, updatedAt: data.updatedAt });
};
