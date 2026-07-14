#!/usr/bin/env bash
# Prepare / publish helpers for Sniffies Intent Bar (iPhone) on Tampermonkey (iOS).
#
# HOW IPHONE (TAMPERMONKEY) GETS UPDATES
# --------------------------------------
# Tampermonkey auto-installs best from a URL ending in `.user.js`.
# Canonical install / update URL:
#
#   https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.user.js
#
# Install helper (opens TM installer when the extension is present):
#
#   https://www.tampermonkey.net/script_installation.php#url=https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.user.js
#
# Ship flow:
#   1. Edit Sniffies-iPhone.js and bump // @version (required for TM to fetch).
#   2. Run this script (writes Sniffies-iPhone.user.js mirror for GitHub).
#   3. Commit BOTH .js and .user.js, then push to origin/main.
#   4. On iPhone Tampermonkey: Dashboard → script → check for updates
#      (or wait for periodic check), then reload sniffies.com.
#
# First-time install on iPhone (pick one):
#   A. Safari → open the .user.js raw URL above → Tampermonkey Install
#   B. Open the tampermonkey.net script_installation.php helper URL
#   C. Tampermonkey → + → paste script → Save (most reliable if A/B hang)
#   Then on sniffies.com: Safari → aA → Tampermonkey → Allow / Always Allow
#
# This script also copies a local .user.js mirror for Mac-side smoke tests
# (optional; override with SNIFFIES_IPHONE_USERSCRIPT_DEST).
#
# Env:
#   SNIFFIES_IPHONE_PUSH=1           — reserved; default OFF (never commits)
#   SNIFFIES_IPHONE_USERSCRIPT_DEST  — optional local copy path
#   SNIFFIES_IPHONE_SKIP_LOCAL_COPY=1
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/Sniffies-iPhone.js"
USER_JS="$ROOT/Sniffies-iPhone.user.js"
RAW_URL="https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.user.js"
INSTALL_HELPER="https://www.tampermonkey.net/script_installation.php#url=${RAW_URL}"
LOCAL_DEST="${SNIFFIES_IPHONE_USERSCRIPT_DEST:-$HOME/Library/Application Support/Tampermonkey/scripts/Sniffies Intent Bar (iPhone).user.js}"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source: $SRC" >&2
  exit 1
fi

# Tampermonkey only reliably offers Install for URLs ending in .user.js
cp "$SRC" "$USER_JS"
echo "GitHub mirror → $USER_JS"

VERSION="$(rg -n '^// @version' "$SRC" | head -1 | sed -E 's/.*@version[[:space:]]+//')"
if ! rg -q '@updateURL' "$SRC" || ! rg -q '@downloadURL' "$SRC"; then
  echo "WARN: $SRC is missing @updateURL / @downloadURL (Tampermonkey auto-update needs both)" >&2
fi
if ! rg -q 'Sniffies-iPhone\.user\.js' "$SRC"; then
  echo "WARN: @updateURL/@downloadURL should point at Sniffies-iPhone.user.js" >&2
fi

if [[ "${SNIFFIES_IPHONE_SKIP_LOCAL_COPY:-}" != "1" ]]; then
  mkdir -p "$(dirname "$LOCAL_DEST")"
  cp "$SRC" "$LOCAL_DEST"
  echo "Local mirror → $LOCAL_DEST"
fi

echo "Source  → $SRC"
echo "Version → ${VERSION:-unknown}"
echo "Install → $RAW_URL"
echo "Helper  → $INSTALL_HELPER"
echo ""
echo "Tampermonkey (iPhone):"
echo "  • First install: open Install URL (or paste into TM → +)"
echo "  • Allow extension on sniffies.com (Safari aA → Manage Extensions)"
echo "  • After push to main + version bump: TM → Check for updates, reload page"
echo ""
echo "Ship from this Mac:"
echo "  git add Sniffies-iPhone.js Sniffies-iPhone.user.js && git commit && git push origin HEAD"
