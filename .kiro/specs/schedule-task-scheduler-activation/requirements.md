# Requirements: Schedule Task Scheduler Activation

## Decision Log

### スケジューラー開始タイミング
- **Discussion**: `startScheduler()` をいつ呼び出すべきか。選択肢: A) プロジェクト選択時に自動開始、B) ユーザー明示的に開始、C) 有効なタスクがある場合のみ自動開始
- **Conclusion**: A) プロジェクト選択時に自動開始
- **Rationale**: 既存のdesign.mdの設計意図に沿う。ユーザーがスケジュールタスクを設定したのに別途「開始」操作を求めるのはUX的に不自然。`enabled=false` のタスクは `checkScheduleConditions()` でスキップされるため無駄なリソース消費は発生しない

### Agent起動機能の実装方針
- **Discussion**: `startScheduleAgent` を新規実装するか、既存の `SpecManagerService.startAgent()` を再利用するか
- **Conclusion**: 既存の `SpecManagerService.startAgent()` を再利用
- **Rationale**: DRY原則。既存のAgent監視・ログ記録・AgentRegistry連携がそのまま使える。`specId` を空文字列にすることで「プロジェクトレベルAgent」として起動可能

### processQueue呼び出しタイミング
- **Discussion**: `processQueue()` を別タイマーで呼ぶか、イベント駆動にするか、同じタイマーループ内で呼ぶか
- **Conclusion**: 同じタイマーループ内で `checkScheduleConditions()` の後に `processQueue()` を呼ぶ
- **Rationale**: 論理的に連続した処理であり、別タイマーにすると複雑性が増す。1分間隔で十分（秒単位の即時性は不要）

### 対応方針
- **Discussion**: 既存Specの修正として対応するか、新規Specで対応するか
- **Conclusion**: 新規Specで対応（フルSDDプロセス）
- **Rationale**: 既存の `schedule-task-execution` Specは「完了」ステータスだが実装漏れがある。新規Specで明確にトラッキングすることで、変更履歴と責任範囲を明確化

## Introduction

`schedule-task-execution` Specで設計・実装されたスケジュールタスク機能には、実装漏れが存在する。具体的には、スケジューラーループの開始処理が呼ばれておらず、Agent起動に必要な依存関係も注入されていない。本Specはこれらの未実装部分を完成させ、スケジュールタスク機能を完全に動作させることを目的とする。

**背景**: Inspection結果は「GO」だったが、以下の問題が検出されなかった：
- `initScheduleTaskCoordinator()` で `startScheduler()` が呼ばれていない
- `getIdleTimeMs` がスタブ実装（常に0を返す）
- `startScheduleAgent` / `createScheduleWorktree` が未注入

## Requirements

### Requirement 1: スケジューラー自動開始

**Objective:** システムとして、プロジェクト選択時にスケジューラーを自動開始したい。ユーザーが追加操作なしでスケジュールタスクが動作するようにするため。

#### Acceptance Criteria
1. When `initScheduleTaskCoordinator(projectPath)` が呼ばれた時、システムは `coordinator.initialize()` に続いて `coordinator.startScheduler()` を呼び出す
2. When スケジューラーが開始された時、システムは1分間隔で `checkScheduleConditions()` と `processQueue()` を順番に実行する
3. When プロジェクトが変更された時、システムは既存のスケジューラーを停止してから新しいスケジューラーを開始する
4. When アプリが終了する時、システムは `dispose()` でスケジューラーを停止する

### Requirement 2: アイドル時間統合

**Objective:** システムとして、Renderer側のアイドル検出をMain Processで利用したい。アイドル条件のスケジュールタスクを正しく動作させるため。

#### Acceptance Criteria
1. `getIdleTimeMs` 依存関係は `idleTimeTracker.getIdleTimeMs()` を返す
2. When Rendererがアクティビティを報告した時、`idleTimeTracker` の `lastActivityTime` が更新される
3. When `checkScheduleConditions()` が呼ばれた時、システムは現在のアイドル時間を正確に取得できる
4. If アイドル条件のタスクが設定されている場合、システムは `idleMinutes` を満たした時点でキューに追加する

### Requirement 3: Agent起動依存関係の注入

**Objective:** システムとして、スケジュールタスクからAgentを起動したい。キューに入ったタスクを実際に実行するため。

#### Acceptance Criteria
1. `startScheduleAgent` 依存関係は `SpecManagerService.startAgent()` を使用してAgentを起動する
2. When `startScheduleAgent` が呼ばれた時、システムは `specId=''`（プロジェクトレベル）、`phase='schedule-{taskName}'` でAgentを起動する
3. When タスクにプロンプトが指定されている時、システムはそのプロンプトをAgentに渡す
4. When Agent起動が成功した時、システムは `agentId` を返す
5. If Agent起動に失敗した場合、システムはエラーをログに記録し、エラー結果を返す

### Requirement 4: Worktree作成依存関係の注入

**Objective:** システムとして、workflowモード有効時にworktreeを自動作成したい。メインブランチへの影響を隔離するため。

#### Acceptance Criteria
1. `createScheduleWorktree` 依存関係は `WorktreeService` を使用してworktreeを作成する
2. When worktreeが作成される時、命名規則 `schedule/{task-name}/{suffix}` に従う
3. When `suffixMode='auto'` の時、システムは日時ベースのsuffixを自動生成する
4. When `suffixMode='custom'` の時、システムはユーザー指定のsuffixに日時を付加する
5. When worktree作成が成功した時、システムは `absolutePath` を返す
6. If worktree作成に失敗した場合、システムはエラーをログに記録し、タスク実行を中止する

### Requirement 5: 統合テスト

**Objective:** 開発者として、スケジューラーが正しく動作することを検証したい。エンドツーエンドの動作を保証するため。

#### Acceptance Criteria
1. 統合テストは `initScheduleTaskCoordinator()` → `startScheduler()` → 1分経過 → キュー追加 → `processQueue()` → Agent起動 の一連のフローを検証する
2. 統合テストはアイドル条件タスクの動作を検証する
3. 統合テストはworkflowモード有効時のworktree作成を検証する
4. 統合テストは回避ルール（待機/スキップ）の動作を検証する

## Out of Scope

- UIの変更（既存UIはそのまま使用）
- スケジュールタスクの新規機能追加
- 既存の `schedule-task-execution` Specのドキュメント修正
- E2Eテスト（ユニット/統合テストのみ）
- Remote UI対応: 不要（Main Process内部の実装のみで、UIレイヤーへの変更なし）

## Open Questions

- なし（すべて解決済み）

## Related Specifications

- `.kiro/specs/schedule-task-execution/` - 元のスケジュールタスク機能Spec
