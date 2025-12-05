/**
 * StaticFileServer Unit Tests
 * TDD: Testing static file serving functionality
 * Requirements: 9.2 - 静的ファイル配信とCORS設定
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { StaticFileServer } from './staticFileServer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('StaticFileServer', () => {
  let staticFileServer: StaticFileServer;
  let tempDir: string;

  beforeAll(async () => {
    // Create temp directory with test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-test-'));

    // Create test files
    await fs.writeFile(path.join(tempDir, 'index.html'), '<html><body>Hello</body></html>');
    await fs.writeFile(path.join(tempDir, 'app.js'), 'console.log("test");');
    await fs.writeFile(path.join(tempDir, 'styles.css'), 'body { color: red; }');

    // Create subdirectory with files
    await fs.mkdir(path.join(tempDir, 'assets'));
    await fs.writeFile(path.join(tempDir, 'assets', 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    staticFileServer = new StaticFileServer(tempDir);
  });

  describe('handleRequest', () => {
    describe('Content-Type detection', () => {
      it('should serve HTML with correct Content-Type', async () => {
        const { res } = await simulateRequest(staticFileServer, '/index.html');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      });

      it('should serve JavaScript with correct Content-Type', async () => {
        const { res } = await simulateRequest(staticFileServer, '/app.js');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/javascript; charset=utf-8');
      });

      it('should serve CSS with correct Content-Type', async () => {
        const { res } = await simulateRequest(staticFileServer, '/styles.css');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('text/css; charset=utf-8');
      });

      it('should serve PNG with correct Content-Type', async () => {
        const { res } = await simulateRequest(staticFileServer, '/assets/logo.png');

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('image/png');
      });
    });

    describe('CORS headers', () => {
      it('should include Access-Control-Allow-Origin header', async () => {
        const { res } = await simulateRequest(staticFileServer, '/index.html');

        expect(res.headers['access-control-allow-origin']).toBe('*');
      });

      it('should include Access-Control-Allow-Methods header', async () => {
        const { res } = await simulateRequest(staticFileServer, '/index.html');

        expect(res.headers['access-control-allow-methods']).toBe('GET, OPTIONS');
      });

      it('should handle OPTIONS preflight request', async () => {
        const { res } = await simulateRequest(staticFileServer, '/index.html', 'OPTIONS');

        expect(res.statusCode).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe('*');
      });
    });

    describe('Default file serving', () => {
      it('should serve index.html for root path', async () => {
        const { res, body } = await simulateRequest(staticFileServer, '/');

        expect(res.statusCode).toBe(200);
        expect(body).toContain('Hello');
      });

      it('should serve index.html for empty path', async () => {
        const { res, body } = await simulateRequest(staticFileServer, '');

        expect(res.statusCode).toBe(200);
        expect(body).toContain('Hello');
      });
    });

    describe('Error handling', () => {
      it('should return 404 for non-existent files', async () => {
        const { res } = await simulateRequest(staticFileServer, '/nonexistent.html');

        expect(res.statusCode).toBe(404);
      });

      it('should return 404 for directory traversal attempts', async () => {
        const { res } = await simulateRequest(staticFileServer, '/../../../etc/passwd');

        expect(res.statusCode).toBe(404);
      });

      it('should return 404 for paths with ..', async () => {
        const { res } = await simulateRequest(staticFileServer, '/assets/../../../etc/passwd');

        expect(res.statusCode).toBe(404);
      });

      it('should return 405 for non-GET/OPTIONS methods', async () => {
        const { res } = await simulateRequest(staticFileServer, '/index.html', 'POST');

        expect(res.statusCode).toBe(405);
      });
    });

    describe('File content serving', () => {
      it('should serve correct file content', async () => {
        const { body } = await simulateRequest(staticFileServer, '/app.js');

        expect(body).toBe('console.log("test");');
      });

      it('should serve files from subdirectories', async () => {
        const { res } = await simulateRequest(staticFileServer, '/assets/logo.png');

        expect(res.statusCode).toBe(200);
      });
    });

    describe('Cache headers', () => {
      it('should include Cache-Control header', async () => {
        const { res } = await simulateRequest(staticFileServer, '/index.html');

        expect(res.headers['cache-control']).toBeDefined();
      });
    });
  });

  describe('MIME type detection', () => {
    it('should detect common MIME types correctly', () => {
      expect(staticFileServer.getMimeType('.html')).toBe('text/html; charset=utf-8');
      expect(staticFileServer.getMimeType('.css')).toBe('text/css; charset=utf-8');
      expect(staticFileServer.getMimeType('.js')).toBe('application/javascript; charset=utf-8');
      expect(staticFileServer.getMimeType('.json')).toBe('application/json; charset=utf-8');
      expect(staticFileServer.getMimeType('.png')).toBe('image/png');
      expect(staticFileServer.getMimeType('.jpg')).toBe('image/jpeg');
      expect(staticFileServer.getMimeType('.svg')).toBe('image/svg+xml');
      expect(staticFileServer.getMimeType('.ico')).toBe('image/x-icon');
    });

    it('should return octet-stream for unknown types', () => {
      expect(staticFileServer.getMimeType('.xyz')).toBe('application/octet-stream');
    });
  });
});

// Helper function to simulate HTTP request
async function simulateRequest(
  fileServer: StaticFileServer,
  urlPath: string,
  method: string = 'GET'
): Promise<{ res: MockResponse; body: string }> {
  const req = {
    method,
    url: urlPath,
    headers: {},
  } as IncomingMessage;

  const res = new MockResponse();

  await fileServer.handleRequest(req, res as unknown as ServerResponse);

  return { res, body: res.getBody() };
}

// Mock response object
class MockResponse {
  statusCode: number = 200;
  headers: Record<string, string> = {};
  private bodyChunks: Buffer[] = [];
  private ended: boolean = false;

  writeHead(statusCode: number, headers?: Record<string, string>): this {
    this.statusCode = statusCode;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        this.headers[key.toLowerCase()] = value;
      }
    }
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  write(chunk: Buffer | string): boolean {
    if (typeof chunk === 'string') {
      this.bodyChunks.push(Buffer.from(chunk));
    } else {
      this.bodyChunks.push(chunk);
    }
    return true;
  }

  end(chunk?: Buffer | string): this {
    if (chunk) {
      this.write(chunk);
    }
    this.ended = true;
    return this;
  }

  getBody(): string {
    return Buffer.concat(this.bodyChunks).toString('utf-8');
  }
}
