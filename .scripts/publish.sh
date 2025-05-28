#!/bin/bash

set -e

if [ -z "$NPM_TOKEN" ]; then
  echo "Error: NPM_TOKEN environment variable is not set"
  exit 1
fi

echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc

yarn workspaces foreach --all --no-private exec yarn npm publish --access public
