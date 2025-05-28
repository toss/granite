#!/bin/bash

set -e

yarn build:all
yarn workspaces foreach --all --no-private exec yarn npm publish --access public