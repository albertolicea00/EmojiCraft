#!/usr/bin/env python3
"""
Download emoji SVG assets + Noto font for self-hosting.

SVG styles saved to assets/emoji/{style}/:
  noto        Google Noto emoji SVGs
  openmoji    OpenMoji color SVGs
  joypixels   JoyPixels SVGs

Font saved to assets/fonts/:
  NotoColorEmoji.woff2   Used by the Google style for zero-request grid rendering

PNG styles (twitter, apple, facebook) always load from CDN — not stored locally.

Usage:
  python3 scripts/download-assets.py
  python3 scripts/download-assets.py --styles noto openmoji
  python3 scripts/download-assets.py --no-fonts
  python3 scripts/download-assets.py --force
  python3 scripts/download-assets.py --jobs 16
  JOBS=16 python3 scripts/download-assets.py
"""

import argparse
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT   = Path(__file__).parent.parent
ASSETS = ROOT / "assets" / "emoji"

VERSIONS = {
    "datasource": "14.0.0",
    "openmoji":   "15.0.0",
    "joypixels":  "8.0.0",
}

# Only SVG styles are downloaded locally.
# PNG styles (twitter, apple, facebook) always load from CDN — no local storage.
ALL_STYLES = ["noto", "openmoji", "joypixels"]

# Only the Noto font is needed (Google/Noto source uses it for zero-request grid).
# Twitter/Apple/Facebook use PNG lazy-loading so no font file is needed for them.
FONTS = {
    "NotoColorEmoji.woff2": (
        "https://cdn.jsdelivr.net/npm/@fontsource/noto-color-emoji/files/"
        "noto-color-emoji-all-400-normal.woff2"
    ),
}

DS_BASE = "https://cdn.jsdelivr.net/npm/emoji-datasource"


# ── URL builders ────────────────────────────────────────────────

def svg_urls_for_emoji(e, styles):
    """Yield (url, dest) SVG pairs."""
    cp = e["unified"]

    if "noto" in styles:
        parts = [p for p in cp.lower().split("-") if p != "fe0f"]
        name  = "emoji_u" + "_".join(parts)
        yield (
            f"https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/{name}.svg",
            ASSETS / "noto" / f"{name}.svg",
        )

    if "openmoji" in styles:
        name = cp.upper()
        yield (
            f"https://cdn.jsdelivr.net/npm/openmoji@{VERSIONS['openmoji']}/color/svg/{name}.svg",
            ASSETS / "openmoji" / f"{name}.svg",
        )

    if "joypixels" in styles:
        name = cp.lower()
        yield (
            f"https://cdn.jsdelivr.net/npm/emoji-toolkit@{VERSIONS['joypixels']}/extras/svgs/{name}.svg",
            ASSETS / "joypixels" / f"{name}.svg",
        )



# ── Download helper ─────────────────────────────────────────────

def download_one(url: str, dest: Path, force: bool) -> str:
    """Return 'skip' | 'ok' | 'err'."""
    if not force and dest.exists():
        return "skip"
    try:
        urllib.request.urlretrieve(url, dest)
        return "ok"
    except Exception:
        return "err"


# ── Main ────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--jobs",   type=int, default=int(os.getenv("JOBS", "8")),
                        help="Parallel download workers (default: 8)")
    parser.add_argument("--force",  action="store_true",
                        help="Re-download files that already exist")
    parser.add_argument("--styles", nargs="+", choices=ALL_STYLES + ["all"],
                        default=["all"],
                        help=f"Styles to download. SVG: {SVG_STYLES}  PNG: {PNG_STYLES}")
    parser.add_argument("--no-fonts", action="store_true",
                        help="Skip font file downloads")
    args = parser.parse_args()

    styles = ALL_STYLES if "all" in args.styles else args.styles

    # Create output dirs
    for style in styles:
        (ASSETS / style).mkdir(parents=True, exist_ok=True)

    # ── Fonts ──
    if not args.no_fonts:
        fonts_dir = ROOT / "assets" / "fonts"
        fonts_dir.mkdir(parents=True, exist_ok=True)
        print(f"→ Downloading {len(FONTS)} font file(s) to assets/fonts/")
        for filename, url in FONTS.items():
            dest = fonts_dir / filename
            print(f"  {filename} ... ", end="", flush=True)
            r = download_one(url, dest, args.force)
            size_kb = dest.stat().st_size // 1024 if dest.exists() else 0
            print(f"✓ {size_kb} KB" if r in ("ok", "skip") else "✗ failed (check URL)")
        print()

    # ── emoji.json ──
    json_url  = f"https://cdn.jsdelivr.net/npm/emoji-datasource@{VERSIONS['datasource']}/emoji.json"
    json_dest = ASSETS / "emoji.json"
    print("→ emoji.json ... ", end="", flush=True)
    result = download_one(json_url, json_dest, args.force)
    print("✓ done" if result == "ok" else "✓ already exists" if result == "skip" else "✗ failed")
    if not json_dest.exists():
        sys.exit("emoji.json download failed — check your connection")

    emojis = json.loads(json_dest.read_text())

    # ── Build task list (SVG only) ──
    tasks = [(u, d) for e in emojis for u, d in svg_urls_for_emoji(e, styles)]
    print(f"→ {len(emojis)} emojis × {len(styles)} style(s) = {len(tasks)} SVGs  [workers: {args.jobs}]")

    if not tasks:
        print("Nothing to download.")
        return

    # ── Parallel download ──
    ok = skip = err = 0
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(download_one, url, dest, args.force): dest
                   for url, dest in tasks}
        for i, future in enumerate(as_completed(futures), 1):
            r = future.result()
            if   r == "ok":   ok   += 1
            elif r == "skip": skip += 1
            else:             err  += 1
            if i % 250 == 0 or i == len(tasks):
                pct = int(i / len(tasks) * 100)
                print(f"\r  [{pct:3d}%] {i}/{len(tasks)}  ✓ {ok}  skip {skip}  ✗ {err}   ",
                      end="", flush=True)

    print(f"\n→ Done.")
    print(f"  ✓ {ok} downloaded   skip {skip}   ✗ {err} not found")
    if err:
        print("  (missing files are normal — not every style covers every emoji)")
    print(f"\n  Set LOCAL_ASSETS = true in js/sources.js to use local files.")


if __name__ == "__main__":
    main()
