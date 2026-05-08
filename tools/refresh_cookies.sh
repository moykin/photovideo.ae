#!/bin/bash
# Refreshes YouTube cookies from Chrome so yt-dlp can download age-restricted videos.
# Run once manually or let the LaunchAgent call it daily.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COOKIES_FILE="$SCRIPT_DIR/app/cookies.txt"
LOG="$SCRIPT_DIR/cookie_refresh.log"
YT_DLP="$(which yt-dlp 2>/dev/null || echo /opt/homebrew/bin/yt-dlp)"

if [[ ! -x "$YT_DLP" ]]; then
  echo "[$(date)] ERROR: yt-dlp not found" >> "$LOG"
  exit 1
fi

echo "[$(date)] Refreshing cookies from Chrome..." >> "$LOG"

"$YT_DLP" \
  --cookies-from-browser chrome \
  --cookies "$COOKIES_FILE" \
  --skip-download \
  --quiet \
  "https://www.youtube.com/watch?v=jNQXAC9IVRw" >> "$LOG" 2>&1

if [[ $? -eq 0 ]]; then
  COUNT=$(wc -l < "$COOKIES_FILE" | tr -d ' ')
  echo "[$(date)] Done — $COUNT cookies saved to $COOKIES_FILE" >> "$LOG"
else
  echo "[$(date)] FAILED — check that Chrome is accessible and you are logged in to YouTube" >> "$LOG"
  exit 1
fi
