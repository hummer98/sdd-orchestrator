# Requirements: Remote UI Agent Store Initialization

## Decision Log

### 修正スコープ
- **Discussion**: MobileLayoutのみ vs remote-ui全体（Mobile + Desktop）
- **Conclusion**: MobileLayoutとDesktopLayout両方を修正対象とする
- **Rationale**: 同一のコードベースで同じ問題が存在するため、一括修正が合理的

### 初期化タイミング
- **Discussion**: アプリ起動時の初期化 vs タブ表示時の自己初期化
- **Conclusion**: アプリ起動時に`MobileAppContent`/`DesktopAppContent`で初期化
- **Rationale**: 複数箇所でagentStoreを参照するため、一度の初期化で全体をカバーする設計が保守性が高い

### 影響範囲
- **Discussion**: Agentsタブのみ vs agentStore依存箇所すべて
- **Conclusion**: AgentsTabView, SpecDetailPage, BugDetailPageの全てを確認・修正
- **Rationale**: 根本原因がストア初期化の欠落であり、同じ問題が複数箇所に波及しているため

### リアルタイム更新
- **Discussion**: 初期ロードのみ vs WebSocket経由のリアルタイム更新
- **Conclusion**: 既存の`AGENT_STATUS` WebSocketイベントを利用してリアルタイム更新を実装
- **Rationale**: ユーザーがAgent状態変化を即座に確認できることで、操作性が向上する

### ローディング状態の表示
- **Discussion**: ローディングインジケーター表示の有無
- **Conclusion**: ローディングインジケーターを表示する
- **Rationale**: ユーザーにロード中であることを明示し、UXを向上させる

### エラーハンドリング
- **Discussion**: エラーメッセージ表示方法
- **Conclusion**: `notify.error()`でトースト表示 + Pull to Refreshでリトライ可能
- **Rationale**: 既存のエラー通知パターンに統一しつつ、ユーザーが手動リカバリー可能な手段を提供

### Pull to Refreshの対象
- **Discussion**: どの画面にPull to Refreshを適用するか
- **Conclusion**: AgentsTabView, SpecDetailPage, BugDetailPageに適用
- **Rationale**: Agent表示がある全画面で一貫した操作性を提供

### Desktop版のリフレッシュ方法
- **Discussion**: Mobile版と同じPull to Refresh vs ボタン vs 自動更新のみ
- **Conclusion**: Mobile版はPull to Refresh、Desktop版はリフレッシュボタン
- **Rationale**: 各プラットフォームのUIパターンに合致した操作方法を提供

### リフレッシュボタンの配置位置
- **Discussion**: ヘッダー vs Agent一覧セクション内
- **Conclusion**: Agent一覧セクションのヘッダー右端にアイコンボタンを配置
- **Rationale**: Electron版のProjectAgentPanelと同様の配置で一貫性を保つ（Design DD-005で決定）

### Pull to Refreshのスクロール閾値
- **Discussion**: デフォルト値で問題ないか
- **Conclusion**: デフォルト値を採用し、実装時に調整
- **Rationale**: 一般的なモバイルUIパターンに従い、必要に応じて調整可能

## Introduction

Remote UI（Mobile/Desktop）のAgentsタブおよび関連画面でプロジェクトエージェント一覧が表示されない問題を修正する。根本原因は`useSharedAgentStore`が初期化されていないことであり、アプリ起動時の初期化処理追加、WebSocket経由のリアルタイム更新、およびエラー時のリカバリー機能（Pull to Refresh / リフレッシュボタン）を実装する。

## Requirements

### Requirement 1: AgentStoreの初期化

**Objective:** As a remote-uiユーザー, I want Agentsタブを開いたときにプロジェクトエージェント一覧が表示される, so that 現在実行中のエージェントを確認できる

#### Acceptance Criteria
1. When MobileAppContentがマウントされた時, the system shall `useSharedAgentStore.getState().loadAgents(apiClient)`を呼び出してAgent一覧を初期化する
2. When DesktopAppContentがマウントされた時, the system shall `useSharedAgentStore.getState().loadAgents(apiClient)`を呼び出してAgent一覧を初期化する
3. When Agent一覧のロードが完了した時, the system shall agentStoreにデータを格納し、AgentsTabView、SpecDetailPage、BugDetailPageで参照可能にする

### Requirement 2: ローディング状態の表示

**Objective:** As a remote-uiユーザー, I want Agent一覧のロード中にローディングインジケーターが表示される, so that データ取得中であることを認識できる

#### Acceptance Criteria
1. While Agent一覧をロード中, the system shall ローディングインジケーター（スピナー）を表示する
2. When Agent一覧のロードが完了した時, the system shall ローディングインジケーターを非表示にし、Agent一覧を表示する
3. If Agent一覧が空の場合, then the system shall 「プロジェクトエージェントなし」のメッセージを表示する

### Requirement 3: WebSocket経由のリアルタイム更新

**Objective:** As a remote-uiユーザー, I want Agent状態の変化がリアルタイムで画面に反映される, so that 最新のAgent状態を常に確認できる

#### Acceptance Criteria
1. When WebSocketで`AGENT_STATUS`イベントを受信した時, the system shall agentStoreの該当Agentの状態を更新する
2. When agentStoreが更新された時, the system shall AgentsTabView、SpecDetailPage、BugDetailPageの表示を自動更新する
3. When 新しいAgentが開始された時, the system shall Agent一覧に新しいエントリを追加する
4. When Agentが終了した時, the system shall Agent一覧から該当エントリを削除または状態を更新する

### Requirement 4: エラーハンドリングとリカバリー

**Objective:** As a remote-uiユーザー, I want Agent一覧の取得に失敗した場合でもリトライできる, so that 一時的なエラーから回復できる

#### Acceptance Criteria
1. If Agent一覧の取得に失敗した場合, then the system shall `notify.error()`でエラートーストを表示する
2. When Mobile版でユーザーがPull to Refresh操作を行った時, the system shall Agent一覧を再取得する
3. When Desktop版でユーザーがリフレッシュボタンをクリックした時, the system shall Agent一覧を再取得する

### Requirement 5: Pull to Refresh（Mobile版）

**Objective:** As a Mobileユーザー, I want 画面を下に引っ張ってAgent一覧を更新できる, so that 直感的な操作で最新データを取得できる

#### Acceptance Criteria
1. When AgentsTabViewでPull to Refresh操作を行った時, the system shall Agent一覧を再取得する
2. When SpecDetailPageでPull to Refresh操作を行った時, the system shall 該当Specに関連するAgent一覧を再取得する
3. When BugDetailPageでPull to Refresh操作を行った時, the system shall 該当Bugに関連するAgent一覧を再取得する
4. While Pull to Refreshによるリロード中, the system shall リフレッシュインジケーターを表示する

### Requirement 6: リフレッシュボタン（Desktop版）

**Objective:** As a Desktopユーザー, I want リフレッシュボタンでAgent一覧を更新できる, so that 手動で最新データを取得できる

#### Acceptance Criteria
1. The system shall AgentsTabViewにリフレッシュボタンを表示する
2. The system shall SpecDetailPageのAgent表示エリアにリフレッシュボタンを表示する
3. The system shall BugDetailPageのAgent表示エリアにリフレッシュボタンを表示する
4. When リフレッシュボタンがクリックされた時, the system shall Agent一覧を再取得する
5. While リフレッシュ中, the system shall ボタンをローディング状態で表示する

## Out of Scope

- Electron版（renderer）のAgent表示機能の変更
- Agent詳細画面の新規作成
- Agentのフィルタリング・検索機能
- Agentログのリアルタイムストリーミング（既存機能で対応済み）
- WebSocketイベントの新規追加（既存イベントを利用）

## Open Questions

なし（すべてDecision Logで解決済み）
