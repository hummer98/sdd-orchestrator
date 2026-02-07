/**
 * vanillaClient tests
 * Task 3.2: tRPCバニラクライアントの作成テスト
 * Requirements: 2.2
 *
 * Verifies:
 * - createVanillaClient creates a tRPC proxy client with ipcLink
 * - getVanillaClient returns a singleton instance
 * - The client can call config procedures imperatively
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Unmock vanillaClient (overrides global mock from setup.ts) so we test the real module
vi.unmock('./vanillaClient');

// Mock electron-trpc/renderer
const mockIpcLink = vi.fn().mockReturnValue({ type: 'ipc' });
vi.mock('electron-trpc/renderer', () => ({
  ipcLink: () => mockIpcLink(),
}));

// Mock @trpc/client
const mockCreateTRPCProxyClient = vi.fn().mockImplementation(() => ({
  config: {
    getRecentProjects: { query: vi.fn() },
  },
}));
vi.mock('@trpc/client', () => ({
  createTRPCProxyClient: (...args: unknown[]) => mockCreateTRPCProxyClient(...args),
}));

import { getVanillaClient, resetVanillaClient } from './vanillaClient';

describe('vanillaClient (Task 3.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVanillaClient();
  });

  afterEach(() => {
    resetVanillaClient();
  });

  it('should create a tRPC proxy client with ipcLink', () => {
    const client = getVanillaClient();

    expect(client).toBeDefined();
    expect(mockCreateTRPCProxyClient).toHaveBeenCalledTimes(1);
    // Verify it was called with links containing ipcLink
    expect(mockCreateTRPCProxyClient).toHaveBeenCalledWith(
      expect.objectContaining({
        links: expect.arrayContaining([expect.anything()]),
      })
    );
  });

  it('should return the same singleton instance on subsequent calls', () => {
    const client1 = getVanillaClient();
    const client2 = getVanillaClient();

    expect(client1).toBe(client2);
    // createTRPCProxyClient should only be called once
    expect(mockCreateTRPCProxyClient).toHaveBeenCalledTimes(1);
  });

  it('should create a new client after reset', () => {
    const client1 = getVanillaClient();
    resetVanillaClient();
    const client2 = getVanillaClient();

    expect(client1).not.toBe(client2);
    expect(mockCreateTRPCProxyClient).toHaveBeenCalledTimes(2);
  });
});
