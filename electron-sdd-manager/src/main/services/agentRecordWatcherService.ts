/**
 * AgentRecordWatcherService
 * Watches .kiro/runtime/agents directory for changes and notifies renderer
 *
 * agent-watcher-optimization feature:
 * - Two-watcher architecture: projectAgentWatcher (always on) + specWatcher (scope-based)
 * - switchWatchScope() to dynamically change monitored spec
 * - ProjectAgent (specId='') is always monitored for visibility
 */

import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { getCategoryBasePath } from './agentCategory';

export type WatchCategory = 'specs' | 'bugs';

// Bug fix: spec-agent-list-not-updating-on-auto-execution
// Simplified event type - no longer includes record data
// Renderer will fetch full data via loadAgents() to avoid file read timing issues
export type AgentRecordChangeEvent = {
  type: 'add' | 'change' | 'unlink';
  path: string;
  specId?: string;
  agentId?: string;
};

export type AgentRecordChangeCallback = (event: AgentRecordChangeEvent) => void;

/**
 * Service for watching .kiro/runtime/agents directory changes
 *
 * agent-watcher-optimization:
 * Two-watcher architecture for efficient monitoring
 * - projectAgentWatcher: always monitors agents/ root for ProjectAgents (depth: 0)
 * - specWatcher: dynamically watches selected spec's subdirectory
 */
export class AgentRecordWatcherService {
  // agent-watcher-optimization: Three watcher instances for runtime-agents-restructure
  private _projectAgentWatcher: chokidar.FSWatcher | null = null;
  private _specWatcher: chokidar.FSWatcher | null = null;
  private _bugWatcher: chokidar.FSWatcher | null = null;
  private _currentSpecId: string | null = null;
  private _currentCategory: WatchCategory | null = null;
  private _currentEntityId: string | null = null;

  private projectPath: string;
  private callbacks: AgentRecordChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 100;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  // Public getters for test access
  get projectAgentWatcher(): chokidar.FSWatcher | null {
    return this._projectAgentWatcher;
  }

  get specWatcher(): chokidar.FSWatcher | null {
    return this._specWatcher;
  }

  get bugWatcher(): chokidar.FSWatcher | null {
    return this._bugWatcher;
  }

  get currentSpecId(): string | null {
    return this._currentSpecId;
  }

  /**
   * Get current watch scope (specId)
   */
  getWatchScope(): string | null {
    return this._currentSpecId;
  }

  /**
   * Extract spec ID and agent ID from file path
   * e.g., /project/.kiro/runtime/agents/my-spec/agent-123.json -> { specId: 'my-spec', agentId: 'agent-123' }
   * e.g., /project/.kiro/runtime/agents/agent-123.json -> { specId: '', agentId: 'agent-123' } (global agent)
   */
  private extractIds(filePath: string): { specId?: string; agentId?: string } {
    const agentsDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents');
    const relativePath = path.relative(agentsDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length >= 2 && parts[1].endsWith('.json')) {
      // Spec-bound agent: {specId}/agent-xxx.json
      return {
        specId: parts[0],
        agentId: parts[1].replace('.json', ''),
      };
    } else if (parts.length === 1 && parts[0].endsWith('.json')) {
      // Global agent: agent-xxx.json (no specId folder)
      return {
        specId: '',
        agentId: parts[0].replace('.json', ''),
      };
    }
    return {};
  }

  /**
   * Start watching the agents directory
   *
   * agent-watcher-optimization:
   * - Only starts ProjectAgent watcher (root agents/ with depth: 0)
   * - Spec-specific watching is done via switchWatchScope()
   * - ignoreInitial: false to process existing ProjectAgent files on startup
   */
  start(): void {
    if (this._projectAgentWatcher) {
      logger.warn('[AgentRecordWatcherService] Watcher already running');
      return;
    }

    const agentsDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents');

    // Ensure directory exists before starting watcher
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
      logger.info('[AgentRecordWatcherService] Created agents directory', { agentsDir });
    }

    logger.info('[AgentRecordWatcherService] Starting ProjectAgent watcher', { agentsDir });

    // ProjectAgent watcher: watch root agents/ directory only (depth: 0)
    // This captures agent files directly in agents/ (no subdirectory = ProjectAgent)
    this._projectAgentWatcher = chokidar.watch(agentsDir, {
      ignoreInitial: false, // Process existing files on startup
      persistent: true,
      depth: 0, // Only watch direct files, not subdirectories
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    this._projectAgentWatcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[AgentRecordWatcherService] ProjectAgent watcher error', { error: message });
      })
      .on('ready', () => {
        logger.info('[AgentRecordWatcherService] ProjectAgent watcher ready');
      });
  }

  /**
   * Switch the spec-specific watch scope
   *
   * agent-watcher-optimization:
   * - Stops existing specWatcher if any
   * - Creates new specWatcher for the specified specId subdirectory
   * - Does NOT affect projectAgentWatcher (always running)
   *
   * @param specId - Spec ID to watch, or null to stop spec watching
   */
  async switchWatchScope(specId: string | null): Promise<void> {
    // Stop existing specWatcher if running
    if (this._specWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping spec watcher', { previousSpec: this._currentSpecId });
      await this._specWatcher.close();
      this._specWatcher = null;
    }

    this._currentSpecId = specId;

    // If specId is null, just clear the watcher
    if (specId === null) {
      logger.info('[AgentRecordWatcherService] Spec watch scope cleared');
      return;
    }

    const specDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents', specId);

    // Ensure directory exists (create if not, to start watching immediately)
    if (!fs.existsSync(specDir)) {
      logger.info('[AgentRecordWatcherService] Spec directory does not exist, creating', { specDir });
      fs.mkdirSync(specDir, { recursive: true });
    }

    logger.info('[AgentRecordWatcherService] Starting spec watcher', { specId, specDir });

    // Spec watcher: watch specific spec subdirectory
    // ignoreInitial: true because we'll load existing data via loadAgents()
    this._specWatcher = chokidar.watch(specDir, {
      ignoreInitial: true, // Don't fire events for existing files
      persistent: true,
      depth: 0, // Only direct files in spec directory
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    this._specWatcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[AgentRecordWatcherService] Spec watcher error', { error: message, specId });
      })
      .on('ready', () => {
        logger.info('[AgentRecordWatcherService] Spec watcher ready', { specId });
      });
  }

  /**
   * Handle file system events with debouncing
   */
  private handleEvent(type: AgentRecordChangeEvent['type'], filePath: string): void {
    // Only process .json files
    if (!filePath.endsWith('.json')) {
      return;
    }

    const { specId, agentId } = this.extractIds(filePath);
    // specId can be empty string for global agents, so check for undefined
    if (specId === undefined || !agentId) {
      return;
    }

    logger.debug('[AgentRecordWatcherService] File event', { type, filePath, specId, agentId });

    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce to avoid multiple rapid events
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);

      // Simplified: only send event info, no file reading
      const event: AgentRecordChangeEvent = {
        type,
        path: filePath,
        specId,
        agentId,
      };

      this.callbacks.forEach((cb) => cb(event));
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Register a callback for agent record changes
   */
  onChange(callback: AgentRecordChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove all callbacks
   */
  clearCallbacks(): void {
    this.callbacks = [];
  }

  /**
   * Stop watching
   *
   * agent-watcher-optimization:
   * - Stops both projectAgentWatcher and specWatcher
   * - Resets currentSpecId to null
   *
   * runtime-agents-restructure:
   * - Also stops bugWatcher
   */
  async stop(): Promise<void> {
    // Stop projectAgentWatcher
    if (this._projectAgentWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping ProjectAgent watcher');
      await this._projectAgentWatcher.close();
      this._projectAgentWatcher = null;
    }

    // Stop specWatcher
    if (this._specWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping spec watcher');
      await this._specWatcher.close();
      this._specWatcher = null;
    }

    // Stop bugWatcher (runtime-agents-restructure)
    if (this._bugWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping bug watcher');
      await this._bugWatcher.close();
      this._bugWatcher = null;
    }

    // Reset state
    this._currentSpecId = null;
    this._currentCategory = null;
    this._currentEntityId = null;

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.callbacks = [];
  }

  // =============================================================================
  // runtime-agents-restructure: Category-aware watching
  // Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
  // =============================================================================

  /**
   * Switch the watch scope with category
   * Requirements: 4.2, 4.3, 4.5
   *
   * @param category - 'specs' | 'bugs'
   * @param entityId - specId or bugId, or null to clear
   */
  async switchWatchScopeWithCategory(category: WatchCategory, entityId: string | null): Promise<void> {
    // Stop existing spec and bug watchers
    if (this._specWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping spec watcher', { previousSpec: this._currentSpecId });
      await this._specWatcher.close();
      this._specWatcher = null;
    }
    if (this._bugWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping bug watcher', { previousBug: this._currentEntityId });
      await this._bugWatcher.close();
      this._bugWatcher = null;
    }

    this._currentCategory = category;
    this._currentEntityId = entityId;
    // Maintain backward compatibility
    this._currentSpecId = entityId;

    // If entityId is null, just clear the watchers
    if (entityId === null) {
      logger.info('[AgentRecordWatcherService] Watch scope cleared');
      return;
    }

    // Build path based on category: runtime/agents/{category}/{entityId}/
    const categoryPath = getCategoryBasePath(
      path.join(this.projectPath, '.kiro', 'runtime', 'agents'),
      category,
      entityId
    );

    // Ensure directory exists
    if (!fs.existsSync(categoryPath)) {
      logger.info('[AgentRecordWatcherService] Category directory does not exist, creating', { categoryPath });
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    logger.info('[AgentRecordWatcherService] Starting category watcher', { category, entityId, categoryPath });

    // Create watcher based on category
    const watcher = chokidar.watch(categoryPath, {
      ignoreInitial: true,
      persistent: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    watcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[AgentRecordWatcherService] Category watcher error', { error: message, category, entityId });
      })
      .on('ready', () => {
        logger.info('[AgentRecordWatcherService] Category watcher ready', { category, entityId });
      });

    // Assign to appropriate watcher
    if (category === 'bugs') {
      this._bugWatcher = watcher;
    } else {
      this._specWatcher = watcher;
    }
  }

  /**
   * Get current watch scope with category
   * @returns Current category and entityId
   */
  getWatchScopeWithCategory(): { category: WatchCategory | null; entityId: string | null } {
    return {
      category: this._currentCategory,
      entityId: this._currentEntityId,
    };
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this._projectAgentWatcher !== null;
  }
}
