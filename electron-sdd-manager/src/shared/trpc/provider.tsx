/**
 * TRPCProvider - Unified Provider for tRPC + React Query
 * Requirements: 4.3, 4.4, 4.5, 4.6
 *
 * Wraps QueryClientProvider and trpc.Provider for use in both
 * Electron (renderer/App.tsx) and Remote UI (remote-ui/App.tsx).
 *
 * In Remote UI (non-Electron) environment, ipcLink is not available.
 * The provider gracefully falls back to rendering children without
 * tRPC client initialization (DD-003).
 *
 * QueryClient and tRPC client are lazily initialized via useState
 * to prevent recreation on re-renders.
 */
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './client';

interface TRPCProviderProps {
  children: ReactNode;
}

/**
 * Attempt to create a tRPC client with ipcLink.
 * Returns null if ipcLink is not available (Remote UI environment).
 */
function createTRPCClient() {
  try {
    // Dynamic import to avoid bundling electron-trpc in Remote UI
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ipcLink } = require('electron-trpc/renderer');
    return trpc.createClient({
      links: [ipcLink()],
    });
  } catch {
    // ipcLink not available (Remote UI environment)
    // tRPC hooks will not be functional, but the provider structure is in place
    console.warn('[TRPCProvider] ipcLink not available, tRPC disabled in this environment');
    return null;
  }
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  // Lazy initialization to prevent recreation on re-renders
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  // If tRPC client is not available (Remote UI), render with QueryClient only
  if (!trpcClient) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
