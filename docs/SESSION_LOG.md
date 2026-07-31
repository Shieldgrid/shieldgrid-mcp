# Shieldgrid MCP — Session Log

## Ticket 1 — Spike: Define core-mcp's first tools (Retroactive)
*(This proposal was retroactively logged as part of Ticket 2-FIX to ensure a complete, compliant paper trail).*

**Goal:** Define the initial, read-only set of MCP tools for `core-mcp` mapped directly to existing `shieldgrid-core` unified `/api/v1/*` endpoints, and resolve the authentication pattern.

**Proposed Core Tools (Read-Only)**
1. **`list_alerts`**: Wraps `GET /api/v1/alerts`. Optional inputs: `since`, `limit`.
2. **`list_cases`**: Wraps `GET /api/v1/cases`. Optional inputs: `status`.
3. **`get_case`**: Wraps `GET /api/v1/cases/{id}` and `GET /api/v1/cases/{id}/alerts` to return full case context. Required input: `id`.
4. **`get_connector_health`**: Wraps `GET /health` to return real-time operational status.

*Excluded:* All mutations (POST/PATCH/DELETE) and response actions are strictly out of scope for Phase 4 Ticket 1.

**Authentication Mechanism:**
`shieldgrid-core` relies on `httpOnly` session cookies. For the MCP server, we will introduce a **Static API Service Token** pattern. The backend will read a comma-separated `API_TOKENS` environment variable. If an incoming request has `Authorization: Bearer <token>` matching a static token, the backend will mint a minimal service role (`mcp-read`) for the request. `core-mcp` will enforce `SHIELDGRID_API_TOKEN` as a required environment variable on startup.

---

## 🛑 Ticket 2-FIX — Resolve outstanding issues from Ticket 2

**Scope Completed:**
1. **Retroactive Ticket 1 Proposal**: Logged above.
2. **Scoped Auth Role**: The overly permissive `admin` role minted by the static token in Ticket 2 was removed. I introduced a new `mcp-read` role and a `RequireRead` extractor in `shieldgrid-core/src/middleware.rs`. The read-only endpoints (`alerts_handler`, `list_cases_handler`, `get_case_handler`, `list_case_alerts_handler`) were updated from `RequireAdmin` to `RequireRead`, ensuring the service token cannot touch mutations or actions.
3. **Token Safety**: Confirmed `SHIELDGRID_API_TOKEN` is a fail-fast required env var in `shieldgrid-mcp/core-mcp/src/index.ts`. Confirmed `.gitignore` correctly ignores `.env`, and git history has no leaked tokens.
4. **Real Evidence**: Started `shieldgrid-core` with `API_TOKENS=sg_mcp_test_token` and queried the `core-mcp` server using `test_mcp.js` simulating a real MCP JSON-RPC call.

**Actual Evidence:**
Simulated MCP client executing `list_cases`:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_cases",
    "arguments": {}
  }
}
```

Response from `core-mcp`:
```json
{"result":{"content":[{"type":"text","text":"[\n  {\n    \"id\": \"bd399251-0392-4b71-84c2-b6065c4cd7b8\",\n    \"title\": \"Action Test Case\",\n    \"status\": \"Open\",\n    \"assigned_to\": null,\n    \"created_at\": \"2026-07-30T14:49:54.724710Z\",\n    \"updated_at\": \"2026-07-30T14:49:54.724710Z\"\n  },\n  {\n    \"id\": \"949f4415-b1f8-4960-868e-de995d0db88f\",\n    \"title\": \"Test case for alerts\",\n    \"status\": \"Open\",\n    \"assigned_to\": null,\n    \"created_at\": \"2026-07-29T11:45:32.640303Z\",\n    \"updated_at\": \"2026-07-29T11:45:32.640303Z\"\n  },\n  {\n    \"id\": \"fd0cf960-8292-4ae5-82d7-14b3cd16d412\",\n    \"title\": \"Suspicious login from Russia\",\n    \"status\": \"Closed\",\n    \"assigned_to\": \"4a6fabfa-7191-48f5-b5fb-3b2d3e7d6452\",\n    \"created_at\": \"2026-07-29T11:42:03.131110Z\",\n    \"updated_at\": \"2026-07-30T12:05:46.859065Z\"\n  }\n]"}]},"jsonrpc":"2.0","id":1}
```

*Review Required*: Ticket 2-FIX is complete. Stopped here before proceeding to Ticket 3 per the explicit hard boundary.

---

## 🛑 Ticket 3 — Full functional verification of core-mcp tools

**Scope Completed:**
1. Validated `get_connector_health` against a real Wazuh (via k8s LoadBalancer/port-forward) and Velociraptor instance running in a Multipass VM.
2. Validated `list_alerts` and `get_case` to ensure data can be fetched through the MCP server.

**Actual Evidence:**
`get_connector_health` result after both connectors came online:
```json
{"result":{"content":[{"type":"text","text":"{\n  \"status\": \"ok\",\n  \"connectors\": [\n    {\n      \"id\": \"wazuh\",\n      \"status\": \"healthy\"\n    },\n    {\n      \"id\": \"velociraptor\",\n      \"status\": \"healthy\"\n    }\n  ]\n}"}]},"jsonrpc":"2.0","id":1}
```

`get_case` result:
```json
{"result":{"content":[{"type":"text","text":"{\n  \"id\": \"bd399251-0392-4b71-84c2-b6065c4cd7b8\",\n  \"title\": \"Action Test Case\",\n  \"status\": \"Open\",\n  \"assigned_to\": null,\n  \"created_at\": \"2026-07-30T14:49:54.724710Z\",\n  \"updated_at\": \"2026-07-30T14:49:54.724710Z\",\n  \"linked_alerts\": []\n}"}]},"jsonrpc":"2.0","id":1}
```

---

## 🛑 Ticket 4 — Secrets, logging, and error-handling hardening

**Scope Completed:**
1. Created `.env.example` in `shieldgrid-mcp` with placeholders.
2. Hardened `core-mcp/src/index.ts` to obscure raw Axios error details, preventing leakage of internal backend URLs, connection strings, or full API schemas to the MCP client on error.
3. Updated `index.ts` to return generic "API Error" for HTTP failures instead of forwarding the raw response object.

**Actual Evidence:**
The `try-catch` block now filters errors carefully:
```typescript
    let errorMsg = "An internal error occurred while processing the request.";
    if (error.response) {
      errorMsg = `API Error: HTTP ${error.response.status}`;
      if (error.response.status === 404) {
        errorMsg = "API Error: Resource not found.";
      }
    } else if (error.isAxiosError) {
      errorMsg = "API Error: Unable to communicate with the backend service.";
    } else if (error.message && !error.message.includes('http') && !error.message.includes('ECONN')) {
      errorMsg = error.message;
    }
```

---

## 🛑 Ticket 5 — CI + local-first script

**Scope Completed:**
1. Created `ci-local.sh` that runs `npm ci` and `npm run build` for `core-mcp`.
2. Made `ci-local.sh` executable.
3. Created `.github/workflows/ci.yml` that uses `ci-local.sh` to build `core-mcp` on `push` and `pull_request` to `main`.

**Actual Evidence:**
Ran `./ci-local.sh` successfully:
```text
=== Running shieldgrid-mcp CI local ===
1. Installing dependencies...
added 113 packages, and audited 114 packages in 1s
2. Typechecking & Building...
> core-mcp@1.0.0 build
> tsc
=== CI Passed ===
```

---

## 🛑 Ticket 6 — Documentation

**Scope Completed:**
1. Created `docs/mcp/overview.md` with a high-level explanation of the architecture, components, current capabilities, and security boundaries.
2. Created `docs/mcp/setup.md` with step-by-step instructions for running locally and configuring it as a server in `claude_desktop_config.json`.

**Actual Evidence:**
Both markdown files have been created in the `shieldgrid-mcp/docs/mcp/` directory.

---

## 🛑 Ticket 7 — Fix REST proxy hang, rebuild stale dist, add start script

**Scope Completed:**
1. **Stale `dist/`**: the built `dist/index.js` predated the REST proxy endpoints (`/rest/tools`, `/rest/tools/call`), so the browser-facing UI could not reach the server even when it was running.
2. **Build was broken**: `npm run build` failed on `ListToolsRequestSchema.shape.result` (that schema describes a *request*, not a result). Replaced with a single static `TOOLS` const used by both the MCP `ListTools` handler and the REST endpoint — one source of truth.
3. **`/rest/tools` hung indefinitely**: it used `server.request(...)`, which waits for a response over the SSE transport. With no connected MCP client the promise never resolved, so the web UI's tool discovery timed out. The REST endpoint now returns the static tool list directly.
4. **Added `start-core-mcp.sh`** at the repo root: loads `.env`, fail-fasts if `SHIELDGRID_API_TOKEN` is unset, builds, and runs the server in foreground (`./start-core-mcp.sh`) or background (`./start-core-mcp.sh -d`, logs to `/tmp/core-mcp.log`).
5. **Documented** the startup flow and REST endpoints in `docs/mcp/setup.md`.

**Actual Evidence:**
```text
$ ./start-core-mcp.sh -d
Building core-mcp...
> core-mcp@1.0.0 build
> tsc
core-mcp started in background (pid 581232) - log: /tmp/core-mcp.log

$ curl http://localhost:3001/rest/tools
{"tools":[{"name":"list_alerts",...},{"name":"list_cases",...},{"name":"get_case",...},{"name":"get_connector_health",...}]}

$ curl -X POST http://localhost:3001/rest/tools/call \
    -H "Content-Type: application/json" \
    -d '{"name":"get_connector_health","arguments":{}}'
{"content":[{"type":"text","text":"{\"status\":\"ok\",\"connectors\":[{\"id\":\"wazuh\",\"status\":\"healthy\"},{\"id\":\"velociraptor\",\"status\":\"healthy\"}]}"}]}
```
