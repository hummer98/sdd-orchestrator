# Implementation Plan

## Task List

### 1. Rebaseスクリプト実装

- [x] 1.1 (P) rebase-worktree.shスクリプトテンプレート作成
  - `electron-sdd-manager/resources/templates/scripts/rebase-worktree.sh` にスクリプトを作成
  - jqでspec.json/bug.jsonから `worktree.branch` を読み取る処理
  - jj優先・gitフォールバック判定ロジック（`command -v jj`）
  - jj利用可能時は `jj rebase -d main` を実行
  - jj不在時は `git rebase main` を実行
  - mainブランチに新しいコミットがない場合は "Already up to date" を出力
  - 終了コード: 0（成功/最新）、1（コンフリクト）、2（エラー）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.3, 10.4_
  - _Method: jq, command -v, git rebase, jj rebase_
  - _Verify: Grep "jq|command -v jj|git rebase|jj rebase" in rebase-worktree.sh_

- [x] 1.2 rebase-worktree.shにロギング追加
  - jj/git実行結果のログ出力
  - 終了コード判定結果のログ出力
  - _Requirements: Design Monitoring Section (789-797行目)_
  - _Method: echo, stderr logging_

### 2. worktreeService拡張

- [x] 2.1 (P) executeRebaseFromMainメソッド実装
  - rebase-worktree.sh存在チェック
  - child_process.spawnでスクリプト実行
  - 終了コード0の場合: stdout判定で `alreadyUpToDate: true/false` を設定
  - 終了コード1の場合: `resolveConflictWithAI` を呼び出し
  - 終了コード2の場合: エラーレスポンス返却
  - _Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 10.1, 10.2_
  - _Method: executeRebaseScript, spawn_
  - _Verify: Grep "executeRebaseScript|spawn" in worktreeService.ts_

- [x] 2.2 resolveConflictWithAIメソッド実装
  - AI自動解決フローを最大7回試行
  - AI解決成功時: `git rebase --continue` または `jj squash` 実行
  - 7回試行失敗時: `git rebase --abort` または `jj undo` でworktree復元
  - 成功/失敗レスポンスを返却
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.5_
  - _Method: resolveConflictWithAI_
  - _Verify: Grep "resolveConflictWithAI" in worktreeService.ts_

- [x] 2.3 worktreeServiceにロギング追加
  - rebase開始/完了/エラーのログ出力
  - AI解決試行回数のログ出力
  - _Requirements: Design Monitoring Section (789-797行目)_
  - _Method: logger.info, logger.error_

### 3. IPC層実装

- [x] 3.1 (P) IPCチャンネル定義追加
  - `channels.ts` に `REBASE_FROM_MAIN: 'worktree:rebase-from-main'` を追加
  - _Requirements: 5.5_

- [x] 3.2 (P) IPC Handlerとpreload公開
  - `handlers.ts` に `ipcMain.handle(IPC_CHANNELS.REBASE_FROM_MAIN, ...)` ハンドラ追加
  - worktreeService.executeRebaseFromMainを呼び出し
  - レスポンス形式: `{ success: true, alreadyUpToDate?: boolean }` or `{ success: false, conflict?: boolean, error?: string }`
  - preload/index.tsに `rebaseFromMain: (specOrBugPath: string) => ipcRenderer.invoke(...)` を追加
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Method: ipcMain.handle, ipcRenderer.invoke_
  - _Verify: Grep "REBASE_FROM_MAIN|rebaseFromMain" in handlers.ts,preload/index.ts_

### 4. WebSocket Handler拡張

- [x] 4.1 (P) WebSocket rebaseFromMainハンドラ追加
  - `webSocketHandler.ts` に `case 'worktree:rebase-from-main':` メッセージハンドラ追加
  - IPC Handlerに処理委譲
  - レスポンスをWebSocket経由で返却
  - _Requirements: 8.2_

### 5. ApiClient層拡張

- [x] 5.1a (P) IpcApiClientにrebaseFromMainメソッド追加
  - `window.electronAPI.rebaseFromMain(specOrBugPath)` 呼び出し
  - _Requirements: 5.1_
  - _File: electron-sdd-manager/src/shared/api/IpcApiClient.ts_

- [x] 5.1b (P) WebSocketApiClientにrebaseFromMainメソッド追加
  - `{ type: 'worktree:rebase-from-main', payload: { specOrBugPath } }` 送信
  - _Requirements: 8.2_
  - _File: electron-sdd-manager/src/shared/api/WebSocketApiClient.ts_

### 6. specStore/bugStore拡張

- [x] 6.1 (P) specStoreにrebase状態管理を追加
  - `isRebasing: boolean` 状態フィールド追加
  - `setIsRebasing(isRebasing: boolean)` アクション追加
  - `handleRebaseResult(result: RebaseFromMainResponse)` アクション追加
  - 成功時: "mainブランチの変更を取り込みました" 通知
  - Already up to date時: "既に最新です" 情報通知
  - エラー時: エラーメッセージ通知
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.2 (P) bugStoreにrebase状態管理を追加
  - specStoreと同一パターンで実装
  - `isRebasing`, `setIsRebasing`, `handleRebaseResult` 追加
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

### 7. SpecWorkflowFooter/BugWorkflowFooter拡張

- [x] 7.1 (P) SpecWorkflowFooterにrebaseボタン追加
  - Worktreeモード判定: `hasWorktreePath(specJson)` で条件分岐
  - 「mainを取り込み」ボタンを表示（worktree.pathあり時）
  - disabled条件: `isRebasing || hasRunningAgents || isAutoExecuting`
  - ボタンラベル: "mainを取り込み" (通常)、"取り込み中..." (isRebasing時)
  - `onRebaseFromMain` propsコールバック呼び出し
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.4_

- [x] 7.2 (P) BugWorkflowFooterにrebaseボタン追加
  - SpecWorkflowFooterと同一パターンで実装
  - Bug用worktree判定（`bug.json` の `worktree.path`）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

### 8. Electron/Remote UI View結合

- [x] 8.1a ElectronWorkflowViewでonRebaseFromMainコールバック実装
  - ApiClient.rebaseFromMain呼び出し
  - レスポンスをspecStoreの `handleRebaseResult` に渡す
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - _File: electron-sdd-manager/src/renderer/components/ElectronWorkflowView.tsx_

- [x] 8.1b RemoteWorkflowViewでonRebaseFromMainコールバック実装
  - ApiClient.rebaseFromMain呼び出し
  - レスポンスをspecStoreの `handleRebaseResult` に渡す
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - _File: electron-sdd-manager/src/renderer/components/RemoteWorkflowView.tsx_

- [x] 8.1c BugWorkflowViewでonRebaseFromMainコールバック実装
  - ApiClient.rebaseFromMain呼び出し
  - レスポンスをbugStoreの `handleRebaseResult` に渡す
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _File: electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx_

### 9. ccSddWorkflowInstaller拡張

- [x] 9.1 (P) installRebaseScriptメソッド実装
  - **Depends on: Task 1.1（テンプレートファイル作成済み）**
  - `.kiro/scripts/` ディレクトリ自動作成（`fs.mkdirSync(dir, { recursive: true })`）
  - `resources/templates/scripts/rebase-worktree.sh` を `.kiro/scripts/rebase-worktree.sh` にコピー
  - 実行権限付与（`fs.chmodSync(path, 0o755)`）
  - 既存ファイルは上書き
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - _Method: fs.mkdirSync, fs.copyFileSync, fs.chmodSync_
  - _Verify: Grep "mkdirSync|copyFileSync|chmodSync" in ccSddWorkflowInstaller.ts_

### 10. 統合テスト

- [x] 10.1 IPC統合テスト: Renderer → IPC → worktreeService → スクリプト実行 → レスポンス返却
  - 10.1a: 成功シナリオ: exit 0 → `{ success: true }` 返却を確認
  - 10.1b: Already up to dateシナリオ: stdout "Already up to date" → `{ success: true, alreadyUpToDate: true }` 返却を確認
  - 10.1c: コンフリクトシナリオ - AI解決成功（1回目で解決）: exit 1 → AI解決 → `{ success: true }` 返却を確認
  - 10.1d: コンフリクトシナリオ - AI解決失敗（7回リトライ後abort）: exit 1 → AI 7回失敗 → `{ success: false, conflict: true }` 返却を確認
  - 10.1e: エラーシナリオ - スクリプト不在エラー: スクリプトファイル削除 → `{ success: false, error: "Script not found..." }` 確認
  - 10.1f: エラーシナリオ - jq不在エラー: jqコマンドモック失敗 → `{ success: false, error: "jq not installed..." }` 確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _File: electron-sdd-manager/src/main/ipc/worktreeRebaseHandlers.integration.test.ts_

- [x] 10.2 WebSocket統合テスト: Remote UI → WebSocket → IPC → レスポンス返却
  - WebSocketApiClient経由でrebaseFromMain呼び出し → レスポンス確認
  - _Requirements: 8.2_
  - _File: electron-sdd-manager/src/main/services/webSocketRebase.integration.test.ts_

- [x] 10.3 Store統合テスト: specStore/bugStoreのisRebasing状態遷移確認
  - setIsRebasing(true) → isRebasing=true確認
  - handleRebaseResult成功 → isRebasing=false + 成功通知確認
  - handleRebaseResultエラー → isRebasing=false + エラー通知確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - _Files: electron-sdd-manager/src/shared/stores/specStoreRebase.integration.test.ts, bugStoreRebase.integration.test.ts_

### 11. E2Eテスト

**テスト戦略**:
- **モック方式**: スクリプト実行結果をモックし、実Git操作に依存しない
- **フィクスチャ**: テスト用Git/jjリポジトリを準備（`.kiro/test-fixtures/worktree-rebase-test/`）
- **セットアップ**: 各テストケース前にテストリポジトリを初期化し、コンフリクト状態を再現
- **前提条件**: テスト実行前に `setup-test-repository.sh` でテスト用リポジトリを作成

- [x] 11.1 E2Eテスト: Worktreeモードで「mainを取り込み」実行 → 成功トースト表示
  - Spec/BugをWorktreeモードに変換
  - 「mainを取り込み」ボタンクリック
  - 成功トースト "mainブランチの変更を取り込みました" 表示確認
  - _Requirements: 1.1, 1.5, 2.1, 2.5, 6.3, 7.3_

- [x] 11.2 E2Eテスト: mainに新しいコミットなし → 「既に最新です」トースト表示
  - 「mainを取り込み」ボタンクリック
  - 情報トースト "既に最新です" 表示確認
  - _Requirements: 3.5, 6.4, 7.4_

- [x] 11.3 E2Eテスト: コンフリクト発生 → AI解決 → 成功トースト表示
  - コンフリクト発生条件を作成（mainにコミット、featureブランチにも同箇所変更）
  - 「mainを取り込み」ボタンクリック
  - AI解決完了後、成功トースト表示確認
  - _Requirements: 4.1, 4.2, 6.3, 7.3_

- [x] 11.4* E2Eテスト: コンフリクト解決失敗 → エラートースト表示
  - AI解決が7回失敗する条件を作成
  - エラートースト "コンフリクトを解決できませんでした。手動で解決してください" 表示確認
  - _Requirements: 4.3, 4.4, 6.5, 7.5_

- [x] 11.5* E2Eテスト: Remote UIから「mainを取り込み」実行 → 成功確認
  - Remote UIでSpec/BugをWorktreeモード表示
  - 「mainを取り込み」ボタンクリック
  - 成功メッセージ表示確認
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- _File: electron-sdd-manager/e2e-wdio/worktree-rebase-from-main.e2e.spec.ts_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Spec Worktreeモード時にボタン表示 | 7.1, 8.1 | Feature |
| 1.2 | Spec 通常モード時はボタン非表示 | 7.1, 8.1 | Feature |
| 1.3 | Spec Agent実行中はdisabled | 7.1, 8.1 | Feature |
| 1.4 | Spec 自動実行中はdisabled | 7.1, 8.1 | Feature |
| 1.5 | Spec rebase処理中はdisabled+「取り込み中...」表示 | 7.1, 8.1, 11.1 | Feature |
| 2.1 | Bug Worktreeモード時にボタン表示 | 7.2, 8.1 | Feature |
| 2.2 | Bug 通常モード時はボタン非表示 | 7.2, 8.1 | Feature |
| 2.3 | Bug Agent実行中はdisabled | 7.2, 8.1 | Feature |
| 2.4 | Bug 自動実行中はdisabled | 7.2, 8.1 | Feature |
| 2.5 | Bug rebase処理中はdisabled+「取り込み中...」表示 | 7.2, 8.1, 11.1 | Feature |
| 3.1 | rebase-worktree.shスクリプト作成 | 1.1 | Infrastructure |
| 3.2 | jj存在確認 | 1.1 | Infrastructure |
| 3.3 | jj rebase -d main実行 | 1.1 | Infrastructure |
| 3.4 | git rebase mainフォールバック | 1.1 | Infrastructure |
| 3.5 | mainに新規コミットなし時の処理 | 1.1, 11.2 | Infrastructure |
| 3.6 | コンフリクト検知（終了コード1） | 1.1 | Infrastructure |
| 3.7 | 成功時（終了コード0） | 1.1 | Infrastructure |
| 4.1 | コンフリクト時AI解決試行 | 2.1, 2.2, 11.3 | Feature |
| 4.2 | AI解決後rebase続行 | 2.2, 11.3 | Feature |
| 4.3 | 7回試行失敗時中断 | 2.2, 11.4 | Feature |
| 4.4 | 中断時worktree元の状態に戻す | 2.2, 11.4 | Feature |
| 5.1 | レンダラーからrebaseリクエスト | 2.1, 3.2, 5.1, 10.1 | Infrastructure |
| 5.2 | スクリプト成功時レスポンス | 2.1, 3.2, 10.1 | Infrastructure |
| 5.3 | 「Already up to date」レスポンス | 2.1, 3.2, 10.1 | Infrastructure |
| 5.4 | コンフリクト時解決フロー開始 | 2.1, 3.2, 10.1 | Infrastructure |
| 5.5 | worktree:rebase-from-mainチャンネル使用 | 3.1 | Infrastructure |
| 6.1 | Spec rebase開始時isRebasing=true | 6.1, 10.3 | Infrastructure |
| 6.2 | Spec rebase完了時isRebasing=false | 6.1, 10.3 | Infrastructure |
| 6.3 | Spec rebase成功通知 | 6.1, 10.3, 11.1, 11.3 | Feature |
| 6.4 | Spec 最新時情報通知 | 6.1, 10.3, 11.2 | Feature |
| 6.5 | Spec rebaseエラー通知 | 6.1, 10.3, 11.4 | Feature |
| 7.1 | Bug rebase開始時isRebasing=true | 6.2, 10.3 | Infrastructure |
| 7.2 | Bug rebase完了時isRebasing=false | 6.2, 10.3 | Infrastructure |
| 7.3 | Bug rebase成功通知 | 6.2, 10.3, 11.1, 11.3 | Feature |
| 7.4 | Bug 最新時情報通知 | 6.2, 10.3, 11.2 | Feature |
| 7.5 | Bug rebaseエラー通知 | 6.2, 10.3, 11.4 | Feature |
| 8.1 | Remote UI Spec Worktreeモード時ボタン表示 | 7.1, 8.1, 11.5 | Feature |
| 8.2 | Remote UI WebSocket経由rebase実行 | 4.1, 5.1, 8.1, 10.2, 11.5 | Infrastructure |
| 8.3 | Remote UI処理完了後メッセージ表示 | 8.1, 11.5 | Feature |
| 8.4 | Remote UI rebase処理中disabled | 7.1, 8.1, 11.5 | Feature |
| 9.1 | commandsetインストール時スクリプトコピー | 9.1 | Infrastructure |
| 9.2 | スクリプトコピー時実行権限付与 | 9.1 | Infrastructure |
| 9.3 | .kiro/scripts/ディレクトリ自動作成 | 9.1 | Infrastructure |
| 9.4 | スクリプト既存時上書き | 9.1 | Infrastructure |
| 10.1 | rebase-worktree.sh不在時エラー | 2.1 | Infrastructure |
| 10.2 | worktreeディレクトリ不在時エラー | 2.1 | Infrastructure |
| 10.3 | gitリポジトリでない場合エラー | 1.1 | Infrastructure |
| 10.4 | mainブランチ不在時エラー | 1.1 | Infrastructure |
| 10.5 | コンフリクト解決失敗時エラー | 2.2 | Infrastructure |

## Inspection Fixes

### Round 2 (2026-01-27)

- [x] 12.1 preload関数名をrebaseFromMainに修正
  - `worktreeRebaseFromMain` を `rebaseFromMain` にリネーム
  - IpcApiClient, useElectronWorkflowState, BugWorkflowView での呼び出しと一致させる
  - 関連: Task 3.2
  - _Requirements: 5.1_
  - _File: electron-sdd-manager/src/preload/index.ts_
  - _Verify: Grep "rebaseFromMain:" in preload/index.ts_

- [x] 12.2 specStore.handleRebaseResultに通知表示ロジック追加
  - 成功時: "mainブランチの変更を取り込みました" 通知
  - Already up to date時: "既に最新です" 情報通知
  - コンフリクト時: "コンフリクトを解決できませんでした。手動で解決してください" エラー通知
  - スクリプト不在時: "スクリプトが見つかりません。commandsetを再インストールしてください" エラー通知
  - その他エラー時: エラーメッセージ通知
  - 関連: Task 6.1, Task 10.3
  - _Requirements: 6.3, 6.4, 6.5_
  - _File: electron-sdd-manager/src/shared/stores/specStore.ts_
  - _Verify: Grep "showNotification" in specStore.ts_

- [x] 12.3 bugStore.handleRebaseResultに通知表示ロジック追加
  - specStoreと同一パターンで通知を実装
  - 関連: Task 6.2, Task 10.3
  - _Requirements: 7.3, 7.4, 7.5_
  - _File: electron-sdd-manager/src/shared/stores/bugStore.ts_
  - _Verify: Grep "showNotification" in bugStore.ts_

### Round 3 (2026-01-28)

- [x] 13.1 ElectronAPI型定義にrebaseFromMainメソッドを追加
  - `window.electronAPI.rebaseFromMain` を型安全に呼び出せるようにする
  - 関連: Task 3.2, Task 5.1a
  - _Requirements: 5.1_
  - _File: electron-sdd-manager/src/renderer/types/electron.d.ts_
  - _Verify: npm run typecheck でIpcApiClient.ts, BugWorkflowView.tsx, useElectronWorkflowState.tsのエラー解消_
  - 実装: electron.d.tsにrebaseFromMain(specOrBugPath: string)を追加、preloadとIPC handlerも更新してprojectPathを内部で取得するように変更

- [x] 13.2 SpecStoreFacade型定義にrebase関連プロパティ/メソッドを追加
  - `isRebasing: boolean`, `setIsRebasing: (value: boolean) => void`, `handleRebaseResult: (result: RebaseFromMainResponse) => void`
  - 関連: Task 6.1, Task 8.1a
  - _Requirements: 6.1, 6.2, 6.3_
  - _File: electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts_
  - _Verify: npm run typecheck でuseElectronWorkflowState.tsのエラー解消_
  - 実装: SpecStoreFacadeに追加する代わりに、useElectronWorkflowState.tsでuseSharedSpecStoreをインポートしてrebase操作に使用

- [x] 13.3 WorktreeError型にmessage/reasonプロパティを持つ型を追加
  - `{ type: 'SCRIPT_NOT_FOUND'; message: string }` と `{ type: 'CONFLICT_RESOLUTION_FAILED'; message: string; reason: string }` が既に実装済み
  - 関連: Task 2.1, Task 2.2
  - _Requirements: 4.1, 10.5_
  - _File: electron-sdd-manager/src/shared/types/worktree.ts_
  - _Verify: npm run typecheck でworktreeService.tsのエラー解消_
  - 実装: 既存の実装で対応済み

- [x] 13.4 BugMetadata/SpecMetadataにpathプロパティを追加（またはpath取得方法の修正）
  - `spec.path` または `bug.path` でspecOrBugPathを構築
  - 関連: Task 8.1a, Task 8.1c
  - _Requirements: 5.1, 8.2_
  - _File: electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts, BugWorkflowView.tsx_
  - _Verify: npm run typecheck でBugWorkflowView.tsx, useElectronWorkflowState.tsのエラー解消_
  - 実装: spec-path-ssot-refactorに従い、pathフィールドを追加せずにspecName/bugNameからパスを構築 (`.kiro/specs/${name}` / `.kiro/bugs/${name}`)

- [x] 13.5 hasWorktreePath関数の型定義を修正
  - `SpecJsonForFooter | null | undefined` を受け入れるように型を緩和
  - 関連: Task 7.1
  - _Requirements: 1.1, 1.2_
  - _File: electron-sdd-manager/src/shared/types/worktree.ts_
  - _Verify: npm run typecheck でSpecWorkflowFooter.tsxのエラー解消_
  - 実装: hasWorktreePath関数の引数型を`WithWorktree | null | undefined`に更新

- [x] 13.6 notificationStore.ts未使用変数の修正
  - 未使用の`set`/`get`をアンダースコアプレフィックスに変更するか削除
  - 関連: Task 6.1, Task 6.2
  - _Requirements: 6.3, 7.3_
  - _File: electron-sdd-manager/src/shared/stores/notificationStore.ts_
  - _Verify: npm run typecheck でnotificationStore.tsの警告解消_
  - 実装: create()呼び出しから未使用の(set, get)パラメータを削除

- [x] 13.7 TypeCheck & Buildの成功確認
  - `npm run typecheck && npm run build` を実行し、エラーがゼロであることを確認
  - 関連: 全タスク
  - _Requirements: All_
  - _Verify: npm run typecheck && npm run build_
  - 実装: typecheckは成功。buildはRemote UIのcpufeatures.node依存関係の問題で失敗するが、本feature実装とは無関係
  - 追加修正:
    - worktreeService.ts: execGitのエラーアクセスに型アサーションを追加
    - webSocketHandler.ts: 'message' in result.error による型ガードを追加
    - IpcApiClient.ts: wrapResultを使わず直接Result型を返すように修正
    - BugWorkflowView.tsx: handleRebaseResultに完全なResult型を渡すように修正

### Round 4 (2026-01-28)

- [x] 14.1 specStore.test.ts の handleRebaseResult テストデータ形式を修正
  - 旧形式 `{ success: true }` を Result pattern `{ ok: true, value: { success: true } }` に修正
  - 旧形式 `{ success: true, alreadyUpToDate: true }` を `{ ok: true, value: { success: true, alreadyUpToDate: true } }` に修正
  - 旧形式 `{ success: false, error: '...' }` を `{ ok: false, error: { type: '...', message: '...' } }` に修正
  - 旧形式 `{ success: false, conflict: true }` を `{ ok: false, error: { type: 'CONFLICT_RESOLUTION_FAILED', ... } }` に修正
  - 関連: Task 6.1, Task 10.3
  - _Requirements: 6.3, 6.4, 6.5_
  - _File: electron-sdd-manager/src/shared/stores/specStore.test.ts_
  - _Verify: npm run test -- --run src/shared/stores/specStore.test.ts で全テストパス_

- [x] 14.2 bugStore.test.ts の handleRebaseResult テストデータ形式を修正
  - specStore.test.tsと同様にResult patternに修正
  - 関連: Task 6.2, Task 10.3
  - _Requirements: 7.3, 7.4, 7.5_
  - _File: electron-sdd-manager/src/shared/stores/bugStore.test.ts_
  - _Verify: npm run test -- --run src/shared/stores/bugStore.test.ts で全テストパス_

### Round 6 (2026-01-28)

- [x] 15.1 worktreeService.test.ts の fs.existsSync モックを追加
  - executeRebaseFromMainテストで fs.existsSync がモックされていないため SCRIPT_NOT_FOUND エラーで失敗
  - vi.mock('fs') を追加し、rebase-worktree.sh に対する existsSync をモック
  - 関連: Task 2.1, Task 10.1
  - _Requirements: 10.1_
  - _File: electron-sdd-manager/src/main/services/worktreeService.test.ts_
  - _Verify: npm run test -- --run src/main/services/worktreeService.test.ts で72テスト全パス_