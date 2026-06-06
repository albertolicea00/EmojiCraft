/* ─────────────────────────────────────────────
   sources.js — Emoji CDN configs & category map
───────────────────────────────────────────── */

// Set to true after running `make download-assets` to serve from local files.
// Leave false to load from CDN (default).
const LOCAL_ASSETS = false;

const EMOJI_DATA_URL = LOCAL_ASSETS
  ? 'assets/emoji/emoji.json'
  : 'https://cdn.jsdelivr.net/npm/emoji-datasource@14.0.0/emoji.json';

// Font sources for grid thumbnails (one file, zero per-emoji requests).
// Grid uses font; preview panel uses SVG for full quality.
// JoyPixels has no free COLR font — its grid falls back to SVG lazy-load.
const SOURCES = {
  twemoji: {
    label: 'Twitter',
    font: {
      family: 'Twemoji Mozilla',
      cdn:   'https://cdn.jsdelivr.net/npm/twemoji-colr-font@0.7.0/fonts/TwemojiMozilla.woff2',
      local: 'assets/fonts/TwemojiMozilla.woff2',
    },
    url: cp => LOCAL_ASSETS
      ? `assets/emoji/twemoji/${cp.toLowerCase()}.svg`
      : `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp.toLowerCase()}.svg`,
  },
  noto: {
    label: 'Google',
    font: {
      family:      'Noto Color Emoji',
      googleFonts: 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji',
      local:       'assets/fonts/NotoColorEmoji.woff2',
    },
    url: cp => {
      const parts = cp.toLowerCase().split('-').filter(p => p !== 'fe0f');
      return LOCAL_ASSETS
        ? `assets/emoji/noto/emoji_u${parts.join('_')}.svg`
        : `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u${parts.join('_')}.svg`;
    },
  },
  openmoji: {
    label: 'OpenMoji',
    font: {
      family: 'OpenMoji',
      cdn:   'https://cdn.jsdelivr.net/npm/openmoji@15.0.0/font/OpenMoji-color-glyf_colr_1.woff2',
      local: 'assets/fonts/OpenMoji.woff2',
    },
    url: cp => LOCAL_ASSETS
      ? `assets/emoji/openmoji/${cp.toUpperCase()}.svg`
      : `https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${cp.toUpperCase()}.svg`,
  },
  joypixels: {
    label: 'JoyPixels',
    url: cp => LOCAL_ASSETS
      ? `assets/emoji/joypixels/${cp.toLowerCase()}.svg`
      : `https://cdn.jsdelivr.net/npm/emoji-toolkit@8.0.0/extras/svgs/${cp.toLowerCase()}.svg`,
  },
  system: {
    label: 'System',
    url: () => null,
    isSystem: true,
  },
};

const CAT_ICONS = {
  'All':               '✨',
  'Smileys & Emotion': '😀',
  'People & Body':     '👋',
  'Component':         '🎨',
  'Animals & Nature':  '🐶',
  'Food & Drink':      '🍕',
  'Travel & Places':   '✈️',
  'Activities':        '⚽',
  'Objects':           '💡',
  'Symbols':           '🔣',
  'Flags':             '🏳️',
};

const EXPORT_SIZES = [64, 128, 256, 512, 1024];
