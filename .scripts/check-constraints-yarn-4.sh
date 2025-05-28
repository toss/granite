if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "/  - path: \.yarn\/plugins\/@yarnpkg\/plugin-workspace-since\.cjs/d" ".yarnrc.yml"
  sed -i '' "/    spec: \"https:\/\/raw\.githubusercontent\.com\/toss\/yarn-plugin-workspace-since\/main\/bundles\/%40yarnpkg\/plugin-workspace-since\.js\"/d" ".yarnrc.yml"
else
  sed -i "/  - path: \.yarn\/plugins\/@yarnpkg\/plugin-workspace-since\.cjs/d" ".yarnrc.yml"
  sed -i "/    spec: \"https:\/\/raw\.githubusercontent\.com\/toss\/yarn-plugin-workspace-since\/main\/bundles\/%40yarnpkg\/plugin-workspace-since\.js\"/d" ".yarnrc.yml"
fi

yarn --no-immutable --no-immutable-cache
yarn constraints
