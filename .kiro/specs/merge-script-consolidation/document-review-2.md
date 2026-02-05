# Specification Review Report #2

**Feature**: merge-script-consolidation
**Review Date**: 2026-02-05
**Documents Reviewed**:
- `.kiro/specs/merge-script-consolidation/spec.json`
- `.kiro/specs/merge-script-consolidation/requirements.md`
- `.kiro/specs/merge-script-consolidation/design.md`
- `.kiro/specs/merge-script-consolidation/tasks.md`
- `.kiro/specs/merge-script-consolidation/document-review-1.md`
- `.kiro/specs/merge-script-consolidation/document-review-1-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.claude/commands/kiro/spec-merge.md`
- `.claude/commands/kiro/bug-merge.md`
- `.kiro/scripts/merge-spec.sh`
- `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts`
- `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.test.ts`
- `electron-sdd-manager/resources/templates/scripts/*.sh`

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| Warning | 2 |
| Info | 1 |

前回レビュー（#1）で指摘された W-001 は修正済み。今回のレビューでは、Tasks における HELPER_SCRIPTS の取り扱いに関する重要な不整合を発見しました。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ✅ 良好

前回レビューと同様、すべての要件が Design にマッピングされています。

### 1.2 Design ↔ Tasks Alignment

**Status**: ⚠️ 要確認

Design と Tasks の間に不整合があります。

| Design 記述 | Tasks 記述 | 現状 | Status |
|------------|-----------|------|--------|
| merge-spec.sh テンプレート版を UPDATE | 5.1 で同期更新 | テンプレート既存 | ✅ |
| merge-bug.sh テンプレート版を CREATE | 5.2 で新規作成 | 未存在 | ✅ |
| HELPER_SCRIPTS リスト更新 | 6.1 で追加 | 現在 merge-spec.sh は未含 | ⚠️ 要確認 |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| Scripts (.kiro/scripts/) | merge-spec.sh UPDATE, merge-bug.sh CREATE | 1.1, 1.2, 2.1, 2.2 | ✅ |
| Commands | spec-merge.md, bug-merge.md UPDATE | 4.1, 4.2 | ✅ |
| File Deletions | update-*-for-deploy.sh DELETE | 3.1, 3.2, 5.3, 5.4 | ✅ |
| Templates | merge-spec.sh UPDATE, merge-bug.sh CREATE | 5.1, 5.2 | ✅ |
| Installer | HELPER_SCRIPTS リスト更新 | 6.1 | ⚠️ 後述 |

### 1.4 Acceptance Criteria → Tasks Coverage

**Status**: ✅ 良好

前回レビュー #1 で確認済み。すべての Criterion ID が Feature タスクにマッピングされています。

### 1.5 Integration Test Coverage

**Status**: ℹ️ INFO

前回レビュー同様、E2E テスト不要の判断は妥当です（Design 358-364行）。

### 1.6 Refactoring Integrity Check (CRITICAL)

**Status**: ❌ 要修正

Design の Impact Analysis Contract と Tasks の整合性に問題があります。

#### 問題: HELPER_SCRIPTS の現状認識の誤り

**Design (377-378行)** の Impact Analysis Contract:
```
| `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` | UPDATE | テンプレート版の同期更新 |
| `electron-sdd-manager/resources/templates/scripts/merge-bug.sh` | CREATE | テンプレート版新規作成 |
```

**Tasks 6.1 の記述**:
```
- `merge-spec.sh` と `merge-bug.sh` をリストに追加
```

**現状調査結果**:
- `merge-spec.sh` テンプレートは**既に存在**（templates/scripts/merge-spec.sh）
- しかし **HELPER_SCRIPTS リストには含まれていない**（ccSddWorkflowInstaller.ts:138-143）
- `merge-bug.sh` テンプレートは**存在しない**

**問題点**:
1. Tasks 6.1 は「追加」と記述しているが、`merge-spec.sh` はリストにないだけでテンプレートは存在する
2. Design と Tasks で「merge-spec.sh をリストに追加」か「merge-spec.sh は既存」かの認識が曖昧
3. **merge-spec.sh がインストール対象でなかった理由が不明**（意図的な設計か、漏れか）

#### 影響分析

これが意図的な設計の場合:
- merge-spec.sh は .kiro/scripts/ に直接配置され、インストーラー経由では配布しない想定
- しかしその場合、Design の Impact Analysis Contract で「UPDATE」と記載されているのは矛盾

これが漏れの場合:
- HELPER_SCRIPTS に追加する必要があるが、**既存プロジェクトへの移行影響**を考慮すべき

### 1.7 Cross-Document Contradictions

| Check | Result | Detail |
|-------|--------|--------|
| merge-spec.sh のインストール方式 | ⚠️ 不明確 | Design: UPDATE (テンプレート版) vs 実態: HELPER_SCRIPTS 未含 |
| 用語の一貫性 | ✅ | |
| パス規則の一貫性 | ✅ | |

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ❌ CRITICAL: 現在の merge-spec.sh の配布方式が不明確

現在の `merge-spec.sh`:
- `.kiro/scripts/merge-spec.sh` として存在
- `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` としてテンプレートも存在
- しかし `HELPER_SCRIPTS` には含まれていない

**疑問**:
1. 現在の merge-spec.sh はどのように配布されているのか？
2. 新規プロジェクトで merge-spec.sh は利用可能か？
3. これは jj-merge-support 機能追加時の漏れか、意図的な設計か？

**推奨**: この点を明確化し、Tasks 6.1 の記述を修正する必要があります。

#### ⚠️ WARNING: update-*-for-deploy.sh への参照が広範に存在

Grep 結果によると、31 ファイルが `update-spec-for-deploy.sh` または `update-bug-for-deploy.sh` を参照しています。

参照先カテゴリ:
1. **今回の仕様書内** (5ファイル): 修正対象として認識済み
2. **他の仕様書** (18ファイル): 過去の仕様書のため変更不要
3. **実際の実装ファイル** (8ファイル):
   - `.kiro/scripts/update-*-for-deploy.sh` (2): 削除対象
   - `electron-sdd-manager/resources/templates/scripts/update-*-for-deploy.sh` (2): 削除対象
   - `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.ts` (1): 更新対象
   - `electron-sdd-manager/src/main/services/ccSddWorkflowInstaller.test.ts` (1): 更新対象
   - `.claude/commands/kiro/spec-merge.md` (1): 更新対象
   - `.claude/commands/kiro/bug-merge.md` (1): 更新対象

Tasks ではこれらのファイル更新が網羅されているため、実装上は問題なし。

### 2.2 Operational Considerations

前回レビュー #1 で指摘された W-002 (既存環境への影響) は「仕様外」として No Fix Needed と判断済み。

## 3. Ambiguities and Unknowns

### 現状の merge-spec.sh 配布方式

**不明点**: `merge-spec.sh` テンプレートが存在するが HELPER_SCRIPTS に含まれない理由

**可能性**:
1. jj-merge-support 実装時の漏れ
2. 手動コピーを想定した意図的設計
3. 別のインストール経路が存在

**解決策**:
- Design または Tasks にこの背景を明記するか
- Tasks 6.1 を「HELPER_SCRIPTS に merge-spec.sh を追加（テンプレートは既存）、merge-bug.sh を追加（テンプレートを新規作成）」と詳細化

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ 良好

### 4.2 Integration Concerns

**Status**: ✅ 良好

### 4.3 Migration Requirements

**Status**: 前回同様、仕様外として処理

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | Issue | Recommendation |
|----|-------|----------------|
| C-001 | HELPER_SCRIPTS と merge-spec.sh テンプレートの関係が不明確 | Tasks 6.1 に「merge-spec.sh をリストに追加（テンプレートは既存だがリストに未含）」と補足を追加 |

### Warnings (Should Address)

| ID | Issue | Recommendation |
|----|-------|----------------|
| W-001 | Tasks 6.1 の記述が曖昧 | 「追加」と「更新」の区別を明確化（merge-spec.sh: リスト追加 + テンプレート更新、merge-bug.sh: リスト追加 + テンプレート新規作成） |
| W-002 | Design Impact Analysis Contract に ccSddWorkflowInstaller.test.ts が含まれていない | Design 381行の後に `ccSddWorkflowInstaller.test.ts` の UPDATE を追加（前回レビューで Tasks は修正済みだが Design は未修正） |

### Suggestions (Nice to Have)

| ID | Suggestion |
|----|------------|
| S-001 | Design の Impact Analysis Contract を完全なものにするため、テストファイルも含める |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| High | C-001: HELPER_SCRIPTS 現状認識 | Tasks 6.1 に補足を追加し、merge-spec.sh が「リストに追加」（テンプレートは既存）であることを明記 | tasks.md |
| Medium | W-001: Tasks 6.1 曖昧性 | Tasks 6.1 の記述を詳細化 | tasks.md |
| Low | W-002: Design の不完全性 | Impact Analysis Contract に ccSddWorkflowInstaller.test.ts を追加 | design.md |

---

## Review #1 からの変更点

| Review #1 Issue | Status |
|-----------------|--------|
| W-001: テストファイル更新欠落 | ✅ **Fixed** - Tasks 6.1 に追記済み |
| W-002: 既存環境への影響 | ⏭️ **No Fix Needed** - 仕様外 |
| W-003: dev ブランチ動作の整合性 | ⏭️ **No Fix Needed** - 設計意図通り |

---

_This review was generated by the document-review command._
