import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
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
const server = new Server({
    name: "core-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
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
        ],
    };
});
// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "list_alerts") {
            const since = args?.since;
            const params = since ? { since } : {};
            const response = await api.get("/alerts", { params });
            let alerts = response.data;
            if (args?.limit) {
                alerts = alerts.slice(0, Number(args.limit));
            }
            else {
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
                cases = cases.filter((c) => c.status === args.status);
            }
            return {
                content: [{ type: "text", text: JSON.stringify(cases, null, 2) }],
            };
        }
        if (name === "get_case") {
            const id = args?.id;
            if (!id)
                throw new Error("Missing required argument: id");
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
    }
    catch (error) {
        const errorMsg = error.response
            ? `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
            : error.message;
        return {
            isError: true,
            content: [{ type: "text", text: errorMsg }],
        };
    }
});
// Start Server
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
    console.error("Server failed to connect:", error);
    process.exit(1);
});
