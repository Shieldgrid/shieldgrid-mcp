# Ticket 1 — Spike: Define core-mcp's first tools

## Goal
Define the initial, read-only set of MCP tools for `core-mcp` mapped directly to existing `shieldgrid-core` unified `/api/v1/*` endpoints, and resolve the authentication pattern for the MCP server.

## Proposed Core Tools (Read-Only)

Based on the existing API surface in `shieldgrid-core`, these 4 tools form the initial read-only scope. All mutations (POST, PATCH, DELETE) and actions are strictly excluded from Phase 4 Ticket 1.

### 1. `list_alerts`
- **Purpose**: Fetch open, unassigned, or recent alerts across all connected telemetry sources.
- **Backend Endpoint**: `GET /api/v1/alerts`
- **Inputs**: 
  - `since` (optional string, ISO8601): Fetch alerts after a specific time.
  - `limit` (optional integer): Cap results (default 100).
- **Responses**:
  - *Good*: Returns a JSON array of `NormalizedAlert` objects.
  - *Bad*: Returns a 401/403 (auth failure) or 500 with a detailed error if a connector goes down mid-query.

### 2. `list_cases`
- **Purpose**: View ongoing or historical investigations in Shieldgrid.
- **Backend Endpoint**: `GET /api/v1/cases`
- **Inputs**: 
  - `status` (optional string): Filter by status (Open, In Progress, Resolved, Closed).
- **Responses**:
  - *Good*: Returns a JSON array of `Case` objects without the full nested alert payloads.
  - *Bad*: Returns 401/500 standard errors.

### 3. `get_case`
- **Purpose**: Retrieve the full context of a specific case, including its attached evidence (alerts) and history.
- **Backend Endpoint**: 
  - Calls `GET /api/v1/cases/{id}`
  - Calls `GET /api/v1/cases/{id}/alerts` (to append the evidence payloads to the MCP response)
- **Inputs**:
  - `id` (required string, UUID): The target case ID.
- **Responses**:
  - *Good*: Returns a rich JSON object combining the case metadata and the full raw payloads of all linked alerts.
  - *Bad*: Returns 404 (Not Found) or 400 (Invalid UUID format).

### 4. `get_connector_health`
- **Purpose**: Check the real-time operational status of underlying security sensors (Velociraptor, Wazuh, etc.) before assuming missing data means no threats.
- **Backend Endpoint**: `GET /health`
- **Inputs**: None.
- **Responses**:
  - *Good*: Returns the health status tree (e.g. `{"status": "Healthy", "connectors": {"velociraptor": "Healthy", "wazuh": "Healthy"}}`).
  - *Bad*: Returns 503 if any connector is down, with the detailed tree explaining which one dropped.

## Authentication Mechanism

**The Problem**: `shieldgrid-core` relies on `httpOnly` session cookies via a `/api/v1/auth/login` endpoint intended for human browser interactions. MCP servers run in a background process (often inside Docker) and need a durable way to authenticate without interactive login.

**Proposed Solution**: **Static API Service Tokens**

1. **Backend Update**: Modify `shieldgrid-core`'s authentication middleware (`middleware.rs` / `auth.rs`) to support a fallback `Authorization: Bearer <token>` header alongside the existing session cookie logic.
2. **Configuration**: Introduce an `API_TOKENS` (or `SERVICE_ACCOUNTS`) environment variable or config array in the backend containing securely generated static tokens (e.g., `sg_mcp_abc123...`).
3. **MCP Integration**: The `core-mcp` server will accept a `--api-token` argument or `SHIELDGRID_API_TOKEN` environment variable. It will inject this as a Bearer token in the header of every Axios/fetch request it makes to `shieldgrid-core`.

*Why not just call `/auth/login` with a service account email/password?*
While possible, it requires the MCP server to manage session state, handle cookie extraction, and deal with session expiry/renewal logic. A static, long-lived API token is the industry standard for server-to-server integration and avoids brittle cookie management in the MCP SDK.
