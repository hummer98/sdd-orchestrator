/**
 * Auto Execution Flow E2E Tests
 *
 * Comprehensive E2E tests for auto-execution functionality including:
 * 1. Auto-execution stops at correct phases based on permission settings
 * 2. Main panel updates when spec documents are generated
 * 3. spec.json is correctly updated and UI follows when agent completes
 * 4. UI is correctly disabled during agent execution
 * 5. UI and internal state are correctly updated when auto-execution completes
 *
 * Prerequisites:
 * - Run with: npm run test:e2e (or task electron:test:e2e)
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
 * - Mock Claude generates actual files and updates spec.json
 */

import * as path from 'path';
import * as fs from 'fs';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/test-project');
const SPEC_NAME = 'test-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

// Initial spec.json content for reset
const INITIAL_SPEC_JSON = {
  feature_name: 'test-feature',
  name: 'test-feature',
  description: 'E2Eテスト用のテスト機能',
  phase: 'initialized',
  language: 'ja',
  approvals: {
    requirements: { generated: false, approved: false },
    design: { generated: false, approved: false },
    tasks: { generated: false, approved: false },
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const INITIAL_REQUIREMENTS_MD = `# Requirements Document

## Project Description (Input)
E2Eテスト用のテスト機能を実装します。

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->

`;

/**
 * Fixtureを初期状態にリセット
 */
function resetFixture(): void {
  // spec.jsonを初期状態に戻す
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(INITIAL_SPEC_JSON, null, 2)
  );

  // requirements.mdを初期状態に戻す
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), INITIAL_REQUIREMENTS_MD);

  // design.md, tasks.mdを削除（存在する場合）
  for (const file of ['design.md', 'tasks.md']) {
    const filePath = path.join(SPEC_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // runtime/agents ディレクトリをクリーンアップ
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const files = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(RUNTIME_AGENTS_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // logs ディレクトリをクリーンアップ
  const logsDir = path.join(SPEC_DIR, 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Read current spec.json from filesystem
 */
function readSpecJson(): typeof INITIAL_SPEC_JSON {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'spec.json'), 'utf-8'));
}

/**
 * Helper: Select project using Zustand store action
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.projectStore?.getState) {
          await stores.projectStore.getState().selectProject(projPath);
          done(true);
        } else {
          console.error('[E2E] __STORES__ not available on window');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done(false);
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Select spec using Zustand specStore action
 */
async function selectSpecViaStore(specId: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.specStore?.getState) {
          const specStore = stores.specStore.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            specStore.selectSpec(spec);
            done(true);
          } else {
            console.error('[E2E] Spec not found:', id);
            done(false);
          }
        } else {
          console.error('[E2E] __STORES__.specStore not available');
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
async function setAutoExecutionPermissions(permissions: Record<string, boolean>): Promise<boolean> {
  return browser.execute((perms: Record<string, boolean>) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflowStore?.getState) return false;

      const workflowStore = stores.workflowStore.getState();
      const currentPermissions = workflowStore.autoExecutionPermissions;

      // Toggle permissions to match desired state
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
 * Helper: Get auto-execution status from workflowStore
 */
async function getAutoExecutionStatus(): Promise<{
  isAutoExecuting: boolean;
  autoExecutionStatus: string;
  currentAutoPhase: string | null;
}> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflowStore?.getState) {
        return { isAutoExecuting: false, autoExecutionStatus: 'idle', currentAutoPhase: null };
      }
      const state = stores.workflowStore.getState();
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
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500,
  debugLabel: string = 'condition'
): Promise<boolean> {
  const startTime = Date.now();
  let iteration = 0;
  while (Date.now() - startTime < timeout) {
    iteration++;
    if (await condition()) {
      console.log(`[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`);
      return true;
    }
    // Debug log every 2 seconds
    if (iteration % 4 === 0) {
      const status = await getAutoExecutionStatus();
      console.log(`[E2E] ${debugLabel} iteration ${iteration}: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}`);
    }
    await browser.pause(interval);
  }
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations`);
  return false;
}

/**
 * Helper: Refresh spec store
 */
async function refreshSpecStore(): Promise<void> {
  await browser.executeAsync((done) => {
    const stores = (window as any).__STORES__;
    const refreshFn = stores?.specStore?.getState()?.refreshSpecs;
    if (refreshFn) {
      refreshFn().then(() => done()).catch(() => done());
    } else {
      done();
    }
  });
  await browser.pause(300);
}

/**
 * Helper: Clear agent store
 */
async function clearAgentStore(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.agentStore?.getState) {
      const state = stores.agentStore.getState();
      state.agents.forEach((agent: any) => {
        state.removeAgent(agent.agentId);
      });
    }
  });
}

/**
 * Helper: Reset AutoExecutionService state for test isolation
 */
async function resetAutoExecutionService(): Promise<void> {
  await browser.execute(() => {
    const service = (window as any).__AUTO_EXECUTION_SERVICE__;
    if (service?.resetForTest) {
      service.resetForTest();
    }
  });
}

/**
 * Helper: Reset workflowStore autoExecution state
 */
async function resetWorkflowStoreAutoExecution(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.workflowStore?.getState) {
      const store = stores.workflowStore.getState();
      // Stop any running auto-execution
      if (store.isAutoExecuting) {
        store.stopAutoExecution();
      }
      // Reset autoExecutionStatus to idle
      stores.workflowStore.setState({ autoExecutionStatus: 'idle', currentAutoPhase: null });
    }
  });
}

describe('Auto Execution Flow E2E Tests', () => {
  before(async () => {
    resetFixture();
  });

  beforeEach(async () => {
    // Reset fixture and cleanup generated files
    resetFixture();

    // Clear agent store
    await clearAgentStore();

    // Reset AutoExecutionService
    await resetAutoExecutionService();

    // Reset workflowStore autoExecution state
    await resetWorkflowStoreAutoExecution();

    // Select project and spec
    const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);
    await browser.pause(500);
    await refreshSpecStore();
    await browser.pause(500);

    const specSuccess = await selectSpecViaStore(SPEC_NAME);
    expect(specSuccess).toBe(true);
    await browser.pause(500);

    // Refresh spec store to get latest state
    await refreshSpecStore();

    // Wait for workflow view
    const workflowView = await $('[data-testid="workflow-view"]');
    await workflowView.waitForExist({ timeout: 5000 });
  });

  afterEach(async () => {
    // Stop any running auto-execution
    await browser.execute(() => {
      const stores = (window as any).__STORES__;
      if (stores?.workflowStore?.getState()?.isAutoExecuting) {
        stores.workflowStore.getState().stopAutoExecution();
      }
    });
    await browser.pause(500);
  });

  after(async () => {
    resetFixture();
  });

  // ============================================================
  // 1. Auto-execution stops at correct phases based on permissions
  // (Detailed scenarios tested in auto-execution-workflow.e2e.spec.ts)
  // ============================================================
  describe('Auto-execution Permission Control', () => {
    it('should stop after requirements when only requirements is permitted', async () => {
      // Set permissions: only requirements
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.waitForClickable({ timeout: 5000 });
      await autoButton.click();

      // Wait for auto-execution to start
      await browser.pause(500);
      const status = await getAutoExecutionStatus();
      expect(status.isAutoExecuting).toBe(true);

      // Wait for completion (requirements only should be quick)
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      expect(completed).toBe(true);

      // Verify spec.json shows only requirements generated
      await browser.pause(1000);
      const specJson = readSpecJson();
      expect(specJson).not.toBeNull();
      expect(specJson.approvals.requirements.generated).toBe(true);
      expect(specJson.approvals.design.generated).toBe(false);
      expect(specJson.approvals.tasks.generated).toBe(false);
    });
  });

  // ============================================================
  // 2. Main panel updates when spec documents are generated
  // ============================================================
  describe('Document Generation and Panel Updates', () => {
    it('should update main panel when requirements.md is generated', async () => {
      // Set permissions for requirements only
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.waitForClickable({ timeout: 5000 });
      await autoButton.click();

      // Wait for completion
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for UI to update
      await browser.pause(2000);
      await refreshSpecStore();

      // Check that the phase shows generated status
      const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
      if (await reqPhaseItem.isExisting()) {
        const generatedIcon = await reqPhaseItem.$('[data-testid="progress-icon-generated"]');
        const approvedIcon = await reqPhaseItem.$('[data-testid="progress-icon-approved"]');
        const hasStatus = (await generatedIcon.isExisting()) || (await approvedIcon.isExisting());
        expect(hasStatus).toBe(true);
      }

      // Verify that requirements.md was created
      const reqMdPath = path.join(SPEC_DIR, 'requirements.md');
      expect(fs.existsSync(reqMdPath)).toBe(true);

      // Verify content contains expected text
      const content = fs.readFileSync(reqMdPath, 'utf-8');
      expect(content).toContain('# Requirements');
    });
  });

  // ============================================================
  // 3. spec.json updates and UI follows when agent completes
  // ============================================================
  describe('spec.json Update and UI Sync', () => {
    it('should update spec.json and UI after requirements phase', async () => {
      // Initial state check
      let specJson = readSpecJson();
      expect(specJson.approvals.requirements.generated).toBe(false);

      // Set permissions and execute
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      await browser.pause(2000);

      // Verify spec.json was updated
      specJson = readSpecJson();
      expect(specJson.approvals.requirements.generated).toBe(true);

      // Refresh UI
      await refreshSpecStore();
      await browser.pause(1000);

      // Check for status icon (in requirements phase item)
      const phaseItem = await $('[data-testid="phase-item-requirements"]');
      expect(await phaseItem.isExisting()).toBe(true);

      // The phase should show generated icon or approve button
      const generatedIcon = await phaseItem.$('[data-testid="progress-icon-generated"]');
      const approvedIcon = await phaseItem.$('[data-testid="progress-icon-approved"]');
      const hasGeneratedOrApproved =
        (await generatedIcon.isExisting()) || (await approvedIcon.isExisting());
      expect(hasGeneratedOrApproved).toBe(true);
    });
  });

  // ============================================================
  // 4. UI is correctly disabled during agent execution
  // ============================================================
  describe('UI Disable During Execution', () => {
    it('should change auto-execute button text and set isAutoExecuting during execution', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Check button state during execution (should change to "停止")
      await browser.pause(300);

      // During execution, the button should show stop action
      const buttonText = await autoButton.getText();
      expect(buttonText).toContain('停止');

      // Check isAutoExecuting is true during execution
      const status = await getAutoExecutionStatus();
      expect(status.isAutoExecuting).toBe(true);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 5. UI and internal state correctly updated on completion
  // ============================================================
  describe('Completion State Updates', () => {
    it('should reset isAutoExecuting and re-enable button after completion', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for execution to finish
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      const status = await getAutoExecutionStatus();
      expect(status.isAutoExecuting).toBe(false);

      await browser.pause(2000);

      // Button should be re-enabled and show "自動実行" again
      const isEnabled = await autoButton.isEnabled();
      expect(isEnabled).toBe(true);

      const buttonText = await autoButton.getText();
      expect(buttonText).toContain('自動実行');
    });
  });

  // ============================================================
  // Security and Stability
  // ============================================================
  describe('Security and Stability', () => {
    it('should have correct security settings and not crash during execution', async () => {
      // Check security settings
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);

      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);

      // Execute auto-execution to verify no crash
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      // Check no crash occurred
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.isCrashed();
      });
      expect(isCrashed).toBe(false);
    });
  });
});
