/**
 * Renderer Process Entry Point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeE2EShim } from './api/E2EShim';
import { App } from './App';
import { TRPCProvider } from '../shared/trpc/provider';
import './styles/index.css';

// Initialize E2E Shim if in E2E environment
if ((window as any).isE2E) {
  initializeE2EShim();
}
import { useProjectStore, useSpecStore, useSharedBugStore, notify } from './stores';
import { setNotificationHandler } from '@shared/stores/notificationStore';

// agent-error-notification Task 7.2: Import getAgentStartErrorMessage for localized error display
// Requirements: 3.3, 3.4
import { getAgentStartErrorMessage } from '@shared/types/agentStartErrorMessages';
// trpc-full-migration Task 9.2: tRPC Subscription for event listeners
import { getVanillaClient } from '@shared/trpc/vanillaClient';

// ipclink-singleton-unification Task 3.2: consoleHook removed
// Renderer console logging is now handled by Main process console-message native API (DD-003)

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
// Task 9.2: window.electronAPI.onAgentStartError -> tRPC Subscription
// Displays Toast notification when agent startup fails (spawn error, auth error, etc.)
// Auto-dismiss after 8 seconds (notify.error default behavior)
if (typeof window !== 'undefined') {
  try {
    getVanillaClient().events.onAgentStartError.subscribe(undefined, {
      onData: (data: { agentId: string; specId: string; error: Record<string, unknown> }) => {
        if (!data) return;
        const message = getAgentStartErrorMessage(data.error as unknown as Parameters<typeof getAgentStartErrorMessage>[0]);
        notify.error(message);
      },
    });
  } catch (error) {
    console.warn('[main] Failed to subscribe to agent start errors via tRPC', error);
  }
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
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </React.StrictMode>
);
