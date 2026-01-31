# Requirements: Remote UI Auto Start

## Decision Log

### 保存先の選択
- **Discussion**: LocalStorage（アプリ全体）vs `.kiro/sdd-orchestrator.json`（プロジェクト毎）
- **Conclusion**: `.kiro/sdd-orchestrator.json` に保存
- **Rationale**: プロジェクト毎に異なる設定を持たせたいため

### 既存の autoStartEnabled との関係
- **Discussion**: 既存のLocalStorage保存の `autoStartEnabled` との共存・置き換え
- **Conclusion**: 既存は使用せず、新しいプロジェクト毎設定に一本化
- **Rationale**: グローバル設定は不要。プロジェクト毎の設定のみで十分

### フィールド名と構造
- **Discussion**: 新フィールドの命名と配置場所
- **Conclusion**: `settings.remoteUiAutoStart` として追加
- **Rationale**: 既存の `settings` オブジェクト内に統一的に配置

## Introduction

プロジェクト選択時にremote-UIサーバーを自動起動するオプションを追加する。設定はプロジェクト毎に `.kiro/sdd-orchestrator.json` に保存され、プロジェクトを開いたときに自動的にサーバーが起動する。

## Requirements

### Requirement 1: 設定の永続化

**Objective:** ユーザーとして、remote-UIサーバーの自動起動設定をプロジェクト毎に保存したい。これにより、プロジェクトを開くたびに手動でサーバーを起動する手間が省ける。

#### Acceptance Criteria
1. `.kiro/sdd-orchestrator.json` に `settings.remoteUiAutoStart` フィールドが追加される
2. フィールドが存在しない場合、デフォルト値は `false`（自動起動しない）
3. 設定変更時にファイルが即座に更新される

### Requirement 2: プロジェクト選択時の自動起動

**Objective:** ユーザーとして、設定がONのプロジェクトを開いたときにremote-UIサーバーが自動的に起動してほしい。

#### Acceptance Criteria
1. プロジェクト選択時、`settings.remoteUiAutoStart` が `true` の場合、remote-UIサーバーが自動起動する
2. サーバーが既に起動中の場合、何もしない（二重起動しない）
3. 自動起動に失敗した場合、エラー通知を表示する（UIをブロックしない）

### Requirement 3: UI設定

**Objective:** ユーザーとして、remote-UIサーバーの自動起動設定をUIから変更したい。

#### Acceptance Criteria
1. RemoteAccessDialogまたはRemoteAccessPanelに自動起動設定のチェックボックスが表示される
2. チェックボックスの変更が即座に `.kiro/sdd-orchestrator.json` に反映される
3. 現在の設定状態がチェックボックスに正しく表示される

### Requirement 4: 既存コードのクリーンアップ

**Objective:** 開発者として、使用されていない既存の `autoStartEnabled` を削除し、コードの一貫性を保ちたい。

#### Acceptance Criteria
1. `remoteAccessStore.ts` から `autoStartEnabled` と `setAutoStartEnabled` を削除
2. LocalStorageの永続化対象から `autoStartEnabled` を除外
3. 関連するテストコードを更新

## Out of Scope

- Cloudflare Tunnel設定の自動起動連動（既存の `publishToCloudflare` はLocalStorageのまま維持）
- アプリ起動時の自動起動（プロジェクト選択前には起動しない）
- 複数プロジェクト間での設定同期

## Open Questions

- なし（対話で解決済み）
