# Requirements: Agent Store Unification

## Decision Log

### データ構造の統一

- **Discussion**: renderer版は `Map<specId, AgentInfo[]>`、shared版は `Map<agentId, AgentInfo>` と構造が異なっていた。どちらを採用すべきか
- **Conclusion**: `Map<specId, AgentInfo[]>` に統一
- **Rationale**:
  - agent-watcher-optimizationの設計意図（Spec単位での監視・取得）に合致
  - UIの表示単位（SpecListPanel、BugWorkflowView）と一致
  - アクセス効率が高い（`O(1)` vs `O(n)` フィルタリング）
  - `agents.get(specId)` で直接取得でき、コードが自然

### SSOTの選択

- **Discussion**: renderer版とshared版のどちらをSingle Source of Truthとするか
- **Conclusion**: shared版をSSOTとする
- **Rationale**:
  - structure.mdの原則（Domain Stateは `src/shared/stores/` に配置）に準拠
  - Remote UI対応の将来性を考慮
  - プラットフォーム非依存な設計を維持

### 移行方法

- **Discussion**: 段階的移行（1コンポーネントずつ）vs 一括移行（全コンポーネント同時）
- **Conclusion**: 一括移行（Facadeパターンによる透過的移行）
- **Rationale**:
  - 技術的に最も正しい解決策
  - Facadeレイヤーによりコンポーネント変更が不要
  - execution-store-consolidationで実績のあるパターン
  - ロールバックが容易

### Adapterレイヤーの責務

- **Discussion**: Electron IPC操作をどこまでカプセル化するか
- **Conclusion**: IPC操作、イベントリスナー、Electron固有機能をすべてAdapter化
- **Rationale**:
  - shared/agentStoreをプラットフォーム非依存に保つ
  - 責務の分離（Store=状態管理、Adapter=IPC通信）
  - テスト容易性の向上

### Remote UIへの影響

- **Discussion**: 今回の統合でRemote UIも変更すべきか
- **Conclusion**: 別タスクとして扱う
- **Rationale**:
  - Remote UIは現在shared/agentStoreを使用していない（独自にuseStateで管理）
  - 今回の変更はElectron版のみに影響
  - Remote UIのshared/agentStore統合は別の改善課題

## Introduction

renderer/agentStoreとshared/agentStoreの二重管理によるState不整合を解消する。shared/agentStoreをSingle Source of Truthとして採用し、データ構造を `Map<specId, AgentInfo[]>` に統一する。Electron IPC操作はAdapterレイヤーに分離し、renderer/agentStoreはFacadeとして実装する。これにより、Spec選択時に古いAgentログが表示される問題を構造的に解決する。

## Requirements

### Requirement 1: shared/agentStoreのデータ構造修正

**Objective:** システムアーキテクトとして、Agent状態管理のデータ構造をSpec単位に統一したい。そのために、shared/agentStoreの構造を修正する。

#### Acceptance Criteria

1.1. When shared/agentStoreを修正するとき、the system shall `agents` フィールドのデータ構造を `Map<string, AgentInfo>` から `Map<string, AgentInfo[]>` に変更すること（キー: specId、値: Agent配列）

1.2. The system shall `getAgentsForSpec(specId)` メソッドを実装し、`agents.get(specId) || []` を返すこと

1.3. The system shall `getAgentById(agentId)` メソッドを実装し、全specを走査して該当Agentを返すこと

1.4. When Agentを追加するとき、the system shall `addAgent(specId, agent)` で該当specの配列に追加すること

1.5. When Agentを削除するとき、the system shall `removeAgent(agentId)` で全specから該当Agentを削除すること

1.6. When Agentのステータスを更新するとき、the system shall `updateAgentStatus(agentId, status)` で全specから該当Agentを検索して更新すること

### Requirement 2: Electron IPC Adapterの作成

**Objective:** 開発者として、Electron IPC操作をshared/agentStoreから分離したい。そのために、Adapterレイヤーを作成する。

#### Acceptance Criteria

2.1. The system shall `src/renderer/stores/agentStoreAdapter.ts` ファイルを作成すること

2.2. The system shall `agentOperations` オブジェクトを提供し、以下のメソッドを含むこと：
   - `startAgent(specId, phase, command, args, group?, sessionId?): Promise<string | null>`
   - `stopAgent(agentId): Promise<void>`
   - `resumeAgent(agentId, prompt?): Promise<void>`
   - `removeAgent(agentId): Promise<void>`
   - `sendInput(agentId, input): Promise<void>`
   - `loadAgentLogs(specId, agentId): Promise<void>`

2.3. When `agentOperations` の各メソッドが呼ばれたとき、the system shall 対応する `window.electronAPI` メソッドを呼び出し、結果をshared/agentStoreに反映すること

2.4. The system shall `setupAgentEventListeners()` 関数を提供し、以下のIPCイベントをshared/agentStoreに反映すること：
   - `onAgentOutput` → `addLog()`
   - `onAgentStatusChange` → `updateAgentStatus()`
   - `onAgentRecordChanged` → Agent追加/更新/削除処理

2.5. When `setupAgentEventListeners()` が呼ばれたとき、the system shall クリーンアップ関数を返すこと

2.6. The system shall Electron固有機能（skipPermissions管理）をAdapter内で実装すること

### Requirement 3: renderer/agentStoreのFacade化

**Objective:** 開発者として、既存の21個のコンポーネントを変更せずに統合を完了したい。そのために、renderer/agentStoreをFacadeとして再実装する。

#### Acceptance Criteria

3.1. The system shall `src/renderer/stores/agentStore.ts` を完全書き換えし、Zustandの `create()` でFacadeを実装すること

3.2. The system shall Facade内で `useSharedAgentStore` をインポートし、すべての状態とアクションを委譲すること

3.3. When Facadeのメソッドが呼ばれたとき、the system shall shared/agentStore または agentStoreAdapter の対応メソッドを呼び出すこと

3.4. The system shall 以下の型を再exportすること：
   - `AgentInfo`
   - `AgentStatus`
   - `LogEntry`

3.5. The system shall 以下のヘルパーメソッドを提供すること：
   - `getAgentById(agentId)`
   - `getAgentsForSpec(specId)`
   - `getProjectAgents()` （specId=''のAgentを返す）
   - `getRunningAgentCount(specId)` （実行中Agent数を返す）
   - `findAgentById(agentId)` （後方互換性）

3.6. The system shall Electron固有機能を公開すること：
   - `skipPermissions: boolean`
   - `setSkipPermissions(enabled: boolean)`
   - `loadSkipPermissions(projectPath: string)`

3.7. The system shall `setupEventListeners()` を公開し、Adapter経由でIPCイベントリスナーを設定すること

### Requirement 4: 状態同期の実装

**Objective:** 開発者として、shared/agentStoreの変更がrenderer/agentStoreに即座に反映されることを保証したい。そのために、状態同期機構を実装する。

#### Acceptance Criteria

4.1. When Facadeを初期化するとき、the system shall `useSharedAgentStore.subscribe()` でshared storeの変更を監視すること

4.2. When shared/agentStoreの状態が変更されたとき、the system shall Facadeの状態を即座に更新すること

4.3. The system shall 以下の状態フィールドを同期すること：
   - `agents`
   - `selectedAgentId`
   - `logs`
   - `isLoading`
   - `error`

4.4. When データ構造が統一されているため、the system shall 変換処理なしで状態を同期すること

4.5. The system shall Zustandのセレクタパターン（`useAgentStore((state) => state.xxx)`）と分割代入パターン（`const { xxx } = useAgentStore()`）の両方をサポートすること

### Requirement 5: 動作検証とバグ修正

**Objective:** ユーザーとして、Spec選択時に正しいAgentログが表示されることを確認したい。そのために、動作検証を実施する。

#### Acceptance Criteria

5.1. When 実行中Agentがない状態でSpecを選択したとき、the system shall Agentログエリアを空にすること（"Agentを選択してください"と表示）

5.2. When 実行中Agentがある状態でSpecを選択したとき、the system shall 最新の実行中Agentを自動選択し、そのログを表示すること

5.3. When Agentが`interrupted`状態に遷移した後に別のSpecを選択したとき、the system shall 古いAgentのログを表示し続けないこと

5.4. The system shall すべてのE2Eテスト（`electron-sdd-manager/src/e2e/`）がパスすること

5.5. The system shall 既存のユニットテストがパスすること（最小限の修正は許容）

5.6. The system shall 21個のコンポーネントのimport文が変更されていないこと

5.7. The system shall データ構造が `Map<specId, AgentInfo[]>` に統一されていること

## Out of Scope

- Remote UIのshared/agentStore統合（別タスクとして扱う）
- Agent一覧のページネーション
- Agentログの内容キャッシュ最適化
- skipPermissions以外のElectron固有機能の追加
- Agent Record Watcher の監視スコープ変更（agent-watcher-optimizationで実装済み）

## Open Questions

（なし。対話を通じてすべて解決済み）
