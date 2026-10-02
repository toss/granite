#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec ../example/android/gradlew -p provider-tests testDebugUnitTest "$@"
