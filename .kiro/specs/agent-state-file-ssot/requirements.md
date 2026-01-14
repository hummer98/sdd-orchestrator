# Requirements: Agent State File SSOT

## Decision Log

### AgentRegistry の廃止
- **Discussion**: `AgentRegistry`（インメモリ）と `AgentRecordService`（ファイル）の二重管理が原因で、ファイルの `status` が `completed` でも UI は `running` と表示されるバグが発生。どちらを SSOT にするか検討
- **Conclusion**: `AgentRegistry` を廃止し、ファイルを SSOT とする
- **Rationale**:
  - SSOT 原則: 同じ情報を複数箇所で管理しない
  - Claude CLI や外部更新にも対応可能
  - キャッシュ同期の複雑さを排除

### AgentRecordService の役割拡張
- **Discussion**: ファイルからの読み取り API をどう設計するか
- **Conclusion**: スコープ制限を維持した API を提供（`readRecordsForSpec`, `readProjectAgents`）
- **Rationale**: `agent-watcher-optimization` の設計意図を維持。全件読み込みは起動時のパフォーマンス問題の原因だった

### SpecManagerService.processes の扱い
- **Discussion**: プロセスハンドル管理（`processes` Map）を分離すべきか
- **Conclusion**: `SpecManagerService` に残す（現状維持）
- **Rationale**: stdin 送信用のプロセスハンドル管理は `AgentRegistry` とは独立した責務。分離のメリットが薄い

### getRunningAgentCounts の実装方針
- **Discussion**: 全ファイルスキャン vs 最適化（status のみ読み取り）
- **Conclusion**: 全ファイルスキャン（シンプル版）
- **Rationale**: Spec 数・エージェント数は少ない（数十件）。パフォーマンス問題が出たら別途最適化

### Remote UI への影響
- **Discussion**: Remote UI 側の追加変更が必要か
- **Conclusion**: 不要。Main process の変更で自動的に修正される
- **Rationale**: Remote UI は `stateProvider.getAgents()` 経由で同じ IPC ハンドラを使用

## Introduction

エージェント状態管理のアーキテクチャを改善し、ファイル（`.kiro/runtime/agents/*.json`）を Single Source of Truth（SSOT）とする。インメモリの `AgentRegistry` を廃止し、`AgentRecordService` がエージェント状態の読み書きを一元的に担当する。これにより、ファイルとインメモリの不整合によるバグを根本的に解消する。

## Requirements

### Requirement 1: AgentRecordService の拡張

**Objective:** 開発者として、スコープ制限を維持しつつファイルからエージェント状態を取得したい。そのために、`AgentRecordService` に新しい読み取り API を追加する。

#### Acceptance Criteria
1.1. `readRecordsForSpec(specId: string): Promise<AgentRecord[]>` メソッドを追加すること。指定された specId のエージェントレコードのみを返すこと
1.2. `readProjectAgents(): Promise<AgentRecord[]>` メソッドを追加すること。specId が空文字列（ProjectAgent）のエージェントレコードを返すこと
1.3. `getRunningAgentCounts(): Promise<Map<string, number>>` メソッドを追加すること。各 specId ごとの実行中エージェント数を返すこと
1.4. 既存の `readAllRecords()` は非推奨とし、使用箇所を `readRecordsForSpec` に置き換えること

### Requirement 2: AgentRegistry の廃止

**Objective:** システムの整合性を保つため、インメモリ状態管理を廃止し、ファイルを唯一の真実とする。

#### Acceptance Criteria
2.1. `AgentRegistry` クラスの使用を `SpecManagerService` から削除すること
2.2. `registry.register()` の呼び出しを削除すること（`recordService.writeRecord()` のみ使用）
2.3. `registry.updateStatus()` の呼び出しを削除すること（`recordService.updateRecord()` のみ使用）
2.4. `registry.get()`, `registry.getBySpec()`, `registry.getAll()` を `recordService` の対応メソッドに置き換えること
2.5. `registry.updateActivity()`, `registry.updateSessionId()`, `registry.unregister()` を `recordService` の対応メソッドに置き換えること
2.6. `AgentRegistry` クラスとそのテストファイルを削除すること

### Requirement 3: SpecManagerService のリファクタリング

**Objective:** `SpecManagerService` がファイルベースのエージェント状態管理を使用するようにリファクタリングする。

#### Acceptance Criteria
3.1. `this.registry` プロパティを削除し、`this.recordService` のみを使用すること
3.2. `getAgents(specId)` メソッドは `recordService.readRecordsForSpec(specId)` を呼び出すこと
3.3. `getAllAgents()` メソッドは `recordService.readRecordsForSpec()` と `recordService.readProjectAgents()` を組み合わせて結果を返すこと
3.4. `getAgentById(agentId)` メソッドは `recordService.readRecord()` を使用すること
3.5. プロセスハンドル管理（`this.processes` Map）は変更しないこと

### Requirement 4: IPC ハンドラの更新

**Objective:** IPC ハンドラがファイルベースの API を使用するように更新する。

#### Acceptance Criteria
4.1. `GET_ALL_AGENTS` ハンドラは `specManagerService.getAllAgents()` の結果（ファイルから読み込み）を返すこと
4.2. `GET_RUNNING_AGENT_COUNTS` ハンドラは `recordService.getRunningAgentCounts()` を呼び出すこと
4.3. `getAgentRegistry()` 関数の使用箇所を削除すること

### Requirement 5: 動作の整合性

**Objective:** リファクタリング後も既存の機能が正しく動作することを保証する。

#### Acceptance Criteria
5.1. エージェント起動後、UI にエージェントが表示されること
5.2. エージェント完了後、UI のステータスが `completed` に更新されること
5.3. アプリ再起動後、既存のエージェントレコードが正しく読み込まれること
5.4. Spec 切り替え時、選択中 Spec のエージェントのみが表示されること
5.5. SpecList のバッジに正しい実行中エージェント数が表示されること
5.6. Remote UI でもエージェント一覧が正しく表示されること

## Out of Scope

- `AgentRecordWatcherService` の変更（監視ロジックは現状維持）
- Renderer 側 `agentStore` の変更（API の戻り値が正しくなれば動作する）
- Remote UI の追加変更（Main process の変更で自動修正）
- パフォーマンス最適化（キャッシュ等）- 問題が出たら別 Spec で対応
- `SpecManagerService.processes` の分離 - 責務が明確なため現状維持

## Open Questions

- なし（設計フェーズで詳細を決定）
