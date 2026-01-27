# Implementation Plan: jj-merge-support

## Implementation Tasks

### 1. マージスクリプトの作成

- [x] 1.1 (P) .kiro/scripts/merge-spec.shスクリプトテンプレートの作成
  - `electron-sdd-manager/resources/templates/scripts/merge-spec.sh`を作成
  - jqコマンドの存在チェック（必須依存）
  - jjコマンドの存在チェック（オプション依存）
  - spec.jsonからworktree.branchとmainブランチ名を読み取る
  - jj存在時：`jj squash --from <branch> --into <main>`でマージ実行
  - jj不在時：`git merge --squash <branch>`でフォールバック
  - マージ成功後：`git commit`、`git worktree remove`、`git branch -D`を実行
  - コンフリクト検出時：exit code 1を返却
  - jq/spec.json不在時：exit code 2を返却、エラーメッセージ表示
  - worktree削除/ブランチ削除失敗時：警告表示、処理継続
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_
  - _Method: command -v jj, command -v jq, jj squash, git merge --squash_
  - _Verify: Grep "command -v jj|jj squash|git merge --squash" in merge-spec.sh_

### 2. ProjectCheckerへのjjチェック統合

- [x] 2.1 (P) checkJjAvailability()メソッドの実装
  - `electron-sdd-manager/src/main/services/projectChecker.ts`に`checkJjAvailability()`メソッド追加
  - `jj --version`を実行してjjの存在確認
  - 成功時：`{ name: 'jj', available: true, version: string }`を返却
  - 失敗時：`{ name: 'jj', available: false, installGuidance: 'brew install jj' }`を返却
  - 既存のcheckJqAvailability()と同様の実装パターンを使用
  - _Requirements: 3.1, 7.1, 7.2, 7.3, 7.4_
  - _Method: checkJqAvailability_
  - _Verify: Grep "checkJjAvailability.*jj --version" in projectChecker.ts_

### 3. SettingsFileManagerへのjjInstallIgnored設定管理追加

- [x] 3.1 (P) jjInstallIgnored設定の永続化機能実装
  - `electron-sdd-manager/src/main/services/settingsFileManager.ts`に`setJjInstallIgnored()`、`getJjInstallIgnored()`メソッド追加
  - `.kiro/sdd-orchestrator.json`の`settings.jjInstallIgnored`フィールドを読み書き
  - 既存のloadSettings/saveSettings内部ロジックを活用
  - 既存フィールドとの競合を避ける（設定ファイル全体をマージ）
  - Zodスキーマに`jjInstallIgnored?: boolean`を追加
  - _Requirements: 5.1, 5.2, 5.3_

### 4. IPC層の実装

- [x] 4.1 (P) IPCチャンネル定義の追加
  - `electron-sdd-manager/src/main/ipc/channels.ts`に`CHECK_JJ_AVAILABILITY`, `INSTALL_JJ`, `IGNORE_JJ_INSTALL`チャンネル定義追加
  - 既存のpermissions関連チャンネルと同様の命名規則を使用
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 4.2 IPCハンドラの実装
  - 4.1が完了していること（チャンネル定義が必要）
  - `electron-sdd-manager/src/main/ipc/handlers.ts`に3つのチャンネルのハンドラ実装追加
  - `CHECK_JJ_AVAILABILITY`: ProjectChecker.checkJjAvailability()を呼び出し、ToolCheckを返却
  - `INSTALL_JJ`: `brew install jj`を実行、完了後にcheckJjAvailability()再実行、成功/失敗を返却
  - `IGNORE_JJ_INSTALL`: SettingsFileManager.setJjInstallIgnored()を呼び出し、成功/失敗を返却
  - リクエストパラメータのZodバリデーション追加
  - brewインストール中のタイムアウトは設定しない（長時間実行のため）
  - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - _Method: ProjectChecker.checkJjAvailability, SettingsFileManager.setJjInstallIgnored_
  - _Verify: Grep "CHECK_JJ_AVAILABILITY|INSTALL_JJ|IGNORE_JJ_INSTALL" in handlers.ts_

- [x] 4.3 preload APIの公開
  - 4.2が完了していること（ハンドラ実装が必要）
  - `electron-sdd-manager/src/preload/index.ts`に`checkJjAvailability()`, `installJj()`, `ignoreJjInstall()`メソッド公開
  - `window.electronAPI`に3つのメソッドを追加
  - 型定義を追加（`Promise<ToolCheck>`, `Promise<{ success: boolean; error?: string }>`）
  - _Requirements: 8.1, 8.2, 8.3_

### 5. ProjectStoreへのjjチェック統合

- [x] 5.1 ProjectStoreへのjj関連state追加
  - 4.3が完了していること（preload API公開が必要）
  - `electron-sdd-manager/src/shared/stores/projectStore.ts`に`jjCheck: ToolCheck | null`, `jjInstallIgnored: boolean`, `jjInstallLoading: boolean`, `jjInstallError: string | null`フィールド追加
  - `installJj()`アクション：IPC経由で`INSTALL_JJ`呼び出し、`jjInstallLoading`をtrue→false、成功時にcheckJjAvailability再実行
  - `ignoreJjInstall()`アクション：IPC経由で`IGNORE_JJ_INSTALL`呼び出し、`jjInstallIgnored`をtrueに設定
  - `selectProject()`を修正：jjInstallIgnored === falseの場合のみjjチェック実行
  - 既存のpermissionsCheckと同様のパターンで実装
  - _Requirements: 3.5, 4.1, 9.1, 9.2, 9.3, 9.4_
  - _Method: IPC経由のcheckJjAvailability, INSTALL_JJ, IGNORE_JJ_INSTALL_
  - _Verify: Grep "jjCheck|jjInstallLoading|installJj|ignoreJjInstall" in projectStore.ts_

### 6. UI層の実装

- [x] 6.1 (P) JjInstallSectionコンポーネントの作成
  - `electron-sdd-manager/src/renderer/components/JjInstallSection.tsx`を作成
  - jjCheck.available === false かつ jjInstallIgnored === false の場合のみレンダリング
  - 「jjがインストールされていません」メッセージ表示
  - 「インストール (brew)」ボタン：`onInstall()`を呼び出し
  - 「無視」ボタン：`onIgnore()`を呼び出し
  - インストール中はスピナー表示（`jjInstallLoading`状態）
  - エラー発生時はエラーメッセージ表示（`jjInstallError`状態）
  - 既存のPermissionsCheckSectionと同じUIパターンを使用
  - _Requirements: 3.2, 3.3, 4.2, 4.4, 10.2, 10.3_

- [x] 6.2 ProjectValidationPanelへのjjセクション統合
  - 6.1が完了していること（JjInstallSectionコンポーネントが必要）
  - `electron-sdd-manager/src/renderer/components/ProjectValidationPanel.tsx`にjjセクションの条件付きレンダリング追加
  - jjCheck.available === false かつ jjInstallIgnored === false の場合のみJjInstallSectionをレンダリング
  - ProjectStoreから`jjCheck`, `jjInstallIgnored`, `jjInstallLoading`, `installJj`, `ignoreJjInstall`を取得
  - 既存のPermissionsCheckSectionの直後にjjセクションを配置
  - jjCheckがnullの場合はセクションを表示しない（プロジェクト未選択時）
  - _Requirements: 3.2, 3.4, 10.1, 10.4, 10.5_
  - _Verify: Grep "JjInstallSection|jjCheck.*available.*jjInstallIgnored" in ProjectValidationPanel.tsx_

### 7. UnifiedCommandsetInstallerへのスクリプト配置機能追加

- [x] 7.1 スクリプトテンプレートコピー機能の実装
  - 1.1が完了していること（merge-spec.shテンプレートが必要）
  - `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts`の`installCommandsetByProfile()`を修正
  - `.kiro/scripts/`ディレクトリ自動作成（mkdir -p相当）
  - `electron-sdd-manager/resources/templates/scripts/merge-spec.sh`を`.kiro/scripts/merge-spec.sh`にコピー
  - コピー後に`chmod +x`で実行権限付与
  - 既存ファイルは上書き（バージョンアップ対応）
  - 既存のスクリプトコピーロジック（update-spec-for-deploy.sh等）と同じパターンを使用
  - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - _Verify: Grep "merge-spec.sh.*chmod.*\\+x" in unifiedCommandsetInstaller.ts_

### 8. spec-merge.mdコマンドの修正

- [x] 8.1 spec-merge.mdのマージロジック変更
  - 7.1が完了していること（スクリプト配置機能が必要）
  - `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-merge.md`のStep 3（Perform Merge）を修正
  - `bash .kiro/scripts/merge-spec.sh {feature}`を呼び出すロジックに変更
  - exit code 0（成功）：Step 6（Report Success）へ進む
  - exit code 1（コンフリクト）：Step 4（Conflict Resolution）へ進む
  - exit code 2以上（エラー）：エラーメッセージを表示して停止
  - スクリプトの存在チェック（ファイルが見つからない場合はエラー）
  - 実行権限不足時のエラーハンドリング（権限変更コマンド案内）
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Method: bash .kiro/scripts/merge-spec.sh_
  - _Verify: Grep "bash.*merge-spec.sh" in spec-merge.md_

- [x] 8.2 cc-sddプロファイルのspec-merge.md修正
  - 8.1が完了していること（cc-sdd-agentの修正が完了）
  - `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-merge.md`にcc-sdd-agentと同様の修正を適用
  - Step 3のマージ処理をスクリプト呼び出しに変更
  - exit codeに応じた分岐処理を追加
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Verify: Grep "bash.*merge-spec.sh" in cc-sdd/spec-merge.md_

### 9. 型定義とスキーマの更新

- [x] 9.1 (P) 型定義の追加
  - `electron-sdd-manager/src/shared/types/index.ts`または適切な型定義ファイルに`ToolCheck`型を追加（既存の場合は確認のみ）
  - ProjectStoreのstate型を更新（`jjCheck: ToolCheck | null`等）
  - IPC通信のリクエスト/レスポンス型を定義
  - _Requirements: 9.1, 9.2_

- [x] 9.2 (P) Zodスキーマの更新
  - `electron-sdd-manager/src/main/services/settingsFileManager.ts`のZodスキーマに`jjInstallIgnored?: boolean`を追加
  - `.kiro/sdd-orchestrator.json`のバリデーションスキーマ更新
  - 既存プロジェクトではjjInstallIgnoredがundefinedの場合、falseとして扱う
  - _Requirements: 5.1, 5.2_

### 10. 統合テストの作成

- [x] 10.1 jjインストールフローの統合テスト
  - 5.1, 6.2が完了していること（Store実装とUI実装が必要）
  - 「インストール」ボタン → brew install jj → jjチェック再実行 → 警告消失の一連のフローをテスト
  - IPC経由の通信をモック（brewインストールは実際には実行しない）
  - ProjectStoreの状態遷移を検証（jjInstallLoading: true→false, jjCheck.available: false→true）
  - UIの表示/非表示を検証（警告セクションが消失すること）
  - `waitFor`パターンを使用（固定sleepを避ける）
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10.2 無視設定フローの統合テスト
  - 5.1, 6.2が完了していること（Store実装とUI実装が必要）
  - 「無視」ボタン → `.kiro/sdd-orchestrator.json`更新 → 警告非表示の一連のフローをテスト
  - 一時ディレクトリを使用して実際のファイル読み書きをテスト
  - ProjectStoreの状態遷移を検証（jjInstallIgnored: false→true）
  - プロジェクト再選択時に警告が表示されないことを検証
  - _Requirements: 5.1, 5.2_

- [x] 10.3 マージスクリプト実行の統合テスト
  - 1.1, 8.1が完了していること（スクリプトとコマンド修正が必要）
  - spec-merge.mdからmerge-spec.sh呼び出し → 成功・コンフリクト・エラーの分岐処理をテスト
  - jj存在時とjj不在時のフォールバック動作をテスト（`command -v jj`をモック）
  - コンフリクト検出時にexit code 1が返却されることを検証
  - jq不在時にexit code 2が返却されることを検証
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

### 11. ビルドと検証

- [x] 11.1 ビルドと型チェック
  - 全実装が完了していること
  - `cd electron-sdd-manager && npm run build && npm run typecheck`を実行
  - ビルドエラー、型エラーがないことを確認
  - _Requirements: 全要件_

---

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 12.1 SettingsFileManagerへのjjInstallIgnored設定管理の実装確認と完全化
  - 関連: Task 3.1, Requirement 5.1, 5.2, 5.3
  - `electron-sdd-manager/src/main/services/settingsFileManager.ts`に`setJjInstallIgnored()`, `getJjInstallIgnored()`メソッドが実装されているか確認
  - 未実装の場合は実装を追加（`.kiro/sdd-orchestrator.json`の`settings.jjInstallIgnored`フィールドを読み書き）
  - Zodスキーマに`jjInstallIgnored?: boolean`を追加

- [x] 12.2 IPCチャンネル定義の追加（Task 4.1）
  - 関連: Task 4.1, Requirement 8.1, 8.2, 8.3, 8.4
  - `electron-sdd-manager/src/main/ipc/channels.ts`に以下のチャンネル定義を追加:
    - `CHECK_JJ_AVAILABILITY`
    - `INSTALL_JJ`
    - `IGNORE_JJ_INSTALL`
  - 既存のpermissions関連チャンネルと同様の命名規則を使用

- [x] 12.3 IPCハンドラの実装（Task 4.2）
  - 関連: Task 4.2, Requirement 8.1, 8.2, 8.3
  - `electron-sdd-manager/src/main/ipc/handlers.ts`に3つのチャンネルのハンドラ実装を追加
  - `CHECK_JJ_AVAILABILITY`: ProjectChecker.checkJjAvailability()を呼び出し、ToolCheckを返却
  - `INSTALL_JJ`: `brew install jj`を実行、完了後にcheckJjAvailability()再実行、成功/失敗を返却
  - `IGNORE_JJ_INSTALL`: SettingsFileManager.setJjInstallIgnored()を呼び出し、成功/失敗を返却
  - リクエストパラメータのZodバリデーション追加

- [x] 12.4 preload APIの公開（Task 4.3）
  - 関連: Task 4.3, Requirement 8.1, 8.2, 8.3
  - `electron-sdd-manager/src/preload/index.ts`に以下のメソッドを公開:
    - `checkJjAvailability(): Promise<ToolCheck>`
    - `installJj(): Promise<{ success: boolean; error?: string }>`
    - `ignoreJjInstall(projectPath: string, ignored: boolean): Promise<{ success: boolean; error?: string }>`
  - `window.electronAPI`に3つのメソッドを追加
  - 型定義を追加

- [x] 12.5 ProjectStoreへのjj関連state追加（Task 5.1）
  - 関連: Task 5.1, Requirement 3.5, 4.1, 9.1, 9.2, 9.3, 9.4
  - `electron-sdd-manager/src/shared/stores/projectStore.ts`に以下を追加:
    - State: `jjCheck: ToolCheck | null`, `jjInstallIgnored: boolean`, `jjInstallLoading: boolean`, `jjInstallError: string | null`
    - Action: `installJj()` - IPC経由で`INSTALL_JJ`呼び出し、ローディング状態管理、成功時にcheckJjAvailability再実行
    - Action: `ignoreJjInstall()` - IPC経由で`IGNORE_JJ_INSTALL`呼び出し、`jjInstallIgnored`をtrueに設定
    - `selectProject()`を修正: jjInstallIgnored === falseの場合のみjjチェック実行
  - 既存のpermissionsCheckと同様のパターンで実装

- [x] 12.6 JjInstallSectionコンポーネントの作成（Task 6.1）
  - 関連: Task 6.1, Requirement 3.2, 3.3, 4.2, 4.4, 10.2, 10.3
  - `electron-sdd-manager/src/renderer/components/JjInstallSection.tsx`を作成
  - jjCheck.available === false かつ jjInstallIgnored === false の場合のみレンダリング
  - 「jjがインストールされていません」メッセージ表示
  - 「インストール (brew)」ボタン: `onInstall()`を呼び出し
  - 「無視」ボタン: `onIgnore()`を呼び出し
  - インストール中はスピナー表示（`jjInstallLoading`状態）
  - エラー発生時はエラーメッセージ表示（`jjInstallError`状態）
  - 既存のPermissionsCheckSectionと同じUIパターンを使用

- [x] 12.7 ProjectValidationPanelへのjjセクション統合（Task 6.2）
  - 関連: Task 6.2, Requirement 3.2, 3.4, 10.1, 10.4, 10.5
  - `electron-sdd-manager/src/renderer/components/ProjectValidationPanel.tsx`にjjセクションの条件付きレンダリング追加
  - jjCheck.available === false かつ jjInstallIgnored === false の場合のみJjInstallSectionをレンダリング
  - ProjectStoreから`jjCheck`, `jjInstallIgnored`, `jjInstallLoading`, `installJj`, `ignoreJjInstall`を取得
  - 既存のPermissionsCheckSectionの直後にjjセクションを配置
  - jjCheckがnullの場合はセクションを表示しない（プロジェクト未選択時）

- [x] 12.8 UnifiedCommandsetInstallerへのスクリプト配置機能追加（Task 7.1）
  - 関連: Task 7.1, Requirement 11.1, 11.2, 11.3, 11.4
  - `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts`の`installCommandsetByProfile()`を修正
  - `.kiro/scripts/`ディレクトリ自動作成（mkdir -p相当）
  - `electron-sdd-manager/resources/templates/scripts/merge-spec.sh`を`.kiro/scripts/merge-spec.sh`にコピー
  - コピー後に`chmod +x`で実行権限付与
  - 既存ファイルは上書き（バージョンアップ対応）
  - 既存のスクリプトコピーロジック（update-spec-for-deploy.sh等）と同じパターンを使用
  - **Note**: ccSddWorkflowInstaller.installScripts() が既にこの機能を提供しており、merge-spec.shテンプレートも存在するため完了

- [x] 12.9 spec-merge.mdのマージロジック変更（cc-sdd-agent）（Task 8.1）
  - 関連: Task 8.1, Requirement 2.1, 2.2, 2.3, 2.4
  - `electron-sdd-manager/resources/templates/commands/cc-sdd-agent/spec-merge.md`のStep 3（Perform Merge）を修正
  - `bash .kiro/scripts/merge-spec.sh {feature}`を呼び出すロジックに変更
  - exit code 0（成功）: Step 6（Report Success）へ進む
  - exit code 1（コンフリクト）: Step 4（Conflict Resolution）へ進む
  - exit code 2以上（エラー）: エラーメッセージを表示して停止
  - スクリプトの存在チェック（ファイルが見つからない場合はエラー）
  - 実行権限不足時のエラーハンドリング（権限変更コマンド案内）

- [x] 12.10 spec-merge.mdのマージロジック変更（cc-sdd）（Task 8.2）
  - 関連: Task 8.2, Requirement 2.1, 2.2, 2.3, 2.4
  - `electron-sdd-manager/resources/templates/commands/cc-sdd/spec-merge.md`にcc-sdd-agentと同様の修正を適用
  - Step 3のマージ処理をスクリプト呼び出しに変更
  - exit codeに応じた分岐処理を追加
  - **Note**: cc-sddプロファイルはspec-merge.mdを持たない（直接実行型プロファイルのため）。spec-mergeはcc-sdd-agentとspec-managerでのみ使用される

- [x] 12.11 型定義の追加（Task 9.1）
  - 関連: Task 9.1, Requirement 9.1, 9.2
  - `electron-sdd-manager/src/shared/types/index.ts`に必要な型定義を追加（既存の場合は確認のみ）
  - ProjectStoreのstate型を更新（`jjCheck: ToolCheck | null`等）
  - IPC通信のリクエスト/レスポンス型を定義
  - **Note**: toolCheck.ts が既に存在し、Task 12.5でProjectStoreの型も更新済みのため完了

- [x] 12.12 Zodスキーマの更新（Task 9.2）
  - 関連: Task 9.2, Requirement 5.1, 5.2
  - `electron-sdd-manager/src/main/services/settingsFileManager.ts`のZodスキーマに`jjInstallIgnored?: boolean`を追加（既に完了している場合はスキップ）
  - `.kiro/sdd-orchestrator.json`のバリデーションスキーマ更新
  - 既存プロジェクトではjjInstallIgnoredがundefinedの場合、falseとして扱う
  - **Note**: layoutConfigService.tsのZodスキーマに既に追加済みのため完了

- [x] 12.13 ビルドと型チェック（Task 11.1）
  - 関連: Task 11.1, 全要件
  - `cd electron-sdd-manager && npm run build && npm run typecheck`を実行
  - ビルドエラー、型エラーがないことを確認
  - エラーがある場合は修正
  - **Note**: webSocketHandler.tsの既存エラーのみ（jj-merge-support機能には関係なし）。jj関連の新規エラーはゼロ

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | jjコマンド存在確認 | 1.1 | Infrastructure |
| 1.2 | jj存在時にjj squashでマージ | 1.1 | Infrastructure |
| 1.3 | jj不在時にgit merge --squash | 1.1 | Infrastructure |
| 1.4 | マージ後にworktree削除 | 1.1 | Infrastructure |
| 1.5 | マージ後にfeatureブランチ削除 | 1.1 | Infrastructure |
| 2.1 | spec-merge.mdからスクリプト呼び出し | 8.1, 8.2 | Infrastructure |
| 2.2 | 成功時にStep 6へ進む | 8.1, 8.2 | Infrastructure |
| 2.3 | コンフリクト時にStep 4へ進む | 8.1, 8.2 | Infrastructure |
| 2.4 | エラー時にメッセージ表示 | 8.1, 8.2 | Infrastructure |
| 3.1 | プロジェクト選択時にjjチェック | 2.1, 5.1 | Infrastructure |
| 3.2 | jj不在時に警告セクション表示 | 6.1, 6.2 | Feature |
| 3.3 | インストール・無視ボタン提供 | 6.1 | Feature |
| 3.4 | jjInstallIgnored時に警告非表示 | 6.2 | Feature |
| 3.5 | 再読み込み時にjjチェック再実行 | 5.1 | Infrastructure |
| 4.1 | インストールボタンでbrew install jj実行 | 4.2, 5.1 | Feature |
| 4.2 | インストール中にスピナー表示 | 6.1 | Feature |
| 4.3 | インストール成功時にjjチェック再実行 | 4.2 | Infrastructure |
| 4.4 | インストール失敗時にエラー表示 | 6.1 | Feature |
| 4.5 | 他操作中もインストール継続 | 4.2 | Infrastructure |
| 5.1 | 無視ボタンでjjInstallIgnored=true設定 | 3.1, 5.1 | Feature |
| 5.2 | jjInstallIgnored=trueで警告非表示 | 6.2 | Feature |
| 5.3 | 手動でfalseに変更時に警告再表示 | 5.1 | Infrastructure |
| 6.1 | jqコマンド不在時にエラー | 1.1 | Infrastructure |
| 6.2 | spec.json不在時にエラー | 1.1 | Infrastructure |
| 6.3 | コンフリクト時にexit 1 | 1.1 | Infrastructure |
| 6.4 | worktree削除失敗時に警告 | 1.1 | Infrastructure |
| 6.5 | ブランチ削除失敗時に警告 | 1.1 | Infrastructure |
| 7.1 | jj --versionで存在確認 | 2.1 | Infrastructure |
| 7.2 | jj存在時にToolCheckオブジェクト（available: true）返却 | 2.1 | Infrastructure |
| 7.3 | jj不在時にToolCheckオブジェクト（available: false）返却 | 2.1 | Infrastructure |
| 7.4 | checkJqAvailability()同様の実装パターン | 2.1 | Infrastructure |
| 8.1 | jjチェックIPCハンドラ追加 | 4.1, 4.2 | Infrastructure |
| 8.2 | jjインストールIPCハンドラ追加 | 4.1, 4.2 | Infrastructure |
| 8.3 | jj無視設定IPCハンドラ追加 | 4.1, 4.2 | Infrastructure |
| 8.4 | permissions関連ハンドラと同様の命名規則 | 4.1, 4.2 | Infrastructure |
| 9.1 | プロジェクト選択時にjjチェック結果取得 | 5.1 | Infrastructure |
| 9.2 | jjCheckフィールド更新 | 5.1, 9.1 | Infrastructure |
| 9.3 | jjInstallLoadingフィールド管理 | 5.1 | Infrastructure |
| 9.4 | jjInstallIgnored時にjjチェックスキップ | 5.1 | Infrastructure |
| 10.1 | jjCheck.available=falseかつjjInstallIgnored=falseで表示 | 6.2 | Feature |
| 10.2 | 「jjがインストールされていません」メッセージ | 6.1 | Feature |
| 10.3 | 「インストール (brew)」「無視」ボタン表示 | 6.1 | Feature |
| 10.4 | jjCheck.available=trueでセクション非表示 | 6.2 | Feature |
| 10.5 | jjInstallIgnored=trueでセクション非表示 | 6.2 | Feature |
| 11.1 | commandsetインストール時にスクリプトコピー | 7.1 | Infrastructure |
| 11.2 | スクリプトに実行権限付与 | 7.1 | Infrastructure |
| 11.3 | .kiro/scripts/ディレクトリ自動作成 | 7.1 | Infrastructure |
| 11.4 | 既存スクリプト上書き | 7.1 | Infrastructure |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1, 2.1), not container tasks (e.g., 1, 2)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
