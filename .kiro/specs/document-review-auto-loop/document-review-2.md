# Specification Review Report #2

**Feature**: document-review-auto-loop
**Review Date**: 2026-01-12
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-1-reply.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| Warning | 1 |
| Info | 1 |

**前回レビュー (Review #1) との比較**:
- Critical: 3 → 0 (全て解決)
- Warning: 5 → 1 (4件解決、1件新規)
- Info: 2 → 1 (1件解決、変更なし)

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**前回指摘事項の確認**:

#### C1: approved 判定の条件不一致 → **解決済み** ✅

**確認結果**:
Design の document-review-reply.md セクションに Needs Discussion 判定が追加されている:

```markdown
**Needs Discussion 判定ガイドライン**:
| Needs Discussion とすべき場合 | 理由 |
| 複数の技術的アプローチが存在し、どちらも妥当 | AI では最適解を判断できない |
...
```

Requirements 6.1, 6.2 との整合が確認できる。

### 1.2 Design ↔ Tasks Alignment

**前回指摘事項の確認**:

#### C2: `continueDocumentReviewLoop` メソッドの Design 定義不足 → **解決済み** ✅

**確認結果**:
Design に `continueDocumentReviewLoop 詳細仕様` セクションが追加されている:

```typescript
continueDocumentReviewLoop(specPath: string, nextRound: number): void {
  // 1. 状態検証
  // 2. 状態更新
  // 3. ログ出力
  // 4. イベント発火
}
```

内部処理フロー、イベント発火タイミング、状態更新が明確に定義されている。

#### C3: handlers.ts の実装内容と Design の乖離 → **解決済み** ✅

**確認結果**:
Tasks 3.1 に既存コード変更点が詳細化されている:

```markdown
- **既存コード変更点（line 1990-2004 付近）**:
  - 現在: `documentReview.status === 'approved'` のみで判定
  - 変更後: 以下の3分岐ロジックに変更
    1. `status === 'approved'` → `handleDocumentReviewCompleted(true)`
    2. `status !== 'approved' AND Fix Required > 0 AND rounds < 7` → `continueDocumentReviewLoop()`
    3. `status !== 'approved' AND (Needs Discussion > 0 OR rounds >= 7)` → `handleDocumentReviewCompleted(false)`
```

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| AutoExecutionState 拡張 | `currentDocumentReviewRound` フィールド | Task 1.1 | ✅ |
| `continueDocumentReviewLoop` | 詳細仕様定義済み | Task 1.2 | ✅ |
| `handleDocumentReviewCompleted` 拡張 | 終了条件判定 | Task 1.3 | ✅ |
| 中断・再開 | roundDetails から再開 | Task 1.4 | ✅ |
| document-review-reply.md 変更 | approved 判定変更 + Needs Discussion ガイドライン | Task 2 | ✅ |
| handlers.ts ループ制御 | 結果判定・継続判定（3分岐ロジック） | Task 3.1, 3.2 | ✅ |
| Remote UI ラウンド表示 | roundDetails 読み取り | Task 4.3 | ⚠️ 詳細は実装時に確認 |

### 1.4 Cross-Document Contradictions

**前回指摘事項の確認**:

#### W1: MAX_DOCUMENT_REVIEW_ROUNDS の定義場所 → **解決済み** ✅

**確認結果**:
Design の State Management セクションに明記されている:

```typescript
/** 最大 Document Review ラウンド数 - Constants セクションに追加 */
const MAX_DOCUMENT_REVIEW_ROUNDS = 7;
// autoExecutionCoordinator.ts の Constants セクション（line 17-27 付近）に追加すること
```

#### W3: roundDetails スキーマの命名不整合リスク → **前回解決済み** ✅

前回のレビューで「No Fix Needed」と判定され、既存ドキュメントで `roundNumber` が一貫して使用されていることが確認されていた。

## 2. Gap Analysis

### 2.1 Technical Considerations

**前回指摘事項の確認**:

#### W2: ラウンド状態の同期タイミング問題 → **解決済み** ✅

**確認結果**:
Design の Error Handling セクションに永続化失敗時の処理が追加されている:

| Error Type | Detection | Response | Recovery |
|------------|-----------|----------|----------|
| spec.json 永続化失敗 | writeSpecJson() 失敗 | ログ出力（error）、paused に遷移 | ユーザーが手動で spec.json を確認・修正後再開。Coordinator の状態は維持し、次回再開時に永続化をリトライ |

#### W4: ログ出力の粒度不足 → **解決済み** ✅

**確認結果**:
Design の Monitoring セクションにログレベル定義とメトリクス項目が追加されている:

```markdown
**ログレベル定義**:
| Event | Level | Format |
| ラウンド開始 | info | `[AutoExecutionCoordinator] Document review round {n} starting` |
| ラウンド完了 | info | `[AutoExecutionCoordinator] Document review round {n} completed` |
...

**メトリクス項目**:
- 各ラウンドの Fix Required / Needs Discussion カウント
```

#### W5: Needs Discussion の定義曖昧 → **解決済み** ✅

**確認結果**:
Design の document-review-reply.md セクションに Needs Discussion 判定ガイドラインが追加されている。

### 2.2 Operational Considerations

**新規発見**:

#### W6: Fix Required / Needs Discussion カウントの取得方法が不明確

**Design** (handlers.ts セクション):
> Agent 完了後に spec.json を読み取り、ループ継続/終了を判定

**Tasks** (Task 3.1):
> `documentReview.status` と `roundDetails` の最新ラウンドから Fix Required/Needs Discussion を確認
> - **Fix Required / Needs Discussion カウントの取得方法**:
>   - spec.json の `documentReview.roundDetails` 最新エントリから取得するか、
>   - document-review-reply が spec.json に書き込むカウント情報を読み取る

**問題**:
Fix Required / Needs Discussion カウントの取得元が「roundDetails」か「document-review-reply が書き込むカウント情報」か明確でない。

**確認が必要**:
1. `roundDetails` に Fix Required / Needs Discussion カウントを含めるのか
2. 別フィールドに保存するのか
3. reply ファイルをパースして取得するのか

**影響**: 実装時に判断が必要だが、Design の Data Models セクションを見ると `roundDetails` には `fixApplied` のみ定義されており、カウント情報のスキーマが未定義。

### 2.3 前回 Info の確認

#### I1: E2E テストカバレッジ → **前回解決済み** ✅

Tasks 4.2 に基本的なシナリオは記載済み。

#### I2: Remote UI の具体的変更範囲 → **継続**

Task 4.3 で「既存の spec.json 監視メカニズムで自動更新」と明記されているが、具体的なコンポーネント名は未記載。ただし、既存パターンに従うため実装時に確認可能。

## 3. Ambiguities and Unknowns

#### I3: roundDetails への Fix Required / Needs Discussion カウント保存

**現状の roundDetails スキーマ（Design）**:
```typescript
interface RoundDetail {
  roundNumber: number;
  reviewCompletedAt?: string;
  replyCompletedAt?: string;
  status: RoundStatus;
  fixApplied?: boolean;
}
```

**問題**: `fixRequired` / `needsDiscussion` カウントを含むかどうかが未定義。

**オプション**:
1. `roundDetails` にカウントを追加（推奨: SSOT として永続化）
2. reply ファイルをパースして取得（複雑、遅い）
3. 毎回 reply 完了時に spec.json の別フィールドに書き込む

これは実装時に決定可能な詳細であり、Critical ではない。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**確認済み**:
- イベント駆動 + 状態機械パターンは既存の `AutoExecutionCoordinator` と整合
- SSOT 原則（Coordinator が状態管理）を遵守
- IPC パターン（handlers.ts での受け渡し）が既存パターンと一致
- Logging Guideline との整合: Design の Monitoring セクションでログレベルが適切に定義

### 4.2 Integration Concerns

**確認済み**:
- 既存の `handleDocumentReviewCompleted()` を拡張するアプローチは後方互換
- Error Handling が明確に定義されている

### 4.3 Migration Requirements

**該当なし**:
- 既存 spec.json の `documentReview` スキーマは互換
- 既存の roundDetails がない spec も新規ラウンドとして開始可能

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

| # | Issue | Recommended Action | Affected Documents |
|---|-------|-------------------|-------------------|
| W6 | Fix Required / Needs Discussion カウント取得方法不明確 | roundDetails に `fixRequiredCount` / `needsDiscussionCount` フィールドを追加するか、明確な取得方法を記載 | design.md |

### Suggestions (Nice to Have)

| # | Issue | Recommended Action |
|---|-------|-------------------|
| I3 | roundDetails スキーマ拡張 | RoundDetail に `fixRequiredCount?: number`, `needsDiscussionCount?: number` を追加 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Warning | W6 | Design の Data Models セクションに RoundDetail スキーマの拡張（カウント情報）を追加するか、カウント取得方法を明記 | design.md |
| Info | I3 | 実装時に判断可能。roundDetails スキーマ拡張を推奨 | design.md |

---

## Summary

前回のレビュー (Review #1) で指摘された **Critical 3件、Warning 4件** はすべて適切に修正されている。

今回新規で発見された issue は **Warning 1件**（Fix Required / Needs Discussion カウントの取得方法）のみで、これは実装時に決定可能な詳細レベルの問題。

**ステータス**: 実装可能な状態。W6 は実装時に具体化すれば十分。

---

_This review was generated by the document-review command._
