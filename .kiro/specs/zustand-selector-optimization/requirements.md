# Requirements: Zustand Selector Optimization

## Decision Log

### スコープ
- **Discussion**: BugList周辺のみ修正するか、プロジェクト全体の24+コンポーネントを対象にするか
- **Conclusion**: プロジェクト全体を対象とする
- **Rationale**: 問題はBugListに限定されず、App.tsx（ルートコンポーネント）含む24+コンポーネントで同一のアンチパターンが存在。場当たり的な修正ではなく根本解決が必要

### useShallow導入方針
- **Discussion**: Zustandの`useShallow`を導入するか、個別セレクターのみで統一するか
- **Conclusion**: 併用方針。3+フィールド取得時は`useShallow`、1-2フィールドは個別セレクター
- **Rationale**: DRY原則とのバランス。5フィールドを個別セレクター5行で書くよりuseShallow1行の方が保守性が高い。Zustand v4.4+公式推奨パターン

### リグレッション担保
- **Discussion**: リファクタリングの安全性をどう担保するか
- **Conclusion**: 既存E2Eテスト（Electron 70+件、Web 18件）をリグレッションガードとして使用
- **Rationale**: 今回の変更はRendererの内部最適化（セレクター分離、React.memo追加）であり、コンポーネントのpropsインターフェースや外部動作は変更しない。E2Eテストは全て変更前と同じ結果になる

### React.memoの適用範囲
- **Discussion**: どのコンポーネントにReact.memoを適用するか
- **Conclusion**: リスト内で繰り返し描画されるアイテムコンポーネント5つに限定
- **Rationale**: React.memoはリスト内の兄弟コンポーネント（選択状態が変わらないアイテム）の不要な再レンダリングを防ぐのに最も効果的。ページレベルのコンポーネントにはセレクター分離で十分

## Introduction

BugListItemをクリックするたびにBugList全体が再レンダリングされる問題が報告された。調査の結果、これはBugListに限定された問題ではなく、プロジェクト全体のZustandストア購読パターンに起因するシステミックな問題であることが判明した。

24+コンポーネントがセレクターなしでZustandストアを全フィールド購読しており、1つのフィールド変更がそのストアを購読する全コンポーネントの再レンダリングを引き起こしている。さらに、リストアイテムコンポーネント5つがReact.memoで保護されていないため、親の再レンダリングが全アイテムにカスケードする。

本specではZustandのセレクターパターンを全コンポーネントに適用し、リストアイテムのメモ化を行うことで、不要な再レンダリングを根本的に排除する。

## Requirements

### Requirement 1: Zustandセレクターパターンの統一適用

**Objective:** As a developer, I want all components to use proper Zustand selectors, so that components only re-render when their actually-used state fields change.

#### Acceptance Criteria

1. セレクターなしの全購読パターンが解消されること
   - When a component destructures a store like `const { a, b } = useStore()`, it shall be replaced with selector-based access
   - If the component uses 3 or more fields, the system shall use `useShallow`: `const { a, b, c } = useStore(useShallow(s => ({ a: s.a, b: s.b, c: s.c })))`
   - If the component uses 1-2 fields, the system shall use individual selectors: `const a = useStore(s => s.a)`

2. アクション関数はセレクター化の対象外とすること
   - Zustandのアクション関数（`selectBug`, `loadBugs`等）は参照が安定しているため、セレクター化は不要
   - When a component only needs actions (no state fields), `useStore(s => s.action)` or destructuring is acceptable since actions don't trigger re-renders

3. 以下のストアの全購読箇所が修正されること
   - `useSharedBugStore`: BugList, BugPane, BugWorkflowView, App.tsx, BugsView 等
   - `useSpecStore`: SpecPane, SpecDetail, ApprovalPanel, DocsTabs, App.tsx 等
   - `useProjectStore`: App.tsx, CreateBugDialog, CreateSpecDialog, SpecDetail 等
   - `useAgentStore` (renderer): AgentListPanel, ProjectAgentPanel, App.tsx 等
   - `useSharedAgentStore` (shared): BugList, SpecsView, BugsView等では既に`(state) => state.agents`セレクターパターンを使用済みのため修正不要。ただしremote-ui/App.tsxの3箇所（LeftSidebar, RightSidebar, FooterContent）ではセレクターなし全購読のため、Req 1.4の修正対象とする
   - その他関連ストア: notificationStore, executionStore, scheduleTaskStore, gitViewStore 等

4. Remote UIコンポーネントも同様に修正されること
   - `remote-ui/App.tsx`, `BugsView.tsx`, `SpecsView.tsx`, `BugDetailView.tsx`, `CreateBugDialogRemote.tsx` 等

### Requirement 2: リストアイテムコンポーネントのメモ化

**Objective:** As a user, I want list item selections to be fast, so that clicking an item doesn't cause the entire list to visually re-render.

#### Acceptance Criteria

1. 以下の5コンポーネントが`React.memo`でラップされること
   - `BugListItem` (`shared/components/bug/BugListItem.tsx`)
   - `SpecListItem` (`shared/components/spec/SpecListItem.tsx`)
   - `AgentListItem` (`shared/components/agent/AgentListItem.tsx`)
   - `EventLogListItem` (`shared/components/eventLog/EventLogListItem.tsx`)
   - `ScheduleTaskListItem` (`shared/components/schedule/ScheduleTaskListItem.tsx`)

2. メモ化の効果を阻害するインラインコールバックが排除されること
   - When rendering list items in a `.map()`, inline arrow functions like `onSelect={() => handler(item)}` shall be replaced with stable callback patterns
   - The parent container shall use `useCallback` for handler functions passed to memoized children
   - If the list item receives an `id` prop, the item may call `onSelect(id)` internally instead of receiving a pre-bound callback

3. 各リストアイテムのprops比較がshallow equalで正しく機能すること
   - All props passed to memoized items shall be primitive values, stable references, or memoized objects
   - The `bug`, `spec`, `agent` data objects shall maintain referential stability when their content hasn't changed (Zustand's default immutable update pattern)

### Requirement 3: App.tsxルートコンポーネントの最適化

**Objective:** As a developer, I want the root App component to not re-render on every store change, so that the entire component tree is not unnecessarily invalidated.

#### Acceptance Criteria

1. `renderer/App.tsx`がストアごとに必要なフィールドのみを購読すること
   - The component shall subscribe to `useProjectStore` with only the fields it actually reads (e.g., `currentProject`, `kiroValidation`)
   - The component shall subscribe to `useSpecStore` with only the fields it actually reads
   - The component shall subscribe to `useSharedBugStore` with only the fields it actually reads
   - Actions shall be obtained via separate selectors or stable references

2. `remote-ui/App.tsx`も同様に最適化されること
   - The same selector pattern shall be applied to the Remote UI root component

### Requirement 4: useShallowユーティリティの導入

**Objective:** As a developer, I want a consistent import pattern for useShallow, so that the codebase follows a unified convention.

#### Acceptance Criteria

1. `zustand/react/shallow`から`useShallow`をインポートするパターンが確立されること
   - When `useShallow` is needed, it shall be imported as: `import { useShallow } from 'zustand/react/shallow'`
   - This import path is the Zustand v4.4+ official recommendation

2. useShallowの使用基準が明確であること
   - If a component subscribes to 3 or more state fields from a single store, `useShallow` shall be used
   - If a component subscribes to 1-2 state fields, individual selectors shall be used
   - If a component only needs action functions, direct destructuring is acceptable

### Requirement 5: テストとリグレッション検証

**Objective:** As a developer, I want confidence that the refactoring doesn't break existing functionality, so that I can safely deploy.

#### Acceptance Criteria

1. 既存ユニットテストが全てパスすること
   - When store mocks use destructuring, they shall be updated if selector patterns change the mock interface
   - All existing unit tests shall pass without modification to test logic (mock setup may need updates)

2. 既存E2Eテストが全てパスすること
   - All Electron E2E tests (70+ files) shall pass
   - All Web E2E tests (18 files) shall pass
   - No new E2E tests are required (internal optimization, no behavior change)

3. TypeScript型チェックがパスすること
   - The `tsc --noEmit` check shall pass
   - No new type errors shall be introduced

## Out of Scope

- パフォーマンス計測ツールの導入（React Profiler等）
- Zustandストア自体の分割・リアーキテクチャ（storeの粒度変更）
- カスタム等価比較関数の実装（shallow equalで十分）
- SSR/RSC対応（Electronアプリのため不要）
- 新規E2Eテストの追加（動作変更なし）

## Open Questions

- なし（調査フェーズで全て解決済み）
