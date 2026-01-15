# Specification Review Report #2

**Feature**: bugs-worktree-support
**Review Date**: 2026-01-14
**Documents Reviewed**:
- `.kiro/specs/bugs-worktree-support/spec.json`
- `.kiro/specs/bugs-worktree-support/requirements.md`
- `.kiro/specs/bugs-worktree-support/design.md`
- `.kiro/specs/bugs-worktree-support/tasks.md`
- `.kiro/specs/bugs-worktree-support/document-review-1.md` (前回レビュー)
- `.kiro/specs/bugs-worktree-support/document-review-1-reply.md` (前回レビュー回答)
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/skill-reference.md`

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 2 |
| Info | 2 |

前回レビュー(#1)で指摘されたE2Eテストタスク追加とspec-merge共通化方針明記は修正済みです。本レビューでは新たな観点から追加検証を行い、2件のWarningと2件のInfoを検出しました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

前回レビュー#1で検証済み。全ての要件がDesignに対応しています。

### 1.2 Design ↔ Tasks Alignment

前回レビュー#1で検証済み、かつ#1-replyでE2Eテストタスク（Task 18）が追加されました。

### 1.3 Design ↔ Tasks Completeness

前回レビュー#1で検証済み。全カテゴリで完全にカバーされています。

### 1.4 Acceptance Criteria → Tasks Coverage

前回レビュー#1で検証済み。Requirements Coverage Matrixも更新済みです。

### 1.5 Cross-Document Contradictions

**検出された矛盾**:

| Document 1 | Document 2 | Contradiction | Severity |
|------------|------------|---------------|----------|
| skill-reference.md | requirements.md | skill-reference.mdでは「bug.jsonは存在しない」と明記（150行目）されているが、本仕様はbug.jsonを新設する | ⚠️ Warning |

**詳細**:
- skill-reference.md（150-169行目）：
  ```markdown
  ## 共通コマンド: bug-*

  プロファイル非依存の軽量バグ修正ワークフロー。**bug.jsonは存在しない**（ファイル存在ベースでステータス管理）。
  ```
- 本仕様では Requirement 1.1-1.4 で bug.json を導入することを定義

**影響**: Task 15.1（skill-reference.md更新）で対応予定だが、この変更は既存ドキュメントとの矛盾を解消するものであることを明確にすべき。

## 2. Gap Analysis

### 2.1 Technical Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| BugMetadata型の拡張 | ⚠️ Warning | design.md で BugJson 型を新設し、BugWorktreeConfig を追加することが定義されているが、既存の BugMetadata 型（`types/bug.ts`）への worktree フィールド追加についてのマッピングが tasks.md で明示されていない。Task 1.1 で BugJson 型を定義するが、BugMetadata との関係（拡張か別管理か）が不明確 |
| 既存BugServiceの部分対応 | ✅ Covered | bugService.ts（73-83行目）は既に bug.json の読み取りに対応済み。設計と既存実装の整合性あり |
| worktreeパス生成ロジック | ✅ Covered | WorktreeService に getBugWorktreePath メソッドを追加し、Spec 用とは異なる `bugs/` サブディレクトリを使用することが設計済み |

### 2.2 Operational Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| 後方互換性 | ✅ Covered | design.md「Implementation Notes」で「bug.json不在時はnull扱い」と明記済み |
| エラーハンドリング | ✅ Covered | design.md「Error Handling」セクションでロールバック戦略が定義済み |

## 3. Ambiguities and Unknowns

| Item | Description | Affected Docs |
|------|-------------|---------------|
| BugMetadata と BugJson の関係 | BugJson は bug.json ファイルの構造、BugMetadata は UI 表示用の型として分離するのか、BugMetadata を拡張して worktree フィールドを追加するのかが不明確。Requirement 10.1-10.3（バグ一覧でのworktree状態判定・インジケーター表示）を実現するには、BugMetadata に worktree 情報を含める必要がある | design.md, tasks.md |
| bugStore の useWorktree 初期化タイミング | Requirement 8.3-8.4 で「デフォルト値で初期化」「オンメモリ保持」と記載されているが、どのタイミングで projectStore からデフォルト値を取得するか（ダイアログ表示時、アプリ起動時等）が不明確 | design.md |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

| Aspect | Alignment Status | Notes |
|--------|-----------------|-------|
| IPC設計パターン | ✅ Compatible | tech.md の channels.ts + handlers.ts パターンに準拠 |
| Service層構造 | ✅ Compatible | structure.md の BugService、WorktreeService パターンを踏襲 |
| Store Pattern | ✅ Compatible | Zustand 使用、structure.md のパターン準拠 |
| Remote UI影響 | ✅ Addressed | requirements.md「Out of Scope」で Remote UI 対応を明示的に除外 |
| テスト配置 | ✅ Compatible | structure.md の「*.test.ts(x)」パターン準拠 |
| skill-reference.md | ⚠️ Needs Update | 現在の記述「bug.jsonは存在しない」と矛盾。Task 15.1 で更新予定 |

### 4.2 Integration Concerns

| Concern | Status | Notes |
|---------|--------|-------|
| 既存Bugsワークフロー | ✅ Low Risk | オプトイン方式で既存動作を維持 |
| WorktreeService共有 | ✅ DRY準拠 | Spec/Bug共通でWorktreeServiceを拡張 |
| configStore拡張 | ✅ Compatible | 既存パターンに従った設定追加 |
| 既存BugListItem | ℹ️ Info | 現在 worktree プロパティがない。SpecListItem のパターンを踏襲した拡張が必要 |

### 4.3 Migration Requirements

| Item | Status | Notes |
|------|--------|-------|
| 既存bug.jsonなしバグ | ✅ Addressed | 後方互換性（null扱い）で対応 |
| skill-reference.md更新 | ✅ Task Exists | Task 15.1 で対応 |

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

1. **skill-reference.md との矛盾の明示化**
   - **Issue**: Task 15.1 の説明に、既存の「bug.jsonは存在しない」記述を更新することを明記していない
   - **Impact**: 実装時に既存ドキュメントとの矛盾に気づかない可能性
   - **Recommendation**: Task 15.1 の説明に「既存の『bug.jsonは存在しない』記述を更新」と明記
   - **Affected Documents**: tasks.md

2. **BugMetadata と BugJson の関係明確化**
   - **Issue**: BugMetadata 型への worktree フィールド追加についてのタスクマッピングが不明確
   - **Impact**: 実装時に型定義の変更漏れが発生する可能性
   - **Recommendation**: design.md に BugMetadata 拡張の方針を追記、または Task 1.1 の説明に BugMetadata への影響を明記
   - **Affected Documents**: design.md または tasks.md

### Suggestions (Nice to Have)

1. **bugStore 初期化タイミングの明確化**
   - **Issue**: useWorktree フラグの初期化タイミングが不明確
   - **Recommendation**: design.md の CreateBugDialog 拡張セクションに初期化タイミングを追記
   - **Affected Documents**: design.md

2. **既存コードとの整合性確認**
   - **Issue**: BugListItem（renderer/components/）と SpecListItem（shared/components/spec/）のディレクトリ配置が異なる
   - **Recommendation**: BugListItem も shared/components/bug/ への移動を検討（Remote UI 将来対応時に必要）
   - **Affected Documents**: 設計判断としてOut of Scope明記済みのため、将来検討事項として記録のみ

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| ⚠️ Warning | skill-reference.md矛盾の明示化 | Task 15.1 の説明に「既存の『bug.jsonは存在しない』記述を更新」と追記 | tasks.md |
| ⚠️ Warning | BugMetadata型拡張の明確化 | Task 1.1 に「BugMetadata型への worktree フィールド追加」を明記、または design.md に方針を追記 | tasks.md または design.md |
| ℹ️ Info | 初期化タイミング | design.md の CreateBugDialog セクションに useWorktree 初期化タイミングを追記 | design.md |
| ℹ️ Info | BugListItem配置 | 将来のRemote UI対応時に shared/ への移動を検討。現時点では記録のみ | N/A |

---

_This review was generated by the document-review command._
