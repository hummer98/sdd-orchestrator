/**
 * tRPC Preload module tests
 * Requirements: 3.1, 3.2
 * Verifies: exposeElectronTRPC is called via process.once('loaded')
 *
 * Note: In test environment, electron-trpc APIs are mocked since
 * they require Electron runtime. We verify the module structure and
 * that exposeElectronTRPC would be invoked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock electron-trpc/main to avoid Electron runtime dependency
vi.mock('electron-trpc/main', () => ({
  exposeElectronTRPC: vi.fn(),
}));

describe('tRPC Preload (preload/trpc.ts)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should import without errors', async () => {
    // If this doesn't throw, the module structure is correct
    await expect(import('../trpc')).resolves.toBeDefined();
  });

  it('should call exposeElectronTRPC when process loaded event fires', async () => {
    const { exposeElectronTRPC } = await import('electron-trpc/main');

    // Manually trigger 'loaded' event since we're not in Electron
    // The module registers process.once('loaded', ...)
    // In test, we verify the mock was set up
    await import('../trpc');

    // Simulate the 'loaded' event
    process.emit('loaded' as never);

    expect(exposeElectronTRPC).toHaveBeenCalled();
  });
});
