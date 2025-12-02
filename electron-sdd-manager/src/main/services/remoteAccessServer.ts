/**
 * Remote Access Server Service
 * HTTP/WebSocket server for mobile remote access
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as QRCode from 'qrcode';
import { join } from 'path';
import { getLocalIP } from '../utils/ipValidator';
import { StaticFileServer } from './staticFileServer';
import { WebSocketHandler } from './webSocketHandler';

/**
 * Result of successfully starting the server
 */
export interface ServerStartResult {
  /** The port the server is running on */
  readonly port: number;
  /** The full URL to connect to the server */
  readonly url: string;
  /** QR code as a data URL */
  readonly qrCodeDataUrl: string;
  /** The local IP address */
  readonly localIp: string;
}

/**
 * Current server status
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

  constructor() {
    // Initialize static file server with mobile UI directory
    // __dirname points to dist/main, remote-ui is at dist/main/remote-ui
    const uiDir = join(__dirname, 'remote-ui');
    this.staticFileServer = new StaticFileServer(uiDir);
    // Initialize WebSocketHandler
    this.webSocketHandler = new WebSocketHandler();
  }

  /**
   * Start the server
   *
   * @param preferredPort The preferred port to use (default: 8765)
   * @returns Result with server info on success, or error on failure
   */
  async start(preferredPort: number = DEFAULT_PORT): Promise<Result<ServerStartResult, ServerError>> {
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

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(this.url);

      // Notify status change
      this.notifyStatusChange();

      return {
        ok: true,
        value: {
          port: this.port,
          url: this.url,
          qrCodeDataUrl,
          localIp: this.localIp,
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
   */
  async stop(): Promise<void> {
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
