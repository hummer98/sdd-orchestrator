# Response to Document Review #1

**Feature**: agent-store-unification
**Review Date**: 2026-01-22
**Reply Date**: 2026-01-22

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 1            | 1             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W1: shared/agentStore依存関係の明示的確認

**Issue**: shared/agentStoreのデータ構造変更が影響する箇所の網羅的確認が必要

**Judgment**: **No Fix Needed** ❌

**Evidence**:

Task 5.3「コンポーネント互換性の確認」には、既に「21個のコンポーネントのimport文が変更されていないこと」と「データ構造が `Map<specId, AgentInfo[]>` に統一されていること」という検証項目が含まれている。

また、Grepによる依存箇所の確認は実装時に自然に行われる検証作業であり、タスクの検証フェーズで実施される。現在のタスク記述は十分に明確であり、追加の記述は冗長となる。

**補足**: 現在のコードベースを確認した結果、`useSharedAgentStore` は26ファイルで使用されており（テストファイル含む）、主にテストと一部の内部連携に限定されている。renderer/agentStoreがFacadeとして機能するため、コンポーネントからのインポートパスは変更されない設計になっている。

---

### W2: Adapterのエラーログ出力

**Issue**: Design「Error Handling」でIPC通信エラー時の処理は定義されているが、デバッグ用のログ出力（steering/logging.md準拠）が明示されていない

**Judgment**: **Fix Required** ✅

**Evidence**:

steering/logging.mdを確認したところ、以下の必須観点が定義されている:
- エラー発生時にはerrorレベルでログを出力する
- 過剰なログ実装は回避する

現在のDesign「Error Handling」セクションには、エラー発生時の状態管理（shared/agentStore.errorへの設定）と回復方法は記載されているが、ログ出力に関する方針が明示されていない。

現在のrenderer/agentStore.tsを確認すると、`console.error`を使用したログ出力が既に実装されている（例: 357行目、609行目など）。ただし、Designに明示されていないため、追記が適切。

**Action Items**:

- design.mdの「Error Handling」セクションに、ロギング方針を追記する
- ProjectLoggerの使用は過剰（renderer側はconsole.errorで十分）であることも明記

---

## Response to Info (Low Priority)

| #    | Issue                              | Judgment      | Reason                                                                                             |
| ---- | ---------------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| I1   | runningAgentCountsの管理場所不明確 | No Fix Needed | Design「State Management」のAgentStateインタフェースに既に記載あり（384行目）。管理場所はFacade側 |
| I2   | ユニットテストの具体的テストケース | No Fix Needed | 実装フェーズで対応（レビューコメント通り）                                                         |
| I3   | specStoreFacade連携の詳細          | No Fix Needed | 実装フェーズでexecution-store-consolidationを参照して対応（レビューコメント通り）                  |

---

## Files to Modify

| File      | Changes                                     |
| --------- | ------------------------------------------- |
| design.md | Error Handlingセクションにロギング方針追記  |

---

## Conclusion

2件のWarningのうち1件（W2: ロギング方針の明示）のみ修正が必要。もう1件（W1: 依存関係確認）は既存のタスク記述で十分カバーされている。

3件のInfoは全て実装フェーズで対応可能であり、仕様書の修正は不要。

修正が完了次第、再レビューで確認する。

---

## Applied Fixes

**Applied Date**: 2026-01-22
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | Error Handlingセクションに「Logging Policy」サブセクションを追加 |

### Details

#### design.md

**Issue(s) Addressed**: W2 (Adapterのエラーログ出力)

**Changes**:
- 「Logging Policy」サブセクションを新規追加
- ログレベル（error/warn/log）と出力先の対応表を記載
- Renderer側ではProjectLoggerではなくconsole系メソッドを使用する方針を明記
- steering/logging.md準拠のログ出力方針を追記

**Diff Summary**:
```diff
 **Business Logic Errors**: 存在しないAgentへの操作
 - 対応: console.warn、操作スキップ
 - 回復: 状態のリロード（loadAgents）

+### Logging Policy
+
+steering/logging.mdに準拠したログ出力方針:
+
+| コンテキスト | ログレベル | 出力先 | 備考 |
+|-------------|-----------|--------|------|
+| Adapter IPC通信エラー | error | console.error | Main Processとの通信失敗時 |
+| 存在しないAgent操作 | warn | console.warn | 軽微なエラー、操作スキップ |
+| イベント受信・状態更新 | log | console.log | デバッグ用、開発時のみ有用 |
+
+**方針**:
+- Renderer側では`console.error`/`console.warn`/`console.log`を使用（ProjectLoggerは不要）
+- エラー発生時は、エラーメッセージと関連するagentId/specIdを含める
+- ループ内での過剰なログ出力を避ける
+
 ## Testing Strategy
```

---

_Fixes applied by document-review-reply command._
