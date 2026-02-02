# Requirements: Project Agent Store Unification

## Decision Log

### ProjectAgentのデータソース
- **Discussion**: Remote UIのLeftSidebarで`projectAgents`をローカルstateで管理しているが、SharedAgentStoreにも同じデータが存在する。どちらを正とするか。
- **Conclusion**: SharedAgentStoreを単一のデータソース（SSOT）とする
- **Rationale**: `.kiro/steering/structure.md`のState Management Rulesで「Domain State (SSOT)は`src/shared/stores/`に配置、重複禁止」と明記されている

### データ同期方式
- **Discussion**: 現状は3秒ポーリングでAPIを呼び出してローカルstateを更新している。WebSocketイベントのみにするか、ポーリングを残すか。
- **Conclusion**: ポーリングを削除し、WebSocketイベントのみで更新する
- **Rationale**: SharedAgentStoreは既にWebSocketイベント（`onAgentStatusChange`）を購読しており、ポーリングは冗長。リアルタイム性も向上する

### ensureLogsLoadedのシグネチャ
- **Discussion**: `ensureLogsLoaded`はagentがstoreに存在することを前提としているが、タイミング問題でagentが見つからない場合がある。agentの存在を必須とするか、オプショナルにするか。
- **Conclusion**: `specIdHint`パラメータを追加し、agentが見つからなくてもログ取得を可能にする
- **Rationale**: agentの存在に依存しない設計にすることで、タイミング問題を根本的に解消。ProjectAgentの場合は`specIdHint=''`を渡すことで、agentがstoreに追加される前でもログ取得が可能

### 影響範囲
- **Discussion**: Remote UI（Desktop版）のみの修正か、Electron版も含めるか。
- **Conclusion**: Electron版とRemote UI版の両方でSharedAgentStoreを統一的に使用する
- **Rationale**: `.kiro/steering/tech.md`のRemote UI DesktopLayout設計原則で「Electron版に準拠」と定められており、両環境で同一のデータ管理が望ましい

## Introduction

Remote UIのDesktop版でProjectAgentのローカルstate（`projectAgents`）とSharedAgentStore（`agents`）で同じデータを二重管理している問題を解消する。SharedAgentStoreを単一のデータソース（SSOT）とし、ポーリングを廃止してWebSocketイベントのみで更新する。また、`ensureLogsLoaded`のシグネチャを変更し、agentの存在に依存しない堅牢な設計に改善する。

## Requirements

### Requirement 1: ProjectAgent ローカルstate の廃止

**Objective:** 開発者として、ProjectAgentのデータ管理をSharedAgentStoreに一元化したい。これにより、SSOT違反を解消し、データの整合性を保証できる。

#### Acceptance Criteria

1. Remote UIの`App.tsx`から`projectAgents` useState を削除すること
2. Remote UIの`App.tsx`から`setProjectAgents`を使用するすべてのuseEffectを削除すること
3. Remote UIの`App.tsx`からProjectAgent取得用の3秒ポーリングを削除すること
4. ProjectAgentの表示には`useSharedAgentStore((state) => state.getAgentsForSpec(''))`を使用すること
5. 取得したProjectAgentリストは、running優先・startedAt降順でソートして表示すること

### Requirement 2: ensureLogsLoaded のシグネチャ変更

**Objective:** 開発者として、agentがstoreに存在しなくてもログ取得を可能にしたい。これにより、タイミング問題によるログ表示失敗を防止できる。

#### Acceptance Criteria

1. `ensureLogsLoaded`メソッドに`specIdHint?: string`オプショナルパラメータを追加すること
2. agentがstoreで見つからない場合、`specIdHint`を使用してAPIを呼び出すこと
3. `specIdHint`も指定されていない場合は、空文字列`''`をspecIdとして使用すること
4. 既存の呼び出し元（`specIdHint`を指定しない）は動作に影響がないこと（後方互換性）
5. FooterContentの`useEffect`依存配列から`selectedAgent`を削除し、タイミング依存を解消すること

### Requirement 3: handleSelectAgent の簡素化

**Objective:** 開発者として、agent選択時のワークアラウンドコード（`addAgent`呼び出し）を削除したい。これにより、コードの複雑性を低減できる。

#### Acceptance Criteria

1. `handleSelectAgent`から`addAgent('', agent)`の呼び出しを削除すること
2. `handleSelectAgent`は`selectAgent(agentId)`の呼び出しのみに簡素化すること
3. ProjectAgentがSharedAgentStoreに存在することを前提とした設計にすること

### Requirement 4: Electron版との整合性

**Objective:** 開発者として、Electron版とRemote UI版でProjectAgentの管理方式を統一したい。これにより、コードの保守性が向上する。

#### Acceptance Criteria

1. Electron版でProjectAgentのローカルstateが存在する場合、同様に削除すること
2. Electron版とRemote UI版で同一の`useSharedAgentStore`を使用すること
3. 両環境でProjectAgentの表示・操作が同等に動作すること

### Requirement 5: 既存テストの更新

**Objective:** 開発者として、変更に伴うテストの更新を行いたい。これにより、リグレッションを防止できる。

#### Acceptance Criteria

1. `agentStore.test.ts`に`ensureLogsLoaded`の新シグネチャに対するテストケースを追加すること
2. `App.tsx`関連のテストファイルから、削除された`projectAgents`ローカルstateに依存するテストを更新すること
3. すべてのユニットテストが通過すること

## Out of Scope

- Agent一覧の表示UI変更（既存のAgentListコンポーネントをそのまま使用）
- WebSocket通信プロトコルの変更
- Agent起動・停止ロジックの変更
- MobileLayoutの変更（DesktopLayoutのみ対象）

## Open Questions

- Electron版でProjectAgentのローカルstate管理が存在するかの確認が必要（設計フェーズで調査）
