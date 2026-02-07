/**
 * Vanilla tRPC Client - Imperative tRPC calls for Zustand stores
 * Task 3.2: Config関連のRenderer呼び出しをtRPCフックに置換
 * Requirements: 2.2
 *
 * Provides a tRPC proxy client that can be used outside React components
 * (e.g., in Zustand stores) for imperative procedure calls.
 *
 * Usage:
 *   const client = getVanillaClient();
 *   const projects = await client.config.getRecentProjects.query();
 *   await client.config.addRecentProject.mutate({ path: '/my/project' });
 */
import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '../../main/trpc/router';

type VanillaClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>;

let vanillaClient: VanillaClient | null = null;

/**
 * Get or create the singleton vanilla tRPC client.
 * Uses ipcLink from electron-trpc for IPC transport.
 */
export function getVanillaClient(): VanillaClient {
  if (!vanillaClient) {
    vanillaClient = createTRPCProxyClient<AppRouter>({
      links: [ipcLink()],
    });
  }
  return vanillaClient;
}

/**
 * Reset the singleton (for testing only).
 */
export function resetVanillaClient(): void {
  vanillaClient = null;
}
