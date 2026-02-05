/**
 * TRPCProvider tests
 * Requirements: 4.3, 4.4
 * Verifies: TRPCProvider, QueryClientProvider integration
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock electron-trpc/renderer since it requires Electron runtime
// ipcLink must return a valid tRPC link (a function that returns runtime/requestAsPromise)
vi.mock('electron-trpc/renderer', () => ({
  ipcLink: vi.fn(() => {
    // Return a minimal tRPC link factory function
    return (runtime: unknown) => {
      return () => ({
        subscribe: vi.fn(),
      });
    };
  }),
}));

describe('TRPCProvider (provider.tsx)', () => {
  it('should render children', async () => {
    const { TRPCProvider } = await import('../provider');
    render(
      <TRPCProvider>
        <div data-testid="child">Hello tRPC</div>
      </TRPCProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello tRPC')).toBeInTheDocument();
  });

  it('should be a valid React component', async () => {
    const { TRPCProvider } = await import('../provider');
    expect(TRPCProvider).toBeDefined();
    expect(typeof TRPCProvider).toBe('function');
  });
});
