.PHONY: serve open dev deploy favicons help

PORT ?= 8080

## serve: start local dev server on PORT (default 8080)
serve:
	@echo "→ Serving at http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

## open: open the app in the default browser (macOS/Linux)
open:
	@open http://localhost:$(PORT) 2>/dev/null || xdg-open http://localhost:$(PORT) 2>/dev/null || echo "Open http://localhost:$(PORT)"

## dev: serve + open in one shot (run serve in background first)
dev:
	@python3 -m http.server $(PORT) &
	@sleep 0.5
	@open http://localhost:$(PORT) 2>/dev/null || xdg-open http://localhost:$(PORT) 2>/dev/null || true
	@echo "→ EmojiCraft running at http://localhost:$(PORT) — Ctrl+C to stop"
	@wait

## deploy: deploy to Vercel (requires vercel CLI)
deploy:
	vercel --prod

## favicons: generate PNG + WebP favicons from assets/favicon.svg (requires sharp)
favicons:
	@command -v node >/dev/null || (echo "Node.js required"; exit 1)
	@node -e "require('sharp')" 2>/dev/null || npm install sharp --save-dev
	node scripts/gen-favicons.js

## help: show this help
help:
	@grep -E '^## ' Makefile | sed 's/## //'
