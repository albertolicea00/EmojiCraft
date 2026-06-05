# EmojiCraft — Claude Code Agent Guide

This file describes how to use Claude Code agents to extend, maintain, and improve this project.

---

## Project Shape

Single-file static webapp (`index.html`). No build step, no npm dependencies.

- **Emoji data**: fetched at runtime from jsDelivr CDN (`emoji-datasource@14`)
- **Emoji images**: loaded lazily from style-specific CDNs (Twemoji, Noto, OpenMoji, JoyPixels)
- **Export**: `<canvas>` API for PNG/WebP, `fetch` for SVG, JSZip for ZIP bundles

---

## Common Agent Tasks

### Add a new emoji style

```
Add a new emoji source called "Facebook" to the SOURCES object in index.html.
The CDN URL pattern is: https://example.com/fb-emoji/{codepoint}.svg
Follow the same shape as the existing twemoji entry.
Also add it to the style pills render function.
```

Key location: `index.html` → `const SOURCES = { … }` (~line 120)

---

### Improve search

```
Improve the search in filterAndRender() to also search by emoji category and
support multi-word queries (e.g. "red heart" should match "HEAVY BLACK HEART").
Keep the 160ms debounce.
```

Key location: `index.html` → `function filterAndRender()` (~line 230)

---

### Add skin tone variants

```
When an emoji has skin_variations in its emoji-datasource entry,
show a small skin tone picker below the preview image in the right panel.
Selecting a tone updates the preview and export target to the skin variant's unified code.
skin_variations keys are tone suffix codes like "1F3FB", "1F3FC", etc.
```

Key locations:
- `selectEmoji()` — where selectedEmoji is set
- `updatePreviewPanel()` — where preview is rendered

---

### Add a "recent emojis" row

```
Track the last 20 selected emojis in localStorage under key "ef_recent".
Show a horizontal scrollable row labeled "Recent" above the main grid.
Clear the row with a small ✕ button.
```

Key location: `selectEmoji()` + `renderGrid()` section

---

### Add Fluent UI emoji support

```
Add Microsoft Fluent UI emoji as a style option.
Fluent emoji SVGs are at:
  https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/{FolderName}/Color/{filename}_color.svg
The mapping from unified codepoint to folder/filename requires the fluent-emoji metadata JSON.
Fetch it from: https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/metadata/metadata.json
Cache the mapping in a module-level Map after first fetch.
```

---

### Fix CORS / canvas taint for a specific style

```
The {STYLE_NAME} emoji style causes a canvas taint error when exporting PNG.
The images load visually but ctx.drawImage throws SecurityError.
Fix: ensure all <img> elements created in toCanvas() set crossOrigin='anonymous',
and verify the CDN sends CORS headers (Access-Control-Allow-Origin: *).
If the CDN does not support CORS, proxy through a worker or fall back to system rendering.
```

---

## Running the App for Verification

```bash
make serve
# open http://localhost:8080
```

Or ask Claude to run it:

```
/run
```

---

## Code Review Prompts

```
/code-review
```

Focus areas:
- `exportZip()` — memory usage for large sizes (1024px × 5 canvases)
- `toCanvas()` — error handling when CDN image 404s mid-render
- `filterAndRender()` — perf on 3600 emoji re-renders

---

## Architecture Notes

| Concern | Where |
|---------|-------|
| Emoji sources / CDN URLs | `const SOURCES` block |
| State variables | lines after `// STATE` comment |
| Rendering | `renderGrid()`, `updatePreviewPanel()` |
| Export logic | `fetchSvg()`, `toCanvas()`, `exportZip()` |
| UI events | `bindEvents()` |
| Mobile sheet | `openSheet()`, `closeSheet()` |

All state is module-level. No framework, no build system.
