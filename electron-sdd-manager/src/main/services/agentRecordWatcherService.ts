/**
 * AgentRecordWatcherService
 * Watches .kiro/runtime/agents directory for changes and notifies renderer
 *
 * remove-redundant-agent-watchers feature:
 * - Single watcher architecture: projectAgentWatcher monitors all categories
 * - No dynamic scope switching needed - full category watch handles all cases
 * - ProjectAgent (specId='') is always monitored for visibility
 */

import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
// agent-error-notification: logger.ts -> projectLogger migration (Requirements 1.2, 1.3, 1.5)
import { projectLogger as logger } from './projectLogger';

// Bug fix: spec-agent-list-not-updating-on-auto-execution
// Simplified event type - no longer includes record data
// Renderer will fetch full data via loadAgents() to avoid file read timing issues
// file-change-push-notification: Task 1.3
// Requirements: 2.3, 2.4
// Push型通知: ファイル内容とエラー情報を含む
export type AgentRecordChangeEvent = {
  type: 'add' | 'change' | 'unlink';
  path: string;
  specId?: string;
  agentId?: string;
  /**
   * ファイル内容（Push型）
   * - agent-{id}.jsonの場合: AgentRecord型
   * - エラー時: null
   * - 未設定時: undefined（後方互換性）
   */
  content?: import('./agentRecordService').AgentRecord | null;
  /**
   * ファイル読み込み失敗時のエラーメッセージ
   */
  error?: string;
};

export type AgentRecordChangeCallback = (event: AgentRecordChangeEvent) => void;

/**
 * Service for watching .kiro/runtime/agents directory changes
 *
 * remove-redundant-agent-watchers:
 * Single watcher architecture for simplified monitoring
 * - projectAgentWatcher: monitors all categories (specs/*, bugs/*, project/)
 * - No specWatcher/bugWatcher needed - full category watch covers all use cases
 */
export class AgentRecordWatcherService {
  // remove-redundant-agent-watchers: Single watcher instance
  private _projectAgentWatcher: chokidar.FSWatcher | null = null;

  private projectPath: string;
  private callbacks: AgentRecordChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 100;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  // Public getter for test access
  get projectAgentWatcher(): chokidar.FSWatcher | null {
    return this._projectAgentWatcher;
  }

  /**
   * Extract spec ID and agent ID from file path
   * Category-aware extraction:
   * - specs/{specId}/agent-*.json -> { specId, agentId }
   * - bugs/{bugId}/agent-*.json -> { specId: 'bug:{bugId}', agentId }
   * - project/agent-*.json -> { specId: '', agentId }
   */
  private extractIds(filePath: string): { specId?: string; agentId?: string } {
    const agentsDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents');
    const relativePath = path.relative(agentsDir, filePath);
    const parts = relativePath.split(path.sep);

    // Category-aware path structure: {category}/{entityId}/agent-*.json or project/agent-*.json
    if (parts.length === 3 && parts[2].endsWith('.json')) {
      // specs/{specId}/agent-*.json or bugs/{bugId}/agent-*.json
      const category = parts[0];
      const entityId = parts[1];
      const agentId = parts[2].replace('.json', '');

      if (category === 'specs') {
        return { specId: entityId, agentId };
      } else if (category === 'bugs') {
        return { specId: `bug:${entityId}`, agentId };
      }
    } else if (parts.length === 2 && parts[0] === 'project' && parts[1].endsWith('.json')) {
      // project/agent-*.json
      return {
        specId: '',
        agentId: parts[1].replace('.json', ''),
      };
    }

    return {};
  }

  /**
   * Start watching the agents directory
   *
   * remove-redundant-agent-watchers:
   * - Watches all categories (specs/*, bugs/*, project/) with glob patterns
   * - Single watcher handles all agent file monitoring
   * - ignoreInitial: false to process existing agent files on startup
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

    logger.info('[AgentRecordWatcherService] Starting full-category watcher', { agentsDir });

    // chokidar v4+ removed glob pattern support (Sep 2024)
    // Must use directory paths with depth option instead of glob patterns like 'specs/*/*.json'
    const watchPaths = [
      path.join(agentsDir, 'specs'),
      path.join(agentsDir, 'bugs'),
      path.join(agentsDir, 'project'),
    ];

    this._projectAgentWatcher = chokidar.watch(watchPaths, {
      ignoreInitial: true, // Skip existing files - only watch for new changes
      persistent: true,
      depth: 2, // Sufficient for {category}/{entityId}/agent-*.json
      ignored: (filePath: string) => filePath.includes('/logs/'), // Function-based (chokidar v4+ recommended)
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
        logger.error('[AgentRecordWatcherService] Full-category watcher error', { error: message });
      })
      .on('ready', () => {
        logger.info('[AgentRecordWatcherService] Full-category watcher ready');
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
   * remove-redundant-agent-watchers:
   * - Stops projectAgentWatcher (the only watcher)
   */
  async stop(): Promise<void> {
    // Stop projectAgentWatcher
    if (this._projectAgentWatcher) {
      logger.info('[AgentRecordWatcherService] Stopping ProjectAgent watcher');
      await this._projectAgentWatcher.close();
      this._projectAgentWatcher = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.callbacks = [];
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this._projectAgentWatcher !== null;
  }
}
