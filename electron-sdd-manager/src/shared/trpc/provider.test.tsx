/**
 * TRPCProvider tests
 * ipclink-singleton-unification: Task 2.2
 * Requirements: 1.1, 1.4
 *
 * Verifies:
 * - TRPCProvider mounts and calls setSharedClient() with the TRPCClient
 * - ipcLink() is called exactly once
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

// Unmock vanillaClient to access the real setSharedClient mock
vi.unmock('./vanillaClient');

// Mock vanillaClient - use vi.hoisted to safely reference the mock fn
const { mockSetSharedClient } = vi.hoisted(() => ({
  mockSetSharedClient: vi.fn(),
}));

vi.mock('./vanillaClient', () => ({
  getVanillaClient: vi.fn(),
  setSharedClient: mockSetSharedClient,
  resetVanillaClient: vi.fn(),
}));

// Mock ipcLink - use vi.hoisted
const { mockIpcLink } = vi.hoisted(() => ({
  mockIpcLink: vi.fn().mockReturnValue({ type: 'ipc' }),
}));

vi.mock('electron-trpc/renderer', () => ({
  ipcLink: () => mockIpcLink(),
}));

// Mock the trpc client module - use vi.hoisted
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn().mockReturnValue({ __mock: 'trpcClient' }),
}));

vi.mock('./client', () => ({
  trpc: {
    createClient: (...args: unknown[]) => mockCreateClient(...args),
    Provider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'trpc-provider' }, children),
  },
}));

import { TRPCProvider } from './provider';

describe('TRPCProvider (ipclink-singleton-unification Task 2.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call setSharedClient() with the created TRPCClient on mount', async () => {
    render(
      <TRPCProvider>
        <div>child</div>
      </TRPCProvider>
    );

    await waitFor(() => {
      expect(mockSetSharedClient).toHaveBeenCalledTimes(1);
    });

    // Verify it was called with the TRPCClient returned by trpc.createClient()
    expect(mockSetSharedClient).toHaveBeenCalledWith({ __mock: 'trpcClient' });
  });

  it('should call ipcLink() exactly once (Requirement 1.1, 1.4)', async () => {
    render(
      <TRPCProvider>
        <div>child</div>
      </TRPCProvider>
    );

    await waitFor(() => {
      expect(mockIpcLink).toHaveBeenCalledTimes(1);
    });
  });
});
