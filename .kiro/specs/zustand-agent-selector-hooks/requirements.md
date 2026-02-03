# Requirements: Zustand Agent Selector Hooks

## Decision Log

### 対応範囲
- **Discussion**: Remote UIのみ修正するか、Renderer側（Electron本体）も含めて統一的に修正するか
- **Conclusion**: Remote UI + Renderer両方を修正対象とする
- **Rationale**: 将来の問題予防、コードベース全体の統一性確保

### getAgentsForSpecの扱い
- **Discussion**: 共通Hook導入後、既存の`getAgentsForSpec`を削除するか、非推奨化して残すか、そのまま残すか
- **Conclusion**: 削除（breaking change）
- **Rationale**: 正しいパターンを強制し、同じ問題の再発を防止

### Hook命名規則
- **Discussion**: 新規作成するHookの命名
- **Conclusion**: `useAgentsBySpec`, `useProjectAgents`, `useRunningAgentCount`
- **Rationale**: 既存のHook命名規則に準拠

## Introduction

Remote UI Desktop版でProjectエージェント一覧が表示されない問題を解決する。根本原因はZustandのgetter関数（`getAgentsForSpec`）が状態変更時に参照が不変のため、`useMemo`の依存配列に入れても再計算されないこと。専用のカスタムHookを作成して正しいZustand使用パターンを強制し、問題のあるAPIを削除する。

## Requirements

### Requirement 1: 共通Hook作成

**Objective:** As a developer, I want to use dedicated hooks for agent queries, so that I don't accidentally use Zustand anti-patterns.

#### Acceptance Criteria

1. `useAgentsBySpec(specId: string)` Hookが作成されること
   - When called with a specId, the hook shall return `AgentInfo[]` for that spec
   - The hook shall subscribe to `state.agents` Map directly
   - The hook shall re-render when agents Map changes
   - The hook shall sort agents (running first, then by startedAt descending)

2. `useProjectAgents()` Hookが作成されること
   - The hook shall return project-level agents (specId = '')
   - The hook shall delegate to `useAgentsBySpec('')`

3. `useRunningAgentCount(specId: string)` Hookが作成されること
   - When called with a specId, the hook shall return the count of running agents
   - The hook shall derive the count from `useAgentsBySpec(specId)`

4. Hookは `shared/hooks/` に配置されること
   - The hooks shall be exported from `shared/hooks/index.ts`

### Requirement 2: getAgentsForSpec削除

**Objective:** As a maintainer, I want to remove the problematic API, so that developers cannot accidentally use the anti-pattern.

#### Acceptance Criteria

1. `SharedAgentState.getAgentsForSpec` メソッドが削除されること
   - The method shall be removed from `shared/stores/agentStore.ts`
   - The type definition shall be removed from `SharedAgentActions`

2. `AgentStore.getAgentsForSpec` メソッドが削除されること
   - The method shall be removed from `renderer/stores/agentStore.ts`
   - The type definition shall be removed from `AgentActions`

3. 関連する `getProjectAgents` メソッドも削除されること
   - If `getProjectAgents` exists and delegates to `getAgentsForSpec`, it shall be removed

### Requirement 3: Remote UI修正

**Objective:** As a user, I want to see Project Agent list in Remote UI Desktop layout, so that I can monitor agent status.

#### Acceptance Criteria

1. `remote-ui/App.tsx` (LeftSidebar) が修正されること
   - The component shall use `useProjectAgents()` hook instead of `getAgentsForSpec('')`
   - The agent list shall update when agents are added, removed, or status changes

2. `remote-ui/views/SpecsView.tsx` が修正されること
   - The component shall use `useRunningAgentCount(specName)` instead of `getAgentsForSpec(specName)`
   - The running count badge shall update when agent status changes

3. `remote-ui/views/BugsView.tsx` が修正されること
   - The component shall use `useRunningAgentCount(bugName)` instead of `getAgentsForSpec(bugName)`
   - The running count badge shall update when agent status changes

4. `remote-ui/components/AgentsTabView.tsx` は変更不要
   - This component already uses the correct pattern (`state.agents` direct access)
   - No modifications required

### Requirement 4: Renderer修正

**Objective:** As a developer, I want consistent patterns across Electron and Remote UI, so that the codebase is maintainable.

#### Acceptance Criteria

1. `renderer/hooks/useElectronWorkflowState.ts` が修正されること
   - The hook shall use new agent selector hooks instead of `getAgentsForSpec`

2. `renderer/stores/agentStore.ts` からgetAgentsForSpec呼び出し箇所が修正されること
   - All internal usages shall be replaced with direct Map access or new hooks

3. 他のRenderer側でgetAgentsForSpecを使用している箇所が修正されること
   - All usages shall be identified and replaced

### Requirement 5: テスト

**Objective:** As a developer, I want tests for the new hooks, so that I can verify correct behavior.

#### Acceptance Criteria

1. 新規Hookのユニットテストが作成されること
   - `useAgentsBySpec` shall have tests for:
     - Returning correct agents for a specId
     - Re-rendering when agents Map changes
     - Returning empty array when no agents exist
     - Correct sorting order
   - `useProjectAgents` shall have tests for delegation
   - `useRunningAgentCount` shall have tests for count calculation

2. 既存テストが更新されること
   - Tests using `getAgentsForSpec` shall be updated to use new hooks
   - No test failures after migration

## Out of Scope

- Mobile版のAgentsTabViewの修正（既に正しいパターンを使用）
- 他のZustand storeのgetter関数の見直し（本Specはagent関連のみ）
- パフォーマンス最適化（現状の実装で十分）

## Open Questions

- なし（調査フェーズで全て解決済み）
