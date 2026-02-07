# Response to Document Review #2

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C1: 「66のオプショナルサービス」の分類が不正確

**Issue**: requirements.md Introductionが「残り66のオプショナルサービス」と記載しているが、Req 1-9の66サービス中5つ（File 3 + Project 2）はrequiredプロパティ。さらに、6つのoptionalサービス（`autoExecutionCoordinator`, `bugAutoExecutionCoordinator`, `cloudflareService`, `mcpServerService`, `scheduleTaskService`, `scheduleTaskCoordinator`）がReq 1-9でカバーされていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

`context.ts` を直接確認した結果:
- `listProjectFiles` (L314): `?` なし → **required**
- `readProjectFile` (L323): `?` なし → **required**
- `writeProjectFile` (L326): `?` なし → **required**
- `showOpenDialog` (L336): `?` なし → **required**
- `createNewWindow` (L339): `?` なし → **required**

これら5つは `createDefaultServices()` (L703-741) でnoop実装が提供されているため、技術的には「未配線」ではなく「プロダクション実装への差し替え」だが、仕様書の「オプショナルサービス」という表現は不正確。

6つの未カバーoptionalサービスについても、`createMockServices()` (test-helpers.ts L167-246) に全て含まれている。配線完全性テスト（Req 10）が `createMockServices()` キーセットとの一致を検証する設計のため、`productionServices.ts` にもこれら6つを含める必要がある。

**対応方針**:
1. Introductionの「66のオプショナルサービス」→ 正確な表現に修正
2. 6つの未カバーoptionalサービスをスコープに含め、Req 9（Misc）に追加
3. 配線対象数を66→72に更新（既存66 + 未カバー6）
4. design.md、tasks.mdの対応箇所も更新

**Action Items**:
- requirements.md: Introductionの数値と表現を修正、Req 9にautoExecution/Cloudflare/MCP/Schedule追加サービス6件を追記
- design.md: Overview/Goalsの「66」を「72」に更新、Requirements Traceabilityに6件追加
- tasks.md: Task 5にautoExecution/Cloudflare/MCP/Schedule配線サブタスクを追加

---

## Response to Warnings

### W1: 配線完全性テストの検証対象範囲の確定

**Issue**: `createProductionServices()` が返すべきキーセット（全94? optional 68のみ? Req 1-9の66?）がdesign.mdで不明確。Req 10.1は「全プロパティ名が一致」だが design.md は「66プロパティを追加」。

**Judgment**: **Fix Required** ✅

**Evidence**:

design.md の Testing Strategy (L276-277) は「productionServices.ts のキーセットが ContextServices の全プロパティを網羅」と記載。一方、Components の Intent (L166) は「66プロパティを追加」と記載。この矛盾がある。

`createProductionServices()` は `Partial<ContextServices>` を返すため、テストの正解は `createMockServices()` のキーセット（全94プロパティ含む）とすべき。ただし、`createProductionServices()` が返す範囲は配線対象の72（修正後）+ handler.tsで別途注入される3（eventBus, getInitialSelectResult, clearInitialSelectResult）を除外するか否か。

**対応方針**:
- design.md に「`createProductionServices()` は配線対象72プロパティを返す。handler.ts で `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` が追加マージされる。配線完全性テストは最終的にcontextに注入される全キーセットを検証する」と明確化
- 「66プロパティ」の数値を「72プロパティ」に修正

**Action Items**:
- design.md: Components Intent、Testing Strategyセクションに検証範囲の明確な定義を追記、数値修正

### W2: 6つの未カバーoptionalサービスの配線タスク追加

**Issue**: `autoExecutionCoordinator`, `bugAutoExecutionCoordinator`, `cloudflareService`, `mcpServerService`, `scheduleTaskService`, `scheduleTaskCoordinator` がReq 1-9に含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

`createMockServices()` (test-helpers.ts) で以下が確認済み:
- `autoExecutionCoordinator` (L167-175): モック定義あり
- `bugAutoExecutionCoordinator` (L176-183): モック定義あり
- `cloudflareService` (L201-225): モック定義あり
- `mcpServerService` (L228-232): モック定義あり
- `scheduleTaskService` (L235-241): モック定義あり
- `scheduleTaskCoordinator` (L242-246): モック定義あり

配線完全性テスト（Task 6.1-6.2）が `createMockServices()` のキーセットをベースラインにするため、これら6サービスも `productionServices.ts` に配線する必要がある。

**Action Items**:
- requirements.md: Req 9に6サービスを追加（Miscカテゴリの拡張）
- tasks.md: Task 5に配線サブタスクを追加
- C1の修正と統合して対応

### W3: `confirmCommonCommands` のcreateMockServicesへの追加

**Issue**: test-helpers.ts の `createMockServices` に `confirmCommonCommands` が含まれていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

`test-helpers.ts` (L150-164) を確認。Bug Domain Services の後、Agent Domain Services の前にSpec Domain Servicesセクションが**存在しない**。`confirmCommonCommands` のモック定義が欠落している。

これは実装フェーズで `createMockServices` に追加が必要であり、仕様書上でも認識を明記すべき。

**Action Items**:
- tasks.md: Task 6（テスト実装）の前提条件として `createMockServices` への `confirmCommonCommands` 追加を明記

---

## Response to Info (Low Priority)

| #    | Issue                              | Judgment      | Reason                                                                                            |
| ---- | ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| I1   | File/Projectの「配線」と「上書き」の区別 | No Fix Needed | 技術的に正確だが、仕様書の目的は「配線完了」の達成であり、required/optionalの区別は実装に影響しない。Introductionの数値修正（C1）で十分 |
| I2   | research.mdの未カバーサービス調査追加    | No Fix Needed | 6つのサービスは既にtest-helpers.tsにモック実装が存在し、実装元は明確。research.mdへの追記は実装フェーズで必要に応じて対応可能 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| requirements.md | Introduction文の数値・表現修正（「66のオプショナルサービス」→「72サービス」）、Req 9にautoExecution/Cloudflare/MCP/Schedule 6サービス追加、Decision Log配線パターンの数値修正 |
| design.md | Overview/Goals/Components Intentの「66」→「72」修正、Requirements Traceabilityに6件追加、Testing Strategyの検証範囲明確化 |
| tasks.md | Task 5にautoExecution/Cloudflare/MCP/Schedule配線サブタスク追加、Task 6の前提条件にconfirmCommonCommandsのmock追加を明記、Requirements Coverage Matrix更新 |

---

## Conclusion

Critical 1件、Warning 3件の全てが実コード検証により正当な指摘と確認された。主な問題は:

1. 配線対象の正確な分類とスコープ（「66オプショナル」→「72サービス（5 required差し替え + 67 optional配線）」）
2. 6つの未カバーoptionalサービスの追加
3. 配線完全性テストの検証範囲の明確化
4. `confirmCommonCommands` のmock追加の認識

Info 2件は現状維持で問題なし。`--autofix` により修正を適用する。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Introduction数値・表現修正、Decision Log数値修正、Req 9に6サービス追加、Out of Scope数値修正 |
| design.md | Overview/Goals/Components Intent/Testing Strategy/DD-001の「66」→「72」修正、Requirements Traceability 6件追加、Interface Changes数値修正 |
| tasks.md | Task 5.4（追加6サービス配線）新規追加、Task 6.1の前提条件にconfirmCommonCommands mock追加明記、Requirements Coverage Matrix 6件追加 |
| spec.json | roundDetails[1]のstatus/fixStatus/fixRequired更新 |

### Details

#### requirements.md

**Issue(s) Addressed**: C1, W2

**Changes**:
- Introduction: 「残り66のオプショナルサービス」→ 72サービスの正確な内訳記載（required差し替え5件 + optional配線67件）
- Decision Log「スコープ: 全66サービス一括配線」→「全72サービス一括配線」
- Decision Log「配線パターン」内の66→72修正
- Req 9タイトル: 「Misc ドメインサービス配線（22サービス）」→「Misc・AutoExecution・Cloudflare・MCP・Schedule 追加サービス配線（28サービス）」
- Req 9に Acceptance Criteria 9.23-9.28 追加（6つの未カバーoptionalサービス）
- Out of Scope: 「既存の66サービス」→「既存の72サービス」

```diff
- 残り66のオプショナルサービスを新規作成する `productionServices.ts` に配線する
+ 残り72サービスを新規作成する `productionServices.ts` に配線する。72サービスにはrequiredプロパティのプロダクション実装差し替え5件（File 3 + Project 2）とoptionalプロパティの配線67件を含む

- ### スコープ: 全66サービス一括配線
+ ### スコープ: 全72サービス一括配線

- ### Requirement 9: Misc ドメインサービス配線（22サービス）
+ ### Requirement 9: Misc・AutoExecution・Cloudflare・MCP・Schedule 追加サービス配線（28サービス）
+ 23-28. autoExecutionCoordinator, bugAutoExecutionCoordinator, cloudflareService, mcpServerService, scheduleTaskService, scheduleTaskCoordinator
```

#### design.md

**Issue(s) Addressed**: C1, W1, W2

**Changes**:
- Overview Purpose/Impact/Goals: 66→72の数値修正
- Components表: 66→72
- Components Intent: 72プロパティの検証範囲明確化（handler.ts注入分との関係を記載）
- Responsibilities: 66→72
- Testing Strategy: 配線完全性テストのベースライン説明を明確化
- DD-001: 66→72
- Integration & Deprecation: 66→72
- Interface Changes: 0→94→0→72（新規作成）
- Requirements Traceability: 9.23-9.28の6件追加

```diff
- 66サービスの配線追加
+ 72サービスの配線追加

- 66プロパティを追加
+ 72プロパティを返し、handler.tsでeventBus等が追加マージされる。配線完全性テストはcreateMockServices()のキーセットを検証対象とする

+ | 9.23-9.28 | autoExecution/Cloudflare/MCP/Schedule 6サービス | productionServices.ts | シングルトン参照 |
```

#### tasks.md

**Issue(s) Addressed**: W2, W3

**Changes**:
- Task 5.4 新規追加: AutoExecution・Cloudflare・MCP・Schedule追加6サービスの配線
- Task 6.1: 前提条件として `createMockServices()` への `confirmCommonCommands` モック追加を明記
- Requirements Coverage Matrix: 9.23-9.28の6件追加

```diff
+ - [ ] 5.4 AutoExecution・Cloudflare・MCP・Schedule追加6サービスを配線する
+   - autoExecutionCoordinator, bugAutoExecutionCoordinator, cloudflareService, mcpServerService, scheduleTaskService, scheduleTaskCoordinator

  - [ ] 6.1 productionServicesのキーセットとContextServicesプロパティの一致を検証するテストを追加する
+   - **前提**: `createMockServices()` (test-helpers.ts) に `confirmCommonCommands` のモック定義を追加する（現在欠落）

+ | 9.23-9.28 | autoExecution/Cloudflare/MCP/Schedule配線 | 5.4 | Feature |
```

---

_Fixes applied by document-review-reply command._
