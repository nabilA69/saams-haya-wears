/* Saam's Haya Wears — shared data layer
   Load order: published data/catalog.json  ->  local admin draft  ->  built-in seed.
   A local draft only wins when it is newer than the published file, so the admin
   sees unpublished work while every other visitor sees the published catalogue. */
(function () {
const STORE_KEYS = { draft: 'shw-draft-v1', session: 'shw-admin-session' };

const SEED = {
  updatedAt: 0,
  settings: {
    whatsapp: '233557896248',
    whatsappHelpText: "Hello Saam's Haya Wears, I'd like some help.",
    announcement: 'Complimentary delivery in Accra on orders over GH₵ 700',
    announcementTwo: 'Nationwide delivery available',
    freeDeliveryFrom: 700,
    phone: '+233 55 789 6248',
    snapchat: 'https://www.snapchat.com/add/wisaam_alhassan',
    tiktok: 'https://www.tiktok.com/@queenmishti07',
    heroTitle: 'Modesty,|beautifully| worn.',
    heroText: 'Thoughtfully selected silhouettes for the woman who dresses with intention. Refined, graceful, and made for every chapter.',
    heroEyebrow: 'Modest fashion · Ghana',
    heroButtonText: 'Shop new arrivals',
    heroFeaturedLabel: 'Featured collection',
    heroFeaturedTitle: 'Olive Signature Edit',
    heroImage: 'assets/campaign-olive-v2.jpg',
    categories: ['Abayas', 'Khimars', 'Sets', 'Accessories'],
    defaultSaleStyle: 'classic',
    saleDesigns: {},
    accounts: { enabled: true, guestCheckout: true, email: true, googleClientId: '', facebookAppId: '' },
    paymentApiUrl: ''
  },
  products: [
    {id:1,name:'Afiya Pleated Abaya',category:'Abayas',price:420,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#536034',dark:'#34401f',bg:'#d8c8ab',badge:'New',sizes:['52','54','56','58'],desc:'A graceful everyday abaya with soft pleating through the skirt and an easy, fluid drape.',images:[],new:true,best:true,active:true,stock:'In stock'},
    {id:2,name:'Nura Embroidered Abaya',category:'Abayas',price:495,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#292c27',dark:'#171a17',bg:'#b7a895',badge:'Limited',sizes:['54','56','58','60'],desc:'A refined black abaya finished with delicate tonal embroidery at the cuffs and neckline.',images:[],new:true,best:false,active:true,stock:'In stock'},
    {id:3,name:'Sahara Two-Piece Set',category:'Sets',price:460,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#9a7352',dark:'#79543a',bg:'#d8c6b6',badge:'New',sizes:['S','M','L','XL'],desc:'An effortless longline tunic and wide-leg trouser pairing in a warm, earthy neutral.',images:[],new:true,best:true,active:true,stock:'In stock'},
    {id:4,name:'Mariam Butterfly Abaya',category:'Abayas',price:440,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#6e493a',dark:'#503125',bg:'#cab4a3',badge:'',sizes:['52','54','56','58','60'],desc:'A beautifully generous butterfly cut designed for movement, coverage and occasion-ready ease.',images:[],new:true,best:false,active:true,stock:'In stock'},
    {id:5,name:'Layla Layered Khimar',category:'Khimars',price:185,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#5c6545',dark:'#414a2e',bg:'#d1c9b8',badge:'Best seller',sizes:['One size'],desc:'A lightweight, layered khimar with an elegant curved hem and comfortable face opening.',images:[],new:false,best:true,active:true,stock:'In stock'},
    {id:6,name:'Zahra Prayer Set',category:'Sets',price:285,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#b69d83',dark:'#8c725a',bg:'#e1d9cf',badge:'',sizes:['S/M','L/XL'],desc:'A soft two-piece prayer set offering full coverage with a calm, breathable feel.',images:[],new:false,best:true,active:true,stock:'In stock'},
    {id:7,name:'Medina Satin Abaya',category:'Abayas',price:520,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#263d36',dark:'#172a25',bg:'#aebbb4',badge:'Occasion',sizes:['54','56','58'],desc:'Subtle lustre and a fluid cut make Medina a polished choice for evenings and special moments.',images:[],new:false,best:true,active:true,stock:'In stock'},
    {id:8,name:'Essential Jersey Hijab',category:'Accessories',price:85,compare:0,sale:{on:false,style:'classic',label:'Sale'},color:'#8e755f',dark:'#6c5747',bg:'#d7ccbf',badge:'Everyday',sizes:['One size'],desc:'Soft, non-slip premium jersey with just the right stretch for effortless everyday styling.',images:[],new:false,best:false,active:true,stock:'In stock'}
  ]
};

const clone = v => JSON.parse(JSON.stringify(v));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = (value, fallback = '#536034') => /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? String(value) : fallback;
const safeImage = value => {
  const raw = String(value || '').trim();
  if (/^assets\/[a-z0-9._/-]+$/i.test(raw) || /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
  try { const parsed = new URL(raw, location.href); return parsed.protocol === 'https:' ? parsed.href : ''; }
  catch { return ''; }
};

function normalise(data) {
  const d = Object.assign({ updatedAt: 0 }, clone(SEED), data || {});
  d.settings = Object.assign({}, SEED.settings, (data && data.settings) || {});
  d.settings.saleDesigns = Object.assign({}, (data && data.settings && data.settings.saleDesigns) || {});
  d.settings.accounts = Object.assign({}, SEED.settings.accounts, (data && data.settings && data.settings.accounts) || {});
  d.products = ((data && data.products) || SEED.products).map((p, i) => Object.assign(
    { id: Date.now() + i, images: [], sizes: [], compare: 0, active: true, stock: 'In stock',
      color: '#536034', dark: '#34401f', bg: '#d8c8ab' },
    p,
    { sale: Object.assign({ on: false, style: 'classic', label: 'Sale' }, p.sale || {}) }
  ));
  return d;
}

/* Browsers block storage in some contexts (file:// in Safari, private windows,
   blocked site data), so every access is guarded and reports what went wrong. */
function readDraft() {
  try { const raw = localStorage.getItem(STORE_KEYS.draft); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function writeDraft(data) {
  data.updatedAt = Date.now();
  try {
    localStorage.setItem(STORE_KEYS.draft, JSON.stringify(data));
    return { ok: true, data };
  } catch (err) {
    const full = /quota|exceed/i.test(err && err.name + err.message);
    return {
      ok: false,
      data,
      reason: full ? 'quota' : 'blocked',
      message: full
        ? 'This browser is out of storage space — usually too many photos. Publish or download a backup, then remove some photos.'
        : 'This browser is not letting the page save. Open the site through a web address (http://…) rather than straight from the file, and avoid private browsing.'
    };
  }
}

function readSession() {
  try { return sessionStorage.getItem(STORE_KEYS.session); } catch { return null; }
}

function writeSession(v) {
  try { v === null ? sessionStorage.removeItem(STORE_KEYS.session) : sessionStorage.setItem(STORE_KEYS.session, v); } catch { /* ignore */ }
}

async function loadStore() {
  let published = null;
  try {
    const remote = location.protocol === 'https:' ? '/api/catalog' : 'data/catalog.json';
    const res = await fetch(remote, { cache: 'no-store' });
    if (res.ok) published = await res.json();
  } catch { /* opened from file:// or not published yet */ }
  const draft = readDraft();
  let chosen = published || null;
  if (draft && (!published || (draft.updatedAt || 0) > (published.updatedAt || 0))) chosen = draft;
  return normalise(chosen);
}

/* ---- pricing helpers shared by storefront and admin ---- */
const money = n => `GH₵ ${Number(n || 0).toLocaleString()}`;

function priceInfo(p) {
  const on = !!(p.sale && p.sale.on) && Number(p.compare) > Number(p.price);
  const off = on ? Math.round((1 - p.price / p.compare) * 100) : 0;
  return { on, off, style: (p.sale && p.sale.style) || 'classic', label: (p.sale && p.sale.label) || 'Sale' };
}

/* ---------------- sale designs ----------------
   Every design is data, not hard-coded CSS: the owner can recolour, resize,
   reposition and reword any of them in the studio, or build new ones. The
   built-ins below are only the starting points. */

const DESIGN_DEFAULTS = {
  classic: { name: 'Classic strike', hint: 'Was-price struck through with a quiet sale chip.',
    shape: 'chip', position: 'top-right', bg: '#a3441f', bg2: '', fg: '#ffffff',
    stickerText: '{label}', tagText: '{label}', tagBg: '#a3441f', tagFg: '#ffffff',
    priceColor: '#a3441f', wasColor: '#98a08f',
    size: 9, radius: 0, tracking: 10, uppercase: true, animate: false, showSticker: true, showWas: true, showTag: true },
  percent: { name: 'Percentage off', hint: 'Leads with the saving, e.g. −25%.',
    shape: 'chip', position: 'top-right', bg: '#1e2c19', bg2: '', fg: '#ffffff',
    stickerText: '−{off}%', tagText: '−{off}%', tagBg: '#1e2c19', tagFg: '#ffffff',
    priceColor: '#a3441f', wasColor: '#98a08f',
    size: 11, radius: 0, tracking: 4, uppercase: true, animate: false, showSticker: true, showWas: true, showTag: true },
  ribbon: { name: 'Corner ribbon', hint: 'Diagonal ribbon across the photo corner.',
    shape: 'ribbon', position: 'top-right', bg: '#a3441f', bg2: '', fg: '#ffffff',
    stickerText: '−{off}%', tagText: '{label}', tagBg: '#22301b', tagFg: '#ffffff',
    priceColor: '#a3441f', wasColor: '#98a08f',
    size: 9, radius: 0, tracking: 10, uppercase: true, animate: false, showSticker: true, showWas: true, showTag: true },
  burst: { name: 'Starburst', hint: 'Bold circular burst — best for big markdowns.',
    shape: 'burst', position: 'top-right', bg: '#e9cd72', bg2: '#c79c2f', fg: '#22301b',
    stickerText: '{off}%|off', tagText: '{label}', tagBg: '#a3441f', tagFg: '#ffffff',
    priceColor: '#a3441f', wasColor: '#98a08f',
    size: 9, radius: 0, tracking: 6, uppercase: true, animate: false, showSticker: true, showWas: true, showTag: true },
  flag: { name: 'Gold flag', hint: 'Elegant gold flag tag, on-brand and calm.',
    shape: 'flag', position: 'top-right', bg: '#e2c264', bg2: '#b8912c', fg: '#22301b',
    stickerText: '{label}', tagText: '{label}', tagBg: '#c9a63f', tagFg: '#22301b',
    priceColor: '#a3441f', wasColor: '#98a08f',
    size: 9, radius: 0, tracking: 10, uppercase: true, animate: false, showSticker: true, showWas: true, showTag: true },
  glow: { name: 'Glow pill', hint: 'Softly pulsing pill for flash sales.',
    shape: 'pill', position: 'bottom-center', bg: '#1e2c19', bg2: '', fg: '#f0e2b0',
    stickerText: '{label} · −{off}%', tagText: '{label}', tagBg: '#a3441f', tagFg: '#ffffff',
    priceColor: '#a3441f', wasColor: '#98a08f',
    size: 9, radius: 100, tracking: 10, uppercase: true, animate: true, showSticker: true, showWas: true, showTag: true }
};

const SHAPES = [
  { id: 'chip', name: 'Chip' }, { id: 'pill', name: 'Pill' }, { id: 'ribbon', name: 'Corner ribbon' },
  { id: 'burst', name: 'Starburst' }, { id: 'flag', name: 'Flag' }, { id: 'tab', name: 'Side tab' }
];
const POSITIONS = [
  { id: 'top-left', name: 'Top left' }, { id: 'top-right', name: 'Top right' }, { id: 'top-center', name: 'Top centre' },
  { id: 'bottom-left', name: 'Bottom left' }, { id: 'bottom-right', name: 'Bottom right' }, { id: 'bottom-center', name: 'Bottom centre' }
];

/* The storefront and the studio both call useSettings() once the catalogue loads,
   so the tag helpers can reach the owner's saved designs. */
let ACTIVE_SETTINGS = null;
const useSettings = s => { ACTIVE_SETTINGS = s; };

function allDesigns(settings) {
  const s = settings || ACTIVE_SETTINGS || {};
  const saved = s.saleDesigns || {};
  const ids = [...Object.keys(DESIGN_DEFAULTS), ...Object.keys(saved).filter(id => !DESIGN_DEFAULTS[id])];
  return ids.map(id => designFor(id, s));
}

function designFor(id, settings) {
  const s = settings || ACTIVE_SETTINGS || {};
  const saved = (s.saleDesigns || {})[id];
  const base = DESIGN_DEFAULTS[id] || DESIGN_DEFAULTS[(saved && saved.basedOn)] || DESIGN_DEFAULTS.classic;
  return Object.assign({ id, custom: !DESIGN_DEFAULTS[id] }, base, saved || {});
}

function isDesignEdited(id, settings) {
  const s = settings || ACTIVE_SETTINGS || {};
  const saved = (s.saleDesigns || {})[id];
  return !!(saved && Object.keys(saved).length);
}

/* {label} {off} {price} {was} {save} are replaced with the piece's real numbers. */
function fillTokens(text, ctx) {
  return String(text ?? '')
    .replace(/\{label\}/g, ctx.label)
    .replace(/\{off\}/g, ctx.off)
    .replace(/\{price\}/g, money(ctx.price))
    .replace(/\{was\}/g, money(ctx.compare))
    .replace(/\{save\}/g, money(ctx.compare - ctx.price));
}

function designVars(d) {
  const bg = safeColor(d.bg, '#a3441f');
  const bg2 = safeColor(d.bg2, '');
  return [
    `--deco-bg:${bg2 ? `linear-gradient(180deg,${bg},${bg2})` : bg}`,
    `--deco-flat:${bg}`,
    `--deco-fg:${safeColor(d.fg, '#ffffff')}`,
    `--deco-size:${Math.min(40, Math.max(6, Number(d.size) || 9))}px`,
    `--deco-radius:${Math.min(100, Math.max(0, Number(d.radius) || 0))}px`,
    `--deco-track:${Math.min(1, Math.max(0, Number(d.tracking) || 0) / 100)}em`,
    `--deco-case:${d.uppercase ? 'uppercase' : 'none'}`,
    `--tag-bg:${safeColor(d.tagBg, '#a3441f')}`,
    `--tag-fg:${safeColor(d.tagFg, '#ffffff')}`,
    `--price-color:${safeColor(d.priceColor, '#a3441f')}`,
    `--was-color:${safeColor(d.wasColor, '#98a08f')}`
  ].join(';');
}

/* Price-tag markup used on cards, product dialog and the studio preview. */
function priceTag(p, size = 'card', settings) {
  const info = priceInfo(p);
  if (!info.on) return `<strong class="price">${money(p.price)}</strong>`;
  const d = designFor(info.style, settings);
  const ctx = { label: info.label, off: info.off, price: p.price, compare: p.compare };
  return `<span class="price-tag ${size === 'large' ? 'tag-lg' : ''}" style="${designVars(d)}">
    ${d.showWas ? `<s class="was">${money(p.compare)}</s>` : ''}
    <strong class="now">${money(p.price)}</strong>
    ${d.showTag ? `<em class="tag-flag">${escapeHtml(fillTokens(d.tagText, ctx))}</em>` : ''}
  </span>`;
}

/* Decoration drawn on the product image when a piece is on sale. */
function saleSticker(p, settings) {
  const info = priceInfo(p);
  if (!info.on) return '';
  const d = designFor(info.style, settings);
  if (!d.showSticker) return '';
  const ctx = { label: info.label, off: info.off, price: p.price, compare: p.compare };
  const [big, small] = fillTokens(d.stickerText, ctx).split('|');
  const shapes = new Set(SHAPES.map(x => x.id));
  const positions = new Set(POSITIONS.map(x => x.id));
  const body = small !== undefined ? `<b>${escapeHtml(big)}</b><i>${escapeHtml(small)}</i>` : escapeHtml(big);
  return `<span class="sale-deco shape-${shapes.has(d.shape) ? d.shape : 'chip'} pos-${positions.has(d.position) ? d.position : 'top-right'}${d.animate ? ' deco-animate' : ''}" style="${designVars(d)}">${body}</span>`;
}

const SALE_STYLES = Object.keys(DESIGN_DEFAULTS)
  .map(id => ({ id, name: DESIGN_DEFAULTS[id].name, hint: DESIGN_DEFAULTS[id].hint }));

window.SHW = { SEED, STORE_KEYS, loadStore, readDraft, writeDraft, readSession, writeSession, normalise, clone,
  money, priceInfo, priceTag, saleSticker, SALE_STYLES,
  DESIGN_DEFAULTS, SHAPES, POSITIONS, useSettings, allDesigns, designFor, isDesignEdited, fillTokens, designVars,
  escapeHtml, safeColor, safeImage };
})();
