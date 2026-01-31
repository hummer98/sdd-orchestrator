# Implementation Plan

## 1. 設定スキーマとサービス層の拡張

- [x] 1.1 (P) ProjectSettingsSchemaに`remoteUiAutoStart`フィールドを追加する
  - `settings.remoteUiAutoStart`をオプショナルなboolean型として追加
  - 既存の`skipPermissions`、`jjInstallIgnored`と同レベルに配置
  - _Requirements: 1.1_
  - _Method: ProjectSettingsSchema (zod)_
  - _Verify: Grep "remoteUiAutoStart" in layoutConfigService.ts_

- [x] 1.2 (P) layoutConfigServiceに設定の読み書きメソッドを追加する
  - `loadRemoteUiAutoStart(projectPath)`: 設定を読み込み、未設定時は`false`を返す
  - `saveRemoteUiAutoStart(projectPath, enabled)`: 設定を保存し、他のsettingsフィールドを保持
  - 既存の`loadSkipPermissions`/`saveSkipPermissions`パターンを踏襲
  - _Requirements: 1.1, 1.2, 1.3_
  - _Method: loadProjectConfigV3, saveProjectConfigV3_
  - _Verify: Grep "loadRemoteUiAutoStart|saveRemoteUiAutoStart" in layoutConfigService.ts_

## 2. IPC層の拡張

- [x] 2.1 IPCチャンネル定義を追加する
  - `LOAD_REMOTE_UI_AUTO_START`チャンネルを追加
  - `SAVE_REMOTE_UI_AUTO_START`チャンネルを追加
  - _Requirements: 1.3_
  - _Method: IpcChannels定数_
  - _Verify: Grep "LOAD_REMOTE_UI_AUTO_START|SAVE_REMOTE_UI_AUTO_START" in channels.ts_

- [x] 2.2 IPCハンドラを追加する
  - `LOAD_REMOTE_UI_AUTO_START`: layoutConfigService.loadRemoteUiAutoStartを呼び出し
  - `SAVE_REMOTE_UI_AUTO_START`: layoutConfigService.saveRemoteUiAutoStartを呼び出し
  - 既存のskipPermissionsハンドラパターンを踏襲
  - _Requirements: 1.3_
  - _Method: registerConfigHandlers_
  - _Verify: Grep "handleLoadRemoteUiAutoStart|handleSaveRemoteUiAutoStart" in configHandlers.ts_

- [x] 2.3 preload/index.tsにAPI公開を追加する
  - `loadRemoteUiAutoStart(projectPath: string): Promise<boolean>`
  - `saveRemoteUiAutoStart(projectPath: string, enabled: boolean): Promise<void>`
  - _Requirements: 1.3_
  - _Verify: Grep "loadRemoteUiAutoStart|saveRemoteUiAutoStart" in preload/index.ts_

- [x] 2.4 Renderer側の型定義を更新する
  - electron.d.tsにloadRemoteUiAutoStart/saveRemoteUiAutoStartの型を追加
  - _Requirements: 1.3_
  - _Verify: Grep "loadRemoteUiAutoStart|saveRemoteUiAutoStart" in electron.d.ts_

## 3. プロジェクト選択時の自動起動機能

- [x] 3.1 projectStoreのselectProject内に自動起動ロジックを追加する
  - プロジェクト選択完了後、設定を読み込み
  - `remoteUiAutoStart`が`true`かつサーバー未起動の場合、サーバーを起動
  - サーバー起動中（`isRunning`が`true`）の場合は何もしない
  - 起動失敗時は`notify.error()`でエラー通知を表示（UIをブロックしない）
  - 既存のjjCheck処理後に追加
  - _Requirements: 2.1, 2.2, 2.3_
  - _Method: remoteAccessStore.getState().isRunning, remoteAccessStore.getState().startServer_
  - _Verify: Grep "remoteUiAutoStart|loadRemoteUiAutoStart" in projectStore.ts_

## 4. RemoteAccessPanelへのUI追加

- [x] 4.1 自動起動設定のチェックボックスをRemoteAccessPanelに追加する
  - 「プロジェクト起動時に自動起動」チェックボックスを表示
  - 既存の「Enable remote access」の下に配置
  - プロジェクト未選択時はチェックボックスを無効化
  - コンポーネントマウント時に現在の設定値をロード（useEffect）
  - チェックボックス変更時に即座に`electronAPI.saveRemoteUiAutoStart`を呼び出し
  - _Requirements: 3.1, 3.2, 3.3_
  - _Verify: Grep "remoteUiAutoStart|saveRemoteUiAutoStart" in RemoteAccessPanel.tsx_

## 5. 既存コードのクリーンアップ

- [x] 5.1 remoteAccessStoreから未使用のautoStartEnabled関連コードを削除する
  - `RemoteAccessState`から`autoStartEnabled`フィールドを削除
  - `setAutoStartEnabled`アクションを削除
  - LocalStorage永続化対象（`partialize`）から`autoStartEnabled`を除外
  - `reset`メソッド内の`autoStartEnabled`保持ロジックを削除
  - _Requirements: 4.1, 4.2_
  - _Verify: Grep "autoStartEnabled" in remoteAccessStore.ts returns no matches_

- [x] 5.2 remoteAccessStore.test.tsからautoStartEnabled関連のテストを削除する
  - 削除された`autoStartEnabled`と`setAutoStartEnabled`に関するテストケースを削除
  - _Requirements: 4.3_
  - _Verify: Grep "autoStartEnabled" in remoteAccessStore.test.ts returns no matches_

## 6. 統合テスト

- [x]* 6.1 layoutConfigServiceの単体テストを追加する
  - `loadRemoteUiAutoStart`: 設定存在時、不在時、不正形式時のテスト
  - `saveRemoteUiAutoStart`: 新規作成、既存更新のテスト
  - 他のsettingsフィールドが保持されることを確認
  - _Requirements: 1.1, 1.2, 1.3_

- [x]* 6.2 プロジェクト選択→自動起動フローの統合テストを追加する
  - 設定`true`時にサーバーが起動することを確認
  - 設定`false`または未設定時にサーバーが起動しないことを確認
  - サーバー起動中にプロジェクト選択しても二重起動しないことを確認
  - _Requirements: 2.1, 2.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | settings.remoteUiAutoStartフィールド追加 | 1.1 | Infrastructure |
| 1.2 | フィールド不在時のデフォルト値false | 1.2 | Infrastructure |
| 1.3 | 設定変更時の即座更新 | 1.2, 2.1, 2.2, 2.3, 2.4 | Infrastructure |
| 2.1 | 設定trueでサーバー自動起動 | 3.1 | Feature |
| 2.2 | 二重起動防止 | 3.1 | Feature |
| 2.3 | 起動失敗時のエラー通知 | 3.1 | Feature |
| 3.1 | 自動起動チェックボックス表示 | 4.1 | Feature |
| 3.2 | チェックボックス変更の即座反映 | 4.1 | Feature |
| 3.3 | 現在の設定状態表示 | 4.1 | Feature |
| 4.1 | autoStartEnabled削除 | 5.1 | Cleanup |
| 4.2 | LocalStorage永続化対象から除外 | 5.1 | Cleanup |
| 4.3 | 関連テストコード更新 | 5.2 | Cleanup |
