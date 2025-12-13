/**
 * Connection Store
 * Manages SSH connection state for remote projects
 * Requirements: 6.1, 7.1, 7.2
 */

import { create } from 'zustand';

/**
 * Connection status values
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'host-verifying'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Project type - local or SSH remote
 */
export type ProjectType = 'local' | 'ssh';

/**
 * SSH connection information
 */
export interface ConnectionInfo {
  host: string;
  port: number;
  user: string;
  connectedAt: Date;
  bytesTransferred: number;
}

/**
 * Recent remote project entry
 */
export interface RecentRemoteProject {
  uri: string;
  displayName: string;
  lastConnectedAt: string;
  connectionSuccessful: boolean;
}

/**
 * Auth dialog type
 */
export type AuthDialogType = 'password' | 'passphrase' | 'host-key';

/**
 * Auth dialog state
 */
export interface AuthDialogState {
  isOpen: boolean;
  type: AuthDialogType;
  host: string;
  user: string;
  keyPath?: string;
  fingerprint?: string;
  isNewHost?: boolean;
  resolve?: (value: string | null) => void;
}

/**
 * Project switch target
 */
export type ProjectSwitchTarget =
  | { type: 'local'; path: string }
  | { type: 'ssh'; uri: string; displayName: string };

/**
 * Project switch confirm state
 */
export interface ProjectSwitchConfirmState {
  isOpen: boolean;
  runningAgentsCount: number;
  targetProject: ProjectSwitchTarget | null;
  resolve?: (confirmed: boolean) => void;
}

/**
 * Connection state
 */
export interface ConnectionState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Connection information when connected */
  connectionInfo: ConnectionInfo | null;
  /** Current project URI (local path or SSH URI) */
  projectUri: string | null;
  /** Project type (local or ssh) */
  projectType: ProjectType;
  /** Recent remote projects */
  recentRemoteProjects: RecentRemoteProject[];
  /** Error message if any */
  error: string | null;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Auth dialog state */
  authDialog: AuthDialogState;
  /** Project switch confirm state */
  projectSwitchConfirm: ProjectSwitchConfirmState;
}

/**
 * Connection actions
 */
interface ConnectionActions {
  /** Connect to SSH remote project */
  connectSSH: (uri: string) => Promise<void>;
  /** Disconnect from SSH remote project */
  disconnectSSH: () => Promise<void>;
  /** Set local project path */
  setLocalProject: (path: string) => void;
  /** Load recent remote projects */
  loadRecentRemoteProjects: () => Promise<void>;
  /** Remove a recent remote project */
  removeRecentRemoteProject: (uri: string) => Promise<void>;
  /** Update connection status (for event handling) */
  setStatus: (status: ConnectionStatus) => void;
  /** Clear error */
  clearError: () => void;
  /** Check if current project is remote */
  isRemoteProject: () => boolean;
  /** Show auth dialog and wait for response */
  requestAuth: (options: {
    type: AuthDialogType;
    host: string;
    user: string;
    keyPath?: string;
    fingerprint?: string;
    isNewHost?: boolean;
  }) => Promise<string | null>;
  /** Submit auth dialog response */
  submitAuth: (value: string) => void;
  /** Cancel auth dialog */
  cancelAuth: () => void;
  /** Request project switch confirmation */
  requestProjectSwitchConfirm: (options: {
    runningAgentsCount: number;
    targetProject: ProjectSwitchTarget;
  }) => Promise<boolean>;
  /** Confirm project switch */
  confirmProjectSwitch: () => void;
  /** Cancel project switch */
  cancelProjectSwitch: () => void;
}

type ConnectionStore = ConnectionState & ConnectionActions;

// Initial auth dialog state
const initialAuthDialog: AuthDialogState = {
  isOpen: false,
  type: 'password',
  host: '',
  user: '',
};

// Initial project switch confirm state
const initialProjectSwitchConfirm: ProjectSwitchConfirmState = {
  isOpen: false,
  runningAgentsCount: 0,
  targetProject: null,
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  // Initial state
  status: 'disconnected',
  connectionInfo: null,
  projectUri: null,
  projectType: 'local',
  recentRemoteProjects: [],
  error: null,
  isLoading: false,
  authDialog: initialAuthDialog,
  projectSwitchConfirm: initialProjectSwitchConfirm,

  // Actions
  connectSSH: async (uri: string) => {
    set({ isLoading: true, error: null, status: 'connecting' });

    try {
      const result = await window.electronAPI.sshConnect(uri);

      if (result.ok) {
        // Get updated status and connection info
        const status = await window.electronAPI.getSSHStatus();
        const connectionInfo = await window.electronAPI.getSSHConnectionInfo();

        set({
          status: status as ConnectionStatus,
          connectionInfo,
          projectUri: uri,
          projectType: 'ssh',
          isLoading: false,
          error: null,
        });
      } else {
        set({
          status: 'error',
          error: result.error.message,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
        isLoading: false,
      });
    }
  },

  disconnectSSH: async () => {
    try {
      await window.electronAPI.sshDisconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }

    set({
      status: 'disconnected',
      connectionInfo: null,
      projectType: 'local',
    });
  },

  setLocalProject: (path: string) => {
    set({
      projectUri: path,
      projectType: 'local',
      status: 'disconnected',
      connectionInfo: null,
    });
  },

  loadRecentRemoteProjects: async () => {
    try {
      const projects = await window.electronAPI.getRecentRemoteProjects();
      set({ recentRemoteProjects: projects });
    } catch (error) {
      console.error('Failed to load recent remote projects:', error);
    }
  },

  removeRecentRemoteProject: async (uri: string) => {
    try {
      await window.electronAPI.removeRecentRemoteProject(uri);
      // Update local state
      set((state) => ({
        recentRemoteProjects: state.recentRemoteProjects.filter((p) => p.uri !== uri),
      }));
    } catch (error) {
      console.error('Failed to remove recent remote project:', error);
    }
  },

  setStatus: (status: ConnectionStatus) => {
    set({ status });
  },

  clearError: () => {
    set({ error: null });
  },

  isRemoteProject: () => {
    return get().projectType === 'ssh';
  },

  requestAuth: (options) => {
    return new Promise((resolve) => {
      set({
        authDialog: {
          isOpen: true,
          type: options.type,
          host: options.host,
          user: options.user,
          keyPath: options.keyPath,
          fingerprint: options.fingerprint,
          isNewHost: options.isNewHost,
          resolve,
        },
      });
    });
  },

  submitAuth: (value: string) => {
    const { authDialog } = get();
    if (authDialog.resolve) {
      authDialog.resolve(value);
    }
    set({ authDialog: initialAuthDialog });
  },

  cancelAuth: () => {
    const { authDialog } = get();
    if (authDialog.resolve) {
      authDialog.resolve(null);
    }
    set({ authDialog: initialAuthDialog });
  },

  requestProjectSwitchConfirm: (options) => {
    return new Promise((resolve) => {
      set({
        projectSwitchConfirm: {
          isOpen: true,
          runningAgentsCount: options.runningAgentsCount,
          targetProject: options.targetProject,
          resolve,
        },
      });
    });
  },

  confirmProjectSwitch: () => {
    const { projectSwitchConfirm } = get();
    if (projectSwitchConfirm.resolve) {
      projectSwitchConfirm.resolve(true);
    }
    set({ projectSwitchConfirm: initialProjectSwitchConfirm });
  },

  cancelProjectSwitch: () => {
    const { projectSwitchConfirm } = get();
    if (projectSwitchConfirm.resolve) {
      projectSwitchConfirm.resolve(false);
    }
    set({ projectSwitchConfirm: initialProjectSwitchConfirm });
  },
}));
