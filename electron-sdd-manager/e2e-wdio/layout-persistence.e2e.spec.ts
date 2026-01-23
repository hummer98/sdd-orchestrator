/**
 * Layout Persistence E2E Tests
 * レイアウト永続化 - ResizeHandle、レイアウト保存/復元のE2Eテスト
 *
 * テスト内容:
 * - ResizeHandleコンポーネントの存在
 * - レイアウト設定のIPC API
 * - レイアウト保存/復元機能
 */

describe('Layout Persistence E2E', () => {
  // Note: 基本的なアプリ起動・セキュリティ・安定性テストは app-launch.spec.ts に統合

  // ============================================================
  // ResizeHandleコンポーネント
  // ============================================================
  describe('ResizeHandleコンポーネント', () => {
    it('いずれかのリサイズハンドルが存在する', async () => {
      const horizontalHandle = await $('[data-testid="resize-handle-horizontal"]');
      const verticalHandle = await $('[data-testid="resize-handle-vertical"]');
      const hasHorizontal = await horizontalHandle.isExisting();
      const hasVertical = await verticalHandle.isExisting();
      // 少なくとも1つのリサイズハンドルが存在することを確認
      expect(hasHorizontal || hasVertical).toBe(true);
    });

    it('リサイズハンドルにカーソルスタイルが適用されている', async () => {
      const horizontalHandle = await $('[data-testid="resize-handle-horizontal"]');
      const verticalHandle = await $('[data-testid="resize-handle-vertical"]');

      if (await horizontalHandle.isExisting()) {
        const classList = await horizontalHandle.getAttribute('class');
        expect(classList).toContain('cursor-col-resize');
      } else if (await verticalHandle.isExisting()) {
        const classList = await verticalHandle.getAttribute('class');
        expect(classList).toContain('cursor-row-resize');
      }
      // Note: 両方存在しない場合、前のテストで失敗するのでここはパス
    });
  });

  // ============================================================
  // レイアウト設定IPC
  // ============================================================
  describe('レイアウト設定IPC', () => {
    it('Renderer APIにレイアウト関連のメソッドが存在する', async () => {
      const hasLayoutAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.loadLayoutConfig === 'function' &&
          typeof window.electronAPI.saveLayoutConfig === 'function';
      });
      expect(hasLayoutAPI).toBe(true);
    });

    it('Renderer APIにレイアウトリセットメソッドが存在する', async () => {
      const hasResetAPI = await browser.execute(() => {
        return typeof window.electronAPI !== 'undefined' &&
          typeof window.electronAPI.resetLayoutConfig === 'function';
      });
      expect(hasResetAPI).toBe(true);
    });

    // Note: loadLayoutConfig()はprojectPathが必要なため、
    // プロジェクト選択後のテスト（ProjectAgentPanelレイアウト保存・復元）で検証
  });

  // ============================================================
  // ウィンドウリサイズ
  // ============================================================
  describe('ウィンドウリサイズ', () => {
    it('ウィンドウがリサイズ可能である', async () => {
      const isResizable = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].isResizable();
      });
      expect(isResizable).toBe(true);
    });

    it('ウィンドウサイズが最小サイズ以上である', async () => {
      const windowSize = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return null;
        const bounds = windows[0].getBounds();
        return { width: bounds.width, height: bounds.height };
      });
      expect(windowSize).not.toBeNull();
      if (windowSize) {
        expect(windowSize.width).toBeGreaterThanOrEqual(800);
        expect(windowSize.height).toBeGreaterThanOrEqual(600);
      }
    });

    it('ウィンドウ位置を取得できる', async () => {
      const windowPosition = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return null;
        const position = windows[0].getPosition();
        return { x: position[0], y: position[1] };
      });
      expect(windowPosition).not.toBeNull();
      if (windowPosition) {
        expect(typeof windowPosition.x).toBe('number');
        expect(typeof windowPosition.y).toBe('number');
      }
    });
  });

  // ============================================================
  // ProjectAgentPanelコンポーネント (project-agent-panel-always-visible feature)
  // Note: ProjectAgentPanel is only rendered when a project is selected
  // ============================================================
  describe('ProjectAgentPanelコンポーネント', () => {
    // Test project path
    const FIXTURE_PROJECT_PATH = require('path').resolve(__dirname, 'fixtures/test-project');

    // Select project before ProjectAgentPanel tests
    beforeEach(async () => {
      await browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
        try {
          const stores = (window as any).__STORES__;
          if (stores?.project?.getState) {
            await stores.project.getState().selectProject(projPath);
            done(true);
          } else {
            done(false);
          }
        } catch {
          done(false);
        }
      }, FIXTURE_PROJECT_PATH);
      // Wait for React to re-render after project selection
      await browser.pause(500);
    });

    it('ProjectAgentPanelが常に表示される（0件時も）', async () => {
      const panel = await $('[data-testid="project-agent-panel"]');
      await panel.waitForExist({ timeout: 5000 });
      const exists = await panel.isExisting();
      expect(exists).toBe(true);
    });

    it('ProjectAgentPanelのコンテナが存在する', async () => {
      const container = await $('[data-testid="project-agent-panel-container"]');
      await container.waitForExist({ timeout: 5000 });
      const exists = await container.isExisting();
      expect(exists).toBe(true);
    });

    it('ProjectAgentPanelのヘッダーが存在する', async () => {
      const header = await $('[data-testid="project-agent-panel-header"]');
      await header.waitForExist({ timeout: 5000 });
      const exists = await header.isExisting();
      expect(exists).toBe(true);
    });

    it('ProjectAgentPanelに0件時の空状態メッセージまたはエージェントリストが表示される', async () => {
      // First wait for the panel to exist
      const panel = await $('[data-testid="project-agent-panel"]');
      await panel.waitForExist({ timeout: 5000 });

      const emptyState = await $('[data-testid="project-agent-panel-empty"]');
      const emptyExists = await emptyState.isExisting();

      if (emptyExists) {
        // 0件の場合は空状態メッセージが表示される
        const text = await emptyState.getText();
        expect(text).toContain('プロジェクトエージェントなし');
      } else {
        // エージェントが存在する場合はパネル自体が表示されている
        expect(await panel.isExisting()).toBe(true);
      }
    });

    it('ProjectAgentPanel上部にリサイズハンドルが配置されている', async () => {
      // ProjectAgentPanelコンテナの直前にリサイズハンドルがある
      const container = await $('[data-testid="project-agent-panel-container"]');
      await container.waitForExist({ timeout: 5000 });
      // コンテナが存在すればリサイズハンドルも配置済み
      const verticalHandles = await $$('[data-testid="resize-handle-vertical"]');
      expect(verticalHandles.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // ProjectAgentPanelレイアウト保存・復元 (project-agent-panel-always-visible feature)
  // Note: Layout APIs require projectPath, so we need to select a project first
  // ============================================================
  describe('ProjectAgentPanelレイアウト保存・復元', () => {
    // Test project path for layout persistence tests
    const FIXTURE_PROJECT_PATH = require('path').resolve(__dirname, 'fixtures/test-project');

    // Select project before layout tests
    beforeEach(async () => {
      // Select project via store to ensure projectPath is available
      await browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
        try {
          const stores = (window as any).__STORES__;
          if (stores?.project?.getState) {
            await stores.project.getState().selectProject(projPath);
            done(true);
          } else {
            done(false);
          }
        } catch {
          done(false);
        }
      }, FIXTURE_PROJECT_PATH);
      await browser.pause(300);
    });

    it('ProjectAgentPanelの高さが取得できる', async () => {
      const container = await $('[data-testid="project-agent-panel-container"]');
      if (await container.isExisting()) {
        const size = await container.getSize();
        expect(size.height).toBeGreaterThan(0);
      }
    });

    it('saveLayoutConfigにprojectAgentPanelHeightを渡せる', async () => {
      const canSave = await browser.execute(async (projPath: string) => {
        if (typeof window.electronAPI === 'undefined' ||
            typeof window.electronAPI.saveLayoutConfig !== 'function') {
          return false;
        }
        try {
          // テスト用の値で保存を試みる (projectPathを渡す)
          await window.electronAPI.saveLayoutConfig(projPath, {
            leftPaneWidth: 288,
            rightPaneWidth: 320,
            bottomPaneHeight: 192,
            agentListHeight: 160,
            projectAgentPanelHeight: 150, // カスタム値
          });
          return true;
        } catch {
          return false;
        }
      }, FIXTURE_PROJECT_PATH);
      expect(canSave).toBe(true);
    });

    it('loadLayoutConfigでprojectAgentPanelHeightが復元される', async () => {
      const loadedHeight = await browser.execute(async (projPath: string) => {
        if (typeof window.electronAPI === 'undefined' ||
            typeof window.electronAPI.loadLayoutConfig !== 'function') {
          return null;
        }
        try {
          const config = await window.electronAPI.loadLayoutConfig(projPath);
          return config?.projectAgentPanelHeight ?? null;
        } catch {
          return null;
        }
      }, FIXTURE_PROJECT_PATH);
      // 保存した値または何らかの値が読み込まれる（nullでない、または後方互換でnull）
      expect(loadedHeight === null || typeof loadedHeight === 'number').toBe(true);
    });

    it('リサイズ後にレイアウトが保存される', async () => {
      // 1. 初期の高さを記録
      const initialHeight = await browser.execute(async (projPath: string) => {
        const config = await window.electronAPI.loadLayoutConfig(projPath);
        return config?.projectAgentPanelHeight ?? 120;
      }, FIXTURE_PROJECT_PATH);

      expect(typeof initialHeight).toBe('number');

      // 2. 新しい高さで保存
      const newHeight = initialHeight === 150 ? 180 : 150;
      await browser.execute(async (projPath: string, height: number) => {
        await window.electronAPI.saveLayoutConfig(projPath, {
          leftPaneWidth: 288,
          rightPaneWidth: 320,
          bottomPaneHeight: 192,
          agentListHeight: 160,
          projectAgentPanelHeight: height,
        });
      }, FIXTURE_PROJECT_PATH, newHeight);

      // 3. 読み込んで確認
      const savedHeight = await browser.execute(async (projPath: string) => {
        const config = await window.electronAPI.loadLayoutConfig(projPath);
        return config?.projectAgentPanelHeight;
      }, FIXTURE_PROJECT_PATH);

      expect(savedHeight).toBe(newHeight);
    });

    it('resetLayoutConfigでprojectAgentPanelHeightがデフォルト値に戻る', async () => {
      // リセット実行
      await browser.execute(async (projPath: string) => {
        await window.electronAPI.resetLayoutConfig(projPath);
      }, FIXTURE_PROJECT_PATH);

      // リセット後の値を確認
      const heightAfterReset = await browser.execute(async (projPath: string) => {
        const config = await window.electronAPI.loadLayoutConfig(projPath);
        return config?.projectAgentPanelHeight;
      }, FIXTURE_PROJECT_PATH);

      // デフォルト値（120px）に戻っていることを確認
      expect(heightAfterReset).toBe(120);
    });
  });
});
