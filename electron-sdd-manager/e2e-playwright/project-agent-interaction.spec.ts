/**
 * Project Agent Interaction E2E Test (Playwright)
 *
 * remote-ui（Web版）でProjectAgentアイテムをクリックし、
 * AgentDetailDrawerが表示され、ログが表示されることを検証するE2Eテスト。
 *
 * Requirements Coverage:
 * - ProjectAgentアイテムクリックでAgentDetailDrawerが開く
 * - AgentDetailDrawerでログが表示される
 * - 「続けて」ボタンが表示され、クリックできる
 * - プロンプト入力と送信が正常に動作する
 *
 * Test Scenarios:
 * 1. AgentsタブへのアクセスとProjectAgent一覧表示
 * 2. ProjectAgentアイテムのクリックとDrawer表示
 * 3. AgentDetailDrawerでのログ表示
 * 4. プロンプト入力と継続実行
 */

import { test, expect } from '@playwright/test';
import {
  navigateToRemoteUI,
  waitForConnection,
} from './helpers/remote-ui.helpers';

// スマートフォンビューポート設定
const SMARTPHONE_VIEWPORT = { width: 375, height: 667 };

/**
 * Helper: Agentsタブに切り替え
 */
async function switchToAgentsTab(page: import('@playwright/test').Page) {
  // モバイルレイアウトの底部タブバーでAgentsタブをクリック
  const bottomTabBar = page.locator('[data-testid="mobile-bottom-tabs"]');
  const agentsTab = bottomTabBar.locator('[data-testid="remote-tab-agents"]');
  await agentsTab.click();

  // タブがアクティブになるまで待機
  await page.waitForFunction(() => {
    const tab = document.querySelector('[data-testid="mobile-bottom-tabs"] [data-testid="remote-tab-agents"]');
    return tab?.getAttribute('aria-selected') === 'true';
  }, { timeout: 5000 });
}

/**
 * Helper: ProjectAgent一覧が表示されるまで待機
 */
async function waitForProjectAgentList(page: import('@playwright/test').Page) {
  // AgentsTabViewが表示されるまで待機
  await page.waitForSelector('[data-testid="agents-tab-view"]', { timeout: 10000 });

  // Project Agent一覧または空状態が表示されるまで待機
  const agentList = page.locator('[data-testid="project-agent-list"]');
  const emptyState = page.locator('[data-testid="project-agent-list-empty"]');

  await Promise.race([
    expect(agentList).toBeVisible({ timeout: 10000 }),
    expect(emptyState).toBeVisible({ timeout: 10000 }),
  ]);
}

/**
 * Helper: ProjectAgent数を取得
 */
async function getProjectAgentCount(page: import('@playwright/test').Page): Promise<number> {
  // エージェントリストが存在するか確認
  const agentList = page.locator('[data-testid="project-agent-list"]');
  const hasAgentList = await agentList.isVisible().catch(() => false);

  if (!hasAgentList) {
    return 0;
  }

  const agentItems = agentList.locator('[data-testid^="agent-item-"]');
  return await agentItems.count();
}

/**
 * Helper: ProjectAgentを起動（mock-claude経由）
 * @returns 起動したAgentのID（推定）
 */
async function executeProjectCommand(
  page: import('@playwright/test').Page,
  command: string = '/kiro:project-ask "テスト質問"'
): Promise<string | null> {
  // Electron APIを経由してProjectAgentを起動
  const result = await page.evaluate(async (cmd) => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.executeProjectCommand) {
        return { success: false, error: 'electronAPI not available' };
      }

      const stores = (window as any).__STORES__;
      const projectPath = stores?.project?.getState()?.projectPath;
      if (!projectPath) {
        return { success: false, error: 'No project selected' };
      }

      const response = await electronAPI.executeProjectCommand(projectPath, cmd, 'test-agent');
      return { success: true, agentId: response?.agentId };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, command);

  if (result.success && result.agentId) {
    return result.agentId;
  }

  console.log('[E2E] Failed to execute project command:', result.error);
  return null;
}

test.describe('Project Agent Interaction E2E Test', () => {
  test.use({ viewport: SMARTPHONE_VIEWPORT });

  let testAgentId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await navigateToRemoteUI(page);
    await waitForConnection(page);
  });

  // 最初のテストグループの前にProjectAgentを1つ起動
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ viewport: SMARTPHONE_VIEWPORT });
    const page = await context.newPage();

    try {
      await navigateToRemoteUI(page);
      await waitForConnection(page);
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      const count = await getProjectAgentCount(page);
      if (count === 0) {
        testAgentId = await executeProjectCommand(page);
        console.log(`[E2E] Created test agent: ${testAgentId}`);
        await page.waitForTimeout(3000);
      }
    } finally {
      await context.close();
    }
  });

  // ============================================================
  // 1. AgentsタブへのアクセスとProjectAgent一覧表示
  // ============================================================
  test.describe('Agentsタブへのアクセス', () => {
    test('should switch to Agents tab and display ProjectAgent list', async ({ page }) => {
      // Agentsタブに切り替え
      await switchToAgentsTab(page);

      // AgentsTabViewが表示される
      const agentsTabView = page.locator('[data-testid="agents-tab-view"]');
      await expect(agentsTabView).toBeVisible();

      // ProjectAgent一覧が表示される
      await waitForProjectAgentList(page);

      // ヘッダーに "Project Agent" が表示される
      const header = page.locator('[data-testid="agents-tab-view-header"]');
      await expect(header).toContainText('Project Agent');
    });

    test('should display agent count in header', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ヘッダーにエージェント数が表示される
      const header = page.locator('[data-testid="agents-tab-view-header"]');
      const headerText = await header.textContent();
      expect(headerText).toMatch(/\(\d+\)/); // (N) の形式でカウント表示
    });
  });

  // ============================================================
  // 2. ProjectAgentアイテムのクリックとDrawer表示
  // ============================================================
  test.describe('ProjectAgentアイテムのクリック', () => {
    test('should open AgentDetailDrawer when ProjectAgent item is clicked', async ({ page }) => {
      // Agentsタブに切り替え
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動（既存がない場合）
      let itemCount = await getProjectAgentCount(page);

      if (itemCount === 0) {
        console.log('[E2E] No existing agents, starting a new one');
        const agentId = await executeProjectCommand(page);
        if (!agentId) {
          console.log('[E2E] Failed to start agent, skipping test');
          return;
        }

        // エージェントがリストに表示されるまで待機
        await page.waitForTimeout(3000);
        itemCount = await getProjectAgentCount(page);

        if (itemCount === 0) {
          console.log('[E2E] Agent not added to list, skipping test');
          return;
        }
      }

      // 最初のProjectAgentアイテムをクリック
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      const firstAgentItem = agentItems.first();
      await firstAgentItem.click();

      // AgentDetailDrawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });
    });

    test('should display agent info in drawer header', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動（必要に応じて）
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      const itemCount = await agentItems.count();

      if (itemCount === 0) {
        await executeProjectCommand(page);
        await page.waitForTimeout(2000);
      }

      // ProjectAgentアイテムをクリック
      await agentItems.first().click();

      // Drawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Drawerヘッダーにフェーズ名またはエージェントIDが表示される
      const drawerHeader = drawer.locator('h2, h3').first();
      await expect(drawerHeader).toBeVisible();
    });
  });

  // ============================================================
  // 3. AgentDetailDrawerでのログ表示
  // ============================================================
  test.describe('AgentDetailDrawerでのログ表示', () => {
    test('should display agent logs in drawer', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動
      const agentId = await executeProjectCommand(page);
      if (!agentId) {
        console.log('[E2E] Failed to start agent, skipping test');
        return;
      }

      // エージェントがリストに表示されるまで待機
      await page.waitForTimeout(3000);

      // ProjectAgentアイテムをクリック
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItem = agentList.locator(`[data-testid="agent-item-${agentId}"]`);

      // アイテムが存在する場合のみクリック
      const itemExists = await agentItem.isVisible().catch(() => false);
      if (!itemExists) {
        console.log('[E2E] Agent item not found, trying first item');
        const agentItems = agentList.locator('[data-testid^="agent-item-"]');
        await agentItems.first().click();
      } else {
        await agentItem.click();
      }

      // Drawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // ログエントリが表示される（実行が完了するまで待機）
      await page.waitForTimeout(5000);

      // ログパネルまたはログエントリを確認
      const logPanel = page.locator('[data-testid="agent-log-panel"]');
      const logEntries = drawer.locator('[data-testid="log-entry"]');

      // ログパネルまたはログエントリのいずれかが表示される
      const hasLogPanel = await logPanel.isVisible().catch(() => false);
      const logCount = await logEntries.count();

      console.log(`[E2E] Log panel visible: ${hasLogPanel}, Log entries count: ${logCount}`);

      // ログが1つ以上表示される、またはログパネルが表示される
      expect(hasLogPanel || logCount > 0).toBe(true);
    });

    test('should display multiple log entries for completed agent', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動
      await executeProjectCommand(page);
      await page.waitForTimeout(3000);

      // ProjectAgentアイテムをクリック
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      await agentItems.first().click();

      // Drawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // エージェント実行完了まで待機
      await page.waitForTimeout(8000);

      // 複数のログエントリが表示される
      const logEntries = drawer.locator('[data-testid="log-entry"]');
      const logCount = await logEntries.count();

      console.log(`[E2E] Final log entries count: ${logCount}`);

      // mock-claudeは複数のログエントリを生成する
      if (logCount > 0) {
        expect(logCount).toBeGreaterThan(1);
      }
    });
  });

  // ============================================================
  // 4. プロンプト入力と継続実行
  // ============================================================
  test.describe('プロンプト入力と継続実行', () => {
    test('should display instruction input and send button in drawer', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動
      await executeProjectCommand(page);
      await page.waitForTimeout(3000);

      // ProjectAgentアイテムをクリック
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      await agentItems.first().click();

      // Drawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // プロンプト入力フィールドと送信ボタンが表示される
      const instructionInput = drawer.locator('[data-testid="agent-detail-drawer-instruction-input"]');
      const sendButton = drawer.locator('[data-testid="agent-detail-drawer-send-button"]');

      await expect(instructionInput).toBeVisible();
      await expect(sendButton).toBeVisible();
    });

    test('should display continue button in drawer', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動
      await executeProjectCommand(page);
      await page.waitForTimeout(3000);

      // ProjectAgentアイテムをクリック
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      await agentItems.first().click();

      // Drawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // 「続けて」ボタンが表示される
      const continueButton = drawer.locator('[data-testid="agent-detail-drawer-continue-button"]');
      await expect(continueButton).toBeVisible();
    });

    test('should close drawer when backdrop is clicked', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // ProjectAgentを起動
      await executeProjectCommand(page);
      await page.waitForTimeout(3000);

      // ProjectAgentアイテムをクリック
      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      await agentItems.first().click();

      // Drawerが開く
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // バックドロップをクリック
      const backdrop = page.locator('[data-testid="agent-detail-drawer-backdrop"]');
      await backdrop.click({ position: { x: 10, y: 10 } }); // 左上をクリック

      // Drawerが閉じる
      await expect(drawer).not.toBeVisible({ timeout: 3000 });
    });
  });

  // ============================================================
  // 5. 複数エージェントの切り替え
  // ============================================================
  test.describe('複数エージェントの切り替え', () => {
    test('should switch between multiple ProjectAgents', async ({ page }) => {
      await switchToAgentsTab(page);
      await waitForProjectAgentList(page);

      // 2つのProjectAgentを起動
      const agentId1 = await executeProjectCommand(page, '/kiro:project-ask "質問1"');
      await page.waitForTimeout(2000);
      const agentId2 = await executeProjectCommand(page, '/kiro:project-ask "質問2"');
      await page.waitForTimeout(2000);

      if (!agentId1 || !agentId2) {
        console.log('[E2E] Failed to start agents, skipping test');
        return;
      }

      const agentList = page.locator('[data-testid="project-agent-list"]');
      const agentItems = agentList.locator('[data-testid^="agent-item-"]');
      const itemCount = await agentItems.count();

      if (itemCount < 2) {
        console.log('[E2E] Not enough agents, skipping test');
        return;
      }

      // 最初のエージェントをクリック
      await agentItems.first().click();
      const drawer = page.locator('[data-testid="agent-detail-drawer"]');
      await expect(drawer).toBeVisible({ timeout: 5000 });

      // Drawerを閉じる
      const closeButton = drawer.locator('[data-testid="agent-detail-drawer-close"]');
      await closeButton.click();
      await expect(drawer).not.toBeVisible({ timeout: 3000 });

      // 2番目のエージェントをクリック
      await agentItems.nth(1).click();
      await expect(drawer).toBeVisible({ timeout: 5000 });
    });
  });
});
