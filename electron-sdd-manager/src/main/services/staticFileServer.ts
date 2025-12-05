/**
 * Static File Server Service
 * Serves static files for mobile UI with proper CORS headers
 * Requirements: 9.2 - 静的ファイル配信とCORS設定
 */

import { IncomingMessage, ServerResponse } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname, normalize, resolve } from 'path';

/**
 * MIME type mappings
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/**
 * Default MIME type for unknown file extensions
 */
const DEFAULT_MIME_TYPE = 'application/octet-stream';

/**
 * Static file server for serving mobile UI files
 *
 * Handles serving static files with:
 * - Proper Content-Type headers
 * - CORS headers for local network access
 * - Security checks against directory traversal
 *
 * @example
 * const server = new StaticFileServer('/path/to/ui/files');
 * httpServer.on('request', (req, res) => {
 *   server.handleRequest(req, res);
 * });
 */
export class StaticFileServer {
  private readonly rootDir: string;

  /**
   * Create a static file server
   *
   * @param rootDir The root directory to serve files from
   */
  constructor(rootDir: string) {
    this.rootDir = resolve(rootDir);
  }

  /**
   * Handle an HTTP request
   *
   * @param req The incoming HTTP request
   * @param res The HTTP response object
   */
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers
    this.setCorsHeaders(res);

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    // Parse URL and get file path
    const urlPath = this.sanitizePath(req.url || '/');
    if (urlPath === null) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // Resolve file path
    let filePath = join(this.rootDir, urlPath);

    // Default to index.html for root path
    if (urlPath === '/' || urlPath === '') {
      filePath = join(this.rootDir, 'index.html');
    }

    // Security check: ensure path is within root directory
    if (!this.isPathSafe(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    try {
      // Check if file exists
      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // Read and serve file
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const mimeType = this.getMimeType(ext);

      // Set cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  /**
   * Get MIME type for a file extension
   *
   * @param ext File extension (including the dot)
   * @returns MIME type string
   */
  getMimeType(ext: string): string {
    return MIME_TYPES[ext.toLowerCase()] || DEFAULT_MIME_TYPE;
  }

  /**
   * Set CORS headers on response
   */
  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  /**
   * Sanitize URL path and check for directory traversal
   *
   * @param urlPath The URL path from the request
   * @returns Sanitized path or null if unsafe
   */
  private sanitizePath(urlPath: string): string | null {
    // Remove query string
    const cleanPath = urlPath.split('?')[0];

    // Check for directory traversal attempts
    if (cleanPath.includes('..')) {
      return null;
    }

    // Normalize the path
    const normalized = normalize(cleanPath);

    // Check again after normalization
    if (normalized.includes('..')) {
      return null;
    }

    return normalized;
  }

  /**
   * Check if a file path is within the root directory
   *
   * @param filePath Absolute file path to check
   * @returns true if path is safe, false otherwise
   */
  private isPathSafe(filePath: string): boolean {
    const normalizedPath = resolve(filePath);
    return normalizedPath.startsWith(this.rootDir);
  }
}
