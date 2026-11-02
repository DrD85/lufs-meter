#!/bin/bash
# Builds "LUFS Meter.app" (Apple Silicon, ad-hoc signed) from ../index.html.
#
#   ./build.sh            the app, in dist/LUFS Meter-darwin-arm64/
#   ./build.sh --zip      also a zip of it in ../release
#
# LUFS_DIST=dist/next ./build.sh builds into another folder (under dist), next to an app that is running from dist.
set -euo pipefail
cd "$(dirname "$0")"

ZIP=false
[[ "${1:-}" == "--zip" ]] && ZIP=true

APP_NAME="LUFS Meter"
VERSION="$(node -p "require('./package.json').version")"
DIST="${LUFS_DIST:-dist}"
OUT="$DIST/${APP_NAME}-darwin-arm64/${APP_NAME}.app"

# The page shows its own version (APP_VERSION in index.html); app and page must agree.
PAGE_VERSION="$(sed -n "s/.*const APP_VERSION = '\([^']*\)'.*/\1/p" ../index.html)"
if [[ "$PAGE_VERSION" != "$VERSION" ]]; then
  echo "Version mismatch: index.html has '$PAGE_VERSION', package.json has '$VERSION'" >&2
  exit 1
fi

[[ -d node_modules ]] || npm install

# The helper that reads the Nano's USB channels 3/4 (the same source as in the Nano Cortex Editor). Needs the Swift
# compiler of Xcode or its command line tools; built for macOS 13 and later, like the Electron app itself.
swiftc -O -target arm64-apple-macos13.0 -o native/nano-meter native/nano-meter.swift

# The icon (assets/make-icon.swift draws it).
if [[ ! -f assets/icon.icns ]]; then
  swift assets/make-icon.swift assets/icon-1024.png
  sips -z 1024 1024 assets/icon-1024.png >/dev/null
  rm -rf assets/icon.iconset && mkdir assets/icon.iconset
  for s in 16 32 128 256 512; do
    sips -z $s $s assets/icon-1024.png --out assets/icon.iconset/icon_${s}x${s}.png >/dev/null
    sips -z $((s * 2)) $((s * 2)) assets/icon-1024.png --out assets/icon.iconset/icon_${s}x${s}@2x.png >/dev/null
  done
  iconutil -c icns assets/icon.iconset -o assets/icon.icns
  rm -rf assets/icon.iconset
fi

# The page and its font (IBM Plex Sans, SIL OFL 1.1 - the licence goes with it).
rm -rf app
mkdir -p app/fonts
cp ../index.html app/index.html
cp ../fonts/plex.css ../fonts/OFL-IBM-Plex-Sans.txt app/fonts/

npx @electron/packager . "$APP_NAME" \
  --platform=darwin \
  --arch=arm64 \
  --out="$DIST" \
  --overwrite \
  --icon=assets/icon.icns \
  --app-bundle-id=local.nanocortex.lufsmeter \
  --app-version="$VERSION" \
  --extend-info=assets/extend-info.plist \
  --ignore='^/dist' \
  --ignore='^/assets' \
  --ignore='^/native' \
  --ignore='^/build\.sh$'

# The helper sits next to the app's executable, so the signature below covers it.
cp native/nano-meter "$OUT/Contents/MacOS/"

# Ad-hoc signature so macOS accepts the bundle and asks for the audio input.
codesign --force --deep --sign - "$OUT"
echo "Built: $(pwd)/$OUT"

if [[ "$ZIP" == true ]]; then
  mkdir -p ../release
  ZIPFILE="../release/LUFS-Meter-${VERSION}-mac-arm64.zip"
  rm -f "$ZIPFILE"
  ditto -c -k --keepParent "$OUT" "$ZIPFILE"
  echo "Zip: $(cd ../release && pwd)/$(basename "$ZIPFILE")"
fi
