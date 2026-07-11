#!/usr/bin/env bash
# Watch Sniffies.js → sync into Userscripts folder → reload Safari
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/Sniffies.js"
SYNC="$ROOT/scripts/sync-to-userscripts.sh"
RELOAD="$ROOT/scripts/reload-safari-sniffies.sh"

echo "Watching $TARGET"
echo "On save: sync to Userscripts + reload sniffies.com tabs"
"$SYNC"

python3 - "$TARGET" "$SYNC" "$RELOAD" <<'PY'
import os, sys, time, subprocess

path, sync_sh, reload_sh = sys.argv[1], sys.argv[2], sys.argv[3]
last = os.path.getmtime(path)
while True:
    time.sleep(0.4)
    try:
        m = os.path.getmtime(path)
    except FileNotFoundError:
        continue
    if m != last:
        last = m
        print(time.strftime("%H:%M:%S"), "saved → sync + reload")
        subprocess.run([sync_sh], check=False)
        subprocess.run([reload_sh], check=False)
PY
