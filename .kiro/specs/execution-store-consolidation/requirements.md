# Requirements: Execution Store Consolidation

## Decision Log

### 統合方針

- **Discussion**: specManagerExecutionStoreを維持しつつ派生値をagentStoreから取得する案 vs 完全廃止してagentStoreに統合する案
- **Conclusion**: specManagerExecutionStoreを完全廃止してagentStoreに統合
- **Rationale**: specManagerExecutionStoreの状態（isRunning, implTaskStatus, currentPhase, currentSpecId）はほぼすべてagentStoreのagent情報から導出可能。独自の状態がほぼなく、2つのStore間で同期が必要になることがSSOT違反の原因となっている

### 複数実行のサポート

- **Discussion**: 同時に複数のspec-manager操作を実行することがあるか
- **Conclusion**: ありえる（例: spec-Aのimplを実行中にspec-Bのrequirementsを実行）
- **Rationale**: 現在のspecManagerExecutionStoreは単一の実行状態しか保持できないため、複数実行時に破綻する。agentStoreのMap構造なら複数specのagentを自然に管理できる

### Remote UIへの影響

- **Discussion**: 統合がRemote UIに影響するか
- **Conclusion**: 影響なし
- **Rationale**: specManagerExecutionStoreはsrc/renderer/stores/にのみ存在し、src/shared/やsrc/remote-ui/では使用されていない

### UIコンポーネントへの影響

- **Discussion**: UIコンポーネントの変更範囲
- **Conclusion**: specStoreFacade経由で吸収可能
- **Rationale**: WorkflowViewはuseSpecStore()経由でspecManagerExecutionを取得しており、Facade内部を変更すればUIへの影響は最小限

### checkResult/ImplCompletionAnalyzerの廃止

- **Discussion**: checkResult（impl完了時のタスク分析結果）をagentに移行するか、廃止するか
- **Conclusion**: checkResultおよびImplCompletionAnalyzerを完全廃止
- **Rationale**:
  - checkResultはログをClaude APIで解析して「完了したタスク」を推測しているが、tasks.mdのチェックボックスがSSOTとして既に存在する
  - TaskProgress（tasks.mdから計算）とcheckResultの二重管理はSSOT違反
  - ログからの推測は信頼性が低く、Claude APIコストも発生する
  - UI表示は既存のTaskProgressのプログレスバーで十分

## Introduction

specManagerExecutionStoreとagentStoreで「エージェント実行中」という同じ事実を二重管理しているSSOT違反を解消する。specManagerExecutionStoreを廃止し、実行状態をagentStoreに一元化することで、状態の不整合（エージェント完了後もUI が「実行中」表示のまま）を構造的に防止する。

また、checkResult/ImplCompletionAnalyzerを廃止し、タスク完了状態の管理をtasks.md（TaskProgress）に一本化する。

## Requirements

### Requirement 1: specManagerExecutionStore廃止

**Objective:** As a 開発者, I want 実行状態の管理を一箇所に集約したい, so that 状態の不整合が構造的に発生しなくなる

#### Acceptance Criteria

1. When specManagerExecutionStoreが削除されたとき, the system shall agentStoreのみで実行状態を管理する
2. The system shall specManagerExecutionStore.tsファイルを削除する
3. The system shall specManagerExecutionStore.test.tsファイルを削除する
4. The system shall spec/types.tsからSpecManagerExecutionState, SpecManagerExecutionActions型を削除する

### Requirement 2: AgentInfo型の拡張

**Objective:** As a 開発者, I want agent情報に実行コンテキストを含めたい, so that 実行状態がagentに紐づいて管理される

#### Acceptance Criteria

1. The system shall AgentInfo型にexecutionMode?: 'auto' | 'manual'フィールドを追加する
2. The system shall AgentInfo型にretryCount?: numberフィールドを追加する
3. When agentが作成されるとき, the system shall executionModeを設定する

### Requirement 3: 派生値の計算

**Objective:** As a UIコンポーネント, I want agentStoreから実行状態を派生値として取得したい, so that SSOTが達成される

#### Acceptance Criteria

1. The system shall isRunning(specId)をgetRunningAgentCount(specId) > 0から導出する
2. The system shall implTaskStatusをagent.statusから導出する（running→'running', completed→'success', failed→'error'）
3. The system shall currentPhaseをrunning agentのphaseから取得する
4. When 複数のagentが同一specで実行中のとき, the system shall 全てのagentの状態を考慮する

### Requirement 4: specStoreFacadeの更新

**Objective:** As a UIコンポーネント, I want 既存のインターフェースを維持したまま内部実装を変更したい, so that UIの変更が最小限になる

#### Acceptance Criteria

1. The system shall useSpecStore()が返すspecManagerExecutionオブジェクトの形状を維持する（lastCheckResult除く）
2. When specManagerExecution.isRunningが参照されたとき, the system shall agentStoreから派生値を計算して返す
3. When specManagerExecution.implTaskStatusが参照されたとき, the system shall agentStoreから派生値を計算して返す
4. The system shall executeSpecManagerGeneration()をagentStore経由で実行するよう変更する
5. The system shall updateImplTaskStatus()をagentStoreのstatus更新として実装する
6. The system shall clearSpecManagerError()をagentStoreのerrorクリアとして実装する

### Requirement 5: agentStore.setupEventListenersの修正

**Objective:** As a システム, I want agent完了時に適切に状態を更新したい, so that UIが正しく更新される

#### Acceptance Criteria

1. When onAgentStatusChangeイベントを受信したとき, the system shall agentStoreのagent.statusを更新する
2. When agent.statusがcompletedに変わったとき, the system shall UIが「実行中」表示を解除する
3. The system shall specManagerExecutionStoreへの連携処理を削除する（統合により不要）

### Requirement 6: checkResult/ImplCompletionAnalyzer廃止

**Objective:** As a 開発者, I want タスク完了状態の管理をtasks.mdに一本化したい, so that SSOTが達成される

#### Acceptance Criteria

1. The system shall CheckImplResult型を削除する
2. The system shall ImplCompletionAnalyzer.tsを削除する
3. The system shall ImplCompletionAnalyzer.test.tsを削除する
4. The system shall handleCheckImplResult()アクションを削除する
5. The system shall specManagerExecution.lastCheckResultを削除する
6. The system shall WorkflowViewの「完了したタスク: 1.1, 1.2」表示を削除する
7. The system shall タスク完了状態の表示はTaskProgress（プログレスバー）のみとする

### Requirement 7: テストの更新

**Objective:** As a 開発者, I want 統合後も既存のテストが通ることを確認したい, so that リグレッションを防止できる

#### Acceptance Criteria

1. The system shall specStoreFacade.test.tsを更新してagentStore経由の動作をテストする
2. The system shall WorkflowView.specManager.test.tsを更新して統合後の動作をテストする
3. The system shall agentStore.test.tsに実行状態の派生値テストを追加する
4. The system shall ImplCompletionAnalyzer関連のテストを削除する
5. When 全てのテストが通ったとき, the system shall ビルドが成功する

## Out of Scope

- Remote UI側のstore変更（影響なしのため）
- agentStoreの根本的なリファクタリング（肥大化対策は別途）
- 複数spec同時実行時のUI表示改善（現状維持）
- TaskProgressの改善（別specで対応）

## Open Questions

- specStoreFacadeのsubscribe処理（line 340）の移行方法は設計フェーズで検討
