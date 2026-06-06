/* ─────────────────────────────────────────────
   sources.js — Emoji CDN configs & category map
───────────────────────────────────────────── */

// Set to true after running `make download-assets` to serve from local files.
const LOCAL_ASSETS = false;

const EMOJI_DATA_URL = LOCAL_ASSETS
  ? 'assets/emoji/emoji.json'
  : 'https://cdn.jsdelivr.net/npm/emoji-datasource@14.0.0/emoji.json';

const DS = 'https://cdn.jsdelivr.net/npm/emoji-datasource';

// Grid rendering:
//   font   → single WOFF2 loaded once (Google Fonts)
//   isPng  → PNG per emoji, lazy-loaded from emoji-datasource-* CDN
//   else   → system emoji (zero requests); styled SVG loads in preview on click
const SOURCES = {
  system: {
    label:   'System',
    powered: { text: 'System emoji', url: null },
    url:     () => null,
    isSystem: true,
  },

  twitter: {
    label:   'X (Twitter)',
    powered: { text: 'Twemoji', url: 'https://github.com/jdecked/twemoji' },
    isPng:   true,
    url:     cp => `${DS}-twitter@14.0.0/img/twitter/64/${cp.toLowerCase()}.png`,
  },

  google: {
    label:   'Google',
    powered: { text: 'Noto Color Emoji', url: 'https://fonts.google.com/noto/specimen/Noto+Color+Emoji' },
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

  apple: {
    label:   'Apple',
    powered: { text: 'Apple Color Emoji', url: 'https://emojipedia.org/apple' },
    isPng:   true,
    url:     cp => `${DS}-apple@14.0.0/img/apple/64/${cp.toLowerCase()}.png`,
  },

  facebook: {
    label:   'Meta',
    powered: { text: 'Meta (Facebook) emoji', url: 'https://emojipedia.org/facebook' },
    isPng:   true,
    url:     cp => `${DS}-facebook@14.0.0/img/facebook/64/${cp.toLowerCase()}.png`,
  },

  openmoji: {
    label:   'OpenMoji',
    powered: { text: 'OpenMoji', url: 'https://openmoji.org' },
    url: cp => LOCAL_ASSETS
      ? `assets/emoji/openmoji/${cp.toUpperCase()}.svg`
      : `https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${cp.toUpperCase()}.svg`,
  },

  joypixels: {
    label:   'JoyPixels',
    powered: { text: 'JoyPixels', url: 'https://joypixels.com' },
    url: cp => LOCAL_ASSETS
      ? `assets/emoji/joypixels/${cp.toLowerCase()}.svg`
      : `https://cdn.jsdelivr.net/npm/emoji-toolkit@8.0.0/extras/svgs/${cp.toLowerCase()}.svg`,
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
