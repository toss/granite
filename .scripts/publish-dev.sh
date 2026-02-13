#!/bin/bash
set -e

echo "🔄 yarn install"
yarn install --immutable

echo "📦 Build Packages"
yarn build:all

# Generate dev version
CURRENT_VERSION=$(jq -r '.version' packages/react-native/package.json)
BASE_VERSION=$(echo "$CURRENT_VERSION" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
TIMESTAMP=$(date +%y%m%d%H%M)
DEV_VERSION="${BASE_VERSION}-dev.${TIMESTAMP}"

# Update versions and publish
echo "📝 Updating versions to ${DEV_VERSION}..."
bash .scripts/version.sh "$DEV_VERSION"

echo "✅ Publishing..."
yarn workspaces foreach --no-private -At exec yarn npm publish --tag dev

# Restore original versions
echo "🔙 Restoring original versions..."
bash .scripts/version.sh "$CURRENT_VERSION"

echo "🚀 Dev Release Complete! (${DEV_VERSION})"
