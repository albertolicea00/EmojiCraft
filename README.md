# 🦄 EmojiCraft :: cReaTe. cRaFt. eXpoRt.

> Any style. Any size. Any format. One click.

**[→ Try it live](https://EmojiCraft.vercel.app)**

---

## What it does 🚀

|                       |                                                |
| --------------------- | ---------------------------------------------- |
| 🎭 **5 styles**       | Twitter, Google, OpenMoji, JoyPixels, System   |
| 🔍 **Instant search** | Filter by name or keyword, sidebar by category |
| 🖼️ **Big preview**    | Click any emoji to see it full size            |
| 📦 **Export**         | SVG · PNG · WebP — 64 to 1024px + custom       |
| 🗜️ **ZIP all sizes**  | All 5 sizes + SVG in one click                 |
| 📋 **Copy**           | SVG code or image straight to clipboard        |
| 🌙 **Dark / light**   | Toggle in the header                           |
| ⌨️ **Keyboard**       | Press `/` to jump to search                    |
| 📱 **Mobile**         | Bottom sheet export UI                         |

---

## Stack 🛠️

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Canvas API](https://img.shields.io/badge/Canvas_API-native-lightgrey?style=flat)
![JSZip](https://img.shields.io/badge/JSZip-3.10-blue?style=flat)
![CDN](https://img.shields.io/badge/Emoji_Sources-CDN-orange?style=flat)

Zero build step. Zero dependencies to install. Just open `index.html`.

---

## Run locally 💻

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

or `npx serve .` or `make serve`.

## Emoji fonts — performance 🚀

Instead of loading thousands of individual SVG files, EmojiCraft uses **COLR/CPAL color emoji fonts** for the grid. Each style loads a single font file once (cached by the browser). Only the selected emoji's full-quality SVG is fetched on click.

| Style | Font | Size | Source |
|-------|------|------|--------|
| Twitter | Twemoji Mozilla (COLR v0) | ~2 MB | npm `twemoji-colr-font` |
| Google | Noto Color Emoji | ~10 MB | Google Fonts |
| OpenMoji | OpenMoji (COLR v1) | ~5 MB | npm `openmoji` |
| JoyPixels | — no free font — | per SVG | SVG lazy-load |
| System | OS native | 0 MB | no network request |

### Browser compatibility

| Browser | Min version | Notes |
|---------|------------|-------|
| Chrome / Edge | 98+ | Full COLR v0 + v1 |
| Firefox | 107+ | Full COLR v0 + v1 |
| Safari | 16.4+ | Full COLR v0 + v1 |
| Older browsers | any | Falls back to system emoji silently |

**~97% of global users** (2026). Unsupported browsers see system emoji in the grid; preview always works.

---

## Self-hosting emoji assets 📦

By default the app loads emoji SVGs from public CDNs (jsDelivr). If you want to serve them yourself — for offline use, faster loads, or no external dependencies — you can download everything locally.

### Download once (manual)

```bash
make download-assets
# or directly:
bash scripts/download-assets.sh
```

Downloads **3 font files** → `assets/fonts/` + ~1 800 emojis × 4 styles → `assets/emoji/`. Then flip the flag in `js/sources.js`:

```js
const LOCAL_ASSETS = true;   // was false
```

Options:

```bash
make download-assets ARGS="--styles twemoji noto"   # specific styles only
make download-assets ARGS="--no-fonts"               # skip font files, SVGs only
make download-assets ARGS="--force"                  # re-download existing files
make download-assets ARGS="--jobs 16"                # more parallelism (default: 8)
```

### Auto-update via GitHub Action

A workflow is included at `.github/workflows/update-emoji-assets.yml`. It runs **manually only** by default (no cron). To trigger it:

**GitHub → Actions → Update Emoji Assets → Run workflow**

It downloads fresh assets and opens a **Pull Request** for you to review before merging. No direct commits to `main`.

To enable the weekly schedule, uncomment these lines in the workflow file:

```yaml
# schedule:
#   - cron: '0 4 * * 0'   # every Sunday 04:00 UTC
```

---

## Contributing 🤝

Issues and PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

If this saved you time, you can [buy me a coffee ☕](https://buymeacoffee.com/albertolicea00) — it helps a lot!

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/albertolicea00)

---

Made with 💛 by [Alberto](https://github.com/albertolicea00)
