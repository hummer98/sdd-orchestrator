# Implementation Plan: Bug Create Dialog Unification

## Tasks

### Renderer層 UI変更

- [x] 1. CreateBugDialogのUI統一
- [x] 1.1 (P) ダイアログサイズとテキストエリアの拡張
  - ダイアログ幅を `max-w-md` から `max-w-xl` に変更
  - テキストエリアの行数を4行から5行に変更
  - _Requirements: 1.1, 1.2_

- [x] 1.2 (P) Worktreeモードスイッチの追加
  - `worktreeMode` 状態（useState）を追加
  - GitBranchアイコン付きのトグルスイッチUIを追加
  - スイッチON時の紫色ハイライト表示を実装
  - スイッチON時の説明文「ブランチとWorktreeを作成し、分離された環境で開発を行います。mainブランチで実行する必要があります。」を表示
  - `data-testid="worktree-mode-switch"` を付与
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.3 ボタンデザインの変更（1.2に依存）
  - ボタンアイコンを `Plus` から `AgentIcon`/`AgentBranchIcon` に変更
  - Worktreeモード OFF: `AgentIcon` + `bg-blue-500 hover:bg-blue-600`
  - Worktreeモード ON: `AgentBranchIcon` + `bg-violet-500 hover:bg-violet-600`
  - ボタンラベル「作成」は維持
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 1.4 executeBugCreate呼び出しの修正（1.2に依存）
  - `executeBugCreate` 呼び出し時に `worktreeMode` を第3引数として渡す
  - _Requirements: 5.1_

### 型定義の更新

- [x] 2. 型定義の更新
- [x] 2.1 (P) electron.d.tsの型定義更新
  - `executeBugCreate` のシグネチャに `worktreeMode?: boolean` パラメータを追加
  - _Requirements: 5.4_

### Preload層 IPC変更

- [x] 3. preload/index.tsのシグネチャ変更
- [x] 3.1 (P) executeBugCreateにworktreeModeパラメータ追加
  - `executeBugCreate` 関数に第3引数 `worktreeMode?: boolean` を追加
  - IPC invoke呼び出し時に `worktreeMode` を渡す
  - 後方互換性のためオプショナルパラメータとして実装
  - _Requirements: 5.1, 5.2_

### Main層 ハンドラ変更

- [x] 4. handlers.tsのEXECUTE_BUG_CREATEハンドラ拡張
- [x] 4.1 (P) worktreeModeパラメータの受け取り
  - IPCハンドラのシグネチャに `worktreeMode?: boolean` を追加
  - _Requirements: 5.3_

- [x] 4.2 Worktreeモード時の処理実装（4.1に依存）
  - `worktreeMode` が true の場合の処理分岐を追加
  - mainまたはmasterブランチであることを確認（worktreeService.checkMain使用）
  - エラー時は適切なエラーメッセージを返す
  - _Requirements: 4.2_

- [x] 4.3 Worktree作成ロジックの実装（4.2に依存）
  - `worktreeService.createBugWorktree` を呼び出してWorktreeを作成
  - 作成失敗時はブランチをロールバック
  - _Requirements: 4.3, 4.5_

- [x] 4.4 bug.jsonへのworktreeフィールド書き込み（4.3に依存）
  - Worktree作成成功後、bug.jsonに `worktree` フィールドを追加
  - `enabled: true`, `path`, `branch`, `created_at` を設定
  - _Requirements: 4.4_

- [x] 4.5 コマンド引数への--worktreeフラグ追加（4.4に依存）
  - `startAgent` 呼び出し時に `--worktree` フラグを追加
  - _Requirements: 4.1_

### テストの追加

- [x] 5. CreateBugDialog.test.tsxのテスト追加
- [x] 5.1 Worktreeモードスイッチのテスト追加（1.2に依存）
  - `data-testid="worktree-mode-switch"` の存在確認テスト
  - スイッチのトグル動作確認テスト
  - Worktreeモード時の紫色ハイライト表示確認テスト
  - Worktreeモード時の説明文表示確認テスト
  - _Requirements: 6.1_

- [x] 5.2 ボタンスタイルとIPC呼び出しのテスト追加（1.3, 1.4に依存）
  - Worktreeモード OFF時のAgentIconと青色ボタン確認テスト
  - Worktreeモード ON時のAgentBranchIconと紫色ボタン確認テスト
  - `executeBugCreate` 呼び出し時に `worktreeMode` が渡されることを確認するテスト
  - _Requirements: 6.1, 6.2_

---

## Inspection Fixes

### Round 2 (2026-01-22)

- [x] 6.1 GitBranchアイコンをWorktreeモードスイッチに追加
  - 関連: Task 1.2, Requirement 2.1
  - CreateBugDialog.tsxに`GitBranch`をlucide-reactからインポート
  - WorktreeモードスイッチUIの左側にGitBranchアイコンを配置
  - スイッチコンテナを背景色付き(`p-3 rounded-md bg-gray-50 dark:bg-gray-800`)に変更
  - アイコンの色をモードに応じて変更（OFF: text-gray-400, ON: text-violet-500）
  - CreateSpecDialog.tsx（152-185行目）の実装を参照
  - _Method: GitBranch import from lucide-react, clsx for conditional classes_
  - _Verify: Grep "GitBranch" in CreateBugDialog.tsx_
  - _Requirements: 2.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ダイアログ幅を`max-w-xl`に変更 | 1.1 | Feature |
| 1.2 | テキストエリア行数を5行に変更 | 1.1 | Feature |
| 2.1 | Worktreeモードスイッチ追加 | 1.2 | Feature |
| 2.2 | スイッチON時紫色ハイライト | 1.2 | Feature |
| 2.3 | スイッチON時説明文表示 | 1.2 | Feature |
| 2.4 | data-testid属性付与 | 1.2 | Feature |
| 3.1 | ボタンアイコン変更 | 1.3 | Feature |
| 3.2 | ボタン色モード切替 | 1.3 | Feature |
| 3.3 | ボタンラベル「作成」維持 | 1.3 | Feature |
| 4.1 | bug-createコマンドが--worktreeフラグ受付 | 4.5 | Feature |
| 4.2 | mainブランチ確認 | 4.2 | Feature |
| 4.3 | Worktree作成処理 | 4.3 | Feature |
| 4.4 | bug.jsonにworktreeフィールド追加 | 4.4 | Feature |
| 4.5 | Worktree作成失敗時ロールバック | 4.3 | Feature |
| 5.1 | executeBugCreateシグネチャにworktreeMode追加 | 1.4, 3.1 | Feature |
| 5.2 | preloadでworktreeModeをIPCに渡す | 3.1 | Feature |
| 5.3 | handlers.tsでworktreeMode処理 | 4.1, 4.2, 4.3, 4.4, 4.5 | Feature |
| 5.4 | electron.d.ts型定義更新 | 2.1 | Infrastructure |
| 6.1 | Worktreeモードスイッチテスト | 5.1, 5.2 | Feature |
| 6.2 | worktreeModeパラメータテスト | 5.2 | Feature |
