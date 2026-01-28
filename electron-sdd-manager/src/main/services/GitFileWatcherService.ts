import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { GitService } from './GitService';
import type { Result } from '../../shared/types';
import type { ApiError, GitStatusResult } from '../../shared/api/types';

/**
 * GitFileWatcherService - File system watcher for git changes
 *
 * Uses chokidar to monitor project directory and auto-refresh git diff.
 * Implements debounce (300ms) to reduce git operation frequency.
 */
export class GitFileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private gitService: GitService;
  private eventCallback: ((projectPath: string, status: GitStatusResult) => void) | null = null;

  constructor(gitService?: GitService) {
    this.gitService = gitService || new GitService();
  }

  /**
   * Set the callback for git changes detected events
   */
  setEventCallback(callback: (projectPath: string, status: GitStatusResult) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Start watching a project directory
   * Idempotent: returns success if already watching
   *
   * Note: Watches .git/index file instead of entire project to avoid
   * EMFILE errors (too many open files) on large projects.
   * .git/index is updated whenever git status changes (staging, commits, etc.)
   */
  async startWatching(projectPath: string): Promise<Result<void, ApiError>> {
    try {
      // If already watching, return success
      if (this.watchers.has(projectPath)) {
        return {
          success: true,
          data: undefined,
        };
      }

      // Watch .git/index instead of entire project to avoid EMFILE errors
      // .git/index is updated on staging, commits, and other git operations
      const gitIndexPath = path.join(projectPath, '.git', 'index');

      // Create chokidar watcher for .git/index only
      const watcher = chokidar.watch(gitIndexPath, {
        persistent: true,
        ignoreInitial: true,
        // Use polling for .git/index as it's a single file
        usePolling: true,
        interval: 500,
      });

      // Set up event handlers
      watcher.on('all', (event, path) => {
        this.handleFileChange(projectPath, event, path);
      });

      watcher.on('error', (error) => {
        console.error(`Chokidar error for ${projectPath}:`, error);
      });

      this.watchers.set(projectPath, watcher);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'system_error',
          message: `Failed to start file watching: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Stop watching a project directory
   * Idempotent: returns success if not watching
   */
  async stopWatching(projectPath: string): Promise<Result<void, ApiError>> {
    try {
      const watcher = this.watchers.get(projectPath);

      if (watcher) {
        await watcher.close();
        this.watchers.delete(projectPath);
      }

      // Clear any pending debounce timer
      const timer = this.debounceTimers.get(projectPath);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(projectPath);
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'system_error',
          message: `Failed to stop file watching: ${error instanceof Error ? error.message : String(error)}`,
        },
      };
    }
  }

  /**
   * Get list of currently watched projects
   */
  getWatchingProjects(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Handle file change event with debounce
   */
  private handleFileChange(projectPath: string, _event: string, _filePath: string): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(projectPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer (300ms debounce)
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(projectPath);

      // Get updated git status
      const statusResult = await this.gitService.getStatus(projectPath);

      if (statusResult.success && this.eventCallback) {
        // Broadcast change event
        this.eventCallback(projectPath, statusResult.data);
      }
    }, 300);

    this.debounceTimers.set(projectPath, timer);
  }

  /**
   * Close all watchers (cleanup on app exit)
   */
  async closeAll(): Promise<void> {
    const projectPaths = Array.from(this.watchers.keys());

    for (const projectPath of projectPaths) {
      await this.stopWatching(projectPath);
    }
  }
}
