/**
 * TRPCProvider - Unified Provider for tRPC + React Query
 * ipclink-singleton-unification: Task 2.1
 * Requirements: 1.1, 4.3, 4.4, 4.5, 4.6
 *
 * Wraps QueryClientProvider and trpc.Provider for use in both
 * Electron (renderer/App.tsx) and Remote UI (remote-ui/App.tsx).
 *
 * This is the SOLE location where ipcLink() is called. The generated
 * TRPCClient is shared with vanillaClient via setSharedClient() to
 * ensure a single IPC manager and prevent requestId collisions
 * (electron-trpc Issue #201, DD-001).
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
import { ipcLink } from 'electron-trpc/renderer';
import { trpc } from './client';
import { setSharedClient } from './vanillaClient';

interface TRPCProviderProps {
  children: ReactNode;
}

/**
 * Attempt to create a tRPC client with ipcLink.
 * Returns null if electronTRPC global is not available (Remote UI environment).
 * When successful, shares the TRPCClient with vanillaClient via setSharedClient().
 */
function createTRPCClient() {
  try {
    const client = trpc.createClient({
      links: [ipcLink()],
    });
    // Share the TRPCClient with vanillaClient for singleton IPC
    setSharedClient(client);
    return client;
  } catch {
    // electronTRPC global not available (Remote UI environment)
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
