# Specification Review Report #2

**Feature**: auto-exec-phase-ssot
**Review Date**: 2026-02-14
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-1.md, document-review-1-reply.md, product.md, tech.md, structure.md, design-principles.md

## Executive Summary

前回レビュー（#1）で指摘された W-1（テスト件数の不正確）は修正済み。W-2（import パス）と W-3（行番号参照）は reply で合理的に却下済み。今回はソースコード実装の精査を踏まえ、より深い整合性検証を実施した。

全体として非常に高品質な仕様であり、Critical な問題は存在しない。新たに発見した Warning 2件と Info 2件を報告する。

| 重要度 | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 2 |
| Info | 2 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: 良好（前回 #1 と同様）**

全 5 Requirements が Design に正確にトレースされている。矛盾なし。

| Requirement | Design 対応箇所 | 状態 |
|-------------|-----------------|------|
| Req 1: シグネチャ変更 | Components: `getLastCompletedPhase` セクション | ✅ |
| Req 2: マッピング | Data Models: マッピング表 | ✅ |
| Req 3: `start()` 修正 | Components: `start` メソッドセクション | ✅ |
| Req 4: ユニットテスト | Testing Strategy: Unit Tests | ✅ |
| Req 5: E2E テスト | Testing Strategy: E2E Tests | ✅ |

Requirements の Out of Scope と Design の Non-Goals が完全一致。

### 1.2 Design ↔ Tasks Alignment

**結果: 良好**

| Design コンポーネント | Task 対応 | 状態 |
|----------------------|-----------|------|
| `getLastCompletedPhase` シグネチャ変更 | Task 1.1 | ✅ |
| `start()` メソッド修正 | Task 2.1 | ✅ |
| ユニットテスト更新 | Task 3.1, 3.2, 3.3 | ✅ |
| E2E テスト新規追加 | Task 4.1 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|------------------|---------------|--------|
| Service (`getLastCompletedPhase`) | switch 文による静的マッピング | Task 1.1 | ✅ |
| Service (`start`) | spec.json 読み取り、呼び出し修正 | Task 2.1 | ✅ |
| Types | `SpecPhase` import 追加 | Task 1.1 内で記述 | ✅ |
| Unit Tests | 7 既存 + 新規追加 | Task 3.1, 3.2, 3.3 | ✅ |
| E2E Tests | impl 完了からの再開テスト | Task 4.1 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | 第1引数を `SpecPhase` に変更 | 1.1 | Feature | ✅ |
| 1.2 | 第2引数 `documentReviewStatus` 維持 | 1.1 | Feature | ✅ |
| 1.3 | 戻り値型 `WorkflowPhase \| null` 維持 | 1.1 | Feature | ✅ |
| 2.1 | SpecPhase → WorkflowPhase マッピング | 1.1 | Feature | ✅ |
| 2.2 | 未知の SpecPhase で `null` を返す | 1.1 | Feature | ✅ |
| 3.1 | `start()` が `phase` を読み取る | 2.1 | Feature | ✅ |
| 3.2 | `specPhase` を新シグネチャで渡す | 2.1 | Feature | ✅ |
| 3.3 | 読み取り失敗時 `'initialized'` フォールバック | 2.1 | Feature | ✅ |
| 3.4 | impl-complete → inspection シナリオ | 2.1, 3.3 | Feature | ✅ |
| 4.1 | 既存テストの新シグネチャ対応 | 3.1 | Feature | ✅ |
| 4.2 | 新 SpecPhase テストケース追加 | 3.2 | Feature | ✅ |
| 4.3 | `start()` テストの正常パス確認 | 3.3 | Feature | ✅ |
| 5.1 | impl 完了状態からの E2E テスト | 4.1 | Feature | ✅ |
| 5.2 | 既存 E2E テストパターン準拠 | 4.1 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| spec.json 読み取り → `getLastCompletedPhase` | System Flows | Task 3.3 (start テスト) | ✅ |
| `getLastCompletedPhase` → `getImmediateNextPhase` | System Flows | Task 3.3 (impl→inspection) | ✅ |
| impl 完了 → 自動実行再開 | System Flows | Task 4.1 (E2E) | ✅ |

**Validation Results**:
- [x] シーケンス図の全ステップに対応するテストが存在
- [x] spec.json 読み取りの検証タスクが存在
- [x] フェーズ遷移の結合検証が計画されている

**Note**: IPC/Store統合テスト不要（純粋なMain Processロジック変更）。

### 1.6 Cross-Document Contradictions

#### ⚠️ WARNING W-4: `SpecPhase` import パスと `WorkflowPhase` の定義元の不整合

- **design.md** (DD-003): `SpecPhase` を `renderer/types/index.ts` から import する方針
- **design.md** (Components): `WorkflowPhase` を `./specManagerService` から import する前提（暗黙）
- **ソースコード**: `autoExecutionCoordinator.ts` L15 で `WorkflowPhase` を `./specManagerService` から import、`renderer/types/` からの import パターンなし

**問題点**: `SpecPhase` は `renderer/types/index.ts` で定義されており（L3-10）、Main Process サービスからの import パスとして `renderer/types/` を使用する必要がある。しかし現行の `autoExecutionCoordinator.ts` には `renderer/types/` からの import が一切ない。

前回 W-2 の reply で「43ファイルで `renderer/types/` からの import を使用」と根拠を提示して問題なしと判断されたが、`autoExecutionCoordinator.ts` 自体には `renderer/types/` import が存在しないため、**新しい import パスの追加**が必要となる。Task 1.1 の記述「`SpecPhase` 型を import する（定義元 `renderer/types/index.ts` または既存パターンに準拠した import パス）」でカバーされてはいるが、design.md の DD-003 と実装の import パターンの間にギャップがある。

**影響**: 軽微。実装者は Task 1.1 の指示に従い `renderer/types/index.ts` から import を追加すれば良い。ただし、このファイルでは初の `renderer/types/` import となるため、実装時に違和感を感じる可能性がある。

#### ⚠️ WARNING W-5: `start()` メソッド内の `getLastCompletedPhase` 呼び出し位置に関する設計詳細の不足

- **design.md** (DD-002): 「`getLastCompletedPhase` 呼び出しを `approvals` 条件分岐の外に移動する」
- **tasks.md** (Task 2.1): 「`getLastCompletedPhase` 呼び出しを `approvals` 条件分岐の外に移動する（DD-002 に準拠）」
- **ソースコード**: 現行の `getLastCompletedPhase` 呼び出し（L581）は `if (approvals)` ブロック内にある

**問題点**: DD-002 では `getLastCompletedPhase` 呼び出しを条件分岐の外に移動するとしているが、`start()` メソッドの構造（L431-614、184行）は複雑であり、具体的にどの位置に移動するかの詳細がない。

現行コード構造:
```
L462-506: spec.json 読み取り
L508-522: state 作成
L524-589: if (approvals) ブロック内:
  L526-554: 自動承認ロジック (getUnapprovedGeneratedPhases)
  L556-580: phase permission 判定
  L581-588: getLastCompletedPhase 呼び出し ← これを外に移動
L593-611: nextPhase 判定と実行開始
```

`specPhase` は `spec.json` 読み取りブロック（L462-506）で取得可能だが、移動先が `approvals` ブロックの直後・`nextPhase` 判定の直前（L590付近）なのか、`spec.json` 読み取り直後（L507付近）なのかが明確でない。

**影響**: 軽微。実装者は `lastCompletedPhase` が `nextPhase` 判定（L593）の前に必要であることから、移動先を正しく判断できる。しかし、`approvals` ブロック内の他の変数（`documentReviewStatus` 等）との依存関係を考慮する必要がある。

## 2. Gap Analysis

### 2.1 Technical Considerations

**エラーハンドリング**: ✅ 十分
- `spec.json` 読み取り失敗時のフォールバック明記
- 未知の `SpecPhase` に対する安全なデフォルト値

**セキュリティ**: ✅ 該当なし
- ファイルシステム読み取りのみ

**パフォーマンス**: ✅ 該当なし
- 同期的な switch 文、追加 I/O なし

**テスト戦略**: ✅ 網羅的
- ユニットテスト（全マッピング + フォールバック）、結合テスト（start→getLastCompletedPhase）、E2E テスト

**ロギング**: ✅ 既存パターンで対応
- `start()` L583-588 で既に `lastCompletedPhase` をログ出力済み

### 2.2 Operational Considerations

**デプロイメント**: ✅ 該当なし
**ロールバック**: ✅ git revert で完全に可能
**モニタリング**: ✅ 既存パターンで対応
**ドキュメント更新**: ✅ 不要

## 3. Ambiguities and Unknowns

### ℹ️ INFO I-4: `documentReviewStatus` の取得位置

現行コードでは `documentReviewStatus` は `approvals` ブロック内で取得されている可能性がある。`getLastCompletedPhase` を `approvals` ブロックの外に移動する場合、`documentReviewStatus` も外で取得する必要があるかの確認が必要。

ソースコード分析の結果、`documentReviewStatus` は `spec.json` 読み取りブロック（L462-506 付近）で `specJson.documentReview?.status` として取得されており、`approvals` ブロックとは独立しているため、移動に問題はない。

### ℹ️ INFO I-5: 既存テストの `ApprovalsStatus` モックオブジェクトの扱い

Task 3.1 で「`ApprovalsStatus` オブジェクトを渡す既存テストを、対応する `SpecPhase` 文字列に置き換える」とあるが、テストファイルには `createMockApprovals()` のようなヘルパーが存在する可能性がある。シグネチャ変更後、これらのヘルパーが不要になる場合の削除/整理は明示されていない。

**影響**: 軽微。テスト内のヘルパーは `getLastCompletedPhase` テスト専用である可能性が高く、不要になれば自然に削除される。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: 完全に整合**

- Main Process ロジックのみの変更であり、Electron Process Boundary Rules に準拠
- `spec.json.phase` をデータソースとすることは SSOT パターンと一致
- tRPC/IPC 層の変更なし
- 設計原則（DRY, SSOT, KISS, YAGNI）に忠実

### 4.2 Integration Concerns

**結果: 影響なし**

- `getLastCompletedPhase` の呼び出し元は `start()` メソッド内の **1箇所のみ**
- `handleAgentCompleted()` は独立したフェーズ追跡ロジックを持ち、変更不要
- Remote UI への影響なし

### 4.3 Migration Requirements

**結果: 不要**

- 既存の `spec.json.phase` フィールドを活用
- API 互換性の問題なし

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| # | Issue | Detail |
|---|-------|--------|
| W-4 | `SpecPhase` import パスのギャップ | `autoExecutionCoordinator.ts` では初の `renderer/types/` import となる。DD-003 の決定を維持するなら、Task 1.1 の記述に「このファイルでの初の `renderer/types/` import であること」を明記すると実装者の判断が容易になる |
| W-5 | `getLastCompletedPhase` 移動先の詳細不足 | DD-002 の「条件分岐の外に移動」について、移動先の具体的な位置（`approvals` ブロック直後、`nextPhase` 判定直前）を明記すると実装の迷いが減る |

### Suggestions (Nice to Have)

| # | Issue | Detail |
|---|-------|--------|
| I-4 | `documentReviewStatus` の独立性 | 移動時に `documentReviewStatus` の取得位置が問題ないことを design.md に注記すると安心 |
| I-5 | テストヘルパーの整理 | シグネチャ変更後に不要になる `ApprovalsStatus` モック関連のクリーンアップを明記 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W-4: Import パスのギャップ | Task 1.1 に「初の `renderer/types/` import 追加」の注記を追加 | tasks.md |
| Warning | W-5: 移動先の詳細 | DD-002 または Task 2.1 に具体的な移動先位置を追記 | design.md or tasks.md |
| Info | I-4: documentReviewStatus | design.md の DD-002 に `documentReviewStatus` が `approvals` ブロック外で取得済みである旨を追記 | design.md |
| Info | I-5: テストヘルパー整理 | Task 3.1 に不要ヘルパーのクリーンアップを明記 | tasks.md |

## 7. Review #1 Fixes Verification

前回レビュー #1 の修正状況:

| Issue | Status | Detail |
|-------|--------|--------|
| W-1: テスト件数「6件」→「7件」 | ✅ 修正済み | design.md DD-001 Consequences を確認 |
| W-2: Import パスの曖昧さ | ❌ No Fix Needed（Reply で却下） | 43ファイルの前例で問題なしと判断 |
| W-3: 行番号参照 | ❌ No Fix Needed（Reply で却下） | 現時点で正確、補助情報として有用 |

---

_This review was generated by the document-review command._
