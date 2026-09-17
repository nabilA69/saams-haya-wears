const { clearCookie, isSameOrigin } = require('../_auth');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isSameOrigin(req)) return res.status(403).json({ error: 'Request origin was rejected.' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', clearCookie());
  return res.status(200).json({ ok: true });
};
