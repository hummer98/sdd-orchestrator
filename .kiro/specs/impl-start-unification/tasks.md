# Implementation Plan

## Task 1. startImplPhase 関数の実装

impl 開始ロジックを Main Process の単一関数に集約する。Worktree モード判定、ブランチチェック、Worktree 作成、通常モード初期化、impl 実行までを一元管理する。

- [x] 1.1 (P) startImplPhase 関数のコア実装
  - `StartImplParams` インターフェース（specPath, featureName, commandPrefix）を定義する
  - `ImplStartErrorType` 型と `ImplStartError` インターフェースを定義する
  - `ImplStartResult` 型を Result パターンで定義する
  - spec.json を読み込み worktree.enabled を確認する分岐処理を実装する
  - エラー時は例外を投げず Result 型でエラーを返却する
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Worktree モード処理の実装
  - 1.1 で作成した startImplPhase に Worktree モード分岐を追加
  - worktree.enabled === true かつ worktree.path 未設定の場合、main ブランチ確認を行う
  - main ブランチでない場合は NOT_ON_MAIN_BRANCH エラーを返す
  - main ブランチの場合は既存の handleImplStartWithWorktree を呼び出して Worktree を作成する
  - Worktree 作成後に execute({ type: 'impl' }) を呼び出す
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 1.3 通常モード処理の実装
  - 1.1 で作成した startImplPhase に通常モード分岐を追加
  - worktree.enabled === false または未定義の場合、ブランチチェックをスキップする
  - 既存の handleImplStartNormalMode 相当の処理（branch, created_at 保存）を呼び出す
  - 通常モード初期化後に execute({ type: 'impl' }) を呼び出す
  - 既存 Worktree がある場合（worktree.path が設定済み）は再作成せず impl を実行する
  - _Requirements: 1.1, 2.3_

## Task 2. IPC レイヤーの整備

Renderer から startImplPhase を呼び出すための IPC チャンネルと preload API を追加する。

- [x] 2.1 (P) IPC チャンネルと preload API の追加
  - channels.ts に START_IMPL チャンネル定義を追加する
  - preload/index.ts に startImpl API を追加する（specPath, featureName, commandPrefix を受け取り ImplStartResult を返す）
  - electron.d.ts に startImpl の型定義を追加する
  - _Requirements: 4.2, 4.4_

- [x] 2.2 IPC ハンドラの実装
  - handlers.ts に START_IMPL チャンネルのハンドラを追加する
  - ハンドラ内で startImplPhase を呼び出し、結果を返却する
  - _Requirements: 4.2_

## Task 3. Auto Execution からの統合

execute-next-phase イベントハンドラを修正し、impl フェーズ時に startImplPhase を呼び出すようにする。

- [x] 3.1 execute-next-phase ハンドラの impl 分岐追加
  - phase === 'impl' の場合に startImplPhase を呼び出す分岐を追加する
  - 成功時は result.value.agentId で coordinator.setCurrentPhase を呼び出す
  - 成功時は agent completion listener を既存パターンで設定する
  - エラー時は coordinator.handleAgentCompleted(failed) で Auto Execution を停止する
  - impl 以外のフェーズは既存の execute() 呼び出しを維持する
  - _Requirements: 3.1, 3.2, 3.3_

## Task 4. Renderer の Thin Client 化

WorkflowView.tsx の handleImplExecute を IPC 呼び出しのみに簡略化し、重複ロジックを削除する。

- [x] 4.1 handleImplExecute の簡略化
  - Worktree チェック・作成ロジック（worktreeCheckMain, worktreeImplStart 呼び出し）を削除する
  - normalModeImplStart 呼び出しを削除する
  - 代わりに window.electronAPI.startImpl IPC を呼び出すのみにする
  - 既存の wrapExecution による Optimistic UI パターンを維持する
  - IPC エラー時は result.error.type に応じた適切なメッセージで notify.error() を表示する
  - NOT_ON_MAIN_BRANCH エラーの場合は currentBranch を含むメッセージを表示する
  - _Requirements: 4.1, 4.3, 5.1, 5.2_

## Task 5. テストの更新

既存テストを修正し、新しい IPC 経由の impl 開始処理に対応させる。

- [x] 5.1 startImplPhase ユニットテストの作成
  - Worktree モード + main ブランチで成功するケースをテストする
  - Worktree モード + 非 main ブランチで NOT_ON_MAIN_BRANCH エラーを返すケースをテストする
  - 通常モードで branch/created_at 保存後に成功するケースをテストする
  - 既存 Worktree（worktree.path 設定済み）で再作成なしで成功するケースをテストする
  - _Requirements: 2.1, 2.2, 2.3, 5.3_

- [x] 5.2 WorkflowView.test.tsx の修正
  - handleImplExecute が startImpl IPC を呼び出すことを確認するテストを追加する
  - IPC エラー時に notify.error が呼ばれることを確認するテストを追加する
  - 既存の Worktree 関連テストを削除または修正する
  - _Requirements: 4.1, 4.3, 5.3_

- [x]* 5.3 統合テストの追加
  - execute-next-phase(impl) で startImplPhase が呼び出されることを確認する
  - 手動実行と Auto Execution で同一の結果が得られることを確認する
  - _Requirements: 3.1, 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | startImplPhase() が worktree.enabled に応じて分岐 | 1.1, 1.2, 1.3 | Feature |
| 1.2 | startImplPhase() パラメータ定義 | 1.1 | Feature |
| 1.3 | startImplPhase() 戻り値型定義 | 1.1 | Feature |
| 2.1 | Worktree モード + 非 main ブランチでエラー | 1.2, 5.1 | Feature |
| 2.2 | Worktree モード + main ブランチで作成・実行 | 1.2, 5.1 | Feature |
| 2.3 | Worktree 無効時はブランチチェックスキップ | 1.3, 5.1 | Feature |
| 3.1 | execute-next-phase で startImplPhase 呼び出し | 3.1, 5.3 | Feature |
| 3.2 | エラー時に coordinator.handleAgentCompleted(failed) | 3.1 | Feature |
| 3.3 | 成功時に coordinator.setCurrentPhase | 3.1 | Feature |
| 4.1 | handleImplExecute が startImpl IPC のみ呼び出し | 4.1, 5.2 | Feature |
| 4.2 | startImpl IPC パラメータ定義 | 2.1, 2.2 | Feature |
| 4.3 | IPC エラー時に notify.error() | 4.1, 5.2 | Feature |
| 4.4 | preload.ts に startImpl API 追加 | 2.1 | Feature |
| 5.1 | handleImplExecute から Worktree ロジック削除 | 4.1 | Feature |
| 5.2 | handleImplExecute から normalModeImplStart 削除 | 4.1 | Feature |
| 5.3 | 既存テストの修正・パス | 5.1, 5.2, 5.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
