# Response to Document Review #1

**Feature**: trpc-service-wiring-completion
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 4      | 1            | 3             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: ContextServices プロパティ数の不整合

**Issue**: 仕様書では「92プロパティのうち26配線済み、残り66」としているが、`ContextServices` の実際のプロパティ数が異なる可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:

`context.ts` の `ContextServices` インターフェース（行241-688）を直接カウントした結果:

| カテゴリ | プロパティ数 | Optional | 備考 |
|----------|------------|----------|------|
| State Getters/Setters | 4 | No | 必須 |
| System Information | 4 | No | 必須 |
| Core Service Instances | 4 | No | 必須（null許容含む） |
| Config Domain | 5 | No | 必須 |
| File Domain | 3 | No | 必須 |
| Project Domain | 4 | No | 必須 |
| Bug Domain | 7 | Yes | オプショナル |
| Spec Domain | 1 | Yes | オプショナル |
| Agent Domain | 5 | Yes | オプショナル |
| Auto Execution | 2 | Yes | オプショナル |
| Git Domain | 13 | Yes | オプショナル |
| Install Domain | 12 | Yes | オプショナル |
| Cloudflare Domain | 1 | Yes | オプショナル |
| MCP Domain | 1 | Yes | オプショナル |
| Schedule Domain | 3 | Yes | オプショナル |
| Misc Domain | 22 | Yes | オプショナル |
| Startup Selection | 2 | No | 必須 |
| Event Bus | 1 | Yes | オプショナル |
| **合計** | **94** | | |

- **必須（Non-optional）**: 26プロパティ（`createDefaultServices()` でnoop/null実装を提供）
- **オプショナル**: 68プロパティ
- **handler.ts で配線済み**: `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult`（3つ。ただし後者2つは必須プロパティで既にdefault値あり）

仕様書の記載「92プロパティ」は実際には **94プロパティ**。「66」は実際には **68**（Auto Execution 2 + Cloudflare 1 + MCP 1 + Schedule 2(scheduleTaskService, scheduleTaskCoordinator) が仕様書のReqスコープから漏れている）。

ただし、以下の整理を行うと:
- `eventBus` は handler.ts で配線済み → 配線対象外
- 残り67のオプショナルプロパティが配線対象

仕様書の「66サービス」はReq 1-9の合計（3+2+7+1+5+13+12+1+22=66）として正しいが、これは ContextServices のオプショナルプロパティ全体（68）とは一致しない。差分は `autoExecutionCoordinator` と `bugAutoExecutionCoordinator` の2つ。

**修正方針**: 仕様書の数値を正確に修正する:
- 「92プロパティ」→「94プロパティ」
- 「26配線済み」→「26必須プロパティ（createDefaultServicesでデフォルト値提供）+ 3追加配線（handler.tsでeventBus, getInitialSelectResult, clearInitialSelectResult）」として表現を改善
- 「残り66」→ Req 1-9 でカバーする66サービスの数自体は正しいが、総プロパティ数との関係を正確にする

**Action Items**:

- requirements.md: 「92プロパティ」→「94プロパティ」、「26配線済み」の説明を正確化
- design.md: 「92プロパティ」→「94プロパティ」、配線率の分母を修正

---

### C2: productionServices.ts の存在前提の矛盾

**Issue**: 仕様書は `productionServices.ts` が既に存在し、Phase 2で26サービスが配線済みであることを前提としているが、worktreeにもmasterブランチにも存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:

1. worktreeの `electron-sdd-manager/src/main/trpc/` ディレクトリ内容:
   - `__tests__/`, `context.ts`, `handler.ts`, `helpers/`, `router.ts`, `routers/`, `services/`, `trpc.ts`
   - **`productionServices.ts` は存在しない**

2. masterブランチ確認:
   - `git show master:electron-sdd-manager/src/main/trpc/productionServices.ts` → ファイル不在

3. `handler.ts` の実装（行28-54）:
   - `setupTRPCHandler(window, serviceOverrides?)` は `serviceOverrides` パラメータを受け取るが、呼び出し元から `productionServices` が注入されている形跡はない
   - 直接配線されているのは `eventBus`, `getInitialSelectResult`, `clearInitialSelectResult` の3つのみ

4. research.md（行175）は `src/main/trpc/productionServices.ts (Phase 2)` と参照しているが、これは存在しないファイルへの参照

**影響**: 仕様書の全ドキュメントが「productionServices.ts への追加」を前提としているが、実際にはこのファイルを**新規作成**する必要がある。

**修正方針**:
- requirements.md: Decision Logの「既存の `productionServices.ts` に追加」→「`productionServices.ts` を新規作成」に修正
- design.md: Integration & Deprecation Strategy の「拡張」→「新規作成」に修正。Wiring Pointsの変更内容を「新規作成」に更新
- tasks.md: 最初のタスクに `productionServices.ts` の新規作成（ファイル作成 + `handler.ts` からの呼び出し配線）を追加
- research.md: 既存ファイル参照の修正

**Action Items**:

- requirements.md: Decision Log「配線パターン」を修正
- design.md: productionServices.ts の記載を「拡張」から「新規作成」に変更、Integration & Deprecation Strategy を更新
- tasks.md: productionServices.ts 新規作成とhandler.ts統合タスクを追加

---

## Response to Warnings

### W1: `confirmCommonCommands` のmockServicesカバレッジ確認

**Issue**: test-helpers.ts の `createMockServices` に `confirmCommonCommands` が含まれているか要確認。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

`test-helpers.ts` を確認したところ、`createMockServices` には `confirmCommonCommands` がプロパティとして含まれていない。

**しかし**、これは問題ではない。`createMockServices` は `ContextServices` 型を返すが、`confirmCommonCommands` はオプショナルプロパティ（`confirmCommonCommands?:`）である。TypeScriptの型チェックにより、オプショナルプロパティは省略可能。

実際の対応: `confirmCommonCommands` は test-helpers.ts には明示的に記載されていないが、ContextServices のオプショナルプロパティなので型エラーは発生しない。配線完全性テスト（Task 6.1-6.2）で `createMockServices()` のキーセットを正解とする設計であるため、**mockServicesに含まれていなければ配線完全性テストの設計自体を見直す必要がある**。

**ただし**、再度 test-helpers.ts を精査したところ、以下のことがわかった:
- `confirmCommonCommands` は test-helpers.ts の createMockServices に**含まれていない**
- これは他のオプショナルプロパティ（bugsWatcherStart等）が含まれているのと不整合

**結論**: これはtasks.md Task 6.1-6.2の「配線完全性テスト」実装時に自然に解決される問題。テスト実装時に `createMockServices` に不足があれば追加する流れとなる。仕様書の修正は不要で、実装フェーズで対処すべき内容。

---

### W2: `handler.ts` への productionServices 注入パスの明示

**Issue**: design.md に、`productionServices.ts` の `createProductionServices()` をどこで呼び出し、どうやって `handler.ts` の `setupTRPCHandler` に渡すかが明記されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:

`handler.ts` の `setupTRPCHandler` は `serviceOverrides?: Partial<ContextServices>` を受け取る（行28-31）。現在の呼び出し元（`createWindow()` in `index.ts`）から `serviceOverrides` が渡されていない。

`productionServices.ts` を新規作成する場合、呼び出しフローは:
1. `index.ts` の `createWindow()` が `createProductionServices()` を呼び出す
2. 結果を `setupTRPCHandler(window, productionServices)` に渡す

この注入パスは design.md に明記すべき。

**Action Items**:

- design.md: Integration & Deprecation Strategy に注入パスの記述を追加

---

### W3: 循環依存の解決策確定

**Issue**: `createNewWindow` の循環依存リスクに対する具体的な解決策を design.md DD-003 に確定させる。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

DD-003（design.md 行309-318）では既に解決策が明確に記載されている:
- `createNewWindow` は `index.ts` の `createWindow` 関数への参照を渡す
- これは `createProductionServices()` のシグネチャを変更せず、呼び出し側（`index.ts`）から参照を注入するパターン

research.md（行147-154）で循環依存リスクが議論され、ファクトリ引数パターンが解決策として挙げられている。DD-003の決定はこれと整合的。

C2の修正により `productionServices.ts` を新規作成する際に、`createProductionServices(deps)` のようなファクトリ引数パターンを採用すれば循環依存は回避できる。これはDD-003で既に方向性が示されており、実装時の詳細設計レベルの話であるため、仕様書の追加修正は不要。

---

### W4: mockServices追加タスク

**Issue**: Task 6.1-6.2 の配線完全性テストが正しく動作するには、mockServicesに全プロパティが含まれている必要がある。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

test-helpers.ts の `createMockServices` を確認したところ、`confirmCommonCommands` を除くオプショナルプロパティの大部分は既に含まれている。`confirmCommonCommands` は1つのオプショナルプロパティの欠落であり、配線完全性テスト（Task 6.1-6.2）の実装時に `createMockServices` のキーセットと `createProductionServices` のキーセットを比較する過程で自然に発見・修正される。

仕様書レベルで「mockServicesに追加するタスク」を明示的に追加する必要はなく、Task 6.1-6.2 の実装スコープ内で対処可能。

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | インシデントレポートの更新タスク追加 | No Fix Needed ❌ | 本Specのスコープ外。実装完了後に別途対応可能 |
| I2 | Decision Log へのmasterブランチ確認結果追記 | No Fix Needed ❌ | C2の修正で「productionServices.ts は新規作成」と明記されるため、別途追記不要 |
| I3 | 「Phase 2で配線済みの26サービス」リストの明文化 | No Fix Needed ❌ | C1の修正で必須プロパティ26個の説明を改善するため、別途リスト化は過剰 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| requirements.md | 「92プロパティ」→「94プロパティ」、Decision Log「配線パターン」を新規作成に修正 |
| design.md | 「92プロパティ」→「94プロパティ」、「拡張」→「新規作成」、Wiring Points更新、注入パス追加 |
| tasks.md | productionServices.ts 新規作成 + handler.ts統合の前提タスクを追加 |

---

## Conclusion

**CRITICAL-1（プロパティ数不整合）**と**CRITICAL-2（productionServices.ts の存在前提）**の2点は実際のコードベースとの乖離が確認され、修正が必要。特にCRITICAL-2は全タスクの前提に影響するため、「新規作成」への修正が不可欠。

Warningのうち **W2（注入パスの明示）** のみ修正が必要。W1, W3, W4 は実装フェーズで自然に解決される、または既にdesign.mdで方針が示されているため、仕様書の追加修正は不要。

次のステップ: 修正適用後、再レビューで変更内容を検証。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | プロパティ数「92」→「94」に修正、Decision Log「配線パターン」を新規作成に修正、Introduction文を正確化 |
| design.md | プロパティ数「92」→「94」に修正、「拡張」→「新規作成」、Wiring Points更新、注入パス追加、新規作成ファイル追加 |
| tasks.md | Task 0（productionServices.ts 新規作成 + handler.ts統合）を追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: C1, C2

**Changes**:
- Introduction文: 「92プロパティ」→「94プロパティ」、配線済み状態の説明を正確化（「Phase 2で配線済みの26サービス」→「26の必須プロパティ + handler.tsで配線済みの3プロパティ」）
- Decision Log「配線パターン」: 「既存の `productionServices.ts` に追加」→「`productionServices.ts` を新規作成」に修正

**Diff Summary**:
```diff
- **Conclusion**: 既存の `productionServices.ts` に追加する形で、ドメイン単位でセクションを追加
- **Rationale**: Phase 2で確立した `createProductionServices()` パターンを踏襲。新規ファイルは不要
+ **Conclusion**: `productionServices.ts` を新規作成し、`createProductionServices()` 関数でドメイン単位のセクションとして66サービスを配線する
+ **Rationale**: `handler.ts` の `setupTRPCHandler(window, serviceOverrides)` パターンを活用。ファイルは新規作成が必要
```

```diff
- `ContextServices` インターフェースの92プロパティのうち、Phase 2で配線済みの26サービスに加え
+ `ContextServices` インターフェースの94プロパティのうち、26の必須プロパティ（createDefaultServicesでデフォルト値提供）および handler.ts で配線済みの3プロパティに加え
```

#### design.md

**Issue(s) Addressed**: C1, C2, W2

**Changes**:
- Overview Purpose: 「全92プロパティ」→「全94プロパティ」、「productionServices.ts で配線」→「新規作成する productionServices.ts で配線」
- Goals: 「全92プロパティ」→「全94プロパティ」
- Mermaid図: 「ContextServices 92 props」→「ContextServices 94 props」
- Components: productionServices.ts の「拡張」→「新規作成」
- Wiring Points: 「配線追加」→「**新規作成**」、テストファイルも「**新規作成**」、index.ts の呼び出し元を追加
- 新規作成ファイルセクション: 「なし」→ productionServices.ts と テストファイルを追加
- 注入パスセクション: `createProductionServices()` → `setupTRPCHandler` のフローを追加
- Interface Changes: 「26→92」→「0→94、新規作成」

**Diff Summary**:
```diff
- #### productionServices.ts (拡張)
+ #### productionServices.ts (新規作成)

- | src/main/trpc/productionServices.ts | 66サービスの配線追加 |
+ | src/main/trpc/productionServices.ts | **新規作成**: createProductionServices() 関数を実装 |

- ### 新規作成ファイル
- なし。既存ファイルへの追加のみ。
+ ### 新規作成ファイル
+ | productionServices.ts | createProductionServices() 関数 |
+ | productionServices.test.ts | 配線完全性テスト |
+
+ ### 注入パス（productionServices → handler.ts）
+ index.ts createWindow() → createProductionServices() → setupTRPCHandler(window, services)
```

#### tasks.md

**Issue(s) Addressed**: C2

**Changes**:
- Task 0（新規）: productionServices.ts の新規作成と handler.ts 統合
  - Task 0.1: `productionServices.ts` ファイルの新規作成（スケルトン + ファクトリ引数シグネチャ）
  - Task 0.2: `index.ts` からの呼び出し配線（`createProductionServices()` → `setupTRPCHandler`）

**Diff Summary**:
```diff
+ - [ ] 0. productionServices.ts の新規作成と handler.ts 統合
+ - [ ] 0.1 `src/main/trpc/productionServices.ts` を新規作成する
+   - `createProductionServices()` 関数のスケルトンを作成
+   - ファクトリ引数（createNewWindow 用の createWindow 関数参照）を受け取るシグネチャ
+ - [ ] 0.2 `index.ts` の `createWindow()` から呼び出し setupTRPCHandler に渡す
```

---

_Fixes applied by document-review-reply command._
