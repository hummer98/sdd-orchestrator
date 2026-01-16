/**
 * Renderer Process Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { useProjectStore, useSpecStore, useBugStore } from './stores';

// renderer-unified-logging feature: Initialize console hook before React rendering
// Requirements: 1.1, 1.3, 1.4
import { initializeConsoleHook } from './utils/consoleHook';

// Initialize console hook early (before StrictMode)
// This hooks console.log/warn/error/debug to send logs to main process
// Only active in development and E2E environments (disabled in production)
try {
  initializeConsoleHook();
} catch (error) {
  // Silent fallback - hook initialization failure should not block app startup
  // Requirement 7.3: Error handling during initialization
  console.error('[main] Failed to initialize console hook:', error);
}

// Export stores for debugging (dev only)
if (import.meta.env.DEV) {
  (window as unknown as { __stores: unknown }).__stores = {
    projectStore: useProjectStore,
    specStore: useSpecStore,
    bugStore: useBugStore,
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
