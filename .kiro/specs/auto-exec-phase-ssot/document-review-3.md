# Specification Review Report #3

**Feature**: auto-exec-phase-ssot
**Review Date**: 2026-02-14
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-1.md, document-review-1-reply.md, document-review-2.md, document-review-2-reply.md, product.md, tech.md, structure.md, design-principles.md, autoExecutionCoordinator.ts (ソースコード)

## Executive Summary

前回レビュー（#2）で指摘された W-4（`renderer/types/` 初 import 注記）と W-5（移動先位置の詳細）は tasks.md に正しく反映済み。今回はソースコードのランタイム動作を深掘りし、設計書のマッピング定義と実装の整合性を精査した。

**新たに発見した Warning 1件** を報告する。全体として高品質な仕様であり、Critical は存在しない。

| 重要度 | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 1 |
| Info | 1 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: 良好（前回 #2 と同様）**

全 5 Requirements が Design に正確にトレースされている。矛盾なし。

### 1.2 Design ↔ Tasks Alignment

**結果: 良好（前回 #2 と同様）**

### 1.3 Design ↔ Tasks Completeness

**結果: 良好（前回 #2 と同様）**

### 1.4 Acceptance Criteria → Tasks Coverage

**結果: 良好（前回 #2 と同様）**

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

**結果: 良好（前回 #2 と同様）**

### 1.6 Cross-Document Contradictions

#### ⚠️ WARNING W-6: `deploy-complete` → `'deploy'` マッピングと `PHASE_ORDER` の不整合

- **requirements.md** (Req 2, Criterion 2.1): `deploy-complete` → `'deploy'` をマッピング定義
- **design.md** (Data Models): 同じマッピング表を記載
- **tasks.md** (Task 1.1): switch 文で `deploy-complete` → `'deploy'` を実装する指示

- **ソースコード**: `PHASE_ORDER` 定数（L47）は `['requirements', 'design', 'tasks', 'document-review', 'impl', 'inspection']` であり、**`'deploy'` を含まない**

**問題点**:

`getLastCompletedPhase` が `'deploy'` を返した場合、`start()` メソッド L593 で `getImmediateNextPhase(lastCompletedPhase, ...)` が呼ばれる。`getImmediateNextPhase` は内部で `PHASE_ORDER.indexOf(currentPhase)` を使用する（L1067）。

```
PHASE_ORDER.indexOf('deploy') = -1
startIndex = -1 + 1 = 0
PHASE_ORDER[0] = 'requirements'
```

つまり、`deploy-complete` 状態で自動実行を開始すると、**全フェーズ完了済みにもかかわらず requirements から再開される**バグが発生する。

**分析**:

現行コードでは `deploy` は `PHASE_ORDER` の線形フロー外で処理される（inspection 完了後の特殊フロー: L1278-1294 で `execute-spec-merge` イベントを発火）。`WorkflowPhase` 型には `'deploy'` が含まれるが、`PHASE_ORDER` には意図的に含まれていない。

設計書のマッピング通りに `getLastCompletedPhase('deploy-complete') → 'deploy'` を実装することは型としては正しいが、`getImmediateNextPhase` がこの値を正しくハンドリングできない。

**影響**:

現実的なリスクは**低い**。`deploy-complete` 状態の spec で自動実行を再度開始するユースケースは稀であり、通常は deploy 完了 = ワークフロー完了。ただし、マッピング表通りに実装すると `getImmediateNextPhase` との組み合わせで潜在的なバグとなる。

**推奨対処**:

以下のいずれかで対処:
1. **（推奨）** `getLastCompletedPhase` で `deploy-complete` に対しても `'inspection'` を返す（`PHASE_ORDER` の最終要素を返す方針に統一）。これにより `getImmediateNextPhase` は `startIndex = 6 >= PHASE_ORDER.length` で `null`（完了）を正しく返す
2. design.md のマッピング表を変更: `deploy-complete` → `'inspection'` に修正
3. `getImmediateNextPhase` に `PHASE_ORDER` に存在しない `WorkflowPhase` が渡された場合の安全処理を追加（例: `indexOf === -1` の場合は `null` を返す）

## 2. Gap Analysis

### 2.1 Technical Considerations

**エラーハンドリング**: ✅ 十分

**セキュリティ**: ✅ 該当なし

**パフォーマンス**: ✅ 該当なし

**テスト戦略**: ✅ 網羅的

**ロギング**: ✅ 既存パターンで対応

### 2.2 Operational Considerations

✅ 問題なし

## 3. Ambiguities and Unknowns

### ℹ️ INFO I-6: `getImmediateNextPhase` の `PHASE_ORDER.indexOf` 防御

`getImmediateNextPhase` は `PHASE_ORDER.indexOf(currentPhase)` の結果が `-1`（`PHASE_ORDER` に存在しない `WorkflowPhase`）の場合の防御コードを持たない。これは現行コードでは `getLastCompletedPhase` が `PHASE_ORDER` 内の値しか返さないため問題にならないが、今回のシグネチャ変更で `'deploy'` を返す可能性が生まれる。

W-6 の対処により解消されるため、独立した修正は不要。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: 完全に整合**

- Main Process ロジックのみの変更であり、Electron Process Boundary Rules に準拠
- `spec.json.phase` をデータソースとすることは SSOT パターンと一致
- 設計原則（DRY, SSOT, KISS, YAGNI）に忠実

### 4.2 Integration Concerns

**結果: W-6 を除き影響なし**

W-6 は `getImmediateNextPhase` との間接的な連携に関する問題であり、直接的な API 変更はない。

### 4.3 Migration Requirements

**結果: 不要**

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| # | Issue | Detail |
|---|-------|--------|
| W-6 | `deploy-complete` → `'deploy'` と `PHASE_ORDER` の不整合 | `PHASE_ORDER` に `'deploy'` が含まれないため、`getImmediateNextPhase` が `'deploy'` を受け取ると `indexOf === -1` → `startIndex = 0` → requirements から再開するバグとなる。`'inspection'` を返すか、`getImmediateNextPhase` に防御コードを追加すべき |

### Suggestions (Nice to Have)

| # | Issue | Detail |
|---|-------|--------|
| I-6 | `getImmediateNextPhase` の `indexOf` 防御 | W-6 の対処に包含される |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-6: `deploy-complete` マッピング | （推奨A）requirements.md/design.md/tasks.md のマッピング表を `deploy-complete` → `'inspection'` に変更（`PHASE_ORDER` 最終要素に統一） | requirements.md, design.md, tasks.md |
| Warning | W-6: `deploy-complete` マッピング | （推奨B）または `getImmediateNextPhase` に `indexOf === -1` の防御処理を追加するタスクを tasks.md に追加 | tasks.md |

## 7. Previous Review Fixes Verification

### Review #2 Fixes

| Issue | Status | Detail |
|-------|--------|--------|
| W-4: `renderer/types/` 初 import 注記 | ✅ 修正済み | tasks.md Task 1.1 に「初の `renderer/types/` import」注記と「37ファイルで同パターン使用」の根拠が追記されている |
| W-5: 移動先位置の詳細 | ✅ 修正済み | tasks.md Task 2.1 に「`if (approvals)` ブロック直後、`getImmediateNextPhase` 直前（L590付近）」と `documentReviewStatus` の独立性が明記されている |
| I-4: `documentReviewStatus` の取得位置 | ❌ No Fix Needed（Reply で却下） | レビュー自体で問題なしと結論 |
| I-5: テストヘルパーの整理 | ❌ No Fix Needed（Reply で却下） | テスト内にヘルパー関数は存在しない |

### Review #1 Fixes

| Issue | Status | Detail |
|-------|--------|--------|
| W-1: テスト件数 | ✅ 修正済み（#2 で確認済み） |
| W-2: Import パスの曖昧さ | ❌ No Fix Needed（Reply で却下） |
| W-3: 行番号参照 | ❌ No Fix Needed（Reply で却下） |

---

_This review was generated by the document-review command._
