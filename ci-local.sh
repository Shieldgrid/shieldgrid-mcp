#!/usr/bin/env bash
set -e

echo "=== Running shieldgrid-mcp CI local ==="

cd "$(dirname "$0")/core-mcp"

echo "1. Installing dependencies..."
npm ci

echo "2. Typechecking & Building..."
npm run build

echo "=== CI Passed ==="
