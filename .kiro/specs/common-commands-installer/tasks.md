# Implementation Plan: Common Commands Installer

## Tasks

- [x] 1. 暗黙的インストールの廃止
- [x] 1.1 setProjectPath()からcommit.mdインストールロジックを削除
  - `setProjectPath()` IPCハンドラからcommitコマンドの自動インストール処理を削除
  - `commonCommandsInstaller.installCommitCommand()` の呼び出しを完全に除去
  - プロジェクト選択時に予期しないファイル変更が発生しないことを検証
  - _Requirements: 1.1, 1.2_
  - _Method: setProjectPath_
  - _Verify: Grep "installCommitCommand" in handlers.ts should return no matches_

- [x] 2. CommonCommandsInstallerServiceの拡張
- [x] 2.1 (P) commonコマンド一覧取得機能を実装
  - テンプレートディレクトリをスキャンして利用可能なコマンドを取得する機能を追加
  - `.md`ファイルをフィルタリングし、READMEなど非コマンドファイルを除外
  - コマンド情報（名前、テンプレートパス、ターゲット相対パス）を返却
  - _Requirements: 4.1, 4.2, 4.3_
  - _Method: listCommonCommands, CommonCommandInfo_
  - _Verify: Grep "listCommonCommands" in commonCommandsInstallerService.ts_

- [x] 2.2 (P) コンフリクトチェック機能を実装
  - プロジェクト内の既存commonコマンドファイルをチェック
  - 存在するファイルをコンフリクトとして検出し情報を返却
  - ファイルの更新日時情報をオプションで含める
  - _Requirements: 3.1, 3.2_
  - _Method: checkConflicts, CommonCommandConflict_
  - _Verify: Grep "checkConflicts" in commonCommandsInstallerService.ts_

- [x] 2.3 一括インストール機能を実装
  - ユーザーの決定（上書き/スキップ）に基づいて複数のcommonコマンドをインストール
  - 決定に従い各ファイルを処理（上書きまたはスキップ）
  - インストール結果を集約して返却（成功、スキップ、上書き、失敗）
  - _Requirements: 3.4, 3.5_
  - _Method: installAllCommands, CommonCommandDecision, CommonCommandsInstallResult_
  - _Verify: Grep "installAllCommands" in commonCommandsInstallerService.ts_

- [x] 3. UnifiedCommandsetInstallerの拡張
- [x] 3.1 プロファイルインストール時のcommonコマンド統合
  - `installByProfile()`の完了後にcommonコマンドのコンフリクトチェックを実行
  - コンフリクトがなければ自動的に全commonコマンドをインストール
  - コンフリクトがあれば結果に含めてRendererに返却
  - commonコマンドインストール失敗時は警告ログを出力し、プロファイルインストール自体は成功扱い
  - _Requirements: 2.1, 2.2, 2.3_
  - _Method: installByProfile, UnifiedInstallResultWithCommon_
  - _Verify: Grep "commonCommands|commonCommandConflicts" in unifiedCommandsetInstaller.ts_

- [x] 3.2 コンフリクト解決後のインストール機能を追加
  - UIからの決定を受けてcommonコマンドをインストールするメソッドを追加
  - CommonCommandsInstallerServiceに委譲してインストールを実行
  - _Requirements: 3.4, 3.5_
  - _Method: installCommonCommandsWithDecisions_
  - _Verify: Grep "installCommonCommandsWithDecisions" in unifiedCommandsetInstaller.ts_

- [x] 4. IPC層の更新
- [x] 4.1 confirmCommonCommands IPCハンドラを追加
  - 新しいIPCチャンネル（CONFIRM_COMMON_COMMANDS）を`channels.ts`に定義
  - `handlers.ts`にIPCハンドラを追加してcommonコマンドの確認決定を受信
  - ユーザー決定（上書き/スキップの配列）をUnifiedCommandsetInstallerに渡す
  - インストール結果をRendererに返却
  - `preload/index.ts`に`confirmCommonCommands`メソッドを追加（ipcRenderer.invoke経由）
  - `electron.d.ts`のElectronAPIインターフェースに`confirmCommonCommands`メソッドの型定義を追加
  - 関連する型（CommonCommandDecision, CommonCommandsInstallResult）をRenderer側でも使用できるようにexport
  - _Requirements: 3.4, 3.5_
  - _Method: confirmCommonCommands IPC handler, preload API, type definitions_
  - _Verify: Grep "confirmCommonCommands" in handlers.ts, preload/index.ts, electron.d.ts_

- [x] 5. UI: 上書き確認ダイアログの実装
- [x] 5.1 ダイアログ状態管理の拡張
  - CommandsetInstallDialogに'common-command-confirm'状態を追加
  - コンフリクト情報とユーザー決定を管理する状態を追加
  - 状態遷移ロジックを更新（installing完了後にコンフリクトがあれば確認画面へ）
  - _Requirements: 3.1_
  - _Method: CommonCommandDialogState, CommonCommandConflictState_
  - _Verify: Grep "common-command-confirm" in CommandsetInstallDialog.tsx_

- [x] 5.2 コンフリクト確認UIを実装
  - 既存ファイルの一覧を表示するUI
  - 各ファイルに対して上書き/スキップを選択可能なコントロール
  - 「続行」ボタンでconfirmCommonCommands IPCを呼び出し
  - _Requirements: 3.2, 3.3_
  - _Verify: Grep "overwrite|skip" in CommandsetInstallDialog.tsx_

- [x] 5.3 結果表示の更新
  - インストール完了画面にcommonコマンドのインストール結果を表示
  - 上書き、スキップ、失敗それぞれのファイル数を表示
  - _Requirements: 2.1_
  - _Verify: Grep "commonCommands" in CommandsetInstallDialog.tsx_

- [x] 6. テストの実装
- [x] 6.1 (P) CommonCommandsInstallerServiceのユニットテスト
  - `listCommonCommands`: テンプレートディレクトリスキャンのテスト
  - `checkConflicts`: 存在・非存在ファイルの混在ケースのテスト
  - `installAllCommands`: overwrite/skip混在ケースのテスト
  - _Requirements: 4.1, 4.2, 4.3, 3.4, 3.5_
  - _Verify: Grep "describe.*CommonCommandsInstallerService" in commonCommandsInstallerService.test.ts_

- [x] 6.2 (P) UnifiedCommandsetInstallerの統合テスト
  - プロファイルインストール→commonコマンド統合フローのテスト
  - commonコマンドインストール失敗時のベストエフォート動作テスト
  - _Requirements: 2.1, 2.3_
  - _Verify: Grep "describe.*UnifiedCommandsetInstaller" in unifiedCommandsetInstaller.test.ts_

- [x] 6.3 (P) setProjectPathの退行テスト
  - プロジェクト選択時にcommit.mdがインストールされないことを確認
  - _Requirements: 1.1, 1.2_
  - _Verify: Grep "setProjectPath.*commit" in handlers.test.ts_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | プロジェクト選択時にcommit.mdを自動インストールしない | 1.1, 6.3 | Feature, Test |
| 1.2 | setProjectPath()からcommitインストールロジックを削除 | 1.1 | Feature |
| 2.1 | プロファイルインストール時にcommonコマンドをインストール | 3.1, 5.3, 6.2 | Feature, Test |
| 2.2 | .claude/commands/にインストール | 3.1 | Feature |
| 2.3 | 失敗時は警告ログを出してインストール続行 | 3.1, 6.2 | Feature, Test |
| 3.1 | 既存ファイル存在時に確認ダイアログ表示 | 2.2, 5.1 | Feature |
| 3.2 | ファイルごとに個別に確認 | 2.2, 5.2 | Feature |
| 3.3 | 上書き/スキップオプション | 5.2 | Feature |
| 3.4 | スキップ時は既存ファイルを変更しない | 2.3, 3.2, 4.1, 6.1 | Feature, Test |
| 3.5 | 上書き時はテンプレートで置換 | 2.3, 3.2, 4.1, 6.1 | Feature, Test |
| 4.1 | commonコマンドリストをサポート | 2.1, 6.1 | Feature, Test |
| 4.2 | テンプレートは中央ディレクトリに配置 | 2.1, 6.1 | Feature, Test |
| 4.3 | ファイル追加のみで新コマンド対応 | 2.1, 6.1 | Feature, Test |
