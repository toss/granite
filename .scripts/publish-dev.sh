#!/bin/bash
set -e

TIMESTAMP=$(node -p 'Date.now().toString().slice(0, 8)')

if grep -q "npmPublishRegistry:.*registry.npmjs.org" .yarnrc.yml; then
  echo "❌ Error: npmPublishRegistry is configured to registry.npmjs.org in .yarnrc.yml."
  exit 1
fi

echo "🔄 yarn install"
yarn install --immutable

echo "📦 Build Packages"
yarn workspaces foreach --no-private -At run build

echo "📝 Updating versions..."
yarn workspaces foreach --no-private -At exec bash -c "
  TIMESTAMP=$TIMESTAMP node -e '
    const fs = require(\"fs\");
    const pkg = require(\"./package.json\");
    const current = pkg.version.split(\"-\")[0];
    pkg.version = \`\${current}-dev.\` + process.env.TIMESTAMP;
    fs.writeFileSync(\"package.json\", JSON.stringify(pkg, null, 2) + \"\\n\");
  '
"

echo "🔍 Checking for existing versions..."
yarn workspaces foreach --no-private -At exec bash -c '
  NAME=$(node -p "require(\"./package.json\").name")
  VERSION=$(node -p "require(\"./package.json\").version")

  EXISTS=$(yarn npm info "$NAME" --json 2>/dev/null | node -e "
    const fs = require(\"fs\");
    try {
      const input = fs.readFileSync(0, \"utf-8\");
      const info = JSON.parse(input);
      if (info.versions && info.versions.includes(\"$VERSION\")) {
        console.log(\"true\");
      } else {
        console.log(\"false\");
      }
    } catch (e) {
      console.log(\"false\");
    }
  ")

  if [ "$EXISTS" == "true" ]; then
    echo "❌ $NAME@$VERSION already published!"
    exit 1
  fi
'

echo "✅ No conflicts found. Publishing..."
yarn workspaces foreach --no-private -At exec yarn npm publish --tag dev

echo "🚀 Dev Release Complete! ${TIMESTAMP}"
