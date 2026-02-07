/**
 * API abstraction layer barrel export
 *
 * This module exports the API client interface and implementations.
 * trpc-full-migration Task 11.4: IPC client removed; Electron uses tRPC directly.
 * Only WebSocketApiClient remains for Remote UI.
 */

// Types
export * from './types';

// Provider and hook
export { ApiClientProvider, useApi, ApiClientContext } from './ApiClientProvider';

// Client implementations
export { WebSocketApiClient } from './WebSocketApiClient';
