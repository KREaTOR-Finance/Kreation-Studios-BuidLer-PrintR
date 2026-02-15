#!/usr/bin/env bash
set -euo pipefail

# Increase Node heap for larger Expo web builds
export NODE_OPTIONS="--max-old-space-size=4096"

echo "=== Building PrintR backend ==="
cd printR_buildkit/backend
npm install --production=false
npm run build

echo "=== Building PrintR mobile web app ==="
cd ../../printR_mobile
npm install --production=false

# Expo export outputs to dist/ by default
npx expo export --platform web

# Verify the web build produced an index.html
if [ ! -f dist/index.html ]; then
  echo "ERROR: expo export did not produce dist/index.html"
  ls -la dist/ 2>/dev/null || echo "dist/ directory does not exist"
  exit 1
fi

echo "=== Copying web app to backend public/ ==="
rm -rf ../printR_buildkit/backend/public
mkdir -p ../printR_buildkit/backend/public
cp -r dist/* ../printR_buildkit/backend/public/

echo "=== Verifying backend public/ ==="
ls -la ../printR_buildkit/backend/public/index.html

echo "=== Build complete ==="
