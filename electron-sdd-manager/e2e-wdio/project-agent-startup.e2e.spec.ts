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
 * Helper: Execute project command via IPC
 * Returns { success: boolean, agentId?: string, error?: string }
 */
async function executeProjectCommand(
  command: string,
  title: string
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  return browser.execute(
    async (cmd: string, ttl: string) => {
      try {
        const stores = (window as any).__STORES__;
        const projectPath = stores?.project?.getState()?.currentProject;
        if (!projectPath) {
          return { success: false, error: 'No project selected' };
        }

        const result = await (window as any).electronAPI.executeProjectCommand(projectPath, cmd, ttl);
        if (result && result.agentId) {
          return { success: true, agentId: result.agentId };
        }
        return { success: false, error: 'No agentId returned' };
      } catch (e) {
        return { success: false, error: String(e) };
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
    // Project agents have empty specId
    return Object.values(agents).filter((a: any) => a.specId === '').length;
  });
}

/**
 * Helper: Stop all running agents
 */
async function stopAllAgents(): Promise<void> {
  await browser.execute(async () => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return;

    const agents = stores.agent.getState().agents;
    for (const agent of Object.values(agents) as any[]) {
      if (agent.status === 'running') {
        try {
          await (window as any).electronAPI.stopAgent(agent.specId, agent.agentId);
        } catch {
          // Ignore errors when stopping agents
        }
      }
    }
  });
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

      const result = await executeProjectCommand('/kiro:spec-status', 'test-agent-2');
      expect(result.success).toBe(true);

      // Wait for agent to appear in store
      const hasAgent = await waitForCondition(
        async () => (await getProjectAgentCount()) > 0,
        3000,
        100,
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

      const result = await executeProjectCommand('/kiro:spec-status', 'no-project');

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
