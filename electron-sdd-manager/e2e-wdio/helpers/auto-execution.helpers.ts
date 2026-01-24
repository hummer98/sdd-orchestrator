/**
 * Auto Execution E2E Helpers
 *
 * Shared helper functions for auto-execution E2E tests.
 * These helpers use the new specStore-based API (spec-scoped-auto-execution-state feature).
 *
 * Usage:
 * ```typescript
 * import {
 *   selectProjectViaStore,
 *   selectSpecViaStore,
 *   getAutoExecutionStatus,
 *   setAutoExecutionPermissions,
 *   waitForCondition,
 * } from './helpers/auto-execution.helpers';
 * ```
 */

/**
 * Auto-execution status for a specific spec
 */
export interface AutoExecutionStatusResult {
  isAutoExecuting: boolean;
  autoExecutionStatus: string;
  currentAutoPhase: string | null;
}

/**
 * Result of selectProjectViaStore with detailed error info
 */
export interface SelectProjectResult {
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Helper: Select project using Zustand store action
 *
 * Now properly checks the IPC result via lastSelectResult in projectStore.
 * Returns detailed error information for debugging.
 */
export async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  const result = await selectProjectViaStoreDetailed(projectPath);
  return result.success;
}

/**
 * Helper: Select project with detailed result
 */
export async function selectProjectViaStoreDetailed(projectPath: string): Promise<SelectProjectResult> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: SelectProjectResult) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.project?.getState) {
          await stores.project.getState().selectProject(projPath);
          // Check the actual IPC result from lastSelectResult
          const result = stores.project.getState().lastSelectResult;
          if (result?.success) {
            done({ success: true });
          } else {
            const errorInfo = result?.error || {};
            console.error('[E2E] selectProject failed:', errorInfo);
            done({
              success: false,
              errorCode: errorInfo.code || 'UNKNOWN_ERROR',
              errorMessage: errorInfo.message || 'Unknown error',
            });
          }
        } else {
          console.error('[E2E] __STORES__ not available');
          done({ success: false, errorCode: 'STORES_NOT_AVAILABLE', errorMessage: '__STORES__ not available' });
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done({ success: false, errorCode: 'EXCEPTION', errorMessage: String(e) });
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Select spec using Zustand specStore action
 */
export async function selectSpecViaStore(specId: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.spec?.getState) {
          const specStore = stores.spec.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            specStore.selectSpec(spec);
            done(true);
          } else {
            console.error('[E2E] Spec not found:', id);
            done(false);
          }
        } else {
          console.error('[E2E] specStore not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectSpec error:', e);
        done(false);
      }
    }, specId).then(resolve);
  });
}

/**
 * Helper: Set auto-execution permissions via workflowStore
 */
export async function setAutoExecutionPermissions(
  permissions: Record<string, boolean>
): Promise<boolean> {
  return browser.execute((perms: Record<string, boolean>) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflow?.getState) return false;

      const workflowStore = stores.workflow.getState();
      const currentPermissions = workflowStore.autoExecutionPermissions;

      for (const [phase, desired] of Object.entries(perms)) {
        if (currentPermissions[phase] !== desired) {
          workflowStore.toggleAutoPermission(phase);
        }
      }
      return true;
    } catch (e) {
      console.error('[E2E] setAutoExecutionPermissions error:', e);
      return false;
    }
  }, permissions);
}

/**
 * Helper: Get auto-execution status from specStore.getAutoExecutionRuntime
 *
 * Uses the new Map-based per-Spec state (spec-scoped-auto-execution-state feature).
 * Automatically retrieves the currently selected spec's auto-execution state.
 */
export async function getAutoExecutionStatus(): Promise<AutoExecutionStatusResult> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.spec?.getState) {
        return { isAutoExecuting: false, autoExecutionStatus: 'idle', currentAutoPhase: null };
      }
      const storeState = stores.spec.getState();
      const specId = storeState.specDetail?.metadata?.name || '';
      const state = storeState.getAutoExecutionRuntime(specId);
      return {
        isAutoExecuting: state.isAutoExecuting,
        autoExecutionStatus: state.autoExecutionStatus,
        currentAutoPhase: state.currentAutoPhase,
      };
    } catch (e) {
      return { isAutoExecuting: false, autoExecutionStatus: 'error', currentAutoPhase: null };
    }
  });
}

/**
 * Helper: Get auto-execution status for a specific spec ID
 */
export async function getAutoExecutionStatusForSpec(
  specId: string
): Promise<AutoExecutionStatusResult> {
  return browser.execute((id: string) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.spec?.getState) {
        return { isAutoExecuting: false, autoExecutionStatus: 'idle', currentAutoPhase: null };
      }
      const storeState = stores.spec.getState();
      const state = storeState.getAutoExecutionRuntime(id);
      return {
        isAutoExecuting: state.isAutoExecuting,
        autoExecutionStatus: state.autoExecutionStatus,
        currentAutoPhase: state.currentAutoPhase,
      };
    } catch (e) {
      return { isAutoExecuting: false, autoExecutionStatus: 'error', currentAutoPhase: null };
    }
  }, specId);
}

/**
 * Helper: Wait for condition with debug logging
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500,
  debugLabel: string = 'condition'
): Promise<boolean> {
  const startTime = Date.now();
  let iteration = 0;
  while (Date.now() - startTime < timeout) {
    iteration++;
    const result = await condition();
    if (result) {
      console.log(
        `[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`
      );
      return true;
    }
    // Debug: print auto-execution state every 2 seconds
    if (iteration % 4 === 0) {
      const status = await getAutoExecutionStatus();
      console.log(
        `[E2E] ${debugLabel} iteration ${iteration}: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}, phase=${status.currentAutoPhase}`
      );
    }
    await browser.pause(interval);
  }
  // Final debug log on timeout
  const status = await getAutoExecutionStatus();
  console.log(
    `[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations. Final state: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}, phase=${status.currentAutoPhase}`
  );
  return false;
}

/**
 * Helper: Refresh spec store
 */
export async function refreshSpecStore(): Promise<void> {
  await browser.executeAsync((done) => {
    const stores = (window as any).__STORES__;
    const refreshFn = stores?.spec?.getState()?.refreshSpecs;
    if (refreshFn) {
      refreshFn()
        .then(() => done())
        .catch(() => done());
    } else {
      done();
    }
  });
  await browser.pause(300);
}

/**
 * Helper: Clear agent store
 *
 * Note: agents is a Map<string, AgentInfo[]>, so we need to iterate correctly.
 */
export async function clearAgentStore(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.agent?.getState) {
      const state = stores.agent.getState();
      // agents is a Map<string, AgentInfo[]>
      state.agents.forEach((agentList: any[], _specId: string) => {
        agentList.forEach((agent: any) => {
          state.removeAgent(agent.agentId);
        });
      });
    }
  });
}

/**
 * Helper: Reset AutoExecutionService state for test isolation
 */
export async function resetAutoExecutionService(): Promise<void> {
  await browser.execute(() => {
    const service = (window as any).__AUTO_EXECUTION_SERVICE__;
    if (service?.resetForTest) {
      service.resetForTest();
    }
  });
}

/**
 * Helper: Reset specStore autoExecution runtime state for current spec
 */
export async function resetSpecStoreAutoExecution(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.spec?.getState) {
      const storeState = stores.spec.getState();
      const specId = storeState.specDetail?.metadata?.name || '';
      if (specId && storeState.getAutoExecutionRuntime(specId)?.isAutoExecuting) {
        storeState.stopAutoExecution(specId);
      }
      if (specId) {
        storeState.setAutoExecutionStatus(specId, 'idle');
        storeState.setAutoExecutionPhase(specId, null);
        storeState.setAutoExecutionRunning(specId, false);
      }
    }
  });
}

/**
 * Helper: Wait for AutoExecutionService to be initialized
 */
export async function waitForAutoExecutionService(timeout: number = 5000): Promise<boolean> {
  return waitForCondition(
    async () => {
      return browser.execute(() => {
        return !!(window as any).__AUTO_EXECUTION_SERVICE__;
      });
    },
    timeout,
    100,
    'auto-execution-service-init'
  );
}

/**
 * Helper: Get AutoExecutionService debug info
 */
export async function getAutoExecutionServiceDebugInfo(): Promise<{
  trackedAgentIds: string[];
  pendingEvents: [string, string][];
  ipcListenerRegistered: boolean;
  serviceExists: boolean;
}> {
  return browser.execute(() => {
    try {
      const service = (window as any).__AUTO_EXECUTION_SERVICE__;
      if (!service) {
        return {
          trackedAgentIds: [],
          pendingEvents: [],
          ipcListenerRegistered: false,
          serviceExists: false,
        };
      }
      const debugInfo = service.getDebugInfo();
      return {
        ...debugInfo,
        serviceExists: true,
      };
    } catch (e) {
      return {
        trackedAgentIds: [],
        pendingEvents: [],
        ipcListenerRegistered: false,
        serviceExists: false,
      };
    }
  });
}

/**
 * Helper: Get running agents count from AgentStore for a spec
 */
export async function getRunningAgentsCount(specName: string): Promise<number> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return 0;
    const agents = stores.agent.getState().getAgentsForSpec(spec);
    return agents.filter((a: any) => a.status === 'running').length;
  }, specName);
}

/**
 * Helper: Get agents count from AgentStore for a spec
 */
export async function getAgentsCount(specName: string): Promise<number> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return 0;
    return stores.agent.getState().getAgentsForSpec(spec).length;
  }, specName);
}

/**
 * Helper: Wait for running agent to appear in AgentStore
 */
export async function waitForRunningAgent(
  specName: string,
  timeout: number = 5000
): Promise<boolean> {
  return waitForCondition(
    async () => (await getRunningAgentsCount(specName)) > 0,
    timeout,
    100,
    'running-agent-in-store'
  );
}

/**
 * Helper: Wait for agent to appear in AgentStore (any status)
 */
export async function waitForAgentInStore(
  specName: string,
  timeout: number = 5000
): Promise<boolean> {
  return waitForCondition(
    async () => (await getAgentsCount(specName)) > 0,
    timeout,
    100,
    'agent-in-store'
  );
}

/**
 * Helper: Debug - get all agents from AgentStore
 */
export async function debugGetAllAgents(): Promise<{ specId: string; agents: any[] }[]> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return [];
    const state = stores.agent.getState();
    const result: { specId: string; agents: any[] }[] = [];
    state.agents.forEach((agents: any[], specId: string) => {
      result.push({ specId, agents });
    });
    return result;
  });
}

/**
 * Helper: Get agents for a specific phase pattern
 *
 * AgentInfo has 'phase' field (not 'skill').
 * agents is a Map<string, AgentInfo[]> where key is specId.
 * AgentInfo interface:
 *   - agentId: string
 *   - specId: string
 *   - phase: string (e.g., 'kiro:spec-tasks', 'kiro:spec-impl', 'kiro:document-review')
 *   - status: 'running' | 'completed' | 'failed' | 'stopped'
 *
 * @param phasePattern Pattern to match against agent.phase (e.g., 'tasks', 'impl', 'document-review')
 */
export async function getAgentsForPhase(
  phasePattern: string
): Promise<{ phase: string; status: string; agentId: string; specId: string }[]> {
  return browser.execute((pattern: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return [];

    const agents: { phase: string; status: string; agentId: string; specId: string }[] = [];
    const agentsMap = stores.agent.getState().agents;

    // agents is a Map<string, AgentInfo[]>
    agentsMap.forEach((agentList: any[], specId: string) => {
      agentList.forEach((agent: any) => {
        if (agent.phase && agent.phase.includes(pattern)) {
          agents.push({
            phase: agent.phase,
            status: agent.status,
            agentId: agent.agentId,
            specId: specId,
          });
        }
      });
    });
    return agents;
  }, phasePattern);
}

/**
 * Helper: Wait for agent with specific phase to reach expected status
 *
 * @param phasePattern Pattern to match against agent.phase
 * @param expectedStatus Expected status (e.g., 'completed', 'running')
 * @param timeout Timeout in milliseconds
 */
export async function waitForAgentPhaseStatus(
  phasePattern: string,
  expectedStatus: string,
  timeout: number = 60000
): Promise<boolean> {
  return waitForCondition(
    async () => {
      const agents = await getAgentsForPhase(phasePattern);
      return agents.some((a) => a.status === expectedStatus);
    },
    timeout,
    1000,
    `agent-${phasePattern}-${expectedStatus}`
  );
}

/**
 * Helper: Log browser console logs (for debugging)
 */
export async function logBrowserConsole(): Promise<void> {
  try {
    const logs = await browser.getLogs('browser');
    if (logs && logs.length > 0) {
      console.log('[E2E] Browser logs:');
      for (const log of logs) {
        console.log(`  [${log.level}] ${log.message}`);
      }
    }
  } catch (e) {
    console.log('[E2E] Could not get browser logs:', e);
  }
}

/**
 * Helper: Stop auto-execution for current spec via store action
 *
 * Uses workflowStore for the legacy stopAutoExecution action.
 * Note: For proper cleanup, also call resetSpecStoreAutoExecution().
 */
export async function stopAutoExecution(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.spec?.getState) {
      const storeState = stores.spec.getState();
      const specId = storeState.specDetail?.metadata?.name || '';
      if (specId && storeState.getAutoExecutionRuntime(specId)?.isAutoExecuting) {
        storeState.stopAutoExecution(specId);
      }
    }
  });
}

/**
 * Helper: Reset AutoExecutionCoordinator state in Main Process
 *
 * This is the key fix for the state leak bug between E2E tests.
 * The bug occurs because:
 * - Renderer side (specStore/workflowStore) state gets reset via helpers
 * - Main Process side (AutoExecutionCoordinator) state remains 'running'
 * - Next test's start() call gets rejected with ALREADY_EXECUTING
 *
 * This helper calls the new autoExecutionReset IPC which resets
 * the Main Process AutoExecutionCoordinator's internal state.
 *
 * Usage:
 * ```typescript
 * beforeEach(async () => {
 *   await resetAutoExecutionCoordinator();
 *   // ... other setup
 * });
 * ```
 */
export async function resetAutoExecutionCoordinator(): Promise<void> {
  await browser.execute(async () => {
    try {
      await (window as any).electronAPI.autoExecutionReset();
    } catch (e) {
      console.error('[E2E] resetAutoExecutionCoordinator error:', e);
    }
  });
}

/**
 * Helper: Full auto-execution cleanup for test isolation
 *
 * This helper performs complete cleanup of both Renderer and Main Process
 * auto-execution state. Call this in beforeEach/afterEach for reliable
 * test isolation.
 *
 * Cleanup sequence:
 * 1. Reset Main Process AutoExecutionCoordinator
 * 2. Reset Renderer specStore auto-execution state
 * 3. Reset AutoExecutionService (if exists)
 */
export async function fullAutoExecutionCleanup(): Promise<void> {
  // 1. Reset Main Process coordinator (fixes ALREADY_EXECUTING bug)
  await resetAutoExecutionCoordinator();

  // 2. Reset Renderer specStore state
  await resetSpecStoreAutoExecution();

  // 3. Reset AutoExecutionService
  await resetAutoExecutionService();
}

/**
 * Helper: Set document review flag via workflowStore
 *
 * Controls the document review behavior after tasks phase completion:
 * - 'skip': Skip document review entirely
 * - 'run': Run document review automatically and continue
 * - 'pause': Run document review and pause for manual action
 *
 * @param flag The document review flag to set
 */
export async function setDocumentReviewFlag(flag: 'run' | 'pause' | 'skip'): Promise<boolean> {
  return browser.execute((f: string) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflow?.getState) return false;

      const workflowStore = stores.workflow.getState();
      workflowStore.setDocumentReviewAutoExecutionFlag(f);
      return true;
    } catch (e) {
      console.error('[E2E] setDocumentReviewFlag error:', e);
      return false;
    }
  }, flag);
}

/**
 * Helper: Set mock environment variable via IPC
 *
 * Allows dynamic control of mock Claude CLI behavior during E2E tests:
 * - E2E_MOCK_DOC_REVIEW_RESULT: "approved" or "needs_fix"
 * - E2E_MOCK_TASKS_COMPLETE: "true" or "false"
 * - E2E_MOCK_CLAUDE_DELAY: delay in seconds
 *
 * @param key The environment variable name
 * @param value The value to set
 */
export async function setMockEnv(key: string, value: string): Promise<void> {
  await browser.execute(async (k, v) => {
    try {
      await (window as any).electronAPI.setMockEnv(k, v);
    } catch (e) {
      console.error('[E2E] setMockEnv error:', e);
    }
  }, key, value);
}

/**
 * Helper: Configure mock Claude CLI for E2E tests
 *
 * Convenience wrapper for setting multiple mock environment variables.
 *
 * @param config Configuration options
 */
export async function configureMockClaude(config: {
  docReviewResult?: 'approved' | 'needs_fix';
  tasksComplete?: boolean;
  delay?: string;
}): Promise<void> {
  if (config.docReviewResult !== undefined) {
    await setMockEnv('E2E_MOCK_DOC_REVIEW_RESULT', config.docReviewResult);
  }
  if (config.tasksComplete !== undefined) {
    await setMockEnv('E2E_MOCK_TASKS_COMPLETE', config.tasksComplete ? 'true' : 'false');
  }
  if (config.delay !== undefined) {
    await setMockEnv('E2E_MOCK_CLAUDE_DELAY', config.delay);
  }
}
