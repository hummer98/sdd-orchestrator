/**
 * tRPC Client tests
 * Requirements: 4.1, 4.2
 * Verifies: createTRPCReact, trpc instance
 *
 * Note: ipcLink requires Electron runtime, so we test the client
 * creation and type structure only.
 */
import { describe, it, expect, vi } from 'vitest';

// Mock electron-trpc/renderer since it requires Electron runtime
vi.mock('electron-trpc/renderer', () => ({
  ipcLink: vi.fn(() => ({
    // Minimal link mock
  })),
}));

describe('tRPC Client (client.ts)', () => {
  it('should export trpc instance', async () => {
    const { trpc } = await import('../client');
    expect(trpc).toBeDefined();
  });

  it('trpc instance should have useQuery-like structure', async () => {
    const { trpc } = await import('../client');
    // createTRPCReact returns an object with Provider, useContext, etc.
    expect(trpc.Provider).toBeDefined();
    expect(trpc.useContext).toBeDefined();
  });
});
