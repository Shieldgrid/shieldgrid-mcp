# Shieldgrid MCP Setup Guide

This guide explains how to run the `core-mcp` server locally, connect it to an MCP client like Claude Desktop, and use it from the Shieldgrid web UI.

## Prerequisites

1. `shieldgrid-core` backend must be running and accessible.
2. A static API token must be configured in `shieldgrid-core` via the `API_TOKENS` environment variable (e.g., `API_TOKENS=sg_mcp_test_token`).
3. Node.js (v20+) and npm.

## Local Setup

1. Install dependencies:

   ```bash
   cd shieldgrid-mcp/core-mcp
   npm install
   ```

2. Configure environment variables — copy the repo-root example and fill it in:

   ```bash
   cd shieldgrid-mcp
   cp .env.example .env
   ```

   Ensure `SHIELDGRID_API_TOKEN` matches one of the tokens in the backend's `API_TOKENS`. `.env` is gitignored and never committed.

3. Start the server. From the repo root:

   ```bash
   # foreground (logs to stdout)
   ./start-core-mcp.sh

   # background (logs to /tmp/core-mcp.log)
   ./start-core-mcp.sh -d
   ```

   The script builds the project and then runs `node dist/index.js`. It fails fast at startup if `SHIELDGRID_API_TOKEN` is unset.

4. Verify it is up:

   ```bash
   curl http://localhost:3001/rest/tools
   ```

## REST Endpoints (browser / Shieldgrid web)

`core-mcp` exposes simple HTTP endpoints on port `3001` so the Shieldgrid web UI's AI dashboard can call MCP tools without a full SSE/JSON-RPC client:

| Endpoint | Method | Description |
|---|---|---|
| `/rest/tools` | GET | Returns the list of available MCP tools |
| `/rest/tools/call` | POST | Executes a tool (`{"name": "<tool>", "arguments": {...}}`) |
| `/sse` | GET | Standard MCP SSE transport (used by Claude Desktop etc.) |
| `/message` | POST | MCP JSON-RPC message endpoint for the SSE transport |

Example tool call:

```bash
curl -X POST http://localhost:3001/rest/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"get_connector_health","arguments":{}}'
```

The web UI defaults to `http://localhost:3001` (`MCP_BASE` in `shieldgrid-web/src/pages/AiDashboardPage.tsx`).

## Hooking up to Claude Desktop

Add the following to your `claude_desktop_config.json` (typically located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "shieldgrid-core": {
      "command": "node",
      "args": [
        "/path/to/shieldgrid-mcp/core-mcp/dist/index.js"
      ],
      "env": {
        "SHIELDGRID_API_URL": "http://localhost:3000/api/v1",
        "SHIELDGRID_API_TOKEN": "sg_mcp_test_token"
      }
    }
  }
}
```

Restart Claude Desktop, and it will now have access to Shieldgrid's read-only MCP tools.
