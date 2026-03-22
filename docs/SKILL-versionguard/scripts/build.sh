#!/usr/bin/env bash
# Run versionguard build pipeline
set -euo pipefail
npx versionguard build "$@"
