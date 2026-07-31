# Shieldgrid MCP Overview

## Architecture

The MCP (Model Context Protocol) agent layer exposes Shieldgrid's API (and connector capabilities) to external AI agents. It follows a multi-tool MCP orchestration pattern, separating different concerns into sub-tools within the same repository.

**Components:**
- `core-mcp`: Exposes tools for querying `shieldgrid-core`'s unified API.
- Other MCP modules may be added in the future.

## Current Capabilities

The MCP is strictly **read-only**. It uses an `mcp-read` role via static token authentication to interact with the Shieldgrid API.

Available Tools:
- `list_alerts`: Fetch alerts across connected telemetry sources.
- `list_cases`: View ongoing investigations.
- `get_case`: Retrieve full context of a case, including linked alerts.
- `get_connector_health`: Real-time operational status of underlying security sensors (Wazuh, Velociraptor).

## Security Boundary

No write or action capabilities are exposed through MCP yet. Any future actions will require dedicated spikes and explicit review to maintain security.
