# Specification Review Report #6

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-5.md, document-review-5-reply.md, product.md, tech.md, structure.md, design-principles.md + コードベース実測（全ハンドラファイルのsafeHandle数）

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 1 |
| WARNING | 2 |
| INFO | 2 |

レビュー#1〜#5の指摘事項は全て修正適用済みであり、仕様ドキュメントの品質は高い。本レビュー#6は**コードベース実測による定量検証**を中心に、ドキュメント記載のチャンネル数と実際のsafeHandle登録数の整合性を検証した。結果、複数のハンドラファイルでドキュメント記載のチャンネル数と実測値に乖離が認められた。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 良好。レビュー#5の修正が全て反映済み。

新規検出なし。

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。

新規検出なし。

### 1.3 Design ↔ Tasks Completeness

前回レビュー#5からの変更なし。全カテゴリで✅。

### 1.4 Acceptance Criteria → Tasks Coverage

**CRITICAL CHECK: ドキュメント記載チャンネル数 vs コードベース実測値**

コードベースの各ハンドラファイル内のsafeHandle()呼び出し数を実測し、requirements.md/research.mdに記載されたチャンネル数と比較した。

| ハンドラファイル | 実測safeHandle数 | ドキュメント記載チャンネル数 | 差異 | 分析 |
|-----------------|-----------------|---------------------------|------|------|
| configHandlers.ts | 18 | 18 | ✅ 一致 | |
| projectHandlers.ts | 14 | 14 | ✅ 一致 | |
| fileHandlers.ts | 7 | 7 | ✅ 一致 | |
| projectFileHandlers.ts | 3 | 4 (research.md) | ⚠️ -1 | research.md記載のプロシージャ数と不一致の可能性 |
| specHandlers.ts | 24 | 25 (requirements.md Req 4) | ⚠️ -1 | webContents.send含むか否かの差異の可能性 |
| bugHandlers.ts | 6 | 7 (requirements.md Req 4) | ⚠️ -1 | 同上 |
| bugWorktreeHandlers.ts | 6 | 6 | ✅ 一致 | |
| agentHandlers.ts | 9 | 10 (requirements.md Req 5) | ⚠️ -1 | 同上 |
| autoExecutionHandlers.ts | 9 | 13 (requirements.md Req 6) | ❌ -4 | **大きな乖離** |
| bugAutoExecutionHandlers.ts | 6 | 12 (requirements.md Req 6) | ❌ -6 | **大きな乖離** |
| gitHandlers.ts | 5 | 6 (requirements.md Req 7) | ⚠️ -1 | |
| worktreeHandlers.ts | 7 | 5 (research.md) | ⚠️ +2 | research.md記載が過少 |
| convertWorktreeHandlers.ts | 2 | 2 | ✅ 一致 | |
| cloudflareHandlers.ts | 11 | 11 | ✅ 一致 | |
| installHandlers.ts | 17 | 17 | ✅ 一致 | |
| mcpHandlers.ts | 6 | 6 | ✅ 一致 | |
| scheduleTaskHandlers.ts | 9 | 10 (requirements.md Req 9) | ⚠️ -1 | |
| metricsHandlers.ts | 3 | 4 (requirements.md Req 9) | ⚠️ -1 | |
| remoteAccessHandlers.ts | 4 | 6 (research.md) | ⚠️ -2 | |
| sshHandlers.ts | 7 | 7(+1 event) | ✅ 一致 | |
| clipboardHandlers.ts | 1 | 1 | ✅ 一致 | |
| handlers.ts (直接) | 13 | N/A (orchestrator) | - | VCS_SCHEME, JJ系、steering系を含む |

**特に重大な乖離**:

1. **autoExecutionHandlers.ts**: 実測9 vs 記載13（差異-4）。requirements.md Req 6 AC 4は「13チャンネル」と明記
2. **bugAutoExecutionHandlers.ts**: 実測6 vs 記載12（差異-6）。requirements.md Req 6 AC 4は「12チャンネル」と明記

**乖離の原因仮説**: ドキュメント記載のチャンネル数は、safeHandle（IPC request/response）だけでなくwebContents.send（Main→Rendererイベント送信 = Subscription移行対象）も含んでカウントしている。autoExecutionHandlers.tsの場合、safeHandle 9個 + webContents.send 4個 ≈ 13個、bugAutoExecutionHandlers.tsの場合、safeHandle 6個 + webContents.send 6個 = 12個と推測される。

この仮説が正しい場合、ドキュメントの数値は「ハンドラファイル内の全IPC活動」としては正確だが、safeHandle（Query/Mutation移行対象）とwebContents.send（Subscription移行対象）を区別していない。**実装時に、「ハンドラ削除」の完了条件としてどちらの数を基準にするかが不明確**になるリスクがある。

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Cleanupタスクに対応する削除対象ファイルが具体的に列挙されている
- [ ] **一部ハンドラファイルのチャンネル数が実測と乖離（CRITICAL: autoExecution/bugAutoExecution）**

### 1.5 Integration Test Coverage

前回レビュー#5と同等。全ポイントで✅。

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **autoExecutionHandlers.ts「13チャンネル」** | requirements.md Req 6 AC 4: 「autoExecutionHandlers.ts（13チャンネル）」 | コードベース実測: safeHandle 9個 | CRITICAL |
| 2 | **bugAutoExecutionHandlers.ts「12チャンネル」** | requirements.md Req 6 AC 4: 「bugAutoExecutionHandlers.ts（12チャンネル）」 | コードベース実測: safeHandle 6個 | CRITICAL（上記と同一Issue） |
| 3 | **worktreeHandlers.ts「5チャンネル」** | research.md: worktreeHandlers.ts（5チャンネル）、tasks.md Task 8.3: 「5チャンネル」 | コードベース実測: safeHandle 7個 | WARNING |
| 4 | **remoteAccessHandlers.ts「6チャンネル」** | research.md: remoteAccessHandlers.ts（6チャンネル） | コードベース実測: safeHandle 4個 | WARNING |

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **ハンドラファイルのチャンネル数定義が「safeHandle + webContents.send」の合算で記載されている可能性**: requirements.md/research.mdの各ハンドラファイルのチャンネル数が、IPC request/response（safeHandle = Query/Mutation移行対象）とMain→Rendererイベント送信（webContents.send = Subscription移行対象）を区別なく合算している可能性がある。実装時に「このハンドラファイルのチャンネルを全て移行した」という判断基準が曖昧になるリスク | CRITICAL | 特にautoExecutionHandlers.ts（実測9 vs 記載13）とbugAutoExecutionHandlers.ts（実測6 vs 記載12）で大きな乖離があり、実装者が4〜6個のチャンネルを「見つけられない」状態になる |
| 2 | **handlers.ts内の直接safeHandle 13個の帰属**: handlers.ts自体に13個のsafeHandle呼び出しがある（VCS_SCHEME 2個、JJ関連 3個、その他）。これらのうちVCS_SCHEME 2個はconfig routerに、JJ関連3個はinstall routerに、steering 4個はspec routerに移行予定だが、残りのsafeHandleの移行先が不明確 | INFO | research.mdの詳細マッピングテーブルで個別にカバーされている可能性が高い |

### 2.2 Operational Considerations

特記事項なし。

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **requirements.mdのハンドラファイル別チャンネル数の定義**: 「チャンネル数」がsafeHandleのみを指すのか、webContents.sendも含むのかが定義されていない | requirements.md | 実装者がハンドラファイル削除の完了条件を正確に判断するため |
| 2 | **worktreeHandlers.tsの実測7個 vs research.md記載5個**: 差異の原因が不明。worktreeHandlersは実測で7個のsafeHandleを持つが、research.mdのgit routerマッピングでworktreeHandlersから来るプロシージャを数えると異なる可能性がある | research.md, tasks.md | Tasks 8.3で「5チャンネル」として記載されており、移行漏れのリスク |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

前回レビュー#5と同等。全体的に優良。

- **tech.md**: tRPC関連技術の記載はTask 13.1で更新予定。整合性問題なし
- **structure.md**: `src/main/trpc/`の既存構造（routers/system.ts, context.ts, handler.ts, router.ts, trpc.ts）がdesign.mdの記載と一致。4テストファイル（`__tests__/`配下）も存在確認済み
- **design-principles.md**: DD-002（薄いアダプター）、DD-004（Zod SSoT）、DD-006（Context DI）は全て設計原則に準拠
- **Electron Process Boundary Rules**: tRPC移行でも「Renderer → tRPC → Main → Subscription → Renderer」フローが維持される設計。structure.mdの原則と整合

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| Remote UI（WebSocketApiClient）への影響 | なし | DD-005で方針定義済み ✅ |
| window.electronAPI使用ファイル数 | 実測91ファイル（design.md記載の約88ファイルより多い） | INFO: 若干の乖離だが、Task 11.4のGrep検証で漏れなく対応可能 ✅ |

### 4.3 Migration Requirements

前回レビュー#5と同等。問題なし。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **requirements.md Req 6 AC 4のチャンネル数定義を明確化**（Section 1.4, 1.6 #1-2, Section 2.1 #1）
   - requirements.md Req 6 AC 4は「autoExecutionHandlers.ts（13チャンネル）、bugAutoExecutionHandlers.ts（12チャンネル）」と記載
   - コードベース実測: autoExecutionHandlers.ts内のsafeHandle = 9個、bugAutoExecutionHandlers.ts内のsafeHandle = 6個
   - 差異（autoExecution: +4、bugAutoExecution: +6）はwebContents.sendによるイベント送信を含むと推測される
   - **推奨**: requirements.md Req 6 AC 4の記述を「autoExecutionHandlers.ts（safeHandle 9チャンネル + webContents.send 4イベント = 計13）」のように内訳を明記するか、「autoExecutionHandlers.ts内の全IPC処理（Query/Mutation 9個 + イベント通知4個）が移行されていること」と記述を変更する。同様にbugAutoExecutionHandlers.ts（Query/Mutation 6個 + イベント通知6個 = 計12）も内訳を明記
   - **影響**: 実装者がautoExecutionHandlers.tsで「13個のsafeHandleを見つけなければならない」と誤解し、混乱するリスク。イベント通知部分はReq 8（Subscription移行）で対応するため、Req 6のスコープでは9個/6個のQuery/Mutationのみが対象であることを明確にする必要がある

### Warnings (Should Address)

1. **worktreeHandlers.tsのチャンネル数**: research.mdとtasks.md Task 8.3で「5チャンネル」と記載されているが、実測では7個のsafeHandleが存在する（Section 1.6 #3）
   - **推奨**: worktreeHandlers.ts内の全safeHandleを確認し、research.mdのgit routerマッピングテーブルに漏れがないか検証。Task 8.3の「5チャンネル」を正確な数値に修正

2. **remoteAccessHandlers.tsのチャンネル数**: research.mdで「6チャンネル」と記載されているが、実測では4個のsafeHandleが存在する（Section 1.6 #4）
   - **推奨**: remoteAccessHandlers.ts内の全safeHandleを確認し、残り2個がwebContents.sendのイベント通知なのかを確認。research.mdの記述を更新

### Suggestions (Nice to Have)

1. **全ハンドラファイルの「safeHandle数 / webContents.send数」の内訳表をresearch.mdに追加**: 実装着手前に、各ハンドラファイルの「Query/Mutation対象（safeHandle）」と「Subscription対象（webContents.send）」を区別した一覧表を作成すると、移行作業の精度が向上する

2. **design.md Interface Changes & Impact Analysisセクションの`window.electronAPI`参照ファイル数を更新**: 現在「約88ファイル」と記載されているが、実測では91ファイル。軽微だが正確性の向上のため

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | autoExecutionHandlers.ts(13) / bugAutoExecutionHandlers.ts(12)のチャンネル数が実測safeHandle数(9/6)と大幅に乖離 | requirements.md Req 6 AC 4にsafeHandle数とwebContents.send数の内訳を明記。「Req 6ではQuery/Mutation X個を移行、イベント通知Y個はReq 8で対応」と記述 | requirements.md |
| WARNING | worktreeHandlers.ts: research.md/tasks.md「5チャンネル」vs 実測「7 safeHandle」 | worktreeHandlers.ts全体を確認し、research.md git routerマッピングとtasks.md Task 8.3のチャンネル数を正確な値に修正 | research.md, tasks.md |
| WARNING | remoteAccessHandlers.ts: research.md「6チャンネル」vs 実測「4 safeHandle」 | remoteAccessHandlers.ts内容を確認し、safeHandle/webContents.sendの内訳を明記 | research.md |
| INFO | handlers.ts直接の13 safeHandleの移行先帰属を明確化 | research.mdにhandlers.ts直接登録チャンネルの移行先一覧を追加（一部は既にconfig/install/spec routerに割り当て済み） | research.md |
| INFO | design.md window.electronAPI参照ファイル数「約88ファイル」→ 実測91ファイル | design.md Interface Changes & Impact Analysisの数値を更新 | design.md |

---

_This review was generated by the document-review command._
