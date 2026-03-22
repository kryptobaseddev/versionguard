#!/usr/bin/env bash
# Run versionguard lint
set -euo pipefail
npx versionguard lint "$@"
