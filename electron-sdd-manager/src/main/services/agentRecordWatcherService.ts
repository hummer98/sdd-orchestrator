/**
 * AgentRecordWatcherService
 * Watches .kiro/runtime/agents directory for changes and notifies renderer
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from './logger';
import type { AgentRecord } from './agentRecordService';

export type AgentRecordChangeEvent = {
  type: 'add' | 'change' | 'unlink';
  path: string;
  specId?: string;
  agentId?: string;
  record?: AgentRecord;
};

export type AgentRecordChangeCallback = (event: AgentRecordChangeEvent) => void;

/**
 * Service for watching .kiro/runtime/agents directory changes
 */
export class AgentRecordWatcherService {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string;
  private callbacks: AgentRecordChangeCallback[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 100;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
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
   * Read and parse agent record from file
   */
  private async readRecord(filePath: string): Promise<AgentRecord | undefined> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as AgentRecord;
    } catch (error) {
      logger.warn('[AgentRecordWatcherService] Failed to read record', { filePath, error });
      return undefined;
    }
  }

  /**
   * Start watching the agents directory
   */
  start(): void {
    if (this.watcher) {
      logger.warn('[AgentRecordWatcherService] Watcher already running');
      return;
    }

    const agentsDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents');
    logger.info('[AgentRecordWatcherService] Starting watcher', { agentsDir });

    this.watcher = chokidar.watch(agentsDir, {
      ignoreInitial: false, // Process existing files on startup
      persistent: true,
      depth: 2, // Watch spec folders and their agent JSON files
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleEvent('add', filePath))
      .on('change', (filePath) => this.handleEvent('change', filePath))
      .on('unlink', (filePath) => this.handleEvent('unlink', filePath))
      .on('error', (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[AgentRecordWatcherService] Watcher error', { error: message });
      })
      .on('ready', () => {
        logger.info('[AgentRecordWatcherService] Watcher ready');
      });
  }

  /**
   * Handle file system events with debouncing
   */
  private async handleEvent(type: AgentRecordChangeEvent['type'], filePath: string): Promise<void> {
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
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);

      let record: AgentRecord | undefined;
      if (type !== 'unlink') {
        record = await this.readRecord(filePath);
      }

      const event: AgentRecordChangeEvent = {
        type,
        path: filePath,
        specId,
        agentId,
        record,
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
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      logger.info('[AgentRecordWatcherService] Stopping watcher');
      await this.watcher.close();
      this.watcher = null;
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
    return this.watcher !== null;
  }
}
