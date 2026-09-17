const { isAuthenticated } = require('../_auth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return isAuthenticated(req) ? res.status(200).json({ authenticated: true }) : res.status(401).json({ authenticated: false });
};
