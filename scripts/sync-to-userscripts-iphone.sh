#!/usr/bin/env bash
# Prepare / publish helpers for Sniffies Intent Bar (iPhone) on Tampermonkey (iOS).
#
# HOW IPHONE (TAMPERMONKEY) GETS UPDATES
# --------------------------------------
# Tampermonkey does NOT read Safari Userscripts / iCloud folders.
# It auto-updates from @updateURL / @downloadURL in the script header
# (GitHub raw on main for this repo):
#
#   https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.js
#
# Ship flow:
#   1. Edit Sniffies-iPhone.js and bump // @version (required for TM to fetch).
#   2. Commit + push to origin/main (or set SNIFFIES_IPHONE_PUSH=1 below).
#   3. On iPhone Tampermonkey: Dashboard → script → check for updates
#      (or wait for periodic check), then reload sniffies.com.
#
# First-time install on iPhone:
#   Open the raw URL above in Safari → Tampermonkey should offer Install,
#   or paste the raw URL in Tampermonkey → Utilities → Install from URL.
#
# This script also copies a local .user.js mirror for Mac-side smoke tests
# (optional; override with SNIFFIES_IPHONE_USERSCRIPT_DEST).
#
# Env:
#   SNIFFIES_IPHONE_PUSH=1           — git add/commit/push only if clean policy allows;
#                                      default OFF (never commits unless set)
#   SNIFFIES_IPHONE_USERSCRIPT_DEST  — optional local copy path
#   SNIFFIES_IPHONE_SKIP_LOCAL_COPY=1
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/Sniffies-iPhone.js"
RAW_URL="https://raw.githubusercontent.com/CMRNCHN/sniffies-ui/main/Sniffies-iPhone.js"
LOCAL_DEST="${SNIFFIES_IPHONE_USERSCRIPT_DEST:-$HOME/Library/Application Support/Tampermonkey/scripts/Sniffies Intent Bar (iPhone).user.js}"

if [[ ! -f "$SRC" ]]; then
  echo "Missing source: $SRC" >&2
  exit 1
fi

VERSION="$(rg -n '^// @version' "$SRC" | head -1 | sed -E 's/.*@version[[:space:]]+//')"
if ! rg -q '@updateURL' "$SRC" || ! rg -q '@downloadURL' "$SRC"; then
  echo "WARN: $SRC is missing @updateURL / @downloadURL (Tampermonkey auto-update needs both)" >&2
fi

if [[ "${SNIFFIES_IPHONE_SKIP_LOCAL_COPY:-}" != "1" ]]; then
  mkdir -p "$(dirname "$LOCAL_DEST")"
  cp "$SRC" "$LOCAL_DEST"
  echo "Local mirror → $LOCAL_DEST"
fi

echo "Source  → $SRC"
echo "Version → ${VERSION:-unknown}"
echo "Update  → $RAW_URL"
echo ""
echo "Tampermonkey (iPhone):"
echo "  • Install once from: $RAW_URL"
echo "  • After push to main + version bump: TM → Check for userscript updates, then reload sniffies.com"
echo ""
echo "Ship from this Mac:"
echo "  git add Sniffies-iPhone.js && git commit && git push origin HEAD"
echo "  (or open a PR that lands Sniffies-iPhone.js on main)"
