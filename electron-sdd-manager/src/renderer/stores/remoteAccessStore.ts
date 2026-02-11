/**
 * Remote Access Store
 * Manages remote access server state in the renderer process
 * Requirements: 1.4, 1.5, 1.6, 8.5
 * Cloudflare Tunnel Integration: 5.2, 6.1, 6.2, 3.3, 5.1, 6.3
 *
 * remote-ui-auto-start Task 5.1: autoStartEnabled removed
 * Auto-start setting is now stored in project config (.kiro/sdd-orchestrator.json)
 * instead of LocalStorage to enable per-project configuration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// trpc-full-migration Task 10.6: Use tRPC vanilla client for misc/cloudflare operations
import { getVanillaClient } from '../../shared/trpc/vanillaClient';

/**
 * LocalStorage key for persisted state
 */
export const STORAGE_KEY = 'sdd-manager-remote-access';

/**
 * Tunnel status types
 */
type TunnelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Remote Access State
 * Requirements: 1.4, 1.5, 1.6, 8.5
 * Cloudflare Tunnel: 5.2, 6.1, 6.2
 */
interface RemoteAccessState {
  /** Server is running */
  isRunning: boolean;
  /** Server port */
  port: number | null;
  /** Connection URL */
  url: string | null;
  /** QR code data URL */
  qrCodeDataUrl: string | null;
  /** Number of connected clients */
  clientCount: number;
  /** Error message */
  error: string | null;
  /** Local IP address */
  localIp: string | null;
  /** Loading state */
  isLoading: boolean;

  // Cloudflare Tunnel state (Task 7.1, 9.1-9.4)
  /** Whether to publish via Cloudflare Tunnel (persisted) */
  publishToCloudflare: boolean;
  /** Cloudflare Tunnel URL */
  tunnelUrl: string | null;
  /** QR code for Tunnel URL with access token */
  tunnelQrCodeDataUrl: string | null;
  /** Tunnel connection status */
  tunnelStatus: TunnelStatus;
  /** Tunnel error message */
  tunnelError: string | null;
  /** Access token for authentication */
  accessToken: string | null;
  /** Whether to show cloudflared install dialog */
  showInstallCloudflaredDialog: boolean;
  /** Whether Tunnel Token is configured (Task 9.1) */
  hasTunnelToken: boolean;
}

/**
 * Remote Access Actions
 */
interface RemoteAccessActions {
  /** Start the remote access server */
  startServer: (preferredPort?: number) => Promise<void>;
  /** Stop the remote access server */
  stopServer: () => Promise<void>;
  /** Update status from IPC event */
  updateStatus: (status: Partial<RemoteAccessState>) => void;
  /** Clear error message */
  clearError: () => void;
  /** Initialize store and subscribe to events */
  initialize: () => Promise<void>;
  /** Cleanup subscriptions */
  cleanup: () => void;
  /** Reset store to initial state */
  reset: () => void;

  // Cloudflare Tunnel actions (Task 7.2, 9.4)
  /** Set publish to Cloudflare setting (persisted) */
  setPublishToCloudflare: (enabled: boolean) => void;
  /** Dismiss cloudflared install dialog */
  dismissInstallDialog: () => void;
  /** Refresh access token (Task 9.4) */
  refreshAccessToken: () => Promise<void>;
  /** Load Cloudflare settings from main process (Task 9.1) */
  loadCloudflareSettings: () => Promise<void>;
}

type RemoteAccessStore = RemoteAccessState & RemoteAccessActions;

/**
 * Initial state
 */
const initialState: RemoteAccessState = {
  isRunning: false,
  port: null,
  url: null,
  qrCodeDataUrl: null,
  clientCount: 0,
  error: null,
  localIp: null,
  isLoading: false,

  // Cloudflare Tunnel initial state
  publishToCloudflare: false,
  tunnelUrl: null,
  tunnelQrCodeDataUrl: null,
  tunnelStatus: 'disconnected',
  tunnelError: null,
  accessToken: null,
  showInstallCloudflaredDialog: false,
  hasTunnelToken: false,
};

/**
 * Unsubscribe function for status change listener
 */
let statusUnsubscribe: (() => void) | null = null;

/**
 * Convert server error to user-friendly message
 */
function getErrorMessage(error: {
  type: 'NO_AVAILABLE_PORT' | 'ALREADY_RUNNING' | 'NETWORK_ERROR';
  triedPorts?: number[];
  port?: number;
  message?: string;
}): string {
  switch (error.type) {
    case 'NO_AVAILABLE_PORT':
      return `No available port found. Tried ports: ${error.triedPorts?.join(', ')}`;
    case 'ALREADY_RUNNING':
      return `Server is already running on port ${error.port}`;
    case 'NETWORK_ERROR':
      return `Network error: ${error.message}`;
    default:
      return 'Unknown error occurred';
  }
}

/**
 * Remote Access Store
 *
 * Manages the state of the remote access server in the renderer process.
 * Uses zustand for state management with persist middleware for auto-start setting.
 *
 * @example
 * const { isRunning, startServer, stopServer } = useRemoteAccessStore();
 *
 * // Start server
 * await startServer();
 *
 * // Stop server
 * await stopServer();
 */
export const useRemoteAccessStore = create<RemoteAccessStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Start the remote access server
       * Requirements: 1.1 - Start HTTP/WebSocket server
       *
       * @param preferredPort Optional preferred port (default: 8765)
       */
      startServer: async (preferredPort?: number) => {
        set({ isLoading: true, error: null });

        try {
          // trpc-full-migration Task 10.6: Use tRPC for startRemoteServer
          const result = await getVanillaClient().misc.startRemoteServer.mutate({ preferredPort });
          console.log('[remoteAccessStore] startServer result:', result);
          console.log('[remoteAccessStore] qrCodeDataUrl received:', result.ok ? result.value.qrCodeDataUrl?.substring(0, 50) + '...' : 'N/A');

          if (result.ok) {
            // Determine tunnel status based on tunnelUrl
            const tunnelStatus = result.value.tunnelUrl ? 'connected' : 'disconnected';

            set({
              isRunning: true,
              port: result.value.port,
              url: result.value.url,
              qrCodeDataUrl: result.value.qrCodeDataUrl,
              localIp: result.value.localIp,
              // Cloudflare Tunnel state
              tunnelUrl: result.value.tunnelUrl ?? null,
              tunnelQrCodeDataUrl: result.value.tunnelQrCodeDataUrl ?? null,
              tunnelStatus,
              accessToken: result.value.accessToken ?? null,
              error: null,
              isLoading: false,
            });
            console.log('[remoteAccessStore] State after set:', get());
          } else {
            set({
              isRunning: false,
              error: getErrorMessage(result.error),
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            isRunning: false,
            error: `Failed to start server: ${error instanceof Error ? error.message : String(error)}`,
            isLoading: false,
          });
        }
      },

      /**
       * Stop the remote access server
       * Requirements: 1.2 - Stop server and disconnect all clients
       */
      stopServer: async () => {
        set({ isLoading: true, error: null });

        try {
          // trpc-full-migration Task 10.6: Use tRPC for stopRemoteServer
          await getVanillaClient().misc.stopRemoteServer.mutate();

          set({
            isRunning: false,
            port: null,
            url: null,
            qrCodeDataUrl: null,
            localIp: null,
            clientCount: 0,
            isLoading: false,
            // Clear Tunnel state but preserve accessToken for next session
            tunnelUrl: null,
            tunnelQrCodeDataUrl: null,
            tunnelStatus: 'disconnected',
          });
        } catch (error) {
          set({
            error: `Failed to stop server: ${error instanceof Error ? error.message : String(error)}`,
            isLoading: false,
          });
        }
      },

      /**
       * Update status from IPC event
       * Requirements: 1.6 - Real-time status updates
       */
      updateStatus: (status: Partial<RemoteAccessState>) => {
        set(status);
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Initialize store and subscribe to events
       * Requirements: 1.6, 8.5 - Subscribe to status changes
       */
      initialize: async () => {
        // Fetch current server status
        try {
          // trpc-full-migration Task 10.6: Use tRPC for getRemoteServerStatus
          const status = await getVanillaClient().misc.getRemoteServerStatus.query();
          set({
            isRunning: status.running,
            port: status.port,
            url: status.url,
            clientCount: status.clientCount,
          });
        } catch (error) {
          console.error('[remoteAccessStore] Failed to get initial status:', error);
        }

        // Load Cloudflare settings (Task 9.1)
        try {
          // trpc-full-migration Task 10.6: Use tRPC for getCloudflareSettings
          const settings = await getVanillaClient().cloudflare.getSettings.query();
          set({
            hasTunnelToken: settings.hasTunnelToken,
          });
        } catch (error) {
          console.error('[remoteAccessStore] Failed to load Cloudflare settings:', error);
        }

        // Subscribe to status changes
        // Task 9.2: window.electronAPI.onRemoteServerStatusChanged -> tRPC Subscription
        // Note: ServerStatus does not include qrCodeDataUrl, so we preserve existing value
        // Skip updates while loading to avoid race condition with startServer result
        // Dynamic import to avoid bundling electron-trpc in Remote UI
        try {
          const { getVanillaClient: getClient } = await import('../../shared/trpc/vanillaClient');
          const sub = getClient().events.onRemoteServerStatusChanged.subscribe(undefined, {
            onData: (status: Record<string, unknown>) => {
              if (!status || !('isRunning' in status)) return; // phantom data guard
              const typedStatus = status as { isRunning: boolean; port: number | null; url: string | null; clientCount: number };
              const { qrCodeDataUrl, localIp, isLoading } = get();

              // Skip update if we're in the middle of startServer - it will set the correct state
              if (isLoading) {
                return;
              }

              set({
                isRunning: typedStatus.isRunning,
                port: typedStatus.port,
                url: typedStatus.url,
                clientCount: typedStatus.clientCount,
                // Preserve qrCodeDataUrl and localIp (only available from startServer result)
                // Clear them when server stops
                qrCodeDataUrl: typedStatus.isRunning ? qrCodeDataUrl : null,
                localIp: typedStatus.isRunning ? localIp : null,
              });
            },
          });
          statusUnsubscribe = () => sub.unsubscribe();
        } catch (error) {
          console.warn('[remoteAccessStore] Failed to subscribe via tRPC', error);
          // trpc-full-migration Task 10.6: Removed IPC fallback (tRPC is the only communication path)
        }
      },

      /**
       * Cleanup subscriptions
       */
      cleanup: () => {
        if (statusUnsubscribe) {
          statusUnsubscribe();
          statusUnsubscribe = null;
        }
      },

      /**
       * Reset store to initial state
       * Preserves publishToCloudflare as it is persisted
       * Note: autoStartEnabled was removed in remote-ui-auto-start Task 5.1
       */
      reset: () => {
        const { publishToCloudflare } = get();
        set({
          ...initialState,
          publishToCloudflare, // Preserve persisted value
        });
      },

      // Cloudflare Tunnel actions (Task 7.2)

      /**
       * Set publish to Cloudflare setting
       * This value is persisted to localStorage
       */
      setPublishToCloudflare: (enabled: boolean) => {
        set({ publishToCloudflare: enabled });
      },

      /**
       * Dismiss cloudflared install dialog
       */
      dismissInstallDialog: () => {
        set({ showInstallCloudflaredDialog: false });
      },

      /**
       * Refresh access token (Task 9.4)
       * Generates a new access token and updates the QR code
       */
      refreshAccessToken: async () => {
        try {
          // trpc-full-migration Task 10.6: Use tRPC for refreshAccessToken
          const result = await getVanillaClient().misc.refreshAccessToken.mutate();
          if (result && result.ok) {
            set({
              accessToken: result.value.accessToken,
              tunnelQrCodeDataUrl: result.value.tunnelQrCodeDataUrl ?? null,
            });
          }
        } catch (error) {
          console.error('[remoteAccessStore] Failed to refresh access token:', error);
        }
      },

      /**
       * Load Cloudflare settings from main process (Task 9.1)
       * Checks if Tunnel Token is configured
       */
      loadCloudflareSettings: async () => {
        try {
          // trpc-full-migration Task 10.6: Use tRPC for getCloudflareSettings
          const settings = await getVanillaClient().cloudflare.getSettings.query();
          set({
            hasTunnelToken: settings.hasTunnelToken,
          });
        } catch (error) {
          console.error('[remoteAccessStore] Failed to load Cloudflare settings:', error);
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        // Only persist publishToCloudflare
        // Note: autoStartEnabled was removed in remote-ui-auto-start Task 5.1
        // Auto-start is now stored per-project in .kiro/sdd-orchestrator.json
        publishToCloudflare: state.publishToCloudflare,
      }),
    }
  )
);
