/**
 * MCP Server Service
 * HTTP/SSE server for MCP protocol communication
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2
 *
 * @file mcpServerService.ts
 */

import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../logger';
// MCP SDK uses package.json exports which TypeScript's bundler mode doesn't fully resolve
// The module is marked as external in vite.config.ts, so it's resolved at runtime by Node.js
// @ts-expect-error: MCP SDK subpath exports not resolved by TypeScript bundler mode
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

/**
 * Default port for MCP server
 */
const DEFAULT_PORT = 3001;

/**
 * Result of successfully starting the MCP server
 */
export interface McpServerStartResult {
  /** The port the server is running on */
  readonly port: number;
  /** The full URL to connect to the server */
  readonly url: string;
}

/**
 * Current MCP server status
 */
export interface McpServerStatus {
  /** Whether the server is currently running */
  readonly isRunning: boolean;
  /** The port the server is running on, or null if not running */
  readonly port: number | null;
  /** The full URL, or null if not running */
  readonly url: string | null;
}

/**
 * MCP Server error types
 */
export type McpServerError =
  | { type: 'NO_AVAILABLE_PORT'; triedPorts: number[] }
  | { type: 'ALREADY_RUNNING'; port: number }
  | { type: 'PORT_IN_USE'; port: number }
  | { type: 'NETWORK_ERROR'; message: string };

/**
 * Result type for server operations
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type McpServerInstance = any;

/**
 * MCP Server Service
 *
 * Manages MCP HTTP/SSE server lifecycle.
 * Handles port selection, MCP protocol initialization, and status notifications.
 *
 * @example
 * const server = new McpServerService();
 * const result = await server.start();
 * if (result.ok) {
 *   console.log(`MCP Server running at ${result.value.url}`);
 * }
 */
export class McpServerService {
  private httpServer: Server | null = null;
  private mcpServer: McpServerInstance | null = null;
  private port: number | null = null;
  private url: string | null = null;
  private statusChangeCallbacks: Set<(status: McpServerStatus) => void> = new Set();

  /**
   * Start the MCP server
   *
   * @param preferredPort The port to use (default: 3001)
   * @returns Result with server info on success, or error on failure
   */
  async start(preferredPort: number = DEFAULT_PORT): Promise<Result<McpServerStartResult, McpServerError>> {
    // Check if already running
    if (this.httpServer && this.port) {
      return {
        ok: false,
        error: { type: 'ALREADY_RUNNING', port: this.port },
      };
    }

    // Try to find an available port starting from preferredPort
    const MAX_RETRIES = 10;
    let selectedPort = preferredPort;
    let isAvailable = false;
    const triedPorts: number[] = [];

    for (let i = 0; i <= MAX_RETRIES; i++) {
      const currentPort = preferredPort + i;
      triedPorts.push(currentPort);
      
      if (await this.isPortAvailable(currentPort)) {
        selectedPort = currentPort;
        isAvailable = true;
        break;
      }
    }

    if (!isAvailable) {
      return {
        ok: false,
        error: { type: 'NO_AVAILABLE_PORT', triedPorts },
      };
    }

    // Create and start HTTP server
    try {
      await this.createServer(selectedPort);

      this.port = selectedPort;
      this.url = `http://localhost:${this.port}`;

      // Initialize MCP server
      this.mcpServer = new McpServer({
        name: 'sdd-orchestrator-mcp',
        version: '1.0.0',
      });

      // Notify status change
      this.notifyStatusChange();

      logger.info(`[McpServerService] MCP server started on port ${this.port}`);

      return {
        ok: true,
        value: {
          port: this.port,
          url: this.url,
        },
      };
    } catch (error) {
      // Clean up on failure
      this.httpServer = null;
      this.mcpServer = null;
      this.port = null;
      this.url = null;

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
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    // Close MCP server if exists
    if (this.mcpServer) {
      try {
        await this.mcpServer.close();
      } catch {
        // Ignore errors during MCP server close
      }
      this.mcpServer = null;
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

    // Notify status change
    this.notifyStatusChange();

    logger.info('[McpServerService] MCP server stopped');
  }

  /**
   * Get current server status
   */
  getStatus(): McpServerStatus {
    return {
      isRunning: this.httpServer !== null,
      port: this.port,
      url: this.url,
    };
  }

  /**
   * Subscribe to status changes
   *
   * @param callback Function to call when status changes
   * @returns Unsubscribe function
   */
  onStatusChange(callback: (status: McpServerStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => {
      this.statusChangeCallbacks.delete(callback);
    };
  }

  /**
   * Get the MCP server instance (for tool registration)
   */
  getMcpServer(): McpServerInstance | null {
    return this.mcpServer;
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    // Validate port range
    if (port < 0 || port >= 65536) {
      return false;
    }

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

      try {
        server.listen(port);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Create HTTP server for MCP
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
        resolve();
      });
    });
  }

  /**
   * Handle HTTP requests for MCP endpoints
   * Supports SSE transport for MCP protocol
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    // Enable CORS for MCP clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // MCP endpoint handling will be added when McpToolRegistry is implemented
    // For now, return a basic health check response
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Default response for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
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
