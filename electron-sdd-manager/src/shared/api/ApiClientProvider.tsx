/**
 * ApiClientProvider - React Context provider for ApiClient
 *
 * This component provides the ApiClient instance to the React component tree.
 * It supports:
 * - Auto-selection of WebSocketApiClient for Remote UI
 * - Manual client injection for testing
 * - Electron environment uses tRPC directly (no ApiClient needed for most operations)
 *
 * trpc-full-migration Task 11.4: Legacy IPC client removed; Electron uses tRPC directly.
 * ApiClientProvider is now only needed for Remote UI (WebSocketApiClient).
 *
 * Design Decision: DD-002 in design.md
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { ApiClient } from './types';
import { WebSocketApiClient } from './WebSocketApiClient';

// =============================================================================
// Context Definition
// =============================================================================

const ApiClientContext = createContext<ApiClient | null>(null);

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Check if running in Electron environment
 * trpc-full-migration Task 11.4: Use electronTRPC (set by exposeElectronTRPC) instead of electronAPI
 */
function isElectronEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    'electronTRPC' in window
  );
}

/**
 * Extract WebSocket URL and token from current URL
 * URL format: http://host:port/?token=xxx
 */
function extractWebSocketConfig(): { url: string; token: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    return null;
  }

  // Convert HTTP URL to WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;

  return { url, token };
}

// =============================================================================
// Provider Props
// =============================================================================

interface ApiClientProviderProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Optional custom ApiClient instance for testing or custom implementations
   */
  client?: ApiClient;

  /**
   * Optional WebSocket URL override (for Remote UI)
   */
  wsUrl?: string;

  /**
   * Optional authentication token override (for Remote UI)
   */
  token?: string;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * ApiClientProvider - Provides ApiClient to the React component tree
 *
 * After tRPC migration, Electron renderer uses tRPC hooks/vanillaClient directly.
 * This provider is primarily used for Remote UI (WebSocketApiClient).
 *
 * Usage:
 * ```tsx
 * // Auto-detection (recommended)
 * <ApiClientProvider>
 *   <App />
 * </ApiClientProvider>
 *
 * // With custom client (for testing)
 * <ApiClientProvider client={mockClient}>
 *   <App />
 * </ApiClientProvider>
 *
 * // With explicit WebSocket config
 * <ApiClientProvider wsUrl="ws://localhost:8765/ws" token="xxx">
 *   <App />
 * </ApiClientProvider>
 * ```
 */
export function ApiClientProvider({
  children,
  client,
  wsUrl,
  token,
}: ApiClientProviderProps): React.ReactElement {
  const apiClient = useMemo<ApiClient | null>(() => {
    // Use custom client if provided (for testing)
    if (client) {
      return client;
    }

    // Electron environment: ApiClient is not used (tRPC hooks/vanillaClient)
    // Return null - components that need ApiClient are Remote UI only
    if (isElectronEnvironment()) {
      return null;
    }

    // WebSocket mode for Remote UI
    if (wsUrl && token) {
      return new WebSocketApiClient(wsUrl, token);
    }

    // Auto-detect from URL
    const wsConfig = extractWebSocketConfig();
    if (wsConfig) {
      return new WebSocketApiClient(wsConfig.url, wsConfig.token);
    }

    // Fallback: return null (Electron without electronTRPC in test env)
    return null;
  }, [client, wsUrl, token]);

  return (
    <ApiClientContext.Provider value={apiClient}>
      {children}
    </ApiClientContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * useApi - Hook to access the ApiClient instance
 *
 * After tRPC migration, this is primarily used by Remote UI components.
 * Electron renderer components should use tRPC hooks directly.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const api = useApi();
 *   const [specs, setSpecs] = useState<SpecMetadata[]>([]);
 *
 *   useEffect(() => {
 *     api.getSpecs().then(result => {
 *       if (result.ok) {
 *         setSpecs(result.value);
 *       }
 *     });
 *   }, [api]);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useApi(): ApiClient {
  const context = useContext(ApiClientContext);

  if (context === null) {
    throw new Error('useApi must be used within an ApiClientProvider');
  }

  return context;
}

// =============================================================================
// Export Context for advanced use cases
// =============================================================================

export { ApiClientContext };
