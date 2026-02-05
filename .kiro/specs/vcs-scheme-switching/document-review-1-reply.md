# Response to Document Review #1

**Feature**: vcs-scheme-switching
**Review Date**: 2026-02-05
**Reply Date**: 2026-02-05

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-1: jj操作エラー時のロールバック未定義

**Issue**: Design/Tasksにjj workspace add/bookmark create間でエラー発生時の中間状態復旧方法が未定義。requirements.md Open Questionsに記載済み。

**Judgment**: **Fix Required** ✅

**Evidence**:
Open Questions（requirements.md 190行）に記載されているが、design.mdにエラーハンドリング戦略が明示されていない。実装時の判断に委ねると一貫性が失われる可能性がある。

design.mdのError Handling（459-476行）にはユーザーエラーとシステムエラーの分類があるが、jj操作の途中失敗に対する具体的な復旧手順が不足している。

**Action Items**:
- design.mdのError Handlingセクションにjj操作のロールバック戦略を追記
- jj workspace addが成功後にbookmark createが失敗した場合のworkspace削除手順を明記

---

### W-2: ロギング戦略未明示

**Issue**: Design/Tasksにsteering/logging.mdへの準拠が明示されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
1. `logging.md`はTypeScriptのロガー使用に関するガイドライン（`console.*`の制限、構造化ログ等）
2. シェルスクリプトには直接適用されない

```bash
# 既存スクリプトのログパターン（merge-spec.sh:44, 60, 82等）
echo "Using spec.json from worktree: $SPEC_JSON"
echo "Feature branch: $FEATURE_BRANCH"
echo "Merging branch $FEATURE_BRANCH into $CURRENT_BRANCH..."
```

3. すべての既存スクリプトで`set -e`または`set -euo pipefail`が使用されており、エラー時の即時終了が保証されている
4. 標準出力/エラー出力への`echo`ベースのログは確立されたパターン

シェルスクリプトのロギングは既存パターン（`echo`ベース、`set -e`でエラー処理）に準拠しており、追加の明示化は不要。

---

### W-3: jj workspaceパス形式未確定

**Issue**: jj workspaceのパス指定で相対パス/絶対パスのどちらが適切か未確定。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
requirements.mdおよびdesign.mdに相対パスが明確に規定されている。

requirements.md（120-121行）:
```markdown
4.5. パス構造はgit/jj共通: `.kiro/worktrees/specs/{feature-name}`
```

design.md（256行）:
```markdown
| 4.5 | パス構造はgit/jj共通 | create-spec-worktree.sh | .kiro/worktrees/specs/{name} |
```

design.md Data Models（425-428行）:
```json
"worktree": {
  "path": ".kiro/worktrees/specs/{feature}",
  ...
}
```

相対パス（プロジェクトルートからの相対パス）で統一することが既に決定・記載されている。

---

## Response to Info (Low Priority)

| #    | Issue                          | Judgment      | Reason                                       |
| ---- | ------------------------------ | ------------- | -------------------------------------------- |
| I-1  | ヘルプ/ドキュメント更新の言及なし | No Fix Needed | リリース時対応。本仕様のスコープ外           |
| I-2  | マイグレーション案内の言及なし   | No Fix Needed | リリースノートで対応。後方互換性は仕様で保証 |

---

## Files to Modify

| File           | Changes                                                                |
| -------------- | ---------------------------------------------------------------------- |
| design.md      | Error Handlingセクションにjj操作のロールバック戦略を追記               |

---

## Conclusion

3件のWarningのうち、1件（W-1: jj操作エラー時のロールバック未定義）のみ修正が必要です。

W-2（ロギング戦略）とW-3（パス形式）は既存の設計・パターンで既に対応されており、追加の修正は不要と判断しました。

Info項目はリリース時対応のため、本仕様のスコープ外として扱います。

---

## Applied Fixes

**Applied Date**: 2026-02-05
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | Error Handlingセクションにjj操作のロールバック戦略を追記 |

### Details

#### design.md

**Issue(s) Addressed**: W-1

**Changes**:
- Error Handlingセクションに「jj操作のロールバック戦略」サブセクションを追加
- jj workspace add / bookmark create の2ステップ実行とエラー時の復旧手順を明記
- スクリプト実装方針（bash コード例）を追加
- Merge/Rebase時のエラー処理方針を追加

**Diff Summary**:
```diff
 | スクリプト実行エラー | VCS操作に失敗しました: {詳細メッセージ} |

+### jj操作のロールバック戦略
+
+jjモードでのworktree作成は以下の2ステップで実行される：
+
+1. `jj workspace add -r @- {path}` - ワークスペース作成
+2. `jj bookmark create feature/{name}` - ブックマーク作成
+
+**エラー発生時の復旧手順**:
+
+| 失敗箇所 | 状態 | 復旧アクション |
+|----------|------|---------------|
+| ステップ1失敗 | ワークスペース未作成 | 復旧不要（クリーンな状態） |
+| ステップ2失敗 | ワークスペース作成済み、ブックマークなし | `jj workspace forget {path}` を実行 |
+
+**実装方針**: (bashコード例を含む)
+
+**Merge/Rebase時のエラー**: 手動復旧方針を明記
+
 ## Testing Strategy
```

---

_Fixes applied by document-review-reply command._
