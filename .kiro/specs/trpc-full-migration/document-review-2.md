# Specification Review Report #2

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-1.md, document-review-1-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 2 |
| WARNING | 5 |
| INFO | 3 |

レビュー#1で指摘されたCritical/Warning事項（GET_APP_PATH矛盾、GET_INITIAL_PROJECT_PATH配置、プロシージャ数不整合、SSHチャンネル具体化）は全て修正済み。本レビューでは、コードベースとの照合により新たに検出された問題を報告する。主な発見は、**イベントリスナー数の過小見積もり**（design.md「約25個」に対し実測34個）と**system系チャンネルの登録元ファイルの認識相違**である。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。レビュー#1指摘事項の修正により、requirements.mdとdesign.md/research.md間の矛盾は解消済み。

**新規検出**:

| # | 不一致内容 | Requirements | Design/Research | 影響 |
|---|-----------|-------------|-----------------|------|
| 1 | ipcRenderer.onリスナー数 | Req 8: 「以下のイベント通知が移行されていること」（5カテゴリ列挙） | design.md: 「約25リスナー」「約25種類」 | 実測34個。Subscription定義に漏れの可能性 |

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。レビュー#1指摘のプロシージャ数不整合は修正済み（Task 3.1: 22、Task 4.1: 9）。

**新規検出**:

| # | 不一致内容 | Design | Tasks | 影響 |
|---|-----------|--------|-------|------|
| 1 | system系チャンネルの登録元 | design.md: 「handlers.ts」の対応ハンドラ削除（Criterion 1.5） | Task 2.3: 「レガシーIPCハンドラ、preload APIエントリを削除する」 | 実際にはprojectHandlers.ts内に登録されている。Task 2.3の削除対象が曖昧 |
| 2 | eventsRouter Subscription数 | design.md eventsRouter: 35 Subscription定義 | Task 9.1: 「全Subscriptionプロシージャを定義する（Agent系6個、...Menu系8個）」括弧内合計35個 | 実測リスナー34個＋α。括弧内の分類と実際のpreloadリスナー数に微差あり |

### 1.3 Design ↔ Tasks Completeness

**レビュー#1からの変更**: fileRouter、省略ルーター群の⚠️ステータスは変更なし（意図的省略でありresearch.md参照で対応可能）。

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| eventsRouter Subscription | ✅ 35 Subscription定義 | Task 9.1 | ⚠️ 実測との差分あり |
| Remote UI影響（WebSocketHandler） | ❌ 影響なしの明記のみ | なし | ✅ コードベース検証で影響なし確認済 |
| Context DI（DD-006） | ✅ 設計記載 | Task 1.1 | ✅ |
| テストヘルパー | ✅ 記載あり | Task 1.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**レビュー#1との差分**: 全criterion IDのマッピング状況は変更なし（全て✅）。

**新規検出**:

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.5 | レガシーハンドラ削除 | 2.3 | Cleanup | ⚠️ 削除対象がprojectHandlers.ts内の一部であることが未明記 |

**詳細**: Req 1 Criterion 1.5「古いIPCハンドラが削除されていること」について、system系チャンネル（GET_APP_VERSION、GET_PLATFORM）はhandlers.ts本体ではなく`projectHandlers.ts`内で登録されている（行247-255）。Task 2.3では「4チャンネルに対応するレガシーIPCハンドラ」の削除と記載しているが、projectHandlers.tsから部分削除する必要がある点が曖昧。ただしTask 4.4でprojectHandlers.ts全体を削除するため、Phase 1（Task 2.3）ではこの部分的な削除を実施しない選択肢もある。

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tRPC Router → Service呼び出し | 全ルーター | 各ドメインTask | ✅ |
| Context DI テストパターン | DD-006 | Task 1.2 | ✅ |
| Subscription → EventEmitter | eventsRouter | Task 9.3 | ✅ |
| WebSocketHandler独立性 | DD-005, Migration Strategy | なし | ✅ コードベースで確認済（影響なし） |

**Validation Results**:
- [x] レビュー#1 C3（Subscription E2Eテスト戦略）: Task 9.3 + Task 12.1（UJ-004）で担保。修正不要の判断は妥当
- [x] 各ルーターに統合テストタスクが存在
- [x] WebSocketHandler（Remote UI）はchannels.tsに依存しておらず、IPC層削除の影響なし

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **ipcRenderer.onリスナー数の過小見積もり** | design.md: 「全イベントリスナー（約25種類）」（行783） | preload/index.ts実測: **34個**のipcRenderer.onリスナー | CRITICAL |
| 2 | **system系チャンネルの登録元の認識相違** | design.md Requirements Traceability: 「handlers.ts」から対応ハンドラ削除（Criterion 1.5 行148） | 実際の登録場所: `projectHandlers.ts`（行247-255） | WARNING |
| 3 | **design.md eventsRouter定義とpreloadリスナーの網羅性** | design.md eventsRouter: 35 Subscription（onAutoExecutionPhaseStartedを含む） | preload/index.ts: AUTO_EXECUTION_PHASE_STARTEDリスナーなし、代わりにAUTO_EXECUTION_PHASE_COMPLETEDのみ | WARNING |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **Context DI導入時の既存テスト影響**: system-router.test.tsは現在`createCaller({})`で空Contextを使用。DD-006導入後、全テストでモックContextが必要になるが、移行手順（既存テストの更新タイミング）が未記載 | WARNING | Task 1.1と各ドメインテストの間でテスト破壊が起こる可能性 |
| 2 | **handlers.ts内のService DI移行**: handlers.ts（行81-96）で11個のサービスインスタンスが初期化されている。これらをContext内に移行する具体的な手順がTask 1.1の記述では抽象度が高い | INFO | 実装時に設計判断が必要 |
| 3 | **Phase 1でのsystem系チャンネル部分削除の実現性**: GET_APP_VERSIONとGET_PLATFORMはprojectHandlers.ts内に埋め込まれており、Phase 1で部分削除するとprojectHandlers.tsの変更が必要。ただしPhase 3（Task 4.4）でprojectHandlers.ts全体を削除予定 | INFO | Phase 1の「レガシー削除」範囲の明確化 |

### 2.2 Operational Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **tech.mdの現行IPC設計パターン**: tech.mdは「IPC設計パターン: channels.ts + handlers.ts + preload」と記載しているが、tRPC基盤が既に導入済みであることが未反映。ただしTask 13.1で更新予定 | INFO | 移行完了前の中間状態でのドキュメント参照に混乱が生じる可能性（許容範囲） |

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **Task 2.3の「レガシーIPCハンドラ削除」範囲**: system系チャンネルがprojectHandlers.ts内にあるため、Phase 1では「削除」ではなく「部分的に移行完了マーキング」とすべきか、それともprojectHandlers.tsから当該行を削除するか | tasks.md | 実装時の判断に影響。Phase 3でprojectHandlers.ts全体が削除されるため、Phase 1では削除しない方が安全な可能性あり |
| 2 | **design.md eventsRouterの`onAutoExecutionPhaseStarted`**: Subscription定義に含まれているが、preload/index.tsにはAUTO_EXECUTION_PHASE_STARTEDのリスナーがない。新規Subscriptionとして追加するのか、既存リスナーの変換なのか不明 | design.md | Task 9.1の実装時にSubscription対象の正確なリストが必要 |
| 3 | **SSH_STATUS_CHANGED (`ssh:status-changed`)**: このイベントはカスタムチャンネル名（非IPC_CHANNELS定数）であり、channels.ts外で定義されている。Task 9.1/10.7での扱いが不明確 | design.md, research.md | Subscription移行時にchannels.ts定数外のカスタムイベントも含めるか |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**全体評価**: 良好。レビュー#1での確認事項に加え、追加の確認結果を報告。

- **structure.md**: `src/main/ipc/`ディレクトリのIPC Patternセクションがtask 13.2更新対象。現時点では移行前の正確な記載であり、問題なし
- **design-principles.md**: DD-002「ルーターは既存Serviceの薄いアダプター」はKISS/YAGNI原則に準拠。不要な抽象層を導入しない判断は適切
- **tech.md Remote UIセクション**: Task 13.1にIpcApiClient記述の更新が追記済み（レビュー#1修正済み）

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| **WebSocketHandler独立性** | channels.ts削除後も影響なし | コードベース検証で確認済。webSocketHandlerはchannels.tsに依存していない |
| **ApiClientインターフェース整理** | IpcApiClient削除後のApiClient型変更 | DD-005で方針定義済み、Task 11.4で対応 |
| **Electron Process Boundary** | tRPC移行後もMain/Renderer境界ルール維持 | structure.mdのプロセス境界ルールはtRPCでも同様に適用される |

### 4.3 Migration Requirements

- **段階的移行**: DD-001の方針に変更なし
- **WebSocketHandler**: 完全に独立した層であり、本Spec範囲の移行に影響しないことを確認
- **後方互換性**: 移行中のレガシーIPC/tRPC共存は設計通り

## 5. Recommendations

### Critical Issues (Must Fix)

1. **ipcRenderer.onリスナー数の修正**（Section 1.6 #1）
   - design.md「約25種類」は実測34個と大幅に乖離
   - **推奨**: design.md Interface Changes & Impact Analysisセクションの「約25リスナー」を「34リスナー」に修正。eventsRouter Subscription定義との網羅性を再確認
   - **影響**: eventsRouter Subscription定義に欠落がないかの検証が必要

2. **eventsRouter Subscription定義とpreloadリスナーの網羅性検証**（Section 1.6 #3）
   - design.md eventsRouterにはAUTO_EXECUTION_PHASE_STARTED Subscriptionが含まれるが、preload/index.tsにはAUTO_EXECUTION_PHASE_STARTEDリスナーが存在しない（PHASE_COMPLETEDのみ）
   - design.md eventsRouterにonSshStatusChangedが含まれていない（preloadには`ssh:status-changed`リスナーが存在）
   - **推奨**: 実測34リスナーとdesign.md eventsRouter 35 Subscription定義を1:1でマッピングし、差分を明確化

### Warnings (Should Address)

1. **system系チャンネルの登録元をTask 2.3に明記**（Section 1.6 #2）
   - GET_APP_VERSION/GET_PLATFORMはprojectHandlers.ts内で登録されている
   - **推奨**: Task 2.3に「system系チャンネルはprojectHandlers.ts内で登録されている。Phase 1ではprojectHandlers.tsから部分削除するか、Phase 3（Task 4.4）でのprojectHandlers.ts全体削除まで残すかを判断する」旨を追記

2. **Context DI導入時の既存テスト更新手順**（Section 2.1 #1）
   - system-router.test.tsは空Contextで動作するが、DD-006導入後はモックContextが必要
   - **推奨**: Task 1.1に「既存system-router.test.tsのContext引数を更新する」旨を追記

3. **design.md DD-003の「約25種類」記述修正**（Section 1.6 #1関連）
   - DD-003 Consequences「全イベントリスナー（約25種類）」を修正
   - **推奨**: 「34リスナー」に修正

4. **SSH_STATUS_CHANGEDのカスタムチャンネル扱い**（Section 3 #3）
   - `ssh:status-changed`はchannels.ts定数外のカスタムイベント名
   - **推奨**: research.md SSHマッピングテーブルにこのカスタムイベントの扱いを注記し、eventsRouter定義に`onSshStatusChanged`が含まれるか確認

5. **Task 2.3のPhase 1レガシー削除範囲の明確化**（Section 3 #1）
   - system系チャンネルのpreload削除は実施するが、projectHandlers.ts内のハンドラ部分削除はPhase 3まで延期するかどうか
   - **推奨**: Task 2.3に「preload/index.tsからsystem系API（3エントリ）を削除する。projectHandlers.ts内のsystem系ハンドラ（GET_APP_VERSION、GET_PLATFORM、GET_INITIAL_PROJECT_PATH）はTask 4.4でのprojectHandlers.ts全体削除時に一括削除する」と明記

### Suggestions (Nice to Have)

1. **preload/index.tsリスナー完全一覧の追加**: research.mdに実測34個のipcRenderer.onリスナー完全一覧テーブルを追加し、eventsRouter Subscriptionとの1:1マッピングを明示すると、Task 9.1実装時の参照性が大幅に向上
2. **Context DI移行パターンの実装例**: design.mdに`createCaller(mockContext)`パターンの具体例を記載すると、各ドメインルーターテスト作成時の一貫性が向上
3. **中間状態の検証コマンド統一**: 各Task完了後に`npm run build && npm run typecheck && vitest run`を実行する旨をtasks.mdに統一記載（レビュー#1 I3で「不要」判断だが、34個のリスナー移行では中間状態でのビルド破壊リスクが高い）

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | ipcRenderer.onリスナー数「約25」→ 実測34 | design.md Impact Analysis/DD-003の数値を「34リスナー」に修正 | design.md |
| CRITICAL | eventsRouter Subscription定義の網羅性 | 実測34リスナーとeventsRouter 35 Subscriptionの1:1マッピングを検証し、差分（onSshStatusChanged欠落、onAutoExecutionPhaseStarted差分）を解消 | design.md, research.md |
| WARNING | system系チャンネルの登録元 | Task 2.3にprojectHandlers.tsからの部分削除方針を明記 | tasks.md |
| WARNING | Context DI導入時のテスト更新 | Task 1.1に既存テスト更新手順を追記 | tasks.md |
| WARNING | DD-003リスナー数修正 | DD-003 Consequencesを修正 | design.md |
| WARNING | SSH_STATUS_CHANGEDカスタムイベント | eventsRouter定義にonSshStatusChanged追加確認 | design.md, research.md |
| WARNING | Phase 1レガシー削除範囲 | Task 2.3に削除範囲の詳細を明記 | tasks.md |
| INFO | preloadリスナー完全一覧 | research.mdに34リスナー一覧テーブル追加 | research.md |
| INFO | Context DIテストパターン例 | design.mdにmockContextの実装例追記 | design.md |
| INFO | 中間状態の検証コマンド | 各Task完了後の検証コマンドを統一追記 | tasks.md |

---

_This review was generated by the document-review command._
