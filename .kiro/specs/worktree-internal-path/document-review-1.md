# Specification Review Report #1

**Feature**: worktree-internal-path
**Review Date**: 2026-01-17
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/skill-reference.md`
- `.kiro/specs/git-worktree-support/design.md`
- `.kiro/specs/bugs-worktree-support/design.md`

## Executive Summary

| 重大度 | 件数 |
|--------|------|
| **Critical** | 1 |
| **Warning** | 3 |
| **Info** | 2 |

本仕様は、worktree作成場所をプロジェクト外（`../{project}-worktrees/`）からプロジェクト内（`.kiro/worktrees/`）に変更するものである。全体的によく設計されているが、**skill-reference.mdの更新範囲が不十分**という重大な問題と、いくつかの整合性・カバレッジに関する警告事項がある。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- 全てのRequirementがDesignで適切にカバーされている
- Requirements Traceability表が完備されており、各要件がコンポーネントと紐付けられている
- Design Decisionsが適切に文書化されている

**懸念点**:
- なし

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- Design.mdのComponents and Interfaces（WorktreeService変更箇所）がTasks 1.1, 1.2, 2.1で明示的にカバーされている
- ドキュメント更新タスク（4.1-4.3）がRequirement 5の各項目に対応している

**軽微な懸念**:
- Designの「Directory Structure」セクションで示されている`.kiro/worktrees/`の新規ディレクトリ作成について、Tasks側で明示的なタスクがない（Task 1.1/1.2のgetWorktreePathメソッド修正に含まれると推測されるが、明示されていない）

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | なし（バックエンド変更のみ） | N/A | ✅ |
| Services | WorktreeService（getWorktreePath, getBugWorktreePath, resolveWorktreePath） | 1.1, 1.2, 2.1 | ✅ |
| Types/Models | パス形式の変更（Data Models セクション） | 1.1, 1.2 | ✅ |
| Configuration | .gitignore | 3.1 | ✅ |
| Documentation | skill-reference.md, git-worktree-support, bugs-worktree-support | 4.1, 4.2, 4.3 | ⚠️ (下記参照) |

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
| 5.1 | skill-reference.mdパス記述更新 | 4.1 | Feature | ⚠️ |
| 5.2 | git-worktree-support仕様書更新 | 4.2 | Feature | ✅ |
| 5.3 | bugs-worktree-support仕様書更新 | 4.3 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Cross-Document Contradictions

#### CRITICAL-001: skill-reference.mdの更新範囲不足

**問題**:
Requirement 5.1は「skill-reference.mdのworktreeパス記述を更新する」と規定している。Task 4.1もこれに対応している。

しかし、**現行のskill-reference.md**を確認すると：

```markdown
**worktree配置**:
{parent-dir}/
├── {project}/                    # メインプロジェクト
└── {project}-worktrees/
    └── bugs/
        └── {bug-name}/           # Bug worktree
```

この記述は**Bug用のworktreeパスのみ**を示しており、**Spec用のworktreeパス**（`../{project}-worktrees/{feature}`）の記述が見当たらない。

さらに、**bug.jsonのworktree.pathフィールド例**も以下のように記載されている：

```json
"worktree": {
  "path": "../project-worktrees/bugs/memory-leak-fix",
  ...
}
```

**影響**:
- Task 4.1の説明には「bug.jsonのworktree.pathフィールド例を新パス形式に更新」とあるが、これはBug用のみ
- Spec用（spec.json）のworktree.pathフィールド例も存在する可能性があるが、skill-reference.mdには見当たらない
- git-worktree-support/design.mdにも詳細なパス記述がある（これはTask 4.2でカバー予定）

**推奨アクション**:
1. skill-reference.mdに**Spec用worktreeパス**の記述があるか再確認
2. もし記述がない場合、Requirement 5.1の範囲を明確化するか、skill-reference.mdに追記が必要
3. Task 4.1の説明を「Spec用およびBug用のworktreeパス記述を更新」に修正

## 2. Gap Analysis

### 2.1 Technical Considerations

#### WARNING-001: ディレクトリ自動作成の明示不足

**問題**:
`.kiro/worktrees/specs/`および`.kiro/worktrees/bugs/`ディレクトリが存在しない場合の自動作成について、Design/Tasksで明示されていない。

**現行コード分析**（推測）:
- `git worktree add`コマンドは中間ディレクトリを自動作成する可能性があるが、確実ではない
- WorktreeService実装時にディレクトリ存在確認と作成が必要になる可能性

**推奨アクション**:
- Design.mdのImplementation Notesに「ディレクトリ存在確認と自動作成」を追記
- または、既存のgit worktree addの動作で十分であることを確認

#### WARNING-002: 既存worktreeの移行考慮

**問題**:
Out of Scopeに「後方互換性（既存の`../{project}-worktrees/`からの移行機能）」と明記されているが、**既存のworktreeが存在する状態で新コードをデプロイした場合**の動作が不明確。

**考えられるシナリオ**:
1. 既存spec.jsonに`worktree.path: "../project-worktrees/my-feature"`が保存されている
2. 新コードの`resolveWorktreePath`はこのパスを「プロジェクト外」としてエラーにする
3. 結果として、既存worktreeモードのSpecが操作不能になる可能性

**推奨アクション**:
- このシナリオが発生した場合のユーザー向け案内をREADMEまたはリリースノートに記載
- または、一時的な移行期間として旧パス検出・警告表示機能を検討（Out of Scopeの再検討）

### 2.2 Operational Considerations

#### INFO-001: .gitignore更新のタイミング

**観察**:
Task 3.1は「.gitignoreへのworktreeディレクトリ除外設定追加」を規定している。

**考慮点**:
- .gitignoreの更新は手動コミットが必要（自動では行われない）
- ユーザーが.gitignore更新を忘れると、worktree内のファイルがgit statusに表示される
- Task 5.1（統合動作検証）で「worktree内のファイルがgit statusに表示されない」を確認すると記載があるが、これは.gitignore更新後の確認であり、更新自体を忘れた場合のフォールバックはない

**推奨アクション**:
- ドキュメント更新時に、ユーザー向け.gitignore設定手順を明記
- または、worktree作成時に.gitignoreチェック・警告表示を検討（将来機能）

## 3. Ambiguities and Unknowns

#### INFO-002: エラーメッセージの日本語/英語

**観察**:
Design.mdのError Handling セクションで、エラーメッセージ例が英語で記載されている：

```
"Path validation failed: {relativePath} resolves outside project directory"
```

**考慮点**:
- spec.jsonのlanguage設定は「ja」（日本語）
- 既存のエラーメッセージが英語であれば一貫性は保たれる
- ただし、ユーザー向けUIメッセージとログ/内部エラーメッセージの区別が不明確

**推奨アクション**:
- 確認のみ（既存パターンに従う）

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- 既存のWorktreeServiceパターンを踏襲しており、アーキテクチャ一貫性が保たれている
- IPC handler -> Service -> External のフローが維持されている
- SSOT原則に沿った設計（.kiro配下にSDD成果物を集約）

**懸念点**:
- なし

### 4.2 Integration Concerns

#### WARNING-003: git-worktree-support/bugs-worktree-support仕様書との整合性

**観察**:
本仕様（worktree-internal-path）は、以下の既存仕様書に記載されているパス形式を変更する：
- `git-worktree-support/design.md`: `../{project}-worktrees/{feature}` → `.kiro/worktrees/specs/{feature}`
- `bugs-worktree-support/design.md`: `../{project}-worktrees/bugs/{bug}` → `.kiro/worktrees/bugs/{bug}`

**Tasks 4.2, 4.3**でこれらの更新が予定されているが、更新範囲が広い可能性がある：
- git-worktree-support/design.md内のパス記述箇所は多数（Supporting References、Data Models等）
- bugs-worktree-support/design.md内のパス記述箇所も同様

**推奨アクション**:
- Tasks 4.2, 4.3実行時に、grep等でパス記述を網羅的に検索し、漏れなく更新

### 4.3 Migration Requirements

**観察**:
Decision Logで「後方互換性は不要」と決定されている。

**考慮点**:
- 既存ユーザーが旧パス形式のworktreeを持っている場合、手動削除が必要
- リリースノートまたはCHANGELOG等での明確な案内が必要

**推奨アクション**:
- リリース時に移行手順を案内（Out of Scopeとして処理済みだが、ドキュメント化は必要）

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| CRITICAL-001 | skill-reference.mdの更新範囲不足 | Spec用worktreeパスの記述有無を確認し、Task 4.1の説明を明確化。必要に応じてskill-reference.mdにSpec用パス記述を追加 |

### Warnings (Should Address)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| WARNING-001 | ディレクトリ自動作成の明示不足 | Design.mdのImplementation Notesに追記、または既存動作で十分か確認 |
| WARNING-002 | 既存worktreeの移行考慮 | 移行案内をリリースノートに記載 |
| WARNING-003 | 既存仕様書の更新範囲 | Tasks 4.2, 4.3実行時にgrep等で網羅的に更新 |

### Suggestions (Nice to Have)

| ID | Issue | Recommended Action |
|----|-------|-------------------|
| INFO-001 | .gitignore更新のタイミング | ドキュメントに.gitignore設定手順を明記 |
| INFO-002 | エラーメッセージの言語 | 確認のみ（既存パターンに従う） |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Critical | skill-reference.mdのSpec用worktreeパス記述確認 | 現行skill-reference.mdを確認し、Spec用パス記述の有無を特定。なければRequirement 5.1の範囲を明確化 | requirements.md, tasks.md, skill-reference.md |
| Warning | ディレクトリ自動作成の明示 | Design.mdのWorktreeService Implementation Notesに「ディレクトリ自動作成」を追記 | design.md |
| Warning | 移行案内の準備 | リリースノートに旧パス形式からの移行手順を記載予定として認識 | （リリースノート） |
| Warning | 既存仕様書の更新漏れ防止 | Tasks 4.2, 4.3実行時にgrepで`../{project}-worktrees`を検索し、全箇所を更新 | git-worktree-support/design.md, bugs-worktree-support/design.md |
| Info | .gitignore案内 | Task 3.1完了後、ユーザー向け案内を検討 | （ユーザードキュメント） |

---

_This review was generated by the document-review command._
