const MAX_TEXT = 500;
const COLOR = /^#[0-9a-f]{3,8}$/i;
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;

const text = (value, max = MAX_TEXT) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const number = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const bool = value => value === true;
const color = (value, fallback) => COLOR.test(String(value || '')) ? String(value) : fallback;
function url(value, { image = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (image && DATA_IMAGE.test(raw) && raw.length <= 2_500_000) return raw;
  if (/^assets\/[a-z0-9._/-]+$/i.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    if (image && parsed.protocol === 'https:') {
      const isBlob = parsed.hostname.endsWith('.public.blob.vercel-storage.com');
      const isImageFile = /\.(?:png|jpe?g|webp|gif|avif)$/i.test(parsed.pathname);
      if (!isBlob && !isImageFile) return '';
    }
    return parsed.protocol === 'https:' ? parsed.href.slice(0, 2048) : '';
  } catch { return ''; }
}

function sanitiseCatalogue(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
  if (!source || !Array.isArray(source.products) || !source.settings || typeof source.settings !== 'object') return null;
  if (source.products.length > 500) return null;
  const s = source.settings;
  const categories = Array.isArray(s.categories) ? [...new Set(s.categories.map(x => text(x, 60)).filter(Boolean))].slice(0, 30) : [];
  const settings = {
    whatsapp: text(s.whatsapp, 20).replace(/\D/g, ''), whatsappHelpText: text(s.whatsappHelpText, 300),
    announcement: text(s.announcement, 180), announcementTwo: text(s.announcementTwo, 180),
    freeDeliveryFrom: number(s.freeDeliveryFrom, 0, 1_000_000), phone: text(s.phone, 40),
    snapchat: url(s.snapchat), tiktok: url(s.tiktok), heroTitle: text(s.heroTitle, 180),
    heroText: text(s.heroText, 600), heroEyebrow: text(s.heroEyebrow, 100), heroButtonText: text(s.heroButtonText, 80),
    heroFeaturedLabel: text(s.heroFeaturedLabel, 100), heroFeaturedTitle: text(s.heroFeaturedTitle, 120),
    heroImage: url(s.heroImage, { image: true }), categories,
    defaultSaleStyle: text(s.defaultSaleStyle, 60), paymentApiUrl: url(s.paymentApiUrl),
    accounts: {
      enabled: s.accounts?.enabled !== false, guestCheckout: s.accounts?.guestCheckout !== false,
      email: s.accounts?.email !== false, googleClientId: text(s.accounts?.googleClientId, 200),
      facebookAppId: text(s.accounts?.facebookAppId, 100)
    }, saleDesigns: {}
  };
  const designs = s.saleDesigns && typeof s.saleDesigns === 'object' && !Array.isArray(s.saleDesigns) ? s.saleDesigns : {};
  Object.entries(designs).slice(0, 50).forEach(([key, d]) => {
    if (!d || typeof d !== 'object') return;
    const id = text(key, 60).replace(/[^a-z0-9_-]/gi, '');
    if (!id) return;
    settings.saleDesigns[id] = {
      name: text(d.name, 80), hint: text(d.hint, 180), basedOn: text(d.basedOn, 30),
      shape: text(d.shape, 20), position: text(d.position, 20), bg: color(d.bg, '#a3441f'),
      bg2: color(d.bg2, ''), fg: color(d.fg, '#ffffff'), stickerText: text(d.stickerText, 80),
      tagText: text(d.tagText, 80), tagBg: color(d.tagBg, '#a3441f'), tagFg: color(d.tagFg, '#ffffff'),
      priceColor: color(d.priceColor, '#a3441f'), wasColor: color(d.wasColor, '#98a08f'),
      size: number(d.size, 6, 40), radius: number(d.radius, 0, 100), tracking: number(d.tracking, 0, 100),
      uppercase: bool(d.uppercase), animate: bool(d.animate), showSticker: d.showSticker !== false,
      showWas: d.showWas !== false, showTag: d.showTag !== false
    };
  });
  const products = source.products.map((p, index) => {
    if (!p || typeof p !== 'object') return null;
    return {
      id: Number.isSafeInteger(Number(p.id)) ? Number(p.id) : Date.now() + index,
      name: text(p.name, 120), category: text(p.category, 60), price: number(p.price, 0, 1_000_000),
      compare: number(p.compare, 0, 1_000_000), color: color(p.color, '#536034'), dark: color(p.dark, '#34401f'),
      bg: color(p.bg, '#d8c8ab'), badge: text(p.badge, 50), desc: text(p.desc, 1500), stock: text(p.stock, 80),
      sizes: Array.isArray(p.sizes) ? [...new Set(p.sizes.map(x => text(x, 30)).filter(Boolean))].slice(0, 30) : [],
      images: Array.isArray(p.images) ? p.images.map(x => url(x, { image: true })).filter(Boolean).slice(0, 8) : [],
      new: bool(p.new), best: bool(p.best), active: p.active !== false,
      sale: { on: bool(p.sale?.on), style: text(p.sale?.style, 60), label: text(p.sale?.label, 60) }
    };
  }).filter(p => p && p.name && p.category);
  if (!products.length && source.products.length) return null;
  return { updatedAt: Number.isFinite(Number(source.updatedAt)) ? Number(source.updatedAt) : 0, settings, products };
}

module.exports = { sanitiseCatalogue };
