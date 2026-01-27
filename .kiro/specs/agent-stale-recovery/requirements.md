# Requirements: Agent Stale Recovery

## Decision Log

### 1. スコープの決定

- **Discussion**: stale/orphan検出に対して、A. アプリ起動時sanity check、B. 定期ヘルスチェック、C. UI上の警告・操作オプションの3つのシナリオを検討。Cについては既存の中止ボタンで対応可能。
- **Conclusion**: A（起動時sanity check）とB（定期ヘルスチェック）を実装。Cは既存機能でカバー。
- **Rationale**: 中止ボタンは既に存在するため、新規UI追加は不要。検出と自動回復に注力する。

### 2. stale判定の閾値

- **Discussion**: `lastActivityAt`が更新されない場合の「stale」判定閾値を検討。5分、10分、30分（自動実行タイムアウトと同じ）の選択肢。
- **Conclusion**: 5分
- **Rationale**: 通常のagent実行では数秒〜数十秒ごとにログ出力があるため、5分無応答は明らかに異常状態と判断できる。

### 3. 検出後のアクション方針

- **Discussion**: stale検出後の対応として、単なる警告表示か自動回復かを検討。
- **Conclusion**: 自動回復を試みる。ログが「完了」なら正常完了扱い、ログが中断状態（ユーザー中断でない）なら自動resume、ログがエラーならfailed状態に更新。
- **Rationale**: ユーザー介入なしで可能な限り自動回復することで、UXを向上させる。

### 4. 完了判定の方法

- **Discussion**: プロセスが終了せずログだけ止まっている状態での「完了」判定方法を検討。
- **Conclusion**: 既存の`auto-execution-completion-detection`と同じ方法を使用（`result`フィールドの検出等）。
- **Rationale**: 既存の実績ある判定ロジックを再利用することで、一貫性を保ち実装コストを削減。

### 5. resume前のプロセス処理

- **Discussion**: 元のプロセスがまだ生きている（ハング状態）場合の処理順序を検討。
- **Conclusion**: PID確認 → 生きていればkill → その後resume
- **Rationale**: ハング状態のプロセスを残したままresumeすると、リソースリークや競合の原因となる。

### 6. 自動resume回数制限

- **Discussion**: stale検出 → resume → またstale のループを防ぐための回数制限を検討。
- **Conclusion**: 同一agentに対して最大3回までresumeを試行。3回失敗したらfailedに更新してtoast通知。
- **Rationale**: 無限ループを防ぎつつ、一時的な問題からの回復機会を確保。

### 7. 起動時チェックのタイミング

- **Discussion**: 起動時sanity checkをアプリ起動直後（プロジェクト選択前）か、プロジェクト選択後か検討。
- **Conclusion**: プロジェクト選択後（agent recordsが読み込まれた時点）
- **Rationale**: agent recordsはプロジェクト固有のため、プロジェクト選択後でないとチェック対象が存在しない。

## Introduction

Agent実行の終了検出に失敗した場合の救済処理を実装する。`isRunning`状態がオンのまま進行しない状態（stale agent）や、アプリ再起動後に残存するorphan agentを検出し、ログ状態に応じて自動回復またはエラー状態への更新を行う。

## Requirements

### Requirement 1: アプリ起動時のOrphan Agent検出

**Objective:** As a system, I want to detect orphan agents on project load, so that stale running states are cleaned up automatically.

#### Acceptance Criteria

1. プロジェクト選択後、agent recordsの読み込み完了時にorphan検出処理を実行する。
2. `status: running`のagent recordに対して、`checkProcessAlive(pid)`でプロセス生存を確認する。
3. プロセスが存在しない場合、Requirement 4の回復処理を実行する。
4. 検出・回復処理の結果をログに出力する。

### Requirement 2: 定期的なStale Agent検出

**Objective:** As a system, I want to periodically check for stale agents, so that hung processes are detected and recovered.

#### Acceptance Criteria

1. プロジェクト選択中、定期的に（約1分間隔で）stale検出処理を実行する。
2. `status: running`のagent recordに対して、`lastActivityAt`が5分以上更新されていないものをstaleと判定する。
3. staleと判定されたagentに対して、Requirement 4の回復処理を実行する。
4. プロジェクト切り替え時・アプリ終了時に定期チェックを停止する。
5. チェック間隔は設定可能とするが、デフォルトは1分とする。

### Requirement 3: Stale判定のログ解析

**Objective:** As a system, I want to analyze agent logs to determine the appropriate recovery action, so that completed agents are not unnecessarily restarted.

#### Acceptance Criteria

1. stale/orphan検出時、該当agentのログファイルを解析する。
2. ログに「完了」パターン（`auto-execution-completion-detection`と同じ判定ロジック）が存在する場合、agentは正常完了と判断する。
3. ログの最終行がエラーパターンの場合、agentはエラー終了と判断する。
4. 上記以外（ログが途中で停止、ユーザー中断でない）の場合、agentは中断状態と判断する。
5. ユーザー中断（`status: interrupted`）の場合は回復対象外とする。

### Requirement 4: Stale Agent回復処理

**Objective:** As a system, I want to automatically recover stale agents based on their log state, so that user intervention is minimized.

#### Acceptance Criteria

1. ログ解析結果が「正常完了」の場合、agent recordの`status`を`completed`に更新する。
2. ログ解析結果が「中断状態」の場合、以下の順序で自動resumeを試行する:
   - `checkProcessAlive(pid)`でプロセス生存を確認
   - 生きている場合は`process.kill(pid, 'SIGKILL')`で強制終了
   - 既存の`resumeAgent`機能を使用してresume
3. ログ解析結果が「エラー終了」の場合、agent recordの`status`を`failed`に更新する。
4. `failed`に更新した場合、toast通知でユーザーに通知する（「Agent終了処理でエラーが発生しました: {agentId}」）。

### Requirement 5: 自動Resume回数制限

**Objective:** As a system, I want to limit auto-resume attempts, so that infinite retry loops are prevented.

#### Acceptance Criteria

1. 同一agentに対する自動resume試行回数をagent recordに記録する（`autoResumeCount`フィールド）。
2. 自動resume試行回数が3回を超えた場合、resumeを行わず`status`を`failed`に更新する。
3. `failed`更新時、toast通知で「自動回復の試行回数上限に達しました: {agentId}」と通知する。
4. 手動でresumeした場合、または新規実行時に`autoResumeCount`を0にリセットする。

### Requirement 6: エラー状態のUI表示

**Objective:** As a user, I want to see agent error states clearly in the UI, so that I can be aware of failed agents.

#### Acceptance Criteria

1. `status: failed`のagentは既存のfailedアイコン（赤）で表示する。
2. stale検出による`failed`更新時、toast通知を表示する。
3. toast通知にはagentIdを含め、どのagentで問題が発生したか識別可能とする。

## Out of Scope

- UI上の警告・操作オプション追加（既存の中止ボタンで対応）
- 自動実行以外の手動実行agentへの個別タイムアウト設定
- Agent recordファイル破損時のリカバリ機構
- Claude CLIハング検知の改善（現状5秒タイムアウト）
- stale検出閾値のUI設定機能

## Open Questions

- なし（対話で技術的詳細は確認済み）
