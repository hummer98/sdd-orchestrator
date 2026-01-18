# Specification Review Report #1

**Feature**: impl-start-unification
**Review Date**: 2026-01-18
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- steering: product.md, tech.md, structure.md, design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 2 |
| Info | 3 |

**総合評価**: 仕様は全体的に高品質であり、要件・設計・タスク間の整合性が取れている。いくつかの軽微な改善点があるが、実装を進めるに支障はない。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**整合性: ✅ 良好**

すべての要件が設計でカバーされており、トレーサビリティも明確に定義されている。

| Requirement | Design Coverage | Status |
|-------------|-----------------|--------|
| Req 1: startImplPhase 集約 | startImplPhase 関数設計、Service Interface | ✅ |
| Req 2: Worktree 前提条件チェック | Error Categories, 分岐処理 | ✅ |
| Req 3: Auto Execution 統合 | handlers.ts 修正設計 | ✅ |
| Req 4: Thin Client 化 | WorkflowView.tsx 簡略化 | ✅ |
| Req 5: 既存コード削除 | 削除対象コード明記 | ✅ |

### 1.2 Design ↔ Tasks Alignment

**整合性: ✅ 良好**

設計で定義されたすべてのコンポーネントに対応するタスクが存在する。

| Design Component | Task Coverage | Status |
|------------------|---------------|--------|
| startImplPhase 関数 | Task 1.1, 1.2, 1.3 | ✅ |
| IPC チャンネル・preload | Task 2.1, 2.2 | ✅ |
| execute-next-phase 修正 | Task 3.1 | ✅ |
| WorkflowView 簡略化 | Task 4.1 | ✅ |
| テスト更新 | Task 5.1, 5.2, 5.3 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | WorkflowView.tsx 修正 | Task 4.1 | ✅ |
| Services | startImplPhase | Task 1.1, 1.2, 1.3 | ✅ |
| Types/Models | StartImplParams, ImplStartResult, ImplStartError | Task 1.1 | ✅ |
| IPC Channels | START_IMPL | Task 2.1, 2.2 | ✅ |
| Preload API | startImpl | Task 2.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | startImplPhase() が worktree.enabled に応じて分岐 | 1.1, 1.2, 1.3 | Feature | ✅ |
| 1.2 | startImplPhase() パラメータ定義 | 1.1 | Feature | ✅ |
| 1.3 | startImplPhase() 戻り値型定義 | 1.1 | Feature | ✅ |
| 2.1 | Worktree モード + 非 main ブランチでエラー | 1.2, 5.1 | Feature | ✅ |
| 2.2 | Worktree モード + main ブランチで作成・実行 | 1.2, 5.1 | Feature | ✅ |
| 2.3 | Worktree 無効時はブランチチェックスキップ | 1.3, 5.1 | Feature | ✅ |
| 3.1 | execute-next-phase で startImplPhase 呼び出し | 3.1, 5.3 | Feature | ✅ |
| 3.2 | エラー時に coordinator.handleAgentCompleted(failed) | 3.1 | Feature | ✅ |
| 3.3 | 成功時に coordinator.setCurrentPhase | 3.1 | Feature | ✅ |
| 4.1 | handleImplExecute が startImpl IPC のみ呼び出し | 4.1, 5.2 | Feature | ✅ |
| 4.2 | startImpl IPC パラメータ定義 | 2.1, 2.2 | Feature | ✅ |
| 4.3 | IPC エラー時に notify.error() | 4.1, 5.2 | Feature | ✅ |
| 4.4 | preload.ts に startImpl API 追加 | 2.1 | Feature | ✅ |
| 5.1 | handleImplExecute から Worktree ロジック削除 | 4.1 | Feature | ✅ |
| 5.2 | handleImplExecute から normalModeImplStart 削除 | 4.1 | Feature | ✅ |
| 5.3 | 既存テストの修正・パス | 5.1, 5.2, 5.3 | Feature | ✅ |

**Validation Results**:
- [x] すべての criterion ID が requirements.md から tasks.md にマッピング済み
- [x] ユーザー向け基準には Feature Implementation タスクがある
- [x] Infrastructure のみに依存する基準は存在しない

### 1.5 Cross-Document Contradictions

**矛盾なし**: ドキュメント間で用語、仕様、数値の矛盾は検出されませんでした。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ⚠️ Warning: Remote UI 影響の未記載

**Issue**: tech.md の「新規Spec作成時の確認事項」に「Remote UI影響チェック」が求められているが、requirements.md に Remote UI への影響有無が明記されていない。

**分析**:
- impl 開始処理は IPC 経由で呼び出されるため、Remote UI（WebSocket経由）からも理論的にはアクセス可能
- 設計では IPC ハンドラ（`startImpl`）が追加されるが、WebSocket ハンドラの対応は言及されていない

**推奨**:
- requirements.md に「Remote UI対応: 不要」または「Remote UI対応: 要（WebSocketハンドラ追加）」を明記すべき
- 不要の場合、その理由（impl 操作は Desktop UI からのみ許可等）を記載

#### ℹ️ Info: ログ出力の詳細未指定

**Issue**: design.md の Monitoring セクションで「全エラーを ProjectLogger に出力」とあるが、具体的なログフォーマットやログレベルの指定がない。

**分析**: steering/logging.md を参照すべきだが、現在の設計で十分実装可能。

**推奨**: 実装時に steering/logging.md のパターンに従えば問題なし。

#### ℹ️ Info: startImplPhase 配置場所の未指定

**Issue**: 新規関数 `startImplPhase()` のファイル配置場所が明記されていない。

**分析**: structure.md によると Main Process サービスは `main/services/` に配置すべき。

**推奨**:
- 既存の `worktreeImplHandlers.ts` に追加
- または新規ファイル `implPhaseService.ts` を `main/services/` に作成

### 2.2 Operational Considerations

**問題なし**: 本機能はデプロイ手順やロールバック戦略に影響しない内部リファクタリング。

## 3. Ambiguities and Unknowns

### ⚠️ Warning: commandPrefix のデフォルト値

**Issue**: design.md の execute-next-phase 修正コードで `commandPrefix: 'kiro'` がハードコードされている。

**分析**:
- 手動実行では `workflowStore.commandPrefix` を使用
- Auto Execution では `'kiro'` をハードコード
- 一貫性の観点から問題となる可能性

**推奨**:
- context に commandPrefix を含めるか、設定から取得するかを明確化
- 設計の意図を確認し、必要なら requirements に追記

### ℹ️ Info: spec.json 更新タイミング

**Issue**: Worktree 作成後の spec.json 更新が `startImplPhase` 内で行われるか、既存の `handleImplStartWithWorktree` 内で行われるかが不明確。

**分析**: 設計では「startImplPhase 内で更新」と読めるが、既存関数の再利用が示唆されている。

**推奨**: 実装時に既存関数の責務を確認し、重複を避ける。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**✅ 完全適合**

- **DRY原則**: impl 開始ロジックを単一関数に集約（重複排除）
- **SSOT原則**: startImplPhase が impl 開始の唯一の実行経路
- **Thin Client パターン**: Renderer は IPC 呼び出しのみに簡略化
- **IPC設計パターン**: tech.md で定義された channels.ts + handlers.ts パターンに準拠

### 4.2 Integration Concerns

**問題なし**:
- 既存の WorktreeService, specManagerService との統合は明確
- execute() API は既存インターフェースを維持

### 4.3 Migration Requirements

**不要**:
- 既存データへの影響なし
- spec.json スキーマの変更なし
- 後方互換性を維持

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

1. **Remote UI 影響の明記**
   - requirements.md に Remote UI 対応の有無を追記
   - WebSocket ハンドラの追加要否を明確化

2. **commandPrefix 一貫性**
   - Auto Execution でのハードコードを避け、設定から取得する方法を検討
   - または、意図的なハードコードであれば理由を設計に記載

### Suggestions (Nice to Have)

1. **startImplPhase 配置場所の明記**
   - design.md に「新規ファイル: `main/services/implPhaseService.ts`」または「既存ファイル: `worktreeImplHandlers.ts` に追加」を記載

2. **ログ出力仕様の詳細化**
   - 各エラータイプに対応するログレベル（error/warn）を明記

3. **spec.json 更新責務の明確化**
   - startImplPhase と handleImplStartWithWorktree の責務境界を明確に

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | Remote UI 影響未記載 | 「Remote UI対応: 不要（Desktop専用操作）」を requirements.md に追記 | requirements.md |
| Warning | commandPrefix ハードコード | Auto Execution の commandPrefix 取得方法を設計に明記 | design.md |
| Info | 配置場所未指定 | startImplPhase の配置ファイルを明記 | design.md |
| Info | ログ仕様未詳細 | エラータイプ別ログレベルを追記 | design.md |
| Info | 責務境界不明確 | spec.json 更新の責務を明確化 | design.md |

---

_This review was generated by the document-review command._
