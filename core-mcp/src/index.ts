import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import express from "express";
import cors from "cors";

import { TOOLS } from "./tools.js";
import { executeTool, createApi } from "./handlers.js";

// Environment variables
const SHIELDGRID_API_URL = process.env.SHIELDGRID_API_URL || "http://localhost:3000/api/v1";
const SHIELDGRID_API_TOKEN = process.env.SHIELDGRID_API_TOKEN;

if (!SHIELDGRID_API_TOKEN) {
  console.error("SHIELDGRID_API_TOKEN is required.");
  process.exit(1);
}

// Axios instance with the auth token
const api = createApi(SHIELDGRID_API_TOKEN);

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

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const resultText = await executeTool(name, args, api);
    return {
      content: [{ type: "text", text: resultText }],
    };
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
    const resultText = await executeTool(name, args, api);
    return res.json({ content: [{ type: "text", text: resultText }] });
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
