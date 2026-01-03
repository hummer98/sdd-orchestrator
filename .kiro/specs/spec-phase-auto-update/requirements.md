# Requirements Document

## Introduction

InspectionがGO判定で完了した際、およびデプロイ完了時に、Electronアプリ側でspec.json.phaseを自動更新し、左ペインのSpecリストに「検査完了」「デプロイ完了」ステータスを表示する機能。SpecPhase型にinspection-completeとdeploy-completeを追加し、specsWatcherServiceでinspection GO判定/deploy_completed検出時にphaseを自動更新する。

## Scope

### Remote UI対応
- **対応範囲**: Remote UIでも同じ「検査完了」「デプロイ完了」ステータスを表示する
- **通知方式**: specsWatcherServiceによるphase自動更新は、WebSocket経由でRemote UIにもプッシュ通知する
- **制限事項**: Remote UIからのphase変更操作は不可（表示のみ）

## Requirements

### Requirement 1: SpecPhase型の拡張

**Objective:** 開発者として、検査完了とデプロイ完了の状態を型安全に管理したい。これにより、SDDワークフローの終盤フェーズを明確に追跡できる。

#### Acceptance Criteria
1. The SpecPhase type shall include `inspection-complete` as a valid phase value
2. The SpecPhase type shall include `deploy-complete` as a valid phase value
3. When spec.json is loaded, the SDD Orchestrator shall validate the phase field against the extended SpecPhase type

### Requirement 2: Inspection完了時のphase自動更新

**Objective:** ユーザーとして、InspectionがGO判定で完了したときにspec.jsonのphaseが自動更新されてほしい。これにより、手動でのステータス更新が不要になる。

#### Acceptance Criteria
1. When specsWatcherService detects a new inspection file with GO judgment, the SDD Orchestrator shall update spec.json.phase to `inspection-complete`
2. When inspection file contains NO-GO judgment, the SDD Orchestrator shall not update spec.json.phase
3. When spec.json.phase is updated to `inspection-complete`, the SDD Orchestrator shall emit a phase change event
4. If inspection file parsing fails, the SDD Orchestrator shall log an error and not update spec.json.phase

### Requirement 3: デプロイ完了時のphase自動更新

**Objective:** ユーザーとして、デプロイが完了したときにspec.jsonのphaseが自動更新されてほしい。これにより、機能開発の完了状態を正確に追跡できる。

#### Acceptance Criteria
1. When specsWatcherService detects a `deploy_completed` marker, the SDD Orchestrator shall update spec.json.phase to `deploy-complete`
2. When spec.json.phase is updated to `deploy-complete`, the SDD Orchestrator shall emit a phase change event
3. If deploy_completed detection fails, the SDD Orchestrator shall log an error and not update spec.json.phase

### Requirement 4: SpecListでのステータス表示

**Objective:** ユーザーとして、左ペインのSpecリストで「検査完了」「デプロイ完了」のステータスを視覚的に確認したい。これにより、各Specの進捗状況を一目で把握できる。

#### Acceptance Criteria
1. When a Spec has phase `inspection-complete`, the SpecList component shall display 「検査完了」 status indicator
2. When a Spec has phase `deploy-complete`, the SpecList component shall display 「デプロイ完了」 status indicator
3. The status indicators for `inspection-complete` and `deploy-complete` shall be visually distinct from other phase statuses
4. When phase changes from `inspection-complete` to `deploy-complete`, the SpecList component shall update the status indicator without requiring manual refresh

### Requirement 5: Remote UIへのプッシュ通知

**Objective:** リモートユーザーとして、Desktop UIと同じ「検査完了」「デプロイ完了」ステータスをRemote UIでも確認したい。これにより、リモートからでもSDDワークフローの進捗を把握できる。

#### Acceptance Criteria
1. When spec.json.phase is updated to `inspection-complete`, the SDD Orchestrator shall send a WebSocket notification to all connected Remote UI clients
2. When spec.json.phase is updated to `deploy-complete`, the SDD Orchestrator shall send a WebSocket notification to all connected Remote UI clients
3. When Remote UI receives a phase change notification, the Remote UI shall update the Spec list display
4. The Remote UI shall display the same status indicators (「検査完了」「デプロイ完了」) as the Desktop UI
5. If WebSocket connection is lost, the Remote UI shall not receive real-time updates but shall display the current state when reconnected

### Requirement 6: specsWatcherServiceの拡張

**Objective:** 開発者として、specsWatcherServiceでinspection結果とデプロイ完了を検出したい。これにより、既存のファイル監視インフラを活用してphase自動更新を実現できる。

#### Acceptance Criteria
1. The specsWatcherService shall detect spec.json changes and parse the inspection field
2. When spec.json.inspection field is updated with GO judgment, the specsWatcherService shall parse the roundDetails to determine GO/NO-GO judgment
3. The specsWatcherService shall monitor for deploy_completed marker in the spec directory
4. While monitoring is active, the specsWatcherService shall detect file changes within 2 seconds of file write completion
5. If multiple inspection rounds exist, the specsWatcherService shall use the latest round in spec.json.inspection.roundDetails to determine the current inspection status

### Requirement 7: ワークフロー整合性

**Objective:** 開発者として、新しいphase値が既存のワークフロー遷移ロジックと整合することを保証したい。これにより、予期しない状態遷移やUIの不整合を防止できる。

#### Acceptance Criteria
1. The phase `inspection-complete` shall only be set after phase is `implementation-complete` or later
2. The phase `deploy-complete` shall only be set after phase is `inspection-complete`
3. When phase is `deploy-complete`, the WorkflowView shall display the Spec as fully completed
4. If an invalid phase transition is attempted, the SDD Orchestrator shall log a warning and reject the transition
