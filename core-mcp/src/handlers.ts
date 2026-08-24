// ─────────────────────────────────────────────────────────────────────
// Shieldgrid Core MCP — Tool Handlers (110+ tools)
// Each handler maps a tool name to its API call.
// ─────────────────────────────────────────────────────────────────────

import axios, { AxiosInstance } from "axios";

const SHIELDGRID_API_URL =
  process.env.SHIELDGRID_API_URL || "http://localhost:3000/api/v1";

export function createApi(token: string): AxiosInstance {
  return axios.create({
    baseURL: SHIELDGRID_API_URL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
}

// Helper for JSON responses
function json(data: any): string {
  return JSON.stringify(data, null, 2);
}

// ─────────────────────────────────────────────────────────────────────
// Tool handler — dispatch by name
// ─────────────────────────────────────────────────────────────────────
export async function executeTool(
  name: string,
  args: any,
  api: AxiosInstance
): Promise<string> {
  // ── 1. ALERTS ────────────────────────────────────────────────────
  if (name === "list_alerts") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/alerts", { params });
    return json(args?.limit ? data.slice(0, args.limit) : data.slice(0, 100));
  }

  if (name === "get_alert") {
    const { data } = await api.get(`/alerts/${args.alert_id}`);
    return json(data);
  }

  if (name === "update_alert_status") {
    const { data } = await api.patch(`/alerts/${args.alert_id}`, {
      status: args.status,
    });
    return json(data);
  }

  if (name === "list_alerts_by_severity") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/alerts", { params });
    const filtered = data.filter(
      (a: any) => a.severity?.toLowerCase() === args.severity.toLowerCase()
    );
    return json(args?.limit ? filtered.slice(0, args.limit) : filtered);
  }

  if (name === "list_alerts_by_source") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/alerts", { params });
    const filtered = data.filter(
      (a: any) =>
        a.source === args.source ||
        a.raw_payload?.agent?.name === args.source ||
        a.raw_payload?.agent?.id === args.source
    );
    return json(args?.limit ? filtered.slice(0, args.limit) : filtered);
  }

  if (name === "count_alerts") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/alerts", { params });
    let filtered = data;
    if (args?.severity)
      filtered = filtered.filter(
        (a: any) =>
          a.severity?.toLowerCase() === args.severity.toLowerCase()
      );
    if (args?.source)
      filtered = filtered.filter(
        (a: any) =>
          a.source === args.source ||
          a.raw_payload?.agent?.name === args.source
      );
    if (args?.status)
      filtered = filtered.filter(
        (a: any) => a.status?.toLowerCase() === args.status.toLowerCase()
      );
    const counts: Record<string, number> = {};
    for (const a of filtered) {
      const sev = a.severity || "unknown";
      counts[sev] = (counts[sev] || 0) + 1;
    }
    return json({ total: filtered.length, by_severity: counts });
  }

  if (name === "list_alerts_by_connector") {
    const { data } = await api.get("/alerts");
    const filtered = data.filter(
      (a: any) => a.connector_id === args.connector_id
    );
    return json(args?.limit ? filtered.slice(0, args.limit) : filtered);
  }

  if (name === "search_alerts") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/alerts", { params });
    const q = args.query.toLowerCase();
    const filtered = data.filter((a: any) => {
      const haystack = JSON.stringify(a).toLowerCase();
      return haystack.includes(q);
    });
    return json(args?.limit ? filtered.slice(0, args.limit) : filtered);
  }

  if (name === "get_alert_timeline") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/alerts", { params });
    const filtered = data
      .filter(
        (a: any) =>
          a.source === args.source ||
          a.raw_payload?.agent?.name === args.source ||
          a.raw_payload?.agent?.id === args.source
      )
      .sort(
        (a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    return json(args?.limit ? filtered.slice(0, args.limit) : filtered.slice(0, 50));
  }

  // ── 2. CASES ─────────────────────────────────────────────────────
  if (name === "list_cases") {
    const { data } = await api.get("/cases");
    const result = args?.status
      ? data.filter((c: any) => c.status === args.status)
      : data;
    return json(result);
  }

  if (name === "get_case") {
    const [caseResp, alertsResp, tasksResp, observablesResp] =
      await Promise.all([
        api.get(`/cases/${args.id}`),
        api.get(`/cases/${args.id}/alerts`).catch(() => ({ data: [] })),
        api.get(`/cases/${args.id}/tasks`).catch(() => ({ data: [] })),
        api.get(`/cases/${args.id}/observables`).catch(() => ({ data: [] })),
      ]);
    const c = caseResp.data;
    c.linked_alerts = alertsResp.data;
    c.tasks = tasksResp.data;
    c.observables = observablesResp.data;
    return json(c);
  }

  if (name === "create_case") {
    const { data } = await api.post("/cases", {
      title: args.title,
      description: args.description,
    });
    return json(data);
  }

  if (name === "update_case") {
    const { data } = await api.patch(`/cases/${args.case_id}`, {
      status: args.status,
      title: args.title,
      assigned_to: args.assigned_to,
    });
    return json(data);
  }

  if (name === "delete_case") {
    await api.delete(`/cases/${args.case_id}`);
    return json({ status: "deleted", case_id: args.case_id });
  }

  if (name === "list_case_alerts") {
    const { data } = await api.get(`/cases/${args.case_id}/alerts`);
    return json(data);
  }

  if (name === "attach_alert_to_case") {
    const { data } = await api.post(
      `/cases/${args.case_id}/alerts/${args.alert_id}`
    );
    return json(data);
  }

  if (name === "detach_alert_from_case") {
    await api.delete(`/cases/${args.case_id}/alerts/${args.alert_id}`);
    return json({
      status: "detached",
      case_id: args.case_id,
      alert_id: args.alert_id,
    });
  }

  if (name === "list_case_tasks") {
    const { data } = await api.get(`/cases/${args.case_id}/tasks`);
    return json(data);
  }

  if (name === "create_case_task") {
    const { data } = await api.post(`/cases/${args.case_id}/tasks`, {
      title: args.title,
      description: args.description,
      assigned_to: args.assigned_to,
    });
    return json(data);
  }

  if (name === "update_case_task") {
    const { data } = await api.patch(`/tasks/${args.task_id}`, {
      status: args.status,
      assigned_to: args.assigned_to,
    });
    return json(data);
  }

  if (name === "delete_case_task") {
    await api.delete(`/tasks/${args.task_id}`);
    return json({ status: "deleted", task_id: args.task_id });
  }

  // ── 3. OBSERVABLES ───────────────────────────────────────────────
  if (name === "list_observables") {
    const { data } = await api.get(`/cases/${args.case_id}/observables`);
    return json(data);
  }

  if (name === "create_observable") {
    const { data } = await api.post(
      `/cases/${args.case_id}/observables`,
      {
        type: args.type,
        value: args.value,
        confidence: args.confidence,
        tlp: args.tlp,
        description: args.description,
      }
    );
    return json(data);
  }

  if (name === "update_observable") {
    const { data } = await api.patch(
      `/observables/${args.observable_id}`,
      {
        confidence: args.confidence,
        tlp: args.tlp,
        description: args.description,
      }
    );
    return json(data);
  }

  if (name === "delete_observable") {
    await api.delete(`/observables/${args.observable_id}`);
    return json({ status: "deleted", observable_id: args.observable_id });
  }

  if (name === "enrich_observable") {
    const { data: obs } = await api.get(
      `/observables/${args.observable_id}`
    );
    const enrichResp = await api
      .get(`/threat-intel/enrich/${encodeURIComponent(obs.value)}`)
      .catch(() => ({ data: { error: "Enrichment failed" } }));
    return json({ observable: obs, enrichment: enrichResp.data });
  }

  if (name === "get_case_progress") {
    const { data } = await api.get(`/cases/${args.case_id}/progress`);
    return json(data);
  }

  // ── 4. TEMPLATES ─────────────────────────────────────────────────
  if (name === "list_templates") {
    const { data } = await api.get("/templates");
    return json(data);
  }

  if (name === "get_template") {
    const { data } = await api.get(`/templates/${args.template_id}`);
    return json(data);
  }

  if (name === "apply_template") {
    const { data } = await api.post(
      `/cases/${args.case_id}/apply-template/${args.template_id}`
    );
    return json(data);
  }

  if (name === "list_case_actions") {
    const { data } = await api.get(`/cases/${args.case_id}/actions`);
    return json(data);
  }

  // ── 5. DETECTION RULES & MITRE ───────────────────────────────────
  if (name === "list_detection_rules") {
    const { data } = await api.get("/rules");
    return json(data);
  }

  if (name === "get_detection_rule") {
    const { data } = await api.get(`/rules/${args.rule_id}`);
    return json(data);
  }

  if (name === "update_detection_rule") {
    const { data } = await api.patch(`/rules/${args.rule_id}`, {
      enabled: args.enabled,
      severity: args.severity,
      description: args.description,
    });
    return json(data);
  }

  if (name === "get_mitre_matrix") {
    const { data } = await api.get("/mitre/matrix");
    return json(data);
  }

  if (name === "list_mitre_tactics") {
    const { data } = await api.get("/mitre/tactics");
    return json(data);
  }

  if (name === "get_mitre_technique") {
    const { data } = await api.get(
      `/mitre/techniques/${args.technique_id}`
    );
    return json(data);
  }

  if (name === "list_mitre_threat_groups") {
    const { data } = await api.get("/mitre/threat-groups");
    return json(data);
  }

  if (name === "list_mitre_software") {
    const { data } = await api.get("/mitre/software");
    return json(data);
  }

  if (name === "get_detection_coverage") {
    const { data: matrix } = await api.get("/mitre/matrix");
    const { data: rules } = await api.get("/rules");
    const covered = new Set(
      rules
        .filter((r: any) => r.enabled)
        .flatMap((r: any) => [
          ...(r.mitre_techniques || []),
          ...(r.mitre_tactics || []),
        ])
    );
    const allTechs =
      matrix?.tactics?.flatMap((t: any) =>
        (t.techniques || []).map((tech: any) => ({
          id: tech.id,
          name: tech.name,
          tactic: t.name,
          covered: covered.has(tech.id),
        }))
      ) || [];
    return json({
      total_techniques: allTechs.length,
      covered: allTechs.filter((t: any) => t.covered).length,
      gaps: allTechs.filter((t: any) => !t.covered),
      coverage_pct: allTechs.length
        ? Math.round(
            (allTechs.filter((t: any) => t.covered).length /
              allTechs.length) *
              100
          )
        : 0,
    });
  }

  if (name === "search_mitre") {
    const { data } = await api.get("/mitre/matrix");
    const q = args.query.toLowerCase();
    const results: any[] = [];
    for (const tactic of data?.tactics || []) {
      for (const tech of tactic.techniques || []) {
        if (
          tech.id?.toLowerCase().includes(q) ||
          tech.name?.toLowerCase().includes(q) ||
          tech.description?.toLowerCase().includes(q)
        ) {
          results.push({ ...tech, tactic: tactic.name });
        }
      }
    }
    return json({ query: args.query, results });
  }

  // ── 6. THREAT INTELLIGENCE ───────────────────────────────────────
  if (name === "enrich_ioc") {
    const { data } = await api.get(
      `/threat-intel/enrich/${encodeURIComponent(args.ioc)}`
    );
    return json(data);
  }

  if (name === "lookup_epss") {
    const { data } = await api.get(
      `/threat-intel/epss/${encodeURIComponent(args.cve)}`
    );
    return json(data);
  }

  if (name === "lookup_virustotal_ip") {
    const { data } = await api.get(
      `/threat-intel/enrich/${encodeURIComponent(args.ip)}`
    );
    return json(data);
  }

  if (name === "lookup_virustotal_domain") {
    const { data } = await api.get(
      `/threat-intel/enrich/${encodeURIComponent(args.domain)}`
    );
    return json(data);
  }

  if (name === "lookup_virustotal_hash") {
    const { data } = await api.get(
      `/threat-intel/enrich/${encodeURIComponent(args.hash)}`
    );
    return json(data);
  }

  if (name === "lookup_abuseipdb") {
    const { data } = await api.get(
      `/threat-intel/enrich/${encodeURIComponent(args.ip)}`
    );
    return json(data);
  }

  if (name === "search_threat_intel") {
    const { data } = await api.get(
      `/threat-intel/enrich/${encodeURIComponent(args.query)}`
    );
    return json(data);
  }

  if (name === "batch_enrich_iocs") {
    const results = await Promise.allSettled(
      args.iocs.map((ioc: string) =>
        api
          .get(`/threat-intel/enrich/${encodeURIComponent(ioc)}`)
          .then((r) => ({ ioc, ...r.data }))
      )
    );
    return json(
      results.map((r) =>
        r.status === "fulfilled" ? r.value : { ioc: "error", error: r.reason?.message }
      )
    );
  }

  // ── 7. AGENT MANAGEMENT — WAZUH ─────────────────────────────────
  if (name === "list_wazuh_agents") {
    const params: any = {};
    if (args?.status) params.status = args.status;
    const { data } = await api.get("/wazuh/agents", { params });
    return json(data);
  }

  if (name === "get_wazuh_agent") {
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}`
    );
    return json(data);
  }

  if (name === "get_agent_processes") {
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}/processes`
    );
    return json(data);
  }

  if (name === "get_agent_ports") {
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}/ports`
    );
    return json(data);
  }

  if (name === "get_agent_packages") {
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}/packages`
    );
    return json(data);
  }

  if (name === "get_agent_hotfixes") {
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}/hotfixes`
    );
    return json(data);
  }

  if (name === "get_agent_vulnerabilities") {
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}/vulnerabilities`
    );
    return json(data);
  }

  if (name === "list_wazuh_rules") {
    const params: any = {};
    if (args?.group) params.group = args.group;
    if (args?.level_min) params.level_min = args.level_min;
    if (args?.level_max) params.level_max = args.level_max;
    const { data } = await api.get("/wazuh/rules", { params });
    return json(data);
  }

  if (name === "get_wazuh_rule") {
    const { data } = await api.get(
      `/wazuh/rules/${args.rule_id}`
    );
    return json(data);
  }

  if (name === "list_wazuh_groups") {
    const { data } = await api.get("/wazuh/groups");
    return json(data);
  }

  // ── 8. AGENT MANAGEMENT — VELOCIRAPTOR ──────────────────────────
  if (name === "list_velociraptor_clients") {
    const { data } = await api.get("/velociraptor/clients");
    return json(data);
  }

  if (name === "get_velociraptor_client") {
    const { data } = await api.get(
      `/velociraptor/clients/${args.client_id}`
    );
    return json(data);
  }

  if (name === "list_velociraptor_artifacts") {
    const params: any = {};
    if (args?.search) params.search = args.search;
    const { data } = await api.get("/velociraptor/artifacts", {
      params,
    });
    return json(data);
  }

  if (name === "get_artifact_details") {
    const { data } = await api.get(
      `/velociraptor/artifacts/${encodeURIComponent(args.artifact_name)}`
    );
    return json(data);
  }

  if (name === "run_velociraptor_query") {
    const payload: any = { vql: args.vql };
    if (args.client_id) payload.client_id = args.client_id;
    const { data } = await api.post("/velociraptor/query", payload);
    return json(data);
  }

  if (name === "collect_artifact") {
    const { data } = await api.post("/velociraptor/collect", {
      client_id: args.client_id,
      artifact_name: args.artifact_name,
      parameters: args.parameters,
    });
    return json(data);
  }

  if (name === "list_hunts") {
    const { data } = await api.get("/velociraptor/hunts");
    return json(data);
  }

  if (name === "get_hunt") {
    const { data } = await api.get(
      `/velociraptor/hunts/${args.hunt_id}`
    );
    return json(data);
  }

  if (name === "list_flow_results") {
    const { data } = await api.get(
      `/velociraptor/clients/${args.client_id}/flows/${args.flow_id}/results`
    );
    return json(data);
  }

  if (name === "list_client_flows") {
    const params: any = {};
    if (args?.limit) params.limit = args.limit;
    const { data } = await api.get(
      `/velociraptor/clients/${args.client_id}/flows`,
      { params }
    );
    return json(data);
  }

  // ── 9. ACTIVE RESPONSE ──────────────────────────────────────────
  if (name === "list_action_templates") {
    const { data } = await api.get("/actions/templates");
    return json(data);
  }

  if (name === "execute_action") {
    const { data } = await api.post("/actions/execute", {
      template_name: args.template_name,
      target_id: args.target_id,
      parameters: args.parameters,
    });
    return json(data);
  }

  if (name === "list_action_executions") {
    const params: any = {};
    if (args?.limit) params.limit = args.limit;
    const { data } = await api.get("/actions/executions", { params });
    return json(data);
  }

  if (name === "get_action_execution") {
    const { data } = await api.get(
      `/actions/executions/${args.execution_id}`
    );
    return json(data);
  }

  if (name === "block_ip") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_block_ip",
      target_id: args.agent_id,
      parameters: { ip: args.ip },
    });
    return json(data);
  }

  if (name === "isolate_host") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_isolate_host",
      target_id: args.agent_id,
    });
    return json(data);
  }

  if (name === "kill_process") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_kill_process",
      target_id: args.agent_id,
      parameters: {
        pid: args.pid,
        process_name: args.process_name,
      },
    });
    return json(data);
  }

  if (name === "quarantine_file") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_quarantine_file",
      target_id: args.agent_id,
      parameters: { file_path: args.file_path },
    });
    return json(data);
  }

  if (name === "firewall_drop") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_firewall_drop",
      target_id: args.agent_id,
      parameters: { ip: args.ip },
    });
    return json(data);
  }

  if (name === "firewall_allow") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_firewall_allow",
      target_id: args.agent_id,
      parameters: { ip: args.ip },
    });
    return json(data);
  }

  if (name === "disable_user_account") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_disable_user",
      target_id: args.agent_id,
      parameters: { username: args.username },
    });
    return json(data);
  }

  if (name === "enable_user_account") {
    const { data } = await api.post("/actions/execute", {
      template_name: "wazuh_enable_user",
      target_id: args.agent_id,
      parameters: { username: args.username },
    });
    return json(data);
  }

  // ── 10. COMPLIANCE & SCA ─────────────────────────────────────────
  if (name === "list_sca_policies") {
    const { data } = await api.get("/wazuh/sca/policies");
    return json(data);
  }

  if (name === "get_sca_results") {
    const params: any = {};
    if (args?.policy_id) params.policy_id = args.policy_id;
    const { data } = await api.get(
      `/wazuh/agents/${args.agent_id}/sca`,
      { params }
    );
    return json(data);
  }

  if (name === "run_compliance_check") {
    const params: any = { standard: args.standard };
    if (args?.agent_id) params.agent_id = args.agent_id;
    const { data } = await api.get("/wazuh/compliance", { params });
    return json(data);
  }

  if (name === "list_vulnerabilities") {
    const params: any = {};
    if (args?.severity) params.severity = args.severity;
    if (args?.agent_id) params.agent_id = args.agent_id;
    if (args?.limit) params.limit = args.limit;
    const { data } = await api.get("/wazuh/vulnerabilities", { params });
    return json(data);
  }

  if (name === "get_critical_vulnerabilities") {
    const { data } = await api.get("/wazuh/vulnerabilities", {
      params: { severity: "critical" },
    });
    return json(data);
  }

  if (name === "get_vulnerability_summary") {
    const { data } = await api.get("/wazuh/vulnerabilities/summary");
    return json(data);
  }

  // ── 11. NETWORK CONNECTORS ──────────────────────────────────────
  if (name === "list_network_connectors") {
    const { data } = await api.get("/network-connectors");
    return json(data);
  }

  if (name === "create_network_connector") {
    const { data } = await api.post("/network-connectors", {
      name: args.name,
      connector_type: args.connector_type,
      host: args.host,
      port: args.port,
      config: args.config,
    });
    return json(data);
  }

  if (name === "get_network_connector") {
    const { data } = await api.get(
      `/network-connectors/${args.connector_id}`
    );
    return json(data);
  }

  if (name === "delete_network_connector") {
    await api.delete(`/network-connectors/${args.connector_id}`);
    return json({
      status: "deleted",
      connector_id: args.connector_id,
    });
  }

  if (name === "get_network_connector_stats") {
    const { data } = await api.get(
      `/network-connectors/${args.connector_id}/stats`
    );
    return json(data);
  }

  if (name === "list_syslog_messages") {
    const params: any = {};
    if (args?.connector_id) params.connector_id = args.connector_id;
    if (args?.limit) params.limit = args.limit;
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/network-connectors/syslog", {
      params,
    });
    return json(data);
  }

  // ── 12. SYSTEM HEALTH & MONITORING ──────────────────────────────
  if (name === "system_health") {
    const { data } = await api.get("/monitoring/health");
    return json(data);
  }

  if (name === "get_connector_health") {
    const { data } = await axios.get(
      SHIELDGRID_API_URL.replace("/api/v1", "/health")
    );
    const connector = (data.connectors || []).find(
      (c: any) => c.id === args.connector_id
    );
    return json(connector || { error: "Connector not found" });
  }

  if (name === "performance_dashboard") {
    const { data } = await api.get("/monitoring/dashboard");
    return json(data);
  }

  if (name === "get_ingestion_rate") {
    const { data } = await api.get("/monitoring/ingestion-rate");
    return json(data);
  }

  if (name === "get_severity_distribution") {
    const params: any = {};
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/monitoring/severity", { params });
    return json(data);
  }

  if (name === "get_top_sources") {
    const params: any = {};
    if (args?.limit) params.limit = args.limit;
    if (args?.since) params.since = args.since;
    const { data } = await api.get("/monitoring/top-sources", { params });
    return json(data);
  }

  if (name === "get_metrics") {
    const { data } = await api.get("/monitoring/metrics");
    return json(data);
  }

  if (name === "get_wazuh_cluster_health") {
    const { data } = await api.get("/wazuh/cluster/health");
    return json(data);
  }

  if (name === "get_opensearch_cluster_health") {
    const { data } = await api.get("/wazuh/cluster/opensearch-health");
    return json(data);
  }

  if (name === "get_audit_log") {
    const params: any = {};
    if (args?.actor_id) params.actor_id = args.actor_id;
    if (args?.action) params.action = args.action;
    if (args?.limit) params.limit = args.limit;
    const { data } = await api.get("/audit", { params });
    return json(data);
  }

  // ── 13. SCHEDULER & AUTOMATION ──────────────────────────────────
  if (name === "list_schedules") {
    const { data } = await api.get("/scheduler/schedules");
    return json(data);
  }

  if (name === "create_schedule") {
    const { data } = await api.post("/scheduler/schedules", {
      name: args.name,
      connector_id: args.connector_id,
      action_type: args.action_type,
      trigger: args.trigger,
    });
    return json(data);
  }

  if (name === "get_schedule") {
    const { data } = await api.get(
      `/scheduler/schedules/${args.schedule_id}`
    );
    return json(data);
  }

  if (name === "update_schedule") {
    const { data } = await api.patch(
      `/scheduler/schedules/${args.schedule_id}`,
      {
        enabled: args.enabled,
        trigger: args.trigger,
      }
    );
    return json(data);
  }

  if (name === "delete_schedule") {
    await api.delete(`/scheduler/schedules/${args.schedule_id}`);
    return json({
      status: "deleted",
      schedule_id: args.schedule_id,
    });
  }

  if (name === "get_schedule_history") {
    const { data } = await api.get(
      `/scheduler/schedules/${args.schedule_id}/history`
    );
    return json(data);
  }

  if (name === "list_shuffle_workflows") {
    const { data } = await api.get("/shuffle/workflows");
    return json(data);
  }

  if (name === "trigger_shuffle_workflow") {
    const { data } = await api.post("/shuffle/trigger", {
      workflow_id: args.workflow_id,
      data: args.data,
    });
    return json(data);
  }

  // ── 14. NOTIFICATIONS ────────────────────────────────────────────
  if (name === "list_notification_channels") {
    const { data } = await api.get("/notifications/channels");
    return json(data);
  }

  if (name === "create_notification_channel") {
    const { data } = await api.post("/notifications/channels", {
      name: args.name,
      type: args.channel_type,
      config: args.config,
    });
    return json(data);
  }

  if (name === "update_notification_channel") {
    const { data } = await api.patch(
      `/notifications/channels/${args.channel_id}`,
      {
        enabled: args.enabled,
        config: args.config,
      }
    );
    return json(data);
  }

  if (name === "delete_notification_channel") {
    await api.delete(`/notifications/channels/${args.channel_id}`);
    return json({
      status: "deleted",
      channel_id: args.channel_id,
    });
  }

  if (name === "list_notification_rules") {
    const { data } = await api.get("/notifications/rules");
    return json(data);
  }

  if (name === "create_notification_rule") {
    const { data } = await api.post("/notifications/rules", {
      name: args.name,
      channel_id: args.channel_id,
      conditions: args.conditions,
    });
    return json(data);
  }

  if (name === "send_notification") {
    const { data } = await api.post("/notifications/send", {
      channel_id: args.channel_id,
      recipient: args.recipient,
      subject: args.subject,
      message: args.message,
    });
    return json(data);
  }

  if (name === "list_notification_logs") {
    const params: any = {};
    if (args?.limit) params.limit = args.limit;
    const { data } = await api.get("/notifications/logs", { params });
    return json(data);
  }

  // ── 15. AI OPERATIONS ────────────────────────────────────────────
  if (name === "ai_triage") {
    const { data } = await api.post("/ai/triage", args || {});
    return json(data);
  }

  if (name === "ai_chat") {
    const { data } = await api.post("/ai/chat", {
      message: args.message,
      context: args.alert_id ? { alert_id: args.alert_id } : undefined,
    });
    return json(data);
  }

  if (name === "batch_triage") {
    const results = await Promise.allSettled(
      args.alert_ids.map((id: string) =>
        api
          .post("/ai/triage", { alert_id: id })
          .then((r) => ({ alert_id: id, ...r.data }))
      )
    );
    const triageResults = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { alert_id: "error", error: r.reason?.message }
    );
    if (args.correlate && triageResults.length > 1) {
      const common = new Set<string>();
      for (const r of triageResults) {
        for (const t of r.mitre_techniques || []) common.add(t);
      }
      return json({
        triage_results: triageResults,
        correlation: {
          shared_techniques: [...common],
          total_alerts: triageResults.length,
        },
      });
    }
    return json({ triage_results: triageResults });
  }

  if (name === "correlate_alerts") {
    const alerts = await Promise.allSettled(
      args.alert_ids.map((id: string) =>
        api.get(`/alerts/${id}`).then((r) => r.data)
      )
    );
    const validAlerts = alerts
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value);

    // Extract IOCs and techniques
    const ips = new Set<string>();
    const hashes = new Set<string>();
    const techniques = new Set<string>();
    const tactics = new Set<string>();
    const sources = new Set<string>();

    for (const a of validAlerts) {
      if (a.source) sources.add(a.source);
      const raw = a.raw_payload || {};
      if (raw.rule?.mitre?.id)
        raw.rule.mitre.id.forEach((t: string) => techniques.add(t));
      if (raw.rule?.mitre?.tactic)
        raw.rule.mitre.tactic.forEach((t: string) => tactics.add(t));
      if (raw.data?.srcip) ips.add(raw.data.srcip);
      if (raw.agent?.ip) ips.add(raw.agent.ip);
    }

    return json({
      correlated_alerts: validAlerts.length,
      timeline: validAlerts
        .sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime()
        )
        .map((a: any) => ({
          timestamp: a.timestamp,
          severity: a.severity,
          source: a.source,
          description:
            a.raw_payload?.rule?.description || "Unknown",
        })),
      iocs: { ips: [...ips], hashes: [...hashes] },
      mitre: { techniques: [...techniques], tactics: [...tactics] },
      sources: [...sources],
    });
  }

  if (name === "ai_posture_summary") {
    const { data } = await api.get("/ai/posture");
    return json(data);
  }

  if (name === "generate_investigation_report") {
    const [caseResp, alertsResp, tasksResp, observablesResp] =
      await Promise.all([
        api.get(`/cases/${args.case_id}`),
        api.get(`/cases/${args.case_id}/alerts`).catch(() => ({ data: [] })),
        api.get(`/cases/${args.case_id}/tasks`).catch(() => ({ data: [] })),
        api.get(`/cases/${args.case_id}/observables`).catch(() => ({
          data: [],
        })),
      ]);
    return json({
      report_type: "investigation",
      case: caseResp.data,
      alerts: alertsResp.data,
      tasks: tasksResp.data,
      observables: observablesResp.data,
      generated_at: new Date().toISOString(),
    });
  }

  throw new Error(`Unknown tool: ${name}`);
}
