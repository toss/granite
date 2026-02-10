#!/bin/bash
set -euo pipefail

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
SUFFIX="${1:-$(date +%Y%m%d-%H%M%S)}"
SANITIZED_BRANCH="${CURRENT_BRANCH//\//-}"
DEPLOY_BRANCH="dev-release/${SANITIZED_BRANCH}-${SUFFIX}"

restore_branch() {
  if [[ "$(git rev-parse --abbrev-ref HEAD)" != "$CURRENT_BRANCH" ]]; then
    echo "↩️  Switching back to original branch: $CURRENT_BRANCH"
    git checkout "$CURRENT_BRANCH"
  fi
}
trap restore_branch EXIT

if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree is not clean. Please commit/stash/discard changes first."
  git status --short
  exit 1
fi

echo "🌱 Creating deploy branch from current branch"
echo "   from: $CURRENT_BRANCH"
echo "   to  : $DEPLOY_BRANCH"
git checkout -b "$DEPLOY_BRANCH"

echo "🔄 yarn install"
yarn install --immutable

echo "📦 Build Packages"
yarn build:all

echo "📝 Updating versions..."
bash .scripts/version.sh dev

if [[ -z "$(git status --porcelain)" ]]; then
  echo "ℹ️ No version changes detected. Skipping commit/publish."
  echo "📤 Push empty deploy branch for traceability"
  git push -u origin "$DEPLOY_BRANCH"
  exit 0
fi

echo "✅ Commit version updates on deploy branch"
git add -A
git commit -m "chore(release): bump dev versions"

echo "🚀 Push version commit"
git push -u origin "$DEPLOY_BRANCH"

echo "📤 Publishing dev packages"
yarn workspaces foreach --no-private -At exec yarn npm publish --tag dev

echo "📌 Published dev versions"
CHANGED_PACKAGE_FILES=$(git diff --name-only HEAD~1 HEAD -- 'packages/*/package.json' 'services/*/package.json' 'infra/*/package.json' 2>/dev/null || true)
if [[ -n "$CHANGED_PACKAGE_FILES" ]]; then
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    node -e "const p=require('./${file}'); if(p.name && p.version){ console.log('- ' + p.name + '@' + p.version); }"
  done <<< "$CHANGED_PACKAGE_FILES"
else
  echo "- (no package.json version diff detected)"
fi

echo "🎉 Dev Release Complete!"
echo "🔖 Deploy branch: $DEPLOY_BRANCH"
