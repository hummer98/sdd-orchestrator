/**
 * Simple Auto Execution E2E Test
 *
 * シンプルなrequirementsのみの自動実行テスト
 *
 * テスト観点:
 * 1. 初期状態: UIでrequirementがOnになっている、自動実行が押せる
 * 2. 自動実行を押す: UI状態変化、ボタンdisable、Agent一覧表示
 * 3. requirement完了: UI更新、ボタン復帰、Agent完了状態
 */

import * as path from 'path';
import * as fs from 'fs';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');
const SPEC_NAME = 'simple-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

/**
 * Fixtureを初期状態にリセット
 */
function resetFixture(): void {
  // spec.jsonを初期状態に戻す
  const initialSpecJson = {
    name: 'simple-feature',
    description: 'E2Eテスト用のシンプルな機能',
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
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(initialSpecJson, null, 2)
  );

  // requirements.mdを初期状態に戻す
  const initialRequirements = `# Requirements Document

## Project Description (Input)
E2Eテスト用のシンプルな機能を実装します。

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->

`;
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), initialRequirements);

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
 * Helper: Get auto-execution status
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
 * Helper: Wait for condition
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await browser.pause(interval);
  }
  return false;
}

/**
 * Helper: Refresh spec store
 */
async function refreshSpecStore(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    stores?.specStore?.getState()?.refreshSpecs?.();
  });
  await browser.pause(500);
}

/**
 * Helper: Clear agent store
 */
async function clearAgentStore(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.agentStore?.getState) {
      // Clear all agents from store
      const state = stores.agentStore.getState();
      state.agents.forEach((agent: any) => {
        state.removeAgent(agent.agentId);
      });
    }
  });
}

describe('Simple Auto Execution E2E Test', () => {
  before(async () => {
    // Fixtureを初期状態に戻す
    resetFixture();
  });

  beforeEach(async () => {
    // 各テスト前にfixtureをリセット
    resetFixture();

    // Agentストアをクリア
    await clearAgentStore();

    // プロジェクトとspecを選択
    const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);
    await browser.pause(1000);

    const specSuccess = await selectSpecViaStore(SPEC_NAME);
    expect(specSuccess).toBe(true);
    await browser.pause(500);

    // Specストアを更新
    await refreshSpecStore();
  });

  afterEach(async () => {
    // 自動実行を停止
    await browser.execute(() => {
      const stores = (window as any).__STORES__;
      if (stores?.workflowStore?.getState()?.isAutoExecuting) {
        stores.workflowStore.getState().stopAutoExecution();
      }
    });
    await browser.pause(500);
  });

  after(async () => {
    // Fixtureを初期状態に戻す
    resetFixture();
  });

  // ============================================================
  // 1. 初期状態の確認
  // ============================================================
  describe('Initial State', () => {
    it('should show requirements auto-execution permission as ON', async () => {
      // requirementsをONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // requirements phase itemを確認
      const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
      expect(await reqPhaseItem.isExisting()).toBe(true);

      // auto-permitted-iconが表示されていること
      const autoPermittedIcon = await reqPhaseItem.$('[data-testid="auto-permitted-icon"]');
      expect(await autoPermittedIcon.isExisting()).toBe(true);
    });

    it('should have auto-execute button enabled', async () => {
      const autoButton = await $('[data-testid="auto-execute-button"]');
      expect(await autoButton.isExisting()).toBe(true);
      expect(await autoButton.isEnabled()).toBe(true);

      // ボタンテキストが「自動実行」を含む
      const buttonText = await autoButton.getText();
      expect(buttonText).toContain('自動実行');
    });
  });

  // ============================================================
  // 2. 自動実行を押した時の状態変化
  // ============================================================
  describe('During Auto Execution', () => {
    it('should show spec in spec-list with correct state', async () => {
      // spec-listにspecが表示されていること
      const specItem = await $(`[data-testid="spec-item-${SPEC_NAME}"]`);
      expect(await specItem.isExisting()).toBe(true);
      expect(await specItem.isDisplayed()).toBe(true);
    });

    it('should disable requirements execute button during execution', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // 少し待ってから状態確認
      await browser.pause(300);

      // requirements実行ボタンが無効化されている（または実行中表示）
      const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
      const executeButton = await reqPhaseItem.$('[data-testid="phase-button-requirements"]');

      // 実行中はボタンが存在しない（代わりに「実行中」テキストが表示される）か、disabled
      if (await executeButton.isExisting()) {
        const isEnabled = await executeButton.isEnabled();
        expect(isEnabled).toBe(false);
      }

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 15000);
    });

    it('should change auto-execute button to stop button', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // 少し待ってから状態確認
      await browser.pause(300);

      // ボタンテキストが「停止」を含むこと
      const buttonText = await autoButton.getText();
      expect(buttonText).toContain('停止');

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 15000);
    });

    it('should disable all validate buttons during execution', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      await browser.pause(300);

      // validate-optionが全てdisabled状態であること
      const validateOptions = await $$('[data-testid="validate-option"]');
      for (const option of validateOptions) {
        // 実行ボタンを確認
        const executeBtn = await option.$('button');
        if (await executeBtn.isExisting()) {
          const isDisabled = !(await executeBtn.isEnabled());
          // 実行中は無効であるべき
          expect(isDisabled).toBe(true);
        }
      }

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 15000);
    });

    it('should show new agent session in project-agent-panel', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      await browser.pause(500);

      // project-agent-panelが存在すること
      const agentPanel = await $('[data-testid="project-agent-panel"]');
      expect(await agentPanel.isExisting()).toBe(true);

      // Agent一覧にアイテムがあること（実行中）
      // 注: Agentが表示されるタイミングはプロセス起動後なので、少し待つ必要がある
      const agentItemExists = await waitForCondition(async () => {
        const items = await agentPanel.$$('[data-testid^="project-agent-item-"]');
        return items.length > 0;
      }, 5000);

      expect(agentItemExists).toBe(true);

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 15000);
    });
  });

  // ============================================================
  // 3. requirement完了後の状態
  // ============================================================
  describe('After Requirements Complete', () => {
    it('should update requirements.md in main panel UI', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // 自動実行完了まで待つ
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 20000);
      expect(completed).toBe(true);

      // UIが更新されるのを待つ（ファイル監視経由）
      await browser.pause(1000);
      await refreshSpecStore();
      await browser.pause(1000);

      // requirementsフェーズのステータスアイコンを確認
      const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
      const generatedIcon = await reqPhaseItem.$('[data-testid="progress-icon-generated"]');
      const approvedIcon = await reqPhaseItem.$('[data-testid="progress-icon-approved"]');

      // generated または approved アイコンがあること
      const hasStatusIcon =
        (await generatedIcon.isExisting()) || (await approvedIcon.isExisting());
      expect(hasStatusIcon).toBe(true);
    });

    it('should restore auto-execute button to enabled state', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 20000);

      // UIが更新されるのを待つ
      await browser.pause(1000);
      await refreshSpecStore();
      await browser.pause(1000);

      // ボタンが有効であること
      expect(await autoButton.isEnabled()).toBe(true);

      // ボタンテキストが「自動実行」を含むこと（停止から復帰）
      const buttonText = await autoButton.getText();
      expect(buttonText).toContain('自動実行');
    });

    it('should show agent session as completed in project-agent-panel', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 20000);

      // UIが更新されるのを待つ
      await browser.pause(1000);

      // project-agent-panelでAgent一覧を確認
      const agentPanel = await $('[data-testid="project-agent-panel"]');
      expect(await agentPanel.isExisting()).toBe(true);

      // Agent一覧に完了状態のアイテムがあること
      const agentItemExists = await waitForCondition(async () => {
        const items = await agentPanel.$$('[data-testid^="project-agent-item-"]');
        return items.length > 0;
      }, 5000);
      expect(agentItemExists).toBe(true);

      // 完了ステータス（「完了」テキストを含む）を確認
      const agentItems = await agentPanel.$$('[data-testid^="project-agent-item-"]');
      const firstAgentItem = agentItems[0];
      const itemText = await firstAgentItem.getText();
      expect(itemText).toContain('完了');
    });
  });
});
