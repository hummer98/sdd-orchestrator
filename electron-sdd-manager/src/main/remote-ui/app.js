/**
 * SDD Manager Mobile App
 * Main application logic
 * Requirements: 6.1-6.4, 7.1-7.6, 8.1-8.4
 * Task 3.3, 3.4 (internal-webserver-sync): Bug state management
 */

/**
 * Simple Hash-based Router
 * Routes:
 *   #/           - List view (specs/bugs)
 *   #/spec/:name - Spec detail view
 *   #/bug/:name  - Bug detail view
 */
class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  /**
   * Register a route
   * @param {string} pattern - Route pattern (e.g., '/spec/:name')
   * @param {Function} handler - Handler function
   */
  on(pattern, handler) {
    this.routes.push({ pattern, handler });
  }

  /**
   * Navigate to a route
   * @param {string} path - Path to navigate to
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Handle current route
   */
  handleRoute() {
    const hash = window.location.hash.slice(1) || '/';

    for (const route of this.routes) {
      const match = this.matchRoute(route.pattern, hash);
      if (match) {
        this.currentRoute = { pattern: route.pattern, params: match.params };
        route.handler(match.params);
        return;
      }
    }

    // Default to list view if no match
    this.navigate('/');
  }

  /**
   * Match a route pattern against a path
   * @param {string} pattern
   * @param {string} path
   * @returns {{ params: Object } | null}
   */
  matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return { params };
  }

  /**
   * Go back (navigate to list)
   */
  back() {
    this.navigate('/');
  }
}

/**
 * Main Application Class
 */
class App {
  constructor() {
    // State
    this.projectPath = null;
    this.specs = [];
    this.bugs = [];
    this.selectedSpec = null;
    this.selectedBug = null;
    this.agents = [];

    // Task 5.1: Auto-execution state (per spec)
    // Requirements: 6.1, 6.2
    this.autoExecutionStatuses = {};

    // Router
    this.router = new Router();

    // Components
    this.docsTabs = new DocsTabs();
    this.connectionStatus = new ConnectionStatus();
    this.specList = new SpecList();
    this.bugList = new BugList();
    this.bugDetail = new BugDetail();
    this.specDetail = new SpecDetail();
    this.logViewer = new LogViewer();
    this.toast = new Toast();
    this.reconnectOverlay = new ReconnectOverlay();

    // DOM references for views
    this.viewList = document.getElementById('view-list');
    this.specListSection = document.getElementById('spec-list-section');
    this.bugListSection = document.getElementById('bug-list-section');

    // DOM references
    this.projectPathEl = document.getElementById('project-path');
    this.appVersionEl = document.getElementById('app-version');

    // Initialize
    this.setupDarkMode();
    this.setupRouter();
    this.setupComponents();
    this.setupWebSocket();
  }

  /**
   * Setup router and routes
   */
  setupRouter() {
    // List view (default)
    this.router.on('/', () => {
      this.showView('list');
    });

    // Spec detail view
    this.router.on('/spec/:name', (params) => {
      const spec = this.specs.find(s => s.feature_name === params.name);
      if (spec) {
        this.selectedSpec = spec;
        this.specList.setSelected(spec.feature_name);
        this.specDetail.show(spec);
        this.showView('spec-detail');

        // Notify server of spec selection
        wsManager.send({
          type: 'SELECT_SPEC',
          payload: { specId: spec.feature_name },
        });
      } else {
        // Spec not found, go back to list
        this.router.back();
      }
    });

    // Bug detail view
    this.router.on('/bug/:name', (params) => {
      const bug = this.bugs.find(b => b.name === params.name);
      if (bug) {
        this.selectedBug = bug;
        this.bugList.setSelected(bug.name);
        this.bugDetail.show(bug);
        this.showView('bug-detail');
      } else {
        // Bug not found, go back to list
        this.router.back();
      }
    });

    // Handle initial route
    this.router.handleRoute();
  }

  /**
   * Show a specific view
   * @param {'list' | 'spec-detail' | 'bug-detail'} viewName
   */
  showView(viewName) {
    // Hide all views
    this.viewList.classList.add('hidden');
    this.specDetail.sectionEl.classList.add('hidden');
    this.bugDetail.sectionEl.classList.add('hidden');

    // Show requested view
    switch (viewName) {
      case 'list':
        this.viewList.classList.remove('hidden');
        // Clear selections when returning to list
        this.selectedSpec = null;
        this.selectedBug = null;
        this.specList.setSelected(null);
        this.bugList.setSelected(null);
        this.logViewer.clear();
        break;
      case 'spec-detail':
        this.specDetail.sectionEl.classList.remove('hidden');
        break;
      case 'bug-detail':
        this.bugDetail.sectionEl.classList.remove('hidden');
        break;
    }

    // Scroll to top when changing views
    window.scrollTo(0, 0);
  }

  /**
   * Setup dark mode based on system preference
   */
  setupDarkMode() {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Apply initial theme
    this.applyTheme(prefersDark.matches);

    // Listen for changes
    prefersDark.addEventListener('change', (e) => {
      this.applyTheme(e.matches);
    });
  }

  /**
   * Apply theme
   * @param {boolean} dark
   */
  applyTheme(dark) {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Setup component callbacks
   * Task 11.1: Integrate new components
   */
  setupComponents() {
    // Initialize and render DocsTabs
    this.docsTabs.render();

    // DocsTabs tab change handler (Task 5.1, 11.1)
    this.docsTabs.onTabChange = (tab) => {
      this.handleTabChange(tab);
    };

    // Bug list selection handler (Task 7.1) - now uses router
    this.bugList.onSelect = (bug) => {
      this.router.navigate(`/bug/${encodeURIComponent(bug.name)}`);
    };

    // Bug detail callbacks (Task 7.1)
    this.bugDetail.onExecutePhase = (bugName, phase) => {
      wsManager.executeBugPhase(bugName, phase);
      this.bugDetail.setRunning(true);
      this.toast.info(`Starting ${phase}...`);
    };

    // Back button uses router
    this.bugDetail.onBack = () => {
      this.router.back();
    };

    // Spec list selection handler - now uses router
    this.specList.onSelect = (spec) => {
      this.router.navigate(`/spec/${encodeURIComponent(spec.feature_name)}`);
    };

    // Spec detail callbacks
    this.specDetail.onExecutePhase = (specId, phase) => {
      this.executePhase(specId, phase);
    };

    this.specDetail.onAutoExecute = (specId) => {
      this.autoExecute(specId);
    };

    this.specDetail.onStop = (agentId) => {
      this.stopWorkflow(agentId);
    };

    this.specDetail.onResume = (agentId) => {
      this.resumeWorkflow(agentId);
    };

    // Back button uses router
    this.specDetail.onBack = () => {
      this.router.back();
    };

    this.specDetail.onSendInput = (agentId, text) => {
      this.sendAgentInput(agentId, text);
    };

    // Reconnect overlay callback
    this.reconnectOverlay.onManualReconnect = () => {
      wsManager.manualReconnect();
    };
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocket() {
    // Connection events
    wsManager.on('connected', () => {
      this.connectionStatus.update('connected');
      this.reconnectOverlay.hide();
      this.toast.success('Connected to server');
    });

    wsManager.on('disconnected', (data) => {
      this.connectionStatus.update('disconnected');
      if (!data?.manual) {
        this.toast.error('Connection lost');
      }
    });

    wsManager.on('reconnecting', (data) => {
      this.connectionStatus.update('reconnecting', data);
      this.reconnectOverlay.showReconnecting(data.attempt, data.maxAttempts);
    });

    wsManager.on('reconnectFailed', () => {
      this.connectionStatus.update('disconnected');
      this.reconnectOverlay.showManualReconnect();
      this.toast.error('Failed to reconnect');
    });

    // Server message handlers
    wsManager.on('INIT', (payload) => {
      this.handleInit(payload);
    });

    wsManager.on('SPECS_UPDATED', (payload) => {
      this.handleSpecsUpdated(payload);
    });

    wsManager.on('SPEC_CHANGED', (payload) => {
      this.handleSpecChanged(payload);
    });

    wsManager.on('AGENT_OUTPUT', (payload) => {
      this.handleAgentOutput(payload);
    });

    wsManager.on('AGENT_STATUS', (payload) => {
      this.handleAgentStatus(payload);
    });

    wsManager.on('AGENT_LIST', (payload) => {
      this.handleAgentList(payload);
    });

    wsManager.on('PHASE_STARTED', (payload) => {
      this.handlePhaseStarted(payload);
    });

    wsManager.on('PHASE_COMPLETED', (payload) => {
      this.handlePhaseCompleted(payload);
    });

    wsManager.on('ERROR', (payload) => {
      this.handleError(payload);
    });

    wsManager.on('RATE_LIMITED', (payload) => {
      this.handleRateLimited(payload);
    });

    wsManager.on('BUGS_UPDATED', (payload) => {
      this.handleBugsUpdated(payload);
    });

    // Task 4.1: New message type handlers (internal-webserver-sync)
    wsManager.on('BUG_PHASE_STARTED', (payload) => {
      this.handleBugPhaseStarted(payload);
    });

    wsManager.on('VALIDATION_STARTED', (payload) => {
      this.handleValidationStarted(payload);
    });

    wsManager.on('DOCUMENT_REVIEW_STARTED', (payload) => {
      this.handleDocumentReviewStarted(payload);
    });

    wsManager.on('TASK_PROGRESS', (payload) => {
      this.handleTaskProgress(payload);
    });

    wsManager.on('SPEC_UPDATED', (payload) => {
      this.handleSpecUpdated(payload);
    });

    // Bug fix: remote-ui-agent-log-display
    // Handle AGENT_LOGS message - load logs into LogViewer when agent is selected
    wsManager.on('AGENT_LOGS', (payload) => {
      this.handleAgentLogs(payload);
    });

    // Task 5.2: Auto-execution event handlers
    // Requirements: 6.4, 6.5, 6.6
    wsManager.on('AUTO_EXECUTION_STATUS', (payload) => {
      this.handleAutoExecutionStatusUpdate(payload);
    });

    wsManager.on('AUTO_EXECUTION_PHASE_COMPLETED', (payload) => {
      this.handleAutoExecutionPhaseCompleted(payload);
    });

    wsManager.on('AUTO_EXECUTION_ERROR', (payload) => {
      this.handleAutoExecutionError(payload);
    });

    // Connect
    this.connectionStatus.update('connecting');
    wsManager.connect();
  }

  /**
   * Handle INIT message
   * Task 3.3: Include bugs in INIT handling
   * @param {Object} payload
   */
  handleInit(payload) {
    const { project, specs, bugs, agents, version, logs } = payload || {};

    // Update project path
    if (project) {
      this.projectPath = project;
      this.projectPathEl.textContent = this.formatProjectPath(project);
    }

    // Update version
    if (version) {
      this.appVersionEl.textContent = `v${version}`;
    }

    // Update specs
    if (specs) {
      this.specs = specs;
      this.specList.update(specs);
    }

    // Update bugs (Task 3.3)
    if (bugs) {
      this.bugs = bugs;
      this.bugList.update(bugs);
    }

    // Update agents
    // Bug fix: remote-ui-agent-list-unfiltered - filter by current spec/bug
    // Bug fix: remote-ui-agent-list-feature-parity - also update SpecList for running count
    if (agents) {
      this.agents = agents;
      this.specDetail.updateAgentList(this.getFilteredAgents());
      this.specList.updateAgents(agents);
    }

    // Load initial logs
    if (logs && logs.length > 0) {
      this.logViewer.setLogs(logs);
    }

    // Re-evaluate current route now that data is loaded
    // This handles direct navigation to detail pages
    this.router.handleRoute();
  }

  /**
   * Handle SPECS_UPDATED message
   * @param {Object} payload
   */
  handleSpecsUpdated(payload) {
    const { specs } = payload || {};
    if (specs) {
      this.specs = specs;
      this.specList.update(specs);
    }
  }

  /**
   * Handle SPEC_CHANGED message
   * @param {Object} payload
   */
  handleSpecChanged(payload) {
    const { specId, spec } = payload || {};
    if (specId && spec) {
      // Update in specs array
      const index = this.specs.findIndex(s => s.feature_name === specId);
      if (index !== -1) {
        this.specs[index] = spec;
        this.specList.update(this.specs);
      }

      // Update detail panel if showing this spec
      if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
        this.selectedSpec = spec;
        this.specDetail.updateSpec(spec);
      }
    }
  }

  /**
   * Handle AGENT_OUTPUT message
   * @param {Object} payload
   */
  handleAgentOutput(payload) {
    if (payload) {
      this.logViewer.add(payload);
    }
  }

  /**
   * Handle AGENT_LOGS message
   * Bug fix: remote-ui-agent-log-display
   * Loads agent logs into LogViewer when agent is selected
   * @param {Object} payload - { specId, agentId, logs }
   */
  handleAgentLogs(payload) {
    const { specId, agentId, logs } = payload || {};

    if (!logs || !Array.isArray(logs)) {
      return;
    }

    // Convert log file entries to LogViewer format
    // LogFileEntry has: timestamp, stream, data
    // LogViewer expects: timestamp (number), stream, data, type
    const logEntries = logs.map(log => ({
      timestamp: new Date(log.timestamp).getTime(),
      stream: log.stream,
      data: log.data,
      type: log.stream === 'stderr' ? 'error' : 'agent',
    }));

    // Set logs in LogViewer (replaces existing logs)
    this.logViewer.setLogs(logEntries);

    console.log(`[App] Loaded ${logEntries.length} logs for agent ${agentId} (spec: ${specId})`);
  }

  /**
   * Handle AGENT_STATUS message
   * Now includes full agent info to match Electron version display
   * @param {Object} payload
   */
  handleAgentStatus(payload) {
    const { agentId, status, phase, specId, startedAt, lastActivityAt } = payload || {};

    // Update agent in list with full info (matching Electron version's AgentInfo)
    const existingAgent = this.agents.find(a => a.id === agentId);
    if (existingAgent) {
      existingAgent.status = status;
      if (phase) existingAgent.phase = phase;
      if (specId) existingAgent.specId = specId;
      if (startedAt) existingAgent.startedAt = startedAt;
      if (lastActivityAt) existingAgent.lastActivityAt = lastActivityAt;
    } else {
      this.agents.push({
        id: agentId,
        status,
        phase: phase || 'Unknown',
        specId: specId || '',
        startedAt: startedAt || new Date().toISOString(),
        lastActivityAt: lastActivityAt || new Date().toISOString(),
      });
    }
    // Bug fix: remote-ui-agent-list-unfiltered - filter by current spec/bug
    this.specDetail.updateAgentList(this.getFilteredAgents());

    // Update running state
    switch (status) {
      case 'running':
        this.specDetail.setRunning(true, agentId, phase ? `Running ${phase}...` : 'Running...');
        break;
      case 'stopped':
        this.specDetail.setStopped(agentId);
        break;
      case 'completed':
      case 'error':
        this.specDetail.setRunning(false);
        break;
    }
  }

  /**
   * Handle AGENT_LIST message
   * Bug fix: remote-ui-agent-list-unfiltered - filter by current spec/bug
   * Bug fix: remote-ui-agent-list-feature-parity - also update SpecList for running count
   * @param {Object} payload
   */
  handleAgentList(payload) {
    const { agents } = payload || {};
    this.agents = agents || [];
    this.specDetail.updateAgentList(this.getFilteredAgents());
    this.specList.updateAgents(this.agents);
  }

  /**
   * Handle PHASE_STARTED message
   * @param {Object} payload
   */
  handlePhaseStarted(payload) {
    const { specId, phase, agentId } = payload || {};
    this.toast.info(`Starting ${phase}...`);
    this.specDetail.setRunning(true, agentId);
  }

  /**
   * Handle PHASE_COMPLETED message
   * @param {Object} payload
   */
  handlePhaseCompleted(payload) {
    const { specId, phase, result } = payload || {};
    this.specDetail.setRunning(false);

    if (result?.success) {
      this.toast.success(`${phase} completed successfully`);
    } else {
      this.toast.error(`${phase} failed: ${result?.error || 'Unknown error'}`);
    }
  }

  /**
   * Handle ERROR message
   * @param {Object} payload
   */
  handleError(payload) {
    const { code, message } = payload || {};
    this.toast.error(message || `Error: ${code}`);
  }

  /**
   * Handle RATE_LIMITED message
   * @param {Object} payload
   */
  handleRateLimited(payload) {
    const { retryAfter } = payload || {};
    this.toast.error(`Rate limited. Try again in ${retryAfter || 60} seconds.`);
  }

  /**
   * Handle BUGS_UPDATED message
   * Task 3.4: BUGS_UPDATED message handler
   * @param {Object} payload
   */
  handleBugsUpdated(payload) {
    const { bugs } = payload || {};
    if (bugs) {
      this.bugs = bugs;
      this.bugList.update(bugs);

      // Update BugDetail if showing a bug
      if (this.selectedBug) {
        const updatedBug = bugs.find(b => b.name === this.selectedBug.name);
        if (updatedBug) {
          this.bugDetail.updateBug(updatedBug);
          this.bugDetail.setRunning(false);
        }
      }
    }
  }

  // ============================================================
  // Task 4.1: New Message Handlers (internal-webserver-sync)
  // ============================================================

  /**
   * Handle BUG_PHASE_STARTED message
   * Task 4.1: Handle bug phase execution started
   * @param {Object} payload
   */
  handleBugPhaseStarted(payload) {
    const { bugName, phase, agentId } = payload || {};
    this.toast.info(`Bug ${phase} started for ${bugName}`);

    // Update BugDetail if showing this bug
    if (this.selectedBug && this.selectedBug.name === bugName) {
      this.bugDetail.setRunning(true, agentId);
    }
  }

  /**
   * Handle VALIDATION_STARTED message
   * Task 4.1: Handle validation execution started
   * @param {Object} payload
   */
  handleValidationStarted(payload) {
    const { specId, type, agentId } = payload || {};
    this.toast.info(`${type} validation started for ${specId}`);

    // Update SpecDetail if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.specDetail.setRunning(true, agentId, `Running ${type} validation...`);
    }
  }

  /**
   * Handle DOCUMENT_REVIEW_STARTED message
   * Task 4.1: Handle document review execution started
   * @param {Object} payload
   */
  handleDocumentReviewStarted(payload) {
    const { specId, agentId } = payload || {};
    this.toast.info(`Document review started for ${specId}`);

    // Update SpecDetail if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.specDetail.setRunning(true, agentId, 'Running document review...');
    }
  }

  /**
   * Handle TASK_PROGRESS message
   * Task 4.1: Handle task progress update
   * @param {Object} payload
   */
  handleTaskProgress(payload) {
    const { specId, taskId, status } = payload || {};

    // Update SpecDetail if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.specDetail.updateTaskProgress(taskId, status);
    }

    // Show toast for important status changes
    if (status === 'completed') {
      this.toast.success(`Task ${taskId} completed`);
    } else if (status === 'error') {
      this.toast.error(`Task ${taskId} failed`);
    }
  }

  /**
   * Handle SPEC_UPDATED message
   * Task 4.1: Handle spec update notification
   * @param {Object} payload
   */
  handleSpecUpdated(payload) {
    const { specId, ...updates } = payload || {};

    // Update in specs array
    const index = this.specs.findIndex(s => s.feature_name === specId);
    if (index !== -1) {
      this.specs[index] = { ...this.specs[index], ...updates };
      this.specList.update(this.specs);
    }

    // Update detail panel if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.selectedSpec = { ...this.selectedSpec, ...updates };
      this.specDetail.updateSpec(this.selectedSpec);
    }
  }

  /**
   * Handle tab change between Specs and Bugs
   * Task 5.1, 11.1: Tab switching logic
   * @param {'specs'|'bugs'} tab
   */
  handleTabChange(tab) {
    if (tab === 'specs') {
      this.specListSection.classList.remove('hidden');
      this.bugListSection.classList.add('hidden');
    } else {
      this.specListSection.classList.add('hidden');
      this.bugListSection.classList.remove('hidden');
    }
  }

  /**
   * Execute workflow phase
   * @param {string} specId
   * @param {string} phase
   */
  executePhase(specId, phase) {
    wsManager.send({
      type: 'EXECUTE_PHASE',
      payload: { specId, phase },
    });
  }

  /**
   * Stop workflow
   * @param {string} agentId
   */
  stopWorkflow(agentId) {
    wsManager.send({
      type: 'STOP_WORKFLOW',
      payload: { agentId },
    });
    this.toast.info('Stopping workflow...');
  }

  /**
   * Resume workflow
   * @param {string} agentId
   */
  resumeWorkflow(agentId) {
    wsManager.send({
      type: 'RESUME_WORKFLOW',
      payload: { agentId },
    });
    this.toast.info('Resuming workflow...');
  }

  /**
   * Auto execute all phases
   * @param {string} specId
   */
  autoExecute(specId) {
    wsManager.send({
      type: 'AUTO_EXECUTE',
      payload: { specId },
    });
    this.toast.info('Starting auto execution...');
  }

  /**
   * Send input to agent
   * @param {string} agentId
   * @param {string} text
   */
  sendAgentInput(agentId, text) {
    wsManager.send({
      type: 'AGENT_INPUT',
      payload: { agentId, text },
    });
  }

  /**
   * Format project path for display
   * @param {string} path
   * @returns {string}
   */
  formatProjectPath(path) {
    if (!path) return 'No project';

    // Show only the last 2 parts of the path
    const parts = path.split(/[/\\]/);
    if (parts.length > 2) {
      return '.../' + parts.slice(-2).join('/');
    }
    return path;
  }

  /**
   * Get the current spec ID based on selected spec or bug
   * Bug fix: remote-ui-agent-list-unfiltered
   * @returns {string|null} The current spec ID or null if none selected
   */
  getCurrentSpecId() {
    if (this.selectedSpec) {
      return this.selectedSpec.feature_name;
    }
    if (this.selectedBug) {
      return `bug:${this.selectedBug.name}`;
    }
    return null;
  }

  /**
   * Filter agents by the current spec/bug selection
   * Bug fix: remote-ui-agent-list-unfiltered
   * @returns {Array} Filtered agents for the current spec/bug
   */
  getFilteredAgents() {
    const currentSpecId = this.getCurrentSpecId();
    if (!currentSpecId) {
      return [];
    }
    return this.agents.filter(agent => agent.specId === currentSpecId);
  }

  // ============================================================
  // Task 5.1: Auto-Execution Store Methods
  // Requirements: 6.1, 6.2
  // ============================================================

  /**
   * Start auto-execution for the current spec
   * @param {string} specId
   * @param {Object} options - Auto-execution options
   */
  startAutoExecution(specId, options = {}) {
    wsManager.startAutoExecution(specId, options);
    this.toast.info('Starting auto execution...');
  }

  /**
   * Stop auto-execution for the current spec
   * @param {string} specId
   */
  stopAutoExecution(specId) {
    wsManager.stopAutoExecution(specId);
    this.toast.info('Stopping auto execution...');
  }

  // ============================================================
  // Task 5.2: Auto-Execution Event Handlers
  // Requirements: 6.4, 6.5, 6.6
  // ============================================================

  /**
   * Handle AUTO_EXECUTION_STATUS message
   * @param {Object} payload - { specId, status, currentPhase, executedPhases }
   */
  handleAutoExecutionStatusUpdate(payload) {
    const { specId, status, currentPhase, executedPhases } = payload || {};

    if (!specId) return;

    // Update auto-execution status for this spec
    this.autoExecutionStatuses[specId] = {
      status: status || 'idle',
      currentPhase: currentPhase || null,
      executedPhases: executedPhases || [],
    };

    // Update SpecDetail if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.specDetail.updateAutoExecutionStatus(this.autoExecutionStatuses[specId]);
    }
  }

  /**
   * Handle AUTO_EXECUTION_PHASE_COMPLETED message
   * @param {Object} payload - { specId, phase, result }
   */
  handleAutoExecutionPhaseCompleted(payload) {
    const { specId, phase, result } = payload || {};

    if (!specId || !phase) return;

    // Update status
    const currentStatus = this.autoExecutionStatuses[specId] || {};
    if (!currentStatus.executedPhases) {
      currentStatus.executedPhases = [];
    }
    if (!currentStatus.executedPhases.includes(phase)) {
      currentStatus.executedPhases.push(phase);
    }
    this.autoExecutionStatuses[specId] = currentStatus;

    // Show toast
    if (result?.success) {
      this.toast.success(`Phase ${phase} completed`);
    }

    // Update SpecDetail if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.specDetail.updateAutoExecutionStatus(this.autoExecutionStatuses[specId]);
    }
  }

  /**
   * Handle AUTO_EXECUTION_ERROR message
   * @param {Object} payload - { specId, error, phase }
   */
  handleAutoExecutionError(payload) {
    const { specId, error, phase } = payload || {};

    if (!specId) return;

    // Update status to error
    this.autoExecutionStatuses[specId] = {
      ...this.autoExecutionStatuses[specId],
      status: 'error',
      currentPhase: null,
      error: error || 'Unknown error',
      lastFailedPhase: phase,
    };

    // Show toast
    this.toast.error(`Auto-execution error: ${error || 'Unknown error'}`);

    // Update SpecDetail if showing this spec
    if (this.selectedSpec && this.selectedSpec.feature_name === specId) {
      this.specDetail.updateAutoExecutionStatus(this.autoExecutionStatuses[specId]);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
