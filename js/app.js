/* ─────────────────────────────────────────────
   app.js — state, rendering, events, init
───────────────────────────────────────────── */

// ── State ──────────────────────────────────────────────────────

const state = {
  emojis:   [],          // all emojis from datasource
  filtered: [],          // currently visible
  map:      new Map(),   // unified → emoji obj
  selected: null,        // currently selected emoji obj
  category: 'All',
  style:    'system',
  fmt:      'svg',
  size:     128,
  zip:      false,
  dark:     false,
};

let searchTimer = null;
let toastTimer  = null;
const _fontsLoaded = new Set();

function ensureFont(src) {
  if (!src.font || _fontsLoaded.has(src.font.family)) return;
  _fontsLoaded.add(src.font.family);
  const { family, googleFonts, cdn, local } = src.font;
  if (LOCAL_ASSETS && local) {
    const s = document.createElement('style');
    s.textContent = `@font-face{font-family:'${family}';src:url('${local}')format('woff2');font-display:swap}`;
    document.head.appendChild(s);
  } else if (googleFonts) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFonts;
    document.head.appendChild(link);
  } else {
    const s = document.createElement('style');
    s.textContent = `@font-face{font-family:'${family}';src:url('${cdn}')format('woff2');font-display:swap}`;
    document.head.appendChild(s);
  }
}

// ── Boot ───────────────────────────────────────────────────────

async function init() {
  renderStyleBtns();
  ensureFont(SOURCES[state.style]);
  renderSkeleton();
  bindEvents();

  try {
    const res  = await fetch(EMOJI_DATA_URL);
    const data = await res.json();
    state.emojis = data.sort((a, b) => a.sort_order - b.sort_order);
    state.emojis.forEach(e => state.map.set(e.unified, e));
    state.filtered = [...state.emojis];

    document.getElementById('skeleton').classList.add('hidden');
    document.getElementById('emojiGrid').classList.remove('hidden');

    renderCategoryTabs();
    renderGrid(state.filtered);
    syncSizeRow();
  } catch (err) {
    document.getElementById('skeleton').innerHTML = `
      <div style="grid-column:1/-1;padding:40px;text-align:center">
        <div style="font-size:2rem">⚠️</div>
        <p style="color:#e55;font-size:.85rem;margin-top:8px">Failed to load emoji data</p>
        <button onclick="init()" style="margin-top:10px;font-size:.8rem;color:var(--accent);background:none;border:none;cursor:pointer;text-decoration:underline">Retry</button>
      </div>`;
  }
}

// ── Render helpers ─────────────────────────────────────────────

function renderSkeleton() {
  const g = document.getElementById('skeleton');
  g.innerHTML = Array.from({ length: 81 }, () => `<div class="skel-cell"></div>`).join('');
}

function renderStyleBtns() {
  document.getElementById('styleSelector').innerHTML =
    Object.entries(SOURCES).map(([k, s]) =>
      `<button class="style-btn ${k === state.style ? 'active' : ''}"
        data-style="${k}">${s.label}</button>`
    ).join('');
}

function renderCategoryTabs() {
  const cats = ['All', ...new Set(state.emojis.map(e => e.category))];
  document.getElementById('catTabs').innerHTML = cats.map(c =>
    `<button class="cat-tab ${c === state.category ? 'active' : ''}"
      data-cat="${escAttr(c)}" title="${c}">${CAT_ICONS[c] || '📂'}</button>`
  ).join('');
}

function renderGrid(emojis) {
  const grid  = document.getElementById('emojiGrid');
  const empty = document.getElementById('emptyState');
  const head  = document.getElementById('gridLabel');
  const count = document.getElementById('gridCount');

  if (!emojis.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    document.getElementById('emptyQuery').textContent =
      document.getElementById('searchInput').value.trim();
    head.textContent  = '';
    count.textContent = '';
    return;
  }

  empty.classList.add('hidden');
  head.textContent  = state.category === 'All' ? 'All Emojis' : state.category;
  count.textContent = emojis.length.toLocaleString();

  const src = SOURCES[state.style];

  grid.innerHTML = emojis.map(e => {
    const ch  = toChar(e);
    const sel = state.selected?.unified === e.unified ? ' sel' : '';
    let inner;
    if (src.font) {
      inner = `<span style="font-family:'${src.font.family}',serif;pointer-events:none">${ch}</span>`;
    } else {
      // No font available (JoyPixels, System) → system emoji, zero network requests.
      // Styled SVG loads in the preview panel on click.
      inner = `<span>${ch}</span>`;
    }
    return `<div class="emoji-cell${sel}" data-u="${e.unified}" title=":${e.short_name}:">${inner}</div>`;
  }).join('');
}

function updatePreview() {
  const e   = state.selected;
  if (!e) return;

  const src  = SOURCES[state.style];
  const url  = src.isSystem ? null : src.url(e.unified);
  const ch   = toChar(e);
  const wrap = document.getElementById('emojiDisplay');

  wrap.innerHTML = url
    ? `<img src="${url}" alt="${ch}" crossorigin="anonymous"
        onerror="this.outerHTML='<span class=emoji-char>${ch}</span>'">`
    : `<span class="emoji-char">${ch}</span>`;

  // Update download button label
  const ext  = state.zip ? 'zip' : state.fmt;
  document.getElementById('dlBtnLabel').textContent =
    `Download ${e.short_name}.${ext}`;

  // Show controls
  document.getElementById('exportControls').classList.remove('hidden');
}

function syncSizeRow() {
  const row = document.getElementById('sizeRow');
  row.style.display = (state.fmt === 'svg' && !state.zip) ? 'none' : '';
}

function syncDlLabel() {
  if (!state.selected) return;
  const ext = state.zip ? 'zip' : state.fmt;
  document.getElementById('dlBtnLabel').textContent =
    `Download ${state.selected.short_name}.${ext}`;
}

// ── Setters ────────────────────────────────────────────────────

function setStyle(key) {
  state.style = key;
  renderStyleBtns();
  ensureFont(SOURCES[key]);
  renderGrid(state.filtered);
  if (state.selected) updatePreview();
}

function setCategory(cat) {
  state.category = cat;
  // Update tabs
  document.querySelectorAll('.cat-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.cat === cat));
  filterAndRender();
}

function filterAndRender() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  state.filtered = state.emojis.filter(e => {
    const catOk = state.category === 'All' || e.category === state.category;
    if (!catOk) return false;
    if (!q) return true;
    return e.short_name.includes(q)
      || (e.short_names && e.short_names.some(n => n.includes(q)))
      || e.name.toLowerCase().includes(q);
  });
  renderGrid(state.filtered);
}

// ── Action handlers ─────────────────────────────────────────────

async function handleDownload() {
  if (!state.selected) return;
  const btn = document.getElementById('dlBtn');
  btn.disabled = true;
  document.getElementById('dlBtnLabel').textContent = 'Generating…';

  try {
    const e = state.selected;
    if (state.zip) {
      triggerDownload(await exportZip(e), `${e.short_name}_all_sizes.zip`);
      toast('ZIP downloaded!', '✅');
    } else if (state.fmt === 'svg') {
      triggerDownload(await exportSvg(e), `${e.short_name}.svg`);
      toast('SVG downloaded!', '✅');
    } else if (state.fmt === 'ico') {
      triggerDownload(
        await exportIco(e, state.size),
        `${e.short_name}_${state.size}px.ico`
      );
      toast(`ICO ${state.size}px downloaded!`, '✅');
    } else {
      triggerDownload(
        await exportRaster(e, state.fmt, state.size),
        `${e.short_name}_${state.size}px.${state.fmt}`
      );
      toast(`${state.fmt.toUpperCase()} ${state.size}px downloaded!`, '✅');
    }
  } catch (err) {
    toast(`Export failed: ${err.message}`, '⚠️');
  } finally {
    btn.disabled = false;
    syncDlLabel();
  }
}

async function handleCopy() {
  if (!state.selected) return;
  const e = state.selected;
  try {
    if (state.fmt === 'ico') {
      await navigator.clipboard.writeText(toChar(e));
      toast('Character copied!', '✅');
      return;
    }
    if (state.fmt === 'svg' && !SOURCES[state.style].isSystem) {
      await navigator.clipboard.writeText(await fetchSvg(e));
      toast('SVG code copied!', '✅');
    } else if (state.fmt !== 'svg') {
      const blob = await exportRaster(e, state.fmt === 'webp' ? 'png' : state.fmt, state.size);
      try {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        toast('Image copied!', '✅');
      } catch (_) {
        await navigator.clipboard.writeText(toChar(e));
        toast('Emoji character copied!', '✅');
      }
    } else {
      await navigator.clipboard.writeText(toChar(e));
      toast('Character copied!', '✅');
    }
  } catch (_) {
    try {
      await navigator.clipboard.writeText(toChar(e));
      toast('Character copied!', '✅');
    } catch (err) {
      toast('Copy not supported', '⚠️');
    }
  }
}

function toggleZip() {
  state.zip = !state.zip;
  document.getElementById('zipTog').classList.toggle('on', state.zip);
  syncSizeRow();
  syncDlLabel();
}

function toggleTheme() {
  state.dark = !state.dark;
  document.documentElement.setAttribute('data-theme', state.dark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = state.dark ? '☀️' : '🌙';
}

// ── Events ─────────────────────────────────────────────────────

function bindEvents() {
  // Search
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(filterAndRender, 160);
  });

  // Category tabs (delegation)
  document.getElementById('catTabs').addEventListener('click', e => {
    const tab = e.target.closest('.cat-tab');
    if (tab) setCategory(tab.dataset.cat);
  });

  // Emoji grid (delegation)
  document.getElementById('emojiGrid').addEventListener('click', e => {
    const cell = e.target.closest('.emoji-cell');
    if (!cell) return;
    const unified = cell.dataset.u;
    state.selected = state.map.get(unified);
    // Update grid selection highlight
    document.querySelectorAll('.emoji-cell').forEach(el =>
      el.classList.toggle('sel', el.dataset.u === unified));
    updatePreview();
  });

  // Style buttons (delegation)
  document.getElementById('styleSelector').addEventListener('click', e => {
    const btn = e.target.closest('.style-btn');
    if (btn) setStyle(btn.dataset.style);
  });

  // Format buttons
  document.getElementById('fmtGroup').addEventListener('click', e => {
    const btn = e.target.closest('.seg');
    if (!btn || !btn.dataset.fmt) return;
    state.fmt = btn.dataset.fmt;
    document.querySelectorAll('#fmtGroup .seg').forEach(b =>
      b.classList.toggle('seg-active', b === btn));
    syncSizeRow();
    syncDlLabel();
  });

  // Size buttons
  document.getElementById('szGroup').addEventListener('click', e => {
    const btn = e.target.closest('.seg');
    if (!btn || !btn.dataset.sz) return;
    document.querySelectorAll('#szGroup .seg').forEach(b => b.classList.remove('seg-active'));
    btn.classList.add('seg-active');
    const cw = document.getElementById('customSz');
    if (btn.dataset.sz === 'custom') {
      cw.classList.remove('hidden');
      state.size = parseInt(cw.value) || 256;
    } else {
      cw.classList.add('hidden');
      state.size = parseInt(btn.dataset.sz);
    }
    syncDlLabel();
  });

  document.getElementById('customSz').addEventListener('input', e => {
    state.size = Math.min(4096, Math.max(16, parseInt(e.target.value) || 256));
    syncDlLabel();
  });

  // Theme
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
  });
}

// ── Utils ───────────────────────────────────────────────────────

function toChar(emoji) {
  return emoji.unified.split('-').map(cp => String.fromCodePoint(parseInt(cp, 16))).join('');
}

function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function toast(msg, icon = '✅') {
  const el = document.getElementById('toast');
  document.getElementById('toastText').textContent = msg;
  document.getElementById('toastIcon').textContent = icon;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Start ───────────────────────────────────────────────────────
init();
