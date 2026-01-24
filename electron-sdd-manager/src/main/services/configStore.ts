/**
 * Config Store Service
 * Handles application configuration persistence
 * Requirements: 1.4, 1.5
 * Requirements: 9.2, 9.3, 9.4 (bugs-worktree-support)
 */

import Store from 'electron-store';
import type { WindowBounds } from '../../renderer/types';

const MAX_RECENT_PROJECTS = 10;
const DEFAULT_HANG_THRESHOLD = 300000; // 5 minutes in milliseconds
const DEFAULT_MCP_PORT = 3001;
const DEFAULT_MCP_ENABLED = true;

/**
 * Layout values for UI panes
 */
export interface LayoutValues {
  leftPaneWidth: number;
  rightPaneWidth: number;
  bottomPaneHeight: number;
  agentListHeight: number;
  projectAgentPanelHeight?: number;
}

/**
 * Default layout values (synced with App.tsx)
 */
export const DEFAULT_LAYOUT: LayoutValues = {
  leftPaneWidth: 320,    // w-80 = 20rem = 320px
  rightPaneWidth: 360,   // 360px
  bottomPaneHeight: 240, // h-60 = 15rem = 240px
  agentListHeight: 200,  // Agent一覧パネルの高さ（右サイドバー）
  projectAgentPanelHeight: 160, // ProjectAgentPanelの高さ（左サイドバー）
};

/**
 * MCP Server configuration settings
 * Requirements: 5.3, 6.1 (mcp-server-integration)
 */
export interface McpSettings {
  /** MCPサーバー有効フラグ */
  enabled: boolean;
  /** ポート番号（デフォルト: 3001） */
  port: number;
}

/**
 * Default MCP Server settings
 */
export const DEFAULT_MCP_SETTINGS: McpSettings = {
  enabled: DEFAULT_MCP_ENABLED,
  port: DEFAULT_MCP_PORT,
};

/**
 * Multi-window state for persistence
 * Requirements: 4.1-4.6
 */
export interface MultiWindowState {
  projectPath: string;
  bounds: WindowBounds;
  isMaximized: boolean;
  isMinimized: boolean;
}

interface AppConfig {
  recentProjects: string[];
  windowBounds: WindowBounds | null;
  hangThreshold: number;
  version: number;
  multiWindowStates: MultiWindowState[];
  // bugs-worktree-support: Default worktree mode for bugs
  bugsWorktreeDefault: boolean;
  // App-wide layout settings (moved from project-specific storage)
  layout: LayoutValues | null;
  // mcp-server-integration: MCP server settings
  mcpServer: McpSettings | null;
}

const schema = {
  recentProjects: {
    type: 'array',
    default: [],
    items: {
      type: 'string',
    },
  },
  windowBounds: {
    type: ['object', 'null'],
    default: null,
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      width: { type: 'number' },
      height: { type: 'number' },
    },
  },
  hangThreshold: {
    type: 'number',
    default: DEFAULT_HANG_THRESHOLD,
  },
  version: {
    type: 'number',
    default: 1,
  },
  multiWindowStates: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        projectPath: { type: 'string' },
        bounds: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
        isMaximized: { type: 'boolean' },
        isMinimized: { type: 'boolean' },
      },
    },
  },
  // bugs-worktree-support: Default worktree mode for bugs
  bugsWorktreeDefault: {
    type: 'boolean',
    default: false,
  },
  // App-wide layout settings
  layout: {
    type: ['object', 'null'],
    default: null,
    properties: {
      leftPaneWidth: { type: 'number' },
      rightPaneWidth: { type: 'number' },
      bottomPaneHeight: { type: 'number' },
      agentListHeight: { type: 'number' },
      projectAgentPanelHeight: { type: 'number' },
    },
  },
  // mcp-server-integration: MCP server settings
  mcpServer: {
    type: ['object', 'null'],
    default: null,
    properties: {
      enabled: { type: 'boolean' },
      port: { type: 'number' },
    },
  },
} as const;

export class ConfigStore {
  private store: Store<AppConfig>;

  constructor(store?: Store<AppConfig>) {
    this.store = store ?? new Store<AppConfig>({ schema: schema as unknown as Store.Schema<AppConfig> });
  }

  /**
   * Get recent projects list
   */
  getRecentProjects(): string[] {
    return this.store.get('recentProjects', []);
  }

  /**
   * Add a project to recent projects
   */
  addRecentProject(path: string): void {
    const projects = this.getRecentProjects();

    // Remove if already exists
    const filteredProjects = projects.filter((p) => p !== path);

    // Add to beginning
    const newProjects = [path, ...filteredProjects].slice(0, MAX_RECENT_PROJECTS);

    this.store.set('recentProjects', newProjects);
  }

  /**
   * Remove a project from recent projects
   */
  removeRecentProject(path: string): void {
    const projects = this.getRecentProjects();
    const newProjects = projects.filter((p) => p !== path);
    this.store.set('recentProjects', newProjects);
  }

  /**
   * Get window bounds
   */
  getWindowBounds(): WindowBounds | null {
    const bounds = this.store.get('windowBounds');
    return bounds ?? null;
  }

  /**
   * Set window bounds
   */
  setWindowBounds(bounds: WindowBounds): void {
    this.store.set('windowBounds', bounds);
  }

  /**
   * Get hang threshold in milliseconds
   * Requirements: 5.4, 13.1, 13.2
   */
  getHangThreshold(): number {
    const threshold = this.store.get('hangThreshold');
    return threshold ?? DEFAULT_HANG_THRESHOLD;
  }

  /**
   * Set hang threshold in milliseconds
   * Requirements: 5.4, 13.1, 13.2
   */
  setHangThreshold(thresholdMs: number): void {
    this.store.set('hangThreshold', thresholdMs);
  }

  /**
   * Get multi-window states
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   */
  getMultiWindowStates(): MultiWindowState[] {
    const states = this.store.get('multiWindowStates');
    if (states && states.length > 0) {
      return states;
    }

    // Migration: multiWindowStates doesn't exist yet
    const legacyBounds = this.store.get('windowBounds');
    if (legacyBounds) {
      // Restore single window state from legacy windowBounds
      // projectPath is empty to show project selection screen
      return [{
        projectPath: '',
        bounds: legacyBounds,
        isMaximized: false,
        isMinimized: false,
      }];
    }

    // Initial launch or no state file: return empty array
    return [];
  }

  /**
   * Set multi-window states
   * Requirements: 4.1, 4.5
   */
  setMultiWindowStates(states: MultiWindowState[]): void {
    this.store.set('multiWindowStates', states);
  }

  // ============================================================
  // bugs-worktree-support Task 8.1: Bugs worktree default setting
  // Requirements: 9.2, 9.3, 9.4
  // ============================================================

  /**
   * Get bugs worktree default setting
   * Requirements: 9.2, 9.3
   * @returns true if worktree should be used by default for bugs
   */
  getBugsWorktreeDefault(): boolean {
    const value = this.store.get('bugsWorktreeDefault');
    return value ?? false; // Default is OFF
  }

  /**
   * Set bugs worktree default setting
   * Requirements: 9.2
   * @param value - true to use worktree by default
   */
  setBugsWorktreeDefault(value: boolean): void {
    this.store.set('bugsWorktreeDefault', value);
  }

  // ============================================================
  // Layout Settings (app-wide, moved from project-specific storage)
  // ============================================================

  /**
   * Get layout settings
   * @returns Layout values or null if not set (use DEFAULT_LAYOUT)
   */
  getLayout(): LayoutValues | null {
    const layout = this.store.get('layout');
    return layout ?? null;
  }

  /**
   * Set layout settings
   * @param layout - Layout values to save
   */
  setLayout(layout: LayoutValues): void {
    this.store.set('layout', layout);
  }

  /**
   * Reset layout to default values
   */
  resetLayout(): void {
    this.store.set('layout', DEFAULT_LAYOUT);
  }

  // ============================================================
  // mcp-server-integration Task 1.2: MCP Server Settings
  // Requirements: 5.3, 6.1
  // ============================================================

  /**
   * Get MCP server settings
   * Requirements: 5.3, 6.1
   * @returns MCP settings with defaults merged for missing fields
   */
  getMcpSettings(): McpSettings {
    const stored = this.store.get('mcpServer');
    if (!stored) {
      return DEFAULT_MCP_SETTINGS;
    }
    // Merge with defaults to handle partial settings
    return {
      enabled: stored.enabled ?? DEFAULT_MCP_SETTINGS.enabled,
      port: stored.port ?? DEFAULT_MCP_SETTINGS.port,
    };
  }

  /**
   * Set MCP server settings
   * Requirements: 5.3
   * @param settings - MCP settings to save
   */
  setMcpSettings(settings: McpSettings): void {
    this.store.set('mcpServer', settings);
  }
}

// Singleton instance
let configStore: ConfigStore | null = null;

export function getConfigStore(): ConfigStore {
  if (!configStore) {
    configStore = new ConfigStore();
  }
  return configStore;
}
