#!/usr/bin/env bash
# Cursor afterFileEdit: sync + reload Safari when Sniffies.js is saved
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
  *Sniffies.js|*Sniffies\ Intent\ Bar*)
    ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
    "$ROOT/scripts/sync-to-userscripts.sh" || true
    "$ROOT/scripts/reload-safari-sniffies.sh" || true
    ;;
esac

exit 0
