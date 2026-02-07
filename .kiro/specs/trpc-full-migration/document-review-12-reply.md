# Response to Document Review #12

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

### C1: handlers.ts内のregisterUnmigratedXxxHandlersのクリーンアップ計画が不明確

**Issue**: handlers.ts内の`registerUnmigratedProjectHandlers()`と`registerUnmigratedFileHandlers()`の削除タイミングがtasks.mdに明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

handlers.ts内の実装を確認した結果、各関数のチャンネル内容と対応tRPCルーターは以下の通り:

**`registerUnmigratedProjectHandlers()`** (handlers.ts:837-928):
| チャンネル | 対応tRPCプロシージャ | マッピング元 |
|-----------|---------------------|-------------|
| GET_PROJECT_LOG_PATH | misc.getProjectLogPath | research.md:450 |
| OPEN_LOG_IN_BROWSER | misc.openLogInBrowser | research.md:451 |
| ADD_SHELL_PERMISSIONS | misc.addShellPermissions | research.md:452 |
| ADD_MISSING_PERMISSIONS | misc.addMissingPermissions | research.md:453 |
| CHECK_REQUIRED_PERMISSIONS | misc.checkRequiredPermissions | research.md:454 |

**`registerUnmigratedFileHandlers()`** (handlers.ts:930-980):
| チャンネル | 対応tRPCプロシージャ | マッピング元 |
|-----------|---------------------|-------------|
| SHOW_OPEN_DIALOG | project.showOpenDialog | research.md:197 |
| OPEN_IN_VSCODE | misc.openInVscode | research.md:444 |

全7チャンネルのtRPCルーターへのマッピングはresearch.mdに定義済み。SHOW_OPEN_DIALOGはTask 4.1で既にproject routerに実装済み（handlers.ts:933にもコメントで「Also available via tRPC project.showOpenDialog」と記載）。残りの6チャンネルはTask 10.5のmisc router実装で移行され、Task 10.7またはTask 11.2でhandlers.tsから削除される流れ。

ただし、tasks.md内でこれら関数の削除タイミングが明示されていないのは確かに問題。Task 10.7のスコープに`registerUnmigratedProjectHandlers()`と`registerUnmigratedFileHandlers()`の削除を明記すべき。

**Action Items**:

- tasks.md Task 10.7に「handlers.ts内の`registerUnmigratedProjectHandlers()`（行837-928）と`registerUnmigratedFileHandlers()`（行930-980）の呼び出し（行509, 516）と関数定義を削除する」を追記
- Task 10.7のVerifyに`registerUnmigratedProjectHandlers|registerUnmigratedFileHandlers`の0件チェックを追加

---

## Response to Warnings

### W1: App.tsxのipcRenderer.onリスナー0件とTask 9.2の乖離

**Issue**: Task 9.2は「App.tsxの全イベントリスナー（34個）を置換する」と記載しているが、実測でipcRenderer.onリスナーがApp.tsx内に0件。

**Judgment**: **Fix Required** ✅

**Evidence**:

- `Grep "ipcRenderer.on" App.tsx` → 0件（確認済み）
- `Grep "webContents.send"` → Main側に40箇所（22ファイル）残存
- Task 5.3までの実装過程でApp.tsx内のリスナーは各コンポーネント/Storeに分散移行されたか、既に別方式で置き換え済み

Task 9.2の記述「App.tsxの全イベントリスナー（34個）」は現在の実態と乖離している。ただしMain側のwebContents.sendは40箇所残存しているため、Subscription移行のスコープ自体は存在する。Task 9.2の記述を現状に合わせて更新する必要がある。

**Action Items**:

- tasks.md Task 9.2の記述を以下のように更新:
  - 「App.tsxの全イベントリスナー（34個）」→「Main側の`webContents.send()`呼び出し箇所（約40箇所、22ファイル）に対応するRenderer側のイベント受信をtRPC Subscriptionに移行する」
  - 実装着手前にMain側webContents.send呼び出し箇所の現状マッピングを実施する旨を追記

### W2: 中間タスクのビルド/テスト検証ステップの欠如

**Issue**: Design.mdの「各Phaseは独立してTypeScript/テストがpassする状態を維持」方針に対し、各ドメイン削除タスクのVerifyにbuild/typecheckが明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

- tasks.md内で`npm run build`または`npm run typecheck`がVerifyに含まれるのはTask 11.5（最終検証、行312）のみ
- 各削除タスク（5.4, 6.3, 7.3, 8.3, 9.3, 10.7）のVerifyはGrep検索のみ
- Design.mdの方針「各Phaseは独立してTypeScript/テストがpassする状態を維持」との整合性が欠如

中間タスクでビルド検証がないと、エラーが蓄積して後続タスクのデバッグが困難になるリスクがある。

**Action Items**:

- tasks.md内の各Phase完了タスク（Task 5.4, 6.3, 7.3, 8.3, 9.3, 10.7）のVerifyセクションに`npm run build && npm run typecheck`を追加

---

## Response to Info (Low Priority)

| #    | Issue                                       | Judgment      | Reason                                                                                                                               |
| ---- | ------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| I1   | window.electronAPI残存373件の進捗トラッキング | No Fix Needed ❌ | 有用な提案だが、各Phase完了時のbuild/typecheck追加（W2対応）で実質的な品質ゲートは確保される。残存カウントは実装時に適宜確認すれば十分で、仕様に明記する必要性は低い |
| I2   | registerUnmigratedXxxHandlersの具体的チャンネル一覧 | No Fix Needed ❌ | 本回答のC1エビデンスセクションで全7チャンネルの棚卸し結果を記載済み。research.mdに既にマッピングが存在しており、追加ドキュメント化は不要 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| tasks.md | Task 10.7に`registerUnmigratedProjectHandlers()`/`registerUnmigratedFileHandlers()`削除を明記 |
| tasks.md | Task 10.7のVerifyに`registerUnmigratedProjectHandlers\|registerUnmigratedFileHandlers`の0件チェック追加 |
| tasks.md | Task 9.2の記述をApp.tsxリスナー0件の実態に合わせて更新 |
| tasks.md | Task 5.4, 6.3, 7.3, 8.3, 9.3, 10.7のVerifyに`npm run build && npm run typecheck`追加 |

---

## Conclusion

レビュー#12の5件の指摘のうち、Critical 1件・Warning 2件の計3件はFix Requiredと判断した。いずれもtasks.mdへの記述追加・更新であり、設計やアーキテクチャの変更は不要。

Info 2件は、C1/W2の対応で実質的にカバーされるため、追加修正は不要と判断した。

`--fix`フラグで修正を適用してください。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 10.7に`registerUnmigratedProjectHandlers()`/`registerUnmigratedFileHandlers()`削除を明記、Verify更新 |
| tasks.md | Task 9.2の記述をApp.tsxリスナー0件の実態に合わせて更新 |
| tasks.md | Task 5.4, 6.3, 7.3, 8.3, 9.3, 10.7のVerifyに`npm run build && npm run typecheck`追加 |

### Details

#### tasks.md - C1: Task 10.7 registerUnmigratedXxxHandlers削除の明記

**Issue(s) Addressed**: C1

**Changes**:
- Task 10.7の実施項目に`registerUnmigratedProjectHandlers()`（行837-928）と`registerUnmigratedFileHandlers()`（行930-980）の呼び出し（行509, 516）と関数定義の削除を追記
- VerifyにGrepチェック対象として`registerUnmigratedProjectHandlers|registerUnmigratedFileHandlers`を追加

**Diff Summary**:
```diff
- [ ] 10.7 その他ドメインのレガシーハンドラ削除と統合テスト
   - `cloudflareHandlers.ts`、...を物理削除する
+  - handlers.ts内の`registerUnmigratedProjectHandlers()`（行837-928）と`registerUnmigratedFileHandlers()`（行930-980）の呼び出し（行509, 516）と関数定義を削除する（全7チャンネルはTask 4.1/4.2/10.5でtRPCルーターに移行済み）
   ...
-  - _Verify: Grep "cloudflareHandlers|..." should return 0 results_
+  - _Verify: Grep "cloudflareHandlers|...|registerUnmigratedProjectHandlers|registerUnmigratedFileHandlers" should return 0 results; `npm run build && npm run typecheck` pass_
```

#### tasks.md - W1: Task 9.2の記述更新

**Issue(s) Addressed**: W1

**Changes**:
- タスク名を「Renderer側のイベント受信をtRPC Subscriptionフックに置換する」に変更
- 「App.tsxの全イベントリスナー（34個）」→「Main側の`webContents.send()`呼び出し箇所（約40箇所、22ファイル）に対応するRenderer側のイベント受信」に更新
- 実装着手前のMain側webContents.send呼び出し箇所の現状マッピング実施を追記

**Diff Summary**:
```diff
-- [ ] 9.2 Renderer側の`ipcRenderer.on`リスナーをtRPC Subscriptionフックに置換する
-  - App.tsxの全イベントリスナー（34個）を`trpc.events.*.useSubscription()`に変更する
+- [ ] 9.2 Renderer側のイベント受信をtRPC Subscriptionフックに置換する
+  - Main側の`webContents.send()`呼び出し箇所（約40箇所、22ファイル）に対応するRenderer側のイベント受信をtRPC Subscriptionに移行する
+  - 実装着手前にMain側webContents.send呼び出し箇所の現状マッピングを実施し、移行対象を確定する
   ...
-  - _Verify: Grep "useSubscription" in renderer/App.tsx_
+  - _Verify: Grep "useSubscription" in renderer/; Grep "webContents.send" should return 0 results_
```

#### tasks.md - W2: 中間タスクのビルド検証追加

**Issue(s) Addressed**: W2

**Changes**:
- Task 5.4のVerifyに`npm run build && npm run typecheck` passを追加
- Task 6.3のVerifyに`npm run build && npm run typecheck` passを追加
- Task 7.3のVerifyに`npm run build && npm run typecheck` passを追加
- Task 8.3のVerifyに`npm run build && npm run typecheck` passを追加
- Task 9.3のVerifyに`npm run build && npm run typecheck` passを追加
- Task 10.7のVerifyにも同様に追加（C1修正と同時に適用）

**Diff Summary**:
```diff
 # Task 5.4
-  - _Verify: Grep "specHandlers|..." should return 0 results_
+  - _Verify: Grep "specHandlers|..." should return 0 results; `npm run build && npm run typecheck` pass_

 # Task 6.3
-  - _Verify: Grep "agentHandlers" should return 0 results_
+  - _Verify: Grep "agentHandlers" should return 0 results; `npm run build && npm run typecheck` pass_

 # Task 7.3
-  - _Verify: Grep "autoExecutionHandlers|..." should return 0 results_
+  - _Verify: Grep "autoExecutionHandlers|..." should return 0 results; `npm run build && npm run typecheck` pass_

 # Task 8.3
-  - _Verify: Grep "gitHandlers|..." should return 0 results_
+  - _Verify: Grep "gitHandlers|..." should return 0 results; `npm run build && npm run typecheck` pass_

 # Task 9.3
-  - _Verify: Grep "useSubscription|observable" in __tests__/events-router.test.ts_
+  - _Verify: Grep "useSubscription|observable" in __tests__/events-router.test.ts; `npm run build && npm run typecheck` pass_
```

---

_Fixes applied by document-review-reply command._
