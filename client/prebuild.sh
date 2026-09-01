#!/bin/bash
set -euo pipefail

echo "[client] copying contracts/ into client/contracts/"
cp -r ../contracts ./contracts

echo "[client] contracts copied"
