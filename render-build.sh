#!/usr/bin/env bash
set -euo pipefail

echo "=== Building PrintR backend ==="
cd printR_buildkit/backend
npm install
npm run build

echo "=== Building PrintR mobile web app ==="
cd ../../printR_mobile
npm install
npx expo export --platform web

echo "=== Copying web app to backend public/ ==="
mkdir -p ../printR_buildkit/backend/public
cp -r dist/* ../printR_buildkit/backend/public/

echo "=== Build complete ==="
