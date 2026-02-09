#!/usr/bin/env bash

while IFS= read -r line; do
  location=$(echo "$line" | jq -r '.location')
  name=$(echo "$line" | jq -r '.name')

  echo "Publishing $name..."
  (cd "$location" && yarn npm publish --provenance --access public --tag next) || echo "Failed to publish $name, continuing..."
done < <(yarn workspaces list --no-private --json)
