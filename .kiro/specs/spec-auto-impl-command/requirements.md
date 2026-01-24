# Requirements: spec-auto-impl-command

## Decision Log

### D1: アプローチの選択
- **Discussion**: 既存のparallel-task-impl（Electron UIから複数Claude CLIプロセスを起動）はグループ間自動進行が未実装だった。Claude CLI内でTask toolを使ってサブエージェントを起動し、親エージェントがバッチ完了を待って次へ進むアプローチが検討された。
- **Conclusion**: `/kiro:spec-auto-impl` Slash Commandを新規作成し、並列トグルON時にこのコマンドを呼び出す
- **Rationale**: 1つのClaude CLIセッション内でTask toolによる並列サブエージェント起動→完了待機→次バッチという流れで、グループ間自動進行を実現できる

### D2: tasks.md更新の責任
- **Discussion**: サブエージェントが各自更新すると同時編集による衝突リスクがある
- **Conclusion**: 親エージェントがサブエージェントの完了報告を受けてまとめてtasks.mdを更新する
- **Rationale**: 衝突回避、確実な更新

### D3: 既存コードの扱い
- **Discussion**: parallelImplService.ts等のOrphanedコードが存在する
- **Conclusion**: 削除する。後方互換性考慮は不要
- **Rationale**: 使用されていないコードを残す理由がない

### D4: 自動実行フローとの統合
- **Discussion**: autoExecution時のimplフェーズでも並列バッチ実行を使うか
- **Conclusion**: 使う（自動実行時も並列バッチ実行）
- **Rationale**: 手動・自動で動作を統一し、効率的な実装を常に提供

### D5: UIトグルの扱い
- **Discussion**: 既存の並列トグルを削除するか残すか
- **Conclusion**: 残す。トグルON時にspec-auto-impl呼び出し、OFF時は既存の逐次実装
- **Rationale**: ユーザーに選択肢を提供

### D6: コマンド配置場所
- **Discussion**: `common/`（プレフィックスなし）か`kiro/`（kiro:プレフィックス）か
- **Conclusion**: `kiro/`に配置し、`/kiro:spec-auto-impl`として呼び出す
- **Rationale**: 既存の命名規則（/kiro:spec-impl等）との一貫性

## Introduction

既存のparallel-task-impl機能はグループ間自動進行が未実装だった。本機能は`/kiro:spec-auto-impl` Slash Commandを追加し、Task toolによるサブエージェント並列起動とバッチ完了待機を実現する。これにより、1回のコマンド実行で全タスクが完了するまで自動的に並列バッチ実行が継続される。

## Requirements

### Requirement 1: Slash Command追加

**Objective:** 開発者として、`/kiro:spec-auto-impl {feature}`コマンドで仕様のタスクを自律的に並列実装できるようにしたい

#### Acceptance Criteria

1.1. `/kiro:spec-auto-impl {feature}`を実行すると、tasks.mdの未完了タスクを解析し、バッチにグループ化すること

1.2. (P)マーク付きタスクを並列実行可能として識別し、同一グループにまとめること

1.3. 各バッチ内のタスクをTask toolで並列サブエージェントとして起動すること

1.4. バッチ内の全サブエージェント完了を待ってから次バッチへ進行すること

1.5. 全バッチ完了まで自動継続すること（1回押しで全完了）

1.6. コマンドは`templates/commands/cc-sdd-agent/spec-auto-impl.md`に配置されること

### Requirement 2: tasks.md更新

**Objective:** 並列実行中のファイル衝突を防ぎ、確実にタスク完了状態を記録したい

#### Acceptance Criteria

2.1. サブエージェントはtasks.mdを直接編集しないこと

2.2. サブエージェントは完了時にタスクID・テスト結果を親エージェントに報告すること

2.3. 親エージェントがサブエージェントの完了報告を受けてtasks.mdを更新すること（`- [ ]` → `- [x]`）

2.4. バッチ完了ごとにtasks.mdが更新されること

### Requirement 3: Electron UI統合

**Objective:** SDD Orchestrator UIから並列自動実装を起動できるようにしたい

#### Acceptance Criteria

3.1. ImplPhasePanelの並列トグルがONの場合、「実装」ボタン押下で`/kiro:spec-auto-impl`を呼び出すこと

3.2. 並列トグルがOFFの場合、既存の逐次実装（`/kiro:spec-impl`）を呼び出すこと

3.3. 実行中は「実行中」スピナーを表示すること

3.4. 完了時は「完了」表示に変わること

3.5. エラー時はエラーログを表示できること

### Requirement 4: 自動実行フロー統合

**Objective:** autoExecutionのimplフェーズでも並列バッチ実行を使いたい

#### Acceptance Criteria

4.1. autoExecutionCoordinatorがimplフェーズを実行する際、`/kiro:spec-auto-impl`を呼び出すこと

4.2. 既存の逐次実行ロジックは並列実装に置き換えられること

### Requirement 5: 既存コード削除

**Objective:** 未使用のOrphanedコードを削除してコードベースをクリーンに保ちたい

#### Acceptance Criteria

5.1. `parallelImplService.ts`を削除すること

5.2. `parallelImplService.test.ts`を削除すること

5.3. `handleParallelExecute`内のPromise.allによる複数プロセス起動ロジックを削除すること

5.4. 削除後もビルドが成功すること

5.5. 削除後も既存テストがパスすること

### Requirement 6: SKILL.md調整

**Objective:** SKILL.mdの内容を現行仕様に合わせて調整したい

#### Acceptance Criteria

6.1. サブエージェントがtasks.mdを更新する指示を削除し、親エージェントが更新する指示に変更すること

6.2. 承認チェックを`tasksApproved`から`approvals.tasks.approved`に変更すること

6.3. フロントマターの`name: kiro:spec-auto-impl`は維持すること

6.4. TDD必須の指示は維持すること

### Requirement 7: コマンドセットインストール

**Objective:** プロファイルインストール時にspec-auto-implコマンドが自動的にインストールされるようにしたい

#### Acceptance Criteria

7.1. `templates/commands/cc-sdd-agent/spec-auto-impl.md`が存在すること

7.2. kiroプロファイル（cc-sdd-agent）インストール時にコマンドがインストールされること

7.3. インストール後、`/kiro:spec-auto-impl`が使用可能であること

## Out of Scope

- UIでの詳細な進捗表示（バッチN完了等）- 終わったらtasks.mdを確認すれば十分
- 並列実行専用のキャンセルUI - 既存のAgent停止機能で対応
- cc-sdd, spec-managerプロファイルへの対応 - 必要になったら追加

## Open Questions

- なし（設計フェーズで解決予定）
