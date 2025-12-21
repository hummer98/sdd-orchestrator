/**
 * Auto Execution Workflow E2E Tests
 *
 * Tests the auto-execution feature with different permission configurations.
 * Uses Mock Claude CLI to test the complete workflow without actual API calls.
 *
 * Test Scenarios:
 * 1. All phases permitted: requirements → design → tasks (continuous execution)
 * 2. Only requirements permitted: stops after requirements
 * 3. requirements + design permitted, tasks not: stops after design
 *
 * Verifications:
 * - spec.json is correctly updated with approval status
 * - Auto-execution proceeds or stops correctly based on permissions
 * - UI reflects the correct state after completion
 */

import * as path from 'path';

// Fixture project path
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');
const SPEC_JSON_PATH = path.join(FIXTURE_PROJECT_PATH, '.kiro/specs/test-feature/spec.json');

// Initial spec.json content for reset
const INITIAL_SPEC_JSON = {
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

/**
 * Helper: Reset spec.json to initial state
 */
async function resetSpecJson(): Promise<void> {
  await browser.electron.execute((_electron, { specPath, content }) => {
    const fs = require('fs');
    fs.writeFileSync(specPath, JSON.stringify(content, null, 2));
  }, { specPath: SPEC_JSON_PATH, content: INITIAL_SPEC_JSON });
}

/**
 * Helper: Read current spec.json
 */
async function readSpecJson(): Promise<typeof INITIAL_SPEC_JSON> {
  return await browser.electron.execute((_electron, specPath) => {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  }, SPEC_JSON_PATH);
}

/**
 * Helper: Select project using Zustand store action via executeAsync
 * This triggers the full store workflow including specStore sync
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        // Access stores exposed on window (see stores/index.ts)
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
 * This sets the selected spec directly without UI click
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
 * Helper: Click auto-permission toggle for a phase
 */
async function togglePhasePermission(phase: string): Promise<void> {
  const phaseItem = await $(`[data-testid="phase-item-${phase}"]`);
  if (await phaseItem.isExisting()) {
    const toggle = await phaseItem.$('[data-testid="auto-permission-toggle"]');
    if (await toggle.isExisting()) {
      await toggle.click();
      await browser.pause(200);
    }
  }
}

/**
 * Helper: Get current auto-permission state
 */
async function getAutoPermissionState(phase: string): Promise<boolean> {
  const phaseItem = await $(`[data-testid="phase-item-${phase}"]`);
  if (await phaseItem.isExisting()) {
    const permittedIcon = await phaseItem.$('[data-testid="auto-permitted-icon"]');
    return await permittedIcon.isExisting();
  }
  return false;
}

/**
 * Helper: Wait for phase to complete (check for generated/approved icon)
 */
async function waitForPhaseCompletion(phase: string, timeout: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const phaseItem = await $(`[data-testid="phase-item-${phase}"]`);
    if (await phaseItem.isExisting()) {
      const generatedIcon = await phaseItem.$('[data-testid="progress-icon-generated"]');
      const approvedIcon = await phaseItem.$('[data-testid="progress-icon-approved"]');
      if ((await generatedIcon.isExisting()) || (await approvedIcon.isExisting())) {
        return true;
      }
    }
    await browser.pause(500);
  }
  return false;
}

/**
 * Helper: Check if auto-execution is running
 */
async function isAutoExecutionRunning(): Promise<boolean> {
  const autoButton = await $('[data-testid="auto-execute-button"]');
  if (await autoButton.isExisting()) {
    const text = await autoButton.getText();
    return text.includes('停止');
  }
  return false;
}

/**
 * Helper: Wait for auto-execution to stop
 */
async function waitForAutoExecutionStop(timeout: number = 60000): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (!(await isAutoExecutionRunning())) {
      return;
    }
    await browser.pause(500);
  }
  throw new Error('Auto-execution did not stop within timeout');
}

describe('Auto Execution Workflow E2E', () => {
  // ============================================================
  // Setup: Open project and select spec before each test
  // ============================================================
  beforeEach(async () => {
    // Reset spec.json to initial state
    await resetSpecJson();

    // Open fixture project using Zustand store action
    const projectSuccess = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
    expect(projectSuccess).toBe(true);

    // Wait for specs to load
    await browser.pause(1500);

    // Select spec via store action (avoids UI interactability issues)
    const specSuccess = await selectSpecViaStore('test-feature');
    expect(specSuccess).toBe(true);
    await browser.pause(500);

    // Wait for WorkflowView to appear
    const workflowView = await $('[data-testid="workflow-view"]');
    await workflowView.waitForExist({ timeout: 5000 });
  });

  // ============================================================
  // Scenario 1: All phases permitted (requirements → design → tasks)
  // ============================================================
  describe('Scenario 1: All phases permitted', () => {
    beforeEach(async () => {
      // Set permissions: requirements, design, tasks = ON
      // Toggle each phase to ensure they are all permitted
      for (const phase of ['requirements', 'design', 'tasks']) {
        const isPermitted = await getAutoPermissionState(phase);
        if (!isPermitted) {
          await togglePhasePermission(phase);
        }
      }
      // Ensure impl is OFF to stop at tasks
      const implPermitted = await getAutoPermissionState('impl');
      if (implPermitted) {
        await togglePhasePermission('impl');
      }
    });

    it('should execute requirements → design → tasks in sequence', async () => {
      // Verify initial permissions
      expect(await getAutoPermissionState('requirements')).toBe(true);
      expect(await getAutoPermissionState('design')).toBe(true);
      expect(await getAutoPermissionState('tasks')).toBe(true);

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for auto-execution to complete (should stop after tasks since impl is not permitted)
      await waitForAutoExecutionStop(90000);

      // Verify spec.json was updated
      const specJson = await readSpecJson();

      // All three phases should be approved
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.approved).toBe(true);
      expect(specJson.approvals.tasks.approved).toBe(true);
    });

    it('should update UI to show completed phases', async () => {
      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForAutoExecutionStop(90000);

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
      // Set permissions: requirements = ON, design = OFF, tasks = OFF
      const reqPermitted = await getAutoPermissionState('requirements');
      if (!reqPermitted) {
        await togglePhasePermission('requirements');
      }

      for (const phase of ['design', 'tasks', 'impl']) {
        const isPermitted = await getAutoPermissionState(phase);
        if (isPermitted) {
          await togglePhasePermission(phase);
        }
      }
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
      await waitForAutoExecutionStop(30000);

      // Verify spec.json: only requirements should be approved
      const specJson = await readSpecJson();
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.approved).toBe(false);
      expect(specJson.approvals.tasks.approved).toBe(false);
    });

    it('should stop at requirements and not proceed to design', async () => {
      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for requirements to complete
      await waitForPhaseCompletion('requirements', 30000);

      // Wait a bit more to ensure no further execution
      await browser.pause(3000);

      // Auto-execution should have stopped
      expect(await isAutoExecutionRunning()).toBe(false);

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
      for (const phase of ['requirements', 'design']) {
        const isPermitted = await getAutoPermissionState(phase);
        if (!isPermitted) {
          await togglePhasePermission(phase);
        }
      }

      for (const phase of ['tasks', 'impl']) {
        const isPermitted = await getAutoPermissionState(phase);
        if (isPermitted) {
          await togglePhasePermission(phase);
        }
      }
    });

    it('should execute requirements → design and stop before tasks', async () => {
      // Verify initial permissions
      expect(await getAutoPermissionState('requirements')).toBe(true);
      expect(await getAutoPermissionState('design')).toBe(true);
      expect(await getAutoPermissionState('tasks')).toBe(false);

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for auto-execution to stop
      await waitForAutoExecutionStop(60000);

      // Verify spec.json
      const specJson = await readSpecJson();
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.approved).toBe(true);
      expect(specJson.approvals.tasks.approved).toBe(false);
    });

    it('should show requirements and design as approved, tasks as pending', async () => {
      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForAutoExecutionStop(60000);

      // Check UI state
      for (const phase of ['requirements', 'design']) {
        const phaseItem = await $(`[data-testid="phase-item-${phase}"]`);
        const approvedIcon = await phaseItem.$('[data-testid="progress-icon-approved"]');
        expect(await approvedIcon.isExisting()).toBe(true);
      }

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
    it('should toggle permission state when clicking the toggle button', async () => {
      // Get initial state
      const initialState = await getAutoPermissionState('design');

      // Toggle
      await togglePhasePermission('design');

      // Verify toggled
      const newState = await getAutoPermissionState('design');
      expect(newState).toBe(!initialState);

      // Toggle back
      await togglePhasePermission('design');
      expect(await getAutoPermissionState('design')).toBe(initialState);
    });

    it('should show correct icon for permitted/forbidden state', async () => {
      // Ensure design is permitted
      if (!(await getAutoPermissionState('design'))) {
        await togglePhasePermission('design');
      }

      // Check for permitted icon
      const phaseItem = await $('[data-testid="phase-item-design"]');
      let permittedIcon = await phaseItem.$('[data-testid="auto-permitted-icon"]');
      expect(await permittedIcon.isExisting()).toBe(true);

      // Toggle off
      await togglePhasePermission('design');

      // Check for forbidden icon
      const forbiddenIcon = await phaseItem.$('[data-testid="auto-forbidden-icon"]');
      expect(await forbiddenIcon.isExisting()).toBe(true);
    });
  });

  // ============================================================
  // Security and Stability
  // ============================================================
  describe('Application Stability', () => {
    it('should not crash during auto-execution', async () => {
      // Start a quick auto-execution
      const reqPermitted = await getAutoPermissionState('requirements');
      if (!reqPermitted) {
        await togglePhasePermission('requirements');
      }

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForAutoExecutionStop(30000);

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
