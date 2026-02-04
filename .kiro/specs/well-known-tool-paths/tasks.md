# Implementation Plan: Well Known Tool Paths

## Task Overview

シェル起動による副作用を排除し、Well Knownパスの直接チェック + 設定画面での手動指定によるツールパス解決機構を実装する。

---

## Tasks

- [x] 1. ConfigStore拡張 - ツールパス設定の永続化基盤
- [x] 1.1 (P) ツールパス設定スキーマを追加する
  - `toolPaths`オブジェクトをelectron-storeスキーマに追加
  - `claude`, `jj`, `jq`の各プロパティをnull許容文字列で定義
  - 既存設定との互換性を維持
  - _Requirements: 2.1_
  - _Verify: Grep "toolPaths" in configStore.ts_

- [x] 1.2 (P) ツールパスのget/setメソッドを追加する
  - `getToolPath(toolName)`: 単一ツールパス取得
  - `getToolPaths()`: 全ツールパス取得
  - `setToolPath(toolName, path)`: ツールパス設定
  - _Requirements: 2.1_

- [x] 1.3 (P) ConfigStoreユニットテストを追加する
  - ツールパスの永続化・読み取りテスト
  - null値とstring値の両方をテスト
  - _Requirements: 2.1_

- [x] 2. ToolPathResolverService全面書き換え - シェル起動廃止
- [x] 2.1 Well Knownパス探索ロジックを実装する
  - `/opt/homebrew/bin`, `/usr/local/bin`, `$HOME/.local/bin`, `/usr/bin`の順でチェック
  - `fs.existsSync`で存在確認（シェル起動禁止）
  - 最初に見つかったパスを返す
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: fs.existsSync, WELL_KNOWN_PATHS定数_
  - _Verify: Grep "fs.existsSync" in toolPathResolverService.ts_

- [x] 2.2 手動設定パス優先ロジックを実装する
  - ConfigStoreから手動設定パスを取得
  - 手動設定があれば優先、なければWell Known探索
  - `forceResolve`オプションでキャッシュクリア＆再解決
  - _Requirements: 2.4_
  - _Depends on: 1.1, 2.1_

- [x] 2.3 シェル起動ロジックとワークアラウンドを削除する
  - `$SHELL -il -c 'which ...'`パターンを削除
  - `SHELL_SESSIONS_DISABLE`環境変数設定を削除
  - `TERM=dumb`設定を削除
  - 関連するANSIエスケープ処理を削除
  - _Requirements: 4.2, 4.3_

- [x] 2.4 後方互換API（getPath, isResolved）を維持する
  - 既存の`getPath(toolName)`シグネチャを維持
  - 既存の`isResolved(toolName)`シグネチャを維持
  - 内部実装のみ変更、外部インタフェースは不変
  - _Requirements: 4.4_

- [x] 2.5 ToolPathResolverServiceユニットテストを書き換える
  - fs.existsSyncのモックによるパス探索テスト
  - 手動設定優先のテスト
  - Well Knownパス順序のテスト
  - _Requirements: 1.1, 1.2, 2.4, 4.1_
  - _Depends on: 2.1, 2.2, 2.3, 2.4_

- [x] 3. IPC通信層 - ツールパス設定API
- [x] 3.1 (P) IPCチャンネル定義を追加する
  - `GET_TOOL_STATUSES`: 全ツールステータス取得
  - `SET_TOOL_PATH`: パス設定 + 再解決
  - `RESOLVE_TOOL`: 単一ツール再解決
  - _Requirements: 2.1, 2.4_
  - _Verify: Grep "TOOL_STATUSES|TOOL_PATH|RESOLVE_TOOL" in channels.ts_

- [x] 3.2 IPCハンドラを実装する
  - `configHandlers.ts`にツールパス関連ハンドラを追加
  - 既存の`registerConfigHandlers`パターンに従う
  - ToolPathResolverServiceを呼び出して結果を返す
  - _Requirements: 2.1, 2.4_
  - _Depends on: 2.1, 2.2, 3.1_

- [x] 3.3 preload APIを公開する
  - `window.electronAPI`にツールパス関連メソッドを追加
  - 型定義（`electron.d.ts`）を更新
  - _Requirements: 2.1_
  - _Depends on: 3.1, 3.2_

- [x] 4. Renderer状態管理 - toolPathStore
- [x] 4.1 (P) toolPathStoreを実装する
  - Zustand storeとして`src/shared/stores/toolPathStore.ts`に作成
  - `statuses`, `isLoading`, `error`の状態管理
  - `fetchStatuses()`, `setToolPath()`, `resolveTool()`アクション
  - _Requirements: 2.2, 2.3_
  - _Verify: Grep "toolPathStore" in shared/stores_

- [x] 4.2 toolPathStoreユニットテストを作成する
  - IPC呼び出しのモックテスト
  - 状態更新のテスト
  - _Requirements: 2.2, 2.3_
  - _Depends on: 4.1_

- [x] 5. UI実装 - ToolSettingsPanel
- [x] 5.1 ToolSettingsPanelコンポーネントを作成する
  - 各ツールのステータス表示（名前、パス、解決状態）
  - 未検出ツールの警告スタイル表示
  - 手動パス入力フィールド
  - McpSettingsPanelと同様のカード形式UI
  - _Requirements: 2.2, 2.3, 3.2_
  - _Depends on: 4.1_

- [x] 5.2 (P) ToolSettingsPanelユニットテストを作成する
  - 各ステータス表示の検証
  - パス入力とsubmitのテスト
  - _Requirements: 2.2, 2.3, 3.2_
  - _Depends on: 5.1_

- [x] 6. 統合 - 設定画面とアプリ起動時連携
- [x] 6.1 RemoteAccessDialogにToolSettingsPanelを統合する
  - 新しいセクションまたはタブとして追加
  - 既存UIとの一貫性を維持
  - _Requirements: 2.2_
  - _Depends on: 5.1_

- [x] 6.2 claude未検出時の設定画面自動表示を実装する
  - App.tsx起動時にツールステータスをチェック
  - claudeが未検出の場合、設定画面（ToolSettingsPanel）を自動で開く
  - _Requirements: 3.1_
  - _Depends on: 4.1, 6.1_

- [x] 6.3 main/index.tsの既存警告ダイアログを削除する
  - 起動時の警告ダイアログ表示ロジックを削除
  - 設定画面自動表示に置き換え済み（6.2で対応）
  - _Requirements: 3.1, 3.3_
  - _Depends on: 6.2_

- [x] 7. 統合テスト
- [x] 7.1 IPC経由のツールパス設定テストを実装する
  - Renderer→Main→ConfigStore→再解決の一連の流れ
  - fs.existsSyncモックで各パターンをテスト
  - _Requirements: 2.1, 2.4_
  - _Depends on: 3.2, 4.1_
  - _Integration Point: Design.md "設定画面での手動指定フロー"_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Well Knownパス順次チェック | 2.1 | Implementation |
| 1.2 | 最初に見つかったパスを使用 | 2.1 | Implementation |
| 1.3 | シェル起動禁止（fs.existsSync使用） | 2.1 | Implementation |
| 1.4 | 対象ツールはclaude, jj, jq | 2.1 | Implementation |
| 2.1 | ConfigStoreにtoolPaths追加 | 1.1, 1.2, 1.3 | Implementation |
| 2.2 | ToolSettingsPanel追加 | 5.1, 6.1 | Feature |
| 2.3 | ツール情報表示（名前、パス、ステータス） | 5.1 | Feature |
| 2.4 | 手動設定パス優先 | 2.2 | Implementation |
| 3.1 | claude未検出時の設定画面自動表示 | 6.2, 6.3 | Feature |
| 3.2 | 未検出ツールハイライト表示 | 5.1 | Feature |
| 3.3 | トースト通知廃止 | 6.3 | Cleanup |
| 4.1 | ToolPathResolverService書き換え | 2.1, 2.2, 2.3, 2.4 | Implementation |
| 4.2 | シェル起動ロジック削除 | 2.3 | Cleanup |
| 4.3 | ワークアラウンド削除 | 2.3 | Cleanup |
| 4.4 | API後方互換性維持 | 2.4 | Implementation |
