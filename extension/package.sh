#!/bin/bash

# Extract version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "Syncing version $VERSION..."

# Update manifest.json (Linux/Mac compatible sed)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" extension-src/manifest.json
else
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" extension-src/manifest.json
fi

# Update version.ts
echo "export const APP_VERSION = '$VERSION';" > projects/base/src/lib/version.ts

rm -rf ./release
mkdir ./release

# Copy the essential files
cp -r ./extension-src/* ./release

# Build Angular
ng build base
ng build devtools-panel
ng build on-install
ng build popup
npm run build:scripts

mkdir -p ./release/devtools-panel
mkdir -p ./release/on-install
mkdir -p ./release/popup

cp -r dist/devtools-panel/browser/* ./release/devtools-panel
cp -r dist/on-install/browser/* ./release/on-install
cp -r dist/popup/browser/* ./release/popup
cp dist/content-script/main.js ./release/content-script.js
cp dist/content-script/injected.js ./release/injected.js
cp dist/service-worker/main.js ./release/service-worker.js

# Copy Assets
cp -r ./release/assets ./release/devtools-panel
cp -r ./release/assets ./release/on-install
cp -r ./release/assets ./release/popup
