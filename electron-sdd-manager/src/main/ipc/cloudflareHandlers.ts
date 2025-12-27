/**
 * Cloudflare IPC Handlers
 * Manages IPC communication for Cloudflare Tunnel integration
 * Requirements: 1.2, 2.1, 2.2, 2.3, 3.1, 3.3, 4.1, 4.2, 4.3
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { getCloudflareConfigStore } from '../services/cloudflareConfigStore';
import { getAccessTokenService } from '../services/accessTokenService';
import { getCloudflaredBinaryChecker } from '../services/cloudflaredBinaryChecker';
import { getCloudflareTunnelManager } from '../services/cloudflareTunnelManager';
import { logger } from '../services/logger';

/**
 * Binary check result with optional install instructions
 */
export interface BinaryCheckResponse {
  exists: boolean;
  path?: string;
  installInstructions?: {
    homebrew: string;
    macports: string;
    downloadUrl: string;
  };
}

/**
 * Register Cloudflare IPC handlers
 *
 * Registers handlers for:
 * - CLOUDFLARE_GET_SETTINGS: Get all Cloudflare settings
 * - CLOUDFLARE_SET_TUNNEL_TOKEN: Set the tunnel token
 * - CLOUDFLARE_REFRESH_ACCESS_TOKEN: Refresh the access token
 * - CLOUDFLARE_ENSURE_ACCESS_TOKEN: Ensure access token exists
 * - CLOUDFLARE_CHECK_BINARY: Check if cloudflared binary exists
 * - CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE: Set publish setting
 * - CLOUDFLARE_SET_CLOUDFLARED_PATH: Set custom cloudflared path
 * - CLOUDFLARE_START_TUNNEL: Start the Cloudflare tunnel
 * - CLOUDFLARE_STOP_TUNNEL: Stop the Cloudflare tunnel
 * - CLOUDFLARE_GET_TUNNEL_STATUS: Get tunnel status
 */
export function registerCloudflareHandlers(): void {
  const configStore = getCloudflareConfigStore();
  const accessTokenService = getAccessTokenService();
  const binaryChecker = getCloudflaredBinaryChecker();
  const tunnelManager = getCloudflareTunnelManager();

  // CLOUDFLARE_GET_SETTINGS handler
  // Requirements: 2.1, 2.2, 2.3
  ipcMain.handle(IPC_CHANNELS.CLOUDFLARE_GET_SETTINGS, async () => {
    logger.debug('[cloudflareHandlers] CLOUDFLARE_GET_SETTINGS called');
    return configStore.getAllSettings();
  });

  // CLOUDFLARE_SET_TUNNEL_TOKEN handler
  // Requirements: 2.2
  ipcMain.handle(
    IPC_CHANNELS.CLOUDFLARE_SET_TUNNEL_TOKEN,
    async (_event, token: string) => {
      logger.info('[cloudflareHandlers] CLOUDFLARE_SET_TUNNEL_TOKEN called');
      configStore.setTunnelToken(token);
    }
  );

  // CLOUDFLARE_REFRESH_ACCESS_TOKEN handler
  // Requirements: 3.3
  ipcMain.handle(IPC_CHANNELS.CLOUDFLARE_REFRESH_ACCESS_TOKEN, async () => {
    logger.info('[cloudflareHandlers] CLOUDFLARE_REFRESH_ACCESS_TOKEN called');
    return accessTokenService.refreshToken();
  });

  // CLOUDFLARE_ENSURE_ACCESS_TOKEN handler
  // Requirements: 3.1
  ipcMain.handle(IPC_CHANNELS.CLOUDFLARE_ENSURE_ACCESS_TOKEN, async () => {
    logger.debug('[cloudflareHandlers] CLOUDFLARE_ENSURE_ACCESS_TOKEN called');
    return accessTokenService.ensureToken();
  });

  // CLOUDFLARE_CHECK_BINARY handler
  // Requirements: 4.1, 4.2
  ipcMain.handle(IPC_CHANNELS.CLOUDFLARE_CHECK_BINARY, async (): Promise<BinaryCheckResponse> => {
    logger.debug('[cloudflareHandlers] CLOUDFLARE_CHECK_BINARY called');
    const result = await binaryChecker.checkBinaryExists();

    if (result.exists) {
      return {
        exists: true,
        path: result.path,
      };
    }

    return {
      exists: false,
      installInstructions: binaryChecker.getInstallInstructions(),
    };
  });

  // CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE handler
  // Requirements: 5.1
  ipcMain.handle(
    IPC_CHANNELS.CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE,
    async (_event, enabled: boolean) => {
      logger.info('[cloudflareHandlers] CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE called', { enabled });
      configStore.setPublishToCloudflare(enabled);
    }
  );

  // CLOUDFLARE_SET_CLOUDFLARED_PATH handler
  // Requirements: 4.5
  ipcMain.handle(
    IPC_CHANNELS.CLOUDFLARE_SET_CLOUDFLARED_PATH,
    async (_event, path: string | null) => {
      logger.info('[cloudflareHandlers] CLOUDFLARE_SET_CLOUDFLARED_PATH called', { path });
      configStore.setCloudflaredPath(path);
    }
  );

  // CLOUDFLARE_START_TUNNEL handler
  // Requirements: 1.1, 4.3, 4.4
  ipcMain.handle(
    IPC_CHANNELS.CLOUDFLARE_START_TUNNEL,
    async (_event, localPort: number) => {
      logger.info('[cloudflareHandlers] CLOUDFLARE_START_TUNNEL called', { localPort });
      return tunnelManager.start(localPort);
    }
  );

  // CLOUDFLARE_STOP_TUNNEL handler
  // Requirements: 2.4
  ipcMain.handle(IPC_CHANNELS.CLOUDFLARE_STOP_TUNNEL, async () => {
    logger.info('[cloudflareHandlers] CLOUDFLARE_STOP_TUNNEL called');
    return tunnelManager.stop();
  });

  // CLOUDFLARE_GET_TUNNEL_STATUS handler
  // Requirements: 4.4
  ipcMain.handle(IPC_CHANNELS.CLOUDFLARE_GET_TUNNEL_STATUS, async () => {
    logger.debug('[cloudflareHandlers] CLOUDFLARE_GET_TUNNEL_STATUS called');
    return tunnelManager.getStatus();
  });
}

/**
 * Set up tunnel status change notifications to renderer
 *
 * Subscribes to tunnel status changes and forwards them
 * to all open BrowserWindows via IPC.
 */
export function setupTunnelStatusNotifications(): void {
  const tunnelManager = getCloudflareTunnelManager();

  tunnelManager.onStatusChange((status) => {
    logger.debug('[cloudflareHandlers] Tunnel status changed', { status });

    // Send to all windows
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.CLOUDFLARE_TUNNEL_STATUS_CHANGED, status);
      }
    }
  });
}

/**
 * Clean up handlers (for testing)
 */
export function cleanupCloudflareHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_GET_SETTINGS);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_SET_TUNNEL_TOKEN);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_REFRESH_ACCESS_TOKEN);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_ENSURE_ACCESS_TOKEN);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_CHECK_BINARY);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_SET_CLOUDFLARED_PATH);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_START_TUNNEL);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_STOP_TUNNEL);
  ipcMain.removeHandler(IPC_CHANNELS.CLOUDFLARE_GET_TUNNEL_STATUS);
}
