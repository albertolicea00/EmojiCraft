#!/usr/bin/env bash
# Wrapper — delegates to download-assets.py (Python 3 stdlib only, no pip needed)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found" >&2
  exit 1
fi

exec python3 "$SCRIPT_DIR/download-assets.py" "$@"
