/**
 * @file MCP SDK Import Test
 * @description Verifies that @modelcontextprotocol/sdk is correctly installed and importable
 * @requirements 1.1
 */
import { describe, it, expect } from 'vitest';

describe('MCP SDK Import', () => {
  it('should be able to import McpServer from @modelcontextprotocol/sdk/server/mcp', async () => {
    // This test verifies that the MCP SDK package is correctly installed
    // and the main McpServer class can be imported
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp');
    expect(McpServer).toBeDefined();
    expect(typeof McpServer).toBe('function');
  });

  it('should be able to import SSEServerTransport from @modelcontextprotocol/sdk/server/sse', async () => {
    // Verify SSE transport is available for HTTP/SSE transport
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse');
    expect(SSEServerTransport).toBeDefined();
    expect(typeof SSEServerTransport).toBe('function');
  });

  it('should be able to import Server base class from @modelcontextprotocol/sdk/server', async () => {
    // Verify the low-level Server class is also available
    const { Server } = await import('@modelcontextprotocol/sdk/server');
    expect(Server).toBeDefined();
    expect(typeof Server).toBe('function');
  });

  it('should have zod available as peer dependency', async () => {
    // MCP SDK requires zod as a peer dependency
    const zod = await import('zod');
    expect(zod.z).toBeDefined();
    expect(typeof zod.z.object).toBe('function');
  });
});
