/**
 * Config Store Service
 * Handles application configuration persistence
 * Requirements: 1.4, 1.5
 */

import Store from 'electron-store';
import type { WindowBounds } from '../../renderer/types';

const MAX_RECENT_PROJECTS = 10;
const DEFAULT_HANG_THRESHOLD = 300000; // 5 minutes in milliseconds

interface AppConfig {
  recentProjects: string[];
  windowBounds: WindowBounds | null;
  hangThreshold: number;
  version: number;
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
}

// Singleton instance
let configStore: ConfigStore | null = null;

export function getConfigStore(): ConfigStore {
  if (!configStore) {
    configStore = new ConfigStore();
  }
  return configStore;
}
