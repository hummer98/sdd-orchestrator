/**
 * UI Components for SDD Manager Mobile
 * Requirements: 6.1, 6.2, 6.3, 6.4, 7.6, 4.3, 4.4, 4.5
 */

/**
 * Connection Status Component
 * Displays and manages connection status indicator
 */
class ConnectionStatus {
  constructor() {
    this.dotEl = document.getElementById('status-dot');
    this.textEl = document.getElementById('status-text');
  }

  /**
   * Update connection status display
   * @param {'connected'|'disconnected'|'connecting'|'reconnecting'} status
   * @param {Object} [data]
   */
  update(status, data = {}) {
    this.dotEl.className = 'w-3 h-3 rounded-full';

    switch (status) {
      case 'connected':
        this.dotEl.classList.add('status-connected');
        this.textEl.textContent = 'Connected';
        break;
      case 'disconnected':
        this.dotEl.classList.add('status-disconnected');
        this.textEl.textContent = 'Disconnected';
        break;
      case 'connecting':
        this.dotEl.classList.add('status-connecting');
        this.textEl.textContent = 'Connecting...';
        break;
      case 'reconnecting':
        this.dotEl.classList.add('status-connecting');
        if (data.attempt) {
          this.textEl.textContent = `Reconnecting (${data.attempt}/${data.maxAttempts})...`;
        } else {
          this.textEl.textContent = 'Reconnecting...';
        }
        break;
    }
  }
}

/**
 * Spec List Component
 * Displays list of specifications with selection support
 * Requirements: 6.1, 6.3, 6.4
 */
class SpecList {
  constructor() {
    this.containerEl = document.getElementById('spec-list');
    this.specs = [];
    this.selectedSpecId = null;
    this.onSelect = null;
  }

  /**
   * Update specs list
   * @param {Array} specs
   */
  update(specs) {
    this.specs = specs || [];
    this.render();
  }

  /**
   * Set selected spec
   * @param {string} specId
   */
  setSelected(specId) {
    this.selectedSpecId = specId;
    this.render();
  }

  /**
   * Render specs list
   */
  render() {
    if (this.specs.length === 0) {
      this.containerEl.innerHTML = `
        <div class="empty-state">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p>No specifications found</p>
        </div>
      `;
      return;
    }

    this.containerEl.innerHTML = this.specs.map(spec => this.renderSpecCard(spec)).join('');

    // Add click handlers
    this.containerEl.querySelectorAll('.spec-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        const spec = this.specs[index];
        if (this.onSelect) {
          this.onSelect(spec);
        }
      });
    });
  }

  /**
   * Render single spec card
   * @param {Object} spec
   * @returns {string}
   */
  renderSpecCard(spec) {
    const isSelected = spec.feature_name === this.selectedSpecId;
    const selectedClass = isSelected ? 'spec-card-selected' : '';

    // Determine current phase and status
    const phaseInfo = this.getPhaseInfo(spec);

    return `
      <div class="spec-card ${selectedClass}" data-spec-id="${spec.feature_name}">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="font-medium truncate">${spec.feature_name}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${spec.phase || 'ready'}</p>
          </div>
          <div class="flex-shrink-0 ml-3">
            ${this.renderPhaseBadge(phaseInfo.phase, phaseInfo.status)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get phase information from spec for list display
   * Uses approvals object if available for accurate status
   * @param {Object} spec
   * @returns {{ phase: string, status: string }}
   */
  getPhaseInfo(spec) {
    // If approvals available, find the most advanced phase
    if (spec.approvals) {
      const approvals = spec.approvals;

      // Check from most advanced to least advanced
      if (approvals.tasks?.approved) {
        return { phase: 'tasks', status: 'approved' };
      }
      if (approvals.tasks?.generated) {
        return { phase: 'tasks', status: 'generated' };
      }
      if (approvals.design?.approved) {
        return { phase: 'design', status: 'approved' };
      }
      if (approvals.design?.generated) {
        return { phase: 'design', status: 'generated' };
      }
      if (approvals.requirements?.approved) {
        return { phase: 'requirements', status: 'approved' };
      }
      if (approvals.requirements?.generated) {
        return { phase: 'requirements', status: 'generated' };
      }
      return { phase: 'ready', status: 'pending' };
    }

    // Fallback: use phase string
    const phase = spec.phase || 'ready';
    const phaseMap = {
      'ready': { phase: 'ready', status: 'pending' },
      'requirements-generated': { phase: 'requirements', status: 'generated' },
      'requirements-approved': { phase: 'requirements', status: 'approved' },
      'design-generated': { phase: 'design', status: 'generated' },
      'design-approved': { phase: 'design', status: 'approved' },
      'tasks-generated': { phase: 'tasks', status: 'generated' },
      'tasks-approved': { phase: 'tasks', status: 'approved' },
      'implementation': { phase: 'implementation', status: 'generated' },
      'implementation-complete': { phase: 'implementation', status: 'approved' },
    };

    return phaseMap[phase] || { phase: 'ready', status: 'pending' };
  }

  /**
   * Render phase badge
   * @param {string} phase
   * @param {string} status
   * @returns {string}
   */
  renderPhaseBadge(phase, status) {
    const statusClass = `phase-badge-${status}`;
    const labels = {
      requirements: 'Req',
      design: 'Design',
      tasks: 'Tasks',
      implementation: 'Impl',
      ready: 'Ready',
    };

    return `<span class="phase-badge ${statusClass}">${labels[phase] || phase}</span>`;
  }
}

/**
 * Spec Detail Component
 * Shows detailed spec info and workflow controls
 * Requirements: 6.2, 5.1-5.8
 */
class SpecDetail {
  constructor() {
    this.sectionEl = document.getElementById('spec-detail-section');
    this.titleEl = document.getElementById('spec-detail-title');
    this.phaseTagEl = document.getElementById('current-phase-tag');
    this.nextActionBtn = document.getElementById('btn-next-action');
    this.autoExecuteBtn = document.getElementById('btn-auto-execute');
    this.agentControlsEl = document.getElementById('agent-controls');
    this.runningIndicatorEl = document.getElementById('running-indicator');
    this.runningPhaseTextEl = document.getElementById('running-phase-text');
    this.backButton = document.getElementById('back-button');
    this.agentListEl = document.getElementById('agent-list');
    this.agentCountEl = document.getElementById('agent-count');
    this.agentInputEl = document.getElementById('agent-input');
    this.sendInputBtn = document.getElementById('btn-send-input');

    this.currentSpec = null;
    this.currentAgentId = null;
    this.isRunning = false;
    this.agents = [];

    this.onExecutePhase = null;
    this.onAutoExecute = null;
    this.onStop = null;
    this.onResume = null;
    this.onBack = null;
    this.onSendInput = null;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for buttons
   */
  setupEventListeners() {
    // Back button
    this.backButton.addEventListener('click', () => {
      if (this.onBack) {
        this.onBack();
      }
      this.hide();
    });

    // Next action button
    this.nextActionBtn.addEventListener('click', () => {
      if (this.onExecutePhase && this.currentSpec) {
        const nextPhase = this.getNextPhase(this.currentSpec);
        if (nextPhase) {
          this.onExecutePhase(this.currentSpec.feature_name, nextPhase);
        }
      }
    });

    // Auto execute button
    this.autoExecuteBtn.addEventListener('click', () => {
      if (this.onAutoExecute && this.currentSpec) {
        this.onAutoExecute(this.currentSpec.feature_name);
      }
    });

    // Stop button
    document.getElementById('btn-stop').addEventListener('click', () => {
      if (this.onStop && this.currentAgentId) {
        this.onStop(this.currentAgentId);
      }
    });

    // Resume button
    document.getElementById('btn-resume').addEventListener('click', () => {
      if (this.onResume && this.currentAgentId) {
        this.onResume(this.currentAgentId);
      }
    });

    // Send input button
    this.sendInputBtn.addEventListener('click', () => {
      this.sendInput();
    });

    // Enter key in input
    this.agentInputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendInput();
      }
    });
  }

  /**
   * Send input to agent
   */
  sendInput() {
    const text = this.agentInputEl.value.trim();
    if (text && this.onSendInput && this.currentAgentId) {
      this.onSendInput(this.currentAgentId, text);
      this.agentInputEl.value = '';
    }
  }

  /**
   * Show spec detail panel
   * @param {Object} spec
   */
  show(spec) {
    this.currentSpec = spec;
    this.titleEl.textContent = spec.feature_name;
    this.updatePhaseTag(spec);
    this.updateNextActionButton(spec);
    this.sectionEl.classList.remove('hidden');
  }

  /**
   * Hide spec detail panel
   */
  hide() {
    this.sectionEl.classList.add('hidden');
    this.currentSpec = null;
  }

  /**
   * Check if panel is visible
   * @returns {boolean}
   */
  isVisible() {
    return !this.sectionEl.classList.contains('hidden');
  }

  /**
   * Update current phase tag display
   * @param {Object} spec
   */
  updatePhaseTag(spec) {
    const phaseInfo = this.getCurrentPhaseInfo(spec);
    const tagColors = {
      'ready': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      'requirements-pending': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      'requirements-done': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      'design-pending': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      'design-done': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      'tasks-pending': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      'tasks-done': 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      'implementation': 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
      'complete': 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    };

    this.phaseTagEl.className = `px-3 py-1 text-sm font-medium rounded-full ${tagColors[phaseInfo.colorKey] || tagColors['ready']}`;
    this.phaseTagEl.textContent = phaseInfo.label;
  }

  /**
   * Get current phase info for display
   * @param {Object} spec
   * @returns {{ label: string, colorKey: string }}
   */
  getCurrentPhaseInfo(spec) {
    const phaseStatus = this.getPhaseStatusFromSpec(spec);
    const phase = spec.phase || 'ready';

    // Check for implementation complete
    if (phase === 'implementation-complete') {
      return { label: '✓ Complete', colorKey: 'complete' };
    }
    if (phase === 'implementation') {
      return { label: '🔧 Implementing', colorKey: 'implementation' };
    }

    // Check based on approvals
    if (phaseStatus.tasks === 'approved') {
      return { label: '✓ Tasks Approved', colorKey: 'tasks-done' };
    }
    if (phaseStatus.tasks === 'generated') {
      return { label: '⏳ Tasks Pending', colorKey: 'tasks-pending' };
    }
    if (phaseStatus.design === 'approved') {
      return { label: '✓ Design Approved', colorKey: 'design-done' };
    }
    if (phaseStatus.design === 'generated') {
      return { label: '⏳ Design Pending', colorKey: 'design-pending' };
    }
    if (phaseStatus.requirements === 'approved') {
      return { label: '✓ Req Approved', colorKey: 'requirements-done' };
    }
    if (phaseStatus.requirements === 'generated') {
      return { label: '⏳ Req Pending', colorKey: 'requirements-pending' };
    }

    return { label: 'Ready', colorKey: 'ready' };
  }

  /**
   * Get next phase to execute
   * @param {Object} spec
   * @returns {string|null}
   */
  getNextPhase(spec) {
    const phaseStatus = this.getPhaseStatusFromSpec(spec);
    const phase = spec.phase || 'ready';

    if (phase === 'implementation-complete') {
      return null; // All done
    }

    if (phaseStatus.tasks === 'approved') {
      return 'implementation';
    }
    if (phaseStatus.design === 'approved') {
      return 'tasks';
    }
    if (phaseStatus.requirements === 'approved') {
      return 'design';
    }
    return 'requirements';
  }

  /**
   * Update next action button
   * @param {Object} spec
   */
  updateNextActionButton(spec) {
    const nextPhase = this.getNextPhase(spec);
    const phaseLabels = {
      'requirements': '📝 Generate Requirements',
      'design': '🎨 Generate Design',
      'tasks': '📋 Generate Tasks',
      'implementation': '🚀 Run Implementation',
    };

    if (!nextPhase || this.isRunning) {
      this.nextActionBtn.disabled = true;
      this.nextActionBtn.textContent = nextPhase ? phaseLabels[nextPhase] : '✓ All Complete';
    } else {
      this.nextActionBtn.disabled = false;
      this.nextActionBtn.textContent = phaseLabels[nextPhase];
    }

    // Auto execute button
    this.autoExecuteBtn.disabled = !nextPhase || this.isRunning;
  }

  /**
   * Update agent list
   * @param {Array} agents
   */
  updateAgentList(agents) {
    this.agents = agents || [];
    this.agentCountEl.textContent = `${this.agents.length} agent${this.agents.length !== 1 ? 's' : ''}`;

    if (this.agents.length === 0) {
      this.agentListEl.innerHTML = '<div class="p-4 text-center text-sm text-gray-400">No agents</div>';
      return;
    }

    this.agentListEl.innerHTML = this.agents.map(agent => {
      const statusColors = {
        'running': 'bg-green-500',
        'completed': 'bg-blue-500',
        'failed': 'bg-red-500',
        'stopped': 'bg-yellow-500',
      };
      const statusColor = statusColors[agent.status] || 'bg-gray-400';

      return `
        <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" data-agent-id="${agent.id}">
          <span class="w-2 h-2 rounded-full ${statusColor}"></span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${agent.phase || 'Unknown'}</div>
            <div class="text-xs text-gray-400 truncate">${agent.id}</div>
          </div>
          <span class="text-xs text-gray-400">${agent.status}</span>
        </div>
      `;
    }).join('');

    // Add click handlers to select agent
    this.agentListEl.querySelectorAll('[data-agent-id]').forEach(el => {
      el.addEventListener('click', () => {
        const agentId = el.dataset.agentId;
        this.selectAgent(agentId);
      });
    });
  }

  /**
   * Select an agent
   * @param {string} agentId
   */
  selectAgent(agentId) {
    this.currentAgentId = agentId;
    const agent = this.agents.find(a => a.id === agentId);

    // Enable input if agent is running
    const canSendInput = agent && agent.status === 'running';
    this.agentInputEl.disabled = !canSendInput;
    this.sendInputBtn.disabled = !canSendInput;

    // Highlight selected agent
    this.agentListEl.querySelectorAll('[data-agent-id]').forEach(el => {
      if (el.dataset.agentId === agentId) {
        el.classList.add('bg-primary-50', 'dark:bg-primary-900/20');
      } else {
        el.classList.remove('bg-primary-50', 'dark:bg-primary-900/20');
      }
    });
  }

  /**
   * Get phase status for each phase from spec
   * Uses approvals object if available, falls back to phase string
   * @param {Object} spec
   * @returns {Object} Status for each phase
   */
  getPhaseStatusFromSpec(spec) {
    const result = {
      requirements: 'pending',
      design: 'pending',
      tasks: 'pending',
    };

    // If approvals object is available, use it (more accurate)
    if (spec.approvals) {
      const approvals = spec.approvals;
      if (approvals.requirements) {
        result.requirements = approvals.requirements.approved ? 'approved' :
                              approvals.requirements.generated ? 'generated' : 'pending';
      }
      if (approvals.design) {
        result.design = approvals.design.approved ? 'approved' :
                        approvals.design.generated ? 'generated' : 'pending';
      }
      if (approvals.tasks) {
        result.tasks = approvals.tasks.approved ? 'approved' :
                       approvals.tasks.generated ? 'generated' : 'pending';
      }
      return result;
    }

    // Fallback: derive from phase string
    const phaseString = spec.phase || 'ready';
    switch (phaseString) {
      case 'implementation-complete':
      case 'implementation':
      case 'tasks-approved':
        result.requirements = 'approved';
        result.design = 'approved';
        result.tasks = 'approved';
        break;
      case 'tasks-generated':
        result.requirements = 'approved';
        result.design = 'approved';
        result.tasks = 'generated';
        break;
      case 'design-approved':
        result.requirements = 'approved';
        result.design = 'approved';
        break;
      case 'design-generated':
        result.requirements = 'approved';
        result.design = 'generated';
        break;
      case 'requirements-approved':
        result.requirements = 'approved';
        break;
      case 'requirements-generated':
        result.requirements = 'generated';
        break;
    }

    return result;
  }

  /**
   * Update workflow button states
   * @param {Object} spec
   */
  updateWorkflowButtons(spec) {
    // Derive phase status from spec (uses approvals if available)
    const phaseStatus = this.getPhaseStatusFromSpec(spec);

    // Requirements: enabled only if not yet generated/approved
    const reqCompleted = phaseStatus.requirements !== 'pending';
    document.getElementById('btn-requirements').disabled = reqCompleted || this.isRunning;

    // Design: enabled only if requirements approved AND design not yet done
    const reqApproved = phaseStatus.requirements === 'approved';
    const designCompleted = phaseStatus.design !== 'pending';
    document.getElementById('btn-design').disabled = !reqApproved || designCompleted || this.isRunning;

    // Tasks: enabled only if design approved AND tasks not yet done
    const designApproved = phaseStatus.design === 'approved';
    const tasksCompleted = phaseStatus.tasks !== 'pending';
    document.getElementById('btn-tasks').disabled = !designApproved || tasksCompleted || this.isRunning;

    // Implementation: enabled only if tasks approved (can always re-run impl)
    const tasksApproved = phaseStatus.tasks === 'approved';
    document.getElementById('btn-implementation').disabled = !tasksApproved || this.isRunning;
  }

  /**
   * Set running state
   * @param {boolean} running
   * @param {string} [agentId]
   * @param {string} [phaseText]
   */
  setRunning(running, agentId = null, phaseText = 'Running...') {
    this.isRunning = running;
    this.currentAgentId = agentId;

    if (running) {
      this.runningIndicatorEl.classList.remove('hidden');
      this.runningPhaseTextEl.textContent = phaseText;
      this.agentControlsEl.classList.remove('hidden');
      document.getElementById('btn-stop').classList.remove('hidden');
      document.getElementById('btn-resume').classList.add('hidden');

      // Enable input for running agent
      this.agentInputEl.disabled = false;
      this.sendInputBtn.disabled = false;
    } else {
      this.runningIndicatorEl.classList.add('hidden');
      this.agentControlsEl.classList.add('hidden');

      // Disable input when not running
      this.agentInputEl.disabled = true;
      this.sendInputBtn.disabled = true;
    }

    // Update button states
    if (this.currentSpec) {
      this.updateNextActionButton(this.currentSpec);
    }
  }

  /**
   * Set stopped state (can resume)
   * @param {string} agentId
   */
  setStopped(agentId) {
    this.isRunning = false;
    this.currentAgentId = agentId;
    this.runningIndicatorEl.classList.add('hidden');
    this.agentControlsEl.classList.remove('hidden');
    document.getElementById('btn-stop').classList.add('hidden');
    document.getElementById('btn-resume').classList.remove('hidden');

    // Disable input when stopped
    this.agentInputEl.disabled = true;
    this.sendInputBtn.disabled = true;

    if (this.currentSpec) {
      this.updateNextActionButton(this.currentSpec);
    }
  }

  /**
   * Update spec data
   * @param {Object} spec
   */
  updateSpec(spec) {
    if (this.currentSpec && this.currentSpec.feature_name === spec.feature_name) {
      this.currentSpec = spec;
      this.updatePhaseTag(spec);
      this.updateNextActionButton(spec);
    }
  }
}

/**
 * Log Viewer Component
 * Displays real-time agent logs
 * Requirements: 4.3, 4.4, 4.5
 */
class LogViewer {
  constructor() {
    this.containerEl = document.getElementById('log-container');
    this.contentEl = document.getElementById('log-content');
    this.autoScrollBtn = document.getElementById('btn-auto-scroll');
    this.clearBtn = document.getElementById('btn-clear-logs');

    this.logs = [];
    this.autoScroll = true;
    this.maxLogs = 500;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle auto-scroll
    this.autoScrollBtn.addEventListener('click', () => {
      this.autoScroll = !this.autoScroll;
      this.updateAutoScrollButton();
    });

    // Clear logs
    this.clearBtn.addEventListener('click', () => {
      this.clear();
    });

    // Pause auto-scroll on manual scroll
    this.containerEl.addEventListener('scroll', () => {
      if (this.isScrolledUp()) {
        this.autoScroll = false;
        this.updateAutoScrollButton();
      }
    });

    // Resume auto-scroll when scrolled to bottom
    this.containerEl.addEventListener('scroll', () => {
      if (this.isAtBottom()) {
        this.autoScroll = true;
        this.updateAutoScrollButton();
      }
    });
  }

  /**
   * Check if container is scrolled up
   * @returns {boolean}
   */
  isScrolledUp() {
    const threshold = 50;
    return (this.containerEl.scrollHeight - this.containerEl.scrollTop - this.containerEl.clientHeight) > threshold;
  }

  /**
   * Check if container is at bottom
   * @returns {boolean}
   */
  isAtBottom() {
    const threshold = 10;
    return (this.containerEl.scrollHeight - this.containerEl.scrollTop - this.containerEl.clientHeight) <= threshold;
  }

  /**
   * Update auto-scroll button text
   */
  updateAutoScrollButton() {
    this.autoScrollBtn.textContent = `Auto-scroll: ${this.autoScroll ? 'ON' : 'OFF'}`;
    this.autoScrollBtn.classList.toggle('bg-primary-100', this.autoScroll);
    this.autoScrollBtn.classList.toggle('dark:bg-primary-900', this.autoScroll);
    this.autoScrollBtn.classList.toggle('bg-gray-200', !this.autoScroll);
    this.autoScrollBtn.classList.toggle('dark:bg-gray-600', !this.autoScroll);
  }

  /**
   * Add log entries
   * @param {Array|Object} entries
   */
  add(entries) {
    const entriesArray = Array.isArray(entries) ? entries : [entries];

    entriesArray.forEach(entry => {
      this.logs.push(entry);

      // Trim old logs
      while (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    });

    this.render();

    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Set initial logs (from history)
   * @param {Array} logs
   */
  setLogs(logs) {
    this.logs = logs || [];
    this.render();

    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    this.render();
  }

  /**
   * Render log entries
   */
  render() {
    if (this.logs.length === 0) {
      this.contentEl.innerHTML = '<div class="text-gray-400 text-center py-4">No logs yet</div>';
      return;
    }

    this.contentEl.innerHTML = this.logs.map(entry => this.renderEntry(entry)).join('');
  }

  /**
   * Render single log entry
   * @param {Object} entry
   * @returns {string}
   */
  renderEntry(entry) {
    const { data, stream, type, timestamp } = entry;
    let className = 'log-entry';

    // Determine color class based on type or stream
    if (type) {
      className += ` log-${type}`;
    } else if (stream) {
      className += ` log-${stream}`;
    }

    // Format timestamp
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    const timePrefix = time ? `<span class="text-gray-400 mr-2">[${time}]</span>` : '';

    // Escape HTML in data
    const escapedData = this.escapeHtml(data || '');

    return `<div class="${className}">${timePrefix}${escapedData}</div>`;
  }

  /**
   * Escape HTML characters
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom() {
    requestAnimationFrame(() => {
      this.containerEl.scrollTop = this.containerEl.scrollHeight;
    });
  }
}

/**
 * Toast Notification Component
 * Shows feedback notifications
 * Requirements: 7.6
 */
class Toast {
  constructor() {
    this.containerEl = document.getElementById('toast-container');
    this.queue = [];
    this.displayDuration = 3000;
    this.maxToasts = 3;
  }

  /**
   * Show success toast
   * @param {string} message
   */
  success(message) {
    this.show(message, 'success');
  }

  /**
   * Show error toast
   * @param {string} message
   */
  error(message) {
    this.show(message, 'error');
  }

  /**
   * Show info toast
   * @param {string} message
   */
  info(message) {
    this.show(message, 'info');
  }

  /**
   * Show toast notification
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   */
  show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Remove oldest toasts if over limit
    while (this.containerEl.children.length >= this.maxToasts) {
      this.containerEl.removeChild(this.containerEl.firstChild);
    }

    this.containerEl.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, this.displayDuration);
  }
}

/**
 * Reconnect Overlay Component
 * Shows reconnection UI
 * Requirements: 8.3, 8.4
 */
class ReconnectOverlay {
  constructor() {
    this.overlayEl = document.getElementById('reconnect-overlay');
    this.messageEl = document.getElementById('reconnect-message');
    this.manualBtn = document.getElementById('btn-manual-reconnect');
    this.spinnerEl = document.getElementById('reconnect-spinner');

    this.onManualReconnect = null;

    this.manualBtn.addEventListener('click', () => {
      if (this.onManualReconnect) {
        this.onManualReconnect();
      }
    });
  }

  /**
   * Show reconnecting state
   * @param {number} attempt
   * @param {number} maxAttempts
   */
  showReconnecting(attempt, maxAttempts) {
    this.overlayEl.classList.remove('hidden');
    this.spinnerEl.classList.remove('hidden');
    this.manualBtn.classList.add('hidden');
    this.messageEl.textContent = `Reconnecting... (${attempt}/${maxAttempts})`;
  }

  /**
   * Show manual reconnect button
   */
  showManualReconnect() {
    this.overlayEl.classList.remove('hidden');
    this.spinnerEl.classList.add('hidden');
    this.manualBtn.classList.remove('hidden');
    this.messageEl.textContent = 'Connection failed. Please try again.';
  }

  /**
   * Hide overlay
   */
  hide() {
    this.overlayEl.classList.add('hidden');
  }
}

// Export components
window.ConnectionStatus = ConnectionStatus;
window.SpecList = SpecList;
window.SpecDetail = SpecDetail;
window.LogViewer = LogViewer;
window.Toast = Toast;
window.ReconnectOverlay = ReconnectOverlay;
