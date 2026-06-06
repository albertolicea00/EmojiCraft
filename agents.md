# EmojiCraft — Claude Code Agent Guide

This file describes how to use Claude Code agents to extend, maintain, and improve this project.

---

## Project Shape

Static webapp — no build step, no npm.

```
index.html          entry point (HTML shell)
css/styles.css      all styles (light + dark theme)
js/sources.js       SOURCES config, CDN URLs, category icons
js/export.js        SVG fetch, canvas render, ZIP, ICO
js/app.js           state, rendering, events, init
scripts/
  download-assets.py   download all emoji assets for self-hosting
  download-assets.sh   thin shell wrapper
.github/workflows/
  update-emoji-assets.yml   monthly GH Action → opens PR
```

**Emoji data**: `emoji-datasource@14` via jsDelivr → `EMOJI_DATA_URL` in `sources.js`

**Emoji sources** (in `SOURCES`, `js/sources.js`):

| Key | Label | Grid rendering | Export |
|-----|-------|---------------|--------|
| system | System | OS native emoji | OS native |
| twitter | X (Twitter) | PNG lazy (emoji-datasource-twitter) | PNG canvas |
| google | Google | Noto Color Emoji font (Google Fonts) | SVG CDN |
| apple | Apple | PNG lazy (emoji-datasource-apple) | PNG canvas |
| facebook | Meta | PNG lazy (emoji-datasource-facebook) | PNG canvas |
| openmoji | OpenMoji | OS native emoji (SVG on preview/export) | SVG CDN |
| joypixels | JoyPixels | OS native emoji (SVG on preview/export) | SVG CDN |

`LOCAL_ASSETS = true` in `sources.js` → switches all URLs to local `assets/` paths.

---

## Adding a new emoji style

Edit `js/sources.js` → add entry to `SOURCES`:

```js
myStyle: {
  label:   'My Brand',
  powered: { text: 'My Brand emoji', url: 'https://...' },
  // Option A — PNG from emoji-datasource-* (lazy-loaded in grid):
  isPng: true,
  url:   cp => `https://cdn.jsdelivr.net/npm/emoji-datasource-mybrand@14.0.0/img/mybrand/64/${cp.toLowerCase()}.png`,
  // Option B — SVG CDN (grid shows system emoji, SVG loads in preview on click):
  url:   cp => `https://example.com/svg/${cp.toLowerCase()}.svg`,
  // Option C — COLR/CPAL web font (one file for entire grid):
  font: { family: 'My Font', cdn: 'https://...font.woff2', local: 'assets/fonts/MyFont.woff2' },
}
```

No changes needed in `app.js` — `renderGrid`, `renderStyleBtns`, and `updateFooterSource` read from `SOURCES` dynamically.

If adding a PNG style, also add it to `PNG_STYLES` in `scripts/download-assets.py` and add a `png_urls_for_emoji` branch.

---

## Self-hosting assets

```bash
make download-assets              # all styles + NotoColorEmoji font
make download-assets ARGS="--styles apple twitter --no-fonts"
make download-assets ARGS="--force"
```

Downloads to:
- `assets/emoji/{style}/` — SVGs or PNGs per emoji
- `assets/fonts/NotoColorEmoji.woff2` — Noto COLR font

After download: set `LOCAL_ASSETS = true` in `js/sources.js`.

GitHub Action: **Actions → Update Emoji Assets → Run workflow** → opens a PR. Monthly cron is commented out in the workflow file — uncomment to enable.

---

## Key functions

| Function | File | What it does |
|----------|------|-------------|
| `renderGrid()` | app.js | Renders emoji cells; dispatches font/PNG/system per source |
| `updatePreview()` | app.js | Loads selected emoji into left panel |
| `setStyle(key)` | app.js | Switches active source, reloads grid + footer |
| `updateFooterSource()` | app.js | Updates "Powered by" footer text |
| `ensureFont(src)` | app.js | Injects @font-face or Google Fonts link on demand |
| `fetchSvg(emoji)` | export.js | Fetches raw SVG from CDN for SVG export |
| `toCanvas(emoji, size)` | export.js | Renders emoji onto canvas (handles system/SVG/PNG) |
| `exportZip(emoji)` | export.js | All sizes in current format |
| `exportZipFormats(emoji)` | export.js | SVG + PNG + WebP at current size |
| `exportIco(emoji, size)` | export.js | ICO binary (ICONDIR + PNG data) |

---

## Common agent prompts

### Fix canvas taint for a style
```
The {STYLE} source causes SecurityError on canvas export.
Fix: ensure img elements in toCanvas() have crossOrigin='anonymous'.
Check the CDN sends Access-Control-Allow-Origin: * headers.
```

### Add skin tone variants
```
When an emoji has skin_variations in its emoji-datasource entry,
show a small skin tone picker below the preview image.
Selecting a tone updates state.selected to the skin variant's unified code.
skin_variations keys: "1F3FB", "1F3FC", "1F3FD", "1F3FE", "1F3FF".
```

### Add recent emojis
```
Track last 20 selected emojis in localStorage key "ec_recent".
Show a horizontal scrollable row labeled "Recent" above the main grid.
Clear with a small × button.
Key location: state.selected setter in bindEvents() + renderGrid().
```

---

## Running for verification

```bash
make serve   # python3 -m http.server 8080
# or
/run
```

---

## Architecture

- All state is plain `const state = {...}` in `app.js` — no framework.
- `SOURCES` in `sources.js` drives everything: grid, preview, export, footer, download script.
- `LOCAL_ASSETS` flag in `sources.js` is the only switch between CDN and self-hosted mode.
