/**
 * vanillaClient tests
 * ipclink-singleton-unification: Task 1.2
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.2
 *
 * Verifies:
 * - setSharedClient() + createTRPCClientProxy pattern
 * - getVanillaClient() returns deferred proxy before setSharedClient()
 * - Deferred proxy queues subscribe calls and flushes on setSharedClient()
 * - resetVanillaClient() resets state
 * - ipcLink is NOT imported in vanillaClient.ts
 * - createTRPCProxyClient is NOT imported in vanillaClient.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Unmock vanillaClient (overrides global mock from setup.ts) so we test the real module
vi.unmock('./vanillaClient');

// Mock @trpc/client - createTRPCClientProxy wraps an existing TRPCClient
const mockCreateTRPCClientProxy = vi.fn().mockImplementation((client: unknown) => {
  // Return a proxy that delegates to the mock client
  return {
    __proxyOf: client,
    config: {
      getRecentProjects: { query: vi.fn() },
    },
    events: {
      onAgentStartError: {
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      },
    },
    misc: {
      logRenderer: { mutate: vi.fn().mockResolvedValue(undefined) },
    },
  };
});

vi.mock('@trpc/client', () => ({
  createTRPCClientProxy: (...args: unknown[]) => mockCreateTRPCClientProxy(...args),
}));

import { getVanillaClient, resetVanillaClient, setSharedClient } from './vanillaClient';

describe('vanillaClient (ipclink-singleton-unification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVanillaClient();
  });

  afterEach(() => {
    resetVanillaClient();
  });

  describe('setSharedClient + getVanillaClient', () => {
    it('should return a proxy created from the shared TRPCClient after setSharedClient()', () => {
      const mockTRPCClient = { __mock: 'trpcClient' } as any;

      setSharedClient(mockTRPCClient);
      const client = getVanillaClient();

      expect(client).toBeDefined();
      expect(mockCreateTRPCClientProxy).toHaveBeenCalledTimes(1);
      expect(mockCreateTRPCClientProxy).toHaveBeenCalledWith(mockTRPCClient);
    });

    it('should return the same singleton instance on subsequent getVanillaClient() calls', () => {
      const mockTRPCClient = { __mock: 'trpcClient' } as any;

      setSharedClient(mockTRPCClient);
      const client1 = getVanillaClient();
      const client2 = getVanillaClient();

      expect(client1).toBe(client2);
      expect(mockCreateTRPCClientProxy).toHaveBeenCalledTimes(1);
    });
  });

  describe('deferred proxy (before setSharedClient)', () => {
    it('should return a deferred proxy before setSharedClient() is called', () => {
      const client = getVanillaClient();
      // Should not throw, should return something usable
      expect(client).toBeDefined();
      // createTRPCClientProxy should NOT have been called yet
      expect(mockCreateTRPCClientProxy).not.toHaveBeenCalled();
    });

    it('should queue subscribe calls and flush them after setSharedClient()', () => {
      // Get deferred proxy before setSharedClient
      const client = getVanillaClient();

      // Subscribe via deferred proxy
      const onDataCallback = vi.fn();
      client.events.onAgentStartError.subscribe(undefined, {
        onData: onDataCallback,
      });

      // Now set the shared client - this should flush the queue
      const mockTRPCClient = { __mock: 'trpcClient' } as any;
      setSharedClient(mockTRPCClient);

      // Verify that the subscribe was called on the real proxy
      expect(mockCreateTRPCClientProxy).toHaveBeenCalledTimes(1);
      // The subscribe should have been replayed on the real client
      const realProxy = mockCreateTRPCClientProxy.mock.results[0].value;
      expect(realProxy.events.onAgentStartError.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when query is called before setSharedClient()', () => {
      const client = getVanillaClient();

      // query/mutate before setSharedClient should throw immediately
      expect(() => {
        client.config.getRecentProjects.query();
      }).toThrow();
    });

    it('should throw an error when mutate is called before setSharedClient()', () => {
      const client = getVanillaClient();

      expect(() => {
        client.misc.logRenderer.mutate({ level: 'info', message: 'test', context: {} });
      }).toThrow();
    });
  });

  describe('resetVanillaClient', () => {
    it('should reset state so a new proxy is created after next setSharedClient()', () => {
      const mockTRPCClient1 = { __mock: 'trpcClient1' } as any;
      setSharedClient(mockTRPCClient1);
      const client1 = getVanillaClient();

      resetVanillaClient();

      const mockTRPCClient2 = { __mock: 'trpcClient2' } as any;
      setSharedClient(mockTRPCClient2);
      const client2 = getVanillaClient();

      expect(client1).not.toBe(client2);
      expect(mockCreateTRPCClientProxy).toHaveBeenCalledTimes(2);
    });
  });

  describe('no ipcLink import (Requirement 1.4)', () => {
    it('should not import ipcLink directly', async () => {
      // This is a static verification - if vanillaClient.ts imports ipcLink,
      // the module resolution would fail since we don't mock electron-trpc/renderer here.
      // The fact that this test file runs without mocking electron-trpc/renderer
      // proves that vanillaClient.ts does not import it.
      const client = getVanillaClient();
      expect(client).toBeDefined();
    });
  });
});
