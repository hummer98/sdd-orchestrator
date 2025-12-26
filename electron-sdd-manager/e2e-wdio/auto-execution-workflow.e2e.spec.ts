/**
 * Auto Execution Workflow E2E Tests
 *
 * Tests the auto-execution feature with different permission configurations.
 * Uses Mock Claude CLI to test the complete workflow without actual API calls.
 *
 * Test Scenarios:
 * 1. All phases permitted: requirements -> design -> tasks (continuous execution)
 * 2. Only requirements permitted: stops after requirements
 * 3. requirements + design permitted, tasks not: stops after design
 *
 * Verifications:
 * - spec.json is correctly updated with approval status
 * - Auto-execution proceeds or stops correctly based on permissions
 * - UI reflects the correct state after completion
 */

import * as path from 'path';
import * as fs from 'fs';

// Fixture project path
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
          console.error('[E2E] __STORES__ not available');
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
 * Helper: Set auto-execution permissions
 */
async function setAutoExecutionPermissions(permissions: Record<string, boolean>): Promise<boolean> {
  return browser.execute((perms: Record<string, boolean>) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflowStore?.getState) return false;

      const workflowStore = stores.workflowStore.getState();
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
 * (Migrated to Map-based per-Spec state as part of spec-scoped-auto-execution-state feature)
 */
async function getAutoExecutionStatus(): Promise<{
  isAutoExecuting: boolean;
  autoExecutionStatus: string;
  currentAutoPhase: string | null;
}> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.specStore?.getState) {
        return { isAutoExecuting: false, autoExecutionStatus: 'idle', currentAutoPhase: null };
      }
      const storeState = stores.specStore.getState();
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
    const result = await condition();
    if (result) {
      console.log(`[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`);
      return true;
    }
    // Debug: print auto-execution state every 2 seconds
    if (iteration % 4 === 0) {
      const status = await getAutoExecutionStatus();
      console.log(`[E2E] ${debugLabel} iteration ${iteration}: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}, phase=${status.currentAutoPhase}`);
    }
    await browser.pause(interval);
  }
  // Final debug log on timeout
  const status = await getAutoExecutionStatus();
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations. Final state: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}, phase=${status.currentAutoPhase}`);
  return false;
}

/**
 * Helper: Wait for auto-execution to complete (checks both isAutoExecuting and autoExecutionStatus)
 */
async function waitForAutoExecutionComplete(timeout: number = 60000): Promise<boolean> {
  return waitForCondition(async () => {
    const s = await getAutoExecutionStatus();
    // Check isAutoExecuting is false (status may lag behind)
    return !s.isAutoExecuting;
  }, timeout, 500, 'auto-execution-complete');
}

/**
 * Helper: Wait for all specified phases to be completed (approved) in spec.json
 */
async function waitForPhasesApproved(
  phases: string[],
  timeout: number = 60000
): Promise<boolean> {
  return waitForCondition(async () => {
    const specJson = readSpecJson();
    const phaseStatus = phases.map(p => `${p}:${specJson.approvals[p as keyof typeof specJson.approvals]?.approved ? 'Y' : 'N'}`);
    console.log(`[E2E] Phase approval check: ${phaseStatus.join(', ')}`);
    for (const phase of phases) {
      if (!specJson.approvals[phase as keyof typeof specJson.approvals]?.approved) {
        return false;
      }
    }
    return true;
  }, timeout, 2000, `phases-approved-${phases.join(',')}`);
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
 * Helper: Reset specStore autoExecution runtime state
 * (Migrated to Map-based per-Spec state as part of spec-scoped-auto-execution-state feature)
 */
async function resetSpecStoreAutoExecution(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.specStore?.getState) {
      const storeState = stores.specStore.getState();
      const specId = storeState.specDetail?.metadata?.name || '';
      // Stop any running auto-execution
      if (specId && storeState.getAutoExecutionRuntime(specId)?.isAutoExecuting) {
        storeState.stopAutoExecution(specId);
      }
      // Reset autoExecutionRuntimeMap for this spec
      if (specId) {
        storeState.setAutoExecutionStatus(specId, 'idle');
        storeState.setAutoExecutionPhase(specId, null);
        storeState.setAutoExecutionRunning(specId, false);
      }
    }
  });
}

/**
 * Helper: Get auto-permission state via store
 */
async function getAutoPermissionState(phase: string): Promise<boolean> {
  return browser.execute((p: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.workflowStore?.getState) return false;
    return stores.workflowStore.getState().autoExecutionPermissions[p] ?? false;
  }, phase);
}

describe('Auto Execution Workflow E2E', () => {
  before(async () => {
    resetFixture();
  });

  beforeEach(async () => {
    // 各テスト前にfixtureをリセット
    resetFixture();

    // Agentストアをクリア
    await clearAgentStore();

    // AutoExecutionServiceの状態をリセット
    await resetAutoExecutionService();

    // specStoreの自動実行状態をリセット
    await resetSpecStoreAutoExecution();

    // プロジェクトとspecを選択
    const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);

    // ファイル監視経由でspecが更新されるのを待つ
    await browser.pause(500);
    await refreshSpecStore();
    await browser.pause(500);

    const specSuccess = await selectSpecViaStore(SPEC_NAME);
    expect(specSuccess).toBe(true);
    await browser.pause(500);

    // Specストアを更新
    await refreshSpecStore();

    // WorkflowViewが表示されるまで待機
    const workflowView = await $('[data-testid="workflow-view"]');
    await workflowView.waitForExist({ timeout: 5000 });

    // Debug: Log initial state after all setup
    const debugStatus = await getAutoExecutionStatus();
    console.log(`[E2E] After beforeEach setup: isAutoExecuting=${debugStatus.isAutoExecuting}, status=${debugStatus.autoExecutionStatus}, phase=${debugStatus.currentAutoPhase}`);
  });

  afterEach(async () => {
    // 自動実行を停止
    await browser.execute(() => {
      const stores = (window as any).__STORES__;
      if (stores?.specStore?.getState) {
        const storeState = stores.specStore.getState();
        const specId = storeState.specDetail?.metadata?.name || '';
        if (specId && storeState.getAutoExecutionRuntime(specId)?.isAutoExecuting) {
          storeState.stopAutoExecution(specId);
        }
      }
    });
    await browser.pause(500);
  });

  after(async () => {
    resetFixture();
  });

  // ============================================================
  // Scenario 1: All phases permitted (requirements -> design -> tasks)
  // ============================================================
  describe('Scenario 1: All phases permitted', () => {
    beforeEach(async () => {
      // Set permissions: requirements, design, tasks = ON, impl = OFF
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      });
    });

    it('should execute requirements -> design -> tasks in sequence', async () => {
      // Verify initial permissions
      expect(await getAutoPermissionState('requirements')).toBe(true);
      expect(await getAutoPermissionState('design')).toBe(true);
      expect(await getAutoPermissionState('tasks')).toBe(true);

      // Initial state check
      const initialStatus = await getAutoExecutionStatus();
      console.log(`[E2E] Initial status before click: isAutoExecuting=${initialStatus.isAutoExecuting}, status=${initialStatus.autoExecutionStatus}`);

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait briefly for execution to start
      await browser.pause(500);
      const afterClickStatus = await getAutoExecutionStatus();
      console.log(`[E2E] Status after click: isAutoExecuting=${afterClickStatus.isAutoExecuting}, status=${afterClickStatus.autoExecutionStatus}`);

      // Wait for all phases to be approved in spec.json (more reliable than store state)
      // Use longer timeout and check both spec.json AND store state periodically
      const allApproved = await waitForCondition(async () => {
        const specJson = readSpecJson();
        const status = await getAutoExecutionStatus();

        // Log current state
        const phaseStatus = ['requirements', 'design', 'tasks'].map(
          p => `${p}:${specJson.approvals[p as keyof typeof specJson.approvals]?.approved ? 'Y' : 'N'}`
        );
        console.log(`[E2E] Phase check: ${phaseStatus.join(', ')}, isAuto=${status.isAutoExecuting}, status=${status.autoExecutionStatus}`);

        // All phases approved
        return (
          specJson.approvals.requirements.approved &&
          specJson.approvals.design.approved &&
          specJson.approvals.tasks.approved
        );
      }, 120000, 2000, 'all-phases-approved');

      expect(allApproved).toBe(true);

      // Verify spec.json was updated
      const specJson = readSpecJson();

      // All three phases should be approved
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.approved).toBe(true);
      expect(specJson.approvals.tasks.approved).toBe(true);
    });

    it('should update UI to show completed phases', async () => {
      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for all phases to be approved in spec.json
      const allApproved = await waitForPhasesApproved(['requirements', 'design', 'tasks'], 120000);
      expect(allApproved).toBe(true);

      // Wait for UI to update
      await browser.pause(2000);
      await refreshSpecStore();

      // Check that all phases show approved status (green check)
      for (const phase of ['requirements', 'design', 'tasks']) {
        const phaseItem = await $(`[data-testid="phase-item-${phase}"]`);
        const approvedIcon = await phaseItem.$('[data-testid="progress-icon-approved"]');
        expect(await approvedIcon.isExisting()).toBe(true);
      }
    });
  });

  // ============================================================
  // Scenario 2: Only requirements permitted
  // ============================================================
  describe('Scenario 2: Only requirements permitted', () => {
    beforeEach(async () => {
      // Set permissions: requirements = ON, others = OFF
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
    });

    it('should execute only requirements and stop', async () => {
      // Verify initial permissions
      expect(await getAutoPermissionState('requirements')).toBe(true);
      expect(await getAutoPermissionState('design')).toBe(false);
      expect(await getAutoPermissionState('tasks')).toBe(false);

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for auto-execution to stop
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for file updates
      await browser.pause(1000);

      // Verify spec.json: requirements should be generated (auto-execution generates but needs design OFF to not auto-approve)
      const specJson = readSpecJson();
      expect(specJson.approvals.requirements.generated).toBe(true);
      expect(specJson.approvals.design.generated).toBe(false);
      expect(specJson.approvals.tasks.generated).toBe(false);
    });

    it('should stop at requirements and not proceed to design', async () => {
      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
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

      // Design should still be pending
      const designPhase = await $('[data-testid="phase-item-design"]');
      const designPendingIcon = await designPhase.$('[data-testid="progress-icon-pending"]');
      expect(await designPendingIcon.isExisting()).toBe(true);
    });
  });

  // ============================================================
  // Scenario 3: requirements + design permitted, tasks not
  // ============================================================
  describe('Scenario 3: requirements + design permitted, tasks not', () => {
    beforeEach(async () => {
      // Set permissions: requirements = ON, design = ON, tasks = OFF
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
    });

    it('should execute requirements -> design and stop before tasks', async () => {
      // Verify initial permissions
      expect(await getAutoPermissionState('requirements')).toBe(true);
      expect(await getAutoPermissionState('design')).toBe(true);
      expect(await getAutoPermissionState('tasks')).toBe(false);

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for auto-execution to stop
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 60000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for file updates
      await browser.pause(1000);

      // Verify spec.json
      const specJson = readSpecJson();
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.generated).toBe(true);
      expect(specJson.approvals.tasks.generated).toBe(false);
    });

    it('should show requirements and design as completed, tasks as pending', async () => {
      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 60000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for UI to update
      await browser.pause(2000);
      await refreshSpecStore();

      // Requirements should show approved
      const reqPhase = await $('[data-testid="phase-item-requirements"]');
      const reqApprovedIcon = await reqPhase.$('[data-testid="progress-icon-approved"]');
      expect(await reqApprovedIcon.isExisting()).toBe(true);

      // Design should show generated or approved (depending on timing)
      const designPhase = await $('[data-testid="phase-item-design"]');
      const designGenIcon = await designPhase.$('[data-testid="progress-icon-generated"]');
      const designApprovedIcon = await designPhase.$('[data-testid="progress-icon-approved"]');
      expect((await designGenIcon.isExisting()) || (await designApprovedIcon.isExisting())).toBe(true);

      // Tasks should be pending
      const tasksPhase = await $('[data-testid="phase-item-tasks"]');
      const tasksPendingIcon = await tasksPhase.$('[data-testid="progress-icon-pending"]');
      expect(await tasksPendingIcon.isExisting()).toBe(true);
    });
  });

  // ============================================================
  // Permission Toggle Tests
  // ============================================================
  describe('Permission Toggle', () => {
    it('should toggle permission state via store', async () => {
      // Get initial state
      const initialState = await getAutoPermissionState('design');

      // Toggle via store
      await browser.execute(() => {
        const stores = (window as any).__STORES__;
        stores?.workflowStore?.getState()?.toggleAutoPermission('design');
      });
      await browser.pause(200);

      // Verify toggled
      const newState = await getAutoPermissionState('design');
      expect(newState).toBe(!initialState);

      // Toggle back
      await browser.execute(() => {
        const stores = (window as any).__STORES__;
        stores?.workflowStore?.getState()?.toggleAutoPermission('design');
      });
      await browser.pause(200);

      expect(await getAutoPermissionState('design')).toBe(initialState);
    });
  });

  // ============================================================
  // Application Stability
  // ============================================================
  describe('Application Stability', () => {
    it('should not crash during auto-execution', async () => {
      // Set minimal permissions
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

      // Verify app didn't crash
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.isCrashed();
      });
      expect(isCrashed).toBe(false);
    });

    it('should remain responsive after auto-execution', async () => {
      const isResponsive = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return !windows[0].isDestroyed();
      });
      expect(isResponsive).toBe(true);
    });
  });
});
