#!/usr/bin/env bash
# Run versionguard test suite
set -euo pipefail
npx versionguard test "$@"
