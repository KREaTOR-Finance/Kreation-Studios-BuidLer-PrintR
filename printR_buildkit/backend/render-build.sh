#!/usr/bin/env bash
set -euo pipefail

# This script runs from printR_buildkit/backend/ (Render Root Directory)

echo "=== Building PrintR backend ==="
npm run build

echo "=== Building PrintR mobile web app ==="
cd ../../printR_mobile
npm install
npx expo export --platform web

echo "=== Copying web app to backend public/ ==="
cd -
mkdir -p public
cp -r ../../printR_mobile/dist/* public/

echo "=== Build complete ==="
