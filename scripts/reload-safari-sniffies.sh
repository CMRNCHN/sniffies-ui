#!/usr/bin/env bash
# Reload any Safari tabs currently on sniffies.com
set -euo pipefail

osascript <<'APPLESCRIPT' >/dev/null 2>&1 || true
tell application "Safari"
  if not (exists window 1) then return
  repeat with w in windows
    try
      repeat with t in tabs of w
        try
          set u to URL of t
          if u contains "sniffies.com" then
            set URL of t to u
          end if
        end try
      end repeat
    end try
  end repeat
end tell
APPLESCRIPT
