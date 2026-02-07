# Specification Review Report #7

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, research.md, document-review-6.md, document-review-6-reply.md, product.md, tech.md, structure.md, design-principles.md + コードベース実測（specHandlers.ts, gitHandlers.ts, worktreeImplHandlers.ts, bugWorktreeHandlers.ts, handlers.ts直接登録の検証）

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| CRITICAL | 2 |
| WARNING | 3 |
| INFO | 1 |

レビュー#6の修正は全て適用済みであり、autoExecution/bugAutoExecutionのsafeHandle/イベント通知内訳明記、worktreeHandlers.tsの7チャンネル修正、remoteAccessHandlers.tsの5チャンネル修正が確認できた。本レビュー#7では**チャンネルの所属ルーターと実装ファイルの整合性**を中心に、requirements.md記載のチャンネル数と実測safeHandle数の精密検証を実施した。結果、以下の新たな問題を検出した。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全体評価**: 概ね良好だが、チャンネル数に関する不正確な記述が残存。

| # | 不整合 | requirements.md | 実測 | 重要度 |
|---|--------|-----------------|------|--------|
| 1 | specHandlers.tsのチャンネル数 | Req 4 AC 5: 「specHandlers.ts（25チャンネル）」 | 実測: safeHandle **24個** + webContents.send 1個（SPECS_CHANGED） | WARNING |
| 2 | gitHandlers.tsのチャンネル数 | Req 7 AC 4: 「gitHandlers.ts（6チャンネル）」 | 実測: safeHandle **5個** + webContents.send 1個（GIT_CHANGES_DETECTED） | WARNING |

**specHandlers.ts詳細**: 実測24個のsafeHandle。requirements.mdの「25チャンネル」はsafeHandle 24個 + webContents.send 1個の合算と推測される。Req 6の修正と同様に内訳を明記すべき。

**gitHandlers.ts詳細**: 実測5個のsafeHandle（GIT_GET_STATUS, GIT_GET_DIFF, GIT_WATCH_CHANGES, GIT_UNWATCH_CHANGES, READ_FILE_CONTENT）。requirements.mdの「6チャンネル」はsafeHandle 5個 + webContents.send 1個（GIT_CHANGES_DETECTED）の合算。同様に内訳を明記すべき。

### 1.2 Design ↔ Tasks Alignment

**全体評価**: 良好。

新規検出なし。

### 1.3 Design ↔ Tasks Completeness

前回レビュー#6からの変更なし。全カテゴリで✅。

### 1.4 Acceptance Criteria → Tasks Coverage

**CRITICAL CHECK 1: worktreeImplHandlers.tsの「3チャンネル」は不正確**

tasks.md Task 8.3で「`worktreeImplHandlers.ts`（3チャンネル）を物理削除する」と記載されているが、**worktreeImplHandlers.tsにはsafeHandle呼び出しが0個**。

**実測結果**:
- `worktreeImplHandlers.ts`はユーティリティファイルであり、以下の関数のみをエクスポート:
  - `handleImplStartWithWorktree()`
  - `handleImplStartNormalMode()`
  - `getWortreeCwd()`
- これらの関数は`worktreeHandlers.ts`のsafeHandleコールバックから呼び出される
- `WORKTREE_IMPL_START`と`NORMAL_MODE_IMPL_START`のsafeHandle登録は**worktreeHandlers.ts**（行211, 行225）に存在

**Impact**: tasks.md Task 8.3のworktreeImplHandlers.ts「3チャンネル」の記述は、実装者にチャンネルを探す無駄な時間を生む。ファイル削除自体は正しい（worktreeHandlers.ts削除後に不要となるため）が、「3チャンネル」の記述は削除すべき。worktreeHandlers.tsが7チャンネルを持つことは前回修正済みで正確。

**CRITICAL CHECK 2: bug routerマッピングテーブルにSETTINGS_BUGS_WORKTREE_DEFAULTチャンネルが欠落**

research.mdの注記（行189）で「`SETTINGS_BUGS_WORKTREE_DEFAULT_GET`/`SET`は`bugWorktreeHandlers.ts`で定義されているため、bug routerの移行対象（Req 4参照）」と明記されているが、**research.md bug routerマッピングテーブル（行254-267）には2チャンネルが記載されていない**。

**実測結果**:
- `bugWorktreeHandlers.ts`のsafeHandle: 6個（BUG_WORKTREE_CREATE, BUG_WORKTREE_REMOVE, SETTINGS_BUGS_WORKTREE_DEFAULT_GET, SETTINGS_BUGS_WORKTREE_DEFAULT_SET, BUG_WORKTREE_AUTO_EXECUTION, BUG_CONVERT_TO_WORKTREE）
- research.md bug routerテーブル: 10エントリ（bugHandlers.ts 6個 + bugWorktreeHandlers.ts 4個）
- **欠落**: `SETTINGS_BUGS_WORKTREE_DEFAULT_GET`と`SETTINGS_BUGS_WORKTREE_DEFAULT_SET`がテーブルに含まれていない

**Impact**: bug routerの実装時に2チャンネルの移行漏れが発生するリスク。research.mdの注記で移行先が指定されているが、マッピングテーブルに反映されていないため、テーブルだけを参照する実装者は見逃す可能性がある。

**Validation Results**:
- [x] 全criterion IDからrequirements.mdへのマッピングが完了
- [x] ユーザー向けcriterionにFeature Implementationタスクが存在
- [x] Cleanupタスクに対応する削除対象ファイルが具体的に列挙されている
- [ ] **worktreeImplHandlers.tsの「3チャンネル」記述が不正確（CRITICAL）**
- [ ] **bug routerマッピングテーブルにSETTINGS_BUGS_WORKTREE_DEFAULT 2チャンネルが欠落（CRITICAL）**

### 1.5 Integration Test Coverage

前回レビュー#6と同等。全ポイントで✅。

### 1.6 Cross-Document Contradictions

| # | 矛盾内容 | 文書A | 文書B | 重要度 |
|---|---------|-------|-------|--------|
| 1 | **specHandlers.ts「25チャンネル」** | requirements.md Req 4 AC 5: 「specHandlers.ts（25チャンネル）」 | コードベース実測: safeHandle 24個 + webContents.send 1個 | WARNING |
| 2 | **gitHandlers.ts「6チャンネル」** | requirements.md Req 7 AC 4: 「gitHandlers.ts（6チャンネル）」 | コードベース実測: safeHandle 5個 + webContents.send 1個 | WARNING |
| 3 | **worktreeImplHandlers.ts「3チャンネル」** | tasks.md Task 8.3: 「worktreeImplHandlers.ts（3チャンネル）」 | コードベース実測: safeHandle 0個（ユーティリティファイル） | CRITICAL |
| 4 | **bug routerテーブル vs 注記** | research.md 行189（注記）: SETTINGS_BUGS_WORKTREE_DEFAULT → bug router | research.md 行254-267（テーブル）: 当該チャンネル未記載 | CRITICAL |
| 5 | **READ_FILE_CONTENTの所属** | research.md file routerテーブル行216: `file.readFileContent` | コードベース: gitHandlers.tsのsafeHandle（行224）で登録 | INFO |

**#5の詳細**: `READ_FILE_CONTENT`はgitHandlers.tsに実装されているが、research.mdではfile router（`file.readFileContent`）にマッピングされている。移行時にgitHandlers.ts削除のタイミングとfile router実装のタイミングが合わないと、一時的にこのチャンネルが動作しなくなるリスクがある。ただし、Task 4（file router実装）がTask 8（git router実装）より先に実行されるため、移行順序として正しく設計されている。

## 2. Gap Analysis

### 2.1 Technical Considerations

| # | Gap | 重要度 | 影響 |
|---|-----|--------|------|
| 1 | **handlers.ts直接登録の5個のwebContents.send（Agent系イベント）の帰属**: handlers.ts内のAgent系webContents.send 5個（AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_EXIT_ERROR, AGENT_START_ERROR）は、events routerのSubscriptionに移行する必要があるが、handlers.ts内の`broadcastToAllWindows()`ヘルパーで実装されている。handlers.ts全体の削除（Task 11.2）前にeventsRouter（Task 9.1）でSubscriptionに置き換える必要がある | INFO | 移行順序は正しく設計されている（Task 9がTask 11より先）が、handlers.ts内のAgent broadcast実装の移行先を明示的にドキュメントに記載すると実装者の理解が深まる |

### 2.2 Operational Considerations

特記事項なし。

## 3. Ambiguities and Unknowns

| # | 曖昧な記述 | 文書 | 具体化が必要な理由 |
|---|-----------|------|-------------------|
| 1 | **tasks.md Task 5.2のbug routerプロシージャ数「10」**: 「全10プロシージャ」と記載しているが、SETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETを含めると12プロシージャになるべき | tasks.md | 実装者がbug routerのスコープを正確に把握するため |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

前回レビュー#6と同等。全体的に優良。

- **tech.md**: tRPC関連技術の記載はTask 13.1で更新予定。整合性問題なし
- **structure.md**: 既存構造との整合性確認済み
- **design-principles.md**: DD-002, DD-004, DD-006は全て設計原則に準拠
- **Electron Process Boundary Rules**: tRPC移行後も原則が維持される設計

### 4.2 Integration Concerns

| 懸念 | 影響 | 対応状況 |
|------|------|---------|
| Remote UI（WebSocketApiClient）への影響 | なし | DD-005で方針定義済み ✅ |
| CONFIRM_COMMON_COMMMANDSのルーター帰属 | research.md spec routerテーブルに記載（行248）だが、installHandlers.ts内で実装 | 実装上は問題なし（移行先ルーターの選択は自由度あり） ✅ |

### 4.3 Migration Requirements

前回レビュー#6と同等。問題なし。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **tasks.md Task 8.3のworktreeImplHandlers.ts「3チャンネル」記述を修正**（Section 1.4 CRITICAL CHECK 1、Section 1.6 #3）
   - worktreeImplHandlers.tsはユーティリティファイルであり、safeHandle呼び出しは0個
   - WORKTREE_IMPL_STARTとNORMAL_MODE_IMPL_STARTのsafeHandle登録はworktreeHandlers.ts内
   - **推奨**: tasks.md Task 8.3を以下のように修正:
     - 「`worktreeImplHandlers.ts`（3チャンネル）」→「`worktreeImplHandlers.ts`（ユーティリティファイル、チャンネル登録なし）」
     - ファイル削除自体は正しい（worktreeHandlers.tsのsafeHandleコールバックから呼び出される関数のみを含むため、worktreeHandlers.ts削除後に不要）

2. **research.md bug routerマッピングテーブルにSETTINGS_BUGS_WORKTREE_DEFAULTチャンネルを追加**（Section 1.4 CRITICAL CHECK 2、Section 1.6 #4）
   - research.md行189の注記ではbug router移行対象と明記されているが、テーブルに含まれていない
   - **推奨**: bug routerテーブル（行254-267）に以下2行を追加:
     ```
     | SETTINGS_BUGS_WORKTREE_DEFAULT_GET | bug.getBugsWorktreeDefault | query |
     | SETTINGS_BUGS_WORKTREE_DEFAULT_SET | bug.setBugsWorktreeDefault | mutation |
     ```
   - tasks.md Task 5.2のプロシージャ数を「10」→「12」に修正（SETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETの2個追加）

### Warnings (Should Address)

1. **requirements.md Req 4 AC 5のspecHandlers.tsチャンネル数にsafeHandle/webContents.send内訳を明記**（Section 1.1 #1、Section 1.6 #1）
   - 現在「specHandlers.ts（25チャンネル）」→「specHandlers.ts（safeHandle 24チャンネル + webContents.send 1イベント = 計25）」に修正
   - Req 6のautoExecutionHandlers.ts修正パターンに合わせる

2. **requirements.md Req 7 AC 4のgitHandlers.tsチャンネル数にsafeHandle/webContents.send内訳を明記**（Section 1.1 #2、Section 1.6 #2）
   - 現在「gitHandlers.ts（6チャンネル）」→「gitHandlers.ts（safeHandle 5チャンネル + webContents.send 1イベント = 計6）」に修正

3. **design.md eventsRouterのSubscription一覧にhandlers.ts直接登録のAgent broadcastを記載**（Section 2.1 #1）
   - handlers.ts内のbroadcastToAllWindows()で送信される5つのAgentイベントが、eventsRouter Subscription定義に既に含まれていることを確認。**design.md上での追加記載は不要だが、research.mdの「handlers.ts直接」行にwebContents.send 5個（Agent系）の内訳を追記するとトレーサビリティが向上**

### Suggestions (Nice to Have)

なし。前回レビュー#6-reply適用後、ドキュメント全体の品質は非常に高い。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| CRITICAL | worktreeImplHandlers.ts「3チャンネル」は不正確（safeHandle 0個） | tasks.md Task 8.3の記述を「ユーティリティファイル、チャンネル登録なし」に修正 | tasks.md |
| CRITICAL | bug routerテーブルにSETTINGS_BUGS_WORKTREE_DEFAULT 2チャンネルが欠落 | research.md bug routerテーブルに2行追加、tasks.md Task 5.2のプロシージャ数を10→12に修正 | research.md, tasks.md |
| WARNING | specHandlers.ts「25チャンネル」のsafeHandle/webContents.send内訳未記載 | requirements.md Req 4 AC 5に内訳を明記 | requirements.md |
| WARNING | gitHandlers.ts「6チャンネル」のsafeHandle/webContents.send内訳未記載 | requirements.md Req 7 AC 4に内訳を明記 | requirements.md |
| WARNING | handlers.ts直接登録のAgent broadcast 5個の移行先明示 | research.mdのhandlers.ts行にwebContents.send 5個の内訳を追記 | research.md |
| INFO | READ_FILE_CONTENTがgitHandlers.tsに実装されているがfile routerにマッピング | 移行順序（Task 4 > Task 8）により問題なし。ドキュメント修正不要 | なし |

---

_This review was generated by the document-review command._
