# Specification Review Report #3

**Feature**: git-worktree-support
**Review Date**: 2026-01-14
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- research.md
- document-review-1.md
- document-review-1-reply.md
- document-review-2.md
- document-review-2-reply.md
- inspection-1.md
- inspection-2.md

## Executive Summary

| カテゴリ | 件数 |
|----------|------|
| Critical | 1 |
| Warning | 2 |
| Info | 2 |

**前回レビュー（#2）からの状況**:
- spec.jsonのphaseは`inspection-complete`だが、tasks.mdではTask 14-15が未完了
- Requirement 9（Impl開始UIの分岐）の実装タスクが未完了

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- Requirement 1-8がDesignのRequirements Traceability表で適切にマッピングされている
- Requirement 9（Impl開始UIの分岐）もDesignに`ImplPanel拡張`として定義されている

**矛盾・ギャップ**:
なし

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- 全コンポーネントがタスクにマッピングされている
- design.mdのImplPanel拡張（Requirements 9.1-9.9）がTask 14に対応

**矛盾・ギャップ**:
なし

### 1.3 Design ↔ Tasks Completeness

| カテゴリ | Design定義 | Task Coverage | Status |
|----------|------------|---------------|--------|
| Types (WorktreeConfig) | SpecJson.worktree | Task 1.1 | ✅ |
| Services (WorktreeService) | isOnMainBranch, createWorktree等 | Task 2.1-2.5 | ✅ |
| Services (SpecManagerService拡張) | executeSpecMerge, worktreeCwd | Task 4.1-4.2 | ✅ |
| IPC (worktree:*) | check-main, create, remove, resolve-path | Task 3.1 | ✅ |
| UI (AgentListPanel拡張) | worktree識別表示 | Task 5.1 | ✅ |
| UI (WorkflowView拡張) | Deployボタン条件分岐 | Task 6.1 | ✅ |
| Services (SpecsWatcherService拡張) | 監視パス動的切り替え | Task 7.1 | ✅ |
| Skills (spec-merge) | マージ・クリーンアップ | Task 8.1-8.4 | ✅ |
| Coordinator (AutoExecutionCoordinator拡張) | inspection連携 | Task 9.1-9.2 | ✅ |
| Tests (統合テスト) | ユニット・E2E | Task 10.1-10.2 | ✅ |
| UI (SpecListItem) | worktreeバッジ表示 | Task 11.1-11.2 | ✅ |
| UI (SpecDetail) | worktree情報セクション | Task 12.1-12.2 | ✅ |
| UI (Remote UI) | worktree表示 | Task 13.1-13.2 | ✅ |
| **UI (ImplPanel拡張)** | **2ボタンUI、条件分岐** | **Task 14.1-14.4** | **❌ 未完了** |
| **Tests (Impl開始UIテスト)** | **UIテスト、E2Eテスト** | **Task 15.1-15.2** | **❌ 未完了** |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1-1.7 | Worktree自動作成 | 2.1-2.5, 4.1 | Feature | ✅ 完了 |
| 2.1-2.3 | spec.jsonのworktreeフィールド | 1.1 | Feature | ✅ 完了 |
| 3.1-3.2 | Agent起動時のpwd設定 | 4.2 | Feature | ✅ 完了 |
| 4.1-4.2 | Agent一覧でのworktree識別 | 5.1 | Feature | ✅ 完了 |
| 5.1-5.2 | Deployボタンの条件分岐 | 6.1 | Feature | ✅ 完了 |
| 6.1-6.5 | 自動実行フロー | 9.1-9.2 | Feature | ✅ 完了 |
| 7.1-7.8 | spec-mergeスキル | 8.1-8.4 | Feature | ✅ 完了 |
| 8.1-8.2 | 監視パスの切り替え | 7.1 | Feature | ✅ 完了 |
| **9.1** | **Implパネル2つのオプション提供** | **14.1** | **Feature** | **❌ 未完了** |
| **9.2** | **「カレントブランチで実装」ボタン表示** | **14.1** | **Feature** | **❌ 未完了** |
| **9.3** | **「Worktreeで実装」ボタン表示** | **14.1** | **Feature** | **❌ 未完了** |
| **9.4** | **「カレントブランチで実装」の動作** | **14.2** | **Feature** | **❌ 未完了** |
| **9.5** | **「Worktreeで実装」のmainブランチ確認** | **14.3** | **Feature** | **❌ 未完了** |
| **9.6** | **非mainブランチでのエラー表示** | **14.3** | **Feature** | **❌ 未完了** |
| **9.7** | **「Worktreeで実装」のworktree作成** | **14.3** | **Feature** | **❌ 未完了** |
| **9.8** | **worktreeフィールド既存時の表示** | **14.4** | **Feature** | **❌ 未完了** |
| **9.9** | **worktreeフィールド既存時のボタン非表示** | **14.4** | **Feature** | **❌ 未完了** |

**Validation Results**:
- [x] Requirement 1-8の全criterion IDがタスクにマッピングされている
- [ ] **Requirement 9の全criterion（9.1-9.9）に対応するTask 14がPending状態**
- [x] User-facing criteriaにはFeature Implementation tasksがある

### 1.5 Cross-Document Contradictions

| ID | 種別 | 内容 |
|----|------|------|
| C-1.1 | **Critical** | **spec.jsonのphaseが`inspection-complete`だが、tasks.mdのTask 14-15（Requirement 9対応）が未完了**。inspection-2.mdのTask Completion表にTask 14-15の検証結果が含まれていない |

## 2. Gap Analysis

### 2.1 Technical Considerations

| ID | 種別 | 内容 |
|----|------|------|
| W-2.1 | Warning | **Task 14.3のIPCチャンネル**: Task定義に「WORKTREE_IMPL_START IPCチャネルの登録と接続」と記載があるが、design.mdのIPC Handlers拡張セクション（L455-462）には`worktree:impl-start`チャンネルが未定義。既存の`worktree:create`で代用可能か、新規チャンネルが必要か不明確 |
| I-2.1 | Info | **ユーザーフィードバック**: 「Worktreeで実装」ボタン押下後、worktree作成中のローディング状態表示がdesign.mdで未定義（UX観点） |

### 2.2 Operational Considerations

| ID | 種別 | 内容 |
|----|------|------|
| I-2.2 | Info | **ドキュメント更新**: steering/operations.mdにImplパネルの2ボタンUIの操作手順が追加される必要がある（実装後に対応予定と理解） |

## 3. Ambiguities and Unknowns

| ID | 内容 | 影響ドキュメント |
|----|------|------------------|
| W-3.1 | Warning: design.mdのImplPanel拡張セクション（L489-511）では「worktree:impl-start呼び出し」と記載があるが、Task 14.3では「WORKTREE_IMPL_START IPCチャネル」と命名が異なる。これが同一のチャネルを指すのか不明確 | design.md, tasks.md |

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- 既存のサービスレイヤーパターン、IPCパターンに準拠
- Zustand store利用（specStoreの拡張）
- design-principles.mdの原則に準拠
- Remote UI影響について「初期スコープ外」と明示

### 4.2 Integration Concerns

特になし

### 4.3 Migration Requirements

特になし（新機能追加であり、既存データの移行は不要）

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | 問題 | 推奨アクション |
|----|------|----------------|
| C-1.1 | spec.jsonのphaseが`inspection-complete`だがTask 14-15が未完了 | **以下のいずれかの対応が必要**: (1) phaseを`implementation`に戻してTask 14-15を完了させる、または (2) Task 14-15が不要になった場合はtasks.mdから削除し、Requirement 9の扱いを明確化する |

### Warnings (Should Address)

| ID | 問題 | 推奨アクション |
|----|------|----------------|
| W-2.1 | Task 14.3のIPCチャンネル定義不明確 | design.mdのIPC Handlers拡張セクションに`worktree:impl-start`（または相当するチャンネル）の仕様を追加するか、既存チャンネルで実装可能な場合はTask定義を更新 |
| W-3.1 | IPCチャンネル命名の不整合 | design.mdとtasks.mdで一貫した命名に統一（`worktree:impl-start`推奨） |

### Suggestions (Nice to Have)

| ID | 問題 | 推奨アクション |
|----|------|----------------|
| I-2.1 | worktree作成中のローディング表示未定義 | design.mdにローディング状態のUI仕様を追加（任意） |
| I-2.2 | 操作手順未更新 | 実装完了後にsteering/operations.mdを更新 |

## 6. Action Items

| Priority | Issue ID | 問題 | 推奨アクション | 影響ドキュメント |
|----------|----------|------|----------------|------------------|
| **Critical** | C-1.1 | phase/Task不整合 | phaseを修正するか、未完了タスクを完了 | spec.json, tasks.md |
| Warning | W-2.1 | IPCチャンネル定義不明確 | 設計に追加または既存で代用可能と明記 | design.md, tasks.md |
| Warning | W-3.1 | IPCチャンネル命名不整合 | 命名を統一 | design.md, tasks.md |
| Info | I-2.1 | ローディング表示 | 任意で仕様追加 | design.md |
| Info | I-2.2 | 操作手順 | 実装後に更新 | steering/operations.md |

---

## Review Comparison

### 前回（Review #2）からの変化

| Issue ID | 前回の状態 | 今回の状態 |
|----------|------------|------------|
| W-2.1 (Remote UI) | Fix Required | ✅ 解決済み（Out of Scopeに追記） |
| W-2.2 (feature-name検証) | Fix Required | ✅ 解決済み（入力検証仕様追加） |
| W-3.1 ({project}定義) | Fix Required | ✅ 解決済み（Decision Logに追記） |

### 新規検出

| Issue ID | 問題 | 種別 |
|----------|------|------|
| **C-1.1** | **spec.json phase/Task完了状態の不整合** | **Critical** |
| W-2.1 | Task 14.3のIPCチャンネル定義不明確 | Warning |
| W-3.1 | IPCチャンネル命名不整合 | Warning |
| I-2.1 | worktree作成中のローディング表示未定義 | Info |
| I-2.2 | 操作手順未更新 | Info |

---

## Analysis: Requirement 9の実装状況

### 現状

Requirement 9（Impl開始UIの分岐）は以下のAcceptance Criteriaを定義:
- 9.1: 2つのImpl開始オプション提供
- 9.2: 「カレントブランチで実装」ボタン表示
- 9.3: 「Worktreeで実装」ボタン表示
- 9.4: 「カレントブランチで実装」の動作
- 9.5-9.7: 「Worktreeで実装」の動作
- 9.8-9.9: worktreeフィールド既存時の条件分岐

### inspection-2.mdの検証結果との乖離

inspection-2.md（2026-01-13）では：
- Task 1-13が全てPASS
- **Task 14-15の検証結果が含まれていない**
- Requirement 9.1-9.9の個別検証が記載されていない

tasks.mdでは：
- Task 14.1-14.4: `[ ]` (未完了)
- Task 15.1-15.2: `[ ]` (未完了)

### 結論

**Requirement 9の実装が未完了の状態で`inspection-complete`phaseに移行している可能性が高い。**

対応オプション:
1. **Task 14-15を完了させる**: Requirement 9は明確な要件であり、ユーザーに選択肢を提供する重要な機能
2. **Requirement 9をスコープ外にする**: 要件を変更する場合はrequirements.md、design.md、tasks.mdの全てを更新する必要がある

---

_This review was generated by the document-review command._
