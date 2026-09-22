const crypto = require('node:crypto');
const { put } = require('@vercel/blob');
const { isAuthenticated, isSameOrigin } = require('../_auth');

const IMAGE = /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=]+)$/i;
const TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin was rejected.' });
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Your owner session has expired.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'Cloud image storage is not configured.' });

  const source = String(req.body?.data || '');
  if (source.length > 3_400_000) return res.status(413).json({ error: 'That photo is too large. Choose a smaller image.' });
  const match = source.match(IMAGE);
  if (!match) return res.status(400).json({ error: 'Unsupported image. Use JPG, PNG or WebP.' });
  const body = Buffer.from(match[2], 'base64');
  if (!body.length || body.length > 2_500_000) return res.status(413).json({ error: 'That photo is too large. Choose a smaller image.' });

  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const pathname = `products/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const blob = await put(pathname, body, {
    access: 'public', addRandomSuffix: false, contentType: TYPES[match[1].toLowerCase()],
    cacheControlMaxAge: 60 * 60 * 24 * 365
  });
  return res.status(201).json({ url: blob.url });
};
