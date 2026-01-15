# Response to Document Review #2

**Feature**: bugs-worktree-support
**Review Date**: 2026-01-14
**Reply Date**: 2026-01-14

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W1: skill-reference.mdとの矛盾の明示化

**Issue**: Task 15.1 の説明に、既存の「bug.jsonは存在しない」記述を更新することを明記していない

**Judgment**: **Fix Required** ✅

**Evidence**:
レビュー指摘は正しい。skill-reference.md（150-152行目）では:
```markdown
## 共通コマンド: bug-*
プロファイル非依存の軽量バグ修正ワークフロー。**bug.jsonは存在しない**（ファイル存在ベースでステータス管理）。
```
と明記されており、本仕様のRequirement 1.1-1.4はbug.jsonを導入する内容である。Task 15.1はこの既存記述を更新する必要があるが、その旨がタスク説明に明示されていない。

**Action Items**:
- Task 15.1 の説明に「既存の『bug.jsonは存在しない』記述を更新」と追記

---

### W2: BugMetadata型とBugJson型の関係明確化

**Issue**: BugMetadata 型への worktree フィールド追加についてのタスクマッピングが不明確

**Judgment**: **Fix Required** ✅

**Evidence**:
既存の`BugMetadata`型（`electron-sdd-manager/src/renderer/types/bug.ts:22-28`）:
```typescript
export interface BugMetadata {
  readonly name: string;           // バグ名（ディレクトリ名）
  readonly path: string;           // フルパス
  readonly phase: BugPhase;        // 現在のフェーズ
  readonly updatedAt: string;      // 最終更新日時
  readonly reportedAt: string;     // 報告日時
}
```

この型にはworktreeフィールドがない。Requirement 10.1-10.3（バグ一覧でのworktreeインジケーター表示）を実現するには、BugMetadataにworktree情報を含める必要がある。現在のdesign.mdではBugJson型のみ定義しているが、BugMetadataとの関係が不明確。

Task 1.1は「BugJson型とBugWorktreeConfig型を定義する」となっているが、BugMetadataへのworktreeフィールド追加について言及がない。UI（BugListItem）で使用されるのはBugMetadataであり、bug.jsonから読み取ったworktree情報をBugMetadataに含める必要がある。

**Action Items**:
- design.md の「Types」セクションにBugMetadata拡張方針を追記（worktreeフィールドをオプショナルで追加、BugJsonからマッピング）
- Task 1.1 の説明に「BugMetadata型への worktree フィールド追加」を明記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | bugStore初期化タイミング不明確 | No Fix Needed ❌ | design.md「CreateBugDialog拡張」セクションで「projectStore経由でデフォルト値を取得し初期化」と記述済み。初期化タイミングはコンポーネントマウント時であることが暗黙的に理解可能 |
| I2 | BugListItem配置の不一致 | No Fix Needed ❌ | 「Out of Scope」でRemote UI対応が明示的に除外済み。既にshared/components/bug/BugListItem.tsxが存在しており、将来のRemote UI対応時には既存のshared版を拡張すればよい |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| `.kiro/specs/bugs-worktree-support/tasks.md` | Task 15.1 の説明に「既存の『bug.jsonは存在しない』記述を更新」と追記 |
| `.kiro/specs/bugs-worktree-support/tasks.md` | Task 1.1 の説明に「BugMetadata型への worktree フィールド追加」を明記 |
| `.kiro/specs/bugs-worktree-support/design.md` | Types セクションにBugMetadata拡張方針を追記 |

---

## Conclusion

Warningの2件は正当な指摘であり、修正が必要。design.mdとtasks.mdでBugMetadata型拡張の方針を明確化し、skill-reference.md更新の意図をTask 15.1に明記する。

Info項目はいずれも既存の記述で十分カバーされているか、Out of Scopeで除外済みのため修正不要。

---

## Applied Fixes

**Applied Date**: 2026-01-14
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `.kiro/specs/bugs-worktree-support/tasks.md` | Task 1.1とTask 15.1の説明を拡張 |
| `.kiro/specs/bugs-worktree-support/design.md` | BugMetadata拡張方針を追記 |

### Details

#### `.kiro/specs/bugs-worktree-support/tasks.md`

**Issue(s) Addressed**: W1, W2

**Changes**:
- Task 1.1に「BugMetadata型にオプショナルなworktreeフィールドを追加（UI表示用、BugJsonからマッピング）」を追記
- Task 15.1に「既存の『bug.jsonは存在しない』記述を更新し、bug.json導入を反映」を追記

**Diff Summary**:
```diff
- [ ] 1.1 (P) BugJson型とBugWorktreeConfig型を定義する
  - バグのメタデータ（bug_name, created_at, updated_at）を表現する型を作成
  - worktreeオプショナルフィールドの型を定義（path, branch, created_at）
  - isBugWorktreeMode判定関数を実装
  - 既存のWorktreeConfig型との整合性を確保
+ - BugMetadata型にオプショナルなworktreeフィールドを追加（UI表示用、BugJsonからマッピング）
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
```

```diff
- [ ] 15.1 (P) skill-reference.mdにbug.json管理とbug-merge説明を追加する
+ - 既存の「bug.jsonは存在しない」記述を更新し、bug.json導入を反映
  - bug-*セクションにbug.json管理の記述を追加
  - bug-mergeスキルの説明を追加
  - worktree関連のフィールドと状態遷移を記述
  - _Requirements: 7.1, 7.2, 7.3_
```

#### `.kiro/specs/bugs-worktree-support/design.md`

**Issue(s) Addressed**: W2

**Changes**:
- TypesセクションのBugJson型定義の後に「BugMetadata拡張」サブセクションを追加
- BugMetadata型にworktreeフィールドを追加する方針を明記
- BugJsonからBugMetadataへのマッピング戦略を記述

**Diff Summary**:
```diff
- State model: worktreeフィールドの有無でモード判定（Requirements: 1.4）
- Persistence: `.kiro/bugs/{bug-name}/bug.json`に保存
- Consistency: フィールド追加/削除は単一操作で実行
+
+ #### BugMetadata拡張
+
+ 既存の`BugMetadata`型（UI表示用）にworktreeフィールドを追加：
+
+ ```typescript
+ export interface BugMetadata {
+   readonly name: string;
+   readonly path: string;
+   readonly phase: BugPhase;
+   readonly updatedAt: string;
+   readonly reportedAt: string;
+   readonly worktree?: BugWorktreeConfig;
+ }
+ ```
+
+ **マッピング戦略**:
+ - BugService.readBugsでbug.jsonを読み取る際、worktreeフィールドが存在すればBugMetadataにマッピング
+ - BugListItemはBugMetadata.worktreeの有無でインジケーター表示を判定
+ - BugJsonはファイル永続化用、BugMetadataはUI表示用として役割分離
```

---

_Fixes applied by document-review-reply command._
