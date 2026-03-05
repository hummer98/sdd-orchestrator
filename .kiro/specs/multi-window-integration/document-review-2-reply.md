# Response to Document Review #2

**Feature**: multi-window-integration
**Review Date**: 2026-02-26
**Reply Date**: 2026-02-26

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 4      | 4            | 0             | 0                |

---

## Response to Warnings

### W2-1: EventBusイベント実態との不一致

**Issue**: Task 6.3の22プロジェクトスコープイベントチェックリストのうち3件（METRICS_UPDATED、BUG_AUTO_EXECUTION_EXECUTE_PHASE、GIT_CHANGES_DETECTED）がプロダクションコードでEventBus.emitされていない。Agent系イベントの発火元ファイル（projectSetup.ts）もタスク説明に不足。

**Judgment**: **Fix Required** ✅

**Evidence**:
ソースコード調査により、レビュー指摘を全面的に確認:

1. **METRICS_UPDATED**: `eventBus.ts:64`に定義あり、`events.ts:318-320`にSubscriptionあり。しかしプロダクションコードにemit箇所が**存在しない**。`MetricsService`はメトリクスを記録するがEventBusへのemitは行わない。テストコード（`events-router.test.ts:1536`）でのみ手動emitされている。

2. **BUG_AUTO_EXECUTION_EXECUTE_PHASE**: `eventBus.ts:46`に定義あり、`events.ts:258-260`にSubscriptionあり。BugAutoExecutionCoordinatorは他のイベント（state-changed、phase-started等）はemitするが、EXECUTE_PHASEはemitしない。テストコード（`events-router.test.ts:1138`）でのみ使用。

3. **GIT_CHANGES_DETECTED**: `eventBus.ts:54`に定義あり、`events.ts:286-288`にSubscriptionあり。しかし実際の発火は`webSocketHandler.ts:536-541`でWebSocket `broadcast()`経由であり、EventBus.emitではない。EventBus経由のtRPC Subscriptionには現状到達しない。

4. **Agent系イベント**: `projectSetup.ts`の`registerEventCallbacks()`（line 742-797）で5件のAgent系イベント（AGENT_OUTPUT, AGENT_STATUS_CHANGE, AGENT_LOG, AGENT_EXIT_ERROR, AGENT_START_ERROR）がEventBus.emitされていることを確認。タスク説明では発火元として「Auto-Execution EventBus bridge」のみ記載されており、Agent系イベントの発火元記述が不足。

**Action Items**:

- tasks.md Task 6.3に以下を追記:
  1. METRICS_UPDATED、BUG_AUTO_EXECUTION_EXECUTE_PHASEはプロダクションコードにemit箇所が存在しないため、実装時にemit追加が必要か判断するステップを追加
  2. GIT_CHANGES_DETECTEDはWebSocket broadcast経由のため、EventBus emitの追加要否を判断するステップを追加
  3. Agent系イベント5件の発火元が`projectSetup.ts`の`registerEventCallbacks()`内であることを明記

---

### W2-2: selectProject windowIdバインディング未記述

**Issue**: 「Router側コード変更不要」の実現メカニズム（WindowContextFactoryでのselectProjectクロージャバインディング）がdesign.mdおよびtasks.mdに明示されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md line 659-663: `selectProject(projectPath, windowId?)`への変更と「Router側のコード変更は不要」の記述あり
- しかし「なぜ不要か」の実装メカニズム（WindowContextFactory内でwindowIdバインド済みクロージャを生成するパターン）が明記されていない
- 現在のproductionServices.ts line 185: `selectProject: selectProject as unknown as ContextServices['selectProject']` -- 直接参照であり、クロージャではない
- Task 2.1のcreateWindowContextFactory説明にも、selectProjectのバインディングについて言及がない
- 実装者がこのパターンを理解できず、Router側にwindowId引き渡しを追加するリスクがある

**Action Items**:

- design.md WindowContextFactory Implementation Notesに、per-windowプロパティのクロージャバインディングパターンを明記
- tasks.md Task 2.1にselectProject等のper-windowプロパティバインディングの説明を追加

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I2-1 | ContextServices.windowId未反映 | Fix Required ✅ | design.md PerWindowContext(line 291-295)にwindowIdあるが、ContextServicesインターフェース定義に未反映。Task 2.3で追加予定だが設計文書に記載すべき |
| I2-2 | createTestContextWithWindow暗黙的 | Fix Required ✅ | design.md Test 1 Prerequisites「必要」vs Task 9.1「必要な場合は作成」の温度差を解消。具体化すべき |
| I2-3 | Coverage Matrix 5.2 Task Type | Fix Required ✅ | Task 1.5は既存WindowManagerテストの検証タスクであり、Implementation→Test（既存実装の検証）が正確 |
| I2-4 | Remote UI WebSocket挙動変化 | Fix Required ✅ | DD-004でRemote UIフィルタは別レイヤーと言及あるが、実際の挙動変化（全プロジェクトイベント受信）が未ドキュメント |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| tasks.md | W2-1: Task 6.3にemit実態の注記追加。W2-2: Task 2.1にバインディングパターン追加。I2-2: Task 9.1のヘルパー記述具体化。I2-3: Coverage Matrix 5.2のTask Type修正 |
| design.md | W2-2: WindowContextFactory Implementation Notesにクロージャバインディングパターン追記。I2-1: ContextServicesへのwindowId追加を反映。I2-4: DD-004 Consequencesに挙動変化注記追加 |

---

## Conclusion

Review #2の全6件（Warning 2件 + Info 4件）すべてがソースコード調査により妥当と確認された。特にW2-1のEventBus emit実態の不一致は、実装フェーズでの混乱を防ぐために重要な指摘。`--autofix`により修正を適用する。

---

## Applied Fixes

**Applied Date**: 2026-02-26
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | W2-1: Task 6.3にemit実態の注記追加、発火元ファイル詳細化。W2-2: Task 2.1にクロージャバインディングパターン追加。I2-2: Task 9.1ヘルパー記述具体化。I2-3: Coverage Matrix 5.2 Task Type修正 |
| design.md | W2-2: WindowContextFactory Implementation Notesにクロージャバインディングパターン追記。I2-1: PostconditionsにContextServices.windowId追加を反映。I2-4: DD-004 ConsequencesにWebSocket挙動変化注記追加 |

### Details

#### tasks.md

**Issue(s) Addressed**: W2-1, W2-2, I2-2, I2-3

**Changes**:
- Task 6.3: 発火元ファイルの記述を詳細化（projectSetup.ts内のregisterEventCallbacks/registerAutoExecutionEvents/registerBugAutoExecutionEventsを個別記載）。emit実態が存在しない3イベント（METRICS_UPDATED、BUG_AUTO_EXECUTION_EXECUTE_PHASE、GIT_CHANGES_DETECTED）の対応ステップを追加
- Task 2.1: per-windowプロパティのクロージャバインディングパターンの説明を追加（`selectProject: (path) => selectProject(path, windowId)`の明記）
- Task 9.1: 「必要な場合は作成」→「作成する（既存createTestContextをwindowId対応に拡張）」に具体化
- Coverage Matrix 5.2: Task Type「Implementation」→「Test（既存実装の検証）」に修正

**Diff Summary**:
```diff
- projectSetup.ts: Auto-Execution EventBus bridgeの各emitにprojectPath追加
+ projectSetup.ts `registerEventCallbacks()`: Agent系イベント5件のemitにprojectPath追加
+ projectSetup.ts `registerAutoExecutionEvents()`: Auto-Execution系イベント5件のemitにprojectPath追加
+ projectSetup.ts `registerBugAutoExecutionEvents()`: Bug Auto-Execution系イベント4件のemitにprojectPath追加
+ **emit実態が存在しないイベントの対応**: (3件の判断ステップ追加)
```

```diff
  - `getSpecManagerService()`がリクエスト元ウィンドウのSpecManagerServiceインスタンスを返すようにする
+ - **per-windowプロパティのクロージャバインディング**: ContextServicesの`selectProject`等のper-windowプロパティは、WindowContextFactory内でwindowIdバインド済みクロージャとして生成する
```

```diff
- テスト用ヘルパー`createTestContextWithWindow(windowId)`が必要な場合は作成
+ テスト用ヘルパー`createTestContextWithWindow(windowId)`を作成する（既存`createTestContext(overrides)`をwindowId対応に拡張）
```

```diff
- | 5.2 | 最小化ウィンドウの復元フォーカス | 1.5 | Implementation |
+ | 5.2 | 最小化ウィンドウの復元フォーカス | 1.5 | Test（既存実装の検証） |
```

#### design.md

**Issue(s) Addressed**: W2-2, I2-1, I2-4

**Changes**:
- WindowContextFactory Implementation Notes: per-windowプロパティのクロージャバインディングパターンを追記（selectProjectの例、getCurrentProjectPath等も同様）
- WindowContextFactory Postconditions: ContextServicesに`windowId: number`フィールドが含まれることを明記
- DD-004 Consequences: Remote UIのWebSocketハンドラが全プロジェクトイベントを受信する挙動変化と実用上の影響なしを追記

**Diff Summary**:
```diff
  - Risks: electron-trpcの`createContext`に渡される`event`が...確認済み
+ - **Per-windowプロパティのクロージャバインディング**: ContextServicesの`selectProject`等のper-windowプロパティは、WindowContextFactory内でwindowIdバインド済みクロージャとして生成する。
```

```diff
- Postconditions: 返されるContextのservicesは、リクエスト元ウィンドウのprojectPathとサービスインスタンスを反映
+ Postconditions: 返されるContextのservicesは、リクエスト元ウィンドウのprojectPathとサービスインスタンスを反映。ContextServicesに`windowId: number`フィールドが含まれる
```

```diff
- | Consequences | events.tsの各Subscriptionに3-5行のフィルタロジック追加。イベント発火側ではprojectPathメタデータの付与が必要 |
+ | Consequences | events.tsの各Subscriptionに3-5行のフィルタロジック追加。イベント発火側ではprojectPathメタデータの付与が必要。なお、Remote UIのWebSocketハンドラは本specのスコープ外であり...実用上影響なし |
```

---

_Fixes applied by document-review-reply command._
