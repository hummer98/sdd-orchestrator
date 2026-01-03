# Requirements Document

## Introduction

本仕様は、`electron-sdd-manager/src/renderer/stores/specStore.ts`（1020行超）をSRP（単一責任原則）に基づいて複数モジュールに分割するリファクタリングの要件を定義する。

現在のSpecStoreはGod Objectアンチパターンに該当し、以下の責務が混在している：
- Spec一覧の状態管理
- 選択中Specの詳細管理
- ファイルシステム同期ロジック
- ファイル監視イベント処理
- 自動実行のランタイム状態管理
- spec-manager実行ロジック

本リファクタリングにより、関心の分離を実現し、テスト容易性・保守性を向上させる。

## Scope

- **対象範囲**: Desktop UI内部のリファクタリング
- **Remote UI影響**: なし（Remote UIは独自stores/WebSocket同期を持ち、Desktop側のSpecStoreとは独立）
- **外部インターフェース**: 変更なし（WebSocketハンドラが公開するIPC API/イベントの互換性を維持）

## Requirements

### Requirement 1: SpecListStore - Spec一覧の状態管理

**Objective:** As a developer, I want Spec一覧の状態管理が独立したモジュールになること, so that 一覧表示の状態変更が他の機能に影響しない

#### Acceptance Criteria

1. The SpecListStore shall manage specs array state (specs: SpecMetadata[])
2. The SpecListStore shall provide loadSpecs action to fetch specs from project path
3. The SpecListStore shall provide setSpecs action for unified project selection integration
4. The SpecListStore shall provide getSortedFilteredSpecs selector for sorted/filtered spec list
5. The SpecListStore shall manage sort state (sortBy, sortOrder) and filter state (statusFilter)
6. The SpecListStore shall provide updateSpecMetadata action to refresh single spec metadata in list
7. When loadSpecs is called, the SpecListStore shall set isLoading to true during fetch
8. If loadSpecs fails, the SpecListStore shall set error state with message

### Requirement 2: SpecDetailStore - 選択中Spec詳細の状態管理

**Objective:** As a developer, I want 選択中Specの詳細状態が独立したモジュールになること, so that 詳細表示の更新が一覧状態に影響しない

#### Acceptance Criteria

1. The SpecDetailStore shall manage selectedSpec state (SpecMetadata | null)
2. The SpecDetailStore shall manage specDetail state (SpecDetail | null)
3. The SpecDetailStore shall provide selectSpec action to load spec detail from path
4. The SpecDetailStore shall provide clearSelectedSpec action to reset selection
5. When selectSpec is called, the SpecDetailStore shall load specJson and all artifacts
6. When selectSpec is called, the SpecDetailStore shall calculate taskProgress from tasks.md content
7. The SpecDetailStore shall provide silent mode option for selectSpec to avoid loading indicator
8. If selectSpec fails, the SpecDetailStore shall set error state with message

### Requirement 3: SpecSyncService - ファイル同期ロジック

**Objective:** As a developer, I want ファイル同期ロジックがサービスとして分離されること, so that 同期処理のテストが容易になる

#### Acceptance Criteria

1. The SpecSyncService shall provide syncDocumentReviewState function to sync document-review files with spec.json
2. The SpecSyncService shall provide syncInspectionState function to sync inspection files with spec.json
3. The SpecSyncService shall provide syncTaskProgress function to calculate task completion and auto-fix phase
4. The SpecSyncService shall provide updateSpecJson function to reload spec.json without artifact reload
5. The SpecSyncService shall provide updateArtifact function to reload single artifact without spec.json reload
6. When syncTaskProgress detects all tasks complete, the SpecSyncService shall auto-fix phase to implementation-complete
7. When updateArtifact for tasks is called, the SpecSyncService shall recalculate taskProgress
8. The SpecSyncService shall sync editorStore when active tab matches updated artifact

### Requirement 4: SpecWatcherService - ファイル監視

**Objective:** As a developer, I want ファイル監視の登録・解除が独立したサービスになること, so that 監視ロジックが分離され保守性が向上する

#### Acceptance Criteria

1. The SpecWatcherService shall provide startWatching function to register file change listener
2. The SpecWatcherService shall provide stopWatching function to unregister listener and stop watcher
3. When file changes are detected, the SpecWatcherService shall dispatch granular update based on changed file type
4. When spec.json changes, the SpecWatcherService shall call syncService.updateSpecJson
5. When artifact file changes, the SpecWatcherService shall call syncService.updateArtifact with correct type
6. When document-review-*.md changes, the SpecWatcherService shall call syncService.syncDocumentReviewState
7. When inspection-*.md changes, the SpecWatcherService shall call syncService.syncInspectionState
8. When tasks.md changes, the SpecWatcherService shall also call syncService.syncTaskProgress
9. The SpecWatcherService shall manage isWatching state
10. If a non-selected spec changes, the SpecWatcherService shall call updateSpecMetadata only

### Requirement 5: AutoExecutionStore - 自動実行ランタイム状態

**Objective:** As a developer, I want 自動実行のランタイム状態が独立したストアになること, so that 自動実行状態の管理がSpec詳細から分離される

#### Acceptance Criteria

1. The AutoExecutionStore shall manage autoExecutionRuntimeMap (Map<specId, AutoExecutionRuntimeState>)
2. The AutoExecutionStore shall provide getAutoExecutionRuntime selector to get state for specific spec
3. The AutoExecutionStore shall provide setAutoExecutionRunning action to update isAutoExecuting
4. The AutoExecutionStore shall provide setAutoExecutionPhase action to update currentAutoPhase
5. The AutoExecutionStore shall provide setAutoExecutionStatus action to update autoExecutionStatus
6. The AutoExecutionStore shall provide startAutoExecution action to initialize running state
7. The AutoExecutionStore shall provide stopAutoExecution action to reset to idle state
8. When getAutoExecutionRuntime is called with unknown specId, the AutoExecutionStore shall return default state

### Requirement 6: SpecManagerExecutionStore - spec-manager実行状態

**Objective:** As a developer, I want spec-manager実行状態が独立したストアになること, so that 実行状態管理がSpec詳細から分離される

#### Acceptance Criteria

1. The SpecManagerExecutionStore shall manage specManagerExecution state (SpecManagerExecutionState)
2. The SpecManagerExecutionStore shall provide executeSpecManagerGeneration action for phase execution
3. The SpecManagerExecutionStore shall provide handleCheckImplResult action for impl completion handling
4. The SpecManagerExecutionStore shall provide updateImplTaskStatus action for impl status updates
5. The SpecManagerExecutionStore shall provide clearSpecManagerError action to reset error state
6. When executeSpecManagerGeneration is called while already running, the SpecManagerExecutionStore shall log warning and return
7. If executeSpecManagerGeneration fails, the SpecManagerExecutionStore shall set error state with message
8. When handleCheckImplResult is called, the SpecManagerExecutionStore shall set implTaskStatus to success

### Requirement 7: 既存インターフェース互換性

**Objective:** As a developer, I want 既存のuseSpecStoreインターフェースが維持されること, so that 既存コンポーネントの変更が最小限になる

#### Acceptance Criteria

1. The refactored useSpecStore shall export all existing state properties with same types
2. The refactored useSpecStore shall export all existing action methods with same signatures
3. When useSpecStore action is called, the action shall delegate to appropriate decomposed store/service
4. The refactored useSpecStore shall compose state from SpecListStore, SpecDetailStore, and AutoExecutionStore
5. The refactored useSpecStore shall integrate with SpecWatcherService for file watching
6. The refactored useSpecStore shall integrate with SpecSyncService for sync operations

### Requirement 8: 循環依存の解消

**Objective:** As a developer, I want projectStore/workflowStore/editorStoreとの循環依存が解消されること, so that モジュール間の依存関係が明確になる

#### Acceptance Criteria

1. The decomposed stores shall not use dynamic imports for projectStore
2. The decomposed stores shall receive projectPath as parameter instead of reading from projectStore directly
3. The SpecSyncService shall receive editorStore integration via callback injection
4. The decomposed modules shall have clear unidirectional dependency graph
5. If cross-store communication is needed, the communication shall use explicit event/callback patterns

### Requirement 9: ディレクトリ構成

**Objective:** As a developer, I want 分割後のファイルが適切なディレクトリに配置されること, so that プロジェクト構造の規約に従う

#### Acceptance Criteria

1. The decomposed stores shall be placed in renderer/stores/ directory
2. The decomposed services shall be placed in renderer/services/ directory
3. The specStore.ts shall be refactored to re-export composed store from decomposed modules
4. The decomposed modules shall follow naming convention: camelCase for services, camelCase for stores
5. The decomposed modules shall have index.ts barrel exports in each directory
