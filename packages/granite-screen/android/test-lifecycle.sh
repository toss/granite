#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec ../gradle-plugin/gradlew -p lifecycle-tests testDebugUnitTest "$@"
