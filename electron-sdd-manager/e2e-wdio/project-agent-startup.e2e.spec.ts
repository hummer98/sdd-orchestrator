/**
 * Project Agent Startup E2E Tests
 *
 * These tests verify that ProjectAgent can be started without errors
 * after project selection. This is critical to ensure AgentRecordService
 * is properly initialized before agent lifecycle management.
 *
 * Bug fix verification: AgentRecordService not initialized error
 * - Error: "AgentRecordService not initialized. Call initDefaultAgentRecordService first."
 * - This error occurred when ProjectAgent was started immediately after project selection
 *   because initializeAgentLifecycleManager was called before initDefaultAgentRecordService
 *
 * Prerequisites:
 * - Run with: npm run test:e2e
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
 * - Test fixtures are in e2e-wdio/fixtures/test-project/
 */

import * as path from 'path';
import {
  ensureProjectSelected,
  refreshSpecStore,
  clearAgentStore,
  waitForCondition,
} from './helpers/auto-execution.helpers';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');

/**
 * Helper: Execute project command via tRPC
 * Returns { success: boolean, agentId?: string, error?: string }
 */
async function executeProjectCommand(
  command: string,
  title: string
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  return browser.executeAsync(
    async (cmd: string, ttl: string, done: (result: any) => void) => {
      try {
        const stores = (window as any).__STORES__;
        const projectPath = stores?.project?.getState()?.currentProject;
        if (!projectPath) {
          done({ success: false, error: 'No project selected' });
          return;
        }

        const trpc = (window as any).__TRPC__;
        if (!trpc?.spec?.executeProjectCommand?.mutate) {
          done({ success: false, error: '__TRPC__ spec.executeProjectCommand not available' });
          return;
        }

        const result = await trpc.spec.executeProjectCommand.mutate({
          specId: '',
          command: cmd,
          title: ttl,
        });
        if (result && result.agentId) {
          done({ success: true, agentId: result.agentId });
        } else {
          done({ success: false, error: 'No agentId returned' });
        }
      } catch (e) {
        done({ success: false, error: String(e) });
      }
    },
    command,
    title
  );
}

/**
 * Helper: Check if there are any agents in the store for project agents (specId = '')
 */
async function getProjectAgentCount(): Promise<number> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return 0;

    const agents = stores.agent.getState().agents;
    // agents is a Map<string, AgentInfo[]>
    // Project agents are stored with empty specId key ('')
    let count = 0;
    agents.forEach((agentList: any[], specId: string) => {
      if (specId === '') {
        count += agentList.length;
      }
    });
    return count;
  });
}

/**
 * Helper: Stop all running agents
 */
async function stopAllAgents(): Promise<void> {
  await browser.executeAsync(async (done: () => void) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) { done(); return; }

    const trpc = (window as any).__TRPC__;
    if (!trpc?.agent?.stop?.mutate) { done(); return; }

    const agents = stores.agent.getState().agents;
    // agents is a Map<string, AgentInfo[]>
    const stopPromises: Promise<void>[] = [];
    agents.forEach((agentList: any[]) => {
      agentList.forEach((agent: any) => {
        if (agent.status === 'running') {
          stopPromises.push(
            trpc.agent.stop.mutate({ agentId: agent.agentId }).catch(() => {})
          );
        }
      });
    });
    await Promise.all(stopPromises);
    done();
  });
}

/**
 * Helper: Wait for all project agents (specId='') to finish running
 * Queries Main process file-based records via tRPC to ensure agents
 * are fully stopped before proceeding (prevents ALREADY_RUNNING errors).
 */
async function waitForNoRunningProjectAgents(timeoutMs: number = 5000): Promise<boolean> {
  return waitForCondition(
    async () => {
      const noRunning = await browser.executeAsync(
        async (done: (result: boolean) => void) => {
          try {
            const trpc = (window as any).__TRPC__;
            if (!trpc?.agent?.getAgents?.query) { done(true); return; }
            const agents = await trpc.agent.getAgents.query({ specId: '' });
            const hasRunning = agents.some(
              (a: any) => a.status === 'running' || a.status === 'hang'
            );
            done(!hasRunning);
          } catch {
            done(true);
          }
        }
      );
      return noRunning;
    },
    timeoutMs,
    300,
    'no running project agents'
  );
}

/**
 * Helper: Wait for project to be properly loaded
 */
async function waitForProjectReady(): Promise<boolean> {
  return waitForCondition(
    async () => {
      const projectPath = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject;
      });
      return projectPath === FIXTURE_PROJECT_PATH;
    },
    10000,
    200,
    'project ready'
  );
}

/**
 * Helper: Robust project selection with retry
 */
async function selectProjectWithRetry(maxRetries: number = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    await ensureProjectSelected(FIXTURE_PROJECT_PATH);
    await browser.pause(1000);
    await refreshSpecStore();
    await browser.pause(500);

    const ready = await waitForProjectReady();
    if (ready) {
      return true;
    }
    console.log(`[E2E] Project selection attempt ${i + 1} failed, retrying...`);
  }
  return false;
}

describe('Project Agent Startup E2E', () => {
  // ============================================================
  // Test Setup - Single setup for all tests
  // ============================================================

  before(async () => {
    // Wait for app to stabilize
    await browser.pause(1000);

    // Clear agent store
    await clearAgentStore();
    await browser.pause(200);

    // Select project once for all tests
    const success = await selectProjectWithRetry(3);
    if (!success) {
      console.log('[E2E] Warning: Could not select project, some tests may be skipped');
    }
  });

  afterEach(async () => {
    // Stop any running agents to clean up
    await stopAllAgents();
    // Wait for agents to fully terminate on Main process side
    // (prevents ALREADY_RUNNING error in next test)
    await waitForNoRunningProjectAgents(5000);
    await browser.pause(200);
  });

  // ============================================================
  // Project Agent Startup (Core Bug Fix Verification)
  // ============================================================

  describe('Project Agent Startup (AgentRecordService initialization)', () => {
    it('should start project agent without AgentRecordService error', async () => {
      // Check if project is selected
      const projectPath = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject;
      });

      if (!projectPath) {
        console.log('[E2E] Skipping test: project not selected');
        return; // Skip test if project not selected
      }

      // This is the core test for the bug fix
      // Previously, this would fail with:
      // "Error: AgentRecordService not initialized. Call initDefaultAgentRecordService first."

      const result = await executeProjectCommand('/kiro:spec-status', 'test-agent');

      // Should not have AgentRecordService error
      if (!result.success) {
        expect(result.error).not.toContain('AgentRecordService not initialized');
        expect(result.error).not.toContain('initDefaultAgentRecordService');
      }

      // Should succeed (with mock claude)
      expect(result.success).toBe(true);
      expect(result.agentId).toBeDefined();
    });

    it('should have agent in store after successful start', async () => {
      const projectPath = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject;
      });

      if (!projectPath) {
        console.log('[E2E] Skipping test: project not selected');
        return;
      }

      // Wrap in try-catch: if previous test's agent hasn't fully stopped,
      // tRPC may throw ALREADY_RUNNING as WebDriverError
      let result: { success: boolean; agentId?: string; error?: string };
      try {
        result = await executeProjectCommand('/kiro:spec-status', 'test-agent-2');
      } catch (e: any) {
        console.log(`[E2E] executeProjectCommand threw: ${e.message}`);
        result = { success: false, error: String(e.message || e) };
      }
      expect(result.success).toBe(true);

      // Wait for agent to appear in store
      const hasAgent = await waitForCondition(
        async () => {
          const count = await getProjectAgentCount();
          if (count === 0) {
            // Debug: dump all agent store keys and counts
            const debug = await browser.execute(() => {
              const stores = (window as any).__STORES__;
              if (!stores?.agent?.getState) return 'agent store not available';
              const agents = stores.agent.getState().agents;
              const entries: string[] = [];
              agents.forEach((agentList: any[], specId: string) => {
                entries.push(`"${specId}": ${agentList.length} agents`);
              });
              return `Map size: ${agents.size}, entries: [${entries.join(', ')}]`;
            });
            console.log(`[E2E] getProjectAgentCount=0, agentStore debug: ${debug}`);
          }
          return count > 0;
        },
        10000,
        200,
        'agent in store'
      );

      expect(hasAgent).toBe(true);
    });

    it('should show ProjectAgentPanel', async () => {
      const projectPath = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        return stores?.project?.getState()?.currentProject;
      });

      if (!projectPath) {
        console.log('[E2E] Skipping test: project not selected');
        return;
      }

      // Check ProjectAgentPanel exists
      const panel = await $('[data-testid="project-agent-panel"]');
      const panelExists = await panel.isExisting();
      expect(panelExists).toBe(true);
    });
  });

  // ============================================================
  // Error Cases (Non-AgentRecordService errors)
  // ============================================================

  describe('Error Handling', () => {
    it('should fail gracefully without project selected', async () => {
      // Clear project selection by setting null
      await browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (stores?.project?.setState) {
          stores.project.setState({ currentProject: null });
        }
      });

      // executeProjectCommand may throw a WebDriverError when the tRPC
      // mutation fails on the Main process side (the error propagates
      // through Chromedriver before the done() callback is processed).
      // We handle both cases: a returned error object or a thrown error.
      let result: { success: boolean; error?: string };
      try {
        result = await executeProjectCommand('/kiro:spec-status', 'no-project');
      } catch (e: any) {
        // WebDriverError wraps the error message from the renderer
        result = { success: false, error: String(e.message || e) };
      }

      // Should fail with appropriate error (not AgentRecordService error)
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // The error should be about no project, not about AgentRecordService
      expect(result.error).not.toContain('AgentRecordService not initialized');
    });
  });

  // ============================================================
  // Security and Stability
  // ============================================================

  describe('Security Settings', () => {
    it('should have contextIsolation enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('should have nodeIntegration disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });
  });

  describe('Application Stability', () => {
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
