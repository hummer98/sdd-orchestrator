# Requirements Document

## Project Description (Input)
AutoExecutionServiceのステート管理を完全にSpec毎に分離し、複数Specの並行実行を可能にする。現状、自動実行中に別のSpecを選択すると、選択中のspecDetailを参照してしまい誤ったSpecに対してAgentが実行されるバグがある。Spec毎に独立した実行コンテキストを持つことで、この問題を解決し、将来的な並行実行にも対応する。

## Introduction

本仕様は、SDD OrchestratorのAutoExecutionServiceにおける並行Spec実行を可能にするためのアーキテクチャ改善を定義する。現在のシングルトン設計では、1つのSpecの自動実行中に別のSpecを選択すると、`specStore.specDetail`の参照が変わり、誤ったSpecに対してAgentが実行される深刻なバグが存在する。

この問題を解決するため、Spec毎に独立した実行コンテキスト（ExecutionContext）を導入し、各Specの実行状態を分離して管理する。これにより、将来的な複数Specの並行実行にも対応可能なアーキテクチャを実現する。

## Requirements

### Requirement 1: Spec毎の実行コンテキスト分離

**Objective:** 開発者として、各Specが独立した実行コンテキストを持つことで、自動実行中の状態管理バグを解消し、安定したワークフロー実行を実現したい。

#### Acceptance Criteria

1. The AutoExecutionService shall maintain a separate ExecutionContext for each specId.
2. When 自動実行を開始する, the AutoExecutionService shall create a new ExecutionContext bound to the specId.
3. When Agent完了イベントを受信する, the AutoExecutionService shall resolve the specId from the agentId and update the corresponding ExecutionContext.
4. While 別のSpecが選択されている, the AutoExecutionService shall continue processing the original Spec's ExecutionContext without referencing specStore.specDetail.
5. When ExecutionContextを作成する, the AutoExecutionService shall snapshot the specDetail at that time and store it within the context.
6. The ExecutionContext shall include the following state: specId, specDetail snapshot, currentPhase, executionStatus, trackedAgentIds, executedPhases, errors, and startTime.

### Requirement 2: AgentIdからSpecIdへのマッピング

**Objective:** システムとして、Agent完了イベントから正確にSpecを特定し、正しいExecutionContextを更新できるようにしたい。

#### Acceptance Criteria

1. The AutoExecutionService shall maintain a Map<agentId, specId> for tracking agent-to-spec relationships.
2. When executePhaseがagentIdを返す, the AutoExecutionService shall register the agentId-specId mapping.
3. When IPC経由でAgent完了イベントを受信する, the AutoExecutionService shall lookup the specId from the agentId mapping.
4. If agentIdがマッピングに存在しない, the AutoExecutionService shall buffer the event for later processing.
5. When 自動実行が停止する, the AutoExecutionService shall clean up the agentId-specId mappings for that spec.
6. The AutoExecutionService shall support document-review and document-review-reply agents in the agentId-specId mapping.

### Requirement 3: 複数Spec実行の独立性保証

**Objective:** 開発者として、複数のSpecが同時に実行中でも互いに干渉しないことを保証したい。

#### Acceptance Criteria

1. While Spec Aの自動実行中, when Spec Bの自動実行を開始する, the AutoExecutionService shall manage both ExecutionContexts independently.
2. When Spec Aのフェーズが完了する, the AutoExecutionService shall only update Spec A's ExecutionContext.
3. When Spec Aがエラーで停止する, the AutoExecutionService shall continue Spec B's execution without interruption.
4. The AutoExecutionService shall allow a maximum of 5 concurrent spec executions.
5. If 並行実行上限に達した, the AutoExecutionService shall reject new auto-execution requests with an appropriate error message.
6. Each ExecutionContext shall have independent timeout management.

### Requirement 4: specStore.specDetail依存の排除

**Objective:** システムとして、自動実行ロジックがグローバルなspecStore.specDetailに依存しないようにしたい。

#### Acceptance Criteria

1. The AutoExecutionService shall not reference specStore.specDetail during phase execution after the initial snapshot.
2. When validatePreconditionsを実行する, the AutoExecutionService shall use the ExecutionContext's snapshotted specDetail.
3. When handleAgentCompletedを実行する, the AutoExecutionService shall use the ExecutionContext's specId to fetch fresh spec.json via IPC.
4. When autoApproveCompletedPhaseを実行する, the AutoExecutionService shall use the ExecutionContext's specPath instead of specStore.specDetail.metadata.path.
5. The ExecutionContext shall store the specPath as part of the snapshot for IPC operations.

### Requirement 5: UI状態の正確な反映

**Objective:** ユーザーとして、選択中のSpecの自動実行状態をUIで正確に確認でき、別のSpecを選択しても表示が正しく切り替わることを期待する。

#### Acceptance Criteria

1. When ユーザーがSpecを選択する, the UI shall display the auto-execution status from that Spec's ExecutionContext.
2. While Spec Aが自動実行中, when ユーザーがSpec Bを選択する, the UI shall show Spec B's auto-execution status (idle if not running).
3. When ユーザーがSpec Aに戻る, the UI shall show Spec A's current auto-execution status accurately.
4. The specStore shall provide a method to get auto-execution runtime state by specId.
5. The WorkflowView component shall subscribe to the selected spec's auto-execution state only.

### Requirement 6: クリーンアップとライフサイクル管理

**Objective:** システムとして、自動実行完了時やエラー時に適切にリソースをクリーンアップしたい。

#### Acceptance Criteria

1. When 自動実行が完了する, the AutoExecutionService shall clean up the ExecutionContext after a 2-second delay.
2. When 自動実行がエラーで停止する, the AutoExecutionService shall preserve the ExecutionContext for retry purposes.
3. When ユーザーが手動で停止する, the AutoExecutionService shall immediately clean up the ExecutionContext and agentId mappings.
4. When アプリケーションが終了する, the AutoExecutionService shall dispose all ExecutionContexts and clear all timeouts.
5. The AutoExecutionService shall expose a method to force-cleanup all execution contexts for testing purposes.

### Requirement 7: 後方互換性の維持

**Objective:** 開発者として、既存のAPIと動作を可能な限り維持し、移行コストを最小化したい。

#### Acceptance Criteria

1. The AutoExecutionService shall maintain the existing public API: start(), stop(), retryFrom(), startWithSpecState().
2. The AutoExecutionService shall continue to support the existing spec.json autoExecution field structure.
3. The getAutoExecutionService() function shall continue to return a singleton instance.
4. The existing notification patterns shall be preserved for phase completion and error handling.
5. If 単一Specのみが実行中, the behavior shall be identical to the current implementation.
