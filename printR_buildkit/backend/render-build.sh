#!/usr/bin/env bash
set -euo pipefail

# This script runs from printR_buildkit/backend/ (if Render Root Directory is set)
export NODE_OPTIONS="--max-old-space-size=4096"

echo "=== Building PrintR backend ==="
npm run build

echo "=== Building PrintR mobile web app ==="
cd ../../printR_mobile
npm install --production=false
npx expo export --platform web

if [ ! -f dist/index.html ]; then
  echo "ERROR: expo export did not produce dist/index.html"
  exit 1
fi

echo "=== Copying web app to backend public/ ==="
cd -
rm -rf public
mkdir -p public
cp -r ../../printR_mobile/dist/* public/

echo "=== Verifying public/index.html ==="
ls -la public/index.html

echo "=== Build complete ==="
