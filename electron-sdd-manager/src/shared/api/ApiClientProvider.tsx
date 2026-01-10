/**
 * ApiClientProvider - React Context provider for ApiClient
 *
 * This component provides the ApiClient instance to the React component tree.
 * It supports:
 * - Auto-selection between IpcApiClient and WebSocketApiClient based on environment
 * - Manual client injection for testing
 *
 * Design Decision: DD-002 in design.md
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import type { ApiClient } from './types';
import { IpcApiClient } from './IpcApiClient';
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
 */
function isElectronEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    'electronAPI' in window &&
    window.electronAPI !== undefined
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
  const apiClient = useMemo<ApiClient>(() => {
    // Use custom client if provided (for testing)
    if (client) {
      return client;
    }

    // Check for Electron environment first
    if (isElectronEnvironment()) {
      return new IpcApiClient();
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

    // Fallback to IpcApiClient (will throw if not in Electron)
    // This allows development outside Electron with proper error messages
    return new IpcApiClient();
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
 * Must be used within an ApiClientProvider.
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
