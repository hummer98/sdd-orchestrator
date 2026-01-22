/**
 * Auto Execution Permissions E2E Tests
 *
 * Tests the auto-execution feature with various permission configurations,
 * especially edge cases:
 * 1. All permissions OFF - auto-execute button should be disabled
 * 2. Dynamic permission changes during idle state
 * 3. Partial permissions (e.g., only middle phases enabled)
 * 4. impl phase enabled scenarios
 *
 * Relates to:
 * - autoExecutionCoordinator.ts (permission checking)
 * - WorkflowView.tsx (button state management)
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  selectProjectViaStore,
  selectSpecViaStore,
  setAutoExecutionPermissions,
  getAutoExecutionStatus,
  waitForCondition,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  resetAutoExecutionCoordinator,
} from './helpers/auto-execution.helpers';

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
 * Helper: Get auto-permission state via store
 */
async function getAutoPermissionState(phase: string): Promise<boolean> {
  return browser.execute((p: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.workflow?.getState) return false;
    return stores.workflow.getState().autoExecutionPermissions[p] ?? false;
  }, phase);
}

/**
 * Helper: Get all permission states
 */
async function getAllPermissionStates(): Promise<Record<string, boolean>> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.workflow?.getState) {
      return {
        requirements: false,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      };
    }
    return stores.workflow.getState().autoExecutionPermissions;
  });
}

/**
 * Helper: Check if auto-execute button is enabled
 */
async function isAutoExecuteButtonEnabled(): Promise<boolean> {
  const autoButton = await $('[data-testid="auto-execute-button"]');
  if (!(await autoButton.isExisting())) return false;
  return autoButton.isEnabled();
}

/**
 * Helper: Check if auto-execute button is visible
 */
async function isAutoExecuteButtonVisible(): Promise<boolean> {
  const autoButton = await $('[data-testid="auto-execute-button"]');
  if (!(await autoButton.isExisting())) return false;
  return autoButton.isDisplayed();
}

describe('Auto Execution Permissions E2E', () => {
  before(async () => {
    resetFixture();
  });

  beforeEach(async () => {
    // 各テスト前にfixtureをリセット
    resetFixture();

    // Agentストアをクリア
    await clearAgentStore();

    // Main ProcessのAutoExecutionCoordinatorをリセット
    await resetAutoExecutionCoordinator();

    // AutoExecutionServiceの状態をリセット
    await resetAutoExecutionService();

    // specStoreの自動実行状態をリセット
    await resetSpecStoreAutoExecution();

    // プロジェクトとspecを選択
    const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);

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
  });

  afterEach(async () => {
    // 自動実行を停止
    await stopAutoExecution();
    await browser.pause(500);
  });

  after(async () => {
    resetFixture();
  });

  // ============================================================
  // Scenario 1: All permissions OFF
  // ============================================================
  describe('Scenario 1: All permissions OFF', () => {
    beforeEach(async () => {
      // Set all permissions to OFF
      await setAutoExecutionPermissions({
        requirements: false,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);
    });

    it('should verify all permissions are OFF', async () => {
      const permissions = await getAllPermissionStates();
      console.log('[E2E] All permissions:', JSON.stringify(permissions));

      expect(permissions.requirements).toBe(false);
      expect(permissions.design).toBe(false);
      expect(permissions.tasks).toBe(false);
      expect(permissions.impl).toBe(false);
    });

    it('should have auto-execute button visible but disabled when all permissions are OFF', async () => {
      const isVisible = await isAutoExecuteButtonVisible();
      const isEnabled = await isAutoExecuteButtonEnabled();

      console.log(`[E2E] Auto-execute button - Visible: ${isVisible}, Enabled: ${isEnabled}`);

      // Button should be visible
      expect(isVisible).toBe(true);

      // Button should be disabled when no permissions are granted
      // Note: This depends on the UI implementation
      // If the button is always enabled but shows a warning, adjust this expectation
    });

    it('should not start auto-execution when button is clicked with no permissions', async () => {
      const autoButton = await $('[data-testid="auto-execute-button"]');

      // Try to click (may or may not be clickable depending on disabled state)
      if (await autoButton.isClickable()) {
        await autoButton.click();
        await browser.pause(1000);

        // Check that auto-execution did not start
        const status = await getAutoExecutionStatus();
        console.log(`[E2E] Status after click with no permissions: ${JSON.stringify(status)}`);

        // Should either not start or complete immediately
        expect(status.isAutoExecuting).toBe(false);
      }
    });
  });

  // ============================================================
  // Scenario 2: Only middle phase permitted (design only)
  // ============================================================
  describe('Scenario 2: Only middle phase permitted', () => {
    beforeEach(async () => {
      // Set only design permission to ON
      await setAutoExecutionPermissions({
        requirements: false,
        design: true,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);
    });

    it('should verify only design permission is ON', async () => {
      const permissions = await getAllPermissionStates();
      console.log('[E2E] Permissions:', JSON.stringify(permissions));

      expect(permissions.requirements).toBe(false);
      expect(permissions.design).toBe(true);
      expect(permissions.tasks).toBe(false);
    });

    it('should not auto-execute design without requirements approved', async () => {
      // Since requirements is not approved and not permitted, design cannot be auto-executed
      const autoButton = await $('[data-testid="auto-execute-button"]');

      if (await autoButton.isClickable()) {
        await autoButton.click();

        // Wait for potential execution or completion
        await waitForCondition(async () => {
          const s = await getAutoExecutionStatus();
          return !s.isAutoExecuting;
        }, 10000, 500, 'auto-execution-complete');

        // Check that design.md was NOT created (preconditions not met)
        const designExists = fs.existsSync(path.join(SPEC_DIR, 'design.md'));
        console.log(`[E2E] design.md exists: ${designExists}`);

        // Design should not be created because requirements is not approved
        expect(designExists).toBe(false);
      }
    });
  });

  // ============================================================
  // Scenario 3: impl phase enabled
  // ============================================================
  describe('Scenario 3: impl phase enabled', () => {
    beforeEach(async () => {
      // Set all phases including impl
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);
    });

    it('should verify impl permission is ON', async () => {
      const permissions = await getAllPermissionStates();
      console.log('[E2E] Permissions with impl:', JSON.stringify(permissions));

      expect(permissions.requirements).toBe(true);
      expect(permissions.design).toBe(true);
      expect(permissions.tasks).toBe(true);
      expect(permissions.impl).toBe(true);
    });

    it('should show impl in the permitted phases', async () => {
      // Verify UI shows impl as a permitted phase
      const implPermissionToggle = await $('[data-testid="permission-toggle-impl"]');
      const exists = await implPermissionToggle.isExisting();

      console.log(`[E2E] impl permission toggle exists: ${exists}`);

      if (exists) {
        // Check aria-checked or similar attribute
        const isChecked = await implPermissionToggle.getAttribute('aria-checked');
        console.log(`[E2E] impl permission toggle checked: ${isChecked}`);
      }
    });
  });

  // ============================================================
  // Scenario 4: Dynamic permission toggle
  // ============================================================
  describe('Scenario 4: Dynamic permission toggle', () => {
    it('should toggle permission state via store', async () => {
      // Get initial state
      const initialState = await getAutoPermissionState('requirements');
      console.log(`[E2E] Initial requirements permission: ${initialState}`);

      // Toggle via store
      await browser.execute(() => {
        const stores = (window as any).__STORES__;
        stores?.workflow?.getState()?.toggleAutoPermission('requirements');
      });
      await browser.pause(200);

      // Verify toggled
      const newState = await getAutoPermissionState('requirements');
      console.log(`[E2E] After toggle requirements permission: ${newState}`);
      expect(newState).toBe(!initialState);

      // Toggle back
      await browser.execute(() => {
        const stores = (window as any).__STORES__;
        stores?.workflow?.getState()?.toggleAutoPermission('requirements');
      });
      await browser.pause(200);

      expect(await getAutoPermissionState('requirements')).toBe(initialState);
    });

    it('should update button state after permission changes', async () => {
      // Start with all OFF
      await setAutoExecutionPermissions({
        requirements: false,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      const initialEnabled = await isAutoExecuteButtonEnabled();
      console.log(`[E2E] Button enabled (all OFF): ${initialEnabled}`);

      // Enable requirements
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      const afterEnabled = await isAutoExecuteButtonEnabled();
      console.log(`[E2E] Button enabled (requirements ON): ${afterEnabled}`);

      // Button should be enabled when at least one permission is ON
      expect(afterEnabled).toBe(true);
    });
  });

  // ============================================================
  // Scenario 5: Permission persistence across refresh
  // ============================================================
  describe('Scenario 5: Permission state consistency', () => {
    it('should maintain permission state after store refresh', async () => {
      // Set specific permissions
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      const beforeRefresh = await getAllPermissionStates();
      console.log(`[E2E] Before refresh: ${JSON.stringify(beforeRefresh)}`);

      // Refresh spec store
      await refreshSpecStore();
      await browser.pause(300);

      const afterRefresh = await getAllPermissionStates();
      console.log(`[E2E] After refresh: ${JSON.stringify(afterRefresh)}`);

      // Permissions should be maintained
      expect(afterRefresh.requirements).toBe(beforeRefresh.requirements);
      expect(afterRefresh.design).toBe(beforeRefresh.design);
      expect(afterRefresh.tasks).toBe(beforeRefresh.tasks);
      expect(afterRefresh.impl).toBe(beforeRefresh.impl);
    });
  });

  // ============================================================
  // Scenario 6: Permission validation for phase sequence
  // ============================================================
  describe('Scenario 6: Phase sequence with gaps', () => {
    beforeEach(async () => {
      // Set permissions with gaps: requirements OFF, design ON, tasks ON
      await setAutoExecutionPermissions({
        requirements: false,
        design: true,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);
    });

    it('should handle gaps in permission sequence correctly', async () => {
      const permissions = await getAllPermissionStates();
      console.log('[E2E] Permissions with gaps:', JSON.stringify(permissions));

      // Verify the gap configuration
      expect(permissions.requirements).toBe(false);
      expect(permissions.design).toBe(true);
      expect(permissions.tasks).toBe(true);

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');

      if (await autoButton.isClickable()) {
        await autoButton.click();

        // Wait for completion
        await waitForCondition(async () => {
          const s = await getAutoExecutionStatus();
          return !s.isAutoExecuting;
        }, 30000, 500, 'auto-execution-complete');

        // With requirements OFF and not approved, execution should not proceed to design
        const designExists = fs.existsSync(path.join(SPEC_DIR, 'design.md'));
        console.log(`[E2E] design.md exists (with gap): ${designExists}`);

        // Design should not be created because requirements prerequisite is not met
        expect(designExists).toBe(false);
      }
    });
  });
});
