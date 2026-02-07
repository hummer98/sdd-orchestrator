# Specification Review Report #13

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 分類 | 件数 |
|------|------|
| Critical | 4 |
| Warning | 5 |
| Info | 3 |

第13ラウンドのレビューでは、12ラウンドに渡る改善の成果を踏まえ、**実装進行中の現状**（Task 1〜5.3完了、5.4以降未着手）との整合性に焦点を当てて検証した。主にtasks.mdの実装状況とdesign.md/requirements.mdの仕様整合、Steering文書との将来的な乖離リスクを指摘する。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**評価: 概ね良好**

全12要件（Req 1〜12）に対応するDesign定義が存在し、Requirements Traceabilityテーブルで全criterion IDがマッピングされている。

**指摘事項**:

| # | Requirements記述 | Design記述 | ステータス |
|---|-----------------|-----------|-----------|
| 1 | Req 9.1: SSH関連チャンネルの具体数が未記載 | Design: miscRouterにSSH 7プロシージャ統合 | ⚠️ WARNING: Requirements側でSSHチャンネル数を明記すべき |
| 2 | Req 2 AC4: 「全22プロシージャ」の元ハンドラ構成 | Design configRouter: 22プロシージャのService Interface定義 | ✅ 整合 |
| 3 | Req 8 AC2: 「ファイル変更検知」 | Design eventsRouter: onGitChangesDetected + onProjectFileChanged | ✅ 整合 |

### 1.2 Design ↔ Tasks Alignment

**評価: 概ね良好、但し一部乖離あり**

| # | Design定義 | Tasks対応 | ステータス |
|---|-----------|----------|-----------|
| 1 | eventsRouter（Req 8: 36 Subscriptions） | Task 9.1〜9.3 | ✅ |
| 2 | cloudflare/install/mcp/schedule/miscRouter（Req 9） | Task 10.1〜10.7 | ✅ |
| 3 | IpcApiClient段階的廃止 | Task 11.4 | ✅ |
| 4 | vanillaClient（Design定義） | tasks.mdに明示的な実装タスクなし | ⚠️ INFO: 既にTask 1-5.3で実装されているため問題なし |

### 1.3 Design ↔ Tasks Completeness

| カテゴリ | Design定義 | Task Coverage | ステータス |
|---------|-----------|---------------|-----------|
| UI Components（Renderer移行） | design.md §Interface Changes: 約693箇所 | Task 2.2, 3.2, 4.3, 5.3, 6.2, 7.2, 8.2, 9.2, 10.6 | ✅ |
| Services（ルーター実装） | 15ルーター定義 | Task 2.1, 3.1, 4.1, 4.2, 5.1, 5.2, 6.1, 7.1, 8.1, 9.1, 10.1-10.5 | ✅ |
| Types/Models（Zodスキーマ） | 各ルーター内インライン | 各ルーター実装タスクに含む | ✅ |
| Cleanup（レガシー削除） | Impact Analysis Contract 25ファイル削除 | Task 2.3, 3.3, 4.4, 5.4, 6.3, 7.3, 8.3, 9.2, 10.7, 11.1-11.4 | ✅ |
| テスト | 各ルーターテスト | 各Taskの統合テスト項目 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | ステータス |
|-----------|---------|----------------|-----------|-----------|
| 1.1 | GET_APP_VERSION等4チャンネルtRPC移行 | 2.1 | Feature | ✅ |
| 1.2 | Zodスキーマ定義（system） | 2.1 | Feature | ✅ |
| 1.3 | Rendererフック置換（system） | 2.2 | Feature | ✅ |
| 1.4 | 統合テスト（system） | 1.2, 2.3 | Integration Test | ✅ |
| 1.5 | レガシーハンドラ削除（system） | 2.3, 4.4 | Cleanup | ✅ |
| 1.6 | preload API削除（system） | 2.3 | Cleanup | ✅ |
| 2.1 | config router作成 | 3.1 | Feature | ✅ |
| 2.2 | Config全チャンネル移行 | 3.1, 3.2 | Feature | ✅ |
| 2.3 | Zodスキーマ（config） | 3.1 | Feature | ✅ |
| 2.4 | configHandlers.ts削除 | 3.3 | Cleanup | ✅ |
| 2.5 | 統合テスト（config） | 1.2, 3.3 | Integration Test | ✅ |
| 3.1-3.6 | Project/File移行 | 4.1-4.4 | Feature/Cleanup/Test | ✅ |
| 4.1-4.6 | Spec/Bug移行 | 5.1-5.4 | Feature/Cleanup/Test | ✅ |
| 5.1-5.5 | Agent移行 | 6.1-6.3 | Feature/Cleanup/Test | ✅ |
| 6.1-6.5 | AutoExecution移行 | 7.1-7.3 | Feature/Cleanup/Test | ✅ |
| 7.1-7.5 | Git/Worktree移行 | 8.1-8.3 | Feature/Cleanup/Test | ✅ |
| 8.1-8.5 | Subscription移行 | 9.1-9.3 | Feature/Cleanup/Test | ✅ |
| 9.1-9.4 | その他ドメイン移行 | 10.1-10.7 | Feature/Cleanup/Test | ✅ |
| 10.1-10.8 | レガシーIPC撤廃 | 11.1-11.5 | Cleanup/Test | ✅ |
| 11.1-11.3 | E2E/人間テスト | 12.1-12.2 | Feature | ✅ |
| 12.1-12.4 | ドキュメント更新 | 13.1-13.4 | Infrastructure | ✅ |

**Validation Results**:
- [x] 全criterion IDがtasks.mdのCoverage Matrixに含まれている
- [x] ユーザー向けcriterionにFeature Implementation タスクが存在する
- [x] Infrastructureのみに依存するcriterionが存在しない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | ステータス |
|-------------------|----------------|-----------|-----------|
| tRPC Router → Service | DD-002 | 各ルーターTask .3/.4 | ✅ |
| Subscription → EventEmitter | DD-003 | Task 9.3 | ✅ |
| Context DI → Service | DD-006 | Task 1.1, 1.2 | ✅ |
| vanillaClient → IPC | Design §vanillaClient | vanillaClient.test.ts | ✅ |
| Renderer Store → tRPC | Design §IpcApiClient廃止 | 各Task .2/.3 | ✅ |

**Validation Results**:
- [x] 全主要統合ポイントにテストタスクが存在する
- [x] Subscriptionのイベント配信テストが明示されている（Task 9.3）
- [x] Context DIのテスト検証が存在する（Task 1.1, 1.2）

### 1.6 Cross-Document Contradictions

| # | 文書A | 文書B | 矛盾内容 | 重要度 |
|---|------|------|---------|--------|
| 1 | requirements.md Req 9 AC1: 「Cloudflare Tunnel（11チャンネル）」 | research.md cloudflare router: 10プロシージャ | ❌ CRITICAL: チャンネル数の不一致。requirements.mdは11チャンネルとしているが、research.mdのマッピングテーブルには10プロシージャしか列挙されていない。1チャンネルはSubscription（CLOUDFLARE_TUNNEL_STATUS_CHANGED → events.onCloudflareTunnelStatusChanged）であり、events routerに移行されるためcloudflare routerの対象外。requirements.md側の記述が曖昧 | CRITICAL |
| 2 | requirements.md Req 9 AC1: 「Install関連（17チャンネル）」 | research.md install router: 20プロシージャ / tasks.md Task 10.2: 20プロシージャ | ❌ CRITICAL: requirements.mdは17チャンネルとしているが、research.mdのマッピングでは20プロシージャが定義されている。checkMigrationNeeded, acceptMigration, declineMigration, checkJjAvailability, installJj, ignoreJjInstallの6つが追加されている（17+6=23ではなく20なので、元の17から3つが実は別カウント）。正確な対応関係を明記すべき | CRITICAL |
| 3 | requirements.md Req 9 AC1: 「Schedule Task（10チャンネル）」 | research.md schedule router: 9プロシージャ / tasks.md Task 10.4: 9プロシージャ | ❌ CRITICAL: requirements.mdは10チャンネルだが、research.mdとtasks.mdでは9プロシージャ。1チャンネルはSubscription（SCHEDULE_TASK_STATUS_CHANGED → events.onScheduleTaskStatusChanged）であり、events routerの対象。requirements.md側がSubscriptionとQuery/Mutationの区別を明確にしていない | CRITICAL |
| 4 | design.md systemRouter Requirements参照: 「6.1, 6.2, 6.3, 6.4」 | 実際の対応: Req 1（パイロット移行） | ⚠️ WARNING: system.tsファイル内のRequirementsコメントが「6.1, 6.2, 6.3, 6.4」となっているが、これはReq 6（AutoExecution）を指す。systemRouterはReq 1に対応すべき。コメントの誤り |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 影響 | 重要度 |
|---|-----|-----|--------|
| 1 | **Subscription cleanup検証**: Design DD-003で「electron-trpc 0.7.1がSubscriptionをサポート」と記載あるが、BrowserWindowクローズ時のcleanup動作の検証がTask 9.1の一項目に留まる。独立したテスト要件として明確化すべき | Subscription接続リーク | WARNING |
| 2 | **Remote UI webContents.send残存**: 移行後もRemote UIはWebSocketApiClientを使用するが、Main側の`webContents.send()`呼び出し箇所が完全削除された場合、Remote UIへの通知が途絶える可能性。Design §Non-Goalsで「既存WebSocket通信を維持」としているが、webContents.sendとWebSocket broadcastの関係が不明確 | Remote UI通知断絶 | WARNING |
| 3 | **ContextServicesの肥大化**: 現在のContextServices型は約50プロパティ。残りの8ルーター（agent〜misc）追加で100以上になる可能性。Design DDでContextの肥大化対策が言及されていない | 型管理の複雑化 | INFO |

### 2.2 Operational Considerations

| # | Gap | 影響 | 重要度 |
|---|-----|-----|--------|
| 1 | **ロールバック手順**: Design §Rollback Triggersにトリガー条件は定義されているが、具体的なロールバック手順（ブランチ戦略、部分revertの方法）が未定義 | 移行失敗時の復旧遅延 | INFO |
| 2 | **移行中の並行テスト戦略**: レガシーIPC/tRPC共存期間中に両方のテストを実行する方法が明確でない。既存テストがレガシーIPCに依存している場合、移行中に壊れる | テスト信頼性低下 | WARNING |

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 影響 |
|---|-----------|-----|-----|
| 1 | Req 9 AC1のチャンネル数（11, 17, 10）がSubscriptionを含むか含まないか不明確 | requirements.md | 移行完了の判定基準が曖昧 |
| 2 | Task 10.7の「registerUnmigratedProjectHandlers」「registerUnmigratedFileHandlers」: これらがいつ作成され、どのタスクで廃止されるかのライフサイクルが不明確 | tasks.md | 中間パターンの管理リスク |
| 3 | Design §「残りのルーター（specRouter, bugRouter...）は同じパターンに従う」: 各ルーターの詳細プロシージャ一覧はresearch.mdに委任しているが、Design内に最小限のサマリがあるとレビュー効率が向上する | design.md | レビュー時の参照コスト |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

- **tech.md IPC設計パターン**: 現在「channels.ts → handlers.ts → preload」パターンを記載。Task 13.1で更新予定であり、整合性は保たれる ✅
- **structure.md IPC Pattern**: `main/ipc/`セクションが残存。Task 13.2で更新予定 ✅
- **design-principles.md DRY/SSOT**: Zodスキーマを型SSoTとする方針（DD-004）はSSOT原則に適合 ✅

### 4.2 Integration Concerns

| # | 懸念 | 影響 |
|---|------|-----|
| 1 | **Remote UIとの共存**: IpcApiClient削除後、ApiClientインターフェースのメソッド数がWebSocketApiClient基準になる。IpcApiClient固有メソッド（同期メソッド等）の洗い出しがTask 11.4に含まれている | ✅ 対応済み |
| 2 | **webSocketHandler.tsの更新**: Main側でwebContents.sendが削除された場合、webSocketHandler.tsのbroadcast経路にも影響する可能性。Design/Tasksでこの点が明示されていない | ⚠️ WARNING |

### 4.3 Migration Requirements

- **段階的移行**: Design §Migration Strategyで10フェーズの移行計画が定義済み ✅
- **並行存在方針**: Design §並行存在の方針で中間パターン（registerUnmigratedXxxHandlers）が定義済み ✅
- **TypeScript/テストpass保証**: 各Phase完了時に保証する方針が定義済み ✅

## 5. Recommendations

### Critical Issues (Must Fix)

| # | Issue | 推奨アクション |
|---|-------|--------------|
| C-1 | Req 9 AC1のチャンネル数がresearch.md/tasks.mdと不一致（Cloudflare 11→10、Install 17→20、Schedule 10→9） | requirements.md Req 9 AC1を修正し、Subscription対象チャンネルとQuery/Mutation対象チャンネルを明確に区別する。各ドメインのチャンネル数を正確に記載する |
| C-2 | system.tsのRequirementsコメント誤り（「6.1, 6.2, 6.3, 6.4」→Req 1が正しい） | 実装済みコードのコメントを修正する（Req 1.1, 1.2に変更） |
| C-3 | requirements.md Req 9 AC1のinstallチャンネル数17が不正確 | research.mdのinstall routerマッピング（20プロシージャ）を基準に、requirements.mdの数値を更新する |
| C-4 | requirements.md全体でSubscriptionチャンネルの扱いが一貫していない | 各ドメインのチャンネル数記載に「（うちSubscription X個はReq 8で対応）」の注記を統一的に追加する |

### Warnings (Should Address)

| # | Issue | 推奨アクション |
|---|-------|--------------|
| W-1 | Subscription cleanup検証が単一タスク内の一項目に過ぎない | Task 9.1内で独立したサブ項目として「BrowserWindowクローズ時のSubscription解除テスト」を明記する |
| W-2 | Remote UI webContents.send削除時のbroadcast影響が未分析 | Design §Non-GoalsまたはIntegration Strategyに「webContents.send削除時、webSocketHandler.tsのbroadcast経路は影響を受けない（WebSocket broadcastは独立した経路）」ことを明記する |
| W-3 | 移行中の並行テスト戦略が未定義 | Design §Testing Strategyに「移行中は既存IPCテストとtRPCテストの両方を実行し、ドメイン移行完了後に旧テストを削除する」方針を追記する |
| W-4 | SSH関連チャンネル数がrequirements.mdに未記載 | Req 9 AC1に「SSH関連（7チャンネル + 1 Subscription）」を明記する |
| W-5 | webSocketHandler.tsがtRPC移行でどう影響を受けるか不明確 | Design §Non-GoalsまたはIntegration StrategyにwebSocketHandler.tsの不変性を明記する |

### Suggestions (Nice to Have)

| # | Issue | 推奨アクション |
|---|-------|--------------|
| S-1 | ContextServicesの肥大化リスク | 将来的にServiceGrouping（`ctx.services.config.*`, `ctx.services.agent.*`等）への分割を検討メモとして残す |
| S-2 | Design内に各ルーターのプロシージャ数サマリがない | Components and Interfacesテーブルにプロシージャ数カラムを追加する |
| S-3 | tasks.mdの中間パターン（registerUnmigratedXxxHandlers）のライフサイクルが分散している | tasks.mdにAppendixとして「中間パターンの作成タスク→削除タスク」のマッピング表を追加する |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | C-1 | Req 9 AC1のチャンネル数修正（Subscription分離の明記） | requirements.md |
| CRITICAL | C-2 | system.tsのRequirementsコメント修正 | routers/system.ts（実装コード） |
| CRITICAL | C-3 | installチャンネル数17→正確な数値に更新 | requirements.md |
| CRITICAL | C-4 | Subscriptionチャンネルの扱いを統一的に注記 | requirements.md |
| WARNING | W-1 | Subscription cleanup検証の明確化 | tasks.md |
| WARNING | W-2 | webContents.send削除のRemote UI影響を明記 | design.md |
| WARNING | W-3 | 移行中の並行テスト戦略追記 | design.md |
| WARNING | W-4 | SSH関連チャンネル数の明記 | requirements.md |
| WARNING | W-5 | webSocketHandler.tsの不変性明記 | design.md |
| INFO | S-1 | ContextServices肥大化対策メモ | design.md |
| INFO | S-2 | ルータープロシージャ数サマリ | design.md |
| INFO | S-3 | 中間パターンライフサイクル表 | tasks.md |

---

_This review was generated by the document-review command._
