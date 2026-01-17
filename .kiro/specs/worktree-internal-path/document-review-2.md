# Specification Review Report #2

**Feature**: worktree-internal-path
**Review Date**: 2026-01-17
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `document-review-1.md`
- `document-review-1-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/skill-reference.md`
- `.kiro/specs/git-worktree-support/design.md`
- `.kiro/specs/bugs-worktree-support/design.md`

## Executive Summary

| 重大度 | 件数 |
|--------|------|
| **Critical** | 0 |
| **Warning** | 1 |
| **Info** | 2 |

本レビューはレビュー#1で指摘された問題への修正適用後の再レビューである。CRITICAL-001（skill-reference.mdのSpec用worktreeパス記述欠落）とWARNING-003（既存仕様書の更新範囲不明確）は適切に修正されている。残る問題は1件の警告と2件の情報レベルの指摘のみであり、**実装開始に支障なし**。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- 全てのRequirementがDesignで適切にカバーされている
- Requirements Traceability表が完備されており、各要件がコンポーネントと紐付けられている
- Design Decisionsが5項目適切に文書化されている

**懸念点**:
- なし

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- Design.mdのComponents and Interfaces（WorktreeService変更箇所）がTasks 1.1, 1.2, 2.1で明示的にカバーされている
- ドキュメント更新タスク（4.1-4.3）がRequirement 5の各項目に対応している
- Task 4.1-4.3の説明がレビュー#1後に拡充され、具体的な更新対象セクションが明示されている

**軽微な懸念**:
- なし（レビュー#1指摘の「ディレクトリ自動作成」はgit worktree addの標準動作で対応）

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | なし（バックエンド変更のみ） | N/A | ✅ |
| Services | WorktreeService（getWorktreePath, getBugWorktreePath, resolveWorktreePath） | 1.1, 1.2, 2.1 | ✅ |
| Types/Models | パス形式の変更（Data Models セクション） | 1.1, 1.2 | ✅ |
| Configuration | .gitignore | 3.1 | ✅ |
| Documentation | skill-reference.md, git-worktree-support, bugs-worktree-support | 4.1, 4.2, 4.3 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | Spec用worktreeを`.kiro/worktrees/specs/{feature}/`に配置 | 1.1 | Feature | ✅ |
| 1.2 | Bug用worktreeを`.kiro/worktrees/bugs/{bug}/`に配置 | 1.2 | Feature | ✅ |
| 1.3 | spec.json/bug.jsonに相対パス格納 | 1.1, 1.2 | Feature | ✅ |
| 1.4 | ブランチ命名規則維持 | 5.1 | Feature | ✅ |
| 2.1 | `.gitignore`に`.kiro/worktrees/`追加 | 3.1 | Feature | ✅ |
| 2.2 | worktree内ファイルがgit statusに表示されない | 3.1 | Feature | ✅ |
| 3.1 | パスがプロジェクトディレクトリ内であることを検証 | 2.1 | Feature | ✅ |
| 3.2 | プロジェクト外パスでエラー | 2.1 | Feature | ✅ |
| 3.3 | `..`含む相対パスでもプロジェクト内なら許可 | 2.1 | Feature | ✅ |
| 4.1 | getWorktreePath戻り値変更 | 1.1 | Feature | ✅ |
| 4.2 | getBugWorktreePath戻り値変更 | 1.2 | Feature | ✅ |
| 4.3 | createWorktree新パス使用 | 5.1 | Feature | ✅ |
| 4.4 | createBugWorktree新パス使用 | 5.1 | Feature | ✅ |
| 4.5 | removeWorktree新パス使用 | 5.1 | Feature | ✅ |
| 4.6 | removeBugWorktree新パス使用 | 5.1 | Feature | ✅ |
| 5.1 | skill-reference.mdパス記述更新 | 4.1 | Feature | ✅ |
| 5.2 | git-worktree-support仕様書更新 | 4.2 | Feature | ✅ |
| 5.3 | bugs-worktree-support仕様書更新 | 4.3 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Cross-Document Contradictions

#### 検証済み: skill-reference.mdの更新（レビュー#1 CRITICAL-001修正）

**確認結果**: skill-reference.md（行217-229）が正しく更新されている：

```markdown
**worktree配置**:
{project}/
├── .kiro/
│   ├── specs/
│   ├── bugs/
│   └── worktrees/                # worktree配置（git管理対象外）
│       ├── specs/
│       │   └── {feature-name}/   # Spec worktree
│       └── bugs/
│           └── {bug-name}/       # Bug worktree
└── ...
```

- Spec用worktreeパス（`.kiro/worktrees/specs/{feature-name}`）が追記されている ✅
- Bug用worktreeパス（`.kiro/worktrees/bugs/{bug-name}`）が更新されている ✅
- bug.jsonのworktree.pathフィールド例も新パス形式に更新されている ✅

#### 未解決: 既存仕様書のパス記述（レビュー#1 WARNING-003）

**現状確認**: git-worktree-support/design.md および bugs-worktree-support/design.md には、まだ旧パス形式（`../{project}-worktrees/`）の記述が残っている。

**git-worktree-support/design.md**（確認箇所）:
- 行299-304: WorktreeInfo型のpathコメント `// 相対パス（mainプロジェクトルート基準）` - パス形式例の記述なし
- 行336-343: Supporting References - getWorktreePathの変更前コード例（`../${worktreeDir}/${featureName}`）
- 行345-352: Supporting References - getBugWorktreePathの変更前コード例

**bugs-worktree-support/design.md**（確認箇所）:
- 行283-289: BugWorktreeConfig型のpathコメント `/** Relative path from main project root: ../{project}-worktrees/bugs/{bug-name} */`
- 行413: getBugWorktreePathメソッドの説明
- 行456: パス形式説明 `../{project}-worktrees/bugs/{bug-name}`
- 行696: Logical Data Model `../{project}-worktrees/bugs/{bug-name}`

**判定**: これらはTask 4.2, 4.3で更新予定であり、tasks.mdに具体的な更新対象セクションが明示されている。**実装フェーズで対応すれば問題なし**。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING-001: 既存仕様書の旧パス記述残存

**問題**:
git-worktree-support/design.md および bugs-worktree-support/design.md には、旧パス形式（`../{project}-worktrees/`）の記述が複数箇所に残っている。

**影響**:
- 実装者が既存仕様書を参照した際に混乱する可能性
- 新パス形式と旧パス形式が混在する状態

**推奨アクション**:
- Task 4.2, 4.3実行時に、tasks.mdに明示された更新対象セクションを確実に更新
- `grep -r "\.\.\/.*-worktrees"` で漏れがないか最終確認

**判定**: **Warning**（実装フェーズで対応予定、仕様書修正不要）

### 2.2 Operational Considerations

**良好な点**:
- レビュー#1で指摘されたWARNING-002（既存worktreeの移行考慮）はOut of Scopeとして意図的に除外されており、Decision Logに記載済み
- .gitignore更新はTask 3.1で明示されている

## 3. Ambiguities and Unknowns

#### INFO-001: design.mdのSupporting Referencesセクション

**観察**:
design.mdの「Supporting References」セクション（行336-370）には、変更前のコード例が記載されている。これは意図的に「変更前→変更後」の対比を示すためのものと推測される。

**確認事項**:
- 実装時にこれらのコード例を参照する際は「変更後」の記述（行199-202のImplementation Notes）を使用すること

**判定**: **Info**（文書構造として問題なし）

#### INFO-002: セキュリティ検証の詳細実装

**観察**:
design.mdのresolveWorktreePathメソッドの説明（行188-196）では、セキュリティ検証として以下が規定されている：
- path.resolve + path.normalize でパス正規化
- プロジェクトディレクトリ内に収まることを検証

**確認事項**:
- 実装時には、シンボリックリンク解決（fs.realpath）も考慮する必要がある場合がある
- 現行のgit-worktree-support/design.mdではシンボリックリンク解決が言及されている（行341）

**判定**: **Info**（実装詳細、テストで検証可能）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- 既存のWorktreeServiceパターンを踏襲しており、アーキテクチャ一貫性が保たれている
- IPC handler -> Service -> External のフローが維持されている
- SSOT原則に沿った設計（.kiro配下にSDD成果物を集約）
- KISS原則に沿った設計（後方互換性を排除しシンプルに）

**懸念点**:
- なし

### 4.2 Integration Concerns

**確認済み**:
- skill-reference.mdが新パス形式に更新されており、スキル実行時の参照先が正しい
- bug-*コマンド群のworktree配置記述が更新されている

**実装フェーズで対応**:
- git-worktree-support/design.md のパス記述更新（Task 4.2）
- bugs-worktree-support/design.md のパス記述更新（Task 4.3）

### 4.3 Migration Requirements

**確認済み**:
- Decision Logで「後方互換性は不要」と決定されている
- Out of Scopeに「レガシーパス検出機能」が明記されている
- リリースノートでの移行案内は実装フェーズ外の考慮事項

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| WARNING-001 | 既存仕様書の旧パス記述残存 | Task 4.2, 4.3実行時に確実に更新、grep検索で漏れ確認 |

### Suggestions (Nice to Have)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| INFO-001 | Supporting Referencesの変更前コード例 | 実装時はImplementation Notesを参照 |
| INFO-002 | シンボリックリンク解決の詳細 | 実装時にテストで検証 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | 既存仕様書の旧パス記述 | Task 4.2, 4.3実行時に`grep -r "\.\.\/.*-worktrees"` で検索し、全箇所を更新 | git-worktree-support/design.md, bugs-worktree-support/design.md |
| Info | 実装時の参照先 | Supporting ReferencesではなくImplementation Notesを参照 | - |
| Info | セキュリティ検証 | 実装時にシンボリックリンク解決の必要性を検討・テスト | - |

## 7. Conclusion

**レビュー結果**: **実装開始可能**

レビュー#1で指摘された重大な問題（CRITICAL-001: skill-reference.mdの更新範囲不足）は適切に修正されている。残る問題は1件の警告（既存仕様書の旧パス記述残存）のみであり、これはTask 4.2, 4.3の実装フェーズで対応予定。

**次のアクション**:
- `/kiro:spec-impl worktree-internal-path` で実装を開始
- Task 4.2, 4.3実行時に既存仕様書のパス記述を確実に更新

---

_This review was generated by the document-review command._
