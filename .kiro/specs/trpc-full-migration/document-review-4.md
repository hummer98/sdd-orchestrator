# Specification Review Report #4

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-1.md, document-review-1-reply.md, document-review-2.md, document-review-2-reply.md, document-review-3.md, document-review-3-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 1 |
| WARNING | 3 |
| INFO | 2 |

レビュー#1〜#3で指摘されたCritical/Warning事項は全て修正適用済み。文書の数値精度は大幅に改善されている。本レビュー#4では、**実装着手前の最終確認**として以下の新規観点を検出した:

1. **CRITICAL**: `registerSteeringHandlers()`がresearch.mdのドメイン別チャンネルマッピングに含まれておらず、steeringハンドラのtRPC移行先が未定義
2. **WARNING**: IpcApiClientメソッド数がdesign.md「44メソッド」に対し実測41メソッドであるが、`getProjectPath()`が同期メソッドでありtRPC query移行時の注意が必要
3. **WARNING**: Subscription移行のelectron-trpc 0.7.1でのobservable()のcleanupパターンがdesign.mdに未記載
4. **WARNING**: Task間の依存関係においてSubscription移行（Task 9）がドメインルーター移行（Task 2-8）のRenderer差し替え完了前に実行不可である制約が暗黙的

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。レビュー#1〜#3指摘事項の修正完了後、requirements.mdとdesign.md/research.md間の矛盾は解消済み。数値の整合性も改善されている。

**修正確認**:
- ハンドラファイル数「22個」: requirements.md/design.mdで統一済み ✅
- IpcApiClientメソッド数「44メソッド」: レビュー#3-replyで実測41と確認、概ね正確 ✅
- Renderer参照数「693箇所/88ファイル」: design.md修正済み ✅
- DD-006 currentProjectPath DIパターン: Implementation Notes追記済み ✅

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。レビュー#3で追記された既存テスト参照の旨がtasks.mdの各統合テストTaskに反映済み。

**新規検出**:

| # | 不一致内容 | Design | Tasks | 影響 |
|---|-----------|--------|-------|------|
| 1 | **registerSteeringHandlers未マッピング** | design.md DD-006「handlers.tsの19個のregisterXxxHandlers()呼び出し」 | handlers.ts実測: **20個**（`registerSteeringHandlers()`が別途定義、行864）。research.mdのドメイン別チャンネルマッピングにsteering関連チャンネルが含まれていない | Task 10（その他ドメイン移行）のスコープに漏れがある可能性 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| systemRouter拡張 | ✅ 定義済み | Task 2.1-2.3 | ✅ |
| configRouter | ✅ Service Interface（22プロシージャ） | Task 3.1-3.3 | ✅ |
| projectRouter | ✅ Service Interface（9プロシージャ） | Task 4.1, 4.3-4.4 | ✅ |
| fileRouter | ⚠️ design.mdに詳細なし（research.md参照） | Task 4.2, 4.3-4.4 | ✅（既知の設計方針） |
| specRouter | ⚠️ 「同じパターン」（research.md参照） | Task 5.1, 5.3-5.4 | ✅（既知の設計方針） |
| bugRouter | ⚠️ 「同じパターン」（research.md参照） | Task 5.2, 5.3-5.4 | ✅（既知の設計方針） |
| agentRouter | ⚠️ 「同じパターン」（research.md参照） | Task 6.1-6.3 | ✅（既知の設計方針） |
| autoExecutionRouter | ⚠️ 「同じパターン」（research.md参照） | Task 7.1-7.3 | ✅（既知の設計方針） |
| gitRouter | ⚠️ 「同じパターン」（research.md参照） | Task 8.1-8.3 | ✅（既知の設計方針） |
| eventsRouter | ✅ Subscription Interface（36 Subscription） | Task 9.1-9.3 | ✅ |
| cloudflare/install/mcp/schedule/misc | ⚠️ 「同じパターン」（research.md参照） | Task 10.1-10.7 | ⚠️（steering未マッピング） |
| **steeringHandlers** | ❌ 未定義 | ❌ 未タスク化 | ❌ CRITICAL |
| Zodスキーマ群 | ✅ ファイル配置定義済み | 各タスクに含む | ✅ |
| レガシー撤廃 | ✅ Impact Analysis Contract完備 | Task 11.1-11.5 | ✅ |
| E2Eテスト | ✅ Verification Contract定義済み | Task 12.1-12.2 | ✅ |
| ドキュメント更新 | ✅ 対象ファイル明記 | Task 13.1-13.4 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**レビュー#1-#3との差分**: Coverage Matrixに変更なし。全50個のcriterionが適切なTaskにマッピングされている。

ただし、`registerSteeringHandlers()`内のチャンネルがReq 9（その他ドメイン移行）のAcceptance Criteriaに列挙されているカテゴリのいずれに該当するかが不明確。`steeringHandlers.ts`という独立ファイルは存在せず、`handlers.ts`内のローカル関数として定義されているため、Req 10のレガシーIPC撤廃（handlers.ts削除）で暗黙的にカバーされるが、**tRPC側の移行先が未定義**である。

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Infrastructureのみのcriterionはドキュメント更新系（12.x）のみで適切
- [x] Cleanupタスクに対応する削除対象ファイルが具体的に列挙されている
- [ ] `registerSteeringHandlers()`のチャンネルがドメイン別マッピングに含まれていない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | 全ルーター | 各ドメインTask X.3/X.4 | ✅ |
| Context DI → モックService注入 | DD-006 | Task 1.1, 1.2 | ✅ |
| Zodスキーマバリデーション | Zodスキーマ群 | 各ルーターテスト内 | ✅ |
| Subscription → EventEmitter | eventsRouter | Task 9.3 | ✅ |
| Renderer Subscription接続 | Subscription移行フロー | Task 12.1（UJ-004） | ✅ |
| IpcApiClient完全削除後の動作 | DD-005 | Task 11.5 | ✅ |
| Remote UI WebSocketApiClient独立性 | Migration Strategy | なし | ✅ |
| Subscription cleanup on window close | DD-003 | なし | ⚠️ |

**新規指摘**:
- design.md DD-003の「Consequences」に「全イベントリスナー（34種類）をSubscriptionフックに書き換える必要がある」と記載があるが、Subscription接続のライフサイクル管理（BrowserWindowクローズ時のcleanup）がdesign.mdにもtasks.mdにも検証タスクとして含まれていない。research.mdの「Risk 1」で言及されているが、具体的な検証タスクへの落とし込みがない

**Validation Results**:
- [x] 各ルーターに統合テストタスクが存在
- [x] Subscription統合テスト方法がTask 9.3に記載
- [x] E2E Smoke TestがTask 12.1に含まれる
- [ ] Subscriptionライフサイクル管理（cleanup）の検証タスクが未定義

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **registerSteeringHandlers未マッピング** | handlers.ts実測: `registerSteeringHandlers()`が行864に定義、CHECK_STEERING_FILES/GENERATE_VERIFICATION_MD等のチャンネルを含む | research.md: spec routerマッピングに「CHECK_STEERING_FILES」「GENERATE_VERIFICATION_MD」「CHECK_RELEASE_MD」「GENERATE_RELEASE_MD」が記載されている。ただしhandlers.ts内では`registerSteeringHandlers()`として**別関数**に分離されている | WARNING |
| 2 | **design.md DD-006のregister関数数** | design.md DD-006 Implementation Notes: 「handlers.tsの19個のregisterXxxHandlers()呼び出し」 | 実測: `registerIpcHandlers()`内に19個の呼び出し + `registerSteeringHandlers()`定義が行864にあり、厳密には**20個**。ただしregisterSteeringHandlersはregisterIpcHandlers内から呼ばれるため19+1=20 | INFO |

**注記**: 矛盾#1について、research.mdのspec routerマッピングテーブル（行246-252）に`CHECK_STEERING_FILES`、`GENERATE_VERIFICATION_MD`、`CHECK_RELEASE_MD`、`GENERATE_RELEASE_MD`が**spec router**の移行先として既に記載されている。handlers.ts内のコード構造（`registerSteeringHandlers`が別関数）とresearch.md（spec routerに含む）の方針が一致していることを確認。ただしdesign.mdのComponents一覧にはこれらプロシージャへの言及がない。

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **Subscription cleanup未検証**: design.md DD-003でelectron-trpc 0.7.1のSubscription対応を記載し、research.mdのRisk 1で「BrowserWindowクローズ時のcleanup検証が必要」と警告しているが、tasks.mdにこの検証を行うタスクが存在しない。Task 9.1（eventsルーター実装）のスコープ内で暗黙的にカバーされるべきだが明示されていない | WARNING | Subscription接続がcleanupされずメモリリークの原因となるリスク。パイロット段階（Task 2）でSubscription未使用のため、Task 9実装時に初めて問題が顕在化する |
| 2 | **IpcApiClientの同期メソッド`getProjectPath()`**: IpcApiClientには`getProjectPath()`という唯一の同期メソッドがある（行92）。tRPCプロシージャはすべて非同期であるため、この同期呼び出しパターンの移行は`trpc.project.getInitialProjectPath.useQuery()`への置換となるが、同期→非同期の変更がRenderer側のStore初期化ロジックに影響する可能性がある | INFO | IpcApiClientの同期メソッドは1つのみであり影響は限定的 |
| 3 | **CONFIRM_COMMON_COMMANDS チャンネル**: research.mdのspec routerマッピングに`CONFIRM_COMMON_COMMANDS`（spec.confirmCommonCommands）が記載されているが、このチャンネルはElectron dialogを使用するため、tRPC mutation内でのElectron dialog呼び出しパターンの設計が必要。design.md projectRouterの`showOpenDialog`と同様のパターンだが、specRouter側での言及がない | INFO | projectRouterで確立されたパターンを適用すれば解決可能 |

### 2.2 Operational Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **移行中のtRPC/レガシーIPC共存期間の検証方法**: design.md Migration Strategyで「各Phaseは独立してTypeScript/テストがpassする状態を維持」と記載されているが、tasks.mdの各Phase完了時に「TypeScriptコンパイル + 全テストpass」を検証するステップが明示されていない。Task 11.5（最終検証）のみに集中している | WARNING | 中間Phase完了時にデグレが検出されず、問題が蓄積するリスク |

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **Task 9（Subscription移行）のRenderer差し替え前提条件**: Task 9.2はApp.tsxの全イベントリスナー（34個）をSubscriptionフックに変更するが、これらのリスナーの一部は各ドメインStore更新と結合している（例: `AGENT_OUTPUT` → `agentStore.addOutput()`）。ドメインルーターのRenderer差し替え（Task 2.2〜10.6）との実行順序が暗黙的にしか定義されていない | tasks.md | Task 9.2実装時にStore内の`window.electronAPI`呼び出しが既にtRPCに置換済みであることが前提だが、Task 9がTask 2-8の完了前に着手される場合の扱いが不明 |
| 2 | **WebSocketApiClientのApiClientインターフェース縮小範囲**: design.md DD-005で「ApiClientインターフェース自体はWebSocketApiClient用に残る」と記載されているが、IpcApiClient（41メソッド）とWebSocketApiClient（42メソッド）のメソッドセットに差異があるかの分析が不足。IpcApiClient削除時にApiClientインターフェースをWebSocketApiClient実装に合わせて縮小する際のbreaking changeリスク | design.md, tasks.md Task 11.4 | Task 11.4の「src/shared/api/types.tsのApiClientインターフェースをWebSocketApiClient用に整理する」の具体的な変更範囲が不明 |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体評価**: 良好。レビュー#3以降の修正により、Steering文書との整合性は高い水準を維持。

- **tech.md**: 「IPC設計パターン」はTask 13.1で更新予定。tRPC移行後のアーキテクチャとの整合性は確保される
- **structure.md**: `src/main/ipc/`セクションはTask 13.2で`src/main/trpc/`に更新予定。Electron Process Boundary RulesはtRPCでも維持される
- **structure.md Electron Process Boundary Rules**: tRPC移行後の「Renderer → tRPC mutation/query → Main → Subscription → Renderer」フローは既存ルールと完全に整合
- **design-principles.md**: KISS/YAGNI/DRY原則との適合を確認。DD-002「薄いアダプター」はKISS準拠

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| **Remote UI（WebSocketApiClient）への影響** | IpcApiClient削除後もWebSocketApiClientは独立して動作 | DD-005で方針定義済み ✅ |
| **ApiClientインターフェース整理** | IpcApiClient削除後、ApiClient型をWebSocketApiClient用に縮小 | Task 11.4で対応 ⚠️（縮小範囲が未分析） |
| **既存IPCテスト33ファイルの扱い** | テストファイル削除によるカバレッジ低下 | 各ドメインルーターテスト（Task X.3/X.4）で参照する方針が追記済み ✅ |
| **Electron Process Boundary維持** | tRPC移行後もMain/Renderer境界ルール維持 | structure.mdのルールはtRPCで自然に適用 ✅ |
| **tech.md tRPC記載なし** | 現在tech.mdにtRPC関連の技術スタック記載がない | Task 13.1で更新予定 ✅ |

### 4.3 Migration Requirements

- **段階的移行**: DD-001の方針は適切。各Phase独立でTypeScript/テストpassを維持
- **WebSocketHandler独立性**: webSocketHandlerはchannels.tsに直接依存せず、独立動作が確認済み
- **後方互換性**: レガシーIPC/tRPC共存設計は健全
- **tRPC基盤**: trpc-infrastructure Specで構築済みの基盤（system.ts、provider、client）が正常に動作していることが前提

## 5. Recommendations

### Critical Issues (Must Fix)

1. **`registerSteeringHandlers()`のtRPC移行先を明確化**（Section 1.2 #1, Section 1.3）
   - handlers.ts行864の`registerSteeringHandlers()`はCHECK_STEERING_FILES、GENERATE_VERIFICATION_MD、CHECK_RELEASE_MD、GENERATE_RELEASE_MDの4チャンネルを登録する
   - research.mdのspec routerマッピングにはこれらが記載されているが、**handlers.ts内で独立関数として分離されている事実がdesign.mdに記載されていない**
   - **推奨**: 以下のいずれかを実施:
     a. design.md DD-006 Implementation Notesの「handlers.tsの19個のregisterXxxHandlers()呼び出し」を「20個」に修正し、registerSteeringHandlersが含むチャンネルのspec routerへの移行先を明示
     b. または、registerSteeringHandlersの4チャンネルがresearch.mdのspec routerマッピングに含まれていることを確認した上で、design.md/tasks.md Task 5.1（specルーター実装）のスコープ内であることを明記
   - **影響**: Task 11.2でhandlers.tsを削除する際に、registerSteeringHandlersの4チャンネルのtRPC移行が漏れるリスク

### Warnings (Should Address)

1. **Subscriptionライフサイクル管理の検証タスク追加**（Section 1.5, Section 2.1 #1）
   - research.md Risk 1で「BrowserWindowクローズ時のcleanup検証が必要」と警告されているが、tasks.mdに検証タスクが未定義
   - **推奨**: Task 9.1に「electron-trpc SubscriptionのBrowserWindowクローズ時cleanup動作を検証する」サブステップを追加。または、Task 2（パイロット移行）に最小限のSubscriptionテスト（healthCheck Subscriptionなど）を含めて早期検証する
   - **影響**: Subscription接続のメモリリークリスクが最終段階まで検出されない

2. **各Phase完了時のTypeScript/テスト検証ステップ明示**（Section 2.2 #1）
   - design.md Migration Strategyで「各Phaseは独立してTypeScript/テストがpassする状態を維持」と記載されているが、tasks.mdの各Phase末尾にこの検証ステップが含まれていない
   - **推奨**: 各ドメイン移行Task（Task 2-10）のレガシーコード削除ステップ（X.3/X.4）に「`npm run typecheck && vitest run` で全体の整合性を検証」を追記
   - **影響**: 中間Phase完了時のデグレが蓄積し、Task 11.5（最終検証）で大量のエラーが発生するリスク

3. **ApiClientインターフェース縮小範囲の事前分析**（Section 3 #2）
   - IpcApiClient（41メソッド）とWebSocketApiClient（~42メソッド）のメソッドセット差異が未分析
   - **推奨**: research.mdに「IpcApiClient vs WebSocketApiClient メソッド差分テーブル」を追記し、Task 11.4で削除すべきインターフェースメソッドを事前に特定
   - **影響**: Task 11.4実装時の作業量見積もり精度に影響

### Suggestions (Nice to Have)

1. **Task 9のRenderer差し替え前提条件の明示**: tasks.md Task 9.2に「前提: Task 2.2〜8.2（各ドメインのRenderer差し替え）完了後に実施」を明記すると、実行順序の暗黙的な依存関係が明確化される
2. **移行進捗ダッシュボード**: 219チャンネル/41 IpcApiClientメソッド/34 Subscriptionイベント/88ファイルの移行進捗を各Phase完了後にGrepベースで追跡するワンライナーコマンド集を定義すると、移行漏れの早期発見に有効

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | registerSteeringHandlersのtRPC移行先未明確化 | design.md/tasks.mdで4チャンネルのspec router移行先を明示。DD-006の関数数を19→20に修正 | design.md, tasks.md |
| WARNING | Subscriptionライフサイクル管理の検証タスク未定義 | Task 9.1にcleanup検証ステップを追加、またはTask 2で早期検証 | tasks.md |
| WARNING | 各Phase完了時のTypeScript/テスト検証ステップ未明示 | 各ドメインTaskの末尾に`npm run typecheck && vitest run`検証を追記 | tasks.md |
| WARNING | ApiClientインターフェース縮小範囲の事前分析不足 | research.mdにIpcApiClient vs WebSocketApiClientメソッド差分テーブルを追記 | research.md |
| INFO | DD-006のregister関数数19→20 | 軽微な数値修正 | design.md |
| INFO | CONFIRM_COMMON_COMMANDSのElectron dialog呼び出しパターン | specRouter実装時にprojectRouterパターンを参照する旨を注記 | なし（実装時に自明） |

---

_This review was generated by the document-review command._
