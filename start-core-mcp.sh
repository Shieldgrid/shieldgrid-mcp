#!/usr/bin/env bash
#
# Start the core-mcp server.
#
# Usage:
#   ./start-core-mcp.sh            # foreground (logs to stdout)
#   ./start-core-mcp.sh -d         # background (logs to /tmp/core-mcp.log)
#
# Reads configuration from a repo-root .env file if present (see
# .env.example). SHIELDGRID_API_TOKEN is required and must match one of the
# tokens configured in the backend's API_TOKENS - fail-fast if missing.

set -euo pipefail
cd "$(dirname "$0")"

# Load .env (repo root) if present, without overriding existing env vars.
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "${SHIELDGRID_API_TOKEN:-}" ]; then
  echo "Error: SHIELDGRID_API_TOKEN must be set." >&2
  echo "Copy .env.example to .env and fill it in to match a token in the backend's API_TOKENS." >&2
  exit 1
fi

DETACH=0
if [ "${1:-}" = "-d" ] || [ "${1:-}" = "--detach" ]; then
  DETACH=1
fi

cd core-mcp

echo "Building core-mcp..."
npm run build

if [ "$DETACH" = "1" ]; then
  LOG=/tmp/core-mcp.log
  setsid nohup node dist/index.js >> "$LOG" 2>&1 < /dev/null &
  echo "core-mcp started in background (pid $!) - log: $LOG"
else
  exec node dist/index.js
fi
