#!/bin/bash
set -e

echo "🔄 yarn install"
yarn install --immutable

echo "📦 Build Packages"
yarn build:all

echo "📝 Updating versions..."
bash .scripts/version.sh dev

echo "✅ Publishing..."
yarn workspaces foreach --no-private -At exec yarn npm publish --tag dev

echo "🚀 Dev Release Complete!"
