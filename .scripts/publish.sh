#!/bin/bash

set -e

yarn workspaces foreach --all --no-private exec npm publish --access public