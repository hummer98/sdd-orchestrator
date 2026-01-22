# Requirements: Remote UI Bug Advanced Features

## Decision Log

### スコープ決定
- **Discussion**: 未実装機能（Bug作成、Bug自動実行、Worktree対応）を個別Specに分割するか、1つにまとめるか
- **Conclusion**: 1つのSpec（remote-ui-bug-advanced-features）にまとめる
- **Rationale**: 3機能は関連性が高く、同時に実装することで一貫したUXを提供できる

### 優先度決定
- **Discussion**: 3機能の中で特に重要なものがあるか
- **Conclusion**: 3機能すべて同等の優先度
- **Rationale**: Bug修正ワークフローの完全性を確保するため、すべての機能が必要

### 対象デバイス決定
- **Discussion**: Desktop（ブラウザ）とSmartphone両方をサポートするか、Smartphone版は制限するか
- **Conclusion**: 両方サポート
- **Rationale**: Remote UIの価値はモバイルからのアクセスにあり、機能制限は避けたい

### UI一貫性決定
- **Discussion**: Electron版と同じUIを維持するか、Remote UI独自のUIでよいか
- **Conclusion**: Desktop版はElectron版と同じUI、Smartphone版は画面に合わせて調整OK
- **Rationale**: Desktop版では一貫したUXを提供し、Smartphone版では使いやすさを優先

### Bug作成フロー決定
- **Discussion**: Bug名を手入力にするか、Claudeが自動生成するか
- **Conclusion**: Electron版と同じ方式（説明のみ入力、名前はClaude自動生成）
- **Rationale**: 既存のElectron版との一貫性を維持

## Introduction

Remote UI（ブラウザ/スマートフォン版）において、Electron版で実装済みのBug管理高度機能（Bug作成、Bug自動実行、Worktree対応）を追加する。これにより、リモートからでもBug修正ワークフローの全機能を利用可能にする。

## Requirements

### Requirement 1: Bug作成機能

**Objective:** Remote UIユーザーとして、ブラウザ/スマートフォンから新規Bugレポートを作成したい。これにより、デスクトップアプリがなくてもBug報告ができる。

#### Acceptance Criteria

1. **1.1** Bugsタブに「新規バグ」ボタンを表示する
   - When ユーザーがBugsタブを表示している, the system shall 「新規バグ」ボタンを表示する
   - Desktop版: Electron版と同じ位置（タブヘッダー右側）に配置
   - Smartphone版: 画面下部のフローティングアクションボタン（FAB）として表示

2. **1.2** Bug作成ダイアログを表示する
   - When ユーザーが「新規バグ」ボタンをクリック, the system shall Bug作成ダイアログを表示する
   - ダイアログには「バグの説明」テキストエリア（必須）を含む
   - ダイアログには「Worktreeを使用」チェックボックスを含む
   - Smartphone版: フルスクリーンモーダルとして表示

3. **1.3** WebSocket経由でBugを作成する
   - When ユーザーが「作成」ボタンをクリック, the system shall CREATE_BUGメッセージをWebSocket経由で送信する
   - Bug名はバックエンド（Claude）が説明から自動生成する
   - 作成中はローディング状態を表示する

4. **1.4** 作成完了後にUIを更新する
   - When BUG_CREATEDレスポンスを受信, the system shall Bug一覧を更新し、成功通知を表示する
   - If エラーが発生した場合, then the system shall エラーメッセージをダイアログ内に表示する

### Requirement 2: Bug自動実行機能

**Objective:** Remote UIユーザーとして、Bug修正ワークフロー（analyze→fix→verify）を自動実行したい。これにより、手動でフェーズを1つずつ実行する手間を省ける。

#### Acceptance Criteria

1. **2.1** Bug詳細ビューに自動実行ボタンを表示する
   - When ユーザーがBugを選択している, the system shall 「Auto Execute」ボタンをBug詳細ビューに表示する
   - Desktop版: Electron版と同じ位置（ワークフローヘッダー）に配置
   - Smartphone版: 画面上部の固定ヘッダーに配置

2. **2.2** フェーズパーミッショントグルを表示する
   - The system shall 各フェーズ（analyze, fix, verify）のパーミッショントグルを表示する
   - ユーザーはトグルで自動実行対象フェーズを選択できる
   - デフォルトはすべてON

3. **2.3** WebSocket経由で自動実行を開始する
   - When ユーザーが「Auto Execute」ボタンをクリック, the system shall START_BUG_AUTO_EXECUTIONメッセージを送信する
   - 許可されたフェーズのみ自動実行対象とする

4. **2.4** 自動実行状態をリアルタイム表示する
   - While 自動実行中, the system shall 現在実行中のフェーズをハイライト表示する
   - The system shall BUG_AUTO_EXECUTION_STATUSイベントを購読し、状態を更新する
   - The system shall BUG_AUTO_EXECUTION_PHASE_COMPLETEDイベントでフェーズ完了を表示する

5. **2.5** 自動実行を停止できる
   - When 自動実行中にユーザーが「Stop」ボタンをクリック, the system shall STOP_BUG_AUTO_EXECUTIONメッセージを送信する
   - 停止後はボタンが「Auto Execute」に戻る

6. **2.6** 自動実行完了/エラーを通知する
   - When BUG_AUTO_EXECUTION_COMPLETEDを受信, the system shall 完了通知を表示する
   - When BUG_AUTO_EXECUTION_ERRORを受信, the system shall エラー通知を表示する

### Requirement 3: Worktree対応

**Objective:** Remote UIユーザーとして、Bug修正をWorktree環境で実行したい。これにより、メインブランチを汚さずに安全にBug修正できる。

#### Acceptance Criteria

1. **3.1** Bug作成ダイアログにWorktreeチェックボックスを表示する
   - The system shall Bug作成ダイアログに「Worktreeを使用」チェックボックスを表示する
   - チェックボックスの状態はbugStore.useWorktreeと同期する

2. **3.2** Bug詳細ビューにWorktreeチェックボックスを表示する
   - When Bugが選択されている, the system shall Bug詳細ビューに「Worktreeを使用」チェックボックスを表示する
   - Desktop版: Electron版と同じ位置（ワークフローヘッダー下）に配置
   - Smartphone版: フェーズリストの上部に配置

3. **3.3** Worktree状態をバッジで表示する
   - If BugがWorktreeモードで実行中, then the system shall Bug一覧アイテムにWorktreeバッジを表示する
   - バッジはGitBranchアイコンを使用

4. **3.4** Worktree設定をフェーズ実行に反映する
   - When フェーズ実行ボタンをクリック, the system shall 現在のuseWorktree設定をリクエストに含める
   - WebSocket EXECUTE_PHASEメッセージにuseWorktreeフラグを追加する

### Requirement 4: WebSocket API拡張（バックエンド）

**Objective:** Remote UIから上記機能を利用するため、WebSocketHandlerに必要なAPIを追加する。

#### Acceptance Criteria

1. **4.1** Bug自動実行開始APIを追加する
   - The system shall START_BUG_AUTO_EXECUTIONメッセージハンドラを実装する
   - リクエスト: `{ bugPath: string, permissions: { analyze: boolean, fix: boolean, verify: boolean } }`
   - レスポンス: `{ ok: true }` または `{ ok: false, error: { type, message } }`

2. **4.2** Bug自動実行停止APIを追加する
   - The system shall STOP_BUG_AUTO_EXECUTIONメッセージハンドラを実装する
   - リクエスト: `{ bugPath: string }`
   - レスポンス: `{ ok: true }` または `{ ok: false, error: { type, message } }`

3. **4.3** WorkflowControllerインターフェースを拡張する
   - The system shall WorkflowControllerに`startBugAutoExecution`メソッドを追加する
   - The system shall WorkflowControllerに`stopBugAutoExecution`メソッドを追加する

### Requirement 5: 共有ストア/クライアント拡張

**Objective:** Remote UIとElectronで共有するストア・APIクライアントを拡張する。

#### Acceptance Criteria

1. **5.1** WebSocketApiClientにBug作成メソッドを追加する
   - The system shall `createBug(description: string, useWorktree: boolean)` メソッドを追加する
   - 既存のhandleCreateBugバックエンドと連携する

2. **5.2** WebSocketApiClientにBug自動実行メソッドを追加する
   - The system shall `startBugAutoExecution(bugPath: string, permissions: BugAutoPermissions)` メソッドを追加する
   - The system shall `stopBugAutoExecution(bugPath: string)` メソッドを追加する

3. **5.3** remoteBugStoreを拡張する
   - The system shall `createBug` アクションを追加する
   - The system shall `useWorktree` 状態と `setUseWorktree` アクションを追加する

4. **5.4** remoteBugAutoExecutionStoreを作成または拡張する
   - The system shall Bug自動実行の状態管理ストアを実装する
   - 状態: `isAutoExecuting`, `currentPhase`, `permissions`, `error`

## Out of Scope

- Spec自動実行機能の拡張（既に実装済み）
- ドキュメントレビュー機能（別Specで対応）
- ArtifactEditor機能（別Specで対応）
- SSHリモートプロジェクト対応（Remote UIの範囲外）

## Open Questions

1. Bug自動実行中にブラウザを閉じた場合の動作（バックエンドは継続実行？）
2. Worktree作成失敗時のエラーハンドリング詳細
3. Smartphone版でのWorktreeバッジ表示位置（スペース制約）
