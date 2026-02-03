# Implementation Plan: Remote UI Task Display

## Tasks

- [x] 1. タスク解析ロジックの共有化
- [x] 1.1 (P) タスク進捗解析関数を作成する
  - tasks.mdコンテンツからチェックボックス（`- [x]`, `- [ ]`）をパースして集計する純粋関数を実装
  - 総タスク数、完了タスク数、完了率（0-100）を返却
  - 空またはnull入力時はzero値（total: 0, completed: 0, percentage: 0）を返却
  - 既存specDetailStore.tsの計算ロジックを参照して抽出
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Method: parseTaskProgress_
  - _Verify: Grep "parseTaskProgress" in shared/utils/taskProgressParser.ts_

- [x] 1.2 Electron版specDetailStoreを共通関数に移行する
  - specDetailStore.tsのタスク進捗計算ロジックを削除し、共通関数を呼び出すよう変更
  - インポートパスの更新
  - 既存の動作が維持されることを確認
  - _Requirements: 1.3_
  - _Note: 1.1完了後に実施（依存関係あり）_

- [x] 2. Remote UIでのタスク進捗取得フック
- [x] 2.1 タスク進捗取得用カスタムフックを作成する
  - specDetailの更新を検知してtasks.mdのexistsフラグを確認
  - 存在する場合はgetArtifactContent APIを呼び出してコンテンツを取得
  - 取得したコンテンツを共通タスク解析関数で処理してtaskProgressを計算
  - 取得中のisLoading状態、エラー状態を管理
  - 存在しない、または取得失敗時はnull状態として処理
  - AbortControllerによる前回リクエストのキャンセル処理
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_
  - _Method: useRemoteTaskProgress_
  - _Verify: Grep "useRemoteTaskProgress" in remote-ui/hooks/useRemoteTaskProgress.ts_

- [x] 3. タスク進捗バーUIコンポーネント
- [x] 3.1 (P) 進捗バーと展開表示コンポーネントを作成する
  - 進捗バー（完了数/総数、パーセンテージ）を表示
  - tasks.mdコンテンツを展開可能なセクションとして表示（useState管理、デフォルト折りたたみ）
  - タスクがない場合は「タスクなし」メッセージを表示
  - 読み込み中の表示状態をサポート
  - Electron版SpecDetail.tsxのタスク進捗セクションのスタイルを踏襲
  - MDEditor.MarkdownでMarkdownコンテンツをレンダリング
  - モバイル/デスクトップ両対応（レスポンシブ）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_
  - _Method: TaskProgressBar_
  - _Verify: Grep "TaskProgressBar" in shared/components/workflow/TaskProgressBar.tsx_

- [x] 4. DesktopLayoutへの統合
- [x] 4.1 DesktopLayout RightSidebarにタスク進捗を統合する
  - useRemoteTaskProgressフックを使用してタスク進捗データを取得
  - WorkflowViewCoreのrenderTaskProgress prop経由でTaskProgressBarを描画
  - specDetail更新時に自動で再取得・表示更新
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3_
  - _Method: renderTaskProgress_
  - _Verify: Grep "TaskProgressBar|renderTaskProgress" in remote-ui/App.tsx_

- [x] 5. MobileLayoutへの統合
- [x] 5.1 MobileSpecWorkflowViewにタスク進捗を統合する
  - useRemoteTaskProgressフックを使用してタスク進捗データを取得
  - TaskProgressBarコンポーネントをワークフロー表示内に配置
  - モバイル画面幅に適したレイアウトで表示
  - specDetail更新時に自動で再取得・表示更新
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3_
  - _Verify: Grep "TaskProgressBar" in remote-ui/views/MobileSpecWorkflowView.tsx_

- [x] 6. テスト
- [x] 6.1 (P) タスク解析関数のユニットテストを作成する
  - 正常入力（複数タスク、一部完了）での進捗計算
  - 全完了、全未完了のケース
  - 空文字列、null、undefined入力でのzero値返却
  - 不正形式（チェックボックスなし）のケース
  - _Requirements: 1.1, 1.2, 1.4_
  - _Verify: Grep "parseTaskProgress" in shared/utils/taskProgressParser.test.ts_

- [x] 6.2 (P) タスク進捗バーコンポーネントのユニットテストを作成する
  - 進捗あり状態の表示（バー、パーセンテージ、完了数/総数）
  - タスクなし状態（null入力）の表示
  - 読み込み中状態の表示
  - 展開/折りたたみ動作
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_
  - _Verify: Grep "TaskProgressBar" in shared/components/workflow/TaskProgressBar.test.tsx_

- [x] 6.3 タスク進捗取得フックの統合テストを作成する
  - specDetail更新後にgetArtifactContentが呼び出されることの検証
  - parseTaskProgressの戻り値がstateに反映されることの検証
  - APIエラー時にnull状態になることの検証
  - existsフラグがfalse→trueに変化した時の自動取得検証
  - モックWebSocketApiClientを使用
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3_
  - _Verify: Grep "useRemoteTaskProgress" in remote-ui/hooks/useRemoteTaskProgress.test.ts_

- [x] 6.4 Remote UI E2Eテストを作成する
  - UJ-001: Spec選択 → tasks.md存在 → 進捗バー表示確認
  - UJ-002: tasks.md展開 → Markdownコンテンツ表示確認
  - UJ-003: tasks.md不存在 → 「タスクなし」メッセージ表示確認
  - UJ-004: tasks.md更新（specDetail更新） → 進捗自動更新確認
  - Playwrightを使用したWeb E2Eテスト
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.3_
  - _Verify: Grep "TaskProgressBar" in e2e-web/remote-ui-task-progress.spec.ts_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | tasks.mdパース（チェックボックス集計） | 1.1, 6.1 | Feature, Test |
| 1.2 | taskProgress形式（total, completed, percentage） | 1.1, 6.1 | Feature, Test |
| 1.3 | 共有モジュール配置 | 1.1, 1.2 | Feature |
| 1.4 | 空/存在しない場合の処理 | 1.1, 6.1 | Feature, Test |
| 2.1 | specDetail更新時のexists確認 | 2.1, 6.3 | Feature, Test |
| 2.2 | getArtifactContent API呼び出し | 2.1, 6.3 | Feature, Test |
| 2.3 | 共有解析ロジック使用 | 2.1, 6.3 | Feature, Test |
| 2.4 | エラー時のフォールバック | 2.1, 6.3 | Feature, Test |
| 3.1 | Desktop進捗バー表示 | 3.1, 4.1, 6.2, 6.4 | Feature, Test, E2E |
| 3.2 | Desktop tasks.md展開表示 | 3.1, 4.1, 6.2, 6.4 | Feature, Test, E2E |
| 3.3 | Desktop「タスクなし」表示 | 3.1, 4.1, 6.2, 6.4 | Feature, Test, E2E |
| 3.4 | Electron版との視覚的一貫性 | 3.1, 4.1 | Feature |
| 4.1 | Mobile進捗バー表示 | 3.1, 5.1, 6.2, 6.4 | Feature, Test, E2E |
| 4.2 | Mobile tasks.md展開表示 | 3.1, 5.1, 6.2, 6.4 | Feature, Test, E2E |
| 4.3 | Mobile「タスクなし」表示 | 3.1, 5.1, 6.2, 6.4 | Feature, Test, E2E |
| 4.4 | Mobileレイアウト対応 | 3.1, 5.1 | Feature |
| 5.1 | WebSocket経由specDetail更新検知 | 2.1, 6.3, 6.4 | Feature, Test, E2E |
| 5.2 | exists false→true時の自動取得 | 2.1, 6.3 | Feature, Test |
| 5.3 | 既存コンテンツの再取得 | 2.1, 4.1, 5.1, 6.3, 6.4 | Feature, Test, E2E |
