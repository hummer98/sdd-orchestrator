/**
 * Agent Completion Notification E2E Tests
 *
 * Verifies that:
 * 1. Successful spec agent execution does NOT show error toast
 * 2. Successful auto-execution (single phase) does NOT show error toast
 * 3. Agent exit error IS displayed as error toast when event fires
 *
 * Prerequisites:
 * - Run with: npm run test:e2e
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
 * - Test fixtures are in e2e-wdio/fixtures/test-project/
 */

import * as path from 'path';
import {
  ensureProjectSelected,
  selectSpecViaUI,
  setAutoExecutionPermissions,
  getAutoExecutionStatus,
  waitForCondition,
  waitForAgentPhaseStatus,
  standardE2ESetup,
  stopAutoExecution,
} from './helpers/auto-execution.helpers';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

// ============================================================
// Helpers
// ============================================================

/**
 * Get all error notifications from the notification store
 */
async function getErrorNotifications(): Promise<{ type: string; message: string }[]> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.notification?.getState) return [];
    return stores.notification.getState().notifications
      .filter((n: any) => n.type === 'error')
      .map((n: any) => ({ type: n.type, message: n.message }));
  });
}

/**
 * Clear all notifications from the store
 */
async function clearNotifications(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.notification?.getState) {
      stores.notification.getState().clearAll();
    }
  });
}

/**
 * Check if an agent exit error notification exists
 */
async function hasAgentExitErrorNotification(): Promise<boolean> {
  const errors = await getErrorNotifications();
  return errors.some((e) => e.message.includes('Agent終了処理でエラーが発生しました'));
}

/**
 * Emit AGENT_EXIT_ERROR event from Main process eventBus.
 * Uses browser.electron.execute to access the globalEventBus singleton
 * exposed on `global.__GLOBAL_EVENT_BUS__` in E2E mode (see index.ts).
 */
async function emitAgentExitError(agentId: string, errorMessage: string): Promise<void> {
  await browser.electron.execute(
    (_electron, args) => {
      const bus = (global as any).__GLOBAL_EVENT_BUS__;
      if (!bus) {
        throw new Error('__GLOBAL_EVENT_BUS__ not available - is E2E mode enabled?');
      }
      bus.emit('events:agent-exit-error', {
        agentId: args.agentId,
        error: args.errorMessage,
      });
    },
    { agentId, errorMessage }
  );
}

// ============================================================
// Tests
// ============================================================

describe('Agent Completion Notification E2E', () => {
  before(async () => {
    const success = await standardE2ESetup(FIXTURE_PROJECT_PATH, 'test-feature');
    if (!success) {
      console.warn('[E2E] standardE2ESetup failed, some tests may fail');
    }
  });

  afterEach(async () => {
    await stopAutoExecution();
    await clearNotifications();
    await browser.pause(200);
  });

  // ============================================================
  // Scenario 1: Single spec agent execution (success)
  // ============================================================

  describe('Single Spec Agent Execution', () => {
    it('should NOT show agent exit error after successful phase execution', async () => {
      await clearNotifications();

      // Click requirements phase button
      const reqButton = await $('[data-testid="phase-button-requirements"]');
      if (!(await reqButton.isExisting()) || !(await reqButton.isEnabled())) {
        console.log('[E2E] Requirements button not available, skipping');
        return;
      }
      await reqButton.click();

      // Wait for agent to complete (mock completes quickly)
      const completed = await waitForAgentPhaseStatus('requirements', 'completed', 30000);
      expect(completed).toBe(true);

      // Wait for any async notifications to arrive
      await browser.pause(1000);

      // Assert: NO agent exit error notification
      const hasError = await hasAgentExitErrorNotification();
      expect(hasError).toBe(false);

      // Assert: no error notifications at all
      const errorNotifs = await getErrorNotifications();
      console.log(`[E2E] Error notifications after phase execution: ${JSON.stringify(errorNotifs)}`);
      expect(errorNotifs).toHaveLength(0);
    });
  });

  // ============================================================
  // Scenario 2: Auto-execution with single phase permission
  // ============================================================

  describe('Auto-Execution Single Phase', () => {
    it('should complete auto-execution with single phase and NOT show error toast', async () => {
      await clearNotifications();

      // Set permissions via helper (requirements + design enabled)
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      // Start auto-execution via UI button click (recommended pattern)
      const autoButton = await $('[data-testid="auto-execution-button"]');
      await autoButton.waitForExist({ timeout: 10000 });
      await autoButton.click();
      console.log('[E2E] Auto-execution started via UI button click');

      // Wait for auto-execution to complete (agent count returns to 0)
      const completed = await waitForCondition(
        async () => {
          const s = await getAutoExecutionStatus();
          return !s.isAutoExecuting;
        },
        60000,
        500,
        'auto-execution-complete'
      );
      expect(completed).toBe(true);

      // Wait for any async notifications to arrive
      await browser.pause(1000);

      // Assert: NO agent exit error notification
      const hasError = await hasAgentExitErrorNotification();
      expect(hasError).toBe(false);

      // Assert: no error notifications at all
      const errorNotifs = await getErrorNotifications();
      console.log(`[E2E] Error notifications after auto-execution: ${JSON.stringify(errorNotifs)}`);
      expect(errorNotifs).toHaveLength(0);
    });
  });

  // ============================================================
  // Scenario 3: Agent exit error event triggers error toast
  // ============================================================

  describe('Agent Exit Error Display', () => {
    it('should show error toast when agent exit error event is emitted', async () => {
      await clearNotifications();

      // Emit AGENT_EXIT_ERROR event from Main process
      await emitAgentExitError('test-exit-error-agent', 'simulated readRecord failure');

      // Wait for notification to appear via tRPC subscription
      const appeared = await waitForCondition(
        async () => hasAgentExitErrorNotification(),
        5000,
        200,
        'agent-exit-error-notification'
      );
      expect(appeared).toBe(true);

      // Verify specific error message content
      const errors = await getErrorNotifications();
      const exitError = errors.find((e) =>
        e.message.includes('Agent終了処理でエラーが発生しました')
      );
      expect(exitError).toBeDefined();
      expect(exitError!.message).toContain('test-exit-error-agent');
    });
  });

  // ============================================================
  // Security and Stability
  // ============================================================

  describe('Security and Stability', () => {
    it('should not crash during test execution', async () => {
      const crashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.isCrashed();
      });
      expect(crashed).toBe(false);
    });
  });
});
