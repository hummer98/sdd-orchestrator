/**
 * API abstraction layer barrel export
 *
 * This module exports the API client interface and implementations
 * for both IPC (Electron) and WebSocket (Remote UI) communication.
 */

// Types
export * from './types';

// Provider and hook
export { ApiClientProvider, useApi, ApiClientContext } from './ApiClientProvider';

// Client implementations
export { IpcApiClient } from './IpcApiClient';
export { WebSocketApiClient } from './WebSocketApiClient';
