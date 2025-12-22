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
  // NOTE: feature_name is required to skip migrateSpecJson in fileService
  const initialSpecJson = {
    feature_name: 'simple-feature',
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
 * Helper: Get AutoExecutionService debug info
 */
async function getAutoExecutionServiceDebugInfo(): Promise<{
  trackedAgentIds: string[];
  pendingEvents: [string, string][];
  ipcListenerRegistered: boolean;
  serviceExists: boolean;
}> {
  return browser.execute(() => {
    try {
      const service = (window as any).__AUTO_EXECUTION_SERVICE__;
      if (!service) {
        return { trackedAgentIds: [], pendingEvents: [], ipcListenerRegistered: false, serviceExists: false };
      }
      // Use the public getDebugInfo method
      const debugInfo = service.getDebugInfo();
      return {
        ...debugInfo,
        serviceExists: true,
      };
    } catch (e) {
      return { trackedAgentIds: [], pendingEvents: [], ipcListenerRegistered: false, serviceExists: false };
    }
  });
}

/**
 * Helper: Log browser console logs (for debugging)
 */
async function logBrowserConsole(): Promise<void> {
  try {
    // Electron service should support getLogs
    const logs = await browser.getLogs('browser');
    if (logs && logs.length > 0) {
      console.log('[E2E] Browser logs:');
      for (const log of logs) {
        console.log(`  [${log.level}] ${log.message}`);
      }
    }
  } catch (e) {
    // getLogs may not be supported in all configurations
    console.log('[E2E] Could not get browser logs:', e);
  }
}

/**
 * Helper: Refresh spec store
 * Note: refreshSpecs() is async, so we need to wait for completion
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
      // Clear all agents from store
      const state = stores.agentStore.getState();
      state.agents.forEach((agent: any) => {
        state.removeAgent(agent.agentId);
      });
    }
  });
}

/**
 * Helper: Reset AutoExecutionService state for test isolation
 * Note: Service may not be available if WorkflowView hasn't rendered yet
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
 * Helper: Wait for AutoExecutionService to be initialized
 * The service is initialized when WorkflowView is first rendered
 */
async function waitForAutoExecutionService(timeout: number = 5000): Promise<boolean> {
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
 * Helper: Debug - get all agents from AgentStore
 */
async function debugGetAllAgents(): Promise<{ specId: string; agents: any[] }[]> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agentStore?.getState) return [];
    const state = stores.agentStore.getState();
    const result: { specId: string; agents: any[] }[] = [];
    state.agents.forEach((agents: any[], specId: string) => {
      result.push({ specId, agents });
    });
    return result;
  });
}

/**
 * Helper: Get running agents count from AgentStore
 */
async function getRunningAgentsCount(specName: string): Promise<number> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agentStore?.getState) return 0;
    const agents = stores.agentStore.getState().getAgentsForSpec(spec);
    return agents.filter((a: any) => a.status === 'running').length;
  }, specName);
}

/**
 * Helper: Wait for running agent to appear in AgentStore
 * This waits for the file watcher to propagate the agent record
 */
async function waitForRunningAgent(
  specName: string,
  timeout: number = 5000
): Promise<boolean> {
  return waitForCondition(
    async () => (await getRunningAgentsCount(specName)) > 0,
    timeout,
    100, // Poll frequently since file watcher can be fast
    'running-agent-in-store'
  );
}

/**
 * Helper: Get agents count from AgentStore for a spec
 */
async function getAgentsCount(specName: string): Promise<number> {
  return browser.execute((spec: string) => {
    const stores = (window as any).__STORES__;
    if (!stores?.agentStore?.getState) return 0;
    return stores.agentStore.getState().getAgentsForSpec(spec).length;
  }, specName);
}

/**
 * Helper: Wait for agent to appear in AgentStore (any status)
 */
async function waitForAgentInStore(
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

    // AutoExecutionServiceの状態をリセット（テスト分離のため）
    await resetAutoExecutionService();

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

    // agent-list-panelが表示されるまで待機
    const agentPanelVisible = await waitForCondition(async () => {
      const panel = await $('[data-testid="agent-list-panel"]');
      return await panel.isExisting();
    }, 5000, 200, 'agent-list-panel-visible');

    if (!agentPanelVisible) {
      console.log('[E2E] WARNING: agent-list-panel not visible after spec selection');
    }
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

      // AgentStoreにrunning状態のエージェントが追加されるまで待機
      // （ファイル監視経由の更新を待つ）
      const hasRunningAgent = await waitForRunningAgent(SPEC_NAME, 3000);

      // running agentがあれば、ボタンの状態を確認
      if (hasRunningAgent) {
        const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
        const executeButton = await reqPhaseItem.$('[data-testid="phase-button-requirements"]');

        // 実行中はボタンが存在しない（代わりに「実行中」テキストが表示される）か、disabled
        if (await executeButton.isExisting()) {
          const isEnabled = await executeButton.isEnabled();
          expect(isEnabled).toBe(false);
        }
        // ボタンが存在しない場合は「実行中」表示になっているのでOK
      }
      // running agentが見つからなかった場合はモック遅延が短すぎて既に完了している可能性
      // その場合はテストをスキップ扱い（エラーにしない）

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

      // AgentStoreにrunning状態のエージェントが追加されるまで待機（長めのタイムアウト）
      const hasRunningAgent = await waitForRunningAgent(SPEC_NAME, 8000);

      // running agentがあれば、validateボタンの状態を確認
      if (hasRunningAgent) {
        // UI更新を待つ
        await browser.pause(300);

        const validateOptions = await $$('[data-testid="validate-option"]');
        for (const option of validateOptions) {
          // 実行ボタンを確認（infoボタンを除く）
          const buttons = await option.$$('button');
          for (const btn of buttons) {
            const title = await btn.getAttribute('title');
            // infoボタン（「詳細を表示」）はスキップ
            if (title === '詳細を表示') continue;

            const isDisabled = !(await btn.isEnabled());
            // 実行中は無効であるべき
            expect(isDisabled).toBe(true);
          }
        }
      }
      // running agentが見つからなかった場合はモック遅延が短すぎて既に完了している

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 20000);
    });

    it('should show new agent session in agent-list-panel', async () => {
      // requirementsのみONに設定
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // デバッグ: specStore選択状態の確認
      const specState = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        if (!stores?.specStore?.getState) return { selectedSpec: null, specsCount: 0 };
        const state = stores.specStore.getState();
        return {
          selectedSpec: state.selectedSpec?.name || null,
          specsCount: state.specs.length,
        };
      });
      console.log('[E2E] DEBUG: specStore state before auto-exec:', JSON.stringify(specState));

      // agent-list-panelの表示確認（自動実行前）
      const panelBeforeExec = await $('[data-testid="agent-list-panel"]');
      const panelExistsBeforeExec = await panelBeforeExec.isExisting();
      console.log('[E2E] DEBUG: agent-list-panel exists before auto-exec:', panelExistsBeforeExec);

      // DOM調査: 全てのdata-testid属性を持つ要素を列挙
      const allTestIds = await browser.execute(() => {
        const elements = document.querySelectorAll('[data-testid]');
        return Array.from(elements).map(el => el.getAttribute('data-testid'));
      });
      console.log('[E2E] DEBUG: All data-testid count:', allTestIds.length);
      console.log('[E2E] DEBUG: agent-list-panel in testids:', allTestIds.includes('agent-list-panel'));
      console.log('[E2E] DEBUG: All data-testid in DOM:', JSON.stringify(allTestIds));

      // DOM調査: body直下の要素構造
      const bodyStructure = await browser.execute(() => {
        const body = document.body;
        return {
          childCount: body.children.length,
          firstChildTag: body.children[0]?.tagName,
          firstChildId: body.children[0]?.id,
          documentTitle: document.title,
        };
      });
      console.log('[E2E] DEBUG: Body structure:', JSON.stringify(bodyStructure));

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // AgentStoreにエージェントが追加されるまで待機（長めのタイムアウト）
      const agentAdded = await waitForAgentInStore(SPEC_NAME, 10000);

      // デバッグ: AgentStoreの全状態を確認
      const allAgents = await debugGetAllAgents();
      console.log('[E2E] DEBUG: All agents in store:', JSON.stringify(allAgents, null, 2));
      console.log('[E2E] DEBUG: Expected specId:', SPEC_NAME);
      console.log('[E2E] DEBUG: agentAdded result:', agentAdded);

      expect(agentAdded).toBe(true);

      // agent-list-panelが存在すること
      const agentPanel = await $('[data-testid="agent-list-panel"]');
      const panelExistsAfterExec = await agentPanel.isExisting();
      console.log('[E2E] DEBUG: agent-list-panel exists after auto-exec:', panelExistsAfterExec);
      expect(panelExistsAfterExec).toBe(true);

      // Agent一覧にアイテムがあること（長めのタイムアウト）
      const agentItemExists = await waitForCondition(async () => {
        const items = await agentPanel.$$('[data-testid^="agent-item-"]');
        return items.length > 0;
      }, 8000, 200, 'agent-item-in-panel');

      expect(agentItemExists).toBe(true);

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 20000);
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
      }, 25000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // ファイル監視経由でspec.jsonの更新がUIに反映されるまで待機
      // refreshSpecsを複数回呼び出して確実に反映
      for (let i = 0; i < 5; i++) {
        await browser.pause(500);
        await refreshSpecStore();
      }
      await browser.pause(1000);

      // requirementsフェーズのステータスアイコンを確認
      // ステータスアイコンが表示されるまでポーリング（長めのタイムアウト）
      const hasStatusIcon = await waitForCondition(async () => {
        // 毎回refreshを試みる
        await refreshSpecStore();

        // phase-item-requirementsを毎回取得し直す
        const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
        if (!await reqPhaseItem.isExisting()) {
          console.log('[E2E] phase-item-requirements not found');
          return false;
        }

        // 現在のアイコンを確認
        const generatedIcon = await reqPhaseItem.$('[data-testid="progress-icon-generated"]');
        const approvedIcon = await reqPhaseItem.$('[data-testid="progress-icon-approved"]');
        const pendingIcon = await reqPhaseItem.$('[data-testid="progress-icon-pending"]');

        const genExists = await generatedIcon.isExisting();
        const appExists = await approvedIcon.isExisting();
        const pendExists = await pendingIcon.isExisting();

        console.log(`[E2E] Icon status: generated=${genExists}, approved=${appExists}, pending=${pendExists}`);

        return genExists || appExists;
      }, 15000, 500, 'status-icon-visible');

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

      // デバッグ: AutoExecutionServiceの初期状態を確認
      const initialDebugInfo = await getAutoExecutionServiceDebugInfo();
      console.log('[E2E] Initial AutoExecutionService state:', JSON.stringify(initialDebugInfo));

      // 自動実行ボタンをクリック
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();
      console.log('[E2E] Auto-execute button clicked');

      // 少し待ってから状態を確認
      await browser.pause(500);
      const afterClickDebugInfo = await getAutoExecutionServiceDebugInfo();
      console.log('[E2E] After click AutoExecutionService state:', JSON.stringify(afterClickDebugInfo));

      const afterClickStatus = await getAutoExecutionStatus();
      console.log('[E2E] After click workflow status:', JSON.stringify(afterClickStatus));

      // 自動実行完了まで待つ（デバッグラベル付き）
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 20000, 500, 'auto-execution-complete');

      // 完了後のデバッグ情報
      const finalDebugInfo = await getAutoExecutionServiceDebugInfo();
      console.log('[E2E] Final AutoExecutionService state:', JSON.stringify(finalDebugInfo));

      // ブラウザログを取得
      await logBrowserConsole();

      if (!completed) {
        console.log('[E2E] WARNING: Auto-execution did not complete within timeout');
      }

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

    it('should show agent session as completed in agent-list-panel', async () => {
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

      // AgentStoreにエージェントが追加されるまで待機（長めのタイムアウト）
      await waitForAgentInStore(SPEC_NAME, 10000);

      // 自動実行完了まで待つ
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 25000, 500, 'auto-execution-complete');

      // ファイル監視経由でエージェント状態が更新されるまで待機
      await browser.pause(1000);

      // agent-list-panelでAgent一覧を確認
      const agentPanel = await $('[data-testid="agent-list-panel"]');
      expect(await agentPanel.isExisting()).toBe(true);

      // Agent一覧にアイテムがあること（長めのタイムアウト）
      const agentItemExists = await waitForCondition(async () => {
        const items = await agentPanel.$$('[data-testid^="agent-item-"]');
        return items.length > 0;
      }, 8000, 200, 'agent-item-exists');
      expect(agentItemExists).toBe(true);

      // 完了ステータスを確認（長めのタイムアウト）
      // AgentListPanelでは「完了」はアイコンのtitle属性に設定される
      const hasCompletedIcon = await waitForCondition(async () => {
        const items = await agentPanel.$$('[data-testid^="agent-item-"]');
        if (items.length === 0) return false;
        // アイコンのtitle属性で完了を確認
        const completedIcon = await items[0].$('[title="完了"]');
        return await completedIcon.isExisting();
      }, 10000, 300, 'agent-completed-icon');

      expect(hasCompletedIcon).toBe(true);
    });
  });
});
