# Requirements: Agent Log Store Unification

## Decision Log

### スコープ: 共通化の範囲
- **Discussion**: 初回ログ読み込みのみか、リアルタイム購読も含めるか
- **Conclusion**: 両方を共通化する
- **Rationale**: 同じ処理を別々に実装するのはSSOT違反であり、エンバグの原因となっている

### 実装場所
- **Discussion**: `shared/stores/agentStore.ts`に追加 vs 新規hookを作成
- **Conclusion**: `shared/stores/agentStore.ts`に`ensureLogsLoaded(apiClient, agentId)`を追加
- **Rationale**: 既存の`loadAgents(apiClient)`と同じパターンで一貫性がある

### 既存コードの扱い
- **Discussion**: Electron版の`renderer/stores/agentStore.ts`と`agentStoreAdapter`の重複コード
- **Conclusion**: 共通化後に削除し、`shared`版に一本化
- **Rationale**: DRY原則とSSOT原則に従う

## Introduction

Agentログの読み込みロジック（初回読み込み・リアルタイム更新）がElectron版とRemote UI版で別々に実装されており、Remote UI（Mobile）版でログが表示されないバグの原因となっている。本仕様では、ログ管理ロジックを`shared/stores/agentStore.ts`に集約し、両環境から同一コードを使用する構造に変更する。

## Requirements

### Requirement 1: 初回ログ読み込みの共通化

**Objective:** 開発者として、Agentログの初回読み込みロジックを共通化したい。両環境で同じコードパスを使用することで、実装の重複とバグを防ぐ。

#### Acceptance Criteria

1.1. `shared/stores/agentStore.ts`に`ensureLogsLoaded(apiClient: ApiClient, agentId: string): Promise<void>`メソッドが追加されていること

1.2. `ensureLogsLoaded`は`apiClient.getAgentLogs(specId, agentId)`を呼び出し、結果を`addLog()`で追加すること

1.3. `ensureLogsLoaded`は重複排除ロジックを含み、既存のログと新規取得ログをID基準でマージすること

1.4. Electron版の`renderer/stores/agentStore.ts`から`ensureLogsLoaded`メソッドが削除されていること

1.5. Electron版の`renderer/stores/agentStoreAdapter.ts`から`loadAgentLogs`メソッドが削除されていること

### Requirement 2: リアルタイムログ購読の共通化

**Objective:** 開発者として、WebSocket/IPCからのリアルタイムログ購読ロジックを共通化したい。両環境で同じイベントハンドリングコードを使用する。

#### Acceptance Criteria

2.1. `shared/hooks/useAgentLogSubscription.ts`（または同等のhook）が作成され、リアルタイムログ購読を共通化すること

2.2. 当該hookは`apiClient.onAgentLog()`を使用してログイベントを購読し、`useSharedAgentStore.addLog()`を呼び出すこと

2.3. Remote UI版の`useAgentStoreInit.ts`からログ購読ロジックが削除され、共通hookを使用すること

2.4. Electron版の`agentStoreAdapter.setupAgentEventListeners()`からログ購読ロジックが削除され、共通hookを使用すること

### Requirement 3: UI層の統一

**Objective:** ユーザーとして、Electron版・Remote UI版（Mobile含む）の両方でAgentログが正しく表示されることを期待する。

#### Acceptance Criteria

3.1. Remote UI版の`AgentLogPage.tsx`がAgent選択時に`ensureLogsLoaded`を呼び出すこと

3.2. Electron版の`renderer/components/AgentLogPanel.tsx`が`shared`版の`ensureLogsLoaded`を使用すること

3.3. 両環境で、Agent選択後にファイルからの既存ログとリアルタイムログが正しくマージされて表示されること

### Requirement 4: 後方互換性

**Objective:** 開発者として、既存の動作を維持しながらリファクタリングしたい。

#### Acceptance Criteria

4.1. 既存のテストが全て通過すること

4.2. Electron版のAgentログ表示機能が引き続き正常に動作すること

4.3. Remote UI版（Desktop/Mobile両方）のAgentログ表示機能が正常に動作すること

## Out of Scope

- Agentログのフォーマット変更
- ログのフィルタリング機能
- Main Processでのログ管理ロジック変更（WebSocketHandler, IPC Handlers等）
- 新規APIの追加（既存の`getAgentLogs`, `onAgentLog`を使用）

## Open Questions

- `useAgentLogSubscription`は単独hookとするか、`useAgentStoreInit`に統合するか（設計フェーズで決定）
