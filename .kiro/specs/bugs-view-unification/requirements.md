# Requirements: BugsView共通化

## Decision Log

### 1. 共通化のアプローチ
- **Discussion**: BugListContainerパターンのみか、useBugListLogic Hookも含めるか
- **Conclusion**: 両方を実装する
- **Rationale**: SpecListContainerの成熟したパターンに従い、UI層（Container）とロジック層（Hook）の両方を共通化することで、最大限の再利用性を実現

### 2. 機能の統一
- **Discussion**: 現状の機能差（Phaseフィルター、テキスト検索、Agent数表示、レスポンシブ）を維持するか統一するか
- **Conclusion**: 全機能を両環境で使用可能にする
- **Rationale**: 共通化の目的は一貫したUXの提供。機能差を維持すると、共通化の効果が半減する

### 3. 状態管理の統一
- **Discussion**: UIコンポーネント層のみ共通化するか、状態管理も統一するか
- **Conclusion**: 状態管理も統一する（renderer/bugStoreをuseSharedBugStoreに移行）
- **Rationale**:
  - 長期的にはSSOT原則に従う方が保守性が高い
  - 段階的マイルストーンでリスク管理可能

### 4. shared/bugStoreへの機能移植範囲
- **Discussion**: 必要最小限（bugDetail + 基本操作）か、全機能移植（差分更新、Agent連携含む）か
- **Conclusion**: 全機能移植（Option A）
- **Rationale**:
  - 完全な共通化により将来の保守コストを削減
  - ApiClient抽象化の拡張は技術的に解決可能
  - 段階的実装でリスク軽減

## Introduction

Remote UI版のBugsView.tsxとElectron版のBugList.tsxを、SpecListContainerパターンに従って共通化する。UIコンポーネント層（BugListContainer）、ロジック層（useBugListLogic）、状態管理層（useSharedBugStore）の3層すべてを統一し、両環境で同一の機能・UXを提供する。

## Requirements

### Requirement 1: BugListContainerコンポーネント

**Objective:** As a developer, I want a shared BugListContainer component, so that Bug一覧のUI実装を両環境で再利用できる

#### Acceptance Criteria
1. When BugListContainer is rendered, the system shall display a list of bugs using BugListItem
2. When isLoading is true, the system shall display a loading indicator
3. When error is provided, the system shall display an error message
4. When bugs array is empty, the system shall display an empty state message
5. If showPhaseFilter is true, the system shall display a phase filter dropdown (all, reported, analyzed, fixed, verified, deployed)
6. If showSearch is true, the system shall display a search input field
7. When a bug is clicked, the system shall call onSelectBug callback with the selected bug
8. If getRunningAgentCount is provided, the system shall display the running agent count for each bug
9. The system shall support responsive layout via deviceType prop ('desktop' | 'smartphone')

### Requirement 2: useBugListLogic Hook

**Objective:** As a developer, I want a shared useBugListLogic hook, so that Bug一覧のフィルタリング・ソートロジックを両環境で再利用できる

#### Acceptance Criteria
1. When bugs are provided, the system shall return bugs sorted by updatedAt descending
2. If enableTextSearch is true and searchQuery is set, the system shall filter bugs by name containing the query
3. If enablePhaseFilter is true and phaseFilter is set, the system shall filter bugs by the specified phase
4. When phaseFilter is 'all', the system shall return all bugs without phase filtering
5. The system shall expose setSearchQuery and setPhaseFilter functions to update filter state
6. The system shall return filteredBugs reflecting current filter/sort state

### Requirement 3: useSharedBugStore拡張

**Objective:** As a developer, I want an enhanced shared bug store, so that 状態管理をElectron/Remote UIで統一できる

#### Acceptance Criteria
1. The system shall maintain bugDetail state for the currently selected bug
2. When selectBug is called with a bugId, the system shall fetch and cache the bug detail via ApiClient
3. The system shall support differential update via handleBugsChanged method
4. When handleBugsChanged receives 'add' event, the system shall add the new bug to the list
5. When handleBugsChanged receives 'change' event, the system shall update the bug metadata and refresh detail if selected
6. When handleBugsChanged receives 'unlink' or 'unlinkDir' event, the system shall remove the bug from the list
7. The system shall expose startWatching/stopWatching methods to control file watching subscription
8. When selectBug is called, the system shall invoke switchAgentWatchScope via ApiClient

### Requirement 4: ApiClient抽象化拡張

**Objective:** As a developer, I want extended ApiClient abstraction, so that Electron IPCとWebSocket APIを統一的に扱える

#### Acceptance Criteria
1. The system shall add switchAgentWatchScope(specId: string) method to ApiClient interface
2. The system shall add startBugsWatcher() method to ApiClient interface
3. The system shall add stopBugsWatcher() method to ApiClient interface
4. The system shall add onBugsChanged(listener) method returning unsubscribe function to ApiClient interface
5. When using IpcApiClient, the system shall delegate to window.electronAPI
6. When using WebSocketApiClient, the system shall delegate to WebSocket message handlers
7. The system shall normalize event format between IPC (BugsChangeEvent) and WebSocket (BugMetadata[])

### Requirement 5: Electron版BugList移行

**Objective:** As a developer, I want Electron BugList to use shared components, so that コードの重複を排除できる

#### Acceptance Criteria
1. When BugList is rendered, the system shall use BugListContainer internally
2. The system shall use useSharedBugStore instead of renderer-specific bugStore
3. The system shall provide getRunningAgentCount via useAgentStore integration
4. When a bug is selected, the system shall update both shared store and agent watch scope
5. The system shall maintain backward compatibility with existing BugList usage patterns

### Requirement 6: Remote UI版BugsView移行

**Objective:** As a developer, I want Remote UI BugsView to use shared components, so that Electron版と同一のUXを提供できる

#### Acceptance Criteria
1. When BugsView is rendered, the system shall use BugListContainer internally
2. The system shall use useSharedBugStore for state management
3. The system shall display phase filter (previously Electron-only feature)
4. The system shall display running agent count for each bug (previously Electron-only feature)
5. The system shall maintain responsive layout support (desktop/smartphone)
6. The system shall maintain CreateBugDialog integration

### Requirement 7: renderer/bugStore廃止

**Objective:** As a developer, I want to remove renderer-specific bugStore, so that SSOTを実現できる

#### Acceptance Criteria
1. When migration is complete, the system shall have no imports from renderer/stores/bugStore
2. The system shall remove renderer/stores/bugStore.ts file
3. The system shall update all references to use useSharedBugStore
4. The system shall maintain all existing functionality through shared store

## Out of Scope

- BugDetailViewの共通化（別スペックで対応）
- Bug作成ダイアログのさらなる共通化（bug-create-dialog-unificationで完了済み）
- specStoreの統一（別の独立した課題）

## Open Questions

- WebSocket APIで差分更新イベント（BugsChangeEvent形式）をサポートするか、全件更新のままイベント形式を変換するか → 設計フェーズで決定
