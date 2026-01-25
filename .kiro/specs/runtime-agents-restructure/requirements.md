# Requirements: Runtime Agents Restructure

## Decision Log

### 1. ログ保存先の統一

- **Discussion**: 現在Agentログが2箇所に分散している（`.kiro/runtime/agents/` にメタデータJSON、`.kiro/specs/{specId}/logs/` にログファイル）。worktree削除時に `specs/*/logs/` のログが消失する問題がある。
- **Conclusion**: `runtime/agents/` に統一する
- **Rationale**: SSOTの実現、worktree削除時のログ消失防止、シンボリックリンクによる共有が既に `runtime/` で実現されている

### 2. ディレクトリ構造の分離

- **Discussion**: 現在specs用とbugs用のAgentがフラットに混在している（`runtime/agents/{specId}/`, `runtime/agents/bug:xxx/`）
- **Conclusion**: `specs/`, `bugs/`, `project/` の3階層に分離する
- **Rationale**: 関心の分離、検索・フィルタリングの効率化、将来の拡張性

### 3. ログとメタデータの配置

- **Discussion**: メタデータ（.json）とログ（.log）を同一ディレクトリに置くか、分離するか
- **Conclusion**: `logs/` サブディレクトリでログを隔離する
- **Rationale**: メタデータ検索の高速化（glob時にログファイルを除外）、ディレクトリ構造の明確化

### 4. ProjectAgentの扱い

- **Discussion**: spec/bugに紐付かないAgent（ProjectAgent）の配置先
- **Conclusion**: `runtime/agents/project/` に専用ディレクトリを作成
- **Rationale**: 3分類（specs/bugs/project）の一貫性維持

### 5. マイグレーション方針

- **Discussion**: 既存ログ（約10GB）の移行方法。一括移行は時間がかかる。
- **Conclusion**: Lazy Migration（Spec/Bug選択時にダイアログ表示して個別移行）
- **Rationale**: 1 Specあたり数MB〜12MB程度で現実的、ユーザー判断で移行可否を選択可能

## Introduction

Agentのログとメタデータの保存先を `.kiro/runtime/agents/` に統一し、specs/bugs/projectの3カテゴリに分離する。これによりSSOT原則を実現し、worktree削除時のログ消失問題を解決する。

**Remote UI対応**: 不要（Desktop UIのみ）。MigrationDialogはローカルファイルシステム上のログ移行操作であり、Remote UIからの実行は想定しない。

## Requirements

### Requirement 1: ディレクトリ構造の再編成

**Objective:** As a developer, I want agent data organized by category (specs/bugs/project), so that I can easily find and manage agent records.

#### Acceptance Criteria

1. When a spec-bound agent is created, the system shall store metadata at `.kiro/runtime/agents/specs/{specId}/agent-{id}.json`
2. When a spec-bound agent is created, the system shall store logs at `.kiro/runtime/agents/specs/{specId}/logs/agent-{id}.log`
3. When a bug-bound agent is created, the system shall store metadata at `.kiro/runtime/agents/bugs/{bugId}/agent-{id}.json`
4. When a bug-bound agent is created, the system shall store logs at `.kiro/runtime/agents/bugs/{bugId}/logs/agent-{id}.log`
5. When a project-level agent is created, the system shall store metadata at `.kiro/runtime/agents/project/agent-{id}.json`
6. When a project-level agent is created, the system shall store logs at `.kiro/runtime/agents/project/logs/agent-{id}.log`
7. The system shall create the `logs/` subdirectory automatically when storing the first log file

### Requirement 2: LogFileServiceの変更

**Objective:** As a system component, I want LogFileService to write logs to the new location, so that logs are stored in the unified structure.

#### Acceptance Criteria

1. When LogFileService stores a log, the system shall write to `runtime/agents/{category}/{id}/logs/` instead of `specs/{specId}/logs/`
2. When LogFileService reads a log, the system shall first check the new location, then fall back to the legacy location for backward compatibility
3. The system shall accept a category parameter ('specs' | 'bugs' | 'project') to determine the storage path

### Requirement 3: AgentRecordServiceの変更

**Objective:** As a system component, I want AgentRecordService to use the new directory structure, so that metadata is stored consistently with logs.

#### Acceptance Criteria

1. When AgentRecordService stores a record, the system shall write to `runtime/agents/{category}/{id}/agent-{agentId}.json`
2. When AgentRecordService lists records for a spec, the system shall read from `runtime/agents/specs/{specId}/`
3. When AgentRecordService lists records for a bug, the system shall read from `runtime/agents/bugs/{bugId}/`
4. When AgentRecordService lists project-level records, the system shall read from `runtime/agents/project/`

### Requirement 4: AgentRecordWatcherServiceの拡張

**Objective:** As a developer, I want the watcher to monitor the new directory structure, so that UI updates reflect changes in real-time.

#### Acceptance Criteria

1. The system shall maintain three watcher categories: projectWatcher, specWatcher, bugWatcher
2. When watching a spec, the system shall monitor `runtime/agents/specs/{specId}/`
3. When watching a bug, the system shall monitor `runtime/agents/bugs/{bugId}/`
4. The projectWatcher shall always monitor `runtime/agents/project/` with depth: 0
5. When switchWatchScope is called with a bugId, the system shall activate bugWatcher instead of specWatcher

### Requirement 5: Lazy Migration

**Objective:** As a user, I want to migrate legacy logs when I select a spec/bug, so that I don't lose historical data.

#### Acceptance Criteria

1. When a user selects a spec with legacy logs at `specs/{specId}/logs/`, the system shall display a migration dialog
2. When a user selects a bug with legacy logs at `specs/bug:{bugId}/logs/`, the system shall display a migration dialog
3. The migration dialog shall show the number of log files and total size to be migrated
4. If the user accepts migration, the system shall move log files from the legacy location to the new location
5. If the user declines migration, the system shall not migrate and shall not show the dialog again for that spec/bug during the session
6. After successful migration, the system shall delete the empty legacy `logs/` directory

### Requirement 6: 旧パスからの読み取り互換性

**Objective:** As a user, I want to view logs even if they haven't been migrated, so that I can access historical data.

#### Acceptance Criteria

1. When loading agent logs, the system shall check both new and legacy locations
2. If a log exists only in the legacy location, the system shall read from the legacy location
3. The UI shall indicate when viewing a log from a legacy location (optional visual hint)

### Requirement 7: specs/*/logs/ の廃止

**Objective:** As a maintainer, I want to remove the legacy log storage pattern, so that the codebase follows SSOT.

#### Acceptance Criteria

1. The system shall not create new logs at `specs/{specId}/logs/`
2. The system shall update `.gitignore` to reflect the new structure (if needed)
3. Documentation shall be updated to describe the new storage location

## Out of Scope

- 一括マイグレーションツール（全ログを一度に移行する機能）
- ログの圧縮・アーカイブ機能
- ログのリモートストレージへのバックアップ
- 古いログの自動削除機能

## Open Questions

- マイグレーションダイアログの「今後表示しない」オプションは必要か？（現在はセッション単位で非表示）
- ProjectAgentの使用頻度が低い場合、`project/` ディレクトリは将来的に廃止可能か？
