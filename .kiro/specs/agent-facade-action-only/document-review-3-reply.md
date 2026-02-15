# Response to Document Review #3

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Reply Date**: 2026-02-15

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 1      | 0            | 1             | 0                |

---

## Response to Critical Issues

### C-01: AgentActionStore interfaceにsendInputが2回定義されている

**Issue**: Review #2のC-01修正で7アクションをDesign.mdのAgentActionStore interfaceに追加した際、`sendInput`がline 258とline 266の2箇所に定義されている。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md lines 258, 266を確認。確かに`sendInput(agentId: string, input: string): Promise<void>;`が2箇所に存在する:
- line 258: 元から存在する定義
- line 266: Review #2修正時に誤って追加された重複

TypeScriptではオーバーロードとして扱われエラーにならないが、仕様文書として重複は不適切。

**Action Items**:

- design.md line 266の重複`sendInput`定義を削除する

---

## Response to Warnings

### W-01: ファサードの状態読み取り委譲メソッドの設計意図が不明確

**Issue**: AgentActionStoreに含まれる状態読み取り委譲メソッド（`getAgentById`, `getSelectedAgent`, `findAgentById`, `getLogsForAgent`）のうち、`getAgentById`のみ設計方針の記載があり、他3メソッドの方針が記載されていない。

**Judgment**: **Fix Required** ✅

**Evidence**:
design.md line 289を確認:
> `getAgentById`はSSOT委譲メソッドとしてファサードに残す（`useSharedAgentStore.getState().getAgentById()`への委譲）。状態読み取りメソッドだが、既存の呼び出しパターンとの互換性のためファサードのインターフェースに含める

確かに`getAgentById`のみ言及されており、`getSelectedAgent`, `findAgentById`, `getLogsForAgent`の3メソッドについては方針の記載がない。interfaceに含まれている以上、同様の設計根拠を明記すべき。

レビューの指摘通り、方針(A)「全4メソッドをSSOT委譲ラッパーとしてファサードに残す（互換性のため）」を採用し、Implementation Notesに明記する。

**Action Items**:

- design.md Implementation Notesに、全4メソッド（`getAgentById`, `getSelectedAgent`, `findAgentById`, `getLogsForAgent`）の設計方針を統一的に記載する

---

### W-02: タスク間の実行順序依存が明示されていない

**Issue**: Task 3.1（ファサードから状態フィールド削除）とTask 4.x（コンポーネントのSSOT移行）には強い依存関係があり、Task番号順（1→2→3→4→5→6）に実行すると、Task 3の後にTask 4が未実行の状態でコンパイルエラーが大量発生する。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdを確認すると、Task 3.1がTask 4.x群の前に配置されている。Task 3.1でファサードから状態フィールド（agents, selectedAgentId, logs等）を削除すると、Task 4.x群で移行予定のコンポーネントがまだファサード経由で読み取っており、コンパイルエラーが発生する。

正しい実行順序は: Task 1 → Task 2 → Task 4/5 → Task 3 → Task 6

tasks.mdに実行順序の注記を追加する。

**Action Items**:

- tasks.mdに実行順序の注記を追加する（推奨順: 1→2→4/5→3→6）

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-01 | AgentLogPanelのSSOTセレクタパターンでselectedAgentIdがクロージャ参照 | No Fix Needed ❌ | Zustand標準パターン。selectedAgentId変更時にコンポーネントが再レンダリングされ新クロージャが生成されるため実用上問題なし。レビュー自体も同様の結論 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `design.md` | line 266の重複`sendInput`定義を削除、Implementation Notesに状態読み取り委譲メソッド4つの設計方針を統一的に記載 |
| `tasks.md` | 実行順序の注記を追加（推奨順: 1→2→4/5→3→6） |

---

## Conclusion

Review #3で検出された4件のうち、Critical 1件（sendInput重複定義）とWarning 2件（委譲メソッドの方針未統一、タスク実行順序の依存明示）は全て修正が必要。Info 1件（セレクタクロージャパターン）は対応不要。

`--autofix`モードにより修正を適用し、次の検証ラウンドで確認する。

---

## Applied Fixes

**Applied Date**: 2026-02-15
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `design.md` | sendInput重複定義の削除、状態読み取り委譲メソッドの設計方針を統一記載 |
| `tasks.md` | 実行順序の注記を先頭に追加 |

### Details

#### design.md

**Issue(s) Addressed**: C-01, W-01

**Changes**:
- AgentActionStore interfaceからline 266の重複`sendInput`定義を削除
- Implementation Notesの`getAgentById`のみの記載を、全4メソッド（`getAgentById`, `getSelectedAgent`, `findAgentById`, `getLogsForAgent`）の統一的な設計方針に書き換え

**Diff Summary**:
```diff
  getAgentById(agentId: string): AgentInfo | undefined;
- sendInput(agentId: string, input: string): Promise<void>;
  updateAgentStatus(agentId: string, status: AgentStatus): void;
```

```diff
-- `getAgentById`はSSOT委譲メソッドとしてファサードに残す（`useSharedAgentStore.getState().getAgentById()`への委譲）。状態読み取りメソッドだが、既存の呼び出しパターンとの互換性のためファサードのインターフェースに含める
+- 状態読み取り委譲メソッド（`getAgentById`, `getSelectedAgent`, `findAgentById`, `getLogsForAgent`）は全てSSOT委譲ラッパーとしてファサードに残す。これらは`useSharedAgentStore.getState()`への単純な委譲であり、状態読み取りメソッドだが、既存の呼び出しパターン（アクション内部やコールバック等の非コンポーネントコンテキスト）との互換性のためファサードのインターフェースに含める。コンポーネントからの状態読み取りはSSOTセレクタ経由を推奨するが、命令的なコンテキスト（イベントハンドラ内のスナップショット取得等）ではファサード委譲メソッドの使用を許容する
```

#### tasks.md

**Issue(s) Addressed**: W-02

**Changes**:
- ファイル先頭（タイトル直後）に実行順序の注記ブロックを追加

**Diff Summary**:
```diff
 # Implementation Plan

+> **実行順序の注記**: Task間には強い依存関係があるため、番号順ではなく以下の順序で実行すること:
+> **Task 1 → Task 2 → Task 4/5 → Task 3 → Task 6**
+>
+> 理由: Task 3（ファサードから状態フィールド削除）をTask 4（コンポーネントのSSOT移行）より先に実行すると、
+> 未移行コンポーネントがファサードから削除済みの状態フィールドを参照してコンパイルエラーが大量発生する。
+> 必ず先にTask 4/5でコンポーネントをSSOT直接読み取りに移行してから、Task 3でファサードの状態フィールドを削除すること。
+
 ## Task 1. SSOT（useSharedAgentStore）の拡張
```

---

_Fixes applied by document-review-reply command._
