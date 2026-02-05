/**
 * tRPC Client - Renderer-side tRPC configuration
 * Requirements: 4.1, 4.2
 *
 * Creates the tRPC React hooks instance using createTRPCReact.
 * Uses ipcLink from electron-trpc for IPC transport.
 * AppRouter type is imported via `import type` to avoid bundling server code.
 */
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../main/trpc/router';

// Create tRPC React hooks instance with AppRouter type
export const trpc = createTRPCReact<AppRouter>();
