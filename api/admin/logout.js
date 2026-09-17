const { clearCookie } = require('../_auth');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', clearCookie());
  return res.status(200).json({ ok: true });
};
