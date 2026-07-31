# Shieldgrid MCP

The MCP (Model Context Protocol) agent layer for **Shieldgrid**. This repo exposes Shieldgrid's own API — and, where useful, specific connector capabilities — as tools an AI agent can call: querying alerts and cases, and (later, once approved) triggering response actions.

> This is Phase 4 of the Shieldgrid roadmap. See `shieldgrid-docs` for the full architecture and `AGENT_RULES.md` for the working rules every ticket here follows.

## Structure

Following the pattern of multi-tool MCP orchestration used by projects like SOCFortress's Talon — one repo, one subfolder per tool-specific MCP concern, since these are meant to work *together* against Shieldgrid, not be published as independent standalone packages (unlike SOCFortress's own single-purpose `wazuh-mcp-server`/`shuffle-mcp-server` repos, which are each their own repo because they're meant to be used independently by anyone).

```
shieldgrid-mcp/
├── core-mcp/           # Tools against Shieldgrid's own API (alerts, cases, audit)
├── wazuh-mcp/          # Optional: tools scoped to Wazuh-sourced data specifically
├── velociraptor-mcp/   # Optional: tools scoped to Velociraptor-sourced data/actions
├── docs/               # This repo's own design notes, spike proposals
└── README.md
```

`core-mcp/` is the priority — it talks to Shieldgrid's own `/api/v1/*` endpoints, which already unify data from every connector. The tool-specific subfolders are for cases where an agent genuinely needs connector-specific capability beyond what the unified API exposes (e.g. running an ad-hoc VQL query directly, rather than through Shieldgrid's normalized alert feed) — not a default, only added when a real need is identified.

## Status

🚧 Not started. Ticket 1 (research spike) defines what `core-mcp`'s first tools should actually be.

## Principles (see `AGENT_RULES.md` for full detail)

- No code ported or closely referenced from CoPilot's own `copilot-mcp-server`, SOCFortress's `wazuh-mcp-server`/`shuffle-mcp-server`, or Talon — architecture patterns only, never their source.
- Every ticket follows the same discipline as `shieldgrid-core`: spike first (proposal, no code), then implementation with real evidence, then review.
- Any tool exposed here that can *act* (not just read) inherits the same safety requirements as Shieldgrid's response actions: verified targets, audit logging, no blind execution.

## License

[AGPL-3.0](LICENSE)
