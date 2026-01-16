# Specification Review Report #1

**Feature**: worktree-execution-ui
**Review Date**: 2026-01-17
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- steering: product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| 種別 | 件数 |
|------|------|
| Critical | 1 |
| Warning | 4 |
| Info | 3 |

全体として、仕様書は高品質で詳細に記述されている。ただし、1件のCritical課題（Requirements Traceabilityにおけるテスト関連タスクの抜け）と4件のWarning（Remote UI影響未明記、store配置場所、エラー処理詳細、検査パネル6.3への対応）が検出された。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**整合性: ✅ 良好**

全11要件（Requirement 1〜11）がDesignのRequirements Traceabilityテーブルに正しくマッピングされている。

| 観点 | 結果 |
|------|------|
| 全Requirements IDがDesignに存在 | ✅ |
| 各CriterionにComponent指定あり | ✅ |
| Out of Scopeの整合 | ✅ |

**詳細確認結果**:
- Requirement 1〜4: 型定義、判定関数、UI枠 → Design Section 4-5でカバー
- Requirement 5〜7: ロック、モード別UI → Design DD-004, DD-005でカバー
- Requirement 8: ImplStartButtons廃止 → Design DD-002でカバー
- Requirement 9〜11: 永続化、deploy分岐、表示条件 → Design System Flowsでカバー

### 1.2 Design ↔ Tasks Alignment

**整合性: ✅ 良好**

DesignのComponents and Interfaces (ImplFlowFrame, WorktreeModeCheckbox, worktree.ts, workflowStore) が全てTasksに反映されている。

| Designコンポーネント | Tasks対応 |
|---------------------|-----------|
| worktree.ts変更 | Task 1.1 |
| workflowStore拡張 | Task 2.1 |
| WorktreeModeCheckbox | Task 3.1 |
| ImplFlowFrame | Task 4.1, 4.2, 4.3 |
| WorkflowView統合 | Task 6.1, 6.2 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| UI Components | ImplFlowFrame, WorktreeModeCheckbox | Task 3.1, 4.1, 4.2, 4.3 | ✅ |
| Services | startImplNormalMode IPC | Task 5.1 | ✅ |
| Types/Models | WorktreeConfig拡張, 3判定関数 | Task 1.1 | ✅ |
| Store拡張 | workflowStore.isWorktreeModeSelected | Task 2.1 | ✅ |
| 既存コンポーネント更新 | SpecDetail, SpecListItem | Task 8.1, 8.2 | ✅ |
| deploy後処理 | specsWatcherService | Task 7.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**CRITICAL CHECK: 各CriterionがFeature Implementationタスクを持つか検証**

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | path オプショナル化 | 1.1 | Infrastructure | ✅ |
| 1.2 | worktreeモード保存形式 | 1.1 | Infrastructure | ✅ |
| 1.3 | 通常モード保存形式 | 1.1 | Infrastructure | ✅ |
| 1.4 | 未開始時worktreeなし | 1.1 | Infrastructure | ✅ |
| 2.1 | isWorktreeConfig改修 | 1.1 | Infrastructure | ✅ |
| 2.2 | isActualWorktreeMode追加 | 1.1 | Infrastructure | ✅ |
| 2.3 | 実装開始済み判定 | 1.1, 6.2 | Infrastructure + Feature | ✅ |
| 3.1 | 実装フロー枠表示 | 4.1, 9.1 | Feature | ✅ |
| 3.2 | チェックボックス配置 | 4.1 | Feature | ✅ |
| 3.3 | DocumentReviewPanel枠外 | 4.1, 6.1 | Feature | ✅ |
| 4.1 | チェックボックス連動 | 2.1, 3.1, 9.1 | Feature | ✅ |
| 4.2 | 即座反映 | 2.1, 3.1, 9.1 | Feature | ✅ |
| 4.3 | 既存worktree自動ON | 3.1, 4.3, 9.2 | Feature | ✅ |
| 5.1 | 実装開始時ロック | 3.1, 4.3, 9.1 | Feature | ✅ |
| 5.2 | branch存在時ロック | 3.1, 4.3 | Feature | ✅ |
| 5.3 | deploy完了後リセット | 7.2 | Feature | ✅ |
| 5.4 | 自動実行中変更可能 | 3.1, 4.3 | Feature | ✅ |
| 6.1 | 背景色変更 | 4.2 | Feature | ✅ |
| 6.2 | 実装ボタンラベル変更 | 4.2 | Feature | ✅ |
| 6.3 | 検査パネル従来表示 | - | Infrastructure (変更なし) | ⚠️ (下記参照) |
| 6.4 | コミットパネルラベル変更 | 4.2 | Feature | ✅ |
| 7.1 | 通常モード背景維持 | 4.2 | Feature | ✅ |
| 7.2 | 通常モードパネル維持 | 4.2 | Feature | ✅ |
| 8.1 | ImplStartButtons非使用 | 6.1 | Feature | ✅ |
| 8.2 | 独立ボタン廃止 | 6.1 | Feature | ✅ |
| 8.3 | PhaseItem実行 | 6.1, 6.2 | Feature | ✅ |
| 9.1 | 通常モード永続化 | 5.1, 9.2 | Feature | ✅ |
| 9.2 | branch保存 | 5.1 | Feature | ✅ |
| 9.3 | ファイル監視更新 | 5.2 | Feature | ✅ |
| 10.1 | spec-merge実行 | 7.1, 9.2 | Feature | ✅ |
| 10.2 | /commit実行 | 7.1, 9.2 | Feature | ✅ |
| 10.3 | worktreeフィールド削除 | 7.2 | Feature | ✅ |
| 11.1 | path存在時のみ表示 | 8.1 | Feature | ✅ |
| 11.2 | 通常モード非表示 | 8.1 | Feature | ✅ |
| 11.3 | バッジ条件 | 8.2 | Feature | ✅ |

**Validation Results**:
- [x] 全criterion IDsがrequirements.mdからマッピングされている
- [x] ユーザー向けcriteriaにFeature Implementationタスクがある
- [ ] 6.3はテストによる検証が必要（下記Warning参照）

### 1.5 Cross-Document Contradictions

**検出された矛盾: なし ✅**

用語・数値・依存関係の矛盾は検出されなかった。

## 2. Gap Analysis

### 2.1 Technical Considerations

| 観点 | 現状 | Gap |
|------|------|-----|
| エラー処理 | Design 7章で基本カバー | ⚠️ 通常モード開始時のエラー処理詳細が不足 |
| セキュリティ | 該当なし | ✅ |
| パフォーマンス | 該当なし | ✅ |
| ロギング | 既存機構利用を明記 | ✅ |
| テスト戦略 | Design 8章で定義 | ⚠️ Task 1.1のユニットテストに関数ごとのケース詳細なし |

**Gap詳細**:

1. **通常モード開始時のエラー処理**（Warning）
   - Requirements 9.1〜9.3で通常モード永続化を定義
   - Design Section 7でエラーカテゴリを記載
   - しかし「カレントブランチ名取得失敗」時の具体的な処理が未定義
   - 提案: `git rev-parse --abbrev-ref HEAD` 失敗時のfallback/エラー表示を明記

2. **判定関数のユニットテスト詳細**（Info）
   - Task 1.1でテスト作成を記載
   - テストケースの網羅性（境界値、異常値）は実装時に確認

### 2.2 Operational Considerations

| 観点 | 現状 | Gap |
|------|------|-----|
| デプロイ | N/A（UIのみ） | ✅ |
| ロールバック | N/A | ✅ |
| 監視・ロギング | 既存機構 | ✅ |
| ドキュメント更新 | steering更新不要 | ✅ |

## 3. Ambiguities and Unknowns

### 3.1 明示的なOpen Questions

**requirements.md Line 151**:
> deploy完了後の `worktree` フィールド削除は、通常モード・worktreeモード両方で行うべきか？

**Design回答**: DD-005で「両方で削除」と決定済み ✅

### 3.2 検出された曖昧箇所

1. **「紫系」背景色の具体値**（Info）
   - Requirements 6.1: 「微妙に変更」
   - Design: 「紫系」
   - 実装委任と明記されているが、既存worktree情報表示の色コードを参照すべき

2. **チェックボックス連動の「即座反映」**（Info）
   - Requirements 4.2: 「即座に両方に反映」
   - Design: Zustand reactivityで実現
   - 技術的には問題ないが、ネットワーク遅延時の挙動（ローカル状態のため該当なし）を明確にすると良い

3. **「自動実行ボタン横のチェックボックス」の位置**（Warning）
   - Requirements 4.1: 「実装フロー枠内のチェックボックスと自動実行ボタン横のチェックボックスが連動」
   - Design: workflowStoreで単一状態管理
   - しかし、「自動実行ボタン横のチェックボックス」の具体的なUI配置がDesignに未記載
   - 現在のAutoExecutionトグルボタン周辺にworktreeチェックボックスを追加するのか、ImplFlowFrame内のみなのか不明確

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**tech.md準拠チェック**:

| 項目 | 準拠状況 |
|------|----------|
| React 19 + TypeScript | ✅ |
| Zustand状態管理 | ✅ |
| Tailwind CSS 4 | ✅ |
| IPC設計パターン | ✅ |
| spec.json updated_at更新ルール | ✅ (worktree永続化はユーザーアクション) |

**structure.md準拠チェック**:

| 項目 | 準拠状況 | 備考 |
|------|----------|------|
| コンポーネント配置 | ⚠️ | 下記参照 |
| 命名規則 | ✅ | PascalCase |
| State管理ルール | ⚠️ | 下記参照 |

**Warning: Store配置場所の確認**
- Designでは `workflowStore` に `isWorktreeModeSelected` を追加と記載
- structure.md によると、Domain State は `shared/stores/`、UI State は `renderer/stores/`
- `isWorktreeModeSelected` は「UIの一時状態」（Design 353行）であるため、`renderer/stores/workflowStore` が正しい
- しかし、Requirements 4.1では「連動」が必要であり、Remote UIでも同じ状態を共有する場合は `shared/stores/` が適切
- **確認必要**: この機能はRemote UIでも利用可能にするか？

### 4.2 Integration Concerns

**tech.md「新規Spec作成時の確認事項」に基づくチェック**:

| 確認項目 | 結果 |
|----------|------|
| Remote UI影響有無 | ❌ **未明記** |
| Desktop専用機能か | 不明 |
| WebSocketハンドラ追加要否 | 不明 |

**Critical: Remote UI影響未明記**

tech.md では「requirements.md に『Remote UI対応: 要/不要』を記載」と規定されているが、本仕様には記載がない。

Design Non-Goalsには「Remote UIへの対応（本仕様はElectron UI専用）」とあるが、requirements.mdへの明記が必要。

### 4.3 Migration Requirements

| 項目 | 影響 |
|------|------|
| データ移行 | なし（新規フィールドはオプショナル追加） |
| 後方互換性 | ✅ 維持（WorktreeConfig.pathはオプショナル化のみ） |
| フェーズ移行 | なし |

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | 課題 | 推奨アクション |
|----|------|---------------|
| C-1 | Remote UI対応の明記漏れ | requirements.mdに「Remote UI対応: 不要（Electron専用）」を追加 |

### Warnings (Should Address)

| ID | 課題 | 推奨アクション |
|----|------|---------------|
| W-1 | 「自動実行ボタン横のチェックボックス」のUI配置未定義 | Designに具体的な配置を追記、またはRequirements 4.1を修正 |
| W-2 | workflowStoreの配置（shared vs renderer） | Remote UI対応不要であればrenderer/stores、必要であればshared/storesと明記 |
| W-3 | 通常モード開始時のブランチ名取得失敗時の処理 | Designのエラー処理セクションに追記 |
| W-4 | Criterion 6.3（検査パネル従来表示）のテスト | Task 9.1または4.2に「InspectionPanelが変更されていないことを確認」を追加 |

### Suggestions (Nice to Have)

| ID | 課題 | 推奨アクション |
|----|------|---------------|
| I-1 | 背景色の具体値 | 既存worktree情報表示のTailwindクラスをDesignに参照記載 |
| I-2 | 判定関数テストケース詳細 | Task 1.1に境界値テストケースの例を追加 |
| I-3 | 「即座反映」の技術的根拠明記 | DesignにZustand subscribeの動作を補足 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | Remote UI対応未明記 | 「## Remote UI対応: 不要」セクションを追加 | requirements.md |
| Warning | 自動実行ボタン横チェックボックス | UI配置を明確化するか、Req 4.1を「ImplFlowFrame内のチェックボックスのみ」に修正 | requirements.md, design.md |
| Warning | workflowStore配置 | 「renderer/stores/workflowStore（UI状態）」と明記 | design.md |
| Warning | ブランチ名取得失敗時処理 | エラーハンドリングに追記 | design.md |
| Warning | 6.3検証タスク | 統合テストに追加 | tasks.md |
| Info | 背景色参照 | 既存クラス名を記載 | design.md |

---

_This review was generated by the document-review command._
