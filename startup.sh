#!/bin/sh
set -e

RELEASE_BASE="https://github.com/vbfs/terminalOS/releases/download/v0.2.0"
DEST="/downloads"

download_if_missing() {
  FILE="$1"
  DEST_PATH="$DEST/$FILE"
  if [ ! -f "$DEST_PATH" ]; then
    echo "Downloading $FILE..."
    wget -q --show-progress -O "$DEST_PATH" "$RELEASE_BASE/$(printf '%s' "$FILE" | sed 's/ /%20/g')"
  else
    echo "Already exists: $FILE"
  fi
}

download_if_missing "terminalOS-0.2.0.dmg"
download_if_missing "terminalOS-0.2.0-arm64.dmg"
download_if_missing "terminalOS Setup 0.2.0.exe"
download_if_missing "latest.yml"
download_if_missing "latest-mac.yml"

echo "Starting server..."
exec node server.js
