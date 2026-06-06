/* ─────────────────────────────────────────────
   sources.js — Emoji CDN configs & category map
───────────────────────────────────────────── */

// Set to true after running `make download-assets` to serve from local files.
// Leave false to load from CDN (default).
const LOCAL_ASSETS = false;

const EMOJI_DATA_URL = LOCAL_ASSETS
  ? 'assets/emoji/emoji.json'
  : 'https://cdn.jsdelivr.net/npm/emoji-datasource@14.0.0/emoji.json';

const SOURCES = {
  twemoji: {
    label: 'Twitter',
    url: cp => LOCAL_ASSETS
      ? `assets/emoji/twemoji/${cp.toLowerCase()}.svg`
      : `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp.toLowerCase()}.svg`,
  },
  noto: {
    label: 'Google',
    url: cp => {
      const parts = cp.toLowerCase().split('-').filter(p => p !== 'fe0f');
      return LOCAL_ASSETS
        ? `assets/emoji/noto/emoji_u${parts.join('_')}.svg`
        : `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u${parts.join('_')}.svg`;
    },
  },
  openmoji: {
    label: 'OpenMoji',
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
