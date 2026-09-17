/* Owner Studio authentication: server session in production, local PIN fallback. */
const pin = document.querySelector('#pin');
const errEl = document.querySelector('#lock-err');
const form = document.querySelector('#lock-form');
const local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }

form.onsubmit = async event => {
  event.preventDefault();
  errEl.hidden = true;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Checking…';
  try {
    if (local) {
      const data = await window.SHW.loadStore();
      if (pin.value !== String(data.settings.adminPin || window.SHW_ADMIN_PIN || '')) throw new Error('That PIN does not match.');
      window.SHW.writeSession('1');
    } else {
      const response = await fetch('/api/admin/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pin.value }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Sign-in failed.');
    }
    location.href = '/studio.html';
  } catch (error) { pin.value = ''; showError(error.message); pin.focus(); }
  finally { button.disabled = false; button.textContent = 'Unlock studio'; }
};

(async () => {
  try {
    if (local ? window.SHW.readSession() : (await fetch('/api/admin/session', { credentials: 'same-origin' })).ok) location.href = '/studio.html';
    else pin.focus();
  } catch { pin.focus(); }
})();
