# Requirements: Metrics File-Based Tracking

## Decision Log

### オンメモリ管理の廃止
- **Discussion**: 現在のメトリクス計測はオンメモリのMapで開始時刻を管理しており、`setProjectPath()`呼び出しや再起動でセッションが失われる問題があった
- **Conclusion**: Agent recordファイルに実行履歴を永続化し、オンメモリ管理を廃止する
- **Rationale**: 既存のAgent recordにはプロセス情報が記録されており、ここに実行履歴を追加することで堅牢なメトリクス計測が可能になる

### Agent Record構造の拡張
- **Discussion**: 開始時刻のみを記録する案 vs 実行履歴を配列で記録する案
- **Conclusion**: `executions`配列を導入し、開始時刻・終了時刻・プロンプトを記録する
- **Rationale**: Resume時に新しい実行が追加されるため、配列構造が適切。これにより各実行セッションのメトリクスを正確に計測できる

### メトリクス書き込み方式
- **Discussion**: metrics.jsonlを廃止してAgent recordから直接集計する案 vs metrics.jsonlを維持する案
- **Conclusion**: metrics.jsonlは維持し、handleAgentExit時に計算・書き込みを行う
- **Rationale**: 既存の読み取りAPIを変更せずに済み、Human時間やLifecycleとの統一感も保てる

### 既存startedAtフィールドの扱い
- **Discussion**: 後方互換性を維持するか、新規recordのみ対応するか
- **Conclusion**: 既存recordは無視し、新規recordのみ`executions`を使用する
- **Rationale**: Runtime recordは一時的なものであり、マイグレーションの複雑さに見合わない

### MetricsServiceの役割変更
- **Discussion**: AI時間のオンメモリ管理機能をどう扱うか
- **Conclusion**: `startAiSession`/`endAiSession`等のオンメモリ関連メソッドを削除し、読み取り・集計機能のみ残す
- **Rationale**: 書き込みはspecManagerServiceが直接行い、MetricsServiceは集計に専念する

## Introduction

現在のメトリクス計測システムはAI実行時間の開始時刻をオンメモリで管理しているため、`setProjectPath()`呼び出しやアプリケーション再起動によりデータが失われる問題がある。本機能はAgent recordファイルに実行履歴（`executions`配列）を永続化し、`handleAgentExit`時にメトリクスを計算・記録する方式に変更することで、この問題を解決する。

## Requirements

### Requirement 1: Agent Record構造の拡張

**Objective:** As a system, I want to persist execution history in agent records, so that metrics can be calculated reliably even after application restart or project path changes.

#### Acceptance Criteria

1.1. Agent recordに`executions`フィールドが追加され、以下の構造を持つこと:
```typescript
executions: Array<{
  startedAt: string;   // ISO 8601 UTC timestamp
  endedAt?: string;    // ISO 8601 UTC timestamp (未設定=実行中or異常終了)
  prompt: string;      // 投入されたプロンプト
}>;
```

1.2. 既存の`startedAt`フィールドは新規recordでは使用せず、`executions[0].startedAt`に移行すること

1.3. 新規Agent recordの型定義（`AgentRecord`/`AgentInfo`）に`executions`フィールドが含まれること

### Requirement 2: startAgent時の実行履歴初期化

**Objective:** As a system, I want to initialize execution history when starting an agent, so that the start time and prompt are recorded.

#### Acceptance Criteria

2.1. When `startAgent`が呼ばれた時, the system shall `executions`配列を以下の初期値で作成すること:
```typescript
executions: [{
  startedAt: now,
  prompt: extractedPrompt
}]
```

2.2. `startAgent`内の`metricsService.startAiSession()`呼び出しを削除すること

### Requirement 3: handleAgentExit時のメトリクス記録

**Objective:** As a system, I want to record metrics when an agent exits, so that AI execution time is accurately measured.

#### Acceptance Criteria

3.1. When `handleAgentExit`が呼ばれた時, the system shall 最後の`executions`エントリに`endedAt`を記録すること

3.2. If `endedAt`が正常に記録された場合, then the system shall `metrics.jsonl`にAIメトリクスレコードを書き込むこと:
```typescript
{
  type: 'ai',
  spec: specId,
  phase: phase,
  start: execution.startedAt,
  end: execution.endedAt,
  ms: endTime - startTime
}
```

3.3. If `executions`配列が存在しない、または最後のエントリに`startedAt`がない場合, then the system shall メトリクス記録をスキップしログに警告を出力すること

3.4. `handleAgentExit`内の`metricsService.endAiSession()`呼び出しを削除すること

### Requirement 4: resumeAgent時の実行履歴追加

**Objective:** As a system, I want to add a new execution entry when resuming an agent, so that each resume session is tracked separately.

#### Acceptance Criteria

4.1. When `resumeAgent`が呼ばれた時, the system shall `executions`配列に新しいエントリを追加すること:
```typescript
executions.push({
  startedAt: now,
  prompt: resumePrompt
})
```

4.2. `resumeAgent`内の`metricsService.startAiSession()`呼び出しを削除すること

### Requirement 5: MetricsServiceのオンメモリ管理廃止

**Objective:** As a system, I want to remove in-memory session tracking from MetricsService, so that there are no data loss risks.

#### Acceptance Criteria

5.1. `MetricsService`から以下のメソッドを削除すること:
- `startAiSession()`
- `endAiSession()`
- `getActiveAiSession()`
- `getAllActiveAiSessions()`

5.2. `MetricsService`から`activeAiSessions` Mapフィールドを削除すること

5.3. `setProjectPath()`から`this.activeAiSessions.clear()`の呼び出しを削除すること

5.4. 以下のメソッドは維持すること:
- `recordHumanSession()`
- `startSpecLifecycle()`
- `completeSpecLifecycle()`
- `getMetricsForSpec()`
- `getProjectMetrics()`
- `setProjectPath()` (activeAiSessions.clear()以外)

### Requirement 6: recordServiceの対応

**Objective:** As a system, I want recordService to handle the executions field, so that execution history is properly persisted.

#### Acceptance Criteria

6.1. `recordService.writeRecord()`が`executions`フィールドを含むrecordを書き込めること

6.2. `recordService.updateRecord()`が`executions`フィールドを更新できること（配列へのpushを含む）

6.3. `recordService.readRecord()`が`executions`フィールドを含むrecordを読み取れること

## Out of Scope

- 既存Agent recordの`startedAt`から`executions`へのマイグレーション
- Human時間計測のファイルベース化（現状のオンメモリ方式を維持）
- Spec Lifecycle計測のファイルベース化（現状のオンメモリ方式を維持）
- `metrics.jsonl`のフォーマット変更
- 読み取りAPI（`getMetricsForSpec`等）の変更

## Open Questions

- なし（設計フェーズで確認済み）
