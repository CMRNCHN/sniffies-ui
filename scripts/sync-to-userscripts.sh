#!/usr/bin/env bash
# Sync repo Sniffies.js → Userscripts install path (real file; no symlink)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/Sniffies.js"
DEST="${SNIFFIES_USERSCRIPT_DEST:-$HOME/Library/Safari/Userscripts/Sniffies Intent Bar (Mac).user.js}"

mkdir -p "$(dirname "$DEST")"
cp "$SRC" "$DEST"
echo "Synced → $DEST"
