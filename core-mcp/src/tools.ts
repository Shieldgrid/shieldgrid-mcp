// ─────────────────────────────────────────────────────────────────────
// Shieldgrid Core MCP — Tool Definitions (110+ tools)
// Organized by category for maintainability.
// ─────────────────────────────────────────────────────────────────────

export const TOOLS = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. ALERTS (10 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_alerts",
    description: "Fetch open, unassigned, or recent alerts across all connected telemetry sources (Wazuh, Velociraptor, Graylog).",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string", description: "ISO8601 timestamp — fetch alerts after this time" },
        limit: { type: "number", description: "Max results (default 100)" },
      },
    },
  },
  {
    name: "get_alert",
    description: "Get full details of a single alert by UUID including raw payload, severity, source, and timestamp.",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: { type: "string", description: "Alert UUID" },
      },
      required: ["alert_id"],
    },
  },
  {
    name: "update_alert_status",
    description: "Update an alert's status (open, investigating, resolved, false_positive, escalated).",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: { type: "string", description: "Alert UUID" },
        status: { type: "string", description: "New status: open, investigating, resolved, false_positive, escalated" },
      },
      required: ["alert_id", "status"],
    },
  },
  {
    name: "list_alerts_by_severity",
    description: "Fetch alerts filtered by severity level (info, low, medium, high, critical).",
    inputSchema: {
      type: "object",
      properties: {
        severity: { type: "string", description: "Filter: info, low, medium, high, critical" },
        since: { type: "string", description: "ISO8601 timestamp" },
        limit: { type: "number", description: "Max results" },
      },
      required: ["severity"],
    },
  },
  {
    name: "list_alerts_by_source",
    description: "Fetch alerts from a specific source/agent (e.g. agent ID, hostname, connector).",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Source name, agent ID, or hostname" },
        since: { type: "string", description: "ISO8601 timestamp" },
        limit: { type: "number", description: "Max results" },
      },
      required: ["source"],
    },
  },
  {
    name: "count_alerts",
    description: "Count alerts by severity, source, or time range without fetching full payloads.",
    inputSchema: {
      type: "object",
      properties: {
        severity: { type: "string", description: "Filter by severity" },
        source: { type: "string", description: "Filter by source" },
        since: { type: "string", description: "ISO8601 timestamp" },
        status: { type: "string", description: "Filter by status" },
      },
    },
  },
  {
    name: "list_alerts_by_connector",
    description: "Fetch alerts from a specific connector (wazuh, velociraptor, graylog, shuffle).",
    inputSchema: {
      type: "object",
      properties: {
        connector_id: { type: "string", description: "Connector ID: wazuh, velociraptor, graylog, shuffle" },
        limit: { type: "number", description: "Max results" },
      },
      required: ["connector_id"],
    },
  },
  {
    name: "search_alerts",
    description: "Full-text search across alert payloads, descriptions, and rule names.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        since: { type: "string", description: "ISO8601 timestamp" },
        limit: { type: "number", description: "Max results" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_alert_timeline",
    description: "Get all alerts for a specific source/agent ordered chronologically (attack timeline).",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Agent ID or hostname" },
        since: { type: "string", description: "ISO8601 timestamp" },
        limit: { type: "number", description: "Max results (default 50)" },
      },
      required: ["source"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. CASES / INCIDENT MANAGEMENT (12 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_cases",
    description: "View ongoing or historical investigation cases in Shieldgrid.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: Open, In Progress, Resolved, Closed" },
      },
    },
  },
  {
    name: "get_case",
    description: "Retrieve full case context including linked alerts, tasks, observables, and history.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Case UUID" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_case",
    description: "Create a new investigation case with title and optional description.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Case title" },
        description: { type: "string", description: "Case description" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_case",
    description: "Update case status, title, description, or assignment.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        status: { type: "string", description: "New status: Open, In Progress, Resolved, Closed" },
        title: { type: "string", description: "Updated title" },
        assigned_to: { type: "string", description: "Assign to analyst" },
      },
      required: ["case_id"],
    },
  },
  {
    name: "delete_case",
    description: "Delete a case and all its linked alerts, tasks, and observables.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },
  {
    name: "list_case_alerts",
    description: "List all alerts linked to a specific case.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },
  {
    name: "attach_alert_to_case",
    description: "Link an alert to a case for investigation tracking.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        alert_id: { type: "string", description: "Alert UUID" },
      },
      required: ["case_id", "alert_id"],
    },
  },
  {
    name: "detach_alert_from_case",
    description: "Unlink an alert from a case.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        alert_id: { type: "string", description: "Alert UUID" },
      },
      required: ["case_id", "alert_id"],
    },
  },
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
        status: { type: "string", description: "New status: pending, in_progress, completed, skipped" },
        assigned_to: { type: "string", description: "Reassign to user" },
      },
      required: ["task_id", "status"],
    },
  },
  {
    name: "delete_case_task",
    description: "Delete a task from a case.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "Task UUID" },
      },
      required: ["task_id"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. OBSERVABLES & EVIDENCE (6 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_observables",
    description: "List observables (IOCs) attached to a case with TLP and confidence.",
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
    description: "Add an observable (IOC) to a case for tracking and enrichment.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
        type: { type: "string", description: "IOC type: ip, domain, hash_md5, hash_sha256, url, email, file_path, cve" },
        value: { type: "string", description: "IOC value" },
        confidence: { type: "string", description: "low, medium, high" },
        tlp: { type: "string", description: "TLP level: white, green, amber, red" },
        description: { type: "string", description: "Description of the observable" },
      },
      required: ["case_id", "type", "value"],
    },
  },
  {
    name: "update_observable",
    description: "Update an observable's confidence, TLP, or description.",
    inputSchema: {
      type: "object",
      properties: {
        observable_id: { type: "string", description: "Observable UUID" },
        confidence: { type: "string", description: "Updated confidence: low, medium, high" },
        tlp: { type: "string", description: "Updated TLP: white, green, amber, red" },
        description: { type: "string", description: "Updated description" },
      },
      required: ["observable_id"],
    },
  },
  {
    name: "delete_observable",
    description: "Remove an observable from a case.",
    inputSchema: {
      type: "object",
      properties: {
        observable_id: { type: "string", description: "Observable UUID" },
      },
      required: ["observable_id"],
    },
  },
  {
    name: "enrich_observable",
    description: "Automatically enrich an observable with threat intelligence (VirusTotal, EPSS, abuse.ch).",
    inputSchema: {
      type: "object",
      properties: {
        observable_id: { type: "string", description: "Observable UUID" },
      },
      required: ["observable_id"],
    },
  },
  {
    name: "get_case_progress",
    description: "Get case progress as completed tasks / total tasks percentage.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. CASE TEMPLATES & PLAYBOOKS (4 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_templates",
    description: "List available case templates (phishing, malware, unauthorized access, data breach, ransomware, insider threat).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_template",
    description: "Get a specific case template with its tasks and observables.",
    inputSchema: {
      type: "object",
      properties: {
        template_id: { type: "string", description: "Template UUID" },
      },
      required: ["template_id"],
    },
  },
  {
    name: "apply_template",
    description: "Apply a case template to auto-create tasks and observables for a case.",
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
    name: "list_case_actions",
    description: "List all automated actions executed on a case (containment, response, enrichment).",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. DETECTION RULES & MITRE ATT&CK (10 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_detection_rules",
    description: "List all active detection rules with MITRE mappings and severity.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_detection_rule",
    description: "Get a specific detection rule with full details, query, and MITRE mapping.",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: { type: "string", description: "Detection rule UUID" },
      },
      required: ["rule_id"],
    },
  },
  {
    name: "update_detection_rule",
    description: "Enable, disable, or modify a detection rule.",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: { type: "string", description: "Detection rule UUID" },
        enabled: { type: "boolean", description: "Enable or disable the rule" },
        severity: { type: "string", description: "Updated severity: low, medium, high, critical" },
        description: { type: "string", description: "Updated description" },
      },
      required: ["rule_id"],
    },
  },
  {
    name: "get_mitre_matrix",
    description: "Retrieve the enterprise MITRE ATT&CK Matrix with coverage, tactics, techniques, and active detection counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_mitre_tactics",
    description: "List all MITRE ATT&CK tactics with descriptions and technique counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_mitre_technique",
    description: "Get a specific MITRE technique by ID (e.g. T1078) with description, detection rules, and related techniques.",
    inputSchema: {
      type: "object",
      properties: {
        technique_id: { type: "string", description: "MITRE technique ID (e.g. T1078, T1059.001)" },
      },
      required: ["technique_id"],
    },
  },
  {
    name: "list_mitre_threat_groups",
    description: "List known MITRE threat groups with their techniques and associated software.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_mitre_software",
    description: "List MITRE software (malware and tools) with associated techniques and threat groups.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_detection_coverage",
    description: "Analyze detection coverage: which MITRE techniques have active rules and which are gaps.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "search_mitre",
    description: "Search MITRE ATT&CK by keyword across techniques, tactics, groups, and software.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keyword (e.g. 'lateral movement', 'powershell', 'credential'" },
      },
      required: ["query"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 6. THREAT INTELLIGENCE (8 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "enrich_ioc",
    description: "Perform threat intelligence reputation lookup on an IP, domain, hash, or CVE via VirusTotal, EPSS, and abuse.ch.",
    inputSchema: {
      type: "object",
      properties: {
        ioc: { type: "string", description: "The IOC value (IP, domain, hash, CVE, URL, email)" },
      },
      required: ["ioc"],
    },
  },
  {
    name: "lookup_epss",
    description: "Look up EPSS (Exploit Prediction Scoring System) score for a CVE to assess exploit likelihood.",
    inputSchema: {
      type: "object",
      properties: {
        cve: { type: "string", description: "CVE ID (e.g. CVE-2024-3094)" },
      },
      required: ["cve"],
    },
  },
  {
    name: "lookup_virustotal_ip",
    description: "Look up an IP address on VirusTotal for malware reports, DNS resolution, and community score.",
    inputSchema: {
      type: "object",
      properties: {
        ip: { type: "string", description: "IP address to look up" },
      },
      required: ["ip"],
    },
  },
  {
    name: "lookup_virustotal_domain",
    description: "Look up a domain on VirusTotal for DNS records, WHOIS, subdomains, and community score.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Domain to look up" },
      },
      required: ["domain"],
    },
  },
  {
    name: "lookup_virustotal_hash",
    description: "Look up a file hash on VirusTotal for malware detection, file details, and behavioral analysis.",
    inputSchema: {
      type: "object",
      properties: {
        hash: { type: "string", description: "MD5, SHA1, or SHA256 hash" },
      },
      required: ["hash"],
    },
  },
  {
    name: "lookup_abuseipdb",
    description: "Look up an IP on AbuseIPDB for abuse reports, ISP, country, and confidence score.",
    inputSchema: {
      type: "object",
      properties: {
        ip: { type: "string", description: "IP address to look up" },
      },
      required: ["ip"],
    },
  },
  {
    name: "search_threat_intel",
    description: "Search Shieldgrid threat intel history for past lookups and known IOCs.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (IP, domain, hash, CVE)" },
        since: { type: "string", description: "ISO8601 timestamp" },
      },
      required: ["query"],
    },
  },
  {
    name: "batch_enrich_iocs",
    description: "Enrich multiple IOCs in a single call for bulk analysis.",
    inputSchema: {
      type: "object",
      properties: {
        iocs: { type: "array", items: { type: "string" }, description: "List of IOC values to enrich" },
      },
      required: ["iocs"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 7. AGENT MANAGEMENT — WAZUH (10 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_wazuh_agents",
    description: "List all Wazuh agents with status, OS, IP, version, and last seen.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: active, disconnected, pending, never_connected" },
      },
    },
  },
  {
    name: "get_wazuh_agent",
    description: "Get detailed info about a specific Wazuh agent including group, config, and key.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID (e.g. '004')" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_processes",
    description: "List running processes on a Wazuh agent (requires syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_ports",
    description: "List open ports and connections on a Wazuh agent (requires syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_packages",
    description: "List installed packages on a Wazuh agent (requires syscollector).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_hotfixes",
    description: "List installed hotfixes/patches on a Windows Wazuh agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "get_agent_vulnerabilities",
    description: "List known CVEs affecting a specific Wazuh agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "list_wazuh_rules",
    description: "List Wazuh rules with groups, severity, and MITRE mappings.",
    inputSchema: {
      type: "object",
      properties: {
        group: { type: "string", description: "Filter by rule group (e.g. sshd, sudo, web)" },
        level_min: { type: "number", description: "Minimum rule level" },
        level_max: { type: "number", description: "Maximum rule level" },
      },
    },
  },
  {
    name: "get_wazuh_rule",
    description: "Get a specific Wazuh rule by ID with full details.",
    inputSchema: {
      type: "object",
      properties: {
        rule_id: { type: "number", description: "Wazuh rule ID" },
      },
      required: ["rule_id"],
    },
  },
  {
    name: "list_wazuh_groups",
    description: "List Wazuh agent groups with member counts.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 8. AGENT MANAGEMENT — VELOCIRAPTOR (10 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_velociraptor_clients",
    description: "List all Velociraptor clients/endpoints with OS, version, and last seen.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_velociraptor_client",
    description: "Get detailed info about a specific Velociraptor client.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Velociraptor client ID" },
      },
      required: ["client_id"],
    },
  },
  {
    name: "list_velociraptor_artifacts",
    description: "List all available Velociraptor client artifacts (VQL-based collection definitions).",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Search artifact names or descriptions" },
      },
    },
  },
  {
    name: "get_artifact_details",
    description: "Get the full definition, parameters, and documentation of a Velociraptor artifact.",
    inputSchema: {
      type: "object",
      properties: {
        artifact_name: { type: "string", description: "Full artifact name (e.g. Windows.System.ProcessListing)" },
      },
      required: ["artifact_name"],
    },
  },
  {
    name: "run_velociraptor_query",
    description: "Execute a custom VQL query against the Velociraptor server or a specific client.",
    inputSchema: {
      type: "object",
      properties: {
        vql: { type: "string", description: "VQL query to execute" },
        client_id: { type: "string", description: "Optional client ID for client-scoped queries" },
      },
      required: ["vql"],
    },
  },
  {
    name: "collect_artifact",
    description: "Launch a Velociraptor artifact collection on one or more clients.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Target client ID" },
        artifact_name: { type: "string", description: "Artifact to collect" },
        parameters: { type: "object", description: "Artifact parameters as key-value pairs" },
      },
      required: ["client_id", "artifact_name"],
    },
  },
  {
    name: "list_hunts",
    description: "List all Velociraptor hunts (mass artifact collections across clients).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_hunt",
    description: "Get details and statistics for a specific Velociraptor hunt.",
    inputSchema: {
      type: "object",
      properties: {
        hunt_id: { type: "string", description: "Velociraptor hunt ID" },
      },
      required: ["hunt_id"],
    },
  },
  {
    name: "list_flow_results",
    description: "Get results from a Velociraptor flow (artifact collection).",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Client ID" },
        flow_id: { type: "string", description: "Flow ID" },
      },
      required: ["client_id", "flow_id"],
    },
  },
  {
    name: "list_client_flows",
    description: "List recent artifact collection flows for a Velociraptor client.",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "Client ID" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
      required: ["client_id"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 9. ACTIVE RESPONSE (12 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_action_templates",
    description: "List all available automated containment and remediation action templates.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "execute_action",
    description: "Dispatch an automated response action (isolate_host, block_ip, kill_process, quarantine_file, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        template_name: { type: "string", description: "Action template name" },
        target_id: { type: "string", description: "Target (hostname, agent ID, client ID)" },
        parameters: { type: "object", description: "Template-specific parameters" },
      },
      required: ["template_name", "target_id"],
    },
  },
  {
    name: "list_action_executions",
    description: "List all executed actions with status and results.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 50)" },
      },
    },
  },
  {
    name: "get_action_execution",
    description: "Get detailed status of a specific action execution.",
    inputSchema: {
      type: "object",
      properties: {
        execution_id: { type: "string", description: "Execution UUID" },
      },
      required: ["execution_id"],
    },
  },
  {
    name: "block_ip",
    description: "Block an IP address on a specific agent's firewall.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        ip: { type: "string", description: "IP address to block" },
      },
      required: ["agent_id", "ip"],
    },
  },
  {
    name: "isolate_host",
    description: "Isolate a host by blocking all inbound/outbound traffic except to the SIEM.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "kill_process",
    description: "Terminate a process on a remote host by PID or name.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        pid: { type: "number", description: "Process ID to kill" },
        process_name: { type: "string", description: "Process name to kill (alternative to PID)" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "quarantine_file",
    description: "Quarantine a file by moving it to a secure location and logging the action.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        file_path: { type: "string", description: "Path to the file to quarantine" },
      },
      required: ["agent_id", "file_path"],
    },
  },
  {
    name: "firewall_drop",
    description: "Add a firewall DROP rule for an IP on a specific agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        ip: { type: "string", description: "IP to drop" },
      },
      required: ["agent_id", "ip"],
    },
  },
  {
    name: "firewall_allow",
    description: "Remove a firewall DROP rule to allow an IP back through.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        ip: { type: "string", description: "IP to unblock" },
      },
      required: ["agent_id", "ip"],
    },
  },
  {
    name: "disable_user_account",
    description: "Disable a user account on a host to prevent further access.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        username: { type: "string", description: "Username to disable" },
      },
      required: ["agent_id", "username"],
    },
  },
  {
    name: "enable_user_account",
    description: "Re-enable a previously disabled user account.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Target agent ID" },
        username: { type: "string", description: "Username to enable" },
      },
      required: ["agent_id", "username"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 10. COMPLIANCE & SCA (6 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_sca_policies",
    description: "List Security Configuration Assessment (SCA) policies applied to agents.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_sca_results",
    description: "Get SCA scan results for a specific agent (pass/fail checks, compliance score).",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "Wazuh agent ID" },
        policy_id: { type: "number", description: "Optional SCA policy ID" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "run_compliance_check",
    description: "Check compliance posture against a standard (PCI-DSS, GDPR, HIPAA, NIST, CIS).",
    inputSchema: {
      type: "object",
      properties: {
        standard: { type: "string", description: "Compliance standard: PCI-DSS, GDPR, HIPAA, NIST-CSF, CIS" },
        agent_id: { type: "string", description: "Optional agent to check (all if omitted)" },
      },
      required: ["standard"],
    },
  },
  {
    name: "list_vulnerabilities",
    description: "Query CVE vulnerabilities across agents sorted by severity.",
    inputSchema: {
      type: "object",
      properties: {
        severity: { type: "string", description: "Filter: critical, high, medium, low" },
        agent_id: { type: "string", description: "Filter by agent" },
        limit: { type: "number", description: "Max results" },
      },
    },
  },
  {
    name: "get_critical_vulnerabilities",
    description: "Get only critical and high-severity CVEs across all agents.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_vulnerability_summary",
    description: "Get aggregate vulnerability counts by severity across the environment.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 11. NETWORK CONNECTORS & SYSLOG (6 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_network_connectors",
    description: "List configured network connectors (syslog, Fluentd, Logstash, custom TCP/UDP).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_network_connector",
    description: "Create a new network connector for log ingestion.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Connector name" },
        connector_type: { type: "string", description: "Type: syslog_tcp, syslog_udp, fluentd, logstash, custom" },
        host: { type: "string", description: "Target host" },
        port: { type: "number", description: "Target port" },
        config: { type: "object", description: "Additional configuration" },
      },
      required: ["name", "connector_type", "host", "port"],
    },
  },
  {
    name: "get_network_connector",
    description: "Get details and stats for a specific network connector.",
    inputSchema: {
      type: "object",
      properties: {
        connector_id: { type: "string", description: "Network connector UUID" },
      },
      required: ["connector_id"],
    },
  },
  {
    name: "delete_network_connector",
    description: "Remove a network connector.",
    inputSchema: {
      type: "object",
      properties: {
        connector_id: { type: "string", description: "Network connector UUID" },
      },
      required: ["connector_id"],
    },
  },
  {
    name: "get_network_connector_stats",
    description: "Get ingestion statistics for a network connector (messages/sec, errors, uptime).",
    inputSchema: {
      type: "object",
      properties: {
        connector_id: { type: "string", description: "Network connector UUID" },
      },
      required: ["connector_id"],
    },
  },
  {
    name: "list_syslog_messages",
    description: "List recent syslog messages received from network connectors.",
    inputSchema: {
      type: "object",
      properties: {
        connector_id: { type: "string", description: "Filter by connector UUID" },
        limit: { type: "number", description: "Max results (default 50)" },
        since: { type: "string", description: "ISO8601 timestamp" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 12. SYSTEM HEALTH & MONITORING (10 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "system_health",
    description: "Get real-time operational status of all connectors (Wazuh, Velociraptor, Graylog, Shuffle).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_connector_health",
    description: "Check the real-time health of a specific connector.",
    inputSchema: {
      type: "object",
      properties: {
        connector_id: { type: "string", description: "Connector ID: wazuh, velociraptor, graylog, shuffle" },
      },
      required: ["connector_id"],
    },
  },
  {
    name: "performance_dashboard",
    description: "Get performance metrics: ingestion rates, severity distribution, top sources, alerts per hour.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_ingestion_rate",
    description: "Get current alert ingestion rate (alerts per minute/hour) per connector.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_severity_distribution",
    description: "Get alert counts broken down by severity level over a time range.",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string", description: "ISO8601 timestamp (default: last 24h)" },
      },
    },
  },
  {
    name: "get_top_sources",
    description: "Get top alert-generating sources/agents with counts.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of top sources (default 10)" },
        since: { type: "string", description: "ISO8601 timestamp" },
      },
    },
  },
  {
    name: "get_metrics",
    description: "Get Prometheus-style system metrics (uptime, memory, request counts, latencies).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_wazuh_cluster_health",
    description: "Get Wazuh cluster health status (master, workers, connected nodes).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_opensearch_cluster_health",
    description: "Get OpenSearch cluster health (status, nodes, shards, disk usage).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_audit_log",
    description: "Query the audit log for user actions, logins, and system changes.",
    inputSchema: {
      type: "object",
      properties: {
        actor_id: { type: "string", description: "Filter by user UUID" },
        action: { type: "string", description: "Filter by action type (login, create_case, etc.)" },
        limit: { type: "number", description: "Max results (default 100)" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 13. SCHEDULER & AUTOMATION (8 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_schedules",
    description: "List all scheduled automation tasks (periodic scans, ingest jobs, report generation).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_schedule",
    description: "Create a new scheduled automation task with trigger and action.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Schedule name" },
        connector_id: { type: "string", description: "Target connector" },
        action_type: { type: "string", description: "Action to execute" },
        trigger: { type: "object", description: '{"type": "interval", "seconds": 3600}' },
      },
      required: ["name", "connector_id", "action_type", "trigger"],
    },
  },
  {
    name: "get_schedule",
    description: "Get details for a specific scheduled task.",
    inputSchema: {
      type: "object",
      properties: {
        schedule_id: { type: "string", description: "Schedule UUID" },
      },
      required: ["schedule_id"],
    },
  },
  {
    name: "update_schedule",
    description: "Update a scheduled task (enable/disable, change trigger, update action).",
    inputSchema: {
      type: "object",
      properties: {
        schedule_id: { type: "string", description: "Schedule UUID" },
        enabled: { type: "boolean", description: "Enable or disable" },
        trigger: { type: "object", description: "Updated trigger config" },
      },
      required: ["schedule_id"],
    },
  },
  {
    name: "delete_schedule",
    description: "Delete a scheduled task.",
    inputSchema: {
      type: "object",
      properties: {
        schedule_id: { type: "string", description: "Schedule UUID" },
      },
      required: ["schedule_id"],
    },
  },
  {
    name: "get_schedule_history",
    description: "Get execution history for a scheduled task.",
    inputSchema: {
      type: "object",
      properties: {
        schedule_id: { type: "string", description: "Schedule UUID" },
      },
      required: ["schedule_id"],
    },
  },
  {
    name: "list_shuffle_workflows",
    description: "List available Shuffle SOAR workflows.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "trigger_shuffle_workflow",
    description: "Trigger a Shuffle SOAR workflow with input data.",
    inputSchema: {
      type: "object",
      properties: {
        workflow_id: { type: "string", description: "Shuffle workflow ID" },
        data: { type: "object", description: "Input data for the workflow" },
      },
      required: ["workflow_id"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 14. NOTIFICATIONS (8 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "list_notification_channels",
    description: "List all configured notification channels (email, Slack, webhook, SMS).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_notification_channel",
    description: "Create a new notification channel.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Channel name" },
        channel_type: { type: "string", description: "Type: email, slack, webhook, sms" },
        config: { type: "object", description: "Channel-specific config (SMTP settings, webhook URL, etc.)" },
      },
      required: ["name", "channel_type", "config"],
    },
  },
  {
    name: "update_notification_channel",
    description: "Update a notification channel's config or enabled status.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel UUID" },
        enabled: { type: "boolean", description: "Enable/disable" },
        config: { type: "object", description: "Updated config" },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "delete_notification_channel",
    description: "Delete a notification channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel_id: { type: "string", description: "Channel UUID" },
      },
      required: ["channel_id"],
    },
  },
  {
    name: "list_notification_rules",
    description: "List notification rules (trigger conditions for alerts).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_notification_rule",
    description: "Create a notification rule (e.g. notify on critical alerts to Slack).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Rule name" },
        channel_id: { type: "string", description: "Target channel UUID" },
        conditions: { type: "object", description: "Trigger conditions (severity, source, rule groups)" },
      },
      required: ["name", "channel_id", "conditions"],
    },
  },
  {
    name: "send_notification",
    description: "Send an immediate notification via a configured channel.",
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
    name: "list_notification_logs",
    description: "List recent notification delivery logs (success, failure, timestamps).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results (default 50)" },
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════
  // 15. AI OPERATIONS (6 tools)
  // ═══════════════════════════════════════════════════════════════════
  {
    name: "ai_triage",
    description: "Execute autonomous AI triage: calculate risk score, identify MITRE techniques, and recommend response actions.",
    inputSchema: {
      type: "object",
      properties: {
        alert_id: { type: "string", description: "Alert UUID to triage" },
        case_id: { type: "string", description: "Case UUID to triage" },
        ioc: { type: "string", description: "Indicator of compromise to analyze" },
      },
    },
  },
  {
    name: "ai_chat",
    description: "Chat with the AI SOC analyst for collaborative investigation.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Your question or investigation request" },
        alert_id: { type: "string", description: "Optional alert context UUID" },
      },
      required: ["message"],
    },
  },
  {
    name: "batch_triage",
    description: "Triage multiple alerts at once with optional correlation analysis.",
    inputSchema: {
      type: "object",
      properties: {
        alert_ids: { type: "array", items: { type: "string" }, description: "List of alert UUIDs" },
        correlate: { type: "boolean", description: "Correlate alerts to find patterns" },
      },
      required: ["alert_ids"],
    },
  },
  {
    name: "correlate_alerts",
    description: "Correlate multiple alerts to identify attack patterns, kill chain stages, and shared IOCs.",
    inputSchema: {
      type: "object",
      properties: {
        alert_ids: { type: "array", items: { type: "string" }, description: "Alert UUIDs to correlate" },
      },
      required: ["alert_ids"],
    },
  },
  {
    name: "ai_posture_summary",
    description: "Get a high-level AI-generated security posture summary across the entire environment.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "generate_investigation_report",
    description: "Generate a structured investigation report for a case with timeline, findings, IOCs, and recommendations.",
    inputSchema: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "Case UUID" },
      },
      required: ["case_id"],
    },
  },
];
