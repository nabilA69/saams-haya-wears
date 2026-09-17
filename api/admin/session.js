const { isAuthenticated } = require('../_auth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  return isAuthenticated(req) ? res.status(200).json({ authenticated: true }) : res.status(401).json({ authenticated: false });
};
