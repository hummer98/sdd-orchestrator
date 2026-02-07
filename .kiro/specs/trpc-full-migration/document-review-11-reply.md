# Response to Document Review #11

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 1            | 1             | 0                |
| Warning  | 3      | 0            | 3             | 0                |
| Info     | 2      | 1            | 1             | 0                |

---

## Response to Critical Issues

### C1: handlers.ts内の未移行ハンドラ管理とTask 5.4のスコープ不一致

**Issue**: Task 5.4の記述が「specHandlers.ts削除」のみで、handlers.ts内の`registerSteeringHandlers()`由来4チャンネル（CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD）のhandlers.tsからの削除が明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
handlers.ts内のSteeringハンドラの存在を確認:
```
handlers.ts:610:  registerSteeringHandlers();
handlers.ts:1019: function registerSteeringHandlers(): void {
handlers.ts:1021:   safeHandle(IPC_CHANNELS.CHECK_STEERING_FILES, ...)
handlers.ts:1032:   safeHandle(IPC_CHANNELS.GENERATE_VERIFICATION_MD, ...)
handlers.ts:1044:   safeHandle(IPC_CHANNELS.CHECK_RELEASE_MD, ...)
handlers.ts:1055:   safeHandle(IPC_CHANNELS.GENERATE_RELEASE_MD, ...)
```

Task 5.1にspec routerでの移行は記載済み（`checkSteeringFiles等`）。しかし、Task 5.4のVerifyパターン `"specHandlers|bugHandlers|bugWorktreeHandlers|convertWorktreeHandlers"` にはhandlers.ts内のSteering関連削除が含まれていない。handlers.ts自体はTask 11.2で最終削除されるが、Task 5.4完了時点でhandlers.ts内の`registerSteeringHandlers()`呼び出しと関数定義を削除（またはコメントアウト）すべきであることを明記する必要がある。

**Action Items**:
- tasks.md Task 5.4の説明に「handlers.ts内の`registerSteeringHandlers()`呼び出し（行610）と関数定義（行1019-1066）を削除する（4チャンネル: CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD はTask 5.1でspec routerに移行済み）」を追記する

---

### C2: Renderer側 `window.electronAPI` 残存数と移行計画の乖離

**Issue**: Design.mdの「約693箇所」に対し、実測値がrenderer/ 285件 + shared/ 88件 = 373件であり、中間マイルストンでの残存数チェックポイントがない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
実測結果（`grep -c "window\.electronAPI"`）:
- renderer/: 285件（53ファイル）
- shared/: 88件（14ファイル）
- 合計: 373件（67ファイル）

Design.mdの693箇所は移行開始前の初期値であり、Task 1-4の完了により約320箇所が既にtRPCに移行済み。この数値は設計文書の「変更前状態の記録」として正確であり、更新の必要はない。

中間チェックポイントについては、各削除タスク（5.4, 6.3, 7.3等）のVerifyセクションに既にGrepパターンが含まれており、レガシーハンドラの残存ゼロ確認が行われる。`window.electronAPI`の残存数は最終的にTask 11.4のVerifyで0件確認される。段階的移行の各フェーズで個別のelectronAPI残存数カウントを追加すると、タスク説明が冗長になり、移行中に数値が継続的に変動するためメンテナンスコストが高い。

Grepベースの「対象ハンドラが0件であること」確認で実質的な移行漏れチェックは十分に機能する。

---

## Response to Warnings

### W1: App.tsxの`ipcRenderer.on`リスナーが0件

**Issue**: App.tsx内の`ipcRenderer.on`リスナーが0件であり、Task 9.2の前提条件「34個のリスナー」が実態と合致しない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
App.tsx内で`ipcRenderer.on`を検索した結果、確かに0件。ただし、App.tsx内の`window.electronAPI.on*`パターン（イベントリスナー）は20件存在する:
```
273: window.electronAPI.onAgentExitError(...)
381: window.electronAPI.onProjectSelected(...)
400: window.electronAPI.onMenuOpenProject(...)
406: window.electronAPI.onMenuInstallCliCommand(...)
410: window.electronAPI.onMenuSetCommandPrefix(...)
415: window.electronAPI.onMenuToggleRemoteServer(...)
438: window.electronAPI.onMenuInstallCommandset(...)
450: window.electronAPI.onMenuResetLayout(...)
458: window.electronAPI.onMenuInstallExperimentalDebug(...)
496: window.electronAPI.onMenuInstallExperimentalGeminiDocReview(...)
... 等
```

`ipcRenderer.on`は`preload/index.ts`で`window.electronAPI.on*`メソッドに抽象化されているため、直接的な`ipcRenderer.on`参照がないのは正常な動作。Task 9.2の「34個」は設計文書作成時の見積もりであり、実装の進行に伴い数値は変動し得る。

Task 9.2の説明は「App.tsxの全イベントリスナーを置換」と記載されており、具体的な「34個」という数字はガイドラインとしての参考値。実装者がTask 9.2着手時に実態を確認し、全リスナーを移行するフローになっている。数値の厳密な更新よりも、「全てのon*リスナーを移行する」という方針が維持されていれば問題ない。

---

### W2: `shared/hooks/useConfigTrpc.ts`と`shared/hooks/useSystemInfo.ts`に`window.electronAPI`フォールバックが残存

**Issue**: tRPCフック内に`window.electronAPI`への参照が残存しているとの指摘。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
実際のgrep結果を確認すると、これらはJSDocコメント内の参照のみ:
```
useConfigTrpc.ts:6:  * Provides React hooks that replace window.electronAPI config calls
useConfigTrpc.ts:30: * Replaces window.electronAPI.getRecentProjects().
useConfigTrpc.ts:68: * Replaces window.electronAPI.loadLayoutConfig/saveLayoutConfig/resetLayoutConfig.
useConfigTrpc.ts:113:* Replaces window.electronAPI.loadRemoteUiAutoStart/saveRemoteUiAutoStart.

useSystemInfo.ts:6:  * Replaces window.electronAPI.getAppVersion(), getPlatform() etc.
useSystemInfo.ts:34: * Replaces legacy window.electronAPI.getAppVersion() / getPlatform() pattern.
```

これらは全てJSDocコメント（`Replaces window.electronAPI.*` の説明文）であり、実際のコード実行に影響するフォールバック参照ではない。tRPCフックは正しくtRPC経由で動作しており、electronAPIへのランタイムフォールバックは存在しない。

Task 11.4のVerifyで`window.electronAPI`の完全削除を確認する際、コメント内の参照も対象に含めるか否かは実装者の判断で良い（コメントは機能に影響しないため、優先度は低い）。

---

### W3: テスト実行の検証コマンドがtasks.mdに不足

**Issue**: 中間タスクのVerifyセクションに`npm run build && npm run typecheck && vitest run`が明記されていない。Task 11.5にのみ記載。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Design.mdの「各Phaseは独立してTypeScript/テストがpassする状態を維持」方針は維持すべきだが、各タスクのVerifyセクションにGrepパターンが既に含まれており、レガシーコードの残存確認は行われる。

ビルド・テスト検証については:
1. 各タスクはspec-impl実行により自動的にTDD方式で実装され、テスト通過が前提
2. 中間タスクに毎回`npm run build && vitest run`を追記すると、タスク記述が冗長化
3. Task 11.5の「全体ビルド・テスト通過」が最終ゲートとして機能
4. 実際の開発では、CI/CDパイプラインまたは`spec-impl`のTDDプロセスがビルド検証を担う

タスク記述にビルドコマンドを逐一追加するよりも、設計原則として「各Phase完了時にビルド・テストがpassすること」が明記されていれば、実装者の運用レベルで十分にカバーされる。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | ロールバック手順の具体化 | No Fix Needed | worktreeベースの開発でブランチ単位のrevertが自明。追記は冗長 |
| I2 | Open Questions #1ステータス未更新 | Fix Required ✅ | requirements.mdのOpen Questions #1に「解決済み」を追記すべき。research.md/design.mdで既に解決済みであり、ドキュメント整合性の問題 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| tasks.md | Task 5.4にhandlers.ts内`registerSteeringHandlers()`削除を明記 |
| requirements.md | Open Questions #1に「解決済み: research.md DD-003参照」を追記 |

---

## Conclusion

7件の指摘のうち、実際に修正が必要なのは2件（CRITICAL-1、INFO-2）のみ。

- **CRITICAL-1**: Task 5.4のスコープにhandlers.ts内Steeringハンドラ削除の明記が必要 → tasks.mdを修正
- **INFO-2**: Open Questions #1のステータス更新 → requirements.mdを修正

残り5件はコードの実態確認により、問題なしと判断:
- CRITICAL-2: 中間チェックポイントは既存のGrepベースVerifyで十分
- WARNING-1: `ipcRenderer.on`は0件だが`window.electronAPI.on*`が20件存在し、Task 9.2のスコープ内
- WARNING-2: JSDocコメント内の参照のみで、ランタイムフォールバックではない
- WARNING-3: TDDプロセスと最終ゲート（Task 11.5）でカバー
- INFO-1: worktreeベースの開発でロールバック手順は自明

---

_This reply was generated by the document-review-reply command._

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 5.4にhandlers.ts内`registerSteeringHandlers()`削除を明記、Verifyパターンにも追加 |
| requirements.md | Open Questions #1に「解決済み: research.md DD-003参照」を追記 |

### Details

#### tasks.md

**Issue(s) Addressed**: C1

**Changes**:
- Task 5.4の説明にhandlers.ts内`registerSteeringHandlers()`呼び出し（行610）と関数定義（行1019-1066）の削除を追記
- Verifyパターンに`registerSteeringHandlers`を追加

**Diff Summary**:
```diff
 - [ ] 5.4 specHandlers.ts, bugHandlers.ts, bugWorktreeHandlers.ts, convertWorktreeHandlers.tsの削除と統合テスト
   - `specHandlers.ts`（25チャンネル）、`bugHandlers.ts`（7チャンネル）、`bugWorktreeHandlers.ts`（6チャンネル）、`convertWorktreeHandlers.ts`（2チャンネル）を物理削除する
+  - handlers.ts内の`registerSteeringHandlers()`呼び出し（行610）と関数定義（行1019-1066）を削除する（4チャンネル: CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD はTask 5.1でspec routerに移行済み）
   - preload/index.tsからSpec/Bug関連APIを削除する
   ...
-  - _Verify: Grep "specHandlers|bugHandlers|bugWorktreeHandlers|convertWorktreeHandlers" should return 0 results_
+  - _Verify: Grep "specHandlers|bugHandlers|bugWorktreeHandlers|convertWorktreeHandlers|registerSteeringHandlers" should return 0 results_
```

#### requirements.md

**Issue(s) Addressed**: I2

**Changes**:
- Open Questions #1に解決済みステータスとresearch.md DD-003への参照を追記

**Diff Summary**:
```diff
 1. **Subscriptionの実装方式**: electron-trpcでSubscriptionをどのように実装するか？（調査が必要）
    - **調査ポイント**: WebSocket不要でIPC経由のSubscriptionが可能か
+   - **解決済み**: research.md DD-003参照。electron-trpcはIPC経由のSubscriptionをネイティブサポートしており、`observable()`ヘルパーでEventEmitterをSubscriptionに変換可能
```

---

_Fixes applied by document-review-reply command._
