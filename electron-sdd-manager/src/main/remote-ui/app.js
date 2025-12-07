/**
 * SDD Manager Mobile App
 * Main application logic
 * Requirements: 6.1-6.4, 7.1-7.6, 8.1-8.4
 */

/**
 * Main Application Class
 */
class App {
  constructor() {
    // State
    this.projectPath = null;
    this.specs = [];
    this.selectedSpec = null;
    this.agents = [];

    // Components
    this.connectionStatus = new ConnectionStatus();
    this.specList = new SpecList();
    this.specDetail = new SpecDetail();
    this.logViewer = new LogViewer();
    this.toast = new Toast();
    this.reconnectOverlay = new ReconnectOverlay();

    // DOM references
    this.projectPathEl = document.getElementById('project-path');

    // Initialize
    this.setupDarkMode();
    this.setupComponents();
    this.setupWebSocket();
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
   */
  setupComponents() {
    // Spec list selection handler
    this.specList.onSelect = (spec) => {
      this.selectedSpec = spec;
      this.specList.setSelected(spec.feature_name);
      this.specDetail.show(spec);

      // Notify server of spec selection
      wsManager.send({
        type: 'SELECT_SPEC',
        payload: { specId: spec.feature_name },
      });
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

    this.specDetail.onBack = () => {
      this.selectedSpec = null;
      this.specList.setSelected(null);
      this.logViewer.clear();
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

    // Connect
    this.connectionStatus.update('connecting');
    wsManager.connect();
  }

  /**
   * Handle INIT message
   * @param {Object} payload
   */
  handleInit(payload) {
    const { project, specs, logs } = payload || {};

    // Update project path
    if (project) {
      this.projectPath = project;
      this.projectPathEl.textContent = this.formatProjectPath(project);
    }

    // Update specs
    if (specs) {
      this.specs = specs;
      this.specList.update(specs);
    }

    // Load initial logs
    if (logs && logs.length > 0) {
      this.logViewer.setLogs(logs);
    }
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
   * Handle AGENT_STATUS message
   * @param {Object} payload
   */
  handleAgentStatus(payload) {
    const { agentId, status, phase } = payload || {};

    // Update agent in list
    const existingAgent = this.agents.find(a => a.id === agentId);
    if (existingAgent) {
      existingAgent.status = status;
      if (phase) existingAgent.phase = phase;
    } else {
      this.agents.push({ id: agentId, status, phase: phase || 'Unknown' });
    }
    this.specDetail.updateAgentList(this.agents);

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
   * @param {Object} payload
   */
  handleAgentList(payload) {
    const { agents } = payload || {};
    this.agents = agents || [];
    this.specDetail.updateAgentList(this.agents);
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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
