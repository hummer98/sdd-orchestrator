# Specification Review Report #1

**Feature**: git-worktree-support
**Review Date**: 2026-01-12
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- research.md

## Executive Summary

| カテゴリ | 件数 |
|----------|------|
| Critical | 2 |
| Warning | 5 |
| Info | 3 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- 全8要件（Req 1-8）がDesignのRequirements Traceability表で対応コンポーネント・インタフェースにマッピングされている
- 各コンポーネント定義に `Requirements` フィールドで対応要件IDが明記されている

**矛盾・ギャップ**:

| ID | 種別 | 内容 |
|----|------|------|
| C-1.1 | Critical | Requirement 6.1-6.4「自動実行フロー」のinspection連携について、Designに具体的なコンポーネント定義がない。`autoExecutionCoordinator` が言及されているが、インタフェース定義・フロー図がない |
| W-1.1 | Warning | Requirement 8「監視パスの切り替え」について、Design では `SpecsWatcherService拡張` と `WorktreeService.getWatchPath` が言及されているが、監視再初期化のトリガーと実装詳細が不明確 |

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- WorktreeConfig型定義（Task 1）→ Design Types セクション対応
- WorktreeService（Task 2）→ Design WorktreeService定義対応
- IPC Handlers（Task 3）→ Design IPC Handlers拡張対応
- spec-mergeスキル（Task 8）→ Design Skills セクション対応

**矛盾・ギャップ**:

| ID | 種別 | 内容 |
|----|------|------|
| W-1.2 | Warning | Task 9「自動実行フローへのinspection連携」に対応するDesignコンポーネント定義が不十分。`autoExecutionCoordinator` のインタフェース定義がない |
| I-1.1 | Info | Task 5.1「AgentListPanelにworktree識別インジケーター」の具体的なUI仕様（アイコン、バッジの種類）がDesignに未記載 |

### 1.3 Design ↔ Tasks Completeness

| カテゴリ | Design定義 | Task Coverage | Status |
|----------|------------|---------------|--------|
| Types (WorktreeConfig) | SpecJson.worktree | Task 1.1 | ✅ |
| Services (WorktreeService) | isOnMainBranch, createWorktree, removeWorktree, resolveWorktreePath, worktreeExists, getWatchPath | Task 2.1-2.5 | ✅ |
| Services (SpecManagerService拡張) | executeSpecMerge, worktreeCwd | Task 4.1-4.2 | ✅ |
| IPC (worktree:*) | check-main, create, remove, resolve-path | Task 3.1 | ✅ |
| UI (AgentListPanel拡張) | worktree識別表示 | Task 5.1 | ✅ |
| UI (WorkflowView拡張) | Deployボタン条件分岐 | Task 6.1 | ✅ |
| Services (SpecsWatcherService拡張) | 監視パス動的切り替え | Task 7.1 | ✅ |
| Skills (spec-merge) | マージ・クリーンアップ | Task 8.1-8.4 | ✅ |
| **Coordinator (自動実行フロー)** | **未定義** | Task 9.1-9.2 | ❌ |

### 1.4 Cross-Document Contradictions

| ID | 種別 | 内容 |
|----|------|------|
| C-1.2 | Critical | Requirements 6.3「inspection失敗時の修正とリトライ」vs Tasks 9.1の説明が不整合。Requirementsでは「問題が検出された場合、修正を試行して再度inspection」だが、誰が修正を行うか（AI Agent? spec-impl?）が不明 |
| W-1.3 | Warning | Requirements「7回試行」という数値がRequirements 6.4、Requirement 7.4、Tasks 8.3、9.1で言及されているが、inspection リトライとコンフリクト解決リトライが同じ7回なのか別々なのか不明確 |

## 2. Gap Analysis

### 2.1 Technical Considerations

| ID | 種別 | 内容 |
|----|------|------|
| W-2.1 | Warning | **エラーハンドリング**: worktree作成失敗後のロールバック戦略が不明確。部分的に作成されたブランチの削除処理は考慮されているか |
| W-2.2 | Warning | **セキュリティ**: spec.jsonのworktree.pathに悪意あるパス（シンボリックリンク、親ディレクトリトラバーサル）が設定された場合の検証がない |
| I-2.1 | Info | **ロギング**: WorktreeServiceの操作ログが言及されているが、具体的なログフォーマット・レベルの指定がない（steering/logging.md準拠の確認要） |

### 2.2 Operational Considerations

| ID | 種別 | 内容 |
|----|------|------|
| I-2.2 | Info | **デバッグ**: worktree操作のトラブルシューティング手順（debugging.md更新）が含まれていない |

## 3. Ambiguities and Unknowns

| ID | 内容 | 影響ドキュメント |
|----|------|------------------|
| A-1 | Open Questions「spec-merge失敗時のロールバック戦略」が未解決 | requirements.md |
| A-2 | Open Questions「複数のspecが同時にworktreeモード」の管理方法がresearch.mdでは「問題なし」と記載されているが、requirementsのOpen Questionsでは未解決扱い | requirements.md, research.md |
| A-3 | Requirements 6.3の「修正を試行して再度inspection」の「修正」実行主体が不明確 | requirements.md, tasks.md |
| A-4 | worktree作成時のパス形式 `../{project}-worktrees/{feature-name}` がgitデフォルトと異なる。Design/Requirementsでは「gitデフォルトの場所」と言及しているが、research.mdでは `../{project}-worktrees/{feature-name}` を推奨 | requirements.md, design.md, research.md |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- サービスレイヤーパターン採用（structure.md準拠）
- IPC Pattern準拠（channels.ts, handlers.ts）
- Zustand store利用（specStoreの拡張）

**注意点**:
- Remote UI影響について明示的に「初期スコープ外」と記載されている（tech.mdのチェックリスト準拠）

### 4.2 Integration Concerns

| ID | 内容 |
|----|------|
| I-4.1 | 既存のSpecsWatcherServiceへの変更が必要。監視パスの動的切り替えは既存の監視ロジックに影響する可能性あり |
| I-4.2 | SpecManagerService.startAgentへのcwdオプション追加は既存のAgent起動ロジックへの影響を確認要 |

### 4.3 Migration Requirements

特になし（新機能追加であり、既存データの移行は不要）。spec.jsonへのworktreeフィールドはオプショナルで後方互換性を維持。

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | 問題 | 推奨アクション |
|----|------|----------------|
| C-1.1 | 自動実行フローのDesign未定義 | design.mdに `autoExecutionCoordinator` のコンポーネント定義とフロー図を追加 |
| C-1.2 | inspection失敗時の修正主体が不明 | requirements.mdで「AIエージェントが修正」または「spec-implを再実行」を明確化 |

### Warnings (Should Address)

| ID | 問題 | 推奨アクション |
|----|------|----------------|
| W-1.1 | 監視パス切り替えの詳細不足 | design.mdに監視再初期化トリガー（spec.json変更検出時）の説明を追加 |
| W-1.2 | autoExecutionCoordinatorのインタフェース未定義 | Task 9実装前にdesign.mdへインタフェース追加 |
| W-1.3 | 7回リトライの適用範囲が不明確 | requirements.mdで「inspectionリトライ」と「コンフリクト解決リトライ」を別々に定義、または同一であることを明記 |
| W-2.1 | worktree作成失敗時のロールバック | design.mdのError Handlingセクションに部分作成時のクリーンアップ手順を追加 |
| W-2.2 | パス検証のセキュリティ考慮 | design.mdにWorktreeService.resolveWorktreePathでのパス正規化・検証を追加 |

### Suggestions (Nice to Have)

| ID | 問題 | 推奨アクション |
|----|------|----------------|
| I-1.1 | UI仕様の詳細不足 | design.mdにworktree識別インジケーターのUI仕様（アイコン種類等）を追加 |
| I-2.1 | ロギング詳細不足 | design.mdにsteering/logging.md準拠のログ出力仕様を追加 |
| I-2.2 | デバッグ手順未記載 | 実装後にsteering/debugging.mdにworktreeトラブルシューティングを追加 |

## 6. Action Items

| Priority | Issue ID | 問題 | 推奨アクション | 影響ドキュメント |
|----------|----------|------|----------------|------------------|
| Critical | C-1.1 | 自動実行フローのDesign未定義 | autoExecutionCoordinatorのコンポーネント定義・フロー図を追加 | design.md |
| Critical | C-1.2 | inspection修正主体が不明 | inspection失敗時の修正アクターを明確化 | requirements.md |
| Warning | W-1.1 | 監視パス切り替え詳細不足 | 再初期化トリガーの説明追加 | design.md |
| Warning | W-1.2 | autoExecutionCoordinator未定義 | インタフェース定義追加 | design.md |
| Warning | W-1.3 | 7回リトライの適用範囲 | inspection/コンフリクト解決の別々定義 | requirements.md |
| Warning | W-2.1 | ロールバック戦略 | 部分作成時のクリーンアップ追加 | design.md |
| Warning | W-2.2 | パス検証セキュリティ | パス正規化・検証の追加 | design.md |
| Info | A-2 | Open Questions不整合 | research.mdの結論をrequirements.mdに反映 | requirements.md |
| Info | A-4 | worktreeパス形式の不整合 | 「gitデフォルト」の定義を明確化 | requirements.md, design.md |

---

_This review was generated by the document-review command._
