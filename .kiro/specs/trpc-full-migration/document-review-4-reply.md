# Response to Document Review #4

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| 重要度 | 件数 | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1 | 1 | 0 | 0 |
| Warning | 3 | 2 | 1 | 0 |
| Info | 2 | 0 | 2 | 0 |

---

## Response to Critical Issues

### C1: `registerSteeringHandlers()`のtRPC移行先を明確化

**Issue**: handlers.ts行864の`registerSteeringHandlers()`は4チャンネル（CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD）を登録するが、design.mdに移行先が記載されていない。DD-006の「19個のregisterXxxHandlers()呼び出し」も不正確。

**Judgment**: **Fix Required** ✅

**Evidence**:
- handlers.ts行607で`registerSteeringHandlers()`が`registerIpcHandlers()`内から呼び出されていることを確認。行864に関数定義あり
- research.md行248-251にspec routerマッピングとして4チャンネル全て記載済み（`spec.checkSteeringFiles`, `spec.generateVerificationMd`, `spec.checkReleaseMd`, `spec.generateReleaseMd`）
- tasks.md Task 5.1に「checkSteeringFiles等」と明示的に記載済み（行103）
- ただし、**design.md DD-006 Implementation Notes**の「19個のregisterXxxHandlers()呼び出し」が不正確（正確には19呼び出し + registerSteeringHandlers関数定義が別途存在）
- design.mdのComponents一覧のspecRouter説明にsteering関連プロシージャへの言及がない

**Action Items**:

- design.md DD-006 Implementation Notesの「19個のregisterXxxHandlers()」に`registerSteeringHandlers()`がspec routerに移行される旨を注記追加
- design.md specRouter Service Interfaceの説明にsteering関連4プロシージャの言及がないため実装ノートとして追記

---

## Response to Warnings

### W1: Subscriptionライフサイクル管理の検証タスク追加

**Issue**: research.md Risk 1で「BrowserWindowクローズ時のcleanup検証が必要」と警告されているが、tasks.mdに検証タスクが未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
- コードベースの既存preload/index.tsでは全IPCリスナーがcleanup関数を返すパターンを使用している（24箇所以上）
- electron-trpc 0.7.1のSubscriptionに対するcleanup動作は明示的にドキュメント化されていない
- design.md DD-003で「全イベントリスナー（34種類）をSubscriptionフックに書き換える」と記載があるが、cleanup検証の具体的なタスクがない
- Subscription移行はTask 9で初めて本格的に行われるため、cleanup検証をTask 9.1に含めるのが妥当

**Action Items**:

- tasks.md Task 9.1に「electron-trpc SubscriptionのBrowserWindowクローズ時cleanup動作を検証するサブステップ」を追加

---

### W2: 各Phase完了時のTypeScript/テスト検証ステップ明示

**Issue**: design.md Migration Strategyで「各Phaseは独立してTypeScript/テストがpassする状態を維持」と記載されているが、tasks.mdの各Phase末尾にこの検証ステップが含まれていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- tasks.md各ドメインTaskの最終サブタスク（X.3/X.4等の「レガシーハンドラ削除と統合テスト」）は、統合テスト作成を含む
- 各タスクの`_Verify:_`行にGrepコマンドで検証方法が明示されている
- Task 11.5で「`npm run build` と `npm run typecheck` が成功することを確認」「`vitest run` で全統合テストがpassすることを確認」と最終検証が定義済み
- 実装者（AI Agent）は各タスク完了後にTypeScript/テスト通過を当然確認するものであり、全タスクに冗長な検証ステップを追加することはYAGNI原則に反する
- design.md Migration Strategyの記述は実装者への方針指示であり、tasks.md各タスクに逐一転記する必要はない

---

### W3: ApiClientインターフェース縮小範囲の事前分析

**Issue**: IpcApiClient（41メソッド）とWebSocketApiClient（~42メソッド）のメソッドセット差異が未分析。

**Judgment**: **Fix Required** ✅

**Evidence**:
- IpcApiClient.tsに同期メソッド`getProjectPath()`が行92-94に存在することを確認
- WebSocketApiClientとのメソッド差分は確かにresearch.mdに記載されていない
- ただし、この分析はTask 11.4の実装時に行えば十分であり、specドキュメントへの事前記載は必須ではない
- **しかし**、tasks.md Task 11.4の記述が「ApiClientインターフェースをWebSocketApiClient用に整理する」のみで具体性に欠ける。作業内容の明確化のためにタスク説明にメソッド差分分析のステップを追加する

**Action Items**:

- tasks.md Task 11.4に「IpcApiClientとWebSocketApiClientのメソッド差分を確認し、ApiClientインターフェースからIpcApiClient固有のメソッドを削除する」ステップを追記

---

## Response to Info (Low Priority)

| # | Issue | Judgment | Reason |
| ---- | --------- | ------------- | -------------- |
| I1 | DD-006のregister関数数19→20 | No Fix Needed ❌ | registerIpcHandlers内の呼び出しは19個で正確。registerSteeringHandlersは内部関数として行864に定義されており、registerIpcHandlers内の行607で呼ばれている。「19個のregisterXxxHandlers()呼び出し」は呼び出し回数として正確で、registerSteeringHandlersを含めた20個目のカウントは「呼び出し」ではなく「定義」を数えている。C1の修正でsteering移行先を補足すれば十分 |
| I2 | CONFIRM_COMMON_COMMANDSのElectron dialog呼び出しパターン | No Fix Needed ❌ | レビュー自体が「projectRouterで確立されたパターンを適用すれば解決可能」と認めている。実装時に自明であり、ドキュメント修正不要 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | DD-006 Implementation NotesにregisterSteeringHandlersのspec router移行先を注記追加。specRouterセクションにsteering関連プロシージャのImplementation Notes追加 |
| tasks.md | Task 9.1にSubscription cleanup検証ステップ追加。Task 11.4にメソッド差分分析ステップ追記 |

---

## Conclusion

レビュー#4の指摘6件のうち、3件をFix Required、3件をNo Fix Neededと判断した。

修正が必要な項目:
1. **C1**: design.mdにregisterSteeringHandlersのspec router移行先を明示（実態はresearch.md/tasks.mdに既記載だが、design.mdの記述が不足）
2. **W1**: tasks.md Task 9.1にSubscription cleanup検証ステップを追加
3. **W3**: tasks.md Task 11.4にメソッド差分分析ステップを追記

修正不要の項目:
1. **W2**: 各Phase検証ステップは冗長（YAGNI原則、実装者は当然確認する）
2. **I1**: register関数数は呼び出し回数として正確（C1の修正で十分）
3. **I2**: 実装時に自明なパターン適用

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | DD-006 Implementation NotesにregisterSteeringHandlersのspec router移行注記追加。specRouterセクション後にsteering関連4プロシージャのImplementation Notes追加 |
| tasks.md | Task 9.1にSubscription cleanup検証ステップ追加。Task 11.4のApiClient整理手順を具体化 |

### Details

#### design.md

**Issue(s) Addressed**: C1

**Changes**:
- DD-006 Implementation Notesの末尾に`registerSteeringHandlers()`のspec router移行先情報を追加
- specRouter/configRouterセクション後にsteering関連4プロシージャ（checkSteeringFiles, generateVerificationMd, checkReleaseMd, generateReleaseMd）のImplementation Notesを追加

**Diff Summary**:
```diff
- handlers.tsの19個の`registerXxxHandlers()`呼び出しで使用されている依存注入パターン（ゲッター関数/サービスインスタンスの引数渡し）をContext構造に統合する |
+ handlers.tsの19個の`registerXxxHandlers()`呼び出しで使用されている依存注入パターン（ゲッター関数/サービスインスタンスの引数渡し）をContext構造に統合する。なお、`registerSteeringHandlers()`（handlers.ts行864、4チャンネル: CHECK_STEERING_FILES, GENERATE_VERIFICATION_MD, CHECK_RELEASE_MD, GENERATE_RELEASE_MD）はresearch.mdのドメイン別マッピングに従いspec routerに移行する（Task 5.1スコープ内） |
```

```diff
  残りのルーター（specRouter, bugRouter, ...）は、configRouter/projectRouterと同じパターンに従う。...詳細なプロシージャ一覧は`research.md`の「ドメイン別チャンネルマッピング」セクションを参照。
+
+ **Implementation Notes（specRouter）**: specRouterにはhandlers.ts内の`registerSteeringHandlers()`が担当する4チャンネル（CHECK_STEERING_FILES → `spec.checkSteeringFiles`, GENERATE_VERIFICATION_MD → `spec.generateVerificationMd`, CHECK_RELEASE_MD → `spec.checkReleaseMd`, GENERATE_RELEASE_MD → `spec.generateReleaseMd`）も含まれる。これらはresearch.mdのspec routerマッピングテーブルに記載済みであり、Task 5.1のスコープ内で実装する。
```

#### tasks.md

**Issue(s) Addressed**: W1, W3

**Changes**:
- Task 9.1にelectron-trpc Subscription cleanup検証のサブステップを追加
- Task 11.4のApiClientインターフェース整理手順を具体化（メソッド差分確認ステップ追加）

**Diff Summary**:
```diff
  - `router.ts`のappRouterにeventsルーターを登録する
+   - electron-trpc SubscriptionのBrowserWindowクローズ時cleanup動作を検証する（observable内のunsubscribe関数が正しく呼ばれること、EventEmitterリスナーが解除されることをテストで確認）
  - _Requirements: 8.1, 8.2_
```

```diff
- - `src/shared/api/types.ts`のApiClientインターフェースをWebSocketApiClient用に整理する
+ - IpcApiClientとWebSocketApiClientのメソッドセット差分を確認し、ApiClientインターフェースからIpcApiClient固有メソッド（例: 同期メソッド`getProjectPath()`）を削除してWebSocketApiClient実装に合わせて整理する
```

---

_Fixes applied by document-review-reply command._
