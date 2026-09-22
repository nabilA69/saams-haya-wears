/* Saam's Haya Wears — storefront */
const { money, priceTag, saleSticker, priceInfo, escapeHtml: esc, safeColor, safeImage } = window.SHW;

let DATA = { settings: {}, products: [] };
let products = [];
let cart = [];
try {
  const savedCart = JSON.parse(localStorage.getItem('saams-haya-cart') || '[]');
  if (Array.isArray(savedCart)) cart = savedCart.slice(0, 100).map(x => ({ id: Number(x.id), size: String(x.size || '').slice(0, 30), qty: Math.min(20, Math.max(1, Number(x.qty) || 1)) }));
} catch { localStorage.removeItem('saams-haya-cart'); }
let activeFilter = 'All';
let activeSearch = '';
let activeSort = 'featured';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const byId = id => products.find(p => p.id === id) || DATA.products.find(p => p.id === id);
const waLink = text => `https://wa.me/${DATA.settings.whatsapp}?text=${encodeURIComponent(text)}`;

/* ---------------- rendering ---------------- */
function artwork(p, cls) {
  const image = safeImage(p.images && p.images[0]);
  if (image) return `<img class="${cls}-photo" src="${esc(image)}" alt="${esc(p.name)}" loading="lazy">`;
  return `<span class="hijab"></span>`;
}

function installImageFallbacks(root = document) {
  root.querySelectorAll('.product-image img, .cart-thumb img, .detail-gallery img').forEach(img => {
    const recover = () => {
      const card = img.closest('.product-card');
      if (card) card.classList.remove('has-photo');
      const imageBox = img.closest('.product-image');
      if (imageBox && !imageBox.querySelector('.hijab')) {
        const fallback = document.createElement('span');
        fallback.className = 'hijab';
        img.replaceWith(fallback);
      } else img.remove();
    };
    img.addEventListener('error', recover, { once: true });
    if (img.complete && !img.naturalWidth) recover();
  });
}

function card(p) {
  const photo = safeImage(p.images && p.images[0]);
  return `<article class="product-card${photo ? ' has-photo' : ''}">
    <div class="product-image" data-id="${Number(p.id)}" tabindex="0" role="button" aria-label="View ${esc(p.name)}"
         style="--card-bg:${safeColor(p.bg, '#d8c8ab')};--garment:${safeColor(p.color)};--garment-dark:${safeColor(p.dark, '#34401f')}">
      ${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ''}
      ${saleSticker(p)}
      ${artwork(p, 'card')}
      <button class="quick-add" data-id="${Number(p.id)}">Quick add</button>
    </div>
    <div class="product-info">
      <h3>${esc(p.name)}</h3>
      <div class="product-meta">${priceTag(p)}<span>${esc(p.category)}</span>
        <div class="swatches" aria-label="Available colours"><i style="background:${safeColor(p.color)}"></i><i style="background:${safeColor(p.dark, '#34401f')}"></i></div>
      </div>
    </div>
  </article>`;
}

function render() {
  products = DATA.products.filter(p => p.active !== false);
  $('#new-grid').innerHTML = products.filter(p => p.new).slice(0, 4).map(card).join('');
  $('#best-grid').innerHTML = products.filter(p => p.best).slice(0, 4).map(card).join('');
  const onSale = products.filter(p => priceInfo(p).on);
  $('#sale-rail').hidden = onSale.length === 0;
  $('#sale-grid').innerHTML = onSale.slice(0, 8).map(card).join('');
  installImageFallbacks();
  renderFilters();
  renderShop();
}

function renderFilters() {
  const cats = DATA.settings.categories || [];
  $('.filters').innerHTML = ['All', ...cats]
    .map(c => `<button type="button" class="${c === activeFilter ? 'active' : ''}" data-filter="${esc(c)}" aria-pressed="${c === activeFilter}">${esc(c)}</button>`).join('');
  $$('.filters button').forEach(b => b.onclick = () => { setFilter(b.dataset.filter, true); });
  $('.nav-cats').innerHTML = cats.map(c => `<a href="#shop" data-filter-link="${esc(c)}"><span>${esc(c)}</span></a>`).join('');
  $('.menu-chips').innerHTML = cats.map(c => `<a href="#shop" data-filter-link="${esc(c)}">${esc(c)}</a>`).join('');
  bindFilterLinks();
}

function setFilter(cat, moveFocus = false) {
  activeFilter = cat;
  activeSearch = '';
  const search = $('#site-search');
  if (search) search.value = '';
  $$('.filters button').forEach(b => {
    const selected = b.dataset.filter === cat;
    b.classList.toggle('active', selected);
    b.setAttribute('aria-pressed', selected);
  });
  renderShop();
  if (moveFocus) {
    const grid = $('#shop-grid');
    grid.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => {
      grid.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      grid.focus({ preventScroll: true });
    });
  }
}

function renderShop() {
  const normal = value => String(value || '').trim().toLocaleLowerCase();
  let list = products.filter(p =>
    (activeFilter === 'All' || normal(p.category) === normal(activeFilter)) &&
    (p.name + ' ' + p.category + ' ' + (p.desc || '')).toLowerCase().includes(activeSearch));
  if (activeSort === 'low') list.sort((a, b) => a.price - b.price);
  if (activeSort === 'high') list.sort((a, b) => b.price - a.price);
  if (activeSort === 'newest') list.sort((a, b) => Number(b.new) - Number(a.new));
  if (activeSort === 'sale') list.sort((a, b) => priceInfo(b).off - priceInfo(a).off);
  $('#shop-grid').innerHTML = list.length ? list.map(card).join('') : '<p class="empty-note">No pieces found. Try another search.</p>';
  installImageFallbacks($('#shop-grid'));
  $('.result-count').textContent = `${list.length} piece${list.length === 1 ? '' : 's'}`;
  bindCards();
}

function bindCards() {
  $$('.product-image').forEach(el => {
    el.onclick = e => { if (!e.target.closest('.quick-add')) openProduct(+el.dataset.id); };
    el.onkeydown = e => { if (e.key === 'Enter') openProduct(+el.dataset.id); };
  });
  $$('.quick-add').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const p = byId(+b.dataset.id);
    p.sizes.length === 1 ? addItem(p.id, p.sizes[0]) : openProduct(p.id);
  });
}

function bindFilterLinks() {
  $$('[data-filter-link]').forEach(a => a.onclick = () => {
    closeMenus();
    setTimeout(() => setFilter(a.dataset.filterLink), 20);
  });
}

/* ---------------- product dialog ---------------- */
function openProduct(id) {
  const p = byId(id), d = $('.product-dialog');
  const gallery = (p.images && p.images.length)
    ? `<div class="detail-gallery" aria-label="${esc(p.name)} image gallery">
        <div class="detail-track" tabindex="0">${p.images.map((src, i) =>
          `<div class="detail-slide"><img class="detail-photo" src="${esc(safeImage(src))}" alt="${esc(p.name)} — view ${i + 1} of ${p.images.length}" loading="${i ? 'lazy' : 'eager'}"></div>`).join('')}</div>
        ${p.images.length > 1 ? `<button class="gallery-arrow gallery-prev" aria-label="Previous product image">←</button>
          <button class="gallery-arrow gallery-next" aria-label="Next product image">→</button>
          <div class="gallery-status" aria-live="polite"><span>1</span> / ${p.images.length}</div>
          <div class="gallery-dots" aria-label="Choose product image">${p.images.map((_, i) =>
            `<button class="gallery-dot" aria-label="Show image ${i + 1}" aria-current="${i === 0 ? 'true' : 'false'}" data-index="${i}"></button>`).join('')}</div>` : ''}</div>`
    : `<div class="detail-image" style="--card-bg:${safeColor(p.bg, '#d8c8ab')};--garment:${safeColor(p.color)}"></div>`;
  d.querySelector('.dialog-content').innerHTML = `${gallery}
    <div class="detail-copy">
      <p class="eyebrow">${esc(p.category)}</p>
      <h2>${esc(p.name)}</h2>
      <div class="detail-price">${priceTag(p, 'large')}</div>
      <p class="detail-description">${esc(p.desc || '')}</p>
      <p class="option-label">Select size</p>
      <div class="option-row">${p.sizes.map((s, i) => `<button class="${i === 0 ? 'selected' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <p class="stock-note">● ${esc(p.stock || 'In stock')} · Ready for nationwide delivery</p>
      <button class="button dark detail-add">Add to bag</button>
      <a class="detail-ask" href="#">Ask about this piece on WhatsApp</a>
    </div>`;
  installImageFallbacks(d);
  d.querySelectorAll('.option-row button').forEach(b => b.onclick = () => {
    d.querySelectorAll('.option-row button').forEach(x => x.classList.remove('selected'));
    b.classList.add('selected');
  });
  const track = d.querySelector('.detail-track');
  if (track && p.images.length > 1) {
    const dots = [...d.querySelectorAll('.gallery-dots button')];
    const status = d.querySelector('.gallery-status span');
    const prev = d.querySelector('.gallery-prev');
    const next = d.querySelector('.gallery-next');
    let active = 0, scrollFrame;
    const update = (index, scroll = true) => {
      active = Math.max(0, Math.min(p.images.length - 1, index));
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === active)));
      status.textContent = active + 1;
      prev.disabled = active === 0;
      next.disabled = active === p.images.length - 1;
      if (scroll) track.scrollTo({ left: track.clientWidth * active, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    dots.forEach(dot => dot.onclick = () => update(+dot.dataset.index));
    prev.onclick = () => update(active - 1);
    next.onclick = () => update(active + 1);
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => update(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)), false));
    }, { passive: true });
    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        update(active + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    update(0, false);
  }
  d.querySelector('.detail-ask').onclick = e => {
    e.preventDefault();
    window.open(waLink(`Hello Saam's Haya Wears, I'd like to know more about the ${p.name}.`), '_blank', 'noopener');
  };
  d.querySelector('.detail-add').onclick = () => {
    addItem(id, d.querySelector('.option-row .selected').dataset.size);
    d.close();
  };
  d.showModal();
}

/* ---------------- bag ---------------- */
function addItem(id, size) {
  const existing = cart.find(x => x.id === id && x.size === size);
  existing ? existing.qty++ : cart.push({ id, size, qty: 1 });
  saveCart();
  toast(`${byId(id).name} added to your bag`);
}
function saveCart() { localStorage.setItem('saams-haya-cart', JSON.stringify(cart)); renderCart(); }

function renderCart() {
  cart = cart.filter(x => byId(x.id));
  const items = $('.cart-items');
  const total = cart.reduce((s, x) => s + byId(x.id).price * x.qty, 0);
  const count = cart.reduce((s, x) => s + x.qty, 0);
  $$('.cart-count').forEach(x => x.textContent = count);
  $('.cart-count-text').textContent = `(${count})`;
  $('.cart-total').textContent = money(total);
  $('.checkout-total strong').textContent = money(total);
  items.innerHTML = cart.map((x, i) => {
    const p = byId(x.id);
    const photo = safeImage(p.images && p.images[0]);
    return `<article class="cart-item">
      <div class="cart-thumb${photo ? ' has-photo' : ''}" style="--card-bg:${safeColor(p.bg, '#d8c8ab')};--garment:${safeColor(p.color)}">${photo ? `<img src="${esc(photo)}" alt="">` : ''}</div>
      <div><h3>${esc(p.name)}</h3><p>Size ${esc(x.size)} · ${money(p.price)}</p>
        <div class="qty"><button data-action="minus" data-index="${i}" aria-label="Decrease quantity">−</button><span>${x.qty}</span><button data-action="plus" data-index="${i}" aria-label="Increase quantity">+</button></div>
      </div>
      <button class="remove-item" data-index="${i}" aria-label="Remove ${esc(p.name)}">×</button>
    </article>`;
  }).join('');
  installImageFallbacks(items);
  $('.cart-empty').hidden = cart.length > 0;
  $('.cart-summary').hidden = cart.length === 0;
  items.querySelectorAll('[data-action]').forEach(b => b.onclick = () => {
    const i = +b.dataset.index;
    if (b.dataset.action === 'plus') cart[i].qty++;
    else if (--cart[i].qty <= 0) cart.splice(i, 1);
    saveCart();
  });
  items.querySelectorAll('.remove-item').forEach(b => b.onclick = () => { cart.splice(+b.dataset.index, 1); saveCart(); });
}

function toggleCart(open = true) {
  $('.cart-drawer').classList.toggle('open', open);
  $('.cart-drawer').setAttribute('aria-hidden', !open);
  $('.overlay').hidden = !open;
  document.body.classList.toggle('locked', open);
}

function toast(msg) {
  const t = $('.toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------- stylish dropdown ---------------- */
function initDropdown(root, onPick) {
  const trigger = root.querySelector('.dd-trigger');
  const list = root.querySelector('.dd-list');
  const close = () => { root.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
  trigger.onclick = e => {
    e.stopPropagation();
    const open = !root.classList.contains('open');
    root.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', open);
    if (open) list.focus();
  };
  list.querySelectorAll('[role="option"]').forEach(li => li.onclick = () => {
    list.querySelectorAll('[role="option"]').forEach(x => x.setAttribute('aria-selected', 'false'));
    li.setAttribute('aria-selected', 'true');
    root.querySelector('.dd-value').textContent = li.textContent;
    close();
    onPick(li.dataset.value);
  });
  list.onkeydown = e => {
    const opts = [...list.querySelectorAll('[role="option"]')];
    const cur = opts.findIndex(o => o.classList.contains('cursor')) ;
    if (e.key === 'Escape') { close(); trigger.focus(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(0, Math.min(opts.length - 1, (cur < 0 ? -1 : cur) + (e.key === 'ArrowDown' ? 1 : -1)));
      opts.forEach(o => o.classList.remove('cursor'));
      opts[next].classList.add('cursor');
    }
    if (e.key === 'Enter') { const c = list.querySelector('.cursor'); if (c) c.click(); }
  };
  document.addEventListener('click', e => { if (!root.contains(e.target)) close(); });
}

function closeMenus() {
  $('.mobile-menu').classList.remove('open');
  $('.mobile-menu').setAttribute('aria-hidden', 'true');
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  $('.menu-toggle').classList.remove('open');
  document.body.classList.remove('locked');
  $('.nav-item.has-menu')?.classList.remove('open');
}

/* ---------------- settings applied to the page ---------------- */
function applySettings() {
  const s = DATA.settings;
  $('.ann-one').textContent = s.announcement || '';
  $('.ann-two').textContent = s.announcementTwo || '';
  $('.dot').hidden = !(s.announcement && s.announcementTwo);
  const [line1, em, line2] = (s.heroTitle || '').split('|');
  if (line1) $('.hero h1').innerHTML = `${esc(line1)}<br><em>${esc(em || '')}</em>${esc(line2 || '')}`;
  const heroText = $('.hero-copy > p:not(.eyebrow)');
  if (heroText && s.heroText) heroText.textContent = s.heroText;
  const heroEyebrow = $('[data-hero-eyebrow]');
  if (heroEyebrow && s.heroEyebrow) heroEyebrow.textContent = s.heroEyebrow;
  const heroButton = $('[data-hero-button]');
  if (heroButton && s.heroButtonText) heroButton.textContent = s.heroButtonText;
  const featureLabel = $('[data-hero-feature-label]');
  if (featureLabel && s.heroFeaturedLabel) featureLabel.textContent = s.heroFeaturedLabel;
  const featureTitle = $('[data-hero-feature-title]');
  if (featureTitle && s.heroFeaturedTitle) featureTitle.textContent = s.heroFeaturedTitle;
  const heroImage = safeImage(s.heroImage);
  if (heroImage) $$('.hero-campaign, .hero-card-photo img').forEach(img => { img.src = heroImage; });
  $$('[data-wa-help]').forEach(a => { a.href = waLink(s.whatsappHelpText || 'Hello!'); a.target = '_blank'; a.rel = 'noopener'; });
  const phone = $('footer a[href^="tel:"]');
  if (phone && s.phone) { phone.href = 'tel:' + s.phone.replace(/\s/g, ''); phone.textContent = s.phone; }
  const snap = $('footer a[href*="snapchat"]'); if (snap && s.snapchat) snap.href = s.snapchat;
  const tik = $('footer a[href*="tiktok"]'); if (tik && s.tiktok) tik.href = s.tiktok;
}

/* ---------------- customer account ----------------
   The profile is kept on this device to fill in checkout faster. There is no
   server session here, so Google and Facebook sign-in identify the shopper for
   convenience only — treat it as a saved profile, not verified identity. */
const CUSTOMER_KEY = 'shw-customer';
let customer = null;

function readCustomer() {
  try { const raw = localStorage.getItem(CUSTOMER_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function writeCustomer(c) {
  customer = c;
  try { c ? localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c)) : localStorage.removeItem(CUSTOMER_KEY); }
  catch { toast('This browser won’t let us save your details'); }
  renderAccount();
}

function renderAccount() {
  const acc = DATA.settings.accounts || {};
  const btn = $('.account-toggle');
  if (btn) {
    btn.hidden = acc.enabled === false;
    $('.account-name').textContent = customer ? customer.firstName : '';
    btn.setAttribute('aria-label', customer ? `Your details, ${customer.firstName}` : 'Your account');
  }
  const inEl = $('.account-signedin'), outEl = $('.account-signedout');
  if (!inEl) return;
  inEl.hidden = !customer;
  outEl.hidden = !!customer;
  if (customer) {
    $('.account-hello').textContent = `Hello, ${customer.firstName}`;
    const rows = [['Name', `${customer.firstName} ${customer.lastName || ''}`.trim()], ['Email', customer.email],
                  ['Phone', customer.phone], ['Delivery', customer.address]].filter(r => r[1]);
    $('.account-details').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('') +
      (customer.via ? `<div><dt>Saved via</dt><dd>${esc(customer.via)}</dd></div>` : '');
  }
  // social buttons only offer what the owner has actually connected
  $$('.social-btn').forEach(b => {
    const p = b.dataset.provider;
    const configured = p === 'google' ? !!acc.googleClientId : !!acc.facebookAppId;
    b.classList.toggle('unconfigured', !configured);
  });
  $('.social-row').hidden = !(acc.googleClientId || acc.facebookAppId);
  $('#account-form').hidden = acc.email === false;
  $('.or-line').hidden = !(acc.googleClientId || acc.facebookAppId) || acc.email === false;
  $('.account-note').textContent = 'Saved on this device to fill in your next order faster. Nothing is sent anywhere until you place your order.';
}

function openAccount() { renderAccount(); $('.account-dialog').showModal(); }

/* ---- Google Identity Services (loaded only once, and only if configured) ---- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = resolve; s.onerror = () => reject(new Error('could not load'));
    document.head.appendChild(s);
  });
}

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch { return null; }
}

async function signInGoogle() {
  const id = (DATA.settings.accounts || {}).googleClientId;
  if (!id) return toast('Google sign-in isn’t set up yet — add your Google client ID in Owner Studio');
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    google.accounts.id.initialize({
      client_id: id,
      callback: res => {
        const claims = decodeJwtPayload(res.credential);
        if (!claims) return toast('Google sign-in didn’t complete');
        writeCustomer({
          firstName: claims.given_name || (claims.name || '').split(' ')[0] || 'Friend',
          lastName: claims.family_name || '', email: claims.email || '',
          phone: customer?.phone || '', address: customer?.address || '', via: 'Google'
        });
        $('.account-dialog').close();
        toast(`Welcome, ${customer.firstName}`);
      }
    });
    google.accounts.id.prompt();
  } catch { toast('Google sign-in is unavailable right now'); }
}

async function signInFacebook() {
  const appId = (DATA.settings.accounts || {}).facebookAppId;
  if (!appId) return toast('Facebook sign-in isn’t set up yet — add your Facebook app ID in Owner Studio');
  try {
    await loadScript('https://connect.facebook.net/en_US/sdk.js');
    FB.init({ appId, version: 'v19.0', xfbml: false });
    FB.login(res => {
      if (!res.authResponse) return toast('Facebook sign-in was cancelled');
      FB.api('/me', { fields: 'first_name,last_name,email' }, me => {
        writeCustomer({
          firstName: me.first_name || 'Friend', lastName: me.last_name || '', email: me.email || '',
          phone: customer?.phone || '', address: customer?.address || '', via: 'Facebook'
        });
        $('.account-dialog').close();
        toast(`Welcome, ${customer.firstName}`);
      });
    }, { scope: 'public_profile,email' });
  } catch { toast('Facebook sign-in is unavailable right now'); }
}

/* ---- checkout prefill ---- */
function applyCustomerToCheckout() {
  const form = $('#checkout-form');
  if (!form) return;
  const known = !!customer;
  $('.identity-known').hidden = !known;
  $('.identity-guest').hidden = known;
  if (!known) return;
  [['firstName', customer.firstName], ['lastName', customer.lastName], ['email', customer.email],
   ['phone', customer.phone], ['address', customer.address]].forEach(([name, value]) => {
    const field = form.elements[name];
    if (field && value && !field.value) field.value = value;
  });
}

$('.account-toggle').onclick = openAccount;
$('.account-close').onclick = () => $('.account-dialog').close();
$$('.social-btn').forEach(b => b.onclick = () => b.dataset.provider === 'google' ? signInGoogle() : signInFacebook());
$('#account-form').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  writeCustomer({
    firstName: f.get('firstName').trim(), lastName: f.get('lastName').trim(), email: f.get('email').trim(),
    phone: (f.get('phone') || '').trim(), address: (f.get('address') || '').trim(), via: 'Email'
  });
  $('.account-dialog').close();
  toast('Saved — your next order fills itself in');
};
$('#account-edit').onclick = () => {
  const form = $('#account-form');
  ['firstName', 'lastName', 'email', 'phone', 'address'].forEach(k => { if (form.elements[k]) form.elements[k].value = customer[k] || ''; });
  $('.account-signedin').hidden = true;
  $('.account-signedout').hidden = false;
};
$('#account-signout').onclick = () => { writeCustomer(null); toast('Signed out on this device'); };
$('#checkout-signin').onclick = () => { $('.checkout-dialog').close(); openAccount(); };
$('#checkout-notyou').onclick = () => {
  $('#checkout-form').reset();
  writeCustomer(null);
  applyCustomerToCheckout();
};

/* ---------------- events ---------------- */
$('.search-toggle').onclick = () => {
  const p = $('.search-panel');
  p.classList.toggle('open');
  p.setAttribute('aria-hidden', !p.classList.contains('open'));
  if (p.classList.contains('open')) $('#site-search').focus();
};
$('.search-close').onclick = () => $('.search-panel').classList.remove('open');
$('#site-search').oninput = e => {
  activeSearch = e.target.value.trim().toLowerCase();
  renderShop();
  $('#shop').scrollIntoView({ behavior: 'smooth' });
};

const menu = $('.mobile-menu');
$('.menu-toggle').onclick = e => {
  const open = !menu.classList.contains('open');
  menu.classList.toggle('open', open);
  e.currentTarget.classList.toggle('open', open);
  e.currentTarget.setAttribute('aria-expanded', open);
  menu.setAttribute('aria-hidden', !open);
  document.body.classList.toggle('locked', open);
};
menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenus(); });

const shopNav = $('.nav-item.has-menu');
shopNav.querySelector('.nav-trigger').onclick = e => {
  e.stopPropagation();
  const open = !shopNav.classList.contains('open');
  shopNav.classList.toggle('open', open);
  e.currentTarget.setAttribute('aria-expanded', open);
};
shopNav.addEventListener('mouseenter', () => shopNav.classList.add('open'));
shopNav.addEventListener('mouseleave', () => shopNav.classList.remove('open'));
shopNav.addEventListener('click', e => { if (e.target.closest('a')) shopNav.classList.remove('open'); });
document.addEventListener('click', e => { if (!shopNav.contains(e.target)) shopNav.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

$('.cart-toggle').onclick = () => toggleCart(true);
$('.drawer-close').onclick = () => toggleCart(false);
$('.overlay').onclick = () => toggleCart(false);
$('.close-and-shop').onclick = () => toggleCart(false);
$('.product-dialog .dialog-close').onclick = () => $('.product-dialog').close();
$('.checkout-btn').onclick = () => {
  toggleCart(false); applyCustomerToCheckout();
  $('.payment-setup-note').hidden = !!DATA.settings.paymentApiUrl;
  $('.online-pay').classList.toggle('needs-setup', !DATA.settings.paymentApiUrl);
  $('.checkout-dialog').showModal();
};
$('.checkout-close').onclick = () => $('.checkout-dialog').close();

const channelLabels = { mobile_money: 'Pay with MTN Mobile Money', card: 'Pay securely by card', bank_transfer: 'Pay by bank transfer' };
$$('.pay-method input').forEach(input => input.onchange = () => {
  $$('.pay-method').forEach(label => label.classList.toggle('selected', label.contains(input)));
  $('.online-pay').textContent = channelLabels[input.value];
});

$('#checkout-form').onsubmit = async e => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const lines = cart.map(x => {
    const p = byId(x.id);
    return `• ${p.name} — size ${x.size} × ${x.qty} (${money(p.price * x.qty)})`;
  });
  const total = cart.reduce((s, x) => s + byId(x.id).price * x.qty, 0);
  if (e.submitter?.value === 'online') {
    if (!DATA.settings.paymentApiUrl) return toast('Online payments need to be connected in Owner Studio first');
    const button = e.submitter;
    button.disabled = true; button.textContent = 'Opening secure payment…';
    try {
      const response = await fetch(DATA.settings.paymentApiUrl, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.get('email'),amount:total,currency:'GHS',channel:f.get('onlineChannel'),customer:{firstName:f.get('firstName'),lastName:f.get('lastName'),phone:f.get('phone')},delivery:f.get('address'),items:cart.map(x=>({id:x.id,name:byId(x.id).name,size:x.size,quantity:x.qty,unitPrice:byId(x.id).price}))})});
      if (!response.ok) throw new Error('Payment setup did not respond');
      const result = await response.json();
      if (!result.access_code || typeof PaystackPop === 'undefined') throw new Error('Payment could not be opened');
      const popup = new PaystackPop();
      popup.resumeTransaction(result.access_code);
    } catch (err) { toast(err.message || 'Online payment is temporarily unavailable'); }
    finally { button.disabled = false; button.textContent = 'Pay securely online'; }
    return;
  }
  const msg = `Hello Saam's Haya Wears, I'd like to place an order.\n\n${lines.join('\n')}\n\nTotal: ${money(total)}\n\nName: ${f.get('firstName')} ${f.get('lastName')}\nEmail: ${f.get('email')}\nPhone: ${f.get('phone')}\nDelivery: ${f.get('address')}\nPayment: WhatsApp confirmation`;
  window.open(waLink(msg), '_blank', 'noopener'); $('.checkout-dialog').close();
};

const newsletterForm = $('#newsletter-form');
if (newsletterForm) newsletterForm.onsubmit = e => { e.preventDefault(); e.currentTarget.reset(); toast('Welcome to the Saam’s Haya circle'); };
$('#year').textContent = new Date().getFullYear();
initDropdown($('#sort-dd'), v => { activeSort = v; renderShop(); });

/* ---------------- boot ---------------- */
window.SHW.loadStore().then(data => {
  DATA = data;
  window.SHW.useSettings(DATA.settings);
  applySettings();
  customer = readCustomer();
  renderAccount();
  render();
  renderCart();
});
/* Live refresh when the owner publishes from the admin page in another tab. */
window.addEventListener('storage', e => {
  if (e.key === window.SHW.STORE_KEYS.draft) window.SHW.loadStore().then(d => { DATA = d; window.SHW.useSettings(DATA.settings); applySettings(); render(); renderCart(); });
});
