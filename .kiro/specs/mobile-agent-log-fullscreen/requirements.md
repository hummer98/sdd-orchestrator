# Requirements: Mobile Agent Log Fullscreen

## Decision Log

### ドロワー形式から全画面表示への変更

- **Discussion**: スマートフォン版のAgentLogは現在 `AgentDetailDrawer` でボトムからスライドアップするオーバーレイとして表示している。ユーザーからドロワー形式を中止して全画面表示にしたいとの要望。
- **Conclusion**: ドロワー形式を廃止し、全画面表示の `AgentLogPage` コンポーネントを新規作成する。
- **Rationale**: 全画面表示によりログの視認性が向上し、操作性も改善される。

### ヘッダー構成

- **Discussion**: 全画面版のヘッダー構成について、シンプルな1段構成か、ナビゲーションバー + AgentLogPanelヘッダーの2段構成か。
- **Conclusion**: 2段構成を採用。上段にナビゲーションバー（戻るボタン）、下段に現在のAgentLogPanelヘッダー（Agent Log - phase [Engine] など）。
- **Rationale**: 既存のAgentLogPanelコンポーネントを再利用しつつ、ナビゲーション機能を追加できる。

### 戻るボタンのラベル

- **Discussion**: ナビゲーションバーの戻るボタンのラベル形式（アイコンのみ / アイコン+テキスト / アイコン+遷移元タイトル）。
- **Conclusion**: アイコンのみ（← ）とする。
- **Rationale**: 他のDetailPage（SpecDetailPage、BugDetailPage）と同様のパターンで統一。

### 遷移元

- **Discussion**: AgentLogPageへの遷移元を特定。
- **Conclusion**: SpecDetailPage、BugDetailPage、AgentsTabViewの3箇所すべてから遷移可能とする。
- **Rationale**: ユーザーがどの画面からでもAgent詳細を確認できるようにする。

### アクションボタンの扱い

- **Discussion**: 現在のDrawerにある「追加の指示を入力」フィールド、「送信」ボタン、「続行」ボタンを全画面版でも維持するか。
- **Conclusion**: 維持する（画面下部に固定）。
- **Rationale**: Agent操作機能は全画面版でも必要。

### コンポーネント名

- **Discussion**: 新しい全画面コンポーネントの名前。
- **Conclusion**: `AgentLogPage` とする。
- **Rationale**: 他のDetailPageに合わせた命名規則（SpecDetailPage、BugDetailPage）。

## Introduction

スマートフォン版Remote UIにおいて、Agentログ表示をボトムドロワー形式から全画面表示に変更する。これにより、ログの視認性と操作性を向上させる。新しい `AgentLogPage` コンポーネントは、ナビゲーションバー（戻るボタン）、ログ表示エリア（スクロール可能）、アクションエリア（指示入力・送信・続行ボタン）で構成される。

## Requirements

### Requirement 1: 全画面表示への切り替え

**Objective:** ユーザーとして、スマートフォンでAgentログを全画面で表示できるようにしたい。ログの視認性を向上させるため。

#### Acceptance Criteria

1. When ユーザーがAgentをタップしたとき, the system shall 全画面の `AgentLogPage` に遷移する
2. The system shall 現在の `AgentDetailDrawer` コンポーネントをモバイル版で使用しなくなる
3. The system shall `AgentLogPage` を `remote-ui/components/` に配置する

### Requirement 2: ナビゲーションバー

**Objective:** ユーザーとして、全画面表示から元の画面に戻れるようにしたい。

#### Acceptance Criteria

1. The system shall 画面上部にナビゲーションバーを表示する
2. The system shall ナビゲーションバーの左端に戻るボタン（← アイコン）を表示する
3. When ユーザーが戻るボタンをタップしたとき, the system shall 遷移元の画面（SpecDetailPage / BugDetailPage / AgentsTabView）に戻る
4. The system shall ナビゲーションバーと既存のAgentLogPanelヘッダーの2段構成とする

### Requirement 3: ログ表示エリア

**Objective:** ユーザーとして、ログエリアのみをスクロールして閲覧したい。

#### Acceptance Criteria

1. The system shall ログエリアのみをスクロール可能とする
2. The system shall ナビゲーションバーとアクションエリアは固定表示とする
3. The system shall 既存の `AgentLogPanel` コンポーネントを再利用する
4. The system shall 新しいログが追加されたとき、自動的に最下部にスクロールする（ユーザーが上部を閲覧中でない場合）

### Requirement 4: アクションエリア

**Objective:** ユーザーとして、全画面表示でもAgentに指示を送信できるようにしたい。

#### Acceptance Criteria

1. The system shall 画面下部にアクションエリアを固定表示する
2. The system shall 「追加の指示を入力」テキストフィールドを表示する
3. The system shall 「送信」ボタンを表示する
4. The system shall 「続行」ボタンを表示する
5. If Agentが実行中の場合, then the system shall 入力フィールドとボタンを無効化する
6. If AgentにsessionIdがない場合, then the system shall 入力フィールドとボタンを無効化する

### Requirement 5: 遷移元の統合

**Objective:** ユーザーとして、どの画面からでもAgentログを全画面表示できるようにしたい。

#### Acceptance Criteria

1. The system shall SpecDetailPage内のAgent一覧からAgentLogPageへ遷移できる
2. The system shall BugDetailPage内のAgent一覧からAgentLogPageへ遷移できる
3. The system shall AgentsTabView（Agentsタブ）からAgentLogPageへ遷移できる
4. The system shall useNavigationStackフックを拡張してAgentLogPageへの遷移をサポートする

### Requirement 6: AgentDetailDrawerの廃止

**Objective:** ドロワー形式を完全に廃止し、全画面表示に統一する。

#### Acceptance Criteria

1. The system shall モバイル版で `AgentDetailDrawer` を使用しなくなる
2. The system shall Desktop版の動作に影響を与えない（Desktop版では引き続きFooterContent使用）

## Out of Scope

- Desktop版のAgentログ表示変更（引き続きフッターエリアで表示）
- AgentDetailDrawerコンポーネントの削除（将来的に必要になる可能性があるため保持）
- ログのフィルタリング機能
- ログの検索機能

## Open Questions

- なし（対話で全て解決済み）
