# Response to Document Review #7

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Critical Issues

### C1: worktreeImplHandlers.ts「3チャンネル」は不正確（safeHandle 0個）

**Issue**: tasks.md Task 8.3で「`worktreeImplHandlers.ts`（3チャンネル）を物理削除する」と記載されているが、worktreeImplHandlers.tsにはsafeHandle呼び出しが0個であり、ユーティリティファイルである。

**Judgment**: **Fix Required** ✅

**Evidence**:
`worktreeImplHandlers.ts`を実測した結果、`safeHandle`の呼び出しは**0個**。ファイルは以下の3つの関数をエクスポートするユーティリティファイル:
- `handleImplStartWithWorktree()`
- `handleImplStartNormalMode()`
- `getWorktreeCwd()`

これらはworktreeHandlers.tsのsafeHandleコールバックから呼び出される関数であり、worktreeImplHandlers.ts自体にはチャンネル登録が存在しない。レビューの指摘は正確。

**Action Items**:
- tasks.md Task 8.3の「`worktreeImplHandlers.ts`（3チャンネル）」を「`worktreeImplHandlers.ts`（ユーティリティファイル、チャンネル登録なし）」に修正
- research.mdのハンドラファイル構成テーブルのworktreeImplHandlers.ts行を「3」→「0（ユーティリティ）」に修正

---

### C2: bug routerマッピングテーブルにSETTINGS_BUGS_WORKTREE_DEFAULTチャンネルが欠落

**Issue**: research.md bug routerマッピングテーブル（行254-267）にSETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETの2チャンネルが記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`bugWorktreeHandlers.ts`のsafeHandle呼び出しを実測:
1. `BUG_WORKTREE_CREATE`（行128）
2. `BUG_WORKTREE_REMOVE`（行146）
3. `SETTINGS_BUGS_WORKTREE_DEFAULT_GET`（行163）← **テーブル欠落**
4. `SETTINGS_BUGS_WORKTREE_DEFAULT_SET`（行173）← **テーブル欠落**
5. `BUG_WORKTREE_AUTO_EXECUTION`（行184）
6. `BUG_CONVERT_TO_WORKTREE`（行213）

research.md行189の注記では「bug routerの移行対象」と明記されているが、テーブルには含まれていない。テーブルだけを参照する実装者は見逃す可能性がある。

**Action Items**:
- research.md bug routerテーブルにSETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETの2行を追加
- tasks.md Task 5.2のプロシージャ数を「10」→「12」に修正（SETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETの2個追加）

---

## Response to Warnings

### W1: specHandlers.ts「25チャンネル」のsafeHandle/webContents.send内訳未記載

**Issue**: requirements.md Req 4 AC 5で「specHandlers.ts（25チャンネル）」と記載されているが、safeHandle/webContents.sendの内訳が明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
specHandlers.tsを実測: safeHandle **24個**（import行を除く24箇所の`safeHandle(`呼び出し）+ webContents.send **1個**（SPECS_CHANGED）= 計25。Req 6のautoExecutionHandlers.ts修正パターンと統一すべき。

**Action Items**:
- requirements.md Req 4 AC 5を「specHandlers.ts（25チャンネル）」→「specHandlers.ts（safeHandle 24チャンネル + webContents.send 1イベント = 計25）」に修正

---

### W2: gitHandlers.ts「6チャンネル」のsafeHandle/webContents.send内訳未記載

**Issue**: requirements.md Req 7 AC 4で「gitHandlers.ts（6チャンネル）」と記載されているが、safeHandle/webContents.sendの内訳が明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
gitHandlers.tsを実測: safeHandle **5個**（import行を除く5箇所の`safeHandle(`呼び出し）+ webContents.send **1個**（GIT_CHANGES_DETECTED）= 計6。Req 6のパターンと統一すべき。

**Action Items**:
- requirements.md Req 7 AC 4を「gitHandlers.ts（6チャンネル）」→「gitHandlers.ts（safeHandle 5チャンネル + webContents.send 1イベント = 計6）」に修正

---

### W3: handlers.ts直接登録のAgent broadcast 5個の移行先明示

**Issue**: handlers.ts内のAgent系webContents.send 5個（AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_EXIT_ERROR, AGENT_START_ERROR）の内訳がresearch.mdのhandlers.ts行に明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
handlers.tsを実測:
- 行1253: `webContents.send(IPC_CHANNELS.AGENT_LOG, ...)`
- 行1266: `webContents.send(IPC_CHANNELS.AGENT_OUTPUT, ...)`
- 行1280: `webContents.send(IPC_CHANNELS.AGENT_STATUS_CHANGE, ...)`
- 行1294: `webContents.send(IPC_CHANNELS.AGENT_EXIT_ERROR, ...)`
- 行1310: `webContents.send(IPC_CHANNELS.AGENT_START_ERROR, ...)`

これらはeventsRouterのSubscriptionに移行されるが、research.mdのハンドラファイル構成テーブルにhandlers.tsの内訳が未記載。トレーサビリティ向上のため追記が望ましい。

**Action Items**:
- research.mdのハンドラファイル構成テーブルのhandlers.ts行に「webContents.send 5個（Agent系: AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_EXIT_ERROR, AGENT_START_ERROR）」の注記を追加

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | READ_FILE_CONTENTがgitHandlers.tsに実装されているがfile routerにマッピング | No Fix Needed ❌ | 移行順序（Task 4 > Task 8）により問題なし。file routerへのマッピングは設計意図通り |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| tasks.md | Task 8.3: worktreeImplHandlers.ts「3チャンネル」→「ユーティリティファイル、チャンネル登録なし」 |
| tasks.md | Task 5.2: プロシージャ数「10」→「12」（SETTINGS_BUGS_WORKTREE_DEFAULT_GET/SET追加） |
| research.md | bug routerテーブルにSETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETの2行を追加 |
| research.md | ハンドラファイル構成テーブル: worktreeImplHandlers.ts「3」→「0（ユーティリティ）」 |
| research.md | ハンドラファイル構成テーブル: handlers.ts行にwebContents.send 5個の注記追加 |
| requirements.md | Req 4 AC 5: specHandlers.tsチャンネル数にsafeHandle/webContents.send内訳を明記 |
| requirements.md | Req 7 AC 4: gitHandlers.tsチャンネル数にsafeHandle/webContents.send内訳を明記 |

---

## Conclusion

レビュー#7の全6件の指摘を検証した結果、Critical 2件・Warning 3件が全て正当な指摘であると確認し、Fix Requiredと判定した。Info 1件は設計意図通りで修正不要。

全ての修正はドキュメントの正確性向上に寄与し、実装者が各ファイルのチャンネル構成を正確に把握できるようになる。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 8.3: worktreeImplHandlers.tsの記述を修正、Task 5.2: プロシージャ数を12に修正 |
| research.md | bug routerテーブルに2行追加、ハンドラ構成テーブルのworktreeImplHandlers.tsとhandlers.ts行を修正 |
| requirements.md | Req 4 AC 5とReq 7 AC 4にsafeHandle/webContents.send内訳を明記 |

### Details

#### tasks.md

**Issue(s) Addressed**: C1, C2

**Changes**:
- Task 8.3: 「`worktreeImplHandlers.ts`（3チャンネル）」→「`worktreeImplHandlers.ts`（ユーティリティファイル、チャンネル登録なし）」
- Task 5.2: 「全10プロシージャ（readBugs、...convertToWorktree）」→「全12プロシージャ（...getBugsWorktreeDefault、setBugsWorktreeDefault）」

**Diff Summary**:
```diff
- `gitHandlers.ts`（6チャンネル）、`worktreeHandlers.ts`（7チャンネル）、`worktreeImplHandlers.ts`（3チャンネル）を物理削除する
+ `gitHandlers.ts`（6チャンネル）、`worktreeHandlers.ts`（7チャンネル）、`worktreeImplHandlers.ts`（ユーティリティファイル、チャンネル登録なし）を物理削除する
```

```diff
- bug routerに全10プロシージャ（readBugs、readBugDetail、startBugsWatcher、stopBugsWatcher、executeBugCreate、phaseUpdate、worktreeCreate、worktreeRemove、worktreeAutoExecution、convertToWorktree）を定義する
+ bug routerに全12プロシージャ（readBugs、readBugDetail、startBugsWatcher、stopBugsWatcher、executeBugCreate、phaseUpdate、worktreeCreate、worktreeRemove、worktreeAutoExecution、convertToWorktree、getBugsWorktreeDefault、setBugsWorktreeDefault）を定義する
```

#### research.md

**Issue(s) Addressed**: C1, C2, W3

**Changes**:
- bug routerマッピングテーブルにSETTINGS_BUGS_WORKTREE_DEFAULT_GET/SETの2行を追加
- ハンドラファイル構成テーブル: worktreeImplHandlers.ts「3」→「0（ユーティリティ）」
- ハンドラファイル構成テーブル: handlers.ts行にwebContents.send 5個（Agent系）の注記を追加

**Diff Summary**:
```diff
  | BUG_CONVERT_TO_WORKTREE | bug.convertToWorktree | mutation |
+ | SETTINGS_BUGS_WORKTREE_DEFAULT_GET | bug.getBugsWorktreeDefault | query |
+ | SETTINGS_BUGS_WORKTREE_DEFAULT_SET | bug.setBugsWorktreeDefault | mutation |
```

```diff
- | `worktreeImplHandlers.ts` | 3 | Worktree実装 |
+ | `worktreeImplHandlers.ts` | 0（ユーティリティ） | Worktree実装ヘルパー |
```

```diff
- | `handlers.ts` | オーケストレーター | 全体統括 |
+ | `handlers.ts` | オーケストレーター + webContents.send 5個（Agent系: AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_EXIT_ERROR, AGENT_START_ERROR） | 全体統括 |
```

#### requirements.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- Req 4 AC 5: specHandlers.tsのチャンネル数にsafeHandle/webContents.send内訳を明記
- Req 7 AC 4: gitHandlers.tsのチャンネル数にsafeHandle/webContents.send内訳を明記

**Diff Summary**:
```diff
- 既存の`specHandlers.ts`（25チャンネル）、`bugHandlers.ts`（7チャンネル）、worktree関連ハンドラが削除されていること
+ 既存の`specHandlers.ts`（safeHandle 24チャンネル + webContents.send 1イベント = 計25）、`bugHandlers.ts`（7チャンネル）、worktree関連ハンドラが削除されていること
```

```diff
- 既存の`gitHandlers.ts`（6チャンネル）、worktree関連ハンドラが削除されていること
+ 既存の`gitHandlers.ts`（safeHandle 5チャンネル + webContents.send 1イベント = 計6）、worktree関連ハンドラが削除されていること
```

---

_Fixes applied by document-review-reply command._
