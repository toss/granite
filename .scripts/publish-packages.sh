#!/usr/bin/env bash

failed=0

while IFS= read -r line; do
  location=$(echo "$line" | jq -r '.location')
  name=$(echo "$line" | jq -r '.name')

  echo "Publishing $name..."
  if ! (cd "$location" && yarn npm publish --provenance --access public --tag next); then
    echo "Failed to publish $name, continuing..."
    failed=1
  fi
done < <(yarn workspaces list --no-private --json)

exit $failed
