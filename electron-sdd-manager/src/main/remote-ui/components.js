/**
 * UI Components for SDD Manager Mobile
 * Requirements: 6.1, 6.2, 6.3, 6.4, 7.6, 4.3, 4.4, 4.5
 * Task 5.1, 6.1, 7.1, 8.1, 9.1, 10.1 (internal-webserver-sync)
 */

/**
 * Docs Tabs Component
 * Displays tabs for switching between Specs and Bugs
 * Requirements: 7.7 (Task 5.1 - DocsTabsコンポーネント)
 */
class DocsTabs {
  constructor() {
    this.containerEl = document.getElementById('docs-tabs');
    this.activeTab = 'specs';
    this.onTabChange = null;
  }

  /**
   * Set active tab
   * @param {'specs'|'bugs'} tab
   */
  setActiveTab(tab) {
    this.activeTab = tab;
    this.render();
    if (this.onTabChange) {
      this.onTabChange(tab);
    }
  }

  /**
   * Get active tab
   * @returns {'specs'|'bugs'}
   */
  getActiveTab() {
    return this.activeTab;
  }

  /**
   * Render tabs
   */
  render() {
    if (!this.containerEl) return;

    const specsActive = this.activeTab === 'specs';
    const bugsActive = this.activeTab === 'bugs';

    this.containerEl.innerHTML = `
      <div class="flex border-b border-gray-200 dark:border-gray-700">
        <button
          class="docs-tab ${specsActive ? 'docs-tab-active' : ''}"
          data-tab="specs"
          data-testid="remote-tab-specs"
          aria-selected="${specsActive}"
          role="tab"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Specs
        </button>
        <button
          class="docs-tab ${bugsActive ? 'docs-tab-active' : ''}"
          data-tab="bugs"
          data-testid="remote-tab-bugs"
          aria-selected="${bugsActive}"
          role="tab"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          Bugs
        </button>
      </div>
    `;

    // Add click handlers
    this.containerEl.querySelectorAll('.docs-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        if (tabName !== this.activeTab) {
          this.setActiveTab(tabName);
        }
      });
    });
  }
}

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
   * Sorts by updatedAt descending (newest first) to match Electron version
   * @param {Array} specs
   */
  update(specs) {
    this.specs = this.sortSpecs(specs || []);
    this.render();
  }

  /**
   * Sort specs by updatedAt descending (newest first)
   * Matches Electron version's default sort behavior (specStore.getSortedFilteredSpecs)
   * @param {Array} specs
   * @returns {Array}
   */
  sortSpecs(specs) {
    return [...specs].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });
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
      <div class="spec-card ${selectedClass}" data-spec-id="${spec.feature_name}" data-testid="remote-spec-item-${spec.feature_name}">
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
 * Bug List Component
 * Displays list of bugs with phase indicators
 * Requirements: 1.1 (Task 3.1, 3.2 - BugList component)
 */
class BugList {
  constructor() {
    this.containerEl = document.getElementById('bug-list');
    this.bugs = [];
    this.selectedBugName = null;
    this.onSelect = null;
  }

  /**
   * Update bugs list
   * @param {Array} bugs
   */
  update(bugs) {
    this.bugs = bugs || [];
    this.render();
  }

  /**
   * Set selected bug
   * @param {string} bugName
   */
  setSelected(bugName) {
    this.selectedBugName = bugName;
    this.render();
  }

  /**
   * Render bugs list
   */
  render() {
    if (!this.containerEl) return;

    if (this.bugs.length === 0) {
      this.containerEl.innerHTML = `
        <div class="empty-state">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p>No bugs found</p>
        </div>
      `;
      return;
    }

    this.containerEl.innerHTML = this.bugs.map(bug => this.renderBugCard(bug)).join('');

    // Add click handlers
    this.containerEl.querySelectorAll('.bug-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        const bug = this.bugs[index];
        if (this.onSelect) {
          this.onSelect(bug);
        }
      });
    });
  }

  /**
   * Render single bug card
   * @param {Object} bug
   * @returns {string}
   */
  renderBugCard(bug) {
    const isSelected = bug.name === this.selectedBugName;
    const selectedClass = isSelected ? 'bug-card-selected' : '';

    return `
      <div class="bug-card ${selectedClass}" data-bug-name="${bug.name}" data-testid="remote-bug-item-${bug.name}">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="font-medium truncate">${bug.name}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${this.formatDate(bug.updatedAt)}</p>
          </div>
          <div class="flex-shrink-0 ml-3">
            ${this.renderPhaseBadge(bug.phase)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Format date for display
   * @param {string} dateStr
   * @returns {string}
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  /**
   * Render phase badge for bug
   * @param {string} phase
   * @returns {string}
   */
  renderPhaseBadge(phase) {
    const phaseColors = {
      reported: 'bug-badge-reported',
      analyzed: 'bug-badge-analyzed',
      fixed: 'bug-badge-fixed',
      verified: 'bug-badge-verified',
    };
    const phaseLabels = {
      reported: 'Reported',
      analyzed: 'Analyzed',
      fixed: 'Fixed',
      verified: 'Verified',
    };

    const colorClass = phaseColors[phase] || 'bug-badge-reported';
    const label = phaseLabels[phase] || phase;

    return `<span class="bug-badge ${colorClass}">${label}</span>`;
  }
}

/**
 * Bug Detail Component
 * Shows detailed bug info and action buttons
 * Requirements: 1.3, 1.4, 1.5, 1.6, 7.2 (Task 7.1 - BugDetailコンポーネント)
 */
class BugDetail {
  constructor() {
    this.sectionEl = document.getElementById('bug-detail-section');
    this.titleEl = document.getElementById('bug-detail-title');
    this.phaseTagEl = document.getElementById('bug-phase-tag');
    this.actionBtn = document.getElementById('btn-bug-action');
    this.backButton = document.getElementById('bug-back-button');
    this.loadingEl = document.getElementById('bug-loading-indicator');

    this.currentBug = null;
    this.isRunning = false;

    this.onExecutePhase = null;
    this.onBack = null;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for buttons
   */
  setupEventListeners() {
    if (this.backButton) {
      this.backButton.addEventListener('click', () => {
        if (this.onBack) {
          this.onBack();
        }
        this.hide();
      });
    }

    if (this.actionBtn) {
      this.actionBtn.addEventListener('click', () => {
        if (this.onExecutePhase && this.currentBug) {
          const nextPhase = this.getNextPhase(this.currentBug.phase);
          if (nextPhase) {
            this.onExecutePhase(this.currentBug.name, nextPhase);
          }
        }
      });
    }
  }

  /**
   * Show bug detail panel
   * @param {Object} bug
   */
  show(bug) {
    if (!this.sectionEl) return;

    this.currentBug = bug;
    if (this.titleEl) this.titleEl.textContent = bug.name;
    this.updatePhaseTag(bug.phase);
    this.updateActionButton(bug.phase);
    this.sectionEl.classList.remove('hidden');
  }

  /**
   * Hide bug detail panel
   */
  hide() {
    if (this.sectionEl) {
      this.sectionEl.classList.add('hidden');
    }
    this.currentBug = null;
  }

  /**
   * Check if panel is visible
   * @returns {boolean}
   */
  isVisible() {
    return this.sectionEl && !this.sectionEl.classList.contains('hidden');
  }

  /**
   * Update phase tag display
   * @param {string} phase
   */
  updatePhaseTag(phase) {
    if (!this.phaseTagEl) return;

    const phaseColors = {
      reported: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300',
      analyzed: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300',
      fixed: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300',
      verified: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300',
    };
    const phaseLabels = {
      reported: 'Reported',
      analyzed: 'Analyzed',
      fixed: 'Fixed',
      verified: 'Verified',
    };

    this.phaseTagEl.className = `px-3 py-1 text-sm font-medium rounded-full ${phaseColors[phase] || phaseColors.reported}`;
    this.phaseTagEl.textContent = phaseLabels[phase] || phase;
  }

  /**
   * Get next phase for bug
   * @param {string} currentPhase
   * @returns {string|null}
   */
  getNextPhase(currentPhase) {
    const phaseOrder = ['reported', 'analyzed', 'fixed', 'verified'];
    const nextPhaseMap = {
      reported: 'analyze',
      analyzed: 'fix',
      fixed: 'verify',
    };
    return nextPhaseMap[currentPhase] || null;
  }

  /**
   * Update action button
   * @param {string} phase
   */
  updateActionButton(phase) {
    if (!this.actionBtn) return;

    const nextPhase = this.getNextPhase(phase);
    const buttonLabels = {
      analyze: 'Analyze Bug',
      fix: 'Fix Bug',
      verify: 'Verify Fix',
    };

    if (!nextPhase || this.isRunning) {
      this.actionBtn.disabled = true;
      this.actionBtn.textContent = nextPhase ? buttonLabels[nextPhase] : 'Completed';
    } else {
      this.actionBtn.disabled = false;
      this.actionBtn.textContent = buttonLabels[nextPhase];
    }
  }

  /**
   * Set running state
   * @param {boolean} running
   */
  setRunning(running) {
    this.isRunning = running;

    if (this.loadingEl) {
      if (running) {
        this.loadingEl.classList.remove('hidden');
      } else {
        this.loadingEl.classList.add('hidden');
      }
    }

    if (this.currentBug) {
      this.updateActionButton(this.currentBug.phase);
    }
  }

  /**
   * Update bug data
   * @param {Object} bug
   */
  updateBug(bug) {
    if (this.currentBug && this.currentBug.name === bug.name) {
      this.currentBug = bug;
      this.updatePhaseTag(bug.phase);
      this.updateActionButton(bug.phase);
    }
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
    const phase = spec.phase || 'initialized';

    // Check for implementation complete
    if (phase === 'implementation-complete') {
      return { label: '✓ Complete', colorKey: 'complete' };
    }

    // Check based on approvals (most accurate source)
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

      // Extract phase from agentId if not explicitly set (agentId format: specName-phase-timestamp)
      const displayPhase = agent.phase || this.extractPhaseFromId(agent.id) || 'Agent';

      return `
        <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" data-agent-id="${agent.id}">
          <span class="w-2 h-2 rounded-full ${statusColor}"></span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">${displayPhase}</div>
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
   * Extract phase name from agentId
   * @param {string} agentId - Format: specName-phase-timestamp or just an identifier
   * @returns {string|null}
   */
  extractPhaseFromId(agentId) {
    if (!agentId) return null;

    // Known phase names to detect
    const phases = ['requirements', 'design', 'tasks', 'implementation', 'analyze', 'fix', 'verify', 'gap', 'design-validation', 'document-review'];

    // Check if any phase name is in the agentId
    for (const phase of phases) {
      if (agentId.toLowerCase().includes(phase)) {
        // Capitalize first letter
        return phase.charAt(0).toUpperCase() + phase.slice(1);
      }
    }

    return null;
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
    // SpecPhase values: 'initialized', 'requirements-generated', 'design-generated', 'tasks-generated', 'implementation-complete'
    const phaseString = spec.phase || 'initialized';
    switch (phaseString) {
      case 'implementation-complete':
        // All phases approved for implementation-complete
        result.requirements = 'approved';
        result.design = 'approved';
        result.tasks = 'approved';
        break;
      case 'tasks-generated':
        // Tasks generated means design and requirements were approved
        result.requirements = 'approved';
        result.design = 'approved';
        result.tasks = 'generated';
        break;
      case 'design-generated':
        // Design generated means requirements was approved
        result.requirements = 'approved';
        result.design = 'generated';
        break;
      case 'requirements-generated':
        result.requirements = 'generated';
        break;
      case 'initialized':
      case 'ready':
      default:
        // Nothing generated yet
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

  // ============================================================
  // Task 8.1: Review State Display and Start Button
  // Requirements: 6.4 (internal-webserver-sync)
  // ============================================================

  /**
   * Execute document review
   */
  executeDocumentReview() {
    if (this.currentSpec) {
      wsManager.executeDocumentReview(this.currentSpec.feature_name);
      this.setRunning(true, null, 'Running document review...');
    }
  }

  /**
   * Get review state for spec
   * @param {Object} spec
   * @returns {{ hasReview: boolean, reviewCount: number }}
   */
  getReviewState(spec) {
    // Check for review files in spec (would come from server)
    const reviewCount = spec.reviewCount || 0;
    return {
      hasReview: reviewCount > 0,
      reviewCount: reviewCount,
    };
  }

  /**
   * Render review button in detail panel
   * @returns {string}
   */
  renderReviewButton() {
    if (!this.currentSpec) return '';

    const reviewState = this.getReviewState(this.currentSpec);
    const buttonText = reviewState.hasReview
      ? `Start New Review (${reviewState.reviewCount} existing)`
      : 'Start Document Review';

    return `
      <button
        id="btn-document-review"
        class="btn-primary w-full mt-2"
        ${this.isRunning ? 'disabled' : ''}
      >
        ${buttonText}
      </button>
    `;
  }

  // ============================================================
  // Task 9.1: Validation Execution Buttons
  // Requirements: 6.3 (internal-webserver-sync)
  // ============================================================

  /**
   * Execute gap validation
   */
  executeGapValidation() {
    if (this.currentSpec) {
      wsManager.executeValidation(this.currentSpec.feature_name, 'gap');
      this.setRunning(true, null, 'Running gap validation...');
    }
  }

  /**
   * Execute design validation
   */
  executeDesignValidation() {
    if (this.currentSpec) {
      wsManager.executeValidation(this.currentSpec.feature_name, 'design');
      this.setRunning(true, null, 'Running design validation...');
    }
  }

  /**
   * Check if gap validation is available
   * @param {Object} spec
   * @returns {boolean}
   */
  isGapValidationAvailable(spec) {
    const phaseStatus = this.getPhaseStatusFromSpec(spec);
    // Gap validation available after requirements generated
    return phaseStatus.requirements === 'generated' || phaseStatus.requirements === 'approved';
  }

  /**
   * Check if design validation is available
   * @param {Object} spec
   * @returns {boolean}
   */
  isDesignValidationAvailable(spec) {
    const phaseStatus = this.getPhaseStatusFromSpec(spec);
    // Design validation available after design generated
    return phaseStatus.design === 'generated' || phaseStatus.design === 'approved';
  }

  /**
   * Render validation buttons
   * @returns {string}
   */
  renderValidationButtons() {
    if (!this.currentSpec) return '';

    const gapAvailable = this.isGapValidationAvailable(this.currentSpec);
    const designAvailable = this.isDesignValidationAvailable(this.currentSpec);

    return `
      <div class="flex gap-2 mt-2">
        <button
          id="btn-gap-validation"
          class="btn-secondary flex-1"
          ${!gapAvailable || this.isRunning ? 'disabled' : ''}
        >
          Gap Validation
        </button>
        <button
          id="btn-design-validation"
          class="btn-secondary flex-1"
          ${!designAvailable || this.isRunning ? 'disabled' : ''}
        >
          Design Validation
        </button>
      </div>
    `;
  }

  // ============================================================
  // Task 10.1: Task Progress Display
  // Requirements: 6.5 (internal-webserver-sync)
  // ============================================================

  /**
   * Update task progress
   * @param {string} taskId
   * @param {string} status
   */
  updateTaskProgress(taskId, status) {
    // Find and update the task element
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskEl) {
      const statusBadge = taskEl.querySelector('.task-status');
      if (statusBadge) {
        statusBadge.textContent = status;
        statusBadge.className = `task-status task-status-${status}`;
      }
    }

    // If we have task progress data, update the progress bar
    this.updateTaskProgressBar();
  }

  /**
   * Update task progress bar
   */
  updateTaskProgressBar() {
    const progressBar = document.getElementById('task-progress-bar');
    const progressText = document.getElementById('task-progress-text');

    if (!this.currentSpec || !this.currentSpec.tasks) return;

    const tasks = this.currentSpec.tasks;
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const totalCount = tasks.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    if (progressText) {
      progressText.textContent = `${completedCount}/${totalCount} tasks completed`;
    }
  }

  /**
   * Get task progress summary
   * @param {Object} spec
   * @returns {{ completed: number, total: number, percentage: number }}
   */
  getTaskProgress(spec) {
    if (!spec.tasks || !Array.isArray(spec.tasks)) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = spec.tasks.filter(t => t.status === 'completed').length;
    const total = spec.tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  /**
   * Render task progress section
   * @returns {string}
   */
  renderTaskProgress() {
    if (!this.currentSpec) return '';

    const progress = this.getTaskProgress(this.currentSpec);

    if (progress.total === 0) {
      return '';
    }

    return `
      <div class="task-progress-section mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Task Progress</span>
          <span id="task-progress-text" class="text-sm text-gray-500 dark:text-gray-400">
            ${progress.completed}/${progress.total} tasks completed
          </span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            id="task-progress-bar"
            class="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style="width: ${progress.percentage}%"
          ></div>
        </div>
        ${this.currentSpec.tasks ? this.renderTaskList() : ''}
      </div>
    `;
  }

  /**
   * Render task list
   * @returns {string}
   */
  renderTaskList() {
    if (!this.currentSpec || !this.currentSpec.tasks) return '';

    return `
      <div class="task-list mt-3 space-y-1 max-h-32 overflow-y-auto">
        ${this.currentSpec.tasks.map(task => `
          <div class="task-item flex items-center justify-between text-sm" data-task-id="${task.id}">
            <span class="truncate flex-1 text-gray-600 dark:text-gray-400">${task.name || task.id}</span>
            <span class="task-status task-status-${task.status || 'pending'} ml-2 px-2 py-0.5 text-xs rounded">
              ${task.status || 'pending'}
            </span>
          </div>
        `).join('')}
      </div>
    `;
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
   * Render single log entry with formatting
   * @param {Object} entry
   * @returns {string}
   */
  renderEntry(entry) {
    const { data, stream, type, timestamp } = entry;

    // Try to parse and format the log data using LogFormatter
    if (data && window.LogFormatter) {
      const formattedLines = window.LogFormatter.formatLogData(data);

      if (formattedLines.length > 0) {
        return formattedLines.map(line => this.renderFormattedLine(line, timestamp)).join('');
      }
    }

    // Fallback: render as raw log entry
    return this.renderRawEntry(entry);
  }

  /**
   * Render formatted log line
   * @param {Object} line - Formatted line from LogFormatter
   * @param {number} timestamp
   * @returns {string}
   */
  renderFormattedLine(line, timestamp) {
    const colorClass = window.LogFormatter.getColorClass(line.color);
    const bgClass = window.LogFormatter.getBgClass(line.type);
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    const timePrefix = time ? `<span class="text-gray-500 text-xs mr-2">[${time}]</span>` : '';

    // Escape content for HTML
    const escapedContent = this.escapeHtml(line.content || '');
    const escapedDetails = line.details ? this.escapeHtml(line.details) : '';

    return `
      <div class="log-entry-formatted px-2 py-1 rounded mb-1 ${bgClass}">
        <div class="flex items-start gap-2 ${colorClass}">
          ${line.icon ? `<span class="shrink-0">${line.icon}</span>` : ''}
          ${line.label ? `<span class="shrink-0 font-semibold">${this.escapeHtml(line.label)}:</span>` : ''}
          <span class="whitespace-pre-wrap break-all flex-1">
            ${escapedContent}
            ${escapedDetails ? `<span class="text-gray-500 ml-2">${escapedDetails}</span>` : ''}
          </span>
        </div>
        ${timePrefix ? `<div class="text-right">${timePrefix}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render raw log entry (fallback)
   * @param {Object} entry
   * @returns {string}
   */
  renderRawEntry(entry) {
    const { data, stream, type, timestamp } = entry;
    let className = 'log-entry px-2 py-1';

    // Determine color class based on type or stream
    if (stream === 'stderr') {
      className += ' text-red-400 bg-red-900/20';
    } else if (stream === 'stdin') {
      className += ' text-blue-400 bg-blue-900/20';
    } else if (type === 'error') {
      className += ' text-red-400';
    } else if (type === 'warning') {
      className += ' text-yellow-400';
    } else {
      className += ' text-gray-300';
    }

    // Format timestamp
    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
    const timePrefix = time ? `<span class="text-gray-500 text-xs mr-2">[${time}]</span>` : '';

    // Escape HTML in data
    const escapedData = this.escapeHtml(data || '');

    return `<div class="${className}">${timePrefix}<span class="whitespace-pre-wrap break-all">${escapedData}</span></div>`;
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
window.DocsTabs = DocsTabs;
window.ConnectionStatus = ConnectionStatus;
window.SpecList = SpecList;
window.BugList = BugList;
window.BugDetail = BugDetail;
window.SpecDetail = SpecDetail;
window.LogViewer = LogViewer;
window.Toast = Toast;
window.ReconnectOverlay = ReconnectOverlay;
