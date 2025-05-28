#!/bin/bash

set -e

yarn workspaces foreach --all --no-private "@granite-js/*" exec yarn npm publish --access public
