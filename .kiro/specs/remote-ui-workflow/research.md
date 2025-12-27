# Research & Design Decisions

## Summary
- **Feature**: `remote-ui-workflow`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 既存のRemote UIアーキテクチャは6フェーズ表示に対応済みだが、承認機能とDocument Review操作が欠落
  - WebSocketHandler（webSocketHandler.ts）に新しいメッセージタイプを追加することで機能拡張が可能
  - Desktop UIのDocumentReviewPanelとApprovalPanel実装パターンをRemote UIに移植可能

## Research Log

### 既存Remote UIアーキテクチャ分析

- **Context**: Remote UIが現在どのような機能を持っているか確認
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/webSocketHandler.ts`
  - `electron-sdd-manager/src/main/remote-ui/components.js`
  - `electron-sdd-manager/src/main/remote-ui/websocket.js`
- **Findings**:
  - WebSocketHandlerは既にEXECUTE_PHASE, AUTO_EXECUTE, EXECUTE_DOCUMENT_REVIEWなどをサポート
  - しかし、approvePhase（フェーズ承認）、documentReviewReply（レビュー回答）、updateAutoExecutionFlag（フラグ更新）が未実装
  - Remote UI側のSpecDetailコンポーネントは6フェーズ表示に対応済みだが、承認ボタンがない
  - ブロードキャスト機能（SPECS_UPDATED, AGENT_STATUS等）は既に実装済み
- **Implications**:
  - WebSocketHandlerに5つの新しいメッセージタイプを追加
  - Remote UIのJavaScriptコンポーネントに承認ボタンとDocument Review操作UIを追加

### Desktop UI Document Review実装分析

- **Context**: Remote UIに移植すべきDocument Review機能の理解
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx`
  - `electron-sdd-manager/src/renderer/types/documentReview.ts`
  - `electron-sdd-manager/src/main/services/documentReviewService.ts`
- **Findings**:
  - DocumentReviewState型: rounds, status, currentRound, roundDetailsを持つ
  - ReviewStatus: 'pending', 'in_progress', 'approved', 'skipped'
  - RoundStatus: 'review_complete', 'reply_complete', 'incomplete'
  - 3つのautoExecutionFlag: 'run', 'pause', 'skip'
  - レビュー開始、Reply実行、Fix適用の3つの主要操作
- **Implications**:
  - Remote UIにDocumentReviewStatusコンポーネントを追加
  - autoExecutionFlagセレクタ（3オプション）を実装
  - WebSocket経由でdocumentReviewStart, documentReviewReply, documentReviewFixを送信

### 承認フロー分析

- **Context**: フェーズ承認の仕組みを理解
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/types/index.ts` (ApprovalStatus, SpecJson)
  - `electron-sdd-manager/src/main/services/specManagerService.ts`
- **Findings**:
  - spec.json.approvals.{phase}.generatedがtrueの時に承認ボタンを表示可能
  - 承認するとspec.json.approvals.{phase}.approved = trueに更新
  - 前フェーズがapproved: falseの場合、次フェーズは実行不可（ブロック）
  - 自動実行モード時は承認待ちで一時停止
- **Implications**:
  - Remote UIでgeneratedステータスを検出して承認ボタンを表示
  - 次フェーズボタンは前フェーズ未承認時にdisabled
  - ツールチップで「前フェーズの承認が必要です」を表示

### リアルタイム同期要件

- **Context**: Desktop UIとRemote UI間の状態同期
- **Sources Consulted**:
  - 既存のbroadcast*メソッド（webSocketHandler.ts）
- **Findings**:
  - broadcastAgentOutput, broadcastAgentStatus, broadcastPhaseCompleted等が既存
  - broadcastSpecUpdated（specId, updates）で汎用的なspec更新を通知可能
- **Implications**:
  - 新しいブロードキャストイベント: PHASE_APPROVED, REVIEW_UPDATED, FLAG_UPDATED
  - Remote UIでこれらのイベントを受信してUIを即座に更新

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存WebSocketHandler拡張 | 新しいメッセージタイプを追加 | 既存パターンに沿った実装、コード変更が最小限 | ハンドラが肥大化する可能性 | 採用 |
| 別サービス分離 | WorkflowService等に分離 | 責務分離、テストしやすい | 過剰設計、既存パターンと乖離 | 不採用 |

## Design Decisions

### Decision: WebSocketメッセージタイプの追加

- **Context**: Remote UIからの承認・Document Review操作を処理する必要がある
- **Alternatives Considered**:
  1. REST API追加 - HTTPエンドポイントを追加
  2. WebSocketメッセージタイプ追加 - 既存パターンに沿う
- **Selected Approach**: WebSocketメッセージタイプ追加
- **Rationale**: 既存のRemote UI通信はすべてWebSocket経由。一貫性を維持しつつ、リアルタイム通知も自然に実装可能。
- **Trade-offs**: REST APIなら標準的だがWebSocket接続が前提の現アーキテクチャでは冗長
- **Follow-up**: E2Eテストでメッセージハンドリングを検証

### Decision: Remote UIコンポーネント構造

- **Context**: 新しいUI要素（承認ボタン、Document Reviewパネル）の配置
- **Alternatives Considered**:
  1. SpecDetailコンポーネントに直接追加
  2. 新しいコンポーネントクラスを作成
- **Selected Approach**: 新しいコンポーネントクラス（DocumentReviewStatusComponent）+ SpecDetailの拡張
- **Rationale**: Document Review状態表示は独立したコンポーネントとして再利用可能。承認ボタンはSpecDetailの既存UI拡張として自然。
- **Trade-offs**: コンポーネント数が増えるが、責務分離が明確
- **Follow-up**: components.jsのファイルサイズ監視

### Decision: 次フェーズ実行ブロックの実装方式

- **Context**: 前フェーズ未承認時に次フェーズ実行をブロック
- **Alternatives Considered**:
  1. フロントエンドのみでブロック - UIでボタンをdisabled
  2. バックエンドでもバリデーション - WebSocketハンドラでチェック
- **Selected Approach**: 両方（フロントエンド + バックエンド）
- **Rationale**: UIでの即時フィードバック + APIレベルでの安全保証を両立
- **Trade-offs**: 重複チェックになるが、セキュリティと一貫性を優先
- **Follow-up**: getNextPhase関数にapprovalチェックを追加

## Risks & Mitigations

- **Risk 1**: WebSocketハンドラの肥大化
  - **Mitigation**: 関連メソッドをグループ化、将来的にはWorkflowControllerインターフェースへの委譲を検討

- **Risk 2**: Desktop UI/Remote UI間の状態不整合
  - **Mitigation**: 全ての状態変更をブロードキャストで通知、ポーリングによる定期同期は不要

- **Risk 3**: 接続断時の操作ロス
  - **Mitigation**: 既存のReconnectOverlayで再接続を促す、操作前に接続状態チェック

## References

- [WebSocket Handler実装](../../../electron-sdd-manager/src/main/services/webSocketHandler.ts) - 既存のメッセージハンドリングパターン
- [DocumentReviewPanel](../../../electron-sdd-manager/src/renderer/components/DocumentReviewPanel.tsx) - Desktop UIのDocument Review実装
- [型定義](../../../electron-sdd-manager/src/renderer/types/index.ts) - SpecJson, ApprovalStatus等
