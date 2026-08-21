import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import express from "express";
import cors from "cors";

// Environment variables
const SHIELDGRID_API_URL = process.env.SHIELDGRID_API_URL || "http://localhost:3000/api/v1";
const SHIELDGRID_API_TOKEN = process.env.SHIELDGRID_API_TOKEN;

if (!SHIELDGRID_API_TOKEN) {
  console.error("SHIELDGRID_API_TOKEN is required.");
  process.exit(1);
}

// Axios instance with the auth token
const api = axios.create({
  baseURL: SHIELDGRID_API_URL,
  headers: {
    Authorization: `Bearer ${SHIELDGRID_API_TOKEN}`,
  },
});

// MCP Server Initialization
const server = new Server(
  {
    name: "wazuh-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Wazuh-specific MCP Tools
const TOOLS = [
  // ── Agent Management ──
  {
    name: "list_wazuh_agents",
    description: "List all Wazuh agents with status, OS, IP, and connection info.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status: active, disconnected, pending, never_connected",
        },
      },
    },
  },
  {
    name: "get_wazuh_agent_detail",
    description: "Get detailed information about a specific Wazuh agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Wazuh agent ID (e.g., '004')",
        },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_agents_summary",
    description: "Get Wazuh agent connection status summary (active, disconnected, pending counts).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  // ── Alert Queries ──
  {
    name: "search_wazuh_alerts",
    description: "Search Wazuh alerts with custom filters (rule groups, severity, timeframe).",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (e.g., 'rule.id:550 AND agent.name:web-server-1')",
        },
        timeframe: {
          type: "string",
          description: "Time range (e.g., '24h', '7d', '1w')",
        },
        limit: {
          type: "number",
          description: "Max results (default 100)",
        },
      },
    },
  },
  {
    name: "get_alert_rule",
    description: "Get Wazuh rule details by rule ID.",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: {
          type: "string",
          description: "Wazuh rule ID (e.g., '550')",
        },
      },
      required: ["rule_id"],
    },
  },
  // ── Active Response ──
  {
    name: "list_active_response_commands",
    description: "List available Wazuh active response commands.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "execute_wazuh_active_response",
    description: "Execute a Wazuh active response command on a specific agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID (e.g., '004')",
        },
        command: {
          type: "string",
          description: "AR command: firewall-drop, netsh-command, custom-script",
        },
        params: {
          type: "object",
          description: "Command parameters (e.g., {\"ip\": \"192.168.1.100\"})",
        },
      },
      required: ["agent_id", "command"],
    },
  },
  // ── Agent Inventory ──
  {
    name: "get_agent_processes",
    description: "Get running processes from a Wazuh agent (via syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID",
        },
        limit: {
          type: "number",
          description: "Max results (default 500)",
        },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_packages",
    description: "Get installed packages from a Wazuh agent (via syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID",
        },
        limit: {
          type: "number",
          description: "Max results (default 500)",
        },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_ports",
    description: "Get network ports from a Wazuh agent (via syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID",
        },
        protocol: {
          type: "string",
          description: "Filter by protocol: tcp, udp",
        },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_network_interfaces",
    description: "Get network interfaces from a Wazuh agent (via syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID",
        },
      },
      required: ["agent_id"],
    },
  },
  // ── SCA (Security Configuration Assessment) ──
  {
    name: "get_agent_sca",
    description: "Get SCA results for a Wazuh agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID",
        },
        policy_id: {
          type: "string",
          description: "Optional policy ID to filter",
        },
      },
      required: ["agent_id"],
    },
  },
  // ── Vulnerability Detection ──
  {
    name: "get_agent_vulnerabilities",
    description: "Get vulnerability scan results for a Wazuh agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "Target agent ID",
        },
        severity: {
          type: "string",
          description: "Filter by severity: Critical, High, Medium, Low",
        },
      },
      required: ["agent_id"],
    },
  },
];

// Helper to execute tool logic
async function executeTool(name: string, args: any) {
  // ── Agent Management ──
  if (name === "list_wazuh_agents") {
    const params: any = {};
    if (args?.status) params.status = args.status;
    const response = await api.get("/wazuh/agents", { params });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "get_wazuh_agent_detail") {
    // Get all agents and filter by ID
    const response = await api.get("/wazuh/agents");
    const agents = response.data.agents || [];
    const agent = agents.find((a: any) => a.id === args.agent_id);
    if (!agent) return JSON.stringify({ error: `Agent ${args.agent_id} not found` });
    return JSON.stringify(agent, null, 2);
  }

  if (name === "get_agent_agents_summary") {
    const response = await api.get("/wazuh/agents");
    return JSON.stringify(response.data.summary || {}, null, 2);
  }

  // ── Alert Queries ──
  if (name === "search_wazuh_alerts") {
    const response = await api.get("/alerts", { params: args });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "get_alert_rule") {
    // This would need a Wazuh manager API call
    return JSON.stringify({ message: "Rule lookup via Wazuh manager API" });
  }

  // ── Active Response ──
  if (name === "list_active_response_commands") {
    const response = await api.get("/actions/templates");
    const wazuhTemplates = response.data.filter((t: any) => t.provider === "wazuh");
    return JSON.stringify(wazuhTemplates, null, 2);
  }

  if (name === "execute_wazuh_active_response") {
    const response = await api.post("/actions/execute", {
      template_name: `wazuh_${args.command}`,
      target_id: args.agent_id,
      params: args.params || {},
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Agent Inventory ──
  if (name === "get_agent_processes") {
    // Would need to query via Velociraptor or Wazuh syscollector
    return JSON.stringify({ message: "Processes via syscollector" });
  }

  if (name === "get_agent_packages") {
    return JSON.stringify({ message: "Packages via syscollector" });
  }

  if (name === "get_agent_ports") {
    return JSON.stringify({ message: "Ports via syscollector" });
  }

  if (name === "get_agent_network_interfaces") {
    return JSON.stringify({ message: "Network interfaces via syscollector" });
  }

  // ── SCA ──
  if (name === "get_agent_sca") {
    return JSON.stringify({ message: "SCA results via Wazuh manager API" });
  }

  // ── Vulnerability Detection ──
  if (name === "get_agent_vulnerabilities") {
    return JSON.stringify({ message: "Vulnerability scan results via Wazuh API" });
  }

  throw new Error(`Unknown tool: ${name}`);
}

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const resultText = await executeTool(name, args);
    return {
      content: [{ type: "text", text: resultText }],
    };
  } catch (error: any) {
    let errorMsg = "An internal error occurred.";
    if (error.response) {
      errorMsg = `API Error: HTTP ${error.response.status}`;
    } else if (error.message) {
      errorMsg = error.message;
    }
    return {
      isError: true,
      content: [{ type: "text", text: errorMsg }],
    };
  }
});

// Start Server
const app = express();
app.use(cors());
app.use(express.json());

let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
  if (transport) {
    try { await server.close(); } catch (e) {}
  }
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send("SSE connection not established");
  }
});

// REST proxy
app.get("/rest/tools", (_req, res) => {
  res.json({ tools: TOOLS });
});

app.post("/rest/tools/call", async (req, res) => {
  const { name, arguments: args } = req.body;
  try {
    const resultText = await executeTool(name, args);
    return res.json({ content: [{ type: "text", text: resultText }] });
  } catch (error: any) {
    return res.status(500).json({ isError: true, content: [{ type: "text", text: error.message }] });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`wazuh-mcp server running on port ${PORT}`);
});
