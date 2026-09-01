#!/usr/bin/env bash
# Copies shared contracts into server/ for deployment (Vercel only sees this dir)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -d "$ROOT_DIR/contracts" ]; then
  cp -r "$ROOT_DIR/contracts" "$SCRIPT_DIR/contracts"
  echo "Copied contracts/ into server/"
else
  echo "Warning: contracts/ not found at $ROOT_DIR/contracts"
fi
