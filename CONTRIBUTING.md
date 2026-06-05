# Contributing to EmojiCraft

Thanks for your interest in contributing!

## Quick Start

```bash
git clone https://github.com/albertolicea00/EmojiCraft.git
cd EmojiCraft
python3 -m http.server 8080
# open http://localhost:8080
```

No build step. No dependencies to install. Just a static HTML file.

## How to Contribute

### Reporting Bugs

Open an issue with:

- What you did
- What you expected
- What happened instead
- Browser + OS

### Suggesting Features

Open an issue tagged `enhancement`. Describe the use case, not just the feature.

### Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your change
4. Test in at least Chrome and Firefox
5. Open a PR against `main`

## Code Style

- Pure HTML/CSS/JS — no build tools, no bundlers
- Keep everything self-contained in `index.html` where possible
- Use TailwindCSS utility classes for styling
- Keep JS vanilla — no frameworks

## What We Won't Merge

- Dependencies that require a build step
- Framework rewrites (React, Vue, etc.)
- Changes that break existing emoji CDN sources

## Questions?

Open an issue tagged `question`.
