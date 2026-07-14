#!/usr/bin/env bash
# Sync repo Sniffies.js → Userscripts install path (real file; no symlink)
# For the iPhone Tampermonkey script, use scripts/sync-to-userscripts-iphone.sh
# (@updateURL → GitHub raw; bump version + push to main to ship to iPhone).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/Sniffies.js"
DEST="${SNIFFIES_USERSCRIPT_DEST:-$HOME/Library/Safari/Userscripts/Sniffies Intent Bar (Mac).user.js}"

mkdir -p "$(dirname "$DEST")"
cp "$SRC" "$DEST"
echo "Synced → $DEST"
