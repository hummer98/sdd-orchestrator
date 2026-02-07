# Response to Document Review #5

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| 重要度 | 件数 | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0 | 0 | 0 | 0 |
| Warning | 2 | 2 | 0 | 0 |
| Info | 3 | 1 | 2 | 0 |

---

## Response to Warnings

### W1: requirements.md Req 1 AC 1.1のチャンネル列挙が3個（design.md/tasks.mdでは4個）

**Issue**: requirements.md AC 1.1にはGET_APP_VERSION、GET_PLATFORM、GET_NODE_ENVの3チャンネルのみ列挙されているが、design.md/tasks.mdでは`getAppPath`を含む4プロシージャとして定義されている。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `channels.ts`（行62-63）にはGET_APP_VERSIONとGET_PLATFORMのみ定義。GET_NODE_ENVもGET_APP_PATHもchannels.tsに存在しない
- research.md system routerマッピングテーブル（行153-157）には3行のみ記載。GET_NODE_ENVは「新規追加プロシージャ（channels.tsに未定義、tRPCで新規提供）」と注記
- `getAppPath`もGET_NODE_ENVと同様にchannels.tsに未定義の新規追加プロシージャ。`app.getAppPath()`（Electron API）を呼ぶ単純なプロシージャ
- design.md Traceability 1.1では「GET_APP_VERSION等4チャンネルtRPC移行」、tasks.md Task 2.1では明示的に4プロシージャを列挙
- **requirements.md AC 1.1の列挙が不完全**であり、design.md/tasks.mdとの整合性が取れていない

**Action Items**:

- requirements.md AC 1.1に`getAppPath`を新規追加プロシージャとして追記（GET_NODE_ENVと同様の注記付き）
- research.md system routerマッピングテーブルに`getAppPath`行を追加

---

### W2: config routerプロシージャ数22個 vs configHandlers.ts 18チャンネルの差異根拠不足

**Issue**: requirements.md AC 2.4は「configHandlers.ts（18チャンネル）」の削除を完了条件としているが、config routerは22プロシージャを持つ。差分の4プロシージャの出自が不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:
- `configHandlers.ts`のハンドラ登録を実測: 18チャンネル（GET_HANG_THRESHOLD〜RESOLVE_TOOL）。**LOAD/SAVE_REMOTE_UI_AUTO_STARTを含む**
- `projectHandlers.ts`（行229, 235）に**GET_RECENT_PROJECTS、ADD_RECENT_PROJECT**の2チャンネルが登録されている → config routerに移行される
- `handlers.ts`（行686, 705）に**VCS_SCHEME_GET、VCS_SCHEME_SET**の2チャンネルが登録されている → config routerに移行される
- 合計: configHandlers.ts(18) + projectHandlers.ts(2) + handlers.ts(2) = **22プロシージャ**
- requirements.md AC 2.4の「configHandlers.ts（18チャンネル）が削除されていること」は正確だが、config routerの全22プロシージャのうち4プロシージャが他ファイル由来であることが記載されていない
- 他ファイル由来の4プロシージャのレガシーコード削除は、GET_RECENT_PROJECTS/ADD_RECENT_PROJECTはTask 4.4（projectHandlers.ts削除）、VCS_SCHEME_GET/SETはTask 11.2（handlers.ts削除）で別途カバーされている

**Action Items**:

- requirements.md AC 2.4に「configHandlers.ts由来18チャンネル + projectHandlers.ts由来2チャンネル + handlers.ts由来2チャンネル = 計22プロシージャがconfig routerに統合されること」を注記
- research.md config routerマッピングテーブルに出自ハンドラファイル名の列を追加

---

## Response to Info (Low Priority)

| # | Issue | Judgment | Reason |
| ---- | --------- | ------------- | -------------- |
| I1 | Subscription新規3イベントの受信方針未明示 | No Fix Needed ❌ | design.md eventsRouter Subscription定義に3イベントが含まれており、research.md（行362-368）で「preloadにリスナー無し、Main側でbroadcast/sendされるが現在preloadで未受信」と注記済み。tRPC移行でSubscription定義し受信可能にすることは自然な設計であり、UI側で未使用なら単にuseSubscription呼び出しを行わないだけ。実装時に自明な判断であり、仕様追記は不要 |
| I2 | Task 10.5 miscルーターのプロシージャ数15が不正確（SSH含め22） | Fix Required ✅ | research.mdでmisc router 15プロシージャ + SSH関連7プロシージャ（行437-469）= 合計22プロシージャ。tasks.md Task 10.5の「全15プロシージャ」はSSH関連を含まない数値。タスク本文に「SSH関連プロシージャも含める」と明記しているため実装に支障はないが、数値の正確性のため修正する |
| I3 | events routerのSubscription数とresearch.mdテーブル行数の混同リスク | No Fix Needed ❌ | research.md（行370）に「MENU_NEW_WINDOWは未使用のため除外」と注記済み。design.md eventsRouter定義とresearch.mdテーブルが異なる行数になる理由は自明。追加の説明は冗長 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| requirements.md | AC 1.1に`getAppPath`を新規追加プロシージャとして追記。AC 2.4にconfig routerの22プロシージャの出自内訳を注記 |
| research.md | system routerマッピングに`getAppPath`行追加。config routerマッピングに出自ハンドラファイル名列を追加 |
| tasks.md | Task 10.5の「全15プロシージャ」を「全22プロシージャ（misc 15 + SSH関連7）」に修正 |

---

## Conclusion

レビュー#5の指摘5件のうち、3件をFix Required、2件をNo Fix Neededと判断した。

修正が必要な項目:
1. **W1**: requirements.md AC 1.1に`getAppPath`を新規追加プロシージャとして追記し、research.mdにもマッピング行追加
2. **W2**: requirements.md AC 2.4にconfig routerの22プロシージャの出自内訳（configHandlers.ts: 18、projectHandlers.ts: 2、handlers.ts: 2）を注記。research.mdに出自列追加
3. **I2**: tasks.md Task 10.5のプロシージャ数を22に修正

修正不要の項目:
1. **I1**: Subscription新規3イベントの受信方針は実装時に自明であり追記不要
2. **I3**: events router Subscription数の説明はresearch.mdの既存注記で十分

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | AC 1.1に`getAppPath`を新規追加プロシージャとして追記。AC 2.4にconfig router 22プロシージャの出自内訳を注記 |
| research.md | system routerマッピングに`getAppPath`行追加。config routerマッピングに出自ハンドラファイル名列を追加 |
| tasks.md | Task 10.5のプロシージャ数を15→22に修正（SSH関連7プロシージャの内訳を明示） |

### Details

#### requirements.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- AC 1.1に`getAppPath`を新規追加プロシージャとして追記（`app.getAppPath()`を提供）
- AC 2.4の「configHandlers.ts（18チャンネル）が削除されていること」をconfig router全22プロシージャの出自内訳（configHandlers.ts: 18、projectHandlers.ts: 2、handlers.ts: 2）を含む記述に修正

**Diff Summary**:
```diff
  1. 以下のチャンネルがtRPCに移行されていること:
     - `GET_APP_VERSION` → `system.getAppVersion`
     - `GET_PLATFORM` → `system.getPlatform`
     - `GET_NODE_ENV` → `system.getNodeEnv`（新規追加プロシージャ）
+    - `getAppPath` → `system.getAppPath`（新規追加プロシージャ、`app.getAppPath()` を提供）
```

```diff
- 4. 既存の`configHandlers.ts`（18チャンネル）が削除されていること
+ 4. config routerに統合される全22プロシージャの元ハンドラが削除されていること（`configHandlers.ts`由来18チャンネル + `projectHandlers.ts`由来2チャンネル〔GET_RECENT_PROJECTS, ADD_RECENT_PROJECT〕+ `handlers.ts`由来2チャンネル〔VCS_SCHEME_GET, VCS_SCHEME_SET〕）
```

#### research.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- system routerマッピングテーブルに`getAppPath`行を追加（新規追加プロシージャ）
- config routerマッピングテーブルに「出自ハンドラ」列を追加し、各プロシージャの元ファイルを明示
- config routerテーブルの注記に22プロシージャの内訳（18+2+2）を追記

**Diff Summary**:
```diff
  | GET_NODE_ENV | system.getNodeEnv | query | 新規追加プロシージャ（channels.tsに未定義、tRPCで新規提供） |
+ | _(新規)_ | system.getAppPath | query | 新規追加プロシージャ（channels.tsに未定義、`app.getAppPath()`を提供） |
```

```diff
- | Legacy Channel | tRPC Procedure | Type |
- |---------------|---------------|------|
- | GET_RECENT_PROJECTS | config.getRecentProjects | query |
+ | Legacy Channel | tRPC Procedure | Type | 出自ハンドラ |
+ |---------------|---------------|------|-------------|
+ | GET_RECENT_PROJECTS | config.getRecentProjects | query | projectHandlers.ts |
  ...
+ | VCS_SCHEME_GET | config.getVcsScheme | query | handlers.ts |
+ | VCS_SCHEME_SET | config.setVcsScheme | mutation | handlers.ts |
```

#### tasks.md

**Issue(s) Addressed**: I2

**Changes**:
- Task 10.5のプロシージャ数を「全15プロシージャ」から「全22プロシージャ」に修正し、SSH関連7プロシージャの内訳を明示

**Diff Summary**:
```diff
-   - misc routerに全15プロシージャ（openInVscode、copyToClipboard、logRenderer、recordHumanSession、各種metrics/permissions/remoteServer等）を定義する
-   - SSH関連プロシージャも含める
+   - misc routerに全22プロシージャ（misc 15: openInVscode、copyToClipboard、logRenderer、recordHumanSession、各種metrics/permissions/remoteServer等 + SSH関連7: sshConnect、sshDisconnect、sshGetStatus、sshGetConnectionInfo、sshGetRecentRemoteProjects、sshAddRecentRemoteProject、sshRemoveRecentRemoteProject）を定義する
```

---

_Fixes applied by document-review-reply command._
