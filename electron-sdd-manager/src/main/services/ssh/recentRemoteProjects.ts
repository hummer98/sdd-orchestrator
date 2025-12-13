/**
 * Recent Remote Projects Service
 * Manages storage and retrieval of recently used SSH remote projects
 * Requirements: 8.1, 8.4, 8.6
 */

import Store from 'electron-store';

/**
 * Maximum number of recent remote projects to store
 */
const MAX_RECENT_REMOTE_PROJECTS = 10;

/**
 * Recent remote project entry
 */
export interface RecentRemoteProject {
  /** SSH URI: ssh://user@host[:port]/path */
  readonly uri: string;
  /** Display name (host or alias) */
  readonly displayName: string;
  /** Last connection timestamp (ISO string) */
  readonly lastConnectedAt: string;
  /** Whether last connection was successful */
  readonly connectionSuccessful: boolean;
}

/**
 * Store schema for remote projects
 */
interface RemoteProjectsConfig {
  recentRemoteProjects: RecentRemoteProject[];
}

const schema = {
  recentRemoteProjects: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        uri: { type: 'string' },
        displayName: { type: 'string' },
        lastConnectedAt: { type: 'string' },
        connectionSuccessful: { type: 'boolean' },
      },
      required: ['uri', 'displayName', 'lastConnectedAt', 'connectionSuccessful'],
    },
  },
} as const;

/**
 * Recent Remote Projects Service
 * Handles persistence of recently used SSH remote projects
 */
export class RecentRemoteProjectsService {
  private store: Store<RemoteProjectsConfig>;

  constructor(store?: Store<RemoteProjectsConfig>) {
    this.store = store ?? new Store<RemoteProjectsConfig>({
      name: 'remote-projects',
      schema: schema as unknown as Store.Schema<RemoteProjectsConfig>,
    });
  }

  /**
   * Get all recent remote projects
   */
  getRecentRemoteProjects(): RecentRemoteProject[] {
    return this.store.get('recentRemoteProjects', []);
  }

  /**
   * Add or update a remote project in the recent list
   * Moves to top if already exists, adds new entry otherwise
   *
   * @param uri - SSH URI
   * @param displayName - Display name
   * @param connectionSuccessful - Whether connection was successful
   */
  addRecentRemoteProject(
    uri: string,
    displayName: string,
    connectionSuccessful: boolean = true
  ): void {
    const projects = this.getRecentRemoteProjects();

    // Remove existing entry if present
    const filteredProjects = projects.filter((p) => p.uri !== uri);

    // Create new entry
    const newEntry: RecentRemoteProject = {
      uri,
      displayName,
      lastConnectedAt: new Date().toISOString(),
      connectionSuccessful,
    };

    // Add to beginning and limit to max
    const newProjects = [newEntry, ...filteredProjects].slice(0, MAX_RECENT_REMOTE_PROJECTS);

    this.store.set('recentRemoteProjects', newProjects);
  }

  /**
   * Remove a remote project from the recent list
   *
   * @param uri - SSH URI to remove
   */
  removeRecentRemoteProject(uri: string): void {
    const projects = this.getRecentRemoteProjects();
    const newProjects = projects.filter((p) => p.uri !== uri);
    this.store.set('recentRemoteProjects', newProjects);
  }

  /**
   * Update connection status for an existing project
   *
   * @param uri - SSH URI
   * @param connectionSuccessful - New connection status
   */
  updateConnectionStatus(uri: string, connectionSuccessful: boolean): void {
    const projects = this.getRecentRemoteProjects();

    const updatedProjects = projects.map((p) => {
      if (p.uri === uri) {
        return {
          ...p,
          connectionSuccessful,
          lastConnectedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    this.store.set('recentRemoteProjects', updatedProjects);
  }

  /**
   * Clear all recent remote projects
   */
  clearAllRemoteProjects(): void {
    this.store.set('recentRemoteProjects', []);
  }
}

// Singleton instance
let recentRemoteProjectsService: RecentRemoteProjectsService | null = null;

export function getRecentRemoteProjectsService(): RecentRemoteProjectsService {
  if (!recentRemoteProjectsService) {
    recentRemoteProjectsService = new RecentRemoteProjectsService();
  }
  return recentRemoteProjectsService;
}
