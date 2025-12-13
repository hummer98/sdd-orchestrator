/**
 * SSH IPC Handlers
 * Manages IPC communication for SSH connection and remote project management
 * Requirements: 1.1, 2.1, 6.1, 7.1, 7.2
 */

import { ipcMain, BrowserWindow } from 'electron';
import { SSH_IPC_CHANNELS } from './sshChannels';
import {
  sshConnectionService,
  sshUriParser,
  providerFactory,
  getRecentRemoteProjectsService,
  type ConnectionStatus,
} from '../services/ssh';
import { logger } from '../services/logger';

/**
 * Register SSH-related IPC handlers
 */
export function registerSSHHandlers(): void {
  logger.info('[sshHandlers] Registering SSH IPC handlers');

  // SSH_CONNECT - Connect to SSH server
  // Requirements: 1.1, 2.1
  ipcMain.handle(
    SSH_IPC_CHANNELS.SSH_CONNECT,
    async (_event, uri: string, _options?: { onPasswordRequired?: boolean; onPassphraseRequired?: boolean; onHostKeyVerification?: boolean }) => {
      logger.info('[sshHandlers] SSH_CONNECT called', { uri });

      // Parse URI
      const parseResult = sshUriParser.parse(uri);
      if (!parseResult.ok) {
        logger.error('[sshHandlers] Invalid SSH URI', { error: parseResult.error });
        return {
          ok: false,
          error: {
            type: 'INVALID_URI',
            message: `Invalid SSH URI: ${parseResult.error.type}`,
          },
        };
      }

      // Configure connection service
      const connectionService = sshConnectionService;

      // Connect
      const result = await connectionService.connect(parseResult.value);

      if (result.ok) {
        // Configure provider factory with the active connection
        providerFactory.setSSHConnectionService(connectionService);

        // Add to recent projects
        const recentProjects = getRecentRemoteProjectsService();
        recentProjects.addRecentRemoteProject(
          uri,
          parseResult.value.host,
          true
        );

        logger.info('[sshHandlers] SSH connection successful');
      } else {
        // Update recent projects with failed status
        const recentProjects = getRecentRemoteProjectsService();
        recentProjects.updateConnectionStatus(uri, false);

        logger.error('[sshHandlers] SSH connection failed', { error: result.error });
      }

      return result;
    }
  );

  // SSH_DISCONNECT - Disconnect from SSH server
  // Requirements: 6.5
  ipcMain.handle(SSH_IPC_CHANNELS.SSH_DISCONNECT, async () => {
    logger.info('[sshHandlers] SSH_DISCONNECT called');

    await sshConnectionService.disconnect();
    providerFactory.clearSSHProviders();

    logger.info('[sshHandlers] SSH disconnected');
  });

  // SSH_GET_STATUS - Get current connection status
  // Requirements: 6.1
  ipcMain.handle(SSH_IPC_CHANNELS.SSH_GET_STATUS, async () => {
    logger.debug('[sshHandlers] SSH_GET_STATUS called');
    return sshConnectionService.getStatus();
  });

  // SSH_GET_CONNECTION_INFO - Get connection information
  // Requirements: 6.6
  ipcMain.handle(SSH_IPC_CHANNELS.SSH_GET_CONNECTION_INFO, async () => {
    logger.debug('[sshHandlers] SSH_GET_CONNECTION_INFO called');
    return sshConnectionService.getConnectionInfo();
  });

  // SSH_GET_RECENT_REMOTE_PROJECTS - Get recent remote projects
  // Requirements: 8.2
  ipcMain.handle(SSH_IPC_CHANNELS.SSH_GET_RECENT_REMOTE_PROJECTS, async () => {
    logger.debug('[sshHandlers] SSH_GET_RECENT_REMOTE_PROJECTS called');
    return getRecentRemoteProjectsService().getRecentRemoteProjects();
  });

  // SSH_ADD_RECENT_REMOTE_PROJECT - Add to recent remote projects
  // Requirements: 8.1
  ipcMain.handle(
    SSH_IPC_CHANNELS.SSH_ADD_RECENT_REMOTE_PROJECT,
    async (_event, uri: string, displayName: string, connectionSuccessful: boolean = true) => {
      logger.info('[sshHandlers] SSH_ADD_RECENT_REMOTE_PROJECT called', { uri, displayName });
      getRecentRemoteProjectsService().addRecentRemoteProject(uri, displayName, connectionSuccessful);
    }
  );

  // SSH_REMOVE_RECENT_REMOTE_PROJECT - Remove from recent remote projects
  // Requirements: 8.5
  ipcMain.handle(
    SSH_IPC_CHANNELS.SSH_REMOVE_RECENT_REMOTE_PROJECT,
    async (_event, uri: string) => {
      logger.info('[sshHandlers] SSH_REMOVE_RECENT_REMOTE_PROJECT called', { uri });
      getRecentRemoteProjectsService().removeRecentRemoteProject(uri);
    }
  );
}

/**
 * Set up SSH status change notifications to renderer
 * Forwards connection status changes to all open windows
 */
export function setupSSHStatusNotifications(): void {
  sshConnectionService.onStatusChange((status: ConnectionStatus) => {
    logger.debug('[sshHandlers] SSH status changed', { status });

    // Send to all windows
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(SSH_IPC_CHANNELS.SSH_STATUS_CHANGED, status);
      }
    }
  });

  // Store unsubscribe for cleanup if needed
  logger.info('[sshHandlers] SSH status notifications set up');
}

/**
 * Clean up SSH handlers (for testing)
 */
export function cleanupSSHHandlers(): void {
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_CONNECT);
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_DISCONNECT);
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_GET_STATUS);
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_GET_CONNECTION_INFO);
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_GET_RECENT_REMOTE_PROJECTS);
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_ADD_RECENT_REMOTE_PROJECT);
  ipcMain.removeHandler(SSH_IPC_CHANNELS.SSH_REMOVE_RECENT_REMOTE_PROJECT);

  logger.info('[sshHandlers] SSH handlers cleaned up');
}
