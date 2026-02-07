# Response to Document Review #3

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W1: handler.tsの`serviceOverrides`マージ順序と`eventBus`の配線重複リスク

**Issue**: `handler.ts` (L38-43) では `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` が先にセットされ、その後に `...serviceOverrides` でスプレッドされるため、`createProductionServices()` がこれら3プロパティを返す場合にhandler.ts側の値が上書きされるリスクがある。design.mdにこの意図を明記すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:
`handler.ts` L38-43の実コード:
```typescript
const mergedOverrides: Partial<ContextServices> = {
  eventBus: getGlobalEventBus(),
  getInitialSelectResult: getInitialSelectResult as ContextServices['getInitialSelectResult'],
  clearInitialSelectResult,
  ...serviceOverrides,  // productionServicesが後からスプレッド → 上書きリスク
};
```

レビュー指摘は正確。`createProductionServices()` が `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を含んだ場合、handler.ts側の `getGlobalEventBus()` や `getInitialSelectResult` / `clearInitialSelectResult` が上書きされ、EventBusのSubscriptionやPullモデルの起動時プロジェクト選択キャッシュが動作しなくなる。

design.mdに「`createProductionServices()` はこれら3プロパティを含めない」ことを明記する必要がある。

**Action Items**:
- design.md の Components Intent（productionServices.ts セクション）に「`createProductionServices()` は `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を返さない。これら3プロパティは `handler.ts` が直接注入・管理する」を追記
- design.md の Integration & Deprecation Strategy の注入パス説明に注意事項を追記

---

### W2: design.md の配線完全性テスト記述の曖昧さ（精緻化必要）

**Issue**: design.md Testing Strategy の検証条件が曖昧。`createProductionServices()` が返す72キーと、handler.ts注入分3件の関係、`createMockServices()` との比較条件が明確でない。

**Judgment**: **Fix Required** ✅

**Evidence**:
実コード検証結果:
- `ContextServices`: 94プロパティ（required 26 + optional 68）
- `createMockServices()`: 93プロパティ（`confirmCommonCommands` 欠落 — Task 6.1の前提条件で追加予定）
- `createDefaultServices()`: 26プロパティ（required のみ、全てnoop/null）
- handler.ts注入: `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` = 3件

design.md Testing Strategy L280-281 は「`productionServices.ts` のキーセット + handler.ts注入分3件の合計が ContextServices の全94プロパティを網羅」と記載しているが、以下の精緻化が必要:
1. `createProductionServices()` は72キーを返す（handler.ts注入分3件は含まない）
2. テスト検証式: `Object.keys(createProductionServices())` ⊇ `Object.keys(createMockServices()) \ {eventBus, getInitialSelectResult, clearInitialSelectResult}`
3. `createMockServices()` にまず `confirmCommonCommands` を追加する（前提条件: 93 → 94キー）

**Action Items**:
- design.md Testing Strategy に配線完全性テストの検証式を精緻化して追記
- テスト対象の明確な定義（productionServicesが返す72キーにはhandler.ts注入分3件を含まない）を追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | `createMockServices()` への `confirmCommonCommands` 追加 | No Fix Needed ❌ | Round 2 W3で認識済み、Task 6.1の前提条件に既に明記。実装フェーズで対応 |
| I2 | handler.ts既存配線19件の説明強化 | No Fix Needed ❌ | requirements.md Introductionの「22プロパティ」記載は概算として十分。配線完全性テストの設計に直接影響しない。実装時にテストが検証結果で正確な数値を確認可能 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | W1: productionServices.tsのIntentに「eventBus/getInitialSelectResult/clearInitialSelectResultを返さない」を明記 |
| design.md | W2: Testing Strategyの検証式を精緻化（handler.ts注入3件の除外、confirmCommonCommands前提条件を明記） |

---

## Conclusion

Round 3のWarning 2件はいずれも正当な指摘であり、design.mdの記述精緻化が必要。Critical指摘はなく、仕様全体の整合性は高い。

修正は全てdesign.mdの記述精緻化のみ（ロジック変更なし）であり、`--autofix`で即時適用可能。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | W1: productionServices.ts Intentに「eventBus/getInitialSelectResult/clearInitialSelectResultを返さない」制約を明記 |
| design.md | W1: Integration & Deprecation Strategyの注入パスにマージ順序の注意事項を追記 |
| design.md | W2: Testing Strategyの検証式を精緻化（handler.ts注入3件の除外、confirmCommonCommands前提条件、テスト検証式を明記） |

### Details

#### design.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- Components Intent (productionServices.ts): `createProductionServices()` が `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を返さない制約と、handler.tsのマージ順序上の上書きリスクを明記
- Integration & Deprecation Strategy: 注入パス説明の直後に、handler.tsのマージ順序に関する注意事項を追記
- Testing Strategy: 配線完全性テストの検証式を `Object.keys(createProductionServices())` ⊇ `Object.keys(createMockServices()) \ {eventBus, getInitialSelectResult, clearInitialSelectResult}` として精緻化。`confirmCommonCommands` の前提条件（93→94キー）を明記。Mock一致性テストの差分除外対象を明確化

**Diff Summary**:
```diff
- | Intent | `productionServices.ts` を新規作成し、72サービスの配線を実装して...配線完全性テストは最終的にcontextに注入される全キーセット（= `createMockServices()` のキーセット）を検証対象とする |
+ | Intent | ...`createProductionServices()` は `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` を返さない。これら3プロパティは `handler.ts` が直接注入・管理する（`handler.ts` のマージ順序上、`serviceOverrides` が後からスプレッドされるため、含めると上書きリスクがある）。配線完全性テストは最終的にcontextに注入される全キーセット（= `createMockServices()` のキーセット）を検証対象とする |
```

```diff
  `createProductionServices()` は `index.ts` の `createWindow()` 内で呼び出され...
+ **注意**: `handler.ts` のマージ順序は `{eventBus, getInitialSelectResult, clearInitialSelectResult, ...serviceOverrides}` であるため、`serviceOverrides`（= `createProductionServices()` の返却値）がこれら3プロパティを含むとhandler.ts側の値が上書きされる。`createProductionServices()` はこれら3プロパティを返さないこと。
```

```diff
- 1. **配線完全性テスト**: `productionServices.ts` のキーセット + handler.ts注入分3件の合計が `ContextServices` の全94プロパティを網羅していることを検証。`createMockServices()` のキーセットをベースラインとして使用する
- 2. **Mock一致性テスト**: `createMockServices()` のキーセットと `productionServices.ts` のキーセットが一致することを検証（handler.ts注入分の差異は許容）
+ 1. **配線完全性テスト**: `createProductionServices()` は72プロパティを返す（handler.ts注入分の `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` は含まない）。テスト検証式: `Object.keys(createProductionServices())` ⊇ `Object.keys(createMockServices()) \ {eventBus, getInitialSelectResult, clearInitialSelectResult}`。**前提条件**: `createMockServices()` に `confirmCommonCommands` のモック定義を追加すること（現在93キー → 追加後94キー）。
+ 2. **Mock一致性テスト**: `createMockServices()` のキーセットからhandler.ts注入分3件（`eventBus`, `getInitialSelectResult`, `clearInitialSelectResult`）を除いた集合と、`createProductionServices()` のキーセットが一致することを検証
```

---

_Fixes applied by document-review-reply command._
