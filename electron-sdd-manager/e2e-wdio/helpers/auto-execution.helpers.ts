/**
 * Auto Execution E2E Helpers
 *
 * Shared helper functions for auto-execution E2E tests.
 * These helpers use the new specStore-based API (spec-scoped-auto-execution-state feature).
 *
 * Usage:
 * ```typescript
 * import {
 *   ensureProjectSelected,
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
 * @deprecated SDD_PROJECT_PATH 環境変数を使用してください。
 * この関数はRenderer→IPC→Main経路を使うため不安定です。
 * wdio.conf.ts の appEnv で SDD_PROJECT_PATH を設定する方法が推奨されます。
 * 例: SDD_PROJECT_PATH="$(pwd)/e2e-wdio/fixtures/test-project" npm run test:e2e -- --spec ...
 */
export async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  const result = await selectProjectViaStoreDetailed(projectPath);
  return result.success;
}

/**
 * Helper: Select project with detailed result
 *
 * @deprecated SDD_PROJECT_PATH 環境変数を使用してください。
 * この関数はRenderer→IPC→Main経路を使うため不安定です。
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
 * Helper: Ensure a project is selected
 *
 * SDD_PROJECT_PATH環境変数による起動時自動選択を優先し、
 * 未選択の場合のみストア経由でフォールバック選択を行う。
 *
 * @param projectPath フォールバック時に選択するプロジェクトパス
 * @returns true if project is selected
 */
export async function ensureProjectSelected(projectPath: string): Promise<boolean> {
  // Check if project is already selected (via SDD_PROJECT_PATH at startup)
  const currentProject = await browser.execute(() => {
    const stores = (window as any).__STORES__;
    return stores?.project?.getState()?.currentProject;
  });

  if (currentProject) {
    return true;
  }

  // Fallback: select via store IPC (Renderer→IPC→Main)
  return selectProjectViaStore(projectPath);
}

/**
 * Helper: Wait for spec detail to be loaded and ready
 *
 * E2E-fix: This function waits until specDetail is fully loaded before
 * proceeding with tests that depend on UI elements like agent-list-panel.
 *
 * Bug fix: mermaid-preview E2E - Check specDetail via selectedSpec instead
 * The facade's specDetail may not sync immediately after selectSpec is called.
 * We verify by checking selectedSpec.name matches and isLoading is false.
 *
 * @param specName The spec name to wait for
 * @param timeout Timeout in milliseconds
 */
export async function waitForSpecDetailReady(
  specName: string,
  timeout: number = 15000
): Promise<boolean> {
  return waitForCondition(
    async () => {
      return browser.execute((name: string) => {
        const stores = (window as any).__STORES__;
        if (!stores?.spec?.getState) return false;

        const state = stores.spec.getState();
        // Debug: log the current state
        console.log('[E2E] waitForSpecDetailReady check:', {
          selectedSpec: state.selectedSpec?.name,
          specDetail: state.specDetail?.metadata?.name,
          isDetailLoading: state.isDetailLoading,
        });

        // Check that specDetail is loaded and matches the expected spec
        // specDetail !== null is required because SpecPane shows a loading
        // spinner when specDetail is null, preventing workflow-view from rendering.
        const specDetailReady =
          state.specDetail !== null &&
          !state.isDetailLoading &&
          state.specDetail?.metadata?.name === name;

        const selectedSpecReady =
          state.specDetail !== null &&
          state.selectedSpec !== null &&
          state.selectedSpec?.name === name &&
          !state.isDetailLoading;

        return specDetailReady || selectedSpecReady;
      }, specName);
    },
    timeout,
    200, // Check frequently for better responsiveness
    `spec-detail-ready-${specName}`
  );
}

/**
 * Helper: Wait for UI to be fully rendered after project selection
 *
 * E2E-fix: Waits for key UI elements to be visible after project selection.
 * This helps prevent timeout errors when tests try to interact with
 * elements that haven't rendered yet.
 *
 * @param timeout Timeout in milliseconds
 */
export async function waitForProjectUIReady(timeout: number = 10000): Promise<boolean> {
  const startTime = Date.now();

  // Wait for docs-tabs to appear (indicates project is loaded)
  const docsTabsExists = await waitForCondition(
    async () => {
      const element = await $('[data-testid="docs-tabs"]');
      return element.isExisting();
    },
    timeout,
    200,
    'docs-tabs-visible'
  );

  if (!docsTabsExists) {
    console.warn('[E2E] docs-tabs not visible after project selection');
    return false;
  }

  // Wait a bit for React to finish any remaining renders
  await browser.pause(100);

  console.log(
    `[E2E] Project UI ready after ${Date.now() - startTime}ms`
  );
  return true;
}

/**
 * Helper: Select spec using UI click (recommended approach)
 *
 * This is the recommended way to select a spec in E2E tests.
 * Store-based selectSpec (selectSpecViaStore) is an anti-pattern because
 * tRPC IPC calls inside selectSpec don't complete properly in browser.executeAsync context,
 * resulting in specDetail remaining null and workflow-view not rendering.
 *
 * @param specName The spec name to select (used to find data-testid="spec-item-{specName}")
 * @param timeout Timeout for waiting for elements
 * @returns true if spec was selected, false otherwise
 */
export async function selectSpecViaUI(specName: string, timeout: number = 10000): Promise<boolean> {
  try {
    // Wait for spec list to be visible
    const specList = await $('[data-testid="spec-list"]');
    await specList.waitForExist({ timeout });

    // Find and click the spec item
    const specItem = await $(`[data-testid="spec-item-${specName}"]`);
    if (await specItem.isExisting()) {
      await specItem.click();
      await browser.pause(1000);
      return true;
    }
    console.error(`[E2E] selectSpecViaUI: spec-item-${specName} not found`);
    return false;
  } catch (e) {
    console.error(`[E2E] selectSpecViaUI error:`, e);
    return false;
  }
}

/**
 * Helper: Select spec using Zustand specStore action
 *
 * @deprecated selectSpecViaUI() を使用してください。
 * この関数は browser.executeAsync 内で tRPC IPC を呼び出すため、
 * specDetail が null のまま完了し workflow-view が描画されない問題があります。
 * UI クリック（selectSpecViaUI）を使用すると React の正常なレンダリングパイプラインで
 * tRPC レスポンスが処理されるため安定します。
 *
 * Bug fix: mermaid-preview E2E
 * - Wait for specs to load before attempting selection
 * - selectSpec is async and loads specDetail automatically (no separate loadSpecDetail needed)
 */
export async function selectSpecViaStore(specId: string): Promise<boolean> {
  // First, wait for specs to be loaded (up to 15 seconds)
  const specsLoaded = await waitForCondition(
    async () => {
      return browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (!stores?.spec?.getState) return false;
        const specStore = stores.spec.getState();
        return specStore.specs && specStore.specs.length > 0;
      });
    },
    15000,
    500,
    'specs-array-loaded'
  );

  if (!specsLoaded) {
    console.error('[E2E] Timeout waiting for specs to load');
    return false;
  }

  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.spec?.getState) {
          const specStore = stores.spec.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            // selectSpec is async and automatically loads specDetail
            // No need for separate loadSpecDetail call
            await specStore.selectSpec(spec);
            done(true);
          } else {
            console.error('[E2E] Spec not found:', id, 'Available:', specStore.specs.map((s: any) => s.name));
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
 * Helper: Set auto-execution permissions via spec.json (SSOT)
 *
 * Since spec-scoped-auto-execution-state feature, permissions are stored in
 * spec.json.autoExecution.permissions, not in workflowStore.
 *
 * @param permissions Record of phase names to boolean (true = GO, false = NOGO)
 */
export async function setAutoExecutionPermissions(
  permissions: Record<string, boolean>
): Promise<boolean> {
  return browser.executeAsync(async (perms: Record<string, boolean>, done: (result: boolean) => void) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.spec?.getState) {
        console.error('[E2E] setAutoExecutionPermissions: specStore not available');
        done(false);
        return;
      }

      const specStore = stores.spec.getState();
      const specDetail = specStore.specDetail;
      if (!specDetail?.metadata?.name) {
        console.error('[E2E] setAutoExecutionPermissions: no spec selected');
        done(false);
        return;
      }

      // Convert permission keys: 'documentReview' -> 'document-review' for spec.json
      const normalizedPerms: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(perms)) {
        const normalizedKey = key === 'documentReview' ? 'document-review' : key;
        normalizedPerms[normalizedKey] = value;
      }

      // Update spec.json via electronAPI (SSOT)
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.updateSpecJson) {
        console.error('[E2E] setAutoExecutionPermissions: electronAPI.updateSpecJson not available');
        done(false);
        return;
      }

      await electronAPI.updateSpecJson(specDetail.metadata.name, {
        autoExecution: {
          enabled: true,
          permissions: normalizedPerms,
        },
      });

      // Wait for file watcher to detect spec.json change and update specStore
      // refreshSpecs was removed (File Watcher handles updates automatically)
      // Use a small delay to allow the file watcher event to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      done(true);
    } catch (e) {
      console.error('[E2E] setAutoExecutionPermissions error:', e);
      done(false);
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
 * zustand-agent-selector-hooks: Use agents Map directly instead of getAgentsForSpec
 */
export async function getRunningAgentsCount(specName: string): Promise<number> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return 0;
    const agentsMap = stores.agent.getState().agents;
    const agents = agentsMap.get(spec) || [];
    return agents.filter((a: any) => a.status === 'running').length;
  }, specName);
}

/**
 * Helper: Get agents count from AgentStore for a spec
 * zustand-agent-selector-hooks: Use agents Map directly instead of getAgentsForSpec
 */
export async function getAgentsCount(specName: string): Promise<number> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return 0;
    const agentsMap = stores.agent.getState().agents;
    return (agentsMap.get(spec) || []).length;
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
 * Helper: Standard E2E test setup sequence
 *
 * E2E-fix: This function provides a standardized setup sequence that:
 * 1. Cleans up previous auto-execution state
 * 2. Selects the project
 * 3. Waits for UI to be ready
 * 4. Selects the spec
 * 5. Waits for spec detail to be loaded
 *
 * Use this in beforeEach for reliable test setup.
 *
 * @param projectPath Path to the project
 * @param specName Spec name to select
 * @returns true if setup succeeded, false otherwise
 */
export async function standardE2ESetup(
  projectPath: string,
  specName: string
): Promise<boolean> {
  // 1. Clean up auto-execution state from previous tests
  await fullAutoExecutionCleanup();
  await browser.pause(100);

  // 2. Ensure project is selected (SDD_PROJECT_PATH優先、フォールバックあり)
  const projectSelected = await ensureProjectSelected(projectPath);
  if (!projectSelected) {
    console.error('[E2E] standardE2ESetup: Failed to select project');
    return false;
  }

  // 3. Wait for project UI to be ready
  const uiReady = await waitForProjectUIReady(15000);
  if (!uiReady) {
    console.warn('[E2E] standardE2ESetup: UI not ready, continuing anyway');
  }

  // 4. Select spec
  const specSelected = await selectSpecViaStore(specName);
  if (!specSelected) {
    console.error('[E2E] standardE2ESetup: Failed to select spec');
    return false;
  }

  // 5. Wait for spec detail to be loaded
  const specReady = await waitForSpecDetailReady(specName, 15000);
  if (!specReady) {
    console.warn('[E2E] standardE2ESetup: Spec detail not ready, continuing anyway');
  }

  // Allow UI to settle
  await browser.pause(200);

  return true;
}

/**
 * Helper: Set document review flag via workflowStore
 *
 * @deprecated document-review-phase Task 6.1: This function is DEPRECATED.
 * documentReviewFlag has been removed. Use setAutoExecutionPermissions with
 * 'document-review' permission instead.
 *
 * - permissions['document-review'] = true (GO): Run document review
 * - permissions['document-review'] = false (NOGO): Stop at document-review phase
 *
 * There is no skip option - document-review is mandatory between tasks and impl.
 *
 * @param flag The document review flag to set (ignored - function is a no-op)
 */
export async function setDocumentReviewFlag(_flag: 'run' | 'pause'): Promise<boolean> {
  console.warn('[E2E] setDocumentReviewFlag is DEPRECATED. Use setAutoExecutionPermissions instead.');
  // No-op - this function is deprecated
  return true;
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

/**
 * Helper: Resume agent with additional instruction
 *
 * Calls agentStore.resumeAgent to send additional instruction to a completed agent.
 * This creates a new Claude CLI session with the -r (resume) flag.
 *
 * @param agentId The agent ID to resume
 * @param prompt The additional instruction to send
 * @returns true if resume was initiated, false otherwise
 */
export async function resumeAgentViaStore(agentId: string, prompt: string): Promise<boolean> {
  return browser.executeAsync(async (id: string, p: string, done: (result: boolean) => void) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.agent?.getState) {
        console.error('[E2E] resumeAgentViaStore: agentStore not available');
        done(false);
        return;
      }

      const agentStore = stores.agent.getState();
      await agentStore.resumeAgent(id, p);
      done(true);
    } catch (e) {
      console.error('[E2E] resumeAgentViaStore error:', e);
      done(false);
    }
  }, agentId, prompt);
}

/**
 * Helper: Get logs for an agent
 *
 * @param agentId The agent ID
 * @returns Array of parsed log entries
 */
export async function getAgentLogs(agentId: string): Promise<any[]> {
  return browser.execute((id: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return [];
    return stores.agent.getState().getLogsForAgent(id);
  }, agentId);
}

/**
 * Helper: Get selected agent ID
 *
 * @returns The selected agent ID or null
 */
export async function getSelectedAgentId(): Promise<string | null> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return null;
    return stores.agent.getState().selectedAgentId;
  });
}

/**
 * Helper: Wait for agent to complete
 *
 * @param agentId The agent ID to wait for
 * @param timeout Timeout in milliseconds
 */
export async function waitForAgentComplete(
  agentId: string,
  timeout: number = 30000
): Promise<boolean> {
  return waitForCondition(
    async () => {
      const agent = await browser.execute((id: string) => {
        const stores = (window as any).__STORES__;
        if (!stores?.agent?.getState) return null;
        return stores.agent.getState().getAgentById(id);
      }, agentId);
      return agent?.status === 'completed' || agent?.status === 'error';
    },
    timeout,
    500,
    'agent-complete'
  );
}

/**
 * Helper: Get first agent for a spec
 * zustand-agent-selector-hooks: Use agents Map directly instead of getAgentsForSpec
 *
 * @param specName The spec name
 * @returns The first agent info or null
 */
export async function getFirstAgentForSpec(specName: string): Promise<any | null> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return null;
    const agentsMap = stores.agent.getState().agents;
    const agents = agentsMap.get(spec) || [];
    return agents.length > 0 ? agents[0] : null;
  }, specName);
}
