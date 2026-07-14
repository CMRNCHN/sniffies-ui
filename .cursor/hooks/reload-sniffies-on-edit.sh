#!/usr/bin/env bash
# Cursor afterFileEdit: sync Mac / iPhone userscripts on save
# Mac (Safari Userscripts): sync + reload Safari sniffies tabs
# iPhone (Tampermonkey): refresh local mirror; real device updates need
#   version bump + push to main (@updateURL GitHub raw)
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("")
    raise SystemExit(0)
for key in ("file_path", "path", "filePath", "uri"):
    v = d.get(key)
    if v:
        print(v)
        raise SystemExit(0)
for nest in ("file", "edit", "payload"):
    n = d.get(nest) or {}
    if isinstance(n, dict):
        for key in ("file_path", "path", "filePath", "uri"):
            v = n.get(key)
            if v:
                print(v)
                raise SystemExit(0)
print("")
' 2>/dev/null || true)

case "$file_path" in
  *Sniffies-iPhone.js|*Sniffies\ Intent\ Bar\ \(iPhone\)*)
    ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
    "$ROOT/scripts/sync-to-userscripts-iphone.sh" || true
    # iPhone Safari cannot be reloaded from Mac; optional Mac-tab refresh for local smoke.
    if [[ "${SNIFFIES_IPHONE_RELOAD_MAC:-}" == "1" ]]; then
      "$ROOT/scripts/reload-safari-sniffies.sh" || true
    fi
    ;;
  *Sniffies.js|*Sniffies\ Intent\ Bar*)
    ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
    "$ROOT/scripts/sync-to-userscripts.sh" || true
    "$ROOT/scripts/reload-safari-sniffies.sh" || true
    ;;
esac

exit 0
