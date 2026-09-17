const crypto = require('node:crypto');

const COOKIE = 'shw_owner';
const DAY = 60 * 60 * 24;

function secret() { return process.env.ADMIN_SESSION_SECRET || ''; }
function sign(value) { return crypto.createHmac('sha256', secret()).update(value).digest('base64url'); }
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function cookieValue(req) {
  const raw = req.headers.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}
function createToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + DAY })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
function isAuthenticated(req) {
  if (!secret()) return false;
  const [payload, signature] = cookieValue(req).split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now() / 1000; }
  catch { return false; }
}
function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAY}`;
}
function clearCookie() { return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`; }

module.exports = { createToken, isAuthenticated, safeEqual, sessionCookie, clearCookie };
