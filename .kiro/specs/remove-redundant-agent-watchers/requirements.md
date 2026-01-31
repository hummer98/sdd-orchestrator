# Requirements: 冗長な Agent Watcher の削除

## Decision Log

### specWatcher / bugWatcher の冗長性

- **Discussion**: `AgentRecordWatcherService` には3つの Watcher がある。`projectAgentWatcher` が全カテゴリ（specs/\*/\*.json, bugs/\*/\*.json, project/\*.json）を監視しているため、`specWatcher` と `bugWatcher` は冗長ではないか。
- **Conclusion**: 両方とも削除する
- **Rationale**: `projectAgentWatcher` が `ignoreInitial: false` で全カテゴリを監視しており、specWatcher/bugWatcher の責務を完全にカバーしている。

### switchAgentWatchScope IPC チャネル

- **Discussion**: specWatcher/bugWatcher を削除する場合、`SWITCH_AGENT_WATCH_SCOPE` IPC チャネルも不要になる。維持する理由はあるか。
- **Conclusion**: IPC チャネルも削除する
- **Rationale**: 維持する技術的理由がない。削除することでコードがシンプルになり、混乱を防止できる。

### remote-ui の統一

- **Discussion**: remote-ui も `switchAgentWatchScope` を使用している（WebSocketApiClient 経由）。削除するか、ノーオペレーション化して残すか。
- **Conclusion**: 完全に削除して統一する
- **Rationale**: Electron UI と remote-ui の両方で同じアーキテクチャ（projectAgentWatcher のみ）になり、保守性が向上する。

### SpecList の Agent 数表示への影響

- **Discussion**: 削除後も SpecList の Agent 数バッジ（runningAgentCounts）が正しく動作するか。
- **Conclusion**: 影響なし。既存の E2E テストで確認可能。
- **Rationale**: runningAgentCounts は `AGENT_RECORD_CHANGED` イベント → `loadAgents()` → `calculateRunningCounts()` のフローで更新される。このフローは projectAgentWatcher が発火するイベントで動作するため、specWatcher/bugWatcher の削除による影響はない。

### 古い実装コードの完全削除

- **Discussion**: 削除対象のコードが残っていると、将来のメンテナンス時に混乱を招く。
- **Conclusion**: 古い実装コードは完全に削除し、残骸を残さない
- **Rationale**: 混乱防止。YAGNI 原則。

## Introduction

`AgentRecordWatcherService` の `specWatcher` と `bugWatcher` は、`projectAgentWatcher` が全カテゴリを監視するようになったため冗長になっている。これらの Watcher と関連する `switchAgentWatchScope` IPC チャネルを削除し、コードをシンプル化する。

## Requirements

### Requirement 1: specWatcher / bugWatcher の削除

**Objective:** As a maintainer, I want to remove redundant watchers, so that the codebase is simpler and easier to maintain.

#### Acceptance Criteria

1. When the application starts, the system shall NOT create `_specWatcher` instance
2. When the application starts, the system shall NOT create `_bugWatcher` instance
3. The system shall rely solely on `_projectAgentWatcher` for all agent record file monitoring
4. The following properties shall be removed from `AgentRecordWatcherService`:
   - `_specWatcher`
   - `_bugWatcher`
   - `_currentSpecId`
   - `_currentCategory`
   - `_currentEntityId`
5. The following methods shall be removed from `AgentRecordWatcherService`:
   - `switchWatchScope()`
   - `switchWatchScopeWithCategory()`
   - `getWatchScope()`
   - `specWatcher` getter
   - `bugWatcher` getter
   - `currentSpecId` getter

### Requirement 2: IPC チャネルの削除

**Objective:** As a maintainer, I want to remove unused IPC channels, so that the API surface is minimal and clear.

#### Acceptance Criteria

1. The system shall NOT register `SWITCH_AGENT_WATCH_SCOPE` IPC handler
2. The `IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE` constant shall be removed from `channels.ts`
3. The `switchAgentWatchScope` method shall be removed from `window.electronAPI` type definition

### Requirement 3: ApiClient インターフェースの削除

**Objective:** As a maintainer, I want to remove unused API methods, so that the interface is consistent between Electron UI and remote-ui.

#### Acceptance Criteria

1. The `switchAgentWatchScope` method shall be removed from `ApiClient` interface in `types.ts`
2. The `switchAgentWatchScope` implementation shall be removed from `IpcApiClient.ts`
3. The `switchAgentWatchScope` implementation shall be removed from `WebSocketApiClient.ts`

### Requirement 4: 呼び出し箇所の削除

**Objective:** As a maintainer, I want to remove all call sites of the deleted API, so that the code compiles and runs without errors.

#### Acceptance Criteria

1. The `switchAgentWatchScope` call shall be removed from `specDetailStore.ts` `selectSpec()` method
2. The `switchAgentWatchScope` call shall be removed from `specDetailStore.ts` `clearSelectedSpec()` method
3. The `switchAgentWatchScope` call shall be removed from `bugStore.ts` `selectBug()` method

### Requirement 5: preload スクリプトの削除

**Objective:** As a maintainer, I want to remove the preload bridge for the deleted IPC channel.

#### Acceptance Criteria

1. The `switchAgentWatchScope` function shall be removed from `preload/index.ts`

### Requirement 6: テストコードの削除・更新

**Objective:** As a maintainer, I want to update tests to reflect the new architecture, so that all tests pass.

#### Acceptance Criteria

1. The `switchWatchScope` related tests shall be removed from `agentRecordWatcherService.test.ts`
2. The `switchWatchScopeWithCategory` related tests shall be removed from `agentRecordWatcherService.test.ts`
3. The `switchAgentWatchScope` mock shall be removed from all test files
4. All existing E2E tests shall pass after the changes

### Requirement 7: 古い実装コードの完全削除確認

**Objective:** As a maintainer, I want to ensure no remnants of the old implementation remain, so that future maintenance is not confused.

#### Acceptance Criteria

1. After implementation, a grep search for `specWatcher` shall return no matches in production code (test mocks excluded)
2. After implementation, a grep search for `bugWatcher` shall return no matches in production code (test mocks excluded)
3. After implementation, a grep search for `switchWatchScope` shall return no matches in production code
4. After implementation, a grep search for `SWITCH_AGENT_WATCH_SCOPE` shall return no matches
5. The `AgentRecordWatcherService` shall only have `_projectAgentWatcher` as its watcher instance

### Requirement 8: SpecList Agent 数表示の動作確認

**Objective:** As a user, I want to see correct agent counts in SpecList badges, so that I know how many agents are running for each spec.

#### Acceptance Criteria

1. When an agent is started for a spec, the SpecList badge shall update to show the correct running count
2. When an agent is stopped, the SpecList badge shall update to reflect the new count
3. The `runningAgentCounts` calculation shall work correctly with `projectAgentWatcher` only
4. Existing E2E tests related to agent operations shall pass

## Out of Scope

- `projectAgentWatcher` の名前変更（現在の命名は正確）
- `SpecsWatcherService` / `BugsWatcherService`（Artifact 監視）への変更
- Agent メタデータのマイグレーション機能の追加
- `determineCategory()` のリファクタリング（specId パターンに依存する設計）

## Open Questions

- なし（事前調査で全て解決済み）
