#!/bin/bash

# Get current date and time
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Create a new temporary directory for the Chrome profile with date and time
PROFILE_DIR="/tmp/chrome-canary-profile-$TIMESTAMP"
mkdir -p "$PROFILE_DIR"

# Path to Chrome Canary
CHROME_CANARY="/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"

# Launch Chrome Canary with the new profile directory
# --no-first-run: Skip the first run tasks (like the welcome page)
# --no-default-browser-check: Stop Chrome from checking if it is the default browser
"$CHROME_CANARY" --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check "http://localhost:9200/#/overview"
