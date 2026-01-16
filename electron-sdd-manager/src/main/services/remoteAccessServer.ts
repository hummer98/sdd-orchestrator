/**
 * Remote Access Server Service
 * HTTP/WebSocket server for mobile remote access
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 * Cloudflare Tunnel Integration: 1.1-1.5, 6.5, 7.1, 7.2
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer } from 'ws';
import * as QRCode from 'qrcode';
import { join } from 'path';
import { getLocalIP } from '../utils/ipValidator';
import { StaticFileServer } from './staticFileServer';
import { WebSocketHandler } from './webSocketHandler';
import { getAccessTokenService, AccessTokenService } from './accessTokenService';
import { CloudflareTunnelManager } from './cloudflareTunnelManager';
import { logger } from './logger';

/**
 * Tunnel status types
 */
export type TunnelStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Result of successfully starting the server
 * Extended to include Cloudflare Tunnel information
 */
export interface ServerStartResult {
  /** The port the server is running on */
  readonly port: number;
  /** The full URL to connect to the server (LAN) */
  readonly url: string;
  /** QR code as a data URL (LAN URL) */
  readonly qrCodeDataUrl: string;
  /** The local IP address */
  readonly localIp: string;
  /** Cloudflare Tunnel URL, null if not enabled */
  readonly tunnelUrl: string | null;
  /** QR code for Tunnel URL with access token, null if tunnel not enabled */
  readonly tunnelQrCodeDataUrl: string | null;
  /** Access token for authentication */
  readonly accessToken: string;
}

/**
 * Options for starting the server
 */
export interface ServerStartOptions {
  /** Whether to publish via Cloudflare Tunnel (default: false) */
  publishToCloudflare?: boolean;
}

/**
 * Current server status
 * Extended to include Cloudflare Tunnel status
 */
export interface ServerStatus {
  /** Whether the server is currently running */
  readonly isRunning: boolean;
  /** The port the server is running on, or null if not running */
  readonly port: number | null;
  /** The full URL, or null if not running */
  readonly url: string | null;
  /** Number of connected WebSocket clients */
  readonly clientCount: number;
  /** Cloudflare Tunnel connection status */
  readonly tunnelStatus: TunnelStatus;
  /** Cloudflare Tunnel URL, null if not connected */
  readonly tunnelUrl: string | null;
}

/**
 * Server error types
 */
export type ServerError =
  | { type: 'NO_AVAILABLE_PORT'; triedPorts: number[] }
  | { type: 'ALREADY_RUNNING'; port: number }
  | { type: 'NETWORK_ERROR'; message: string };

/**
 * Result type for server operations
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Port range constants
 */
const DEFAULT_PORT = 8765;
const MIN_PORT = 8765;
const MAX_PORT = 8775;

/**
 * Remote Access Server
 *
 * Manages HTTP/WebSocket server lifecycle for mobile remote access.
 * Handles port selection, QR code generation, and WebSocket connections.
 *
 * @example
 * const server = new RemoteAccessServer();
 * const result = await server.start();
 * if (result.ok) {
 *   console.log(`Server running at ${result.value.url}`);
 * }
 */
export class RemoteAccessServer {
  private httpServer: Server | null = null;
  private wss: WebSocketServer | null = null;
  private port: number | null = null;
  private url: string | null = null;
  private localIp: string | null = null;
  private statusChangeCallbacks: Set<(status: ServerStatus) => void> = new Set();
  private staticFileServer: StaticFileServer;
  private webSocketHandler: WebSocketHandler;
  private accessTokenService: AccessTokenService;
  private tunnelManager: CloudflareTunnelManager | null = null;
  private tunnelStatus: TunnelStatus = 'disconnected';
  private tunnelUrl: string | null = null;
  private tunnelActive: boolean = false;

  constructor(accessTokenService?: AccessTokenService, tunnelManager?: CloudflareTunnelManager) {
    // Initialize static file server with React UI directory
    // remote-ui-vanilla-removal: Use React build output (dist/remote-ui/) for both dev and prod
    // Note: In development, run `npm run build:remote` to generate the React build output
    const uiDir = join(__dirname, '../../dist/remote-ui');
    logger.debug(`[remoteAccessServer] Using UI directory: ${uiDir}`);
    this.staticFileServer = new StaticFileServer(uiDir);
    // Initialize WebSocketHandler
    this.webSocketHandler = new WebSocketHandler();
    // Initialize AccessTokenService
    this.accessTokenService = accessTokenService ?? getAccessTokenService();
    // Initialize CloudflareTunnelManager (optional)
    this.tunnelManager = tunnelManager ?? null;
  }

  /**
   * Start the server
   *
   * @param preferredPort The preferred port to use (default: 8765)
   * @param options Server start options including Cloudflare Tunnel settings
   * @returns Result with server info on success, or error on failure
   */
  async start(
    preferredPort: number = DEFAULT_PORT,
    options: ServerStartOptions = {}
  ): Promise<Result<ServerStartResult, ServerError>> {
    const { publishToCloudflare = false } = options;
    // Check if already running
    if (this.httpServer && this.port) {
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', port: this.port },
      };
    }

    // Try to find an available port
    const triedPorts: number[] = [];
    let selectedPort: number | null = null;

    for (let port = preferredPort; port <= MAX_PORT; port++) {
      if (port < MIN_PORT) continue;

      triedPorts.push(port);
      const isAvailable = await this.isPortAvailable(port);

      if (isAvailable) {
        selectedPort = port;
        break;
      }
    }

    // If preferred port was before MIN_PORT or all ports tried
    if (selectedPort === null && preferredPort < MIN_PORT) {
      for (let port = MIN_PORT; port <= MAX_PORT; port++) {
        if (triedPorts.includes(port)) continue;

        triedPorts.push(port);
        const isAvailable = await this.isPortAvailable(port);

        if (isAvailable) {
          selectedPort = port;
          break;
        }
      }
    }

    if (selectedPort === null) {
      return {
        ok: false,
        error: { type: 'NO_AVAILABLE_PORT', triedPorts },
      };
    }

    // Create and start HTTP server
    try {
      await this.createServer(selectedPort);

      // Get local IP and generate URL
      this.localIp = getLocalIP();
      this.port = selectedPort;
      this.url = `http://${this.localIp}:${this.port}`;

      // Ensure access token exists
      const accessToken = this.accessTokenService.ensureToken();

      // Generate QR code for LAN URL (with token)
      const lanUrlWithToken = `${this.url}?token=${accessToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(lanUrlWithToken);

      // Handle Cloudflare Tunnel if enabled (Task 15.2.1)
      let tunnelUrl: string | null = null;
      let tunnelQrCodeDataUrl: string | null = null;

      if (publishToCloudflare && this.tunnelManager) {
        // Start Cloudflare Tunnel
        this.tunnelStatus = 'connecting';
        this.notifyStatusChange();

        const tunnelResult = await this.tunnelManager.start(this.port);
        if (tunnelResult.ok) {
          this.tunnelUrl = tunnelResult.value.url;
          this.tunnelStatus = 'connected';
          this.tunnelActive = true;
          tunnelUrl = tunnelResult.value.url;

          // Generate QR code for Tunnel URL with access token
          const tunnelUrlWithToken = `${tunnelUrl}?token=${accessToken}`;
          tunnelQrCodeDataUrl = await QRCode.toDataURL(tunnelUrlWithToken);
        } else {
          // Tunnel failed but server is still running
          this.tunnelStatus = 'error';
          this.tunnelUrl = null;
          logger.warn(`[remoteAccessServer] Tunnel connection failed: ${tunnelResult.error.message}`);
        }
      } else {
        this.tunnelStatus = 'disconnected';
      }

      // Notify status change
      this.notifyStatusChange();

      return {
        ok: true,
        value: {
          port: this.port,
          url: this.url,
          qrCodeDataUrl,
          localIp: this.localIp,
          tunnelUrl,
          tunnelQrCodeDataUrl,
          accessToken,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Stop the server
   * Task 15.2.1: Also stops Cloudflare Tunnel if active
   */
  async stop(): Promise<void> {
    // Stop Cloudflare Tunnel if active (Task 15.2.1)
    if (this.tunnelActive && this.tunnelManager) {
      await this.tunnelManager.stop();
      this.tunnelActive = false;
    }

    // Disconnect all WebSocket connections via WebSocketHandler
    this.webSocketHandler.disconnectAll();

    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => resolve());
      });
      this.wss = null;
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }

    // Reset state
    this.port = null;
    this.url = null;
    this.localIp = null;
    this.tunnelStatus = 'disconnected';
    this.tunnelUrl = null;

    // Notify status change
    this.notifyStatusChange();
  }

  /**
   * Get current server status
   */
  getStatus(): ServerStatus {
    return {
      isRunning: this.httpServer !== null,
      port: this.port,
      url: this.url,
      clientCount: this.webSocketHandler.getClientCount(),
      tunnelStatus: this.tunnelStatus,
      tunnelUrl: this.tunnelUrl,
    };
  }

  /**
   * Get number of connected clients
   * Delegates to WebSocketHandler for accurate count
   */
  getClientCount(): number {
    return this.webSocketHandler.getClientCount();
  }

  /**
   * Get the WebSocketHandler instance
   * Used for setting up StateProvider and WorkflowController
   */
  getWebSocketHandler(): WebSocketHandler {
    return this.webSocketHandler;
  }

  /**
   * Subscribe to status changes
   *
   * @param callback Function to call when status changes
   * @returns Unsubscribe function
   */
  onStatusChange(callback: (status: ServerStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  /**
   * Get the WebSocket server instance (for WebSocketHandler integration)
   */
  getWebSocketServer(): WebSocketServer | null {
    return this.wss;
  }

  /**
   * Refresh access token and regenerate QR code
   * Task 15.2.2: Returns new token and updated QR code for tunnel
   *
   * @returns RefreshResult with new token and QR code, or null if server not running
   */
  async refreshAccessToken(): Promise<{
    accessToken: string;
    tunnelQrCodeDataUrl: string | null;
  } | null> {
    // Return null if server is not running
    if (!this.httpServer || !this.port) {
      return null;
    }

    // Generate new token
    const newToken = this.accessTokenService.refreshToken();

    // Generate tunnel QR code if tunnel is connected
    let tunnelQrCodeDataUrl: string | null = null;
    if (this.tunnelActive && this.tunnelUrl) {
      const tunnelUrlWithToken = `${this.tunnelUrl}?token=${newToken}`;
      tunnelQrCodeDataUrl = await QRCode.toDataURL(tunnelUrlWithToken);
    }

    return {
      accessToken: newToken,
      tunnelQrCodeDataUrl,
    };
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();

      server.once('error', () => {
        resolve(false);
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.listen(port);
    });
  }

  /**
   * Create HTTP and WebSocket servers
   */
  private async createServer(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      this.httpServer.once('error', (error) => {
        reject(error);
      });

      this.httpServer.listen(port, () => {
        // Create WebSocket server attached to HTTP server
        this.wss = new WebSocketServer({ server: this.httpServer! });

        // Initialize WebSocketHandler with the WebSocket server
        // This delegates connection handling to WebSocketHandler
        this.webSocketHandler.initialize(this.wss);

        resolve();
      });
    });
  }

  /**
   * Handle HTTP requests - serves static files from remote-ui directory
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    this.staticFileServer.handleRequest(req, res);
  }

  /**
   * Notify all subscribers of status change
   */
  private notifyStatusChange(): void {
    const status = this.getStatus();
    for (const callback of this.statusChangeCallbacks) {
      callback(status);
    }
  }
}
