const { createToken, safeEqual, sessionCookie } = require('../_auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !process.env.ADMIN_SESSION_SECRET) return res.status(503).json({ error: 'Owner login is not configured yet.' });
  const password = String((req.body && req.body.password) || '');
  if (!safeEqual(password, expected)) return res.status(401).json({ error: 'That owner password does not match.' });
  res.setHeader('Set-Cookie', sessionCookie(createToken()));
  return res.status(200).json({ ok: true });
};
