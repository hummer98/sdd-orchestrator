# Response to Document Review #2

**Feature**: git-worktree-support
**Review Date**: 2026-01-12
**Reply Date**: 2026-01-12

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 4      | 0            | 4             | 0                |

---

## Response to Warnings

### W-2.1: Remote UI影響が要件に未記載

**Issue**: tech.mdの「新規Spec作成時の確認事項」に従い、Remote UIへの影響有無を要件に明記すべき。design.mdのNon-Goalsに「Remote UI対応（初期スコープ外）」と記載あるが、requirements.mdには明記なし。

**Judgment**: **Fix Required** ✅

**Evidence**:
- design.md:21行目に「Remote UI対応（初期スコープ外）」と明記されている
- requirements.md:159-165行目の「Out of Scope」セクションにはRemote UIに関する記載がない
- tech.mdのチェックリストに準拠するため、要件レベルでも明記が必要

**Action Items**:
- requirements.mdの「Out of Scope」セクションに「Remote UI対応（初期スコープ外、Desktop UI専用）」を追加

---

### W-2.2: feature-nameのバリデーション未定義

**Issue**: feature/{feature-name}形式でブランチを作成するが、feature-nameに`/`や特殊文字が含まれる場合の検証がdesign.mdに記載なし。

**Judgment**: **Fix Required** ✅

**Evidence**:
- requirements.md:79行目でブランチ作成時に`feature/{feature-name}`形式を使用することが定義されている
- design.md:276-277行目のcreateWorktreeメソッドでfeatureNameを受け取るが、入力検証の仕様が未定義
- gitブランチ名には使用できない文字（スペース、`~`, `^`, `:`, `?`, `*`, `[`, `\`等）があり、feature-nameがこれらを含む場合にエラーとなる可能性がある

**Action Items**:
- design.mdのWorktreeService.createWorktreeの実装に入力検証仕様を追加
  - gitブランチ名として有効な文字のみ許可
  - 不正な文字が含まれる場合はエラーを返す

---

### W-3.1: `{project}`の定義が不明確

**Issue**: worktreeパス形式「`../{project}-worktrees/{feature-name}`」において、`{project}`の定義が不明確。プロジェクトディレクトリ名なのか、リポジトリ名なのか。

**Judgment**: **Fix Required** ✅

**Evidence**:
- requirements.md:17行目で「`../{project}-worktrees/{feature-name}` 形式の固定パスを使用」と記載
- requirements.md:78行目、93行目でも同様の形式を参照
- `{project}`がプロジェクトディレクトリ名なのか、gitリモートのリポジトリ名なのか、spec名なのかが不明確

**Action Items**:
- requirements.mdのDecision Logに`{project}`の定義を追記（プロジェクトディレクトリ名=mainプロジェクトのディレクトリ名）

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-2.1 | ロギングフォーマットの明示なし | No Fix Needed | design.md:604行目に「WorktreeService操作をlogger.infoで記録」と記載があり、既存のロギングパターンに従う想定。過度な詳細化は不要 |
| I-2.2 | デバッグ手順未記載 | No Fix Needed | 実装後に追加予定との位置づけが適切。仕様段階で先行してデバッグ手順を書くのは非効率 |
| A-1 | ロールバック戦略未定義 | No Fix Needed | design.md:593-596行目にworktree作成失敗時のロールバック手順が明記されており、合理的な対応。spec-merge失敗時の詳細は実装フェーズで検討が適切 |
| I-4.1 | SpecsWatcherService変更の影響 | No Fix Needed | design.md:543-549行目に再初期化フローが詳細に記載されており、Task 7.1で対応予定。追加の仕様記載は不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | Out of Scopeに「Remote UI対応」を追加、Decision Logに`{project}`定義を追記 |
| design.md | WorktreeService.createWorktreeにfeature-name入力検証仕様を追加 |

---

## Conclusion

3件のWarningは全て妥当な指摘であり、修正が必要。Infoレベルの4件は既存の設計で十分対応されており、追加修正は不要。

修正完了後、実装フェーズに進むことが可能。

---

## Applied Fixes

**Applied Date**: 2026-01-12
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Out of ScopeにRemote UI対応を追加、Decision Logに`{project}`定義を追記 |
| design.md | WorktreeService.createWorktreeにfeature-name入力検証仕様を追加、INVALID_FEATURE_NAMEエラー型を追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: W-2.1, W-3.1

**Changes**:
- Out of Scopeセクションに「Remote UI対応（初期スコープ外、Desktop UI専用機能）」を追加
- Decision Logに「worktreeパスの`{project}`定義」セクションを追加（mainプロジェクトのディレクトリ名と定義）

**Diff Summary**:
```diff
 ## Out of Scope

 - 既存worktreeの検出・紐付け機能（手動でspec.json編集は可能）
 - worktree作成場所のカスタマイズ
 - ブランチ命名規則のカスタマイズ
 - 「Open in Main」ボタン
 - worktreeモードと通常モードの切り替えUI
+- Remote UI対応（初期スコープ外、Desktop UI専用機能）
```

```diff
 ### ブランチ命名規則
 - **Discussion**: カスタマイズ可能にするか固定にするか
 - **Conclusion**: `feature/{feature-name}` で固定
 - **Rationale**: 混乱を避け、一貫性を保つ
+
+### worktreeパスの`{project}`定義
+- **Discussion**: `../{project}-worktrees/{feature-name}`の`{project}`が何を指すか
+- **Conclusion**: mainプロジェクトのディレクトリ名（path.basename(projectPath)）
+- **Rationale**: シンプルで一貫性があり、ファイルシステム上で識別しやすい
```

#### design.md

**Issue(s) Addressed**: W-2.2

**Changes**:
- WorktreeError型にINVALID_FEATURE_NAMEエラーを追加
- createWorktreeメソッドのJSDocに入力検証仕様を追記

**Diff Summary**:
```diff
 type WorktreeError =
   | { type: 'NOT_ON_MAIN_BRANCH'; currentBranch: string }
   | { type: 'WORKTREE_EXISTS'; path: string }
   | { type: 'BRANCH_EXISTS'; branch: string }
   | { type: 'GIT_ERROR'; message: string }
   | { type: 'PATH_NOT_FOUND'; path: string }
-  | { type: 'PATH_VALIDATION_ERROR'; path: string; reason: string };
+  | { type: 'PATH_VALIDATION_ERROR'; path: string; reason: string }
+  | { type: 'INVALID_FEATURE_NAME'; featureName: string; reason: string };
```

```diff
   /**
    * worktreeを作成
    * @param featureName - spec feature名
    * @returns WorktreeInfo（作成されたworktreeの情報）
+   * @throws INVALID_FEATURE_NAME featureNameがgitブランチ名として無効な場合
+   *
+   * 入力検証:
+   * - gitブランチ名として有効な文字のみ許可（英数字、ハイフン、アンダースコア）
+   * - 禁止文字: スペース, ~, ^, :, ?, *, [, \, .., @{
+   * - 先頭/末尾のドット、連続ドット禁止
+   * - 検証失敗時はINVALID_FEATURE_NAMEエラーを返す
    */
   createWorktree(featureName: string): Promise<WorktreeServiceResult<WorktreeInfo>>;
```

---

_Fixes applied by document-review-reply command._
