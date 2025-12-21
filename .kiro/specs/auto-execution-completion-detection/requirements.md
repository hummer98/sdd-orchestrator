# Requirements Document

## Introduction

AutoExecutionServiceのAgent完了検知アーキテクチャを改修する。

現状の問題:
- AutoExecutionServiceがZustand store subscriptionを使ってAgent完了を検知しているが、Mock CLIが高速完了する場合にrunning→completed状態遷移を検知できない
- 間接的な監視（IPC → AgentStore → AutoExecutionService）により、レースコンディションが発生しやすい

推奨解決策:
- AutoExecutionServiceがIPC（onAgentStatusChange）を直接購読し、自身が起動したAgentのIDを明示的に追跡
- 状態遷移に依存せず、status === 'completed' のみで完了判定

## Requirements

### Requirement 1: IPC直接購読によるAgent完了検知

**Objective:** 開発者として、AutoExecutionServiceがAgent完了を確実に検知できるようにしたい。これにより、Mock CLIのような高速完了時でもレースコンディションなく自動実行フローが継続される。

#### Acceptance Criteria

1. When AutoExecutionServiceが初期化されたとき, the AutoExecutionService shall IPC（onAgentStatusChange）を直接購読する
2. When onAgentStatusChangeイベントを受信したとき, the AutoExecutionService shall 受信したAgentIdが自身が起動したAgentかどうかを判定する
3. When 自身が起動したAgentのステータスが'completed'になったとき, the AutoExecutionService shall 次フェーズの実行または自動実行完了処理を開始する
4. When 自身が起動したAgentのステータスが'error'になったとき, the AutoExecutionService shall 自動実行を停止してエラー状態をUIに通知する
5. The AutoExecutionService shall Zustand store subscriptionへの依存を排除し、IPC直接購読のみで完了検知を行う

### Requirement 2: AgentId追跡による明示的な実行管理

**Objective:** 開発者として、AutoExecutionServiceが自身で起動したAgentを明示的に追跡できるようにしたい。これにより、他のソースから起動されたAgentと区別でき、意図しない完了検知を防げる。

#### Acceptance Criteria

1. When AutoExecutionServiceがAgentを起動したとき, the AutoExecutionService shall 起動したAgentのAgentIdを内部で保持する
2. When 自動実行フローが完了または中断されたとき, the AutoExecutionService shall 保持しているAgentIdをクリアする
3. While 自動実行中の場合, the AutoExecutionService shall 保持しているAgentIdと一致するステータス変更のみを処理する
4. The AutoExecutionService shall 複数のAgentIdを順番に追跡できる（フェーズごとに新しいAgentが起動されるため）

### Requirement 3: 状態遷移に依存しない完了判定

**Objective:** 開発者として、状態遷移（running→completed）に依存せず、最終状態のみで完了を判定できるようにしたい。これにより、高速完了時のイベント欠落問題を解消する。

#### Acceptance Criteria

1. When onAgentStatusChangeでstatus === 'completed'を受信したとき, the AutoExecutionService shall 直前の状態に関わらず完了処理を実行する
2. When onAgentStatusChangeでstatus === 'error'を受信したとき, the AutoExecutionService shall 直前の状態に関わらずエラー処理を実行する
3. The AutoExecutionService shall 'running'状態の検知に依存せずに動作する
4. If 'running'状態が検知された場合, the AutoExecutionService shall UIへの実行中表示更新のみを行い、完了検知ロジックには使用しない

### Requirement 4: レースコンディション耐性

**Objective:** 開発者として、Mock CLIのような高速完了（ミリ秒オーダー）でも正しく動作する実装にしたい。これにより、E2Eテストでの再現性が向上する。

#### Acceptance Criteria

1. When Agentが起動直後に完了した場合（running状態を経由しない高速完了）, the AutoExecutionService shall 完了を正しく検知して次フェーズに進む
2. When 複数のステータスイベントが短時間に連続して発生した場合, the AutoExecutionService shall 全てのイベントを順番に処理する
3. The AutoExecutionService shall Agent起動とステータス購読の間にタイミングの隙間がないよう実装する
4. While E2Eテストでmock-claude.shを使用している場合, the AutoExecutionService shall 0.1秒未満の完了でも正しく検知する

### Requirement 5: 既存機能との互換性

**Objective:** 開発者として、既存のUI動作や手動実行フローに影響を与えずに改修を行いたい。これにより、リグレッションを防止する。

#### Acceptance Criteria

1. The AutoExecutionService shall 手動フェーズ実行（Requirements/Design/Tasks/Implボタンクリック）時は既存の動作を維持する
2. When 自動実行中にユーザーが停止ボタンをクリックしたとき, the AutoExecutionService shall 即座に自動実行を中断しAgentId追跡をクリアする
3. The AutoExecutionService shall WorkflowView、PhaseItem、ApprovalPanelの表示更新は既存のZustandストア経由で行う（完了検知のみIPC直接購読）
4. When Agent実行が完了したとき, the AutoExecutionService shall AgentListPanel、AgentLogPanelへの表示は既存の仕組みで更新される
