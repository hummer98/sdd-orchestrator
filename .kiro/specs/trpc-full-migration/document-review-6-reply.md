# Response to Document Review #6

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C1: autoExecutionHandlers.ts(13) / bugAutoExecutionHandlers.ts(12)のチャンネル数がsafeHandle数と乖離

**Issue**: requirements.md Req 6 AC 4の「13チャンネル」「12チャンネル」がコードベースのsafeHandle数と大幅に乖離しているとの指摘。

**Judgment**: **Fix Required** ✅

**Evidence**:
レビュー#6の実測値には一部誤認がある（safeHandleの関数定義行をカウントに含めている）が、指摘の本質は正しい。

コードベース再検証結果:
- `autoExecutionHandlers.ts`: safeHandle呼び出し **8個** + broadcastToRenderers呼び出し **5個** = 合計 **13個**（ドキュメント記載と一致）
- `bugAutoExecutionHandlers.ts`: safeHandle呼び出し **6個** + broadcastToRenderers呼び出し **6個** = 合計 **12個**（ドキュメント記載と一致）

合計チャンネル数自体はドキュメントと一致するが、**safeHandle（Query/Mutation移行対象）とbroadcastToRenderers（Subscription移行対象）の内訳が区別されていない**。requirements.md Req 6のスコープ（Query/Mutation移行）とReq 8のスコープ（Subscription移行）の境界が不明確であり、実装時の混乱リスクは実在する。

レビュー#6が「safeHandle 9個」と記載しているのは、safeHandle関数**定義**行（行146: `function safeHandle(...)`）を含めたGrepマッチ数であり、実際のハンドラ登録呼び出しは**8個**。

**Action Items**:
- requirements.md Req 6 AC 4に「safeHandle（Query/Mutation）数」と「broadcastToRenderers（イベント通知、Req 8で対応）数」の内訳を明記
- research.mdのチャンネル数テーブルにも内訳列を追加

---

## Response to Warnings

### W1: worktreeHandlers.tsのチャンネル数 (research.md「5」vs 実測「7」)

**Issue**: research.mdとtasks.md Task 8.3で「5チャンネル」と記載されているが、実測では7個のsafeHandleが存在する。

**Judgment**: **Fix Required** ✅

**Evidence**:
`worktreeHandlers.ts`のsafeHandle呼び出し7個を確認:

```
行178: safeHandle(IPC_CHANNELS.WORKTREE_CHECK_MAIN, ...)
行186: safeHandle(IPC_CHANNELS.WORKTREE_CREATE, ...)
行194: safeHandle(IPC_CHANNELS.WORKTREE_REMOVE, ...)
行202: safeHandle(IPC_CHANNELS.WORKTREE_RESOLVE_PATH, ...)
行211: safeHandle(IPC_CHANNELS.WORKTREE_IMPL_START, ...)
行225: safeHandle(IPC_CHANNELS.NORMAL_MODE_IMPL_START, ...)
行239: safeHandle(IPC_CHANNELS.WORKTREE_REBASE_FROM_MAIN, ...)
```

research.md作成時に `WORKTREE_IMPL_START` と `NORMAL_MODE_IMPL_START` の2チャンネルがカウントから漏れていたと推測される。webContents.sendは0個。

**Action Items**:
- research.mdのworktreeHandlers.tsのチャンネル数を「5」→「7」に修正
- tasks.md Task 8.3の「5チャンネル」を「7チャンネル」に修正

---

### W2: remoteAccessHandlers.tsのチャンネル数 (research.md「6」vs 実測「5」)

**Issue**: research.mdで「6チャンネル」と記載されているが、実測では4個のsafeHandleしか存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:
`remoteAccessHandlers.ts`のIPC活動を確認:

safeHandle呼び出し4個:
```
行754: safeHandle(IPC_CHANNELS.START_REMOTE_SERVER, ...)
行776: safeHandle(IPC_CHANNELS.STOP_REMOTE_SERVER, ...)
行786: safeHandle(IPC_CHANNELS.GET_REMOTE_SERVER_STATUS, ...)
行794: safeHandle(IPC_CHANNELS.REFRESH_ACCESS_TOKEN, ...)
```

webContents.send 1個:
```
行823: window.webContents.send(IPC_CHANNELS.REMOTE_SERVER_STATUS_CHANGED, status)
```

合計: safeHandle 4個 + webContents.send 1個 = **5個**。research.mdの「6チャンネル」は過大。

**Action Items**:
- research.mdのremoteAccessHandlers.tsのチャンネル数を「6」→「4 safeHandle + 1 イベント通知 = 5」に修正

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | handlers.ts直接の13 safeHandleの移行先帰属の明確化 | No Fix Needed ❌ | research.mdのドメイン別マッピングテーブルで個別にカバー済み。design.mdのDD-006 Implementation Notesにも`registerSteeringHandlers()`のspec router移行先が明記されている |
| I2 | design.md window.electronAPI参照ファイル数「約88ファイル」→ レビュー実測「91ファイル」 | No Fix Needed ❌ | **レビュー#6の実測値に誤認あり**。当方の再検証（`grep -rl "window\.electronAPI" src/renderer/ src/shared/ | wc -l`）では**88ファイル**であり、design.mdの「約88ファイル」は正確。修正不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | Req 6 AC 4に autoExecutionHandlers.ts / bugAutoExecutionHandlers.ts のsafeHandle数とbroadcastToRenderers数の内訳を明記 |
| research.md | チャンネル数テーブルのworktreeHandlers.ts (5→7)、remoteAccessHandlers.ts (6→5) を修正。autoExecutionHandlers.ts / bugAutoExecutionHandlers.ts に内訳注記追加 |
| tasks.md | Task 8.3のworktreeHandlers.ts「5チャンネル」→「7チャンネル」に修正 |

---

## Conclusion

レビュー#6のCritical Issue（C1）は指摘の本質は正しいが、レビュー自身の実測値に一部誤認があった（safeHandle関数定義行のカウント混入、window.electronAPI参照ファイル数の過大計測）。

チャンネル数の合計値自体はドキュメントと実測で一致しているが、**safeHandle（Query/Mutation）とbroadcastToRenderers（イベント通知=Subscription）の区別がない**点は実装時の混乱リスクとして有効な指摘であり、内訳の明記を適用する。

Warning 2件（worktreeHandlers.ts: 5→7、remoteAccessHandlers.ts: 6→5）は実際にドキュメントの数値が不正確であり、修正を適用する。

Fix Required: 3件、No Fix Needed: 2件、Needs Discussion: 0件。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Req 6 AC 4のautoExecutionHandlers.ts / bugAutoExecutionHandlers.tsチャンネル数にsafeHandle/イベント通知の内訳を明記 |
| research.md | チャンネル数テーブルの3箇所を修正（autoExecution内訳追加、worktree 5→7、remoteAccess 6→5） |
| tasks.md | Task 8.3のworktreeHandlers.ts「5チャンネル」→「7チャンネル」に修正 |

### Details

#### requirements.md

**Issue(s) Addressed**: C1

**Changes**:
- Req 6 AC 4のチャンネル数記述にsafeHandle数とイベント通知数の内訳を追加

**Diff Summary**:
```diff
- 4. 既存の`autoExecutionHandlers.ts`（13チャンネル）、`bugAutoExecutionHandlers.ts`（12チャンネル）が削除されていること
+ 4. 既存の`autoExecutionHandlers.ts`（safeHandle 8チャンネル + イベント通知5チャンネル = 計13、イベント通知はReq 8で対応）、`bugAutoExecutionHandlers.ts`（safeHandle 6チャンネル + イベント通知6チャンネル = 計12、イベント通知はReq 8で対応）が削除されていること
```

#### research.md

**Issue(s) Addressed**: C1, W1, W2

**Changes**:
- autoExecutionHandlers.ts: 「13」→「13 (safeHandle 8 + イベント通知 5)」
- bugAutoExecutionHandlers.ts: 「12」→「12 (safeHandle 6 + イベント通知 6)」
- worktreeHandlers.ts: 「5」→「7」
- remoteAccessHandlers.ts: 「6」→「5 (safeHandle 4 + イベント通知 1)」

**Diff Summary**:
```diff
- | `autoExecutionHandlers.ts` | 13 | 自動実行 |
- | `bugAutoExecutionHandlers.ts` | 12 | Bug自動実行 |
+ | `autoExecutionHandlers.ts` | 13 (safeHandle 8 + イベント通知 5) | 自動実行 |
+ | `bugAutoExecutionHandlers.ts` | 12 (safeHandle 6 + イベント通知 6) | Bug自動実行 |

- | `worktreeHandlers.ts` | 5 | Worktree |
+ | `worktreeHandlers.ts` | 7 | Worktree |

- | `remoteAccessHandlers.ts` | 6 | Remote Access |
+ | `remoteAccessHandlers.ts` | 5 (safeHandle 4 + イベント通知 1) | Remote Access |
```

#### tasks.md

**Issue(s) Addressed**: W1

**Changes**:
- Task 8.3のworktreeHandlers.tsのチャンネル数を修正

**Diff Summary**:
```diff
- `gitHandlers.ts`（6チャンネル）、`worktreeHandlers.ts`（5チャンネル）、`worktreeImplHandlers.ts`（3チャンネル）を物理削除する
+ `gitHandlers.ts`（6チャンネル）、`worktreeHandlers.ts`（7チャンネル）、`worktreeImplHandlers.ts`（3チャンネル）を物理削除する
```

---

_Fixes applied by document-review-reply command._
