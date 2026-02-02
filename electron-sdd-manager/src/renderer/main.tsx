/**
 * Renderer Process Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { useProjectStore, useSpecStore, useSharedBugStore, notify } from './stores';
import { setNotificationHandler } from '@shared/stores/notificationStore';

// agent-error-notification Task 7.2: Import getAgentStartErrorMessage for localized error display
// Requirements: 3.3, 3.4
import { getAgentStartErrorMessage } from '@shared/types/agentStartErrorMessages';

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

// worktree-rebase-from-main: Configure shared notification handler
// This connects the shared notification store to the renderer's notify helpers
// Required for handleRebaseResult to show UI notifications
setNotificationHandler((n) => {
  if (n.type === 'success') notify.success(n.message);
  else if (n.type === 'error') notify.error(n.message);
  else if (n.type === 'warning') notify.warning(n.message);
  else notify.info(n.message);
});

// agent-error-notification Task 7.2: Register agent start error listener
// Requirements: 3.3, 3.5, 5.3
// Displays Toast notification when agent startup fails (spawn error, auth error, etc.)
// Auto-dismiss after 8 seconds (notify.error default behavior)
if (typeof window !== 'undefined' && window.electronAPI) {
  window.electronAPI.onAgentStartError((data) => {
    const message = getAgentStartErrorMessage(data.error);
    notify.error(message);
  });
}

// Export stores for debugging (dev only)
// bugs-view-unification Task 6.1: Use shared bugStore
if (import.meta.env.DEV) {
  (window as unknown as { __stores: unknown }).__stores = {
    projectStore: useProjectStore,
    specStore: useSpecStore,
    bugStore: useSharedBugStore,
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
