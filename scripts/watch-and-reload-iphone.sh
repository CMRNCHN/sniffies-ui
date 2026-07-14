#!/usr/bin/env bash
# Watch Sniffies-iPhone.js → refresh .user.js + local Tampermonkey mirror.
#
# Tampermonkey on iPhone only picks up changes after the file is on GitHub main
# (@updateURL → Sniffies-iPhone.user.js). This watch loop cannot push for you;
# it syncs mirrors and reminds you to bump version + push. Optional Mac Safari
# reload if testing the same script in desktop Safari with SNIFFIES_IPHONE_RELOAD_MAC=1.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/Sniffies-iPhone.js"
SYNC="$ROOT/scripts/sync-to-userscripts-iphone.sh"
RELOAD="$ROOT/scripts/reload-safari-sniffies.sh"

echo "Watching $TARGET"
echo "On save: write Sniffies-iPhone.user.js + local TM mirror"
echo "Remember: bump // @version and push .js + .user.js to main for iPhone updates"
if [[ "${SNIFFIES_IPHONE_RELOAD_MAC:-}" == "1" ]]; then
  echo "Also reloading Mac Safari sniffies.com tabs (SNIFFIES_IPHONE_RELOAD_MAC=1)"
fi
"$SYNC"

python3 - "$TARGET" "$SYNC" "$RELOAD" <<'PY'
import os, sys, time, subprocess

path, sync_sh, reload_sh = sys.argv[1], sys.argv[2], sys.argv[3]
reload_mac = os.environ.get("SNIFFIES_IPHONE_RELOAD_MAC") == "1"
last = os.path.getmtime(path)
while True:
    time.sleep(0.4)
    try:
        m = os.path.getmtime(path)
    except FileNotFoundError:
        continue
    if m != last:
        last = m
        print(time.strftime("%H:%M:%S"), "saved → Tampermonkey local sync")
        subprocess.run([sync_sh], check=False)
        if reload_mac:
            print(time.strftime("%H:%M:%S"), "→ reload Mac Safari sniffies tabs")
            subprocess.run([reload_sh], check=False)
PY
