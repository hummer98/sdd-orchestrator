# Requirements: Agent Facade Action-Only リファクタリング

## Decision Log

### ファサードストアの方向性
- **Discussion**: ファサード廃止 vs ファサードのsync機構修正 vs ファサードをアクション専用化の3案を検討
- **Conclusion**: ファサードをアクション専用に変換（状態の二重管理を廃止）
- **Rationale**: ファサードはRenderer固有のアクション（tRPCアダプタ経由のエージェント操作、イベントリスナー登録）に実質的な価値がある。一方で状態のsubscribe-and-sync機構は無限ループバグ・ストリーミング遅延バグを2度引き起こしており、構造的な欠陥。状態読み取りはSSOT直接で統一する

### skipPermissionsの配置
- **Discussion**: Renderer固有のUI状態としてファサードに残すか、SSOTに移すか
- **Conclusion**: SSOTに移動
- **Rationale**: Remote UIでも共有可能になり、一箇所管理が実現する

### AgentInfo型変換の扱い
- **Discussion**: ファサードがSharedAgentInfo→AgentInfo変換（retryCount, executionMode追加）を行っている。セレクタフックで変換するか、型自体を統一するか
- **Conclusion**: SSOTの型を統一（SharedAgentInfoにretryCount/executionModeを追加し、型変換自体を廃止）
- **Rationale**: 変換層は複雑さとパフォーマンスコストを増やすだけ。DRY原則に従い型を一本化する

### runningAgentCountsの計算配置
- **Discussion**: カスタムフック化 vs SSOTにメソッド追加
- **Conclusion**: SSOTにgetRunningAgentCount()メソッドを追加
- **Rationale**: 既にSSOTにgetAgentById等のヘルパーがあるパターンと一貫する

## Introduction

Rendererのファサードストア（`useAgentStore`）から状態の二重管理を廃止し、アクション専用ストアに変換するリファクタリング。コンポーネントは状態をSSOT（`useSharedAgentStore`）から直接読み取り、アクション（startAgent, stopAgent等）のみファサードを経由する。これにより、subscribe-and-sync機構に起因する同期遅延・無限ループバグのクラスを根本的に排除する。

## Requirements

### Requirement 1: ファサードストアから状態フィールドを削除

**Objective:** As a 開発者, I want ファサードストアが状態を保持しない, so that 状態の二重管理に起因するバグクラスが根本的に排除される

#### Acceptance Criteria
1. `useAgentStore`から以下の状態フィールドが削除されること: `agents`, `logs`, `selectedAgentId`, `isLoading`, `error`, `runningAgentCounts`
2. `useSharedAgentStore.subscribe()`による状態同期メカニズムが完全に削除されること
3. ファサードストアの初期化時に`getAgentsFromShared()`、`calculateRunningCounts()`が呼ばれないこと
4. `getAgentsFromShared()`関数と`calculateRunningCounts()`関数が削除されること

### Requirement 2: コンポーネントの状態読み取りをSSOT直接に移行

**Objective:** As a 開発者, I want 全コンポーネントがSSOTから直接状態を読む, so that 同期遅延なくリアクティブに状態変更を検知できる

#### Acceptance Criteria
1. `selectedAgentId`を読む4コンポーネント（AgentLogPanel, ProjectAgentPanel, AgentListPanel, AgentInputPanel）が`useSharedAgentStore`から直接読み取ること
2. `agents`を読む4コンポーネント（AgentLogPanel, ProjectAgentPanel, AgentListPanel, AgentInputPanel）が`useSharedAgentStore`から直接読み取ること
3. `logs`を読むAgentLogPanelが`useSharedAgentStore`から直接読み取ること（現在はファサードの`logs`フィールドから読み取っており、SSOTへの移行が必要）
4. `skipPermissions`を読むAgentListPanelが`useSharedAgentStore`から直接読み取ること
5. 移行後もコンポーネントの表示・動作が変わらないこと

### Requirement 3: AgentInfo型の統一

**Objective:** As a 開発者, I want SharedAgentInfoとAgentInfoの型が統一される, so that 型変換レイヤーが不要になりコードが簡素化される

#### Acceptance Criteria
1. `SharedAgentInfo`に`retryCount`フィールド（optional number）が追加されること
2. `SharedAgentInfo`に`executionMode`フィールド（optional string）が追加されること
3. Renderer固有の`AgentInfo`型とそのtype exportが削除されること
4. `toRendererAgentInfo()`変換関数と`toSharedAgentInfo()`変換関数が削除されること
5. 全コンポーネントが統一された`AgentInfo`型（`shared/api/types`の統一型）を使用すること

### Requirement 4: skipPermissionsのSSOT移行

**Objective:** As a 開発者, I want skipPermissionsがSSOTで管理される, so that 状態管理が一元化されRemote UIでも共有可能になる

#### Acceptance Criteria
1. `useSharedAgentStore`に`skipPermissions: boolean`フィールドが追加されること
2. `useSharedAgentStore`に`setSkipPermissions(value: boolean)`アクションが追加されること
3. ファサードストアから`skipPermissions`フィールドと`setSkipPermissions`アクションが削除されること
4. AgentListPanelが`useSharedAgentStore`から`skipPermissions`を読み取ること

### Requirement 5: runningAgentCountのSSOT移行

**Objective:** As a 開発者, I want 実行中Agent数の計算がSSOTで提供される, so that ファサード経由の間接的な計算が不要になる

#### Acceptance Criteria
1. `useSharedAgentStore`に`getRunningAgentCount(specId: string): number`メソッドが追加されること
2. SpecListが`useSharedAgentStore`の`getRunningAgentCount()`を使用すること
3. ファサードストアから`runningAgentCounts`フィールドと`getRunningAgentCount()`メソッドが削除されること

### Requirement 6: ファサードをアクション専用ストアとして維持

**Objective:** As a 開発者, I want ファサードがRenderer固有のアクションを提供し続ける, so that tRPCアダプタ連携やイベントリスナー登録がカプセル化されたままになる

#### Acceptance Criteria
1. 以下のアクションがファサードストアに残ること: `setupEventListeners`, `startAgent`, `stopAgent`, `resumeAgent`, `selectAgent`, `addAgent`, `removeAgent`, `loadAgents`, `clearLogs`, `ensureLogsLoaded`, `selectForProjectAgents`, `getAgentById`, `sendInput`, `updateAgentStatus`, `appendLog`, `getLogsForAgent`, `getSelectedAgent`, `findAgentById`, `clearError`。なお`loadAgentLogs`は`ensureLogsLoaded`に委譲しており機能的に重複するため、削除候補とする
2. アクション内部でSSOTのメソッドを呼び出すパターンが維持されること（例: `selectAgent`は`useSharedAgentStore.getState().selectAgent()`を呼ぶ）
3. `setupEventListeners()`がtRPCアダプタの初期化とイベントリスナー登録を引き続き担当すること

### Requirement 7: テストの更新

**Objective:** As a 開発者, I want 全テストが新アーキテクチャに対応する, so that リファクタリング後もテストカバレッジが維持される

#### Acceptance Criteria
1. ファサードストアのテスト（`agentStore.test.ts`）がアクション専用の構造に更新されること
2. コンポーネントテストのモック構造が`useSharedAgentStore`直接読み取りに対応すること
3. 既存の全テストがパスすること
4. 共有ストアのテスト（`shared/stores/agentStore.test.ts`）に新規追加フィールド・メソッドのテストが含まれること

## Out of Scope

- Remote UIの`useAgentStore`相当のリファクタリング（Electron Renderer限定）
- ファサードストア自体の完全廃止（アクションの価値は残す）
- SharedAgentStoreの内部実装変更（インターフェースのみ拡張）
- 他のファサードストア（specStore, projectStore等）のリファクタリング

## Open Questions

- `toRendererAgentInfo`/`toSharedAgentInfo`を削除する際、SharedAgentInfo型を`AgentInfo`にリネームするか、そのまま`SharedAgentInfo`で統一するか（設計フェーズで決定）
- ファサードストアのファイル名（`agentStore.ts`）を変更するか（`agentActions.ts`等）、既存importの変更量とのトレードオフ（設計フェーズで決定）
