# Research & Design Decisions: Impl Task Completion Guard

## Summary

- **Feature**: `impl-task-completion-guard`
- **Discovery Scope**: Extension（既存のautoExecutionCoordinatorへの機能追加）
- **Key Findings**:
  - tasks.mdパースロジックは既存のspecsWatcherServiceとtaskParallelParserで確立されている
  - handleAgentCompletedメソッドが適切な拡張ポイント
  - 通知システムはshared/stores/notificationStoreで抽象化されており、Electron/RemoteUI両対応

## Research Log

### tasks.mdパースパターンの調査

- **Context**: tasks.md完了度判定のためのパースロジックが既存で存在するか確認
- **Sources Consulted**:
  - `specsWatcherService.ts` (checkTaskCompletion メソッド)
  - `taskParallelParser.ts` (parseTasksContent関数)
- **Findings**:
  - specsWatcherServiceでは `^- \[x\]/gim` と `^- \[ \]/gm` の正規表現でcheckbox数をカウント
  - taskParallelParserではより詳細なパース（ID抽出、(P)マーカー検出）を実行
  - 完了度判定には単純なcheckboxカウントで十分
- **Implications**: specsWatcherServiceの正規表現パターンを再利用可能。新規パーサーは不要

### autoExecutionCoordinator拡張ポイントの特定

- **Context**: impl Agent完了時にフック可能な箇所を特定
- **Sources Consulted**: `autoExecutionCoordinator.ts`
- **Findings**:
  - `handleAgentCompleted`メソッドが唯一のAgent完了処理ポイント
  - `status === 'completed'` かつ `currentPhase === 'impl'` の条件分岐が必要
  - 次フェーズ判定は`getImmediateNextPhase`で実行後、`execute-next-phase`イベント発火
- **Implications**: handleAgentCompleted内でimplフェーズ専用のガード条件を追加する設計が適切

### リトライカウント管理方式の検討

- **Context**: リトライ回数の永続化の必要性と実装方式を検討
- **Sources Consulted**: `autoExecutionCoordinator.ts`（executionStates Map）
- **Findings**:
  - executionStatesはspecPath単位のMap管理
  - インメモリのため、Electron再起動でリセット
  - spec.jsonへの永続化は同期問題（fileService.updateSpecJson等）を伴う
- **Implications**: インメモリ管理で十分。Electron再起動は「新しいセッション」として許容可能

### イベントログとUI通知の統合方式

- **Context**: リトライ発生の通知方法を確認
- **Sources Consulted**:
  - `eventLogService.ts`
  - `shared/types/eventLog.ts`
  - `shared/stores/notificationStore.ts`
- **Findings**:
  - EventLogServiceは`logEvent(projectPath, specId, event)`で記録
  - 新規EventTypeの追加が必要（'impl:retry', 'impl:max-retry-exceeded'は現在未定義）
  - notificationStoreは抽象化されており、Electron/RemoteUI両方で動作
- **Implications**: EventType拡張とnotificationStore.showNotification呼び出しで統合可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: specsWatcherService経由 | ポーリングベースの既存サービスを活用 | コード再利用 | 300msデバウンスによるタイミング問題 | 却下: Agent完了と非同期のため不適切 |
| B: 直接fs.readFileSync | handleAgentCompleted内で同期読み取り | 確実なタイミング、シンプル | fsモジュール依存 | 採用: 同期的な判定が必要なため |

## Design Decisions

### Decision: tasks.mdの同期読み取り

- **Context**: Agent完了時に即座にtasks.md完了度を判定する必要がある
- **Alternatives Considered**:
  1. specsWatcherService.checkTaskCompletion() — 既存コード再利用だが、ポーリングのタイミング問題
  2. fs.readFileSync — 同期的で確実だが、新規コード
- **Selected Approach**: fs.readFileSyncを使用した同期読み取り
- **Rationale (Why)**:
  - Agent完了イベントと同一スレッドで即座に判定する必要がある
  - specsWatcherServiceは300msデバウンスがあり、Agent完了時点のファイル状態を保証しない
  - handleAgentCompletedはMain Process内で実行されるため、同期I/Oは許容範囲
- **Trade-offs**: fsモジュールへの直接依存が増えるが、タイミング確実性を優先
- **Follow-up**: テスト時はfs.readFileSyncをモック

### Decision: EventType拡張方式

- **Context**: イベントログに新しいイベントタイプを追加する必要がある
- **Alternatives Considered**:
  1. 既存の'auto-execution:fail'を再利用 — 意味が異なる（リトライは失敗ではない）
  2. 新規EventType追加 — 明確だがeventLog.ts変更が必要
- **Selected Approach**: 既存の'auto-execution:fail'と'auto-execution:complete'を活用し、messageフィールドでリトライを識別
- **Rationale (Why)**:
  - EventType追加はeventLog.tsとEventLogEntryの変更が必要で影響範囲が大きい
  - messageフィールドに'Impl retry'プレフィックスを含めることで識別可能
  - UI表示やログ検索は既存の仕組みで対応可能
- **Trade-offs**: 型安全性が若干低下するが、変更範囲を最小化
- **Follow-up**: 将来的にリトライ専用EventTypeが必要になった場合は拡張可能

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| tasks.mdフォーマット変更時のパース失敗 | フォールバック動作（パース失敗時は次フェーズ許可）、ログ出力で検知可能に |
| 無限ループ（想定外の状態でリトライ継続） | MAX_IMPL_RETRY_COUNT=7で強制停止、エラー状態遷移 |
| Electron再起動でリトライ状況消失 | 許容範囲として設計。永続化の複雑性を回避 |
| UIトースト過多（7回のリトライで7回通知） | 通知メッセージにリトライ回数を含め、状況を明確化 |

## References

- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts` - 主要拡張対象
- `electron-sdd-manager/src/main/services/specsWatcherService.ts` - tasks.mdパースパターン参照
- `electron-sdd-manager/src/shared/stores/notificationStore.ts` - 通知抽象化レイヤー
- `electron-sdd-manager/src/shared/types/eventLog.ts` - イベントログ型定義
