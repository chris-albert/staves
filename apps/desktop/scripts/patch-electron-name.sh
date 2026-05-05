#!/bin/bash
# Patches the Electron.app Info.plist so macOS shows "Staves" in the menu bar
# and app switcher during development.

if [ "$(uname)" != "Darwin" ]; then
  exit 0
fi

PLIST=$(find "$(dirname "$0")/../node_modules" -path "*/Electron.app/Contents/Info.plist" 2>/dev/null | head -1)

if [ -z "$PLIST" ]; then
  # Try the hoisted node_modules
  PLIST=$(find "$(dirname "$0")/../../../node_modules" -path "*/Electron.app/Contents/Info.plist" 2>/dev/null | head -1)
fi

if [ -z "$PLIST" ]; then
  echo "Could not find Electron Info.plist, skipping name patch"
  exit 0
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleName Staves" "$PLIST" 2>/dev/null
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Staves" "$PLIST" 2>/dev/null

echo "Patched Electron.app bundle name to 'Staves'"
