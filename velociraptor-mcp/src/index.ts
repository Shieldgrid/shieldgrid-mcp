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

const api = axios.create({
  baseURL: SHIELDGRID_API_URL,
  headers: { Authorization: `Bearer ${SHIELDGRID_API_TOKEN}` },
});

const server = new Server(
  { name: "velociraptor-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  // ── Client Management ──
  {
    name: "list_velociraptor_clients",
    description: "List all Velociraptor clients with OS info, version, and last seen.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_client_info",
    description: "Get detailed information about a specific Velociraptor client.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Velociraptor client ID (e.g., 'C.1234567890')" },
      },
      required: ["client_id"],
    },
  },
  // ── VQL Queries ──
  {
    name: "run_vql_query",
    description: "Execute a VQL query on the Velociraptor server (server scope).",
    inputSchema: {
      type: "object",
      properties: {
        vql: { type: "string", description: "VQL query to execute" },
      },
      required: ["vql"],
    },
  },
  {
    name: "run_client_query",
    description: "Execute a VQL query on a specific Velociraptor client.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
        vql: { type: "string", description: "VQL query to execute on the client" },
      },
      required: ["client_id", "vql"],
    },
  },
  // ── Artifact Management ──
  {
    name: "list_artifacts",
    description: "List available Velociraptor artifacts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_linux_artifacts",
    description: "List Linux-specific Velociraptor artifacts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_windows_artifacts",
    description: "List Windows-specific Velociraptor artifacts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "collect_artifact",
    description: "Collect a Velociraptor artifact from a specific client.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
        artifact: { type: "string", description: "Artifact name (e.g., 'Windows.System.Users')" },
        parameters: { type: "string", description: "Comma-separated key='value' pairs" },
      },
      required: ["client_id", "artifact"],
    },
  },
  {
    name: "get_collection_results",
    description: "Get results from a previous artifact collection (flow).",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Client ID" },
        flow_id: { type: "string", description: "Flow ID from collection" },
      },
      required: ["client_id", "flow_id"],
    },
  },
  // ── Forensics ──
  {
    name: "collect_triage",
    description: "Collect rapid forensic triage from an endpoint (process listings, network connections, autoruns).",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
      },
      required: ["client_id"],
    },
  },
  {
    name: "isolate_endpoint",
    description: "Isolate an endpoint from the network (preserves SOC telemetry).",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
      },
      required: ["client_id"],
    },
  },
  {
    name: "unisolate_endpoint",
    description: "Restore network access to an isolated endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
      },
      required: ["client_id"],
    },
  },
  // ── Hunts ──
  {
    name: "list_hunts",
    description: "List Velociraptor hunts.",
    inputSchema: { type: "object", properties: {} },
  },
  // ── Flows ──
  {
    name: "list_flows",
    description: "List recent flows (artifact collections) for a client.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
      },
      required: ["client_id"],
    },
  },
];

// Helper to execute tool logic
async function executeTool(name: string, args: any) {
  // ── Client Management ──
  if (name === "list_velociraptor_clients") {
    const response = await api.get("/velociraptor/clients");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "get_client_info") {
    const response = await api.get("/velociraptor/clients");
    const clients = response.data.rows || [];
    const client = clients.find((c: any) => c.client_id === args.client_id);
    if (!client) return JSON.stringify({ error: `Client ${args.client_id} not found` });
    return JSON.stringify(client, null, 2);
  }

  // ── VQL Queries ──
  if (name === "run_vql_query") {
    const response = await api.post("/velociraptor/query", { vql: args.vql });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "run_client_query") {
    const response = await api.post("/velociraptor/query", {
      vql: args.vql,
      client_id: args.client_id,
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Artifacts ──
  if (name === "list_artifacts") {
    const response = await api.get("/velociraptor/artifacts");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "list_linux_artifacts") {
    const response = await api.get("/velociraptor/artifacts");
    const artifacts = (response.data.rows || []).filter((a: any) =>
      a.name?.startsWith("Linux.")
    );
    return JSON.stringify(artifacts, null, 2);
  }

  if (name === "list_windows_artifacts") {
    const response = await api.get("/velociraptor/artifacts");
    const artifacts = (response.data.rows || []).filter((a: any) =>
      a.name?.startsWith("Windows.")
    );
    return JSON.stringify(artifacts, null, 2);
  }

  if (name === "collect_artifact") {
    let vql = `SELECT * FROM Artifact.${args.artifact}()`;
    if (args.parameters) {
      const params = args.parameters.split(",").map((p: string) => {
        const [k, v] = p.split("=").map((s: string) => s.trim());
        return `${k}='${v}'`;
      }).join(", ");
      vql = `SELECT * FROM Artifact.${args.artifact}(${params})`;
    }
    const response = await api.post("/velociraptor/query", {
      vql,
      client_id: args.client_id,
    });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "get_collection_results") {
    const vql = `SELECT * FROM flow_results(client_id='${args.client_id}', flow_id='${args.flow_id}')`;
    const response = await api.post("/velociraptor/query", { vql });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Forensics ──
  if (name === "collect_triage") {
    const vql = `SELECT * FROM Artifact.CollectA()`;
    const response = await api.post("/velociraptor/query", {
      vql,
      client_id: args.client_id,
    });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "isolate_endpoint") {
    const response = await api.post("/actions/execute", {
      template_name: "isolate_endpoint",
      target_id: args.client_id,
    });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "unisolate_endpoint") {
    const response = await api.post("/actions/execute", {
      template_name: "unisolate_endpoint",
      target_id: args.client_id,
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Hunts ──
  if (name === "list_hunts") {
    const vql = `SELECT hunt_id, state, start_time, stop_time, created_by FROM hunts()`;
    const response = await api.post("/velociraptor/query", { vql });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Flows ──
  if (name === "list_flows") {
    const vql = `SELECT flow_id, state, request.artifacts, start_time, stop_time FROM flows(client_id='${args.client_id}')`;
    const response = await api.post("/velociraptor/query", { vql });
    return JSON.stringify(response.data, null, 2);
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
    return { content: [{ type: "text", text: resultText }] };
  } catch (error: any) {
    let errorMsg = "An internal error occurred.";
    if (error.response) errorMsg = `API Error: HTTP ${error.response.status}`;
    else if (error.message) errorMsg = error.message;
    return { isError: true, content: [{ type: "text", text: errorMsg }] };
  }
});

// Start Server
const app = express();
app.use(cors());
app.use(express.json());

let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
  if (transport) { try { await server.close(); } catch (e) {} }
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) await transport.handlePostMessage(req, res);
  else res.status(503).send("SSE connection not established");
});

app.get("/rest/tools", (_req, res) => res.json({ tools: TOOLS }));

app.post("/rest/tools/call", async (req, res) => {
  const { name, arguments: args } = req.body;
  try {
    const resultText = await executeTool(name, args);
    return res.json({ content: [{ type: "text", text: resultText }] });
  } catch (error: any) {
    return res.status(500).json({ isError: true, content: [{ type: "text", text: error.message }] });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`velociraptor-mcp server running on port ${PORT}`);
});
