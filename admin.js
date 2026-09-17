/* Saam's Haya Wears — Owner Studio */
const { money, priceTag, saleSticker, priceInfo, SALE_STYLES, clone } = window.SHW;

let DATA = null;
let editing = null;          // working copy of the listing open in the editor
let defaultSaleStyle = 'classic';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.remove('show'), 2600);
}

function save(note = 'All changes saved') {
  const state = $('#save-state');
  state.textContent = 'Saving…';
  state.classList.add('saving');
  const result = window.SHW.writeDraft(DATA);
  if (!result.ok) {
    state.textContent = 'Not saved';
    state.classList.remove('saving');
    state.classList.add('failed');
    toast(result.message);
    return false;
  }
  state.classList.remove('failed');
  setTimeout(() => { state.textContent = note; state.classList.remove('saving'); }, 250);
  return true;
}

/* ---------------- session ---------------- */
$('#lock-btn').onclick = () => {
  window.SHW.writeSession(null);
  if (location.protocol === 'https:') fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).finally(() => { window.location.href = 'admin.html'; });
  else window.location.href = 'admin.html';
};

/* ---------------- tabs ---------------- */
const TITLES = {
  products: ['Listings', 'Your listings'],
  landing: ['Landing page', 'Edit your storefront hero'],
  design: ['Sale designs', 'Discount & price tags'],
  settings: ['Store settings', 'Storefront settings'],
  publish: ['Publish', 'Publish your updates']
};
$$('.side-nav button').forEach(b => b.onclick = () => {
  $$('.side-nav button').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  $$('.panel').forEach(p => p.classList.remove('on'));
  $('#tab-' + b.dataset.tab).classList.add('on');
  const [crumb, title] = TITLES[b.dataset.tab];
  $('#crumb').textContent = crumb;
  $('#work-title').textContent = title;
  $('#new-product').hidden = b.dataset.tab !== 'products';
  if (b.dataset.tab === 'publish') renderPublishMeta();
});

/* ---------------- listings ---------------- */
function renderStats() {
  const live = DATA.products.filter(p => p.active !== false);
  $('#s-live').textContent = live.length;
  $('#s-sale').textContent = DATA.products.filter(p => priceInfo(p).on).length;
  $('#s-hidden').textContent = DATA.products.length - live.length;
  $('#s-value').textContent = money(live.reduce((s, p) => s + Number(p.price || 0), 0));
}

function renderListings() {
  const q = $('#admin-search').value.trim().toLowerCase();
  const mode = $('#admin-filter').value;
  const list = DATA.products.filter(p => {
    if (q && !(p.name + p.category).toLowerCase().includes(q)) return false;
    if (mode === 'sale') return priceInfo(p).on;
    if (mode === 'live') return p.active !== false;
    if (mode === 'hidden') return p.active === false;
    return true;
  });

  $('#listings').innerHTML = list.length ? list.map(p => {
    const info = priceInfo(p);
    const photo = p.images && p.images[0];
    return `<article class="row${p.active === false ? ' off' : ''}" data-id="${p.id}">
      <div class="row-thumb${photo ? ' has-photo' : ''}" style="--tb:${p.bg};--tg:${p.color}">${photo ? `<img src="${photo}" alt="">` : ''}</div>
      <div class="row-main">
        <h4>${esc(p.name)}</h4>
        <div class="row-tags">
          <span class="tag">${esc(p.category)}</span>
          <span class="tag ${p.active === false ? 'hidden' : 'live'}">${p.active === false ? 'Hidden' : 'Live'}</span>
          ${info.on ? `<span class="tag sale">−${info.off}% · ${esc(info.style)}</span>` : ''}
          ${p.new ? '<span class="tag">New arrivals</span>' : ''}
          ${p.best ? '<span class="tag">Best sellers</span>' : ''}
          <span class="tag">${p.images.length || 0} photo${p.images.length === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div class="row-price">${info.on ? `<s>${money(p.compare)}</s><b>${money(p.price)}</b>` : money(p.price)}</div>
      <div class="row-actions">
        <button class="icon-btn" data-act="up" title="Move up">↑</button>
        <button class="icon-btn" data-act="down" title="Move down">↓</button>
        <button class="icon-btn" data-act="copy" title="Duplicate">⧉</button>
        <button class="icon-btn" data-act="edit" title="Edit">✎</button>
      </div>
    </article>`;
  }).join('') : `<div class="empty">No listings match. <button class="btn ghost" id="clear-filter">Show everything</button></div>`;

  $('#clear-filter') && ($('#clear-filter').onclick = () => {
    $('#admin-search').value = ''; $('#admin-filter').value = 'all'; renderListings();
  });

  $$('.row').forEach(row => {
    const id = +row.dataset.id;
    row.querySelectorAll('[data-act]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const i = DATA.products.findIndex(p => p.id === id);
      const act = b.dataset.act;
      if (act === 'edit') return openEditor(DATA.products[i]);
      if (act === 'copy') {
        const copy = clone(DATA.products[i]);
        copy.id = Date.now();
        copy.name += ' (copy)';
        DATA.products.splice(i + 1, 0, copy);
        toast('Listing duplicated');
      }
      if (act === 'up' && i > 0) DATA.products.splice(i - 1, 0, DATA.products.splice(i, 1)[0]);
      if (act === 'down' && i < DATA.products.length - 1) DATA.products.splice(i + 1, 0, DATA.products.splice(i, 1)[0]);
      save(); renderStats(); renderListings();
    });
    row.onclick = () => openEditor(DATA.products.find(p => p.id === id));
  });
}

$('#admin-search').oninput = renderListings;
$('#admin-filter').onchange = renderListings;

/* ---------------- editor ---------------- */
function blankProduct() {
  return {
    id: Date.now(), name: '', category: DATA.settings.categories[0] || 'Abayas', price: 0, compare: 0,
    sale: { on: false, style: defaultSaleStyle, label: 'Sale' },
    color: '#536034', dark: '#34401f', bg: '#d8c8ab', badge: '', sizes: ['52', '54', '56', '58'],
    desc: '', images: [], new: true, best: false, active: true, stock: 'In stock'
  };
}

function openEditor(product) {
  const isNew = !product;
  editing = clone(product || blankProduct());
  $('#editor-mode').textContent = isNew ? 'New listing' : 'Editing';
  $('#editor-title').textContent = isNew ? 'Add a piece' : editing.name || 'Untitled piece';
  $('#delete-product').hidden = isNew;

  $('#f-category').innerHTML = DATA.settings.categories
    .map(c => `<option ${c === editing.category ? 'selected' : ''}>${esc(c)}</option>`).join('');
  $('#f-name').value = editing.name;
  $('#f-badge').value = editing.badge || '';
  $('#f-desc').value = editing.desc || '';
  $('#f-stock').value = editing.stock || 'In stock';
  $('#f-sizes').value = (editing.sizes || []).join(', ');
  $('#f-price').value = editing.price || '';
  $('#f-compare').value = editing.compare || '';
  $('#f-sale').checked = !!editing.sale.on;
  $('#f-sale-label').value = editing.sale.label || 'Sale';
  $('#f-color').value = editing.color;
  $('#f-dark').value = editing.dark;
  $('#f-bg').value = editing.bg;
  $('#f-active').checked = editing.active !== false;
  $('#f-new').checked = !!editing.new;
  $('#f-best').checked = !!editing.best;

  renderStylePicker();
  renderThumbs();
  syncFromForm();
  $('#editor').classList.add('open');
  $('#editor').setAttribute('aria-hidden', 'false');
  $('#editor-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#f-name').focus(), 320);
}

function closeEditor() {
  $('#editor').classList.remove('open');
  $('#editor').setAttribute('aria-hidden', 'true');
  $('#editor-overlay').hidden = true;
  document.body.style.overflow = '';
  editing = null;
}

function syncFromForm() {
  if (!editing) return;
  editing.name = $('#f-name').value.trim();
  editing.category = $('#f-category').value;
  editing.badge = $('#f-badge').value.trim();
  editing.desc = $('#f-desc').value.trim();
  editing.stock = $('#f-stock').value.trim() || 'In stock';
  editing.sizes = $('#f-sizes').value.split(',').map(s => s.trim()).filter(Boolean);
  editing.price = Number($('#f-price').value) || 0;
  editing.compare = Number($('#f-compare').value) || 0;
  editing.sale.on = $('#f-sale').checked;
  editing.sale.label = $('#f-sale-label').value.trim() || 'Sale';
  editing.color = $('#f-color').value;
  editing.dark = $('#f-dark').value;
  editing.bg = $('#f-bg').value;
  editing.active = $('#f-active').checked;
  editing.new = $('#f-new').checked;
  editing.best = $('#f-best').checked;
  $('#sale-fields').hidden = !editing.sale.on;

  const info = priceInfo(editing);
  $('#off-hint').textContent = editing.sale.on
    ? (info.on ? `Shoppers see ${money(editing.price)} instead of ${money(editing.compare)} — a saving of ${info.off}%.`
               : 'Set a “was price” higher than the selling price for the discount to show.')
    : '';
  renderPreview();
}

$$('#editor input, #editor select, #editor textarea').forEach(el => {
  el.addEventListener('input', syncFromForm);
  el.addEventListener('change', syncFromForm);
});

function renderPreview() {
  const p = editing;
  const photo = p.images && p.images[0];
  $('#preview-card').innerHTML = `
    <div class="pv-image" style="--card-bg:${p.bg};--garment:${p.color}">
      ${p.badge ? `<span class="pv-badge">${esc(p.badge)}</span>` : ''}
      ${saleSticker(p)}
      ${photo ? `<img src="${photo}" alt="">` : '<span class="head"></span><span class="fig"></span>'}
    </div>
    <div class="pv-info">
      <h4>${esc(p.name) || 'Untitled piece'}</h4>
      <div class="pv-meta">${priceTag(p)}<span>${esc(p.category)}</span></div>
    </div>`;
}

function renderStylePicker() {
  $('#style-grid').innerHTML = window.SHW.allDesigns(DATA.settings).map(s => {
    const demo = { price: 360, compare: 480, bg: '#d8c8ab', color: '#536034',
                   sale: { on: true, style: s.id, label: editing.sale.label || 'Sale' } };
    return `<button type="button" class="style-opt${editing.sale.style === s.id ? ' on' : ''}" data-style="${s.id}">
      <b>${esc(s.name)}</b>
      <span class="style-shot" style="--card-bg:${demo.bg};--garment:${demo.color}">${saleSticker(demo, DATA.settings)}</span>
      ${priceTag(demo, 'card', DATA.settings)}
    </button>`;
  }).join('');
  $$('#style-grid .style-opt').forEach(b => b.onclick = () => {
    editing.sale.style = b.dataset.style;
    renderStylePicker();
    renderPreview();
  });
}

/* photos: resized in the browser so the catalogue file stays small */
function readImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1100;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function addFiles(files) {
  const list = [...files].filter(f => f.type.startsWith('image/'));
  if (!list.length) return;
  toast(`Processing ${list.length} photo${list.length === 1 ? '' : 's'}…`);
  for (const f of list) {
    const data = await readImage(f);
    if (data) editing.images.push(data);
  }
  renderThumbs();
  renderPreview();
  toast('Photos added');
}

function renderThumbs() {
  $('#thumb-row').innerHTML = editing.images.map((src, i) => `
    <div class="thumb${i === 0 ? ' main' : ''}">
      ${i === 0 ? '<span class="main-flag">Main</span>' : ''}
      <img src="${src}" alt="">
      <div class="thumb-bar">
        ${i === 0 ? '' : `<button type="button" data-main="${i}">Make main</button>`}
        <button type="button" data-del="${i}">Remove</button>
      </div>
    </div>`).join('');
  $$('#thumb-row [data-main]').forEach(b => b.onclick = () => {
    const i = +b.dataset.main;
    editing.images.unshift(editing.images.splice(i, 1)[0]);
    renderThumbs(); renderPreview();
  });
  $$('#thumb-row [data-del]').forEach(b => b.onclick = () => {
    editing.images.splice(+b.dataset.del, 1);
    renderThumbs(); renderPreview();
  });
}

$('#f-images').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
const dz = $('#dropzone');
['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', e => addFiles(e.dataTransfer.files));

$('#new-product').onclick = () => openEditor(null);
$('#editor-close').onclick = closeEditor;
$('#cancel-product').onclick = closeEditor;
$('#editor-overlay').onclick = () => { if (editing) closeEditor(); if (editingDesign) closeDesign(); };
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (editing) closeEditor();
  if (editingDesign) closeDesign();
});

$('#save-product').onclick = () => {
  syncFromForm();
  if (!editing.name) { toast('Give the piece a name first'); $('#f-name').focus(); return; }
  if (!editing.price) { toast('Add a selling price first'); $('#f-price').focus(); return; }
  if (!editing.sizes.length) editing.sizes = ['One size'];
  const i = DATA.products.findIndex(p => p.id === editing.id);
  i >= 0 ? DATA.products[i] = editing : DATA.products.unshift(editing);
  save();
  renderStats(); renderListings();
  toast(i >= 0 ? 'Listing updated' : 'Listing published to your storefront');
  closeEditor();
};

$('#delete-product').onclick = () => {
  if (!confirm(`Delete “${editing.name}”? This cannot be undone.`)) return;
  DATA.products = DATA.products.filter(p => p.id !== editing.id);
  save(); renderStats(); renderListings();
  toast('Listing deleted');
  closeEditor();
};

/* ---------------- sale design gallery ---------------- */
const demoPiece = (off, styleId, label) => {
  const compare = 480;
  return { name: 'Sample piece', category: 'Abayas', bg: '#d8c8ab', color: '#536034', images: [],
    compare, price: Math.round(compare * (1 - off / 100)),
    sale: { on: true, style: styleId, label: label || 'Sale' } };
};

function renderDesigns() {
  const off = +$('#preview-off').value;
  $('#preview-off-val').textContent = off + '%';
  const designs = window.SHW.allDesigns(DATA.settings);
  $('#design-grid').innerHTML = designs.map(d => {
    const demo = demoPiece(off, d.id);
    const isDefault = defaultSaleStyle === d.id;
    const inUse = DATA.products.filter(p => priceInfo(p).on && p.sale.style === d.id).length;
    return `<article class="design-card${isDefault ? ' on' : ''}" data-id="${d.id}">
      <div class="design-shot" style="--card-bg:${demo.bg};--garment:${demo.color}">
        <span class="head"></span><span class="fig"></span>${saleSticker(demo, DATA.settings)}
      </div>
      <div class="design-body">
        <h4>${esc(d.name)}</h4>
        <p>${esc(d.hint || 'Your own design.')}</p>
        ${priceTag(demo, 'card', DATA.settings)}
        <div class="design-flags">
          ${isDefault ? '<span class="tag live">Default</span>' : ''}
          ${d.custom ? '<span class="tag">Custom</span>' : (window.SHW.isDesignEdited(d.id, DATA.settings) ? '<span class="tag">Edited</span>' : '')}
          ${inUse ? `<span class="tag">${inUse} in use</span>` : ''}
        </div>
        <div class="design-btns">
          <button class="btn ghost sm" data-act="edit">Customise</button>
          <button class="btn ghost sm" data-act="copy">Duplicate</button>
          ${isDefault ? '' : '<button class="btn ghost sm" data-act="default">Make default</button>'}
        </div>
      </div>
    </article>`;
  }).join('');

  $$('#design-grid .design-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelectorAll('[data-act]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      if (b.dataset.act === 'edit') return openDesign(id);
      if (b.dataset.act === 'copy') return duplicateDesign(id);
      defaultSaleStyle = id;
      DATA.settings.defaultSaleStyle = id;
      save(); renderDesigns();
      toast('New sales will use this design');
    });
  });
}

$('#preview-off').oninput = renderDesigns;

$('#apply-all').onclick = () => {
  const onSale = DATA.products.filter(p => priceInfo(p).on);
  if (!onSale.length) return toast('Nothing is on sale yet');
  onSale.forEach(p => p.sale.style = defaultSaleStyle);
  save(); renderListings();
  toast(`${onSale.length} sale tag${onSale.length === 1 ? '' : 's'} updated`);
};

function duplicateDesign(id) {
  const src = window.SHW.designFor(id, DATA.settings);
  const newId = 'design-' + Date.now();
  DATA.settings.saleDesigns[newId] = Object.assign({}, src, {
    id: newId, custom: true, basedOn: window.SHW.DESIGN_DEFAULTS[id] ? id : (src.basedOn || 'classic'),
    name: src.name + ' copy', hint: 'Your own design.'
  });
  save(); renderDesigns();
  openDesign(newId);
}

$('#new-design').onclick = () => duplicateDesign(defaultSaleStyle);

/* ---------------- sale design editor ---------------- */
const DESIGN_FIELDS = ['name', 'stickerText', 'tagText', 'shape', 'position', 'size', 'radius', 'tracking',
  'uppercase', 'animate', 'showSticker', 'showTag', 'showWas', 'bg', 'bg2', 'fg', 'tagBg', 'tagFg', 'priceColor', 'wasColor'];
let editingDesign = null;

function openDesign(id) {
  editingDesign = Object.assign({}, window.SHW.designFor(id, DATA.settings), { id });
  const builtIn = !!window.SHW.DESIGN_DEFAULTS[id];
  $('#design-mode').textContent = builtIn ? 'Built-in design' : 'Your design';
  $('#design-title').textContent = editingDesign.name;
  $('#design-reset').hidden = !builtIn;
  $('#design-delete').hidden = builtIn;

  $('#d-shape').innerHTML = window.SHW.SHAPES
    .map(s => `<option value="${s.id}" ${s.id === editingDesign.shape ? 'selected' : ''}>${s.name}</option>`).join('');
  $('#d-position').innerHTML = window.SHW.POSITIONS
    .map(s => `<option value="${s.id}" ${s.id === editingDesign.position ? 'selected' : ''}>${s.name}</option>`).join('');

  DESIGN_FIELDS.forEach(f => {
    const el = $('#d-' + f);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!editingDesign[f];
    else el.value = editingDesign[f] ?? '';
  });
  $('#d-gradient').checked = !!editingDesign.bg2;
  $('#d-bg2').value = editingDesign.bg2 || editingDesign.bg;

  syncDesign();
  $('#design-editor').classList.add('open');
  $('#design-editor').setAttribute('aria-hidden', 'false');
  $('#editor-overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDesign() {
  $('#design-editor').classList.remove('open');
  $('#design-editor').setAttribute('aria-hidden', 'true');
  $('#editor-overlay').hidden = true;
  document.body.style.overflow = '';
  editingDesign = null;
}

function syncDesign() {
  if (!editingDesign) return;
  DESIGN_FIELDS.forEach(f => {
    const el = $('#d-' + f);
    if (!el) return;
    if (el.type === 'checkbox') editingDesign[f] = el.checked;
    else if (el.type === 'range') editingDesign[f] = Number(el.value);
    else editingDesign[f] = el.value;
  });
  editingDesign.bg2 = $('#d-gradient').checked ? $('#d-bg2').value : '';
  $('#d-size-val').textContent = editingDesign.size;
  $('#d-radius-val').textContent = editingDesign.radius;
  $('#d-tracking-val').textContent = editingDesign.tracking;
  $('#d-bg2').closest('label').style.opacity = $('#d-gradient').checked ? 1 : .45;
  renderDesignPreview();
}

function renderDesignPreview() {
  const off = +$('#d-preview-off').value;
  $('#d-preview-off-val').textContent = off + '%';
  // preview against the live edits rather than what is saved
  const probe = Object.assign({}, DATA.settings, {
    saleDesigns: Object.assign({}, DATA.settings.saleDesigns, { __preview: editingDesign })
  });
  const demo = demoPiece(off, '__preview');
  $('#design-preview').innerHTML = `
    <div class="pv-image" style="--card-bg:${demo.bg};--garment:${demo.color}">
      <span class="pv-badge">New</span>
      ${saleSticker(demo, probe)}
      <span class="head"></span><span class="fig"></span>
    </div>
    <div class="pv-info">
      <h4>Sample piece</h4>
      <div class="pv-meta">${priceTag(demo, 'card', probe)}<span>Abayas</span></div>
    </div>`;
}

$$('#design-editor input, #design-editor select').forEach(el => {
  el.addEventListener('input', syncDesign);
  el.addEventListener('change', syncDesign);
});
$('#d-preview-off').addEventListener('input', renderDesignPreview);

$('#design-save').onclick = () => {
  syncDesign();
  if (!editingDesign.name.trim()) { toast('Give the design a name'); return $('#d-name').focus(); }
  const id = editingDesign.id;
  DATA.settings.saleDesigns[id] = Object.assign({}, editingDesign);
  delete DATA.settings.saleDesigns[id].id;
  save();
  window.SHW.useSettings(DATA.settings);
  renderDesigns(); renderListings();
  toast('Design saved — every piece using it is updated');
  closeDesign();
};

$('#design-reset').onclick = () => {
  if (!confirm('Put this design back to how it started?')) return;
  delete DATA.settings.saleDesigns[editingDesign.id];
  save();
  window.SHW.useSettings(DATA.settings);
  renderDesigns(); renderListings();
  toast('Design reset');
  closeDesign();
};

$('#design-delete').onclick = () => {
  const id = editingDesign.id;
  const used = DATA.products.filter(p => p.sale && p.sale.style === id).length;
  if (used && !confirm(`${used} listing${used === 1 ? '' : 's'} use this design. They will fall back to your default. Delete anyway?`)) return;
  DATA.products.forEach(p => { if (p.sale && p.sale.style === id) p.sale.style = defaultSaleStyle; });
  delete DATA.settings.saleDesigns[id];
  if (defaultSaleStyle === id) { defaultSaleStyle = 'classic'; DATA.settings.defaultSaleStyle = 'classic'; }
  save();
  window.SHW.useSettings(DATA.settings);
  renderDesigns(); renderListings();
  toast('Design deleted');
  closeDesign();
};

$('#design-close').onclick = closeDesign;
$('#design-cancel').onclick = closeDesign;

/* ---------------- settings ---------------- */
function renderSettings() {
  $$('[data-set-acc]').forEach(el => {
    const key = el.dataset.setAcc;
    if (el.type === 'checkbox') el.checked = DATA.settings.accounts[key] !== false;
    else el.value = DATA.settings.accounts[key] ?? '';
    const handler = () => {
      DATA.settings.accounts[key] = el.type === 'checkbox' ? el.checked : el.value.trim();
      save();
    };
    el.oninput = handler;
    el.onchange = handler;
  });
  $$('[data-set]').forEach(el => {
    el.value = DATA.settings[el.dataset.set] ?? '';
    el.oninput = () => {
      DATA.settings[el.dataset.set] = el.dataset.set === 'whatsapp'
        ? el.value.replace(/\D/g, '')
        : el.value;
      save();
    };
  });
  renderCats();
}

/* ---------------- landing page editor ---------------- */
function heroHeadline(value) {
  const [before, gold, after] = String(value || '').split('|');
  return `${esc(before)}${gold !== undefined ? `<br><em>${esc(gold)}</em>${esc(after || '')}` : ''}`;
}

function renderLandingPreview() {
  const s = DATA.settings;
  $('#landing-preview').innerHTML = `
    <img src="${esc(s.heroImage || 'assets/campaign-olive-v2.jpg')}" alt="">
    <span class="lp-shade"></span>
    <div class="lp-copy"><small>${esc(s.heroEyebrow || 'Modest fashion · Ghana')}</small><h3>${heroHeadline(s.heroTitle)}</h3><p>${esc(s.heroText)}</p><b>${esc(s.heroButtonText || 'Shop new arrivals')} ↗</b></div>
    <div class="lp-card"><span>${esc(s.heroFeaturedLabel || 'Featured collection')}</span><strong>${esc(s.heroFeaturedTitle || 'Olive Signature Edit')}</strong></div>`;
}

function renderLandingEditor() {
  $$('[data-hero-set]').forEach(el => {
    el.value = DATA.settings[el.dataset.heroSet] ?? '';
    const update = () => {
      DATA.settings[el.dataset.heroSet] = el.value;
      save();
      renderLandingPreview();
    };
    el.oninput = update;
    el.onchange = update;
  });
  renderLandingPreview();
}

$('#hero-image-file').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  toast('Preparing campaign image…');
  const image = await readImage(file);
  e.target.value = '';
  if (!image) return toast('That image could not be read');
  DATA.settings.heroImage = image;
  save('Campaign image saved');
  renderLandingPreview();
  toast('Landing image updated');
};

$('#hero-image-reset').onclick = () => {
  DATA.settings.heroImage = 'assets/campaign-olive-v2.jpg';
  save(); renderLandingPreview(); toast('Original campaign image restored');
};

function renderCats() {
  $('#cat-chips').innerHTML = DATA.settings.categories
    .map((c, i) => `<span>${esc(c)}<button data-i="${i}" aria-label="Remove ${esc(c)}">×</button></span>`).join('');
  $$('#cat-chips button').forEach(b => b.onclick = () => {
    const cat = DATA.settings.categories[+b.dataset.i];
    const used = DATA.products.filter(p => p.category === cat).length;
    if (used && !confirm(`${used} listing${used === 1 ? '' : 's'} still use “${cat}”. Remove it anyway?`)) return;
    DATA.settings.categories.splice(+b.dataset.i, 1);
    save(); renderCats();
  });
}

$('#cat-add').onclick = () => {
  const v = $('#cat-new').value.trim();
  if (!v || DATA.settings.categories.includes(v)) return;
  DATA.settings.categories.push(v);
  $('#cat-new').value = '';
  save(); renderCats();
  toast('Category added');
};
$('#cat-new').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#cat-add').click(); } };

/* ---------------- publish / backup ---------------- */
function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderPublishMeta() {
  const size = (new Blob([JSON.stringify(DATA)]).size / 1024).toFixed(0);
  const when = DATA.updatedAt ? new Date(DATA.updatedAt).toLocaleString() : 'not yet saved';
  $('#pub-meta').textContent = `${DATA.products.length} listings · ${size} KB · last edited ${when}`;
}

$('#download-json').onclick = () => {
  save('All changes saved');
  download('catalog.json', DATA);
  toast('Downloaded — upload it to your site’s data folder');
};
$('#publish-live').onclick = async () => {
  if (!save('Ready to publish')) return;
  const button = $('#publish-live');
  button.disabled = true;
  button.textContent = 'Publishing…';
  try {
    const response = await fetch('/api/catalog', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(DATA)
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.href = '/admin.html'; return; }
    if (!response.ok) throw new Error(result.error || 'Publishing failed');
    DATA.updatedAt = result.updatedAt || Date.now();
    window.SHW.writeDraft(DATA);
    renderPublishMeta();
    toast('Published — your storefront is now updated');
  } catch (error) { toast(error.message || 'Publishing failed'); }
  finally { button.disabled = false; button.textContent = 'Publish changes live'; }
};
$('#backup').onclick = () => download(`saams-haya-backup-${new Date().toISOString().slice(0, 10)}.json`, DATA);
$('#restore').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      DATA = window.SHW.normalise(JSON.parse(reader.result));
      save(); renderAll();
      toast('Catalogue restored');
    } catch { toast('That file could not be read'); }
  };
  reader.readAsText(file);
  e.target.value = '';
};
$('#reset').onclick = () => {
  if (!confirm('Replace everything with the starter catalogue? Download a backup first if you need one.')) return;
  DATA = window.SHW.normalise(window.SHW.clone(window.SHW.SEED));
  save(); renderAll();
  toast('Reset to the starter catalogue');
};

/* ---------------- boot ---------------- */
function renderAll() {
  renderStats();
  renderListings();
  renderDesigns();
  renderSettings();
  renderLandingEditor();
  renderPublishMeta();
}

window.SHW.loadStore().then(data => {
  DATA = data;
  window.SHW.useSettings(DATA.settings);
  defaultSaleStyle = DATA.settings.defaultSaleStyle || 'classic';
  document.body.classList.add('ready');
  renderAll();
}).catch(err => {
  document.body.classList.add('ready');
  $('#listings').innerHTML = '<div class="empty">The catalogue could not be loaded (' +
    (err && err.message ? err.message : 'unknown error') +
    '). Try opening the site through a web address rather than straight from the file.</div>';
  console.error(err);
});
