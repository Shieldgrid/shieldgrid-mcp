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
    name: "core-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Static tool definitions — single source of truth for both the MCP
// ListTools handler and the browser-facing REST proxy endpoint.
const TOOLS = [
  {
    name: "list_alerts",
    description: "Fetch open, unassigned, or recent alerts across all connected telemetry sources.",
    inputSchema: {
      type: "object",
      properties: {
        since: {
          type: "string",
          description: "ISO8601 timestamp to fetch alerts after a specific time (optional)",
        },
        limit: {
          type: "number",
          description: "Cap results (default 100)",
        },
      },
    },
  },
  {
    name: "list_cases",
    description: "View ongoing or historical investigations in Shieldgrid.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status (Open, In Progress, Resolved, Closed)",
        },
      },
    },
  },
  {
    name: "get_case",
    description: "Retrieve the full context of a specific case, including its attached evidence (alerts) and history.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The target case ID (UUID).",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_connector_health",
    description: "Check the real-time operational status of underlying security sensors (Velociraptor, Wazuh, etc.).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list_alerts") {
      const since = args?.since as string | undefined;
      const params = since ? { since } : {};
      const response = await api.get("/alerts", { params });
      let alerts = response.data;
      if (args?.limit) {
        alerts = alerts.slice(0, Number(args.limit));
      } else {
        alerts = alerts.slice(0, 100);
      }
      return {
        content: [{ type: "text", text: JSON.stringify(alerts, null, 2) }],
      };
    }

    if (name === "list_cases") {
      const response = await api.get("/cases");
      let cases = response.data;
      if (args?.status) {
        cases = cases.filter((c: any) => c.status === args.status);
      }
      return {
        content: [{ type: "text", text: JSON.stringify(cases, null, 2) }],
      };
    }

    if (name === "get_case") {
      const id = args?.id as string;
      if (!id) throw new Error("Missing required argument: id");

      const [caseResp, alertsResp] = await Promise.all([
        api.get(`/cases/${id}`),
        api.get(`/cases/${id}/alerts`).catch(() => ({ data: [] }))
      ]);

      const caseData = caseResp.data;
      caseData.linked_alerts = alertsResp.data;

      return {
        content: [{ type: "text", text: JSON.stringify(caseData, null, 2) }],
      };
    }

    if (name === "get_connector_health") {
      const response = await axios.get(SHIELDGRID_API_URL.replace("/api/v1", "/health"));
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
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
  console.log("New SSE connection received");
  if (transport) {
    try {
      await server.close();
      console.log("Closed previous server connection");
    } catch (e) {
      console.error("Error closing previous server transport:", e);
    }
  }
  
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
  console.log("SSE transport connected");
});

app.post("/message", async (req, res) => {
  console.log("POST /message received");
  if (transport) {
    await transport.handlePostMessage(req, res);
    console.log("Handled POST /message");
  } else {
    console.log("Rejected POST /message - no transport");
    res.status(503).send("SSE connection not established");
  }
});

// REST proxy endpoints — lets the browser use simple HTTP instead of SSE/JSON-RPC
app.get("/rest/tools", (_req, res) => {
  res.json({ tools: TOOLS });
});

app.post("/rest/tools/call", async (req, res) => {
  const { name, arguments: args } = req.body;
  try {
    if (name === "list_alerts") {
      const since = args?.since as string | undefined;
      const params = since ? { since } : {};
      const response = await api.get("/alerts", { params });
      let alerts = response.data;
      alerts = alerts.slice(0, Number(args?.limit) || 100);
      return res.json({ content: [{ type: "text", text: JSON.stringify(alerts, null, 2) }] });
    }
    if (name === "list_cases") {
      const response = await api.get("/cases");
      let cases = response.data;
      if (args?.status) cases = cases.filter((c: any) => c.status === args.status);
      return res.json({ content: [{ type: "text", text: JSON.stringify(cases, null, 2) }] });
    }
    if (name === "get_case") {
      const id = args?.id as string;
      if (!id) throw new Error("Missing required argument: id");
      const [caseResp, alertsResp] = await Promise.all([
        api.get(`/cases/${id}`),
        api.get(`/cases/${id}/alerts`).catch(() => ({ data: [] }))
      ]);
      const caseData = caseResp.data;
      caseData.linked_alerts = alertsResp.data;
      return res.json({ content: [{ type: "text", text: JSON.stringify(caseData, null, 2) }] });
    }
    if (name === "get_connector_health") {
      const response = await axios.get(SHIELDGRID_API_URL.replace("/api/v1", "/health"));
      return res.json({ content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] });
    }
    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    let errorMsg = "An internal error occurred.";
    if (error.response) errorMsg = `API Error: HTTP ${error.response.status}`;
    else if (error.message) errorMsg = error.message;
    return res.status(500).json({ isError: true, content: [{ type: "text", text: errorMsg }] });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`core-mcp server running on port ${PORT} (SSE)`);
});
