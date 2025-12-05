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
   * Get phase information from spec
   * @param {Object} spec
   * @returns {{ phase: string, status: string }}
   */
  getPhaseInfo(spec) {
    const approvals = spec.approvals || {};
    const phases = ['requirements', 'design', 'tasks'];

    for (const phase of phases.reverse()) {
      const approval = approvals[phase];
      if (approval) {
        if (approval.approved) {
          return { phase, status: 'approved' };
        } else if (approval.generated) {
          return { phase, status: 'generated' };
        }
      }
    }

    return { phase: 'ready', status: 'pending' };
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
    this.phaseBadgesEl = document.getElementById('phase-badges');
    this.agentControlsEl = document.getElementById('agent-controls');
    this.runningIndicatorEl = document.getElementById('running-indicator');
    this.backButton = document.getElementById('back-button');

    this.currentSpec = null;
    this.currentAgentId = null;
    this.isRunning = false;

    this.onExecutePhase = null;
    this.onStop = null;
    this.onResume = null;
    this.onBack = null;

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

    // Workflow buttons
    const phases = ['requirements', 'design', 'tasks', 'implementation'];
    phases.forEach(phase => {
      const btn = document.getElementById(`btn-${phase}`);
      if (btn) {
        btn.addEventListener('click', () => {
          if (this.onExecutePhase && this.currentSpec) {
            this.onExecutePhase(this.currentSpec.feature_name, phase);
          }
        });
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
  }

  /**
   * Show spec detail panel
   * @param {Object} spec
   */
  show(spec) {
    this.currentSpec = spec;
    this.titleEl.textContent = spec.feature_name;
    this.renderPhaseBadges(spec);
    this.updateWorkflowButtons(spec);
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
   * Render phase badges
   * @param {Object} spec
   */
  renderPhaseBadges(spec) {
    const phases = [
      { key: 'requirements', label: 'Requirements' },
      { key: 'design', label: 'Design' },
      { key: 'tasks', label: 'Tasks' },
    ];

    const approvals = spec.approvals || {};

    this.phaseBadgesEl.innerHTML = phases.map(({ key, label }) => {
      const approval = approvals[key] || {};
      let status = 'pending';
      let icon = '';

      if (approval.approved) {
        status = 'approved';
        icon = '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
      } else if (approval.generated) {
        status = 'generated';
        icon = '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path></svg>';
      }

      return `<span class="phase-badge phase-badge-${status}">${icon}${label}</span>`;
    }).join('');
  }

  /**
   * Update workflow button states
   * @param {Object} spec
   */
  updateWorkflowButtons(spec) {
    const approvals = spec.approvals || {};

    // Requirements: always available
    document.getElementById('btn-requirements').disabled = this.isRunning;

    // Design: requires requirements approved
    const reqApproved = approvals.requirements?.approved || false;
    document.getElementById('btn-design').disabled = !reqApproved || this.isRunning;

    // Tasks: requires design approved
    const designApproved = approvals.design?.approved || false;
    document.getElementById('btn-tasks').disabled = !designApproved || this.isRunning;

    // Implementation: requires tasks approved
    const tasksApproved = approvals.tasks?.approved || false;
    document.getElementById('btn-implementation').disabled = !tasksApproved || this.isRunning;
  }

  /**
   * Set running state
   * @param {boolean} running
   * @param {string} [agentId]
   */
  setRunning(running, agentId = null) {
    this.isRunning = running;
    this.currentAgentId = agentId;

    if (running) {
      this.runningIndicatorEl.classList.remove('hidden');
      this.agentControlsEl.classList.remove('hidden');
      document.getElementById('btn-stop').classList.remove('hidden');
      document.getElementById('btn-resume').classList.add('hidden');
    } else {
      this.runningIndicatorEl.classList.add('hidden');
      this.agentControlsEl.classList.add('hidden');
    }

    // Update button states
    if (this.currentSpec) {
      this.updateWorkflowButtons(this.currentSpec);
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

    if (this.currentSpec) {
      this.updateWorkflowButtons(this.currentSpec);
    }
  }

  /**
   * Update spec data
   * @param {Object} spec
   */
  updateSpec(spec) {
    if (this.currentSpec && this.currentSpec.feature_name === spec.feature_name) {
      this.currentSpec = spec;
      this.renderPhaseBadges(spec);
      this.updateWorkflowButtons(spec);
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
