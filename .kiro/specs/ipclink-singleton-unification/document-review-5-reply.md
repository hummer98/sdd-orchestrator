# Response to Document Review #5

**Feature**: ipclink-singleton-unification
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 3      | 2            | 1             | 0                |
| Info     | 2      | 1            | 1             | 0                |

---

## Response to Critical Issues

### C1: `createTRPCClientProxy` vs `createTRPCProxyClient` の API 名混同

**Issue**: design.md と research.md で使用される `createTRPCClientProxy` と、現行コードの `createTRPCProxyClient` が異なる API であり、実装時に混同するリスクがある。2つの API の区別を design.md に明記し、tasks.md の Verify 項目に除去/存在確認を追加すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:
現行コード `vanillaClient.ts` で確認:
```typescript
import { createTRPCProxyClient } from '@trpc/client';  // line 14
vanillaClient = createTRPCProxyClient<AppRouter>({       // line 28
```

research.md (line 41-44) で確認済み:
- `createTRPCClientProxy(client)`: 既存 `TRPCClient` をラップ → **新設計で使用する API**
- `createTRPCProxyClient(opts)`: opts から新規 client + proxy 生成 → **現行コードで使用中、除去対象**

design.md の意図は正しい（`createTRPCClientProxy` で既存 client をラップ）が、2つの API 名が非常に類似しているため、明確な区別の追記はレビュー指摘通り有効。

**Action Items**:

- design.md の DD-001 に `createTRPCClientProxy`（ラップ用）と `createTRPCProxyClient`（新規生成用、除去対象）の明確な区別を追記
- tasks.md 1.1 の Verify 項目に `createTRPCProxyClient` 除去確認と `createTRPCClientProxy` 存在確認を追加

---

## Response to Warnings

### W1: requirements.md の「95ファイル」vs design.md の「93ファイル」の微差

**Issue**: requirements.md Decision Log に「95ファイル」、design.md に「93ファイル」と記載されており数値が異なる。

**Judgment**: **Fix Required** ✅

**Evidence**:
- requirements.md Decision Log: 「95ファイルが `getVanillaClient()` を参照」
- design.md: 「93 ファイルが `getVanillaClient()` を使用」
- ソースコード grep で 93 ファイルが正確な数値

requirements.md の Decision Log は初期調査時の概算だが、design フェーズでの正確な検証後は統一すべき。実装への影響はないが、文書間の一貫性のために修正する。

**Action Items**:

- requirements.md Decision Log の「95ファイル」を「約93ファイル」に修正

### W2: tasks.md Task 1.1 の Verify 項目が不完全

**Issue**: Task 1.1 の Verify 項目に `createTRPCProxyClient` の除去確認が含まれていない。

**Judgment**: **Fix Required** ✅（CRITICAL-1 の一部として対応）

**Evidence**:
tasks.md Task 1.1 の現行 Verify:
```
_Verify: Grep "ipcLink" in vanillaClient.ts expects 0 matches_
```

`ipcLink` 除去の確認はあるが、`createTRPCProxyClient`（新規生成 API）の除去確認と `createTRPCClientProxy`（ラップ API）の存在確認がない。CRITICAL-1 で指摘された API 名混同リスクを考慮すると、Verify 項目の追加は妥当。

**Action Items**:

- tasks.md 1.1 の Verify 項目に以下を追加:
  - `Grep "createTRPCProxyClient" in vanillaClient.ts expects 0 matches`
  - `Grep "createTRPCClientProxy" in vanillaClient.ts expects 1+ matches`

### W3: console-message level mapping のテスト未定義

**Issue**: console-message level mapping の検証テストが tasks.md に含まれていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
レビュー自身が認めている通り:
1. `main/index.ts` の `console-message` リスナーは Electron Main process の `webContents.on()` イベント処理であり、ユニットテストでの直接検証は困難
2. requirements.md の Out of Scope に「E2E テストの追加・修正」が明示されている
3. level mapping の実装は `switch` または `map` による3-4行の trivial なコードであり、テストの必要性は低い
4. design.md Testing Strategy は vanillaClient/provider の統合テスト（本仕様のコアロジック）に集中しており、適切なスコープ判断

Out of Scope 制約下で console-message の level mapping テストを追加する必要はない。実装時の手動検証（`task electron:start` でのログ確認）で十分。

---

## Response to Info (Low Priority)

| #    | Issue                                            | Judgment      | Reason                                                        |
| ---- | ------------------------------------------------ | ------------- | ------------------------------------------------------------- |
| I1   | Deferred proxy の query/mutate 呼び出し時の挙動未定義 | Fix Required  | 防御的プログラミングとして design.md Error Handling に明記すべき |
| I2   | Task 4.2 の logging.md 更新対象セクション粒度       | No Fix Needed | Task 4.2 の記述は requirements.md 4.3 AC を参照すれば十分      |

### I1: Deferred proxy の query/mutate 呼び出し時の挙動未定義

**Issue**: React mount 前に query/mutate が呼ばれた場合のエラーハンドリングが design.md に未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md DD-002 で「subscription のみキューイング対象」「query/mutate は React mount 後に呼ばれる前提」と記述
- research.md (line 70-71) で `main.tsx` の mount 前呼び出しが subscribe のみであることを確認済み
- しかし design.md Error Handling 表にこのケースの明示的な記述がない

実装者が deferred proxy を構築する際のガイダンスとして、query/mutate が mount 前に呼ばれた場合の挙動を Error Handling に明記する。

**Action Items**:

- design.md Error Handling 表に「Deferred proxy への query/mutate 呼び出し（mount 前）」のエントリを追加

### I2: Task 4.2 の logging.md 更新対象セクション粒度

**Issue**: Task 4.2 に logging.md の更新対象セクションの具体的な列挙が不足している。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
- Task 4.2 は「consoleHook 廃止と `console-message` native 方式への統一を反映する」と記述
- requirements.md 4.3 AC が「consoleHook 廃止と console-message native 方式を反映した記述に更新」と包括的に指定
- Task 4.2 は実装タスクであり、実装者は logging.md を読んで影響箇所を特定できる
- 過度に具体的なセクション列挙はタスク記述の保守性を下げる

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `design.md` | DD-001 に `createTRPCClientProxy` と `createTRPCProxyClient` の明確な区別を追記。Error Handling 表に Deferred proxy query/mutate のエントリ追加 |
| `tasks.md` | Task 1.1 の Verify 項目に `createTRPCProxyClient` 除去確認と `createTRPCClientProxy` 存在確認を追加 |
| `requirements.md` | Decision Log の「95ファイル」を「約93ファイル」に修正 |

---

## Conclusion

レビュー#5 の6件の指摘のうち、4件を Fix Required、2件を No Fix Needed と判断した。

**Fix Required (4件)**: CRITICAL-1 の API 名区別の明記、WARNING-1 のファイル数修正、WARNING-2 の Verify 項目追加、INFO-1 の Error Handling 追記。いずれもドキュメント修正のみで、設計判断やアーキテクチャの変更は不要。

**No Fix Needed (2件)**: WARNING-3（console-message テスト）は Out of Scope 制約下で合理的、INFO-2（Task 4.2 粒度）は現行記述で十分。

全修正は軽微なドキュメント追記であり、`--autofix` で即座に適用する。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `design.md` | DD-001 に API 名区別を追記、Error Handling に Deferred proxy query/mutate エントリを追加 |
| `tasks.md` | Task 1.1 に `createTRPCProxyClient` 除去確認と `createTRPCClientProxy` 存在確認の Verify 項目を追加 |
| `requirements.md` | Decision Log の「95ファイル」を「約93ファイル」に修正 |

### Details

#### design.md

**Issue(s) Addressed**: C1, I1

**Changes**:
- DD-001 テーブルに `API 名の区別` 行を追加し、`createTRPCClientProxy`（ラップ用、新設計で使用）と `createTRPCProxyClient`（新規生成用、除去対象）の明確な区別を記載
- Error Handling テーブルに「Deferred proxy への query/mutate 呼び出し（mount 前）」エントリを追加

**Diff Summary**:
```diff
 | Decision | `provider.tsx` の `trpc.createClient()` が返す `TRPCClient` を `createTRPCClientProxy()` でラップし、`getVanillaClient()` から返す |
+| API 名の区別 | `@trpc/client` v10.45.4 には類似名の2つの API が存在する。**`createTRPCClientProxy(client)`**: 既存 `TRPCClient` インスタンスを受け取り proxy でラップする（**新設計で使用**）。**`createTRPCProxyClient(opts)`**: クライアントオプション（links 含む）を受け取り新規 TRPCClient + proxy を一括生成する（**現行コードで使用中、除去対象**）。実装時にはこの2つを混同しないこと |
```

```diff
 | `setSharedClient()` 未呼び出し時の `getVanillaClient()` | Initialization Race | deferred proxy で operations をキューイング |
+| Deferred proxy への query/mutate 呼び出し（mount 前） | Initialization Race | `main.tsx` の mount 前呼び出しは subscribe のみ（確認済み）。万一 query/mutate が呼ばれた場合は即座にエラーをスローし、呼び出し元の特定を容易にする |
```

#### tasks.md

**Issue(s) Addressed**: C1, W2

**Changes**:
- Task 1.1 の Verify 項目に `createTRPCProxyClient` 除去確認と `createTRPCClientProxy` 存在確認を追加

**Diff Summary**:
```diff
   - _Verify: Grep "ipcLink" in vanillaClient.ts expects 0 matches_
+  - _Verify: Grep "createTRPCProxyClient" in vanillaClient.ts expects 0 matches_
+  - _Verify: Grep "createTRPCClientProxy" in vanillaClient.ts expects 1+ matches_
   - _Contracts: vanillaClient.ts Service Interface_
```

#### requirements.md

**Issue(s) Addressed**: W1

**Changes**:
- Decision Log の「95ファイルが `getVanillaClient()` を参照」を「約93ファイルが `getVanillaClient()` を参照」に修正

**Diff Summary**:
```diff
-95ファイルが `getVanillaClient()` を参照しており
+約93ファイルが `getVanillaClient()` を参照しており
```

---

_Fixes applied by document-review-reply command._
