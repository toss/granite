#!/bin/bash

set -e

yarn workspaces foreach --all --no-private exec yarn npm publish --access public
