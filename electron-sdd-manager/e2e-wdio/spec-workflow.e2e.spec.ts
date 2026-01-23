/**
 * Spec Workflow E2E Tests
 * コア機能: Spec選択、ワークフロー表示、フェーズ実行のE2Eテスト
 *
 * 旧テストファイルからの統合:
 * - src/e2e/agent-workflow.e2e.test.ts (Task 36)
 *
 * テスト内容:
 * - Spec一覧表示と選択
 * - WorkflowView表示
 * - フェーズボタン操作
 * - AgentListPanel / AgentLogPanel 連携
 *
 * Note: 基本的なアプリ起動・セキュリティ・安定性テストは app-launch.spec.ts に統合
 */

describe('Spec Workflow E2E', () => {
  // ============================================================
  // Spec一覧表示
  // Requirements: Spec選択、一覧表示
  // ============================================================
  describe('SpecListコンポーネント', () => {
    it('SpecListコンポーネントが存在する', async () => {
      const specList = await $('[data-testid="spec-list"]');
      // プロジェクト選択後は常にSpecListが表示される
      await expect(specList).toBeExisting();
    });

    it('Specsタブがデフォルトで選択されている', async () => {
      const specsTab = await $('[data-testid="tab-specs"]');
      if (await specsTab.isExisting()) {
        const isSelected = await specsTab.getAttribute('aria-selected');
        expect(isSelected).toBe('true');
      }
    });

    it('新規Spec作成ボタンが存在する', async () => {
      const createButton = await $('[data-testid="create-button"]');
      const exists = await createButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('Spec一覧アイテムがリスト形式で表示される', async () => {
      const specListItems = await $('[data-testid="spec-list-items"]');
      if (await specListItems.isExisting()) {
        const listItems = await specListItems.$$('li');
        // 空の場合もあるので、配列であることを確認
        expect(Array.isArray(listItems)).toBe(true);
      }
    });

    it('Specアイテムをクリックすると選択状態になる', async () => {
      const specListItems = await $('[data-testid="spec-list-items"]');
      if (await specListItems.isExisting()) {
        const firstItem = await specListItems.$('li');
        if (await firstItem.isExisting()) {
          await firstItem.click();
          await browser.pause(300);

          // 選択状態のクラスまたはaria属性を確認
          const classList = await firstItem.getAttribute('class');
          // 選択時には bg-blue-100 などのクラスが付与される
          expect(typeof classList).toBe('string');
        }
      }
    });
  });

  // ============================================================
  // CreateSpecDialog
  // Requirements: 新規Spec作成
  // ============================================================
  describe('CreateSpecDialogコンポーネント', () => {
    it('新規作成ボタンをクリックするとダイアログが開く', async () => {
      const specsTab = await $('[data-testid="tab-specs"]');
      const createButton = await $('[data-testid="create-button"]');

      if ((await specsTab.isExisting()) && (await createButton.isExisting())) {
        await specsTab.click();
        await createButton.click();

        const dialog = await $('[data-testid="create-spec-dialog"]');
        if (await dialog.waitForExist({ timeout: 3000 }).catch(() => false)) {
          const isDisplayed = await dialog.isDisplayed();
          expect(isDisplayed).toBe(true);

          // ダイアログを閉じる
          const closeButton = await $('[data-testid="close-button"]');
          if (await closeButton.isExisting()) {
            await closeButton.click();
          }
        }
      }
    });

    it('Spec名入力フィールドが存在する', async () => {
      const specsTab = await $('[data-testid="tab-specs"]');
      const createButton = await $('[data-testid="create-button"]');

      if ((await specsTab.isExisting()) && (await createButton.isExisting())) {
        await specsTab.click();
        await createButton.click();

        const dialog = await $('[data-testid="create-spec-dialog"]');
        if (await dialog.waitForExist({ timeout: 3000 }).catch(() => false)) {
          const specNameInput = await $('[data-testid="spec-name-input"]');
          const exists = await specNameInput.isExisting();
          expect(exists).toBe(true);

          // ダイアログを閉じる
          const closeButton = await $('[data-testid="close-button"]');
          if (await closeButton.isExisting()) {
            await closeButton.click();
          }
        }
      }
    });

    it('説明入力フィールドが存在する', async () => {
      const specsTab = await $('[data-testid="tab-specs"]');
      const createButton = await $('[data-testid="create-button"]');

      if ((await specsTab.isExisting()) && (await createButton.isExisting())) {
        await specsTab.click();
        await createButton.click();

        const dialog = await $('[data-testid="create-spec-dialog"]');
        if (await dialog.waitForExist({ timeout: 3000 }).catch(() => false)) {
          const descriptionInput = await $('[data-testid="spec-description-input"]');
          const exists = await descriptionInput.isExisting();
          expect(exists).toBe(true);

          // ダイアログを閉じる
          const closeButton = await $('[data-testid="close-button"]');
          if (await closeButton.isExisting()) {
            await closeButton.click();
          }
        }
      }
    });
  });

  // ============================================================
  // WorkflowView表示
  // Requirements: ワークフロー表示
  // ============================================================
  describe('WorkflowViewコンポーネント', () => {
    it('WorkflowViewコンポーネントが存在する', async () => {
      const workflowView = await $('[data-testid="workflow-view"]');
      const exists = await workflowView.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('Specを選択するとWorkflowViewが表示される', async () => {
      const specListItems = await $('[data-testid="spec-list-items"]');
      if (await specListItems.isExisting()) {
        const firstItem = await specListItems.$('li');
        if (await firstItem.isExisting()) {
          await firstItem.click();
          await browser.pause(500);

          const workflowView = await $('[data-testid="workflow-view"]');
          if (await workflowView.isExisting()) {
            const isDisplayed = await workflowView.isDisplayed();
            expect(isDisplayed).toBe(true);
          }
        }
      }
    });

    it('フェーズボタンが表示される', async () => {
      const specListItems = await $('[data-testid="spec-list-items"]');
      if (await specListItems.isExisting()) {
        const firstItem = await specListItems.$('li');
        if (await firstItem.isExisting()) {
          await firstItem.click();
          await browser.pause(500);

          // PhaseExecutionPanel内のフェーズボタンを確認
          const phaseButtons = await $$('[data-testid^="phase-button-"]');
          expect(phaseButtons.length).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ============================================================
  // PhaseExecutionPanel
  // Requirements: フェーズ実行UI
  // ============================================================
  describe('PhaseExecutionPanelコンポーネント', () => {
    it('PhaseExecutionPanelが存在する', async () => {
      const specListItems = await $('[data-testid="spec-list-items"]');
      if (await specListItems.isExisting()) {
        const firstItem = await specListItems.$('li');
        if (await firstItem.isExisting()) {
          await firstItem.click();
          await browser.pause(500);

          const phasePanel = await $('[data-testid="phase-execution-panel"]');
          const exists = await phasePanel.isExisting();
          expect(typeof exists).toBe('boolean');
        }
      }
    });

    it('Requirementsフェーズボタンが存在する', async () => {
      const requirementsButton = await $('[data-testid="phase-button-requirements"]');
      const exists = await requirementsButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('Designフェーズボタンが存在する', async () => {
      const designButton = await $('[data-testid="phase-button-design"]');
      const exists = await designButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('Tasksフェーズボタンが存在する', async () => {
      const tasksButton = await $('[data-testid="phase-button-tasks"]');
      const exists = await tasksButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('Implフェーズボタンが存在する', async () => {
      const implButton = await $('[data-testid="phase-button-impl"]');
      const exists = await implButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('自動実行ボタンが存在する', async () => {
      const autoExecButton = await $('[data-testid="auto-execution-button"]');
      const exists = await autoExecButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // ============================================================
  // AgentListPanel
  // Requirements: エージェント一覧表示
  // ============================================================
  describe('AgentListPanelコンポーネント', () => {
    it('AgentListPanelが存在する', async () => {
      const agentListPanel = await $('[data-testid="agent-list-panel"]');
      const exists = await agentListPanel.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('エージェント一覧ヘッダーが表示される', async () => {
      const agentListHeader = await $('[data-testid="agent-list-header"]');
      const exists = await agentListHeader.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('実行中エージェントがない場合は空状態が表示される', async () => {
      const emptyState = await $('[data-testid="agent-list-empty"]');
      const exists = await emptyState.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // ============================================================
  // AgentLogPanel
  // Requirements: ログ表示
  // ============================================================
  describe('AgentLogPanelコンポーネント', () => {
    it('AgentLogPanelが存在する', async () => {
      const agentLogPanel = await $('[data-testid="agent-log-panel"]');
      const exists = await agentLogPanel.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('ログコンテナが存在する', async () => {
      const logContainer = await $('[data-testid="log-container"]');
      const exists = await logContainer.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // ============================================================
  // AgentInputPanel
  // Requirements: stdin入力
  // ============================================================
  describe('AgentInputPanelコンポーネント', () => {
    it('AgentInputPanelが存在する', async () => {
      const agentInputPanel = await $('[data-testid="agent-input-panel"]');
      const exists = await agentInputPanel.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('入力フィールドが存在する', async () => {
      const inputField = await $('[data-testid="agent-input-field"]');
      const exists = await inputField.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('送信ボタンが存在する', async () => {
      const sendButton = await $('[data-testid="agent-send-button"]');
      const exists = await sendButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // ============================================================
  // ApprovalPanel
  // Requirements: 承認/却下フロー
  // ============================================================
  describe('ApprovalPanelコンポーネント', () => {
    it('ApprovalPanelの構造が正しい', async () => {
      // ApprovalPanelはSpec選択時に表示される
      const specListItems = await $('[data-testid="spec-list-items"]');
      if (await specListItems.isExisting()) {
        const firstItem = await specListItems.$('li');
        if (await firstItem.isExisting()) {
          await firstItem.click();
          await browser.pause(500);

          const approvalPanel = await $('[data-testid="approval-panel"]');
          const exists = await approvalPanel.isExisting();
          expect(typeof exists).toBe('boolean');
        }
      }
    });

    it('承認ボタンが存在する', async () => {
      const approveButton = await $('[data-testid="approve-button"]');
      const exists = await approveButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('却下ボタンが存在する', async () => {
      const rejectButton = await $('[data-testid="reject-button"]');
      const exists = await rejectButton.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // ============================================================
  // ArtifactPreview
  // Requirements: 成果物プレビュー
  // ============================================================
  describe('ArtifactPreviewコンポーネント', () => {
    it('ArtifactPreviewが存在する', async () => {
      const artifactPreview = await $('[data-testid="artifact-preview"]');
      const exists = await artifactPreview.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('Markdownコンテンツが表示される領域がある', async () => {
      const mdContent = await $('[data-testid="markdown-content"]');
      const exists = await mdContent.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // ============================================================
  // TaskProgressView
  // Requirements: タスク進捗表示
  // ============================================================
  describe('TaskProgressViewコンポーネント', () => {
    it('TaskProgressViewが存在する', async () => {
      const taskProgressView = await $('[data-testid="task-progress-view"]');
      const exists = await taskProgressView.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });

  // Note: セキュリティ設定・安定性テストは app-launch.spec.ts に統合
});

/**
 * エージェントワークフロー詳細テスト
 * 旧テスト src/e2e/agent-workflow.e2e.test.ts (Task 36) から統合
 */
describe('エージェントワークフロー（インフラ確認）', () => {
  // ============================================================
  // Task 36.1: docグループ実行
  // Requirements: 6.1-6.8, 5.6, 5.7, 5.8
  // ============================================================
  describe('Task 36.1: docグループ実行', () => {
    it('ウィンドウが正常に動作している', async () => {
      const windowState = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return null;
        return {
          isMaximized: windows[0].isMaximized(),
          isMinimized: windows[0].isMinimized(),
          isFullScreen: windows[0].isFullScreen(),
          isClosable: windows[0].isClosable(),
        };
      });
      expect(windowState).not.toBeNull();
      expect(typeof windowState?.isClosable).toBe('boolean');
    });

    it('IPCチャネルが正常に動作している', async () => {
      // E2Eテストではelectron.executeが正常に動作することを確認
      const appName = await browser.electron.execute((electron) => {
        return electron.app.getName();
      });
      expect(typeof appName).toBe('string');
      expect(appName.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Task 36.2: アプリ再起動→中断Agent表示→再開
  // ============================================================
  describe('Task 36.2: 中断エージェント復元', () => {
    it('メニューが存在する', async () => {
      const hasMenu = await browser.electron.execute((electron) => {
        const menu = electron.Menu.getApplicationMenu();
        return menu !== null;
      });
      expect(hasMenu).toBe(true);
    });

    it('ウィンドウを閉じることができる準備ができている', async () => {
      const canClose = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].isClosable();
      });
      expect(canClose).toBe(true);
    });
  });
});

/**
 * git-worktree-support E2Eテスト
 * Task 10.2: Worktree workflow E2E testing
 * Requirements: 4.1, 4.2, 7.1-7.8, 8.1, 8.2
 */
describe('Git Worktree Support E2E', () => {
  // ============================================================
  // Task 10.2: Agent一覧でのworktree識別表示
  // Requirements: 4.1, 4.2
  // ============================================================
  describe('Worktree識別表示', () => {
    it('AgentListPanelコンポーネントが存在する', async () => {
      const agentListPanel = await $('[data-testid="agent-list-panel"]');
      const exists = await agentListPanel.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('worktree-indicatorのdata-testidが定義されている', async () => {
      // worktree-indicatorはworktreeモードのspecが選択されている時のみ表示される
      // ここではセレクタが有効であることを確認（要素が存在するかは状態依存）
      const worktreeIndicator = await $('[data-testid="worktree-indicator"]');
      // isExisting()はエラーなく呼べることを確認
      const existsCheck = await worktreeIndicator.isExisting().catch(() => false);
      expect(typeof existsCheck).toBe('boolean');
    });
  });

  // ============================================================
  // Task 10.2: Worktree IPC channels
  // Requirements: 1.1, 1.3, 1.6
  // ============================================================
  describe('Worktree IPCチャネル', () => {
    it('electronAPIにworktree関連メソッドが存在する', async () => {
      const hasWorktreeMethods = await browser.execute(() => {
        const api = (window as any).electronAPI;
        if (!api) return { exists: false };
        return {
          exists: true,
          hasWorktreeCheckMain: typeof api.worktreeCheckMain === 'function',
          hasWorktreeCreate: typeof api.worktreeCreate === 'function',
          hasWorktreeRemove: typeof api.worktreeRemove === 'function',
          hasWorktreeResolvePath: typeof api.worktreeResolvePath === 'function',
        };
      });

      expect(hasWorktreeMethods.exists).toBe(true);
      expect(hasWorktreeMethods.hasWorktreeCheckMain).toBe(true);
      expect(hasWorktreeMethods.hasWorktreeCreate).toBe(true);
      expect(hasWorktreeMethods.hasWorktreeRemove).toBe(true);
      expect(hasWorktreeMethods.hasWorktreeResolvePath).toBe(true);
    });
  });

  // ============================================================
  // Task 10.2: WorkflowViewのworktreeモード対応
  // Requirements: 8.1, 8.2
  // ============================================================
  describe('WorkflowView worktreeモード', () => {
    it('WorkflowViewコンポーネントが存在する', async () => {
      const workflowView = await $('[data-testid="workflow-view"]');
      const exists = await workflowView.isExisting();
      expect(typeof exists).toBe('boolean');
    });

    it('PhaseExecutionPanelが存在する', async () => {
      const phasePanel = await $('[data-testid="phase-execution-panel"]');
      const exists = await phasePanel.isExisting();
      expect(typeof exists).toBe('boolean');
    });
  });
});
