#!/bin/bash

set -e

function get_dev_version() {
  local current_version=$(jq -r '.version' packages/react-native/package.json)
  local base_version=$(echo "$current_version" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')
  local timestamp=$(date +%Y%m%d%H%M%S)
  echo "${base_version}-dev.${timestamp}"
}

if [ -z "$1" ]; then
  echo "No preset or version provided"
  exit 1
else
  if [ "$1" = "dev" ]; then
    version=$(get_dev_version)
    echo "Setting dev version: $version"
  else
    version=$1
    echo "Setting manual version: $version"
  fi
fi

yarn workspaces foreach --all --no-private exec yarn version $version --deferred
yarn version apply --all