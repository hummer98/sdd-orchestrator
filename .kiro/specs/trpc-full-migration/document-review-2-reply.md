# Response to Document Review #2

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 5      | 4            | 1             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: ipcRenderer.onリスナー数の過小見積もり（Section 1.6 #1）

**Issue**: design.md「約25種類」は実測34個と大幅に乖離。

**Judgment**: **Fix Required** ✅

**Evidence**:
`preload/index.ts`を実測した結果、`ipcRenderer.on()`リスナーは**34個**。レビューの指摘は正確。

実測34リスナー完全一覧:
1. AGENT_OUTPUT, 2. AGENT_STATUS_CHANGE, 3. AGENT_LOG, 4. AGENT_EXIT_ERROR, 5. AGENT_START_ERROR, 6. PROJECT_SELECTED, 7. SPECS_CHANGED, 8. AGENT_RECORD_CHANGED, 9. MENU_OPEN_PROJECT, 10. MENU_INSTALL_CLI_COMMAND, 11. MENU_SET_COMMAND_PREFIX, 12. MENU_TOGGLE_REMOTE_SERVER, 13. REMOTE_SERVER_STATUS_CHANGED, 14. REMOTE_CLIENT_COUNT_CHANGED, 15. CLOUDFLARE_TUNNEL_STATUS_CHANGED, 16. MENU_INSTALL_COMMANDSET, 17. BUGS_CHANGED, 18. `ssh:status-changed`（リテラル文字列）, 19. MENU_RESET_LAYOUT, 20. MENU_INSTALL_EXPERIMENTAL_DEBUG, 21. MENU_INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW, 22. AUTO_EXECUTION_STATUS_CHANGED, 23. AUTO_EXECUTION_PHASE_COMPLETED, 24. AUTO_EXECUTION_ERROR, 25. AUTO_EXECUTION_COMPLETED, 26. BUG_AUTO_EXECUTION_STATUS_CHANGED, 27. BUG_AUTO_EXECUTION_PHASE_COMPLETED, 28. BUG_AUTO_EXECUTION_ERROR, 29. BUG_AUTO_EXECUTION_COMPLETED, 30. BUG_AUTO_EXECUTION_EXECUTE_PHASE, 31. MCP_STATUS_CHANGED, 32. SCHEDULE_TASK_STATUS_CHANGED, 33. GIT_CHANGES_DETECTED, 34. PROJECT_FILE_CHANGED

design.md DD-003 Consequencesの「約25種類」およびInterface Changes & Impact Analysisの「約25リスナー」を「34リスナー」に修正する必要がある。

**Action Items**:

- design.md DD-003 Consequencesの「全イベントリスナー（約25種類）」を「全イベントリスナー（34種類）」に修正
- design.md Interface Changes & Impact Analysisの「App.tsx ~25リスナー」を「App.tsx ~34リスナー」に修正

---

### C2: eventsRouter Subscription定義とpreloadリスナーの網羅性検証（Section 1.6 #3）

**Issue**: design.md eventsRouterにはAUTO_EXECUTION_PHASE_STARTED Subscriptionが含まれるが、preload/index.tsには対応リスナーが存在しない。また、`onSshStatusChanged`がeventsRouter定義に欠落。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.mdのeventsRouter Subscription定義（コードブロック内）を正確にカウントすると**36個**だが、tasks.md Task 9.1では「35個」と記載されている。

preload実測34リスナーとdesign.md eventsRouter定義の1:1マッピング検証結果:

**design.mdに定義あり、preloadにリスナー無し**（4個）:
- `onAutoExecutionPhaseStarted`: Main側で`broadcastToRenderers(IPC_CHANNELS.AUTO_EXECUTION_PHASE_STARTED)`で送信されるが、preloadにリスナー未登録。ただしMain側で実際にbroadcastされているため、Subscription定義として残すのが正しい（移行時にRendererでの受信も実装する）
- `onBugAutoExecutionPhaseStarted`: 同上。Main側で`broadcastToRenderers(IPC_CHANNELS.BUG_AUTO_EXECUTION_PHASE_STARTED)`で送信されるがpreloadにリスナー未登録
- `onMetricsUpdated`: Main側`metricsHandlers.ts:136`で`window.webContents.send(IPC_CHANNELS.METRICS_UPDATED)`で送信されるがpreloadにリスナー未登録
- `onMenuNewWindow`: channels.tsに`MENU_NEW_WINDOW`定義あるが、Main側のsend呼び出しが存在しない（完全に未使用）

**preloadにリスナーあり、design.mdに定義無し**（1個）:
- `ssh:status-changed`（リテラル文字列）: preload行1010に登録済み。design.md eventsRouter定義に`onSshStatusChanged`が欠落

**差分分析結論**:
- `onAutoExecutionPhaseStarted`/`onBugAutoExecutionPhaseStarted`/`onMetricsUpdated`: Main側から送信されているがpreloadで未受信。tRPC移行時にSubscriptionとして正しく移行すべき。design.md定義は**正しい**
- `onMenuNewWindow`: 完全に未使用（channels.ts定義のみ）。design.md定義から**削除すべき**
- `onSshStatusChanged`: preloadで使用されている。design.md定義に**追加すべき**

**Action Items**:

- design.md eventsRouter定義から`onMenuNewWindow`を削除
- design.md eventsRouter定義に`onSshStatusChanged`を追加
- tasks.md Task 9.1の括弧内分類を修正（Menu系を8→7に減、SSH系を追加）
- design.md eventsRouter Subscription総数を正確な数に修正
- research.md events routerセクションに実測34リスナーとSubscription定義の1:1マッピングテーブルを追加

---

## Response to Warnings

### W1: system系チャンネルの登録元をTask 2.3に明記（Section 1.6 #2）

**Issue**: GET_APP_VERSION/GET_PLATFORMはprojectHandlers.ts内で登録されているが、design.md Requirements Traceability 1.5では「handlers.ts」と記載。

**Judgment**: **Fix Required** ✅

**Evidence**:
コードベース検証の結果、system系チャンネルの登録位置は以下の通り:
- `GET_APP_VERSION`: `projectHandlers.ts` 行247-250
- `GET_PLATFORM`: `projectHandlers.ts` 行252-255
- `GET_INITIAL_PROJECT_PATH`: `projectHandlers.ts` 行257-260

design.md Requirements Traceability行148のCriterion 1.5「`handlers.ts` 対応ハンドラ削除」は不正確。実際には`projectHandlers.ts`内に登録されている。

ただし、Phase 1（Task 2.3）でのsystem系ハンドラの「削除」は、projectHandlers.ts全体がPhase 3（Task 4.4）で削除予定であるため、Phase 1では**preload側のAPI削除のみ**に留めるのが安全。

**Action Items**:

- design.md Requirements Traceability Criterion 1.5の「`handlers.ts`」を「`projectHandlers.ts`（行247-260）」に修正
- tasks.md Task 2.3に「system系チャンネルのMainプロセス側ハンドラは`projectHandlers.ts`内（行247-260）にあり、Task 4.4でprojectHandlers.ts全体を削除する際に一括削除する。Phase 1ではpreload/index.tsからのAPI削除のみ実施する」旨を追記

---

### W2: Context DI導入時の既存テスト更新手順（Section 2.1 #1）

**Issue**: system-router.test.tsは現在`createCaller({})`で空Contextを使用。DD-006導入後、全テストでモックContextが必要。

**Judgment**: **Fix Required** ✅

**Evidence**:
DD-006でContext拡張を実施すると、既存の`createCaller({})`は型エラーになる。Task 1.1（Context拡張）とTask 1.2（テストヘルパー）は同一Taskグループ内で実施されるため、既存テストの更新は自然に含まれるが、明示的に記載がない。

**Action Items**:

- tasks.md Task 1.1に「既存system-router.test.tsの`createCaller({})`をモックContext付きに更新する」旨を追記

---

### W3: DD-003の「約25種類」記述修正（Section 1.6 #1関連）

**Issue**: DD-003 Consequencesの「約25種類」が実測と乖離。

**Judgment**: C1と重複する指摘のため、C1のAction Itemsで対応済み。C1参照。

---

### W4: SSH_STATUS_CHANGEDのカスタムチャンネル扱い（Section 3 #3）

**Issue**: `ssh:status-changed`はchannels.ts定数外のカスタムイベント名。

**Judgment**: **Fix Required** ✅

**Evidence**:
preload/index.ts行1010で`ipcRenderer.on('ssh:status-changed', handler)`としてリテラル文字列で登録されている。channels.tsの`IPC_CHANNELS`定数を使用していない。

research.md SSHマッピングテーブル（行423）では既に`SSH_STATUS_CHANGED`を`events.onSshStatusChanged` subscription として記載済み。ただしdesign.md eventsRouter定義には含まれていない（C2で対応）。

research.mdの記述は正確。design.mdのeventsRouter定義への追加はC2で対応する。

**Action Items**:

- C2のAction Itemsで対応（design.md eventsRouterへの`onSshStatusChanged`追加）

---

### W5: Task 2.3のPhase 1レガシー削除範囲の明確化（Section 3 #1）

**Issue**: system系チャンネルのprojectHandlers.ts内のハンドラ部分削除はPhase 3まで延期するかどうか。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
W1で既にTask 2.3に「Phase 1ではpreload/index.tsからのAPI削除のみ実施し、projectHandlers.ts内のハンドラはTask 4.4で一括削除」と明記する修正を含めている。W5はW1と実質的に同じ指摘であり、追加の修正は不要。

---

## Response to Info (Low Priority)

| #   | Issue                                  | Judgment      | Reason                                                                                          |
| --- | -------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| I1  | preloadリスナー完全一覧の追加          | No Fix Needed | C2のAction Itemsでresearch.mdに1:1マッピングテーブルを追加することで対応済み                     |
| I2  | Context DIテストパターン例             | No Fix Needed | Task 1.2のテストヘルパー実装時に自然に具体例が生成される。設計文書に実装パターン例は不要（YAGNI） |
| I3  | 中間状態の検証コマンド統一             | No Fix Needed | レビュー#1 I3と同様の判断。各TaskのVerifyセクションで十分                                         |

---

## Files to Modify

| File             | Changes                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| design.md        | DD-003「約25種類」→「34種類」、Impact Analysis「~25リスナー」→「~34リスナー」、Requirements Traceability 1.5「handlers.ts」→「projectHandlers.ts」、eventsRouter定義からonMenuNewWindow削除・onSshStatusChanged追加 |
| tasks.md         | Task 2.3にprojectHandlers.ts情報追記、Task 1.1に既存テスト更新追記、Task 9.1のSubscription分類修正     |
| research.md      | events routerセクションにpreload 34リスナーとSubscription定義の1:1マッピングテーブル追加               |

---

## Conclusion

Critical 2件ともFix Required。主な修正は:
1. design.mdのリスナー数「約25」→「34」への修正（複数箇所）
2. eventsRouter Subscription定義の網羅性修正（onMenuNewWindow削除、onSshStatusChanged追加）

Warning 5件のうち4件がFix Required（W3はC1重複、W5はW1重複で実質2件分の独立修正）。

全修正は文書レベルの修正であり、設計アーキテクチャへの影響はない。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | DD-003リスナー数修正、Impact Analysisリスナー数修正、Requirements Traceability 1.5修正、eventsRouter定義修正（onMenuNewWindow削除、onSshStatusChanged追加） |
| tasks.md | Task 1.1に既存テスト更新追記、Task 2.3にprojectHandlers.ts情報追記、Task 9.1 Subscription分類修正、Task 9.2リスナー数修正 |
| research.md | events routerセクションにpreload 34リスナーとSubscription定義の1:1マッピングテーブル追加 |

### Details

#### design.md

**Issue(s) Addressed**: C1, C2, W1

**Changes**:
- DD-003 Consequences「全イベントリスナー（約25種類）」→「全イベントリスナー（34種類）」
- Interface Changes & Impact Analysis「App.tsx ~25リスナー」→「App.tsx ~34リスナー」
- Requirements Traceability Criterion 1.5「`handlers.ts` 対応ハンドラ削除」→「`projectHandlers.ts`（行247-260） Phase 1ではpreload削除のみ、ハンドラはTask 4.4で一括削除」
- eventsRouter定義から`onMenuNewWindow`を削除（MENU_NEW_WINDOWは未使用チャンネル）
- eventsRouter定義に`onSshStatusChanged: Subscription<void, SshStatusEvent>`を追加

**Diff Summary**:
```diff
- | `src/renderer/App.tsx` | ~25リスナー | ipcRenderer.onをtRPC Subscriptionに置換 |
+ | `src/renderer/App.tsx` | ~34リスナー | ipcRenderer.onをtRPC Subscriptionに置換 |
```

```diff
- | Consequences | 全イベントリスナー（約25種類）をSubscriptionフックに書き換える必要がある。Req 8で対応 |
+ | Consequences | 全イベントリスナー（34種類）をSubscriptionフックに書き換える必要がある。Req 8で対応 |
```

```diff
- | 1.5 | レガシーハンドラ削除 | `handlers.ts` | 対応ハンドラ削除 |
+ | 1.5 | レガシーハンドラ削除 | `projectHandlers.ts`（行247-260） | Phase 1ではpreload削除のみ、ハンドラはTask 4.4で一括削除 |
```

```diff
  // Menu Events
  onMenuOpenProject: Subscription<void, void>;
- onMenuNewWindow: Subscription<void, void>;
  onMenuResetLayout: Subscription<void, void>;
+ // SSH Events
+ onSshStatusChanged: Subscription<void, SshStatusEvent>;
```

#### tasks.md

**Issue(s) Addressed**: W1, W2, C2

**Changes**:
- Task 1.1に「既存system-router.test.tsの`createCaller({})`をモックContext付きに更新する」追記
- Task 2.3の記述を「preload APIエントリを削除する」に修正し、projectHandlers.ts情報を追記
- Task 9.1のSubscription分類を正確な数に修正（合計36個）
- Task 9.2「約25個」→「34個」

**Diff Summary**:
```diff
  - ハンドラ初期化（`handler.ts`）からコンテキストへのサービス渡しを設定する
+ - 既存system-router.test.tsの`createCaller({})`をモックContext付きに更新する
```

```diff
- - 移行した4チャンネルに対応するレガシーIPCハンドラ、preload APIエントリを削除する
+ - 移行した4チャンネルに対応するpreload APIエントリを削除する
+ - system系チャンネルのMainプロセス側ハンドラは`projectHandlers.ts`内（行247-260）にあり、Task 4.4でprojectHandlers.ts全体を削除する際に一括削除する
```

```diff
- （Agent系6個、Spec/Bug系3個、AutoExecution系10個、Server/Tunnel系3個、File系2個、ScheduleTask系1個、MCP系1個、Metrics系1個、Menu系8個）
+ （Agent系6個、Spec/Bug系3個、AutoExecution系5個、BugAutoExecution系6個、Server/Tunnel系3個、File系2個、ScheduleTask系1個、MCP系1個、Metrics系1個、SSH系1個、Menu系7個 = 合計36個）
```

#### research.md

**Issue(s) Addressed**: C2, I1

**Changes**:
- events routerセクションにpreload実測34リスナーとdesign.md Subscription定義の1:1マッピングテーブルを追加
- preloadにリスナー無し・Main側でbroadcast/sendされるSubscription 3個を別表として記載
- MENU_NEW_WINDOW除外理由を注記

---

_Fixes applied by document-review-reply command._
