#!/bin/sh
set -e

RELEASE_BASE="https://github.com/vbfs/terminalOS/releases/download/v0.2.0"
DEST="/downloads"
mkdir -p "$DEST"

download_if_missing() {
  FILE="$1"
  DEST_PATH="$DEST/$FILE"
  if [ ! -f "$DEST_PATH" ]; then
    echo "Downloading $FILE..."
    if wget --show-progress -O "$DEST_PATH" "$RELEASE_BASE/$(printf '%s' "$FILE" | sed 's/ /%20/g')"; then
      SIZE=$(stat -f%z "$DEST_PATH" 2>/dev/null || stat -c%s "$DEST_PATH" 2>/dev/null)
      if [ "$SIZE" -eq 0 ]; then
        echo "ERROR: Downloaded file is empty (0 bytes): $FILE"
        rm "$DEST_PATH"
        exit 1
      fi
      echo "Successfully downloaded: $FILE ($SIZE bytes)"
    else
      echo "ERROR: Failed to download $FILE"
      exit 1
    fi
  else
    SIZE=$(stat -f%z "$DEST_PATH" 2>/dev/null || stat -c%s "$DEST_PATH" 2>/dev/null)
    echo "Already exists: $FILE ($SIZE bytes)"
  fi
}

download_if_missing "terminalOS-0.2.0.dmg"
download_if_missing "terminalOS-0.2.0-arm64.dmg"
download_if_missing "terminalOS Setup 0.2.0.exe"
download_if_missing "latest.yml"
download_if_missing "latest-mac.yml"

echo "Starting server..."
exec node server.js