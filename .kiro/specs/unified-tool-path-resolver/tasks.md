# Implementation Plan

## Task Format Template

Major + Sub-task structure is used to organize tasks by functional area.

---

## Tasks

- [x] 1. ToolPathResolverService の実装
- [x] 1.1 (P) ToolDefinition 型と定数配列の定義
  - ツール定義の型インターフェースを作成する
  - `claude`, `jj`, `jq` の3つのツール定義を含む定数配列を作成する
  - 各ツールに `name`, `required`, `versionCommand`, `installGuidance` を設定する
  - _Requirements: 1.2, 5.1, 5.2, 5.3_
  - _Method: ToolDefinition, TOOL_DEFINITIONS_
  - _Verify: Grep "TOOL_DEFINITIONS" in toolPathResolverService.ts_

- [x] 1.2 (P) ToolResolutionResult 型と ToolStatus 型の定義
  - 解決結果の型インターフェースを作成する
  - `resolved`, `path`, `version`, `error` フィールドを含める
  - ToolStatus 型で定義と解決結果を統合する
  - _Requirements: 6.1, 6.2_
  - _Method: ToolResolutionResult, ToolStatus_
  - _Verify: Grep "ToolResolutionResult|ToolStatus" in toolPathResolverService.ts_

- [x] 1.3 単一ツールのパス解決ロジックを実装する
  - ログインシェル経由でツールパスを解決する（`$SHELL -il -c 'which {tool}'`）
  - シェル未設定時は `/bin/sh` にフォールバックする
  - タイムアウト5秒を設定する
  - E2E環境変数（`E2E_MOCK_{TOOL}_COMMAND`）が設定されている場合はその値を優先する
  - 依存性注入用の `ExecDeps` インターフェースを使用してテスト容易性を確保する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.2_
  - _Method: resolveTool, ExecDeps_
  - _Verify: Grep "SHELL.*-il.*which|E2E_MOCK" in toolPathResolverService.ts_

- [x] 1.4 セッションキャッシュの実装
  - `Map<string, ToolResolutionResult>` でキャッシュを管理する
  - 一度解決した結果はセッション終了まで保持する
  - 成功/失敗の両方の状態をキャッシュに含める
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: resolvedCache_
  - _Verify: Grep "resolvedCache|Map<string" in toolPathResolverService.ts_

- [x] 1.5 全ツール並列解決と公開APIの実装
  - `resolveAll()` で全登録ツールを `Promise.all()` で並列解決する
  - `getPath(toolName)` でキャッシュからパスを取得する
  - `getDefinition(toolName)` でツール定義を取得する
  - `getStatus(toolName)` で定義と解決結果の組み合わせを取得する
  - `getAllStatuses()` で全ツール状態を取得する
  - `isResolved(toolName)` で解決成功を確認する
  - _Requirements: 1.1, 4.1, 4.2, 4.3_
  - _Method: resolveAll, getPath, getDefinition, getStatus, getAllStatuses, isResolved_
  - _Verify: Grep "resolveAll|Promise\\.all" in toolPathResolverService.ts_

- [x] 2. ユニットテストの実装
- [x] 2.1 (P) ToolPathResolverService のユニットテスト
  - 正常解決、タイムアウト、未検出ケースをテストする
  - E2Eモック環境変数優先のテストを行う
  - 並列解決と部分失敗のケースをテストする
  - キャッシュ動作（2回目呼び出しでシェル実行なし）をテストする
  - `ExecDeps` を使用してシェル実行をモックする
  - _Requirements: 1.1, 2.1, 3.2, 4.2, 8.1_

- [x] 3. 既存コードの呼び出し元更新（結合タスク）
- [x] 3.1 index.ts の更新
  - `resolveClaudePathAtStartup()` を `getToolPathResolverService().resolveAll()` 呼び出しに置換する
  - `claude` 未検出時の警告ダイアログ表示ロジックを維持する
  - _Requirements: 4.1, 7.4_
  - _Method: resolveAll, getToolPathResolverService_
  - _Verify: Grep "getToolPathResolverService|resolveAll" in index.ts_

- [x] 3.2 agentProcess.ts の更新
  - `getClaudePathResolverService().getClaudePath()` を `getToolPathResolverService().getPath('claude')` に変更する
  - _Requirements: 7.4_
  - _Method: getPath_
  - _Verify: Grep "getToolPathResolverService.*getPath.*claude" in agentProcess.ts_

- [x] 3.3 engineCommandResolverService.ts の更新
  - `getClaudePathResolverService()` の呼び出しを `getToolPathResolverService()` に変更する
  - _Requirements: 7.4_
  - _Method: getPath_
  - _Verify: Grep "getToolPathResolverService" in engineCommandResolverService.ts_

- [x] 3.4 engineCommandResolverService.test.ts の更新
  - モック対象を `ClaudePathResolverService` から `ToolPathResolverService` に変更する
  - _Requirements: 7.4_

- [x] 3.5 handlers.ts の IPC ハンドラ更新
  - `CHECK_JJ_AVAILABILITY` ハンドラを `getToolPathResolverService().getStatus('jj')` を使用するように変更する
  - `ToolStatus` → `ToolCheck` 変換ロジックを実装して既存API互換を維持する
  - _Requirements: 7.4_
  - _Method: getStatus_
  - _Verify: Grep "getToolPathResolverService.*getStatus.*jj" in handlers.ts_

- [x] 4. 既存コードの削除（クリーンアップタスク）
- [x] 4.1 ClaudePathResolverService の物理削除
  - `src/main/services/claudePathResolverService.ts` を削除する
  - `src/main/services/claudePathResolverService.test.ts` を削除する
  - _Requirements: 7.1_

- [x] 4.2 ProjectChecker の checkJjAvailability/checkJqAvailability メソッド削除
  - `ProjectChecker.checkJjAvailability()` メソッドを削除する
  - `ProjectChecker.checkJqAvailability()` メソッドを削除する
  - 関連するテストケースも削除する
  - _Requirements: 7.2, 7.3_
  - _Verify: Grep "checkJjAvailability|checkJqAvailability" should return no results_

- [x] 5. 統合テストと検証
- [x] 5.1 統合テスト: 起動時一括解決と警告ダイアログ
  - アプリ起動時に `resolveAll()` が呼び出されることを確認する
  - `claude` 未検出時に警告ダイアログが表示されることを確認する
  - _Requirements: 4.1, 4.3_

- [x] 5.2 統合テスト: IPC経由のツール状態取得
  - `CHECK_JJ_AVAILABILITY` IPC呼び出しが正しい `ToolCheck` 形式で応答することを確認する
  - Renderer側の既存コードが変更なしで動作することを確認する
  - _Requirements: 7.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ToolPathResolverServiceクラス存在 | 1.5 | Feature |
| 1.2 | claude, jj, jqサポート | 1.1 | Feature |
| 1.3 | 将来のツール追加容易性 | 1.1 | Feature |
| 2.1 | ログインシェル経由解決 | 1.3 | Feature |
| 2.2 | .zshrc/.zprofile反映 | 1.3 | Feature |
| 2.3 | シェル未設定時フォールバック | 1.3 | Feature |
| 2.4 | タイムアウト5秒 | 1.3 | Feature |
| 3.1 | セッションキャッシュ | 1.4 | Feature |
| 3.2 | getPath即座取得 | 1.4 | Feature |
| 3.3 | 解決状態キャッシュ | 1.4 | Feature |
| 4.1 | 起動時一括解決 | 1.5, 3.1, 5.1 | Feature |
| 4.2 | 並列解決 | 1.5 | Feature |
| 4.3 | 完了通知 | 1.5, 5.1 | Feature |
| 5.1 | 定数オブジェクト管理 | 1.1 | Feature |
| 5.2 | ツール定義情報 | 1.1 | Feature |
| 5.3 | エントリ追加のみ対応 | 1.1 | Feature |
| 6.1 | 解決結果インターフェース | 1.2 | Feature |
| 6.2 | ツール定義情報取得 | 1.2, 1.5 | Feature |
| 7.1 | ClaudePathResolverService削除 | 4.1 | Cleanup |
| 7.2 | checkJjAvailability削除 | 4.2 | Cleanup |
| 7.3 | checkJqAvailability削除 | 4.2 | Cleanup |
| 7.4 | 呼び出し元移行 | 3.1, 3.2, 3.3, 3.4, 3.5, 5.2 | Integration |
| 8.1 | E2Eモック環境変数対応 | 1.3, 2.1 | Feature |
| 8.2 | claude用E2Eモック | 1.3 | Feature |
