const { createToken, isSameOrigin, safeEqual, sessionCookie } = require('../_auth');

const attempts = globalThis.__shwLoginAttempts || (globalThis.__shwLoginAttempts = new Map());
const WINDOW = 15 * 60 * 1000;
const LIMIT = 8;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin was rejected.' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && now - record.started < WINDOW && record.count >= LIMIT) {
    res.setHeader('Retry-After', String(Math.ceil((WINDOW - (now - record.started)) / 1000)));
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !process.env.ADMIN_SESSION_SECRET) return res.status(503).json({ error: 'Owner login is not configured yet.' });
  const password = String((req.body && req.body.password) || '');
  if (password.length > 500) return res.status(400).json({ error: 'Password is too long.' });
  if (!safeEqual(password, expected)) {
    if (attempts.size > 5000) attempts.clear();
    attempts.set(ip, !record || now - record.started >= WINDOW ? { count: 1, started: now } : { ...record, count: record.count + 1 });
    return res.status(401).json({ error: 'That owner password does not match.' });
  }
  attempts.delete(ip);
  res.setHeader('Set-Cookie', sessionCookie(createToken()));
  return res.status(200).json({ ok: true });
};
