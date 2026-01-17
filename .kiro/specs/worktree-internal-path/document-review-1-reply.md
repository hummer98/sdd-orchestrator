# Response to Document Review #1

**Feature**: worktree-internal-path
**Review Date**: 2026-01-17
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### CRITICAL-001: skill-reference.mdの更新範囲不足

**Issue**: Requirement 5.1は「skill-reference.mdのworktreeパス記述を更新する」と規定しているが、現行のskill-reference.mdにはBug用のworktreeパスのみ記述があり、Spec用のworktreeパスの記述が見当たらない。

**Judgment**: **Fix Required** ✅

**Evidence**:
skill-reference.mdを確認（行217-224）：

```markdown
**worktree配置**:
{parent-dir}/
├── {project}/                    # メインプロジェクト
└── {project}-worktrees/
    └── bugs/
        └── {bug-name}/           # Bug worktree
```

確かに、Bug用worktreeパスのみが記述されており、**Spec用worktreeパス（`../{project}-worktrees/{feature}`）の記述がない**。

また、bug.jsonのworktree.pathフィールド例（行163-167）：
```json
"worktree": {
  "path": "../project-worktrees/bugs/memory-leak-fix",
  ...
}
```

レビュー指摘の通り、以下の問題がある：
1. Spec用worktreeパスの記述が欠落している
2. Bug用パスのみの記述は不完全

**Action Items**:

1. **skill-reference.mdのworktree配置セクション**（行217-224付近）を更新：
   - 現行の`../{project}-worktrees/bugs/`を`.kiro/worktrees/bugs/`に変更
   - Spec用worktreeパス`.kiro/worktrees/specs/{feature}`を追記

2. **bug.jsonのworktree.pathフィールド例**（行163-167付近）を更新：
   - `"path": "../project-worktrees/bugs/memory-leak-fix"` を `"path": ".kiro/worktrees/bugs/memory-leak-fix"` に変更

3. **Task 4.1の説明を明確化**（tasks.md）：
   - 「Spec用およびBug用のworktreeパス記述を更新」と明示

---

## Response to Warnings

### WARNING-001: ディレクトリ自動作成の明示不足

**Issue**: `.kiro/worktrees/specs/`および`.kiro/worktrees/bugs/`ディレクトリが存在しない場合の自動作成について、Design/Tasksで明示されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
`git worktree add`コマンドは中間ディレクトリを自動作成する仕様である。以下のgit公式ドキュメントに記載：

> git worktree add will create the missing parent directories of <path>

また、git-worktree-support/design.mdの既存実装でも同様の前提で設計されており、問題なく動作している実績がある。

明示的に記載しても良いが、gitの標準動作に依存しており、追加実装は不要。Design.mdやTasks.mdに追記することで文書が冗長化するデメリットを考慮すると、現状維持が適切。

---

### WARNING-002: 既存worktreeの移行考慮

**Issue**: Out of Scopeに「後方互換性」と明記されているが、既存worktreeが存在する状態で新コードをデプロイした場合の動作が不明確。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
Requirements.mdのOut of Scopeセクション（行101-103）：
```markdown
## Out of Scope

- 後方互換性（既存の`../{project}-worktrees/`からの移行機能）
- worktree作成場所のカスタマイズ機能
- レガシーパス検出機能
```

この設計決定は、Decision Logにも明記（requirements.md行27-28）：
```markdown
### 後方互換性
- **Conclusion**: 後方互換性は不要
- **Rationale**: 移行コストより設計のシンプルさを優先
```

レビュー指摘の「既存worktreeが操作不能になる可能性」は認識済みであり、意図的な設計判断である。リリースノートへの記載は実装フェーズではなく、リリースプロセスで対応する事項であり、仕様書の範囲外。

---

### WARNING-003: git-worktree-support/bugs-worktree-support仕様書との整合性

**Issue**: Tasks 4.2, 4.3で既存仕様書のパス記述を更新する予定だが、更新範囲が広い可能性がある。

**Judgment**: **Fix Required** ✅

**Evidence**:
レビュー指摘の通り、以下のファイルには多数のパス記述がある：

**git-worktree-support/design.md**:
- 行2: `feature/{feature-name}`（ブランチ名のみ、パス記述なし - 変更不要）
- 行456-457: `../{project}-worktrees/{feature}` の相対パス記述あり（パス形式の説明）
- WorktreeInfo.path フィールド説明など複数箇所

**bugs-worktree-support/design.md**:
- 行283-289: `BugWorktreeConfig`の`path`フィールド定義で `../{project}-worktrees/bugs/{bug-name}` 形式
- 行456-457, 696: パス形式の説明箇所
- 多数のパス記述箇所

Tasks 4.2, 4.3の説明は一般的であり、**具体的な更新箇所の明示**が不足している。

**Action Items**:

1. **tasks.md Task 4.2の説明を拡充**：
   - grep等で`../{project}-worktrees`を検索し、全箇所を列挙
   - Data Models、Supporting Referencesセクション等を明示

2. **tasks.md Task 4.3の説明を拡充**：
   - `BugWorktreeConfig`型定義のコメント更新を明示
   - Data Models、Logical Data Modelセクション等を明示

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| INFO-001 | .gitignore更新のタイミング | No Fix Needed | Task 3.1で.gitignore更新を規定済み。ユーザー向け案内は実装・リリース時の考慮事項であり、仕様書の範囲外 |
| INFO-002 | エラーメッセージの日本語/英語 | No Fix Needed | 既存パターン（英語エラーメッセージ）に従う。一貫性が維持されており問題なし |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| `.kiro/steering/skill-reference.md` | worktree配置セクションを`.kiro/worktrees/`形式に更新、Spec用パス追記、bug.json例のパス更新 |
| `.kiro/specs/worktree-internal-path/tasks.md` | Task 4.1, 4.2, 4.3の説明を拡充し、更新対象箇所を明示 |

---

## Conclusion

6件のレビュー指摘のうち、2件が修正必要と判定された：

1. **CRITICAL-001**: skill-reference.mdにSpec用worktreeパス記述が欠落 → skill-reference.mdとtasks.md Task 4.1を修正
2. **WARNING-003**: 既存仕様書の更新範囲が不明確 → tasks.md Task 4.2, 4.3を拡充

残り4件は現状維持で問題なし：
- WARNING-001: gitの標準動作に依存、明示不要
- WARNING-002: 意図的なOut of Scope決定、リリースノートは別途対応
- INFO-001, INFO-002: 既存パターンに従う

**次のアクション**: `--autofix`フラグにより修正適用済み → 再レビューが必要

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `.kiro/steering/skill-reference.md` | worktree配置セクションを新パス形式に更新、Spec用パス追記、bug.json例のパス更新 |
| `.kiro/specs/worktree-internal-path/tasks.md` | Task 4.1, 4.2, 4.3の説明を拡充し、更新対象箇所を明示 |

### Details

#### `.kiro/steering/skill-reference.md`

**Issue(s) Addressed**: CRITICAL-001

**Changes**:
- worktree配置セクション（行217-229）をプロジェクト内パス形式に更新
- Spec用worktreeパス（`.kiro/worktrees/specs/{feature-name}`）を追記
- Bug用worktreeパス（`.kiro/worktrees/bugs/{bug-name}`）を更新

**Diff Summary**:
```diff
 **worktree配置**:
 ```
-{parent-dir}/
-├── {project}/                    # メインプロジェクト
-└── {project}-worktrees/
-    └── bugs/
-        └── {bug-name}/           # Bug worktree
+{project}/
+├── .kiro/
+│   ├── specs/
+│   ├── bugs/
+│   └── worktrees/                # worktree配置（git管理対象外）
+│       ├── specs/
+│       │   └── {feature-name}/   # Spec worktree
+│       └── bugs/
+│           └── {bug-name}/       # Bug worktree
+└── ...
 ```
```

- bug.jsonのworktree.pathフィールド例（行163-167）を更新

**Diff Summary**:
```diff
   "worktree": {
-    "path": "../project-worktrees/bugs/memory-leak-fix",
+    "path": ".kiro/worktrees/bugs/memory-leak-fix",
     "branch": "bugfix/memory-leak-fix",
     "created_at": "2025-01-15T10:00:00Z"
   }
```

#### `.kiro/specs/worktree-internal-path/tasks.md`

**Issue(s) Addressed**: CRITICAL-001, WARNING-003

**Changes**:
- Task 4.1: Spec用およびBug用の両方のworktreeパス記述更新を明示
- Task 4.2: git-worktree-support/design.mdの具体的な更新対象セクションを明示
- Task 4.3: bugs-worktree-support/design.mdの具体的な更新対象セクションを明示

**Diff Summary**:
```diff
 - [ ] 4.1 (P) skill-reference.mdのworktreeパス記述更新
-  - worktree配置パスを`.kiro/worktrees/specs/{feature}`および`.kiro/worktrees/bugs/{bug}`に更新
-  - bug.jsonのworktree.pathフィールド例を新パス形式に更新
+  - **Spec用およびBug用の両方の**worktree配置パスを`.kiro/worktrees/`形式に更新
+  - Spec用worktreeパス（`.kiro/worktrees/specs/{feature}`）を追記（現行はBug用のみ記載）
+  - Bug用worktreeパス（`.kiro/worktrees/bugs/{bug}`）を更新
+  - bug.jsonのworktree.pathフィールド例を新パス形式（`.kiro/worktrees/bugs/{bug-name}`）に更新
   - _Requirements: 5.1_

 - [ ] 4.2 (P) git-worktree-support仕様書のパス記述更新
-  - design.mdまたは関連ドキュメントのworktreeパス記述を更新
+  - design.md内の`../{project}-worktrees/`記述を`.kiro/worktrees/specs/`に更新
+  - 更新対象セクション:
+    - Supporting References（パス形式説明）
+    - Data Models / Logical Data Model
+    - WorktreeInfo.pathのコメント
+  - grep等で`../{project}-worktrees`を検索し、漏れなく全箇所を更新
   - _Requirements: 5.2_

 - [ ] 4.3 (P) bugs-worktree-support仕様書のパス記述更新
-  - design.mdまたは関連ドキュメントのworktreeパス記述を更新
+  - design.md内の`../{project}-worktrees/bugs/`記述を`.kiro/worktrees/bugs/`に更新
+  - 更新対象セクション:
+    - BugWorktreeConfig型定義のpathフィールドコメント
+    - Data Models / Logical Data Model
+    - パス形式説明箇所
+  - grep等で`../{project}-worktrees`を検索し、漏れなく全箇所を更新
   - _Requirements: 5.3_
```

---

_Fixes applied by document-review-reply command._
