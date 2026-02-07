# Specification Review Report #9

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-8.md, document-review-8-reply.md, product.md, tech.md, structure.md, design-principles.md + 実装済みコードベース検証（context.ts, router.ts, handler.ts, routers/system.ts, routers/config.ts, helpers/test-helpers.ts, shared/hooks/useConfigTrpc.ts, shared/hooks/useSystemInfo.ts, shared/trpc/vanillaClient.ts, preload/index.ts, Renderer側差し替え状況、configHandlers.ts削除状況）

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 2 |
| WARNING | 2 |
| INFO | 1 |

レビュー#8の修正は**全3項目が正しく適用済み**である。本レビュー#9では、**Task 3.2完了後の新しい実装パターン（vanillaClient、useConfigTrpc、useSystemInfo）とdesign.mdの整合性**、および**Task 3.3のステータスと実装状況の乖離**を中心に検証した。

主要な発見:
- design.mdにvanillaClient（Zustand Store用の命令的tRPCクライアント）の設計が記載されていないが、実装では`shared/trpc/vanillaClient.ts`が導入されている（**CRITICAL**: Renderer側移行パターンの設計決定が未文書化）
- Task 3.3（configHandlers.ts削除と統合テスト）はgit statusで実質完了しているが、tasks.mdでは`[ ]`のまま（**CRITICAL**: auto-execution制御への影響）
- design.mdのRenderer移行パターン（DD-005セクション）がReactフック(`useConfigTrpc`, `useSystemInfo`)とvanillaClient（Store内命令的呼び出し）の2パターンに分かれる実装実態を反映していない
- steering/tech.mdのIPC設計パターンセクションがtRPC移行前の記述のまま

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。レビュー#8で指摘された不整合は修正済み。新規検出なし。

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 概ね良好だが、新しい実装パターンの設計未反映あり。

| # | 不整合 | design.md | 実装/tasks.md | 重要度 |
|---|--------|-----------|---------------|--------|
| 1 | vanillaClient設計未記載 | DD-005で「Store内の`window.electronAPI.*`呼び出し → tRPC mutation/queryの結果で置換」と抽象的に記載 | `shared/trpc/vanillaClient.ts`を実装し、Zustand Store内からは`getVanillaClient()`経由で命令的にtRPCを呼び出す具体パターンが確立 | CRITICAL |
| 2 | Reactフック層（useConfigTrpc, useSystemInfo）がdesign.md Components and Interfacesに未記載 | Renderer/Migration Layerに言及なし | `shared/hooks/useConfigTrpc.ts`（useRecentProjects, useLayoutConfig, useRemoteUiAutoStart）、`shared/hooks/useSystemInfo.ts`が新規作成済み | WARNING |

**詳細（不整合#1）**: design.md DD-005の移行手順は:
1. Store内の`window.electronAPI.*`呼び出し → tRPC mutation/queryの結果で置換
2. コンポーネント内の直接呼び出し → tRPCフック使用
3. IpcApiClient.tsのメソッド → 呼び出し元をtRPCフックに変更後、メソッド削除

しかし実装では「Store内」の移行に**vanillaClient**（`createTRPCProxyClient`）を使用する具体パターンが確立されている。これはReactフック（`trpc.*.useQuery()`）がReactコンポーネント外（Zustand Store）では使用できないため導入されたアーキテクチャ判断だが、design.mdにこの技術的決定が記載されていない。今後のTask 4以降で同じパターンが必要になるため、**設計文書への反映が必要**。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| UI Components | 各ドメインルーター定義 | 対応タスク存在 | ✅ |
| Services | ContextServices DI | Task 1.1で実装済み | ✅ |
| Types/Models | Zodスキーマ定義 | 各ルータータスク内で定義 | ✅ |
| vanillaClient | **未定義** | Task 3.2で暗黙的に実装 | ❌ |
| Reactフック層 | **未定義** | Task 2.2, 3.2で暗黙的に実装 | ❌ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | GET_APP_VERSION等4チャンネルtRPC移行 | 2.1 | Feature | ✅ |
| 1.2 | Zodスキーマ定義（system） | 2.1 | Feature | ✅ |
| 1.3 | Rendererフック置換（system） | 2.2 | Feature | ✅ |
| 1.4 | 統合テスト（system） | 2.3 | Integration Test | ✅ |
| 1.5 | レガシーハンドラ削除（system） | 2.3 | Cleanup | ✅ |
| 1.6 | preload API削除（system） | 2.3 | Cleanup | ✅ |
| 2.1 | config router作成 | 3.1 | Feature | ✅ |
| 2.2 | Config全チャンネル移行 | 3.1, 3.2 | Feature | ✅ |
| 2.3 | Zodスキーマ（config） | 3.1 | Feature | ✅ |
| 2.4 | configHandlers.ts削除 | 3.3 | Cleanup | ⚠️ (実施済みだがtasks.md未更新) |
| 2.5 | 統合テスト（config） | 3.3 | Integration Test | ⚠️ (同上) |

**Validation Results**:
- [x] 全criterion IDがトレーサビリティテーブルに含まれている
- [x] User-facing criteriaにFeature Implementation tasksが存在する
- [ ] Task 3.3のステータスが実態と一致していない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| system router | System Router | 2.3 (system-router.test.ts) | ✅ 実装済み |
| config router | Config Router | 3.3 (config-router.test.ts) | ✅ テストファイル作成済み |
| tRPC Context DI | DD-006 | 1.1 (context.test.ts) | ✅ 実装済み |
| Subscription (events) | eventsRouter | 9.3 | ✅ タスク定義あり |

**Validation Results**:
- [x] 実装済みルーターに対応するテストファイルが存在
- [x] IPC通信の結合テストパターンが確立済み

### 1.6 Cross-Document Contradictions

| # | 矛盾箇所 | 文書A | 文書B | 重要度 |
|---|----------|-------|-------|--------|
| 1 | Task 3.3ステータス | tasks.md: `[ ] 3.3 configHandlers.tsの削除と統合テスト` (未完了) | git status: `D electron-sdd-manager/src/main/ipc/configHandlers.ts`, `D configHandlers.test.ts`, 新規 `config-router.test.ts` | CRITICAL |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | ギャップ | 影響 | 重要度 |
|---|----------|------|--------|
| 1 | vanillaClientのライフサイクル管理が未文書化 | シングルトンの`ipcLink()`が`require`で動的ロードされるが、BrowserWindowクローズ時のcleanup考慮が未記載 | WARNING |
| 2 | vanillaClientのRemote UI互換性 | vanillaClientは`ipcLink()`使用のためElectron専用。Remote UIからは利用不可。これはINFO #1（レビュー#8）で既にNoFixと判定済みだが、design.mdに明記されていない | INFO |

### 2.2 Operational Considerations

特に新規ギャップなし。

## 3. Ambiguities and Unknowns

| # | 曖昧な点 | 関連文書 |
|---|----------|----------|
| 1 | 後続ルーター（project, spec, bug等）のRenderer移行でvanillaClient使用箇所の予測が未記載 | design.md DD-005 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tech.md**: IPC設計パターンセクション（行94-97）が依然としてレガシー記述（`channels.ts`, `handlers.ts`, preload経由）のまま。これはTask 13.1で更新予定だが、移行進行中に参照する開発者に混乱を与える可能性がある（INFO相当、Task 13で対応予定）

### 4.2 Integration Concerns

- structure.mdの`main/ipc/`セクション（行310-315）がtRPC移行前の構造のまま。Task 13.2で更新予定

### 4.3 Migration Requirements

特に問題なし。

## 5. Recommendations

### Critical Issues (Must Fix)

| # | Issue | 推奨アクション |
|---|-------|---------------|
| C1 | design.mdにvanillaClient（Zustand Store用命令的tRPCクライアント）の設計決定が未記載 | design.mdの「Renderer / Migration Layer」セクションにvanillaClientパターンを追記する。以下を含める: (1) `shared/trpc/vanillaClient.ts`のコンポーネント定義、(2) Reactフック vs vanillaClientの使い分けルール（コンポーネント内 → useQuery/useMutation、Store内 → vanillaClient）、(3) DD-005の移行手順を更新しvanillaClientパターンを明記 |
| C2 | Task 3.3（configHandlers.ts削除と統合テスト）がtasks.mdで未完了`[ ]`だが、実装は完了済み | tasks.mdのTask 3.3のチェックボックスを`[x]`に更新する |

### Warnings (Should Address)

| # | Issue | 推奨アクション |
|---|-------|---------------|
| W1 | design.md Components and InterfacesにReactフック層（useConfigTrpc, useSystemInfo）が未記載 | design.mdにRenderer/Shared Hooks Layerセクションを追加し、tRPCフックラッパーの命名規則（`use{Domain}Trpc`, `useSystemInfo`）と配置先（`shared/hooks/`）を記載 |
| W2 | vanillaClientのライフサイクル管理（シングルトン、dynamic require、cleanup）が設計文書に未記載 | design.mdのvanillaClientセクション追記時に、シングルトンパターンの理由（ipcLinkの再利用）とRemote UI非対応の明記を含める |

### Suggestions (Nice to Have)

| # | Issue | 推奨アクション |
|---|-------|---------------|
| I1 | steering/tech.mdのIPC設計パターンがレガシー記述のまま | Task 13.1で更新予定のため、現時点では対応不要。ただし中間更新として「tRPC移行中」の注記を追加することを検討 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| CRITICAL | C1: vanillaClient設計未記載 | design.md「Renderer / Migration Layer」に vanillaClientパターンを追記。DD-005移行手順を更新 | design.md |
| CRITICAL | C2: Task 3.3ステータス乖離 | tasks.md Task 3.3を`[x]`に更新 | tasks.md |
| WARNING | W1: Reactフック層未記載 | design.mdに Hooks Layer セクション追加 | design.md |
| WARNING | W2: vanillaClientライフサイクル未文書化 | C1の修正に含めてシングルトン設計の説明を追記 | design.md |
| INFO | I1: tech.mdレガシー記述 | Task 13.1で対応予定、現時点では対応不要 | tech.md |

---

_This review was generated by the document-review command._
