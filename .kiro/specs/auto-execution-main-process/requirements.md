# Requirements Document

## Introduction

本仕様は、自動実行ロジック（AutoExecutionService）をRenderer ProcessからMain Processに移動するための要件を定義する。現在のアーキテクチャでは、AutoExecutionServiceがrenderer側に存在し、エージェント完了検出やagentStoreとの同期に問題が発生している。本リファクタリングにより、SSoT（Single Source of Truth）を明確にし、メインプロセスでエージェント状態を一元管理する。

## Scope

### Remote UI対応

- **Remote UI対応**: あり（オプションA）
- **Remote UIで利用可能な操作**:
  - 自動実行の開始/停止
  - 自動実行の状態監視
  - エージェント完了通知の受信

### Desktop UIとRemote UIの機能差

| 機能 | Desktop UI | Remote UI |
|------|-----------|-----------|
| 自動実行の開始 | 可能 | 可能 |
| 自動実行の停止 | 可能 | 可能 |
| 自動実行状態の監視 | リアルタイム | WebSocket経由でリアルタイム |
| 自動実行設定の変更 | 可能 | 可能 |
| フェーズ別の許可設定 | 可能 | 可能 |

## Requirements

### Requirement 1: 自動実行サービスのメインプロセス移行

**Objective:** As a 開発者, I want 自動実行ロジックをメインプロセスで一元管理する, so that エージェント状態のSSoTが明確になり、IPCイベントとファイル監視の同期問題が解消される

#### Acceptance Criteria

1. When AutoExecutionServiceが初期化される, the specManagerService shall メインプロセス内で自動実行の状態を管理する
2. When エージェントが完了する, the specManagerService shall 次フェーズの開始判定をメインプロセス内で行う
3. The specManagerService shall エージェント完了イベントを直接受信し、rendererへのIPC経由なしで処理する
4. If renderer側に自動実行ロジックが残存している場合, the システム shall 実行時エラーとしてログに警告を出力する
5. The specManagerService shall 自動実行の状態変更をrendererにIPC経由で通知する

### Requirement 2: エージェント完了検出とフェーズ遷移

**Objective:** As a SDD Orchestrator, I want エージェント完了を確実に検出して次フェーズに遷移する, so that 自動実行が中断なく継続される

#### Acceptance Criteria

1. When agentRegistryがエージェント完了を通知する, the specManagerService shall 該当Specの現在フェーズを判定する
2. When エージェントが正常完了し、かつ自動実行が有効である, the specManagerService shall 次フェーズを自動的に開始する
3. When エージェントがエラー終了する, the specManagerService shall 自動実行を停止し、エラー状態をrendererに通知する
4. While 自動実行が実行中である, the specManagerService shall 現在実行中のフェーズ情報を保持する
5. When フェーズが完了し、かつ該当フェーズの自動承認が許可されている, the specManagerService shall 自動的に承認処理を実行する

### Requirement 3: Renderer側の役割制限

**Objective:** As a Renderer Process, I want UI表示と開始/停止トリガーのみを担当する, so that 責務が明確になりメンテナンス性が向上する

#### Acceptance Criteria

1. The Renderer shall 自動実行の開始/停止をIPCハンドラ経由でメインプロセスにリクエストする
2. The Renderer shall 自動実行の状態をメインプロセスからのIPC通知で受信する
3. The Renderer shall agentStoreの情報を直接参照せず、メインプロセスから通知された情報を表示する
4. When ユーザーが自動実行を開始する, the Renderer shall `startAutoExecution` IPCを呼び出す
5. When ユーザーが自動実行を停止する, the Renderer shall `stopAutoExecution` IPCを呼び出す

### Requirement 4: IPC通信設計

**Objective:** As a システム設計者, I want 自動実行に関するIPC通信を整備する, so that Desktop UIとRemote UIの両方で一貫した操作が可能になる

#### Acceptance Criteria

1. The Main Process shall `startAutoExecution(specPath, options)` IPCハンドラを提供する
2. The Main Process shall `stopAutoExecution(specPath)` IPCハンドラを提供する
3. The Main Process shall `getAutoExecutionStatus(specPath)` IPCハンドラを提供する
4. When 自動実行の状態が変化する, the Main Process shall `AUTO_EXECUTION_STATUS_CHANGED` イベントをrendererに送信する
5. When フェーズが完了する, the Main Process shall `PHASE_COMPLETED` イベントをrendererに送信する
6. When エラーが発生する, the Main Process shall `AUTO_EXECUTION_ERROR` イベントをrendererに送信する

### Requirement 5: Remote UI対応（WebSocket通信）

**Objective:** As a リモートユーザー, I want Remote UIから自動実行を操作・監視する, so that ブラウザからSDDワークフローを制御できる

#### Acceptance Criteria

1. The webSocketHandler shall `autoExecution:start` メッセージを受信し、メインプロセスの自動実行を開始する
2. The webSocketHandler shall `autoExecution:stop` メッセージを受信し、メインプロセスの自動実行を停止する
3. The webSocketHandler shall `autoExecution:status` メッセージを受信し、現在の自動実行状態を返す
4. When 自動実行の状態が変化する, the webSocketHandler shall 接続中の全Remote UIクライアントに状態変更を通知する
5. When フェーズが完了する, the webSocketHandler shall 接続中の全Remote UIクライアントに完了通知を送信する
6. When エラーが発生する, the webSocketHandler shall 接続中の全Remote UIクライアントにエラー通知を送信する

### Requirement 6: Remote UI側コンポーネント

**Objective:** As a Remote UIユーザー, I want 自動実行の状態を視覚的に確認し操作する, so that Desktop UIと同等の体験が得られる

#### Acceptance Criteria

1. The Remote UI shall 自動実行の開始/停止ボタンを表示する
2. The Remote UI shall 現在実行中のフェーズをリアルタイムで表示する
3. The Remote UI shall 自動実行の進捗状態（pending/executing/completed/error）を視覚的に表示する
4. When WebSocket接続が確立される, the Remote UI shall 現在の自動実行状態を取得して表示する
5. When WebSocket経由で状態変更通知を受信する, the Remote UI shall 表示を即座に更新する
6. If WebSocket接続が切断された場合, the Remote UI shall 再接続時に最新状態を再取得する

### Requirement 7: 状態同期とSSoT

**Objective:** As a システム, I want メインプロセスを自動実行状態のSSoTとして機能させる, so that 全クライアント（Desktop/Remote）が一貫した状態を参照できる

#### Acceptance Criteria

1. The specManagerService shall 自動実行の状態を単一のデータ構造で管理する
2. When 状態が変更される, the specManagerService shall Desktop UIとRemote UI両方に同時に通知する
3. The specManagerService shall 新規接続クライアントに現在の状態を提供する
4. If ファイル監視で変更が検出された場合, the specManagerService shall 自動実行の継続可否を判定する
5. While 複数クライアントが接続している, the specManagerService shall 全クライアントで一貫した状態を維持する

### Requirement 8: エラーハンドリングとリカバリー

**Objective:** As a ユーザー, I want エラー発生時に適切な通知とリカバリー手段を得る, so that 問題を迅速に特定し解決できる

#### Acceptance Criteria

1. When エージェントプロセスがクラッシュする, the specManagerService shall 自動実行を停止し、エラー状態を記録する
2. When エージェントがタイムアウトする, the specManagerService shall 設定されたタイムアウト時間経過後に自動実行を停止する
3. When spec.jsonの読み取りに失敗する, the specManagerService shall エラーをログに記録し、自動実行を一時停止する
4. If 自動実行がエラーで停止した場合, the UI shall エラーの詳細と再開オプションを表示する
5. When ユーザーが再開を選択する, the specManagerService shall エラーが発生したフェーズから自動実行を再開する

### Requirement 9: 後方互換性

**Objective:** As a 既存ユーザー, I want 既存のワークフローが引き続き動作する, so that 移行による影響を最小限に抑えられる

#### Acceptance Criteria

1. The 新しいIPC API shall 既存のIPCチャンネル名と互換性を維持する
2. The specManagerService shall 既存のspec.json形式をそのまま使用する
3. When 旧バージョンのクライアントが接続する, the システム shall 互換モードで動作する
4. The ログ出力 shall 既存のログフォーマットを維持する
5. The E2Eテスト shall 既存のテストケースがパスすることを保証する
