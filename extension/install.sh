#!/bin/bash

# Ensure we are in the extension directory where the script is located
cd "$(dirname "$0")"

echo "Packaging the extension..."
./package.sh

if [ $? -ne 0 ]; then
  echo "Packaging failed. Aborting installation."
  exit 1
fi

# The package.sh script creates a 'release' folder. Get its absolute path.
EXTENSION_DIR="$(pwd)/release"

echo "Installing/Updating extension in Chrome..."
# On macOS, this command tells Chrome to load (or reload) the unpacked extension from the specified directory.
open -a "Google Chrome" --args --load-extension="$EXTENSION_DIR"

echo "Done! The extension should now be updated in Chrome."
