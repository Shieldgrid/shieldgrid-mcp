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
  {
    name: "enrich_ioc",
    description: "Perform threat intelligence reputation lookup on an IP, domain, hash, or CVE via VirusTotal & EPSS.",
    inputSchema: {
      type: "object",
      properties: {
        ioc: {
          type: "string",
          description: "The IOC value to enrich (e.g. 192.168.1.1, evil.exe sha256, CVE-2024-3094)",
        },
      },
      required: ["ioc"],
    },
  },
  {
    name: "list_action_templates",
    description: "List available automated containment & remediation action templates in Shieldgrid.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "execute_action",
    description: "Dispatch an automated response action (e.g. isolate_host, terminate_process, quarantine_file) to a connector.",
    inputSchema: {
      type: "object",
      properties: {
        template_name: {
          type: "string",
          description: "Name of the action template (e.g. 'isolate_host', 'terminate_process')",
        },
        target_id: {
          type: "string",
          description: "Target identifier (hostname, agent ID, client ID)",
        },
        parameters: {
          type: "object",
          description: "Key-value parameters required by the template",
        },
      },
      required: ["template_name", "target_id"],
    },
  },
  {
    name: "list_detection_rules",
    description: "List active detection rules and their mapped MITRE ATT&CK techniques and queries.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_mitre_matrix",
    description: "Retrieve the enterprise MITRE ATT&CK Matrix coverage with tactics, techniques, and active detection counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "ai_triage",
    description: "Execute autonomous AI triage on an alert, case, or indicator to calculate risk score and get actionable response recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: {
          type: "string",
          description: "Optional UUID of the alert to triage",
        },
        case_id: {
          type: "string",
          description: "Optional UUID of the case to triage",
        },
        ioc: {
          type: "string",
          description: "Optional indicator of compromise to analyze",
        },
      },
    },
  },
  // ── Enhanced Incidents: Tasks ──
  {
    name: "list_case_tasks",
    description: "List all tasks for a case.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },
  {
    name: "create_case_task",
    description: "Create a new task for a case.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        assigned_to: { type: "string", description: "Assign to user" },
      },
      required: ["case_id", "title"],
    },
  },
  {
    name: "update_case_task",
    description: "Update a task status (pending, in_progress, completed, skipped).",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task UUID" },
        status: { type: "string", description: "New status" },
        assigned_to: { type: "string", description: "Reassign to user" },
      },
      required: ["task_id", "status"],
    },
  },
  // ── Enhanced Incidents: Observables ──
  {
    name: "list_observables",
    description: "List observables (IOCs) attached to a case.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },
  {
    name: "create_observable",
    description: "Add an observable (IOC) to a case for tracking.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        type: { type: "string", description: "IOC type: ip, domain, hash_md5, hash_sha256, url, email, file_path" },
        value: { type: "string", description: "IOC value" },
        confidence: { type: "string", description: "low, medium, high" },
        description: { type: "string", description: "Description of the observable" },
      },
      required: ["case_id", "type", "value"],
    },
  },
  // ── Enhanced Incidents: Templates ──
  {
    name: "list_templates",
    description: "List available case templates (phishing, malware, unauthorized access, data breach).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "apply_template",
    description: "Apply a case template to auto-create tasks and observables.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        template_id: { type: "string", description: "Template UUID" },
      },
      required: ["case_id", "template_id"],
    },
  },
  {
    name: "get_case_progress",
    description: "Get case progress (completed tasks / total tasks).",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },
  // ── Notifications ──
  {
    name: "list_notification_channels",
    description: "List all configured notification channels.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "send_notification",
    description: "Send a notification via a configured channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel UUID" },
        recipient: { type: "string", description: "Recipient (email, Slack channel, webhook URL)" },
        subject: { type: "string", description: "Notification subject" },
        message: { type: "string", description: "Notification message" },
      },
      required: ["channel_id", "recipient", "message"],
    },
  },
  {
    name: "list_notification_rules",
    description: "List notification rules (triggers and conditions).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  // ── Agent Management ──
  {
    name: "list_wazuh_agents",
    description: "List Wazuh agents with status, OS, and connection info.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: active, disconnected, pending, never_connected" },
      },
    },
  },
  {
    name: "list_velociraptor_clients",
    description: "List Velociraptor clients with OS and version info.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  // ── Monitoring ──
  {
    name: "system_health",
    description: "Get system health status of all connectors.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "performance_dashboard",
    description: "Get performance metrics: ingestion rates, severity distribution, top sources.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  // ── Scheduler ──
  {
    name: "list_schedules",
    description: "List all scheduled automation tasks.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_schedule",
    description: "Create a scheduled automation task.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Schedule name" },
        connector_id: { type: "string", description: "Target connector (wazuh, velociraptor, shuffle)" },
        action_type: { type: "string", description: "Action to execute" },
        trigger: { type: "object", description: '{"type": "interval", "seconds": 3600}' },
      },
      required: ["name", "connector_id", "action_type", "trigger"],
    },
  },
  // ── Shuffle ──
  {
    name: "list_shuffle_workflows",
    description: "List available Shuffle workflows.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "trigger_shuffle_workflow",
    description: "Trigger a Shuffle SOAR workflow.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: { type: "string", description: "Shuffle workflow ID" },
        data: { type: "object", description: "Input data for the workflow" },
      },
      required: ["workflow_id"],
    },
  },
  // ── AI Chat ──
  {
    name: "ai_chat",
    description: "Chat with the AI analyst for collaborative investigation.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Your question or request" },
        alert_id: { type: "string", description: "Optional alert context UUID" },
      },
      required: ["message"],
    },
  },
  {
    name: "batch_triage",
    description: "Triage multiple alerts at once with optional correlation.",
    inputSchema: {
      type: "object",
      properties: {
        alert_ids: { type: "array", items: { type: "string" }, description: "Alert UUIDs" },
        correlate: { type: "boolean", description: "Correlate alerts", default: false },
      },
      required: ["alert_ids"],
    },
  },
  {
    name: "correlate_alerts",
    description: "Correlate multiple alerts to identify attack patterns.",
    inputSchema: {
      type: "object",
      properties: {
        alert_ids: { type: "array", items: { type: "string" }, description: "Alert UUIDs" },
      },
      required: ["alert_ids"],
    },
  },
];

// Helper to execute tool logic
async function executeTool(name: string, args: any) {
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
    return JSON.stringify(alerts, null, 2);
  }

  if (name === "list_cases") {
    const response = await api.get("/cases");
    let cases = response.data;
    if (args?.status) {
      cases = cases.filter((c: any) => c.status === args.status);
    }
    return JSON.stringify(cases, null, 2);
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
    return JSON.stringify(caseData, null, 2);
  }

  if (name === "get_connector_health") {
    const response = await axios.get(SHIELDGRID_API_URL.replace("/api/v1", "/health"));
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "enrich_ioc") {
    const ioc = args?.ioc as string;
    if (!ioc) throw new Error("Missing required argument: ioc");
    const response = await api.get(`/threat-intel/enrich/${encodeURIComponent(ioc)}`);
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "list_action_templates") {
    const response = await api.get("/actions/templates");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "execute_action") {
    const response = await api.post("/actions/execute", args);
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "list_detection_rules") {
    const response = await api.get("/rules");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "get_mitre_matrix") {
    const response = await api.get("/mitre/matrix");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "ai_triage") {
    const response = await api.post("/ai/triage", args || {});
    return JSON.stringify(response.data, null, 2);
  }

  // ── Enhanced Incidents: Tasks ──
  if (name === "list_case_tasks") {
    const response = await api.get(`/cases/${args.case_id}/tasks`);
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "create_case_task") {
    const response = await api.post(`/cases/${args.case_id}/tasks`, {
      title: args.title,
      description: args.description,
      assigned_to: args.assigned_to,
    });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "update_case_task") {
    const response = await api.patch(`/tasks/${args.task_id}`, {
      status: args.status,
      assigned_to: args.assigned_to,
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Enhanced Incidents: Observables ──
  if (name === "list_observables") {
    const response = await api.get(`/cases/${args.case_id}/observables`);
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "create_observable") {
    const response = await api.post(`/cases/${args.case_id}/observables`, {
      type: args.type,
      value: args.value,
      confidence: args.confidence,
      description: args.description,
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Enhanced Incidents: Templates ──
  if (name === "list_templates") {
    const response = await api.get("/templates");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "apply_template") {
    const response = await api.post(`/cases/${args.case_id}/apply-template/${args.template_id}`);
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "get_case_progress") {
    const response = await api.get(`/cases/${args.case_id}/progress`);
    return JSON.stringify(response.data, null, 2);
  }

  // ── Notifications ──
  if (name === "list_notification_channels") {
    const response = await api.get("/notifications/channels");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "send_notification") {
    const response = await api.post("/notifications/send", {
      channel_id: args.channel_id,
      recipient: args.recipient,
      subject: args.subject,
      message: args.message,
    });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "list_notification_rules") {
    const response = await api.get("/notifications/rules");
    return JSON.stringify(response.data, null, 2);
  }

  // ── Monitoring ──
  if (name === "system_health") {
    const response = await api.get("/monitoring/health");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "performance_dashboard") {
    const response = await api.get("/monitoring/dashboard");
    return JSON.stringify(response.data, null, 2);
  }

  // ── Scheduler ──
  if (name === "list_schedules") {
    const response = await api.get("/scheduler/schedules");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "create_schedule") {
    const response = await api.post("/scheduler/schedules", args);
    return JSON.stringify(response.data, null, 2);
  }

  // ── Shuffle ──
  if (name === "list_shuffle_workflows") {
    const response = await api.get("/shuffle/workflows");
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "trigger_shuffle_workflow") {
    const response = await api.post("/shuffle/trigger", {
      workflow_id: args.workflow_id,
      data: args.data,
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── AI Chat ──
  if (name === "ai_chat") {
    const response = await api.post("/ai/chat", {
      message: args.message,
      context: args.alert_id ? { alert_id: args.alert_id } : undefined,
    });
    return JSON.stringify(response.data, null, 2);
  }

  // ── Batch Operations ──
  if (name === "batch_triage") {
    const response = await api.post("/ai/triage/batch", {
      alert_ids: args.alert_ids,
      correlate: args.correlate,
    });
    return JSON.stringify(response.data, null, 2);
  }

  if (name === "correlate_alerts") {
    const response = await api.post("/ai/correlate", {
      alert_ids: args.alert_ids,
    });
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
    const resultText = await executeTool(name, args);
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
