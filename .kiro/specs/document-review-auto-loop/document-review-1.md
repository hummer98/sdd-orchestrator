# Specification Review Report #1

**Feature**: document-review-auto-loop
**Review Date**: 2026-01-12
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| Warning | 5 |
| Info | 2 |

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**良好な点**:
- 全7要件が Design の Components and Interfaces で適切にカバーされている
- Requirements Traceability マトリクスが完備

**問題点**:

#### C1: approved 判定の条件不一致

**Requirements** (Req 6.1):
> `Fix Required = 0 AND Needs Discussion = 0` の場合のみ `documentReview.status = "approved"` を設定すること

**Design** (document-review-reply.md コマンド仕様):
> 現行の `.claude/commands/kiro/document-review-reply.md` (line 211-213) では：
> `If Fix Required total is 0` で approved と記載

**既存実装の確認結果**:
現在の `document-review-reply.md` (line 211-213) を確認したところ、approved 判定は「Fix Required = 0」のみで行われており、「Needs Discussion = 0」の条件が欠けている。Design ドキュメントの DD-004 では「Needs Discussion も考慮」と明記されているが、実際のコマンド仕様への反映が不完全。

**影響**:
Requirements 6.1, 6.2 を満たさない。Needs Discussion が残っている状態で approved になり、自動ループが不適切に終了する可能性がある。

### 1.2 Design ↔ Tasks Alignment

**良好な点**:
- 4つの主要タスクグループが Design のコンポーネントと対応
- 依存関係の記述が明確

**問題点**:

#### C2: `continueDocumentReviewLoop` メソッドの Design 定義不足

**Design** (Event Contract):
```typescript
interface AutoExecutionCoordinator {
  continueDocumentReviewLoop(specPath: string, nextRound: number): void;
  getCurrentDocumentReviewRound(specPath: string): number | undefined;
}
```

**Tasks** (Task 1.2):
> `continueDocumentReviewLoop(specPath, nextRound)` メソッドを追加

**既存実装の確認結果**:
`autoExecutionCoordinator.ts` を確認したところ、`continueDocumentReviewLoop` メソッドは存在しない。現在は `handleDocumentReviewCompleted()` のみがあり、ループ継続の機能は未実装。

**問題**:
Design で定義された `continueDocumentReviewLoop` メソッドの詳細仕様（内部処理、イベント発火、状態遷移）が不足。実装者が判断に迷う可能性がある。

#### C3: handlers.ts の実装内容と Design の乖離

**Design** (handlers.ts セクション):
> Agent 完了後に spec.json を読み取り、ループ継続/終了を判定

**既存実装の確認結果**:
`handlers.ts` (line 1990-2004) を確認すると、現在の実装では：
- `documentReview.status === 'approved'` チェックのみ実行
- `roundDetails` の Fix Required / Needs Discussion カウント確認は未実装
- ループ継続判定ロジック自体が存在しない

**影響**:
Tasks 3.1, 3.2 の実装時に、既存コードとの統合方針が不明確。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| AutoExecutionState 拡張 | `currentDocumentReviewRound` フィールド | Task 1.1 | ✅ |
| `continueDocumentReviewLoop` | メソッドシグネチャ定義 | Task 1.2 | ⚠️ 詳細不足 |
| `handleDocumentReviewCompleted` 拡張 | 終了条件判定 | Task 1.3 | ✅ |
| 中断・再開 | roundDetails から再開 | Task 1.4 | ✅ |
| document-review-reply.md 変更 | approved 判定変更 | Task 2 | ✅ |
| handlers.ts ループ制御 | 結果判定・継続判定 | Task 3.1, 3.2 | ✅ |
| Remote UI ラウンド表示 | roundDetails 読み取り | Task 4.3 | ⚠️ 具体的実装箇所不明 |

### 1.4 Cross-Document Contradictions

#### W1: MAX_DOCUMENT_REVIEW_ROUNDS の定義場所

**Requirements** (Req 2.1):
> 最大ラウンド数は 7 回とすること（`MAX_DOCUMENT_REVIEW_ROUNDS = 7`）

**Design** (State Management):
> `const MAX_DOCUMENT_REVIEW_ROUNDS = 7;` を AutoExecutionCoordinator に定義

**Tasks** (Task 1.1):
> 定数 `MAX_DOCUMENT_REVIEW_ROUNDS = 7` を定義

**現状**:
`autoExecutionCoordinator.ts` に `MAX_DOCUMENT_REVIEW_ROUNDS` は未定義。既存の定数は `DEFAULT_AUTO_EXECUTION_TIMEOUT`, `MAX_CONCURRENT_EXECUTIONS`, `PHASE_ORDER` のみ。

**影響**: 軽微だが、定義場所の SSOT を明確にすべき。

## 2. Gap Analysis

### 2.1 Technical Considerations

#### W2: ラウンド状態の同期タイミング問題

**Design の Risks**:
> ラウンド状態の永続化タイミングで Coordinator と spec.json の不整合が発生する可能性

**詳細**:
- Design DD-003 では「クラッシュ時のリカバリ可能」を理由に spec.json への永続化を採用
- しかし、永続化失敗時のロールバック/リトライ処理が未定義
- Coordinator の `currentDocumentReviewRound` と spec.json `documentReview.roundDetails` の整合性チェック機構がない

**推奨**:
- 永続化失敗時のエラーハンドリングを明示的に定義
- 再開時に spec.json と Coordinator 状態の整合性検証を追加

#### W3: roundDetails スキーマの不整合リスク

**Design** (Logical Data Model):
```json
{
  "roundDetails": [
    {
      "roundNumber": 1,
      "status": "reply_complete",
      "reviewCompletedAt": "...",
      "replyCompletedAt": "...",
      "fixApplied": true
    }
  ]
}
```

**document-review-reply.md** (line 44-52):
> **IMPORTANT**: Always use `roundNumber` (not `round`). This is the official schema.

**既存実装の確認**:
`handlers.ts` (line 1958-1959) では：
```typescript
const roundNumber = await docReviewService.getNextRoundNumber(specPath);
const currentRound = Math.max(1, roundNumber - 1);
```

**リスク**:
異なるコンポーネントで `roundNumber` / `round` / `currentRound` という異なる命名が使用されており、混乱の原因となる可能性。

### 2.2 Operational Considerations

#### W4: ログ出力の粒度不足

**Design** (Monitoring):
> ラウンド開始/完了時にログ出力: `[AutoExecutionCoordinator] Document review round {n} started/completed`

**問題**:
- ログフォーマットは定義されているが、ログレベル（info/debug/warn）が未指定
- ラウンド間の経過時間計測がない
- Fix Required / Needs Discussion カウントのログ出力がない

**推奨**:
- 各ラウンドのメトリクス（所要時間、issue カウント）をログに含める

#### I1: E2E テストカバレッジ

**Design** (E2E Tests):
> 1. Mock Claude による複数ラウンドループテスト
> 2. ラウンド状態の Remote UI 表示確認
> 3. 中断・再開フローテスト

**現状**:
Tasks に E2E テストの具体的なシナリオ・テストデータが未定義。Mock Claude の実装方針も不明。

## 3. Ambiguities and Unknowns

#### W5: Needs Discussion の定義

**Requirements** (Decision Log - approved 判定基準):
> Needs Discussion = 人間の判断が必要 = 自動ループで解決不可

**Design** (DD-004):
> Needs Discussion の定義が曖昧な場合、判定が不正確になる可能性

**曖昧な点**:
- `document-review-reply.md` の Response Summary テーブルで Needs Discussion をどのようにカウントするか
- AI が「Needs Discussion」と判定する基準
- Needs Discussion 項目の具体例

**推奨**:
- Needs Discussion の判定ガイドラインを document-review-reply.md に追加

#### I2: Remote UI の具体的変更範囲

**Requirements** (Req 7.1-7.3):
> Remote UI からも Document Review パネルで現在のラウンド数を確認できること

**Task 4.3**:
> 既存の spec.json 監視メカニズムで自動更新されることを確認

**曖昧な点**:
- Remote UI のどのコンポーネントに表示を追加するのか
- 表示フォーマット（「Round 3/7」など）が未定義
- 既存の Document Review パネルの場所・構成が不明

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好な点**:
- イベント駆動 + 状態機械パターンは既存の `AutoExecutionCoordinator` と整合
- SSOT 原則（Coordinator が状態管理）を遵守
- IPC パターン（handlers.ts での受け渡し）が既存パターンと一致

**確認済み**:
- `structure.md` の Service Pattern に準拠
- `tech.md` の IPC 設計パターンに準拠

### 4.2 Integration Concerns

**確認済み**:
- 既存の `handleDocumentReviewCompleted()` を拡張するアプローチは後方互換
- 既存の `execute-document-review` イベントリスナーとの統合が必要

**注意点**:
- `handlers.ts` の `executeDocumentReviewReply()` 関数は大幅な変更が必要
- 既存のテスト (`handlers.test.ts`) への影響を確認する必要あり

### 4.3 Migration Requirements

**該当なし**:
- 既存 spec.json の `documentReview` スキーマは互換
- 既存の roundDetails がない spec も新規ラウンドとして開始可能

## 5. Recommendations

### Critical Issues (Must Fix)

| # | Issue | Recommended Action | Affected Documents |
|---|-------|-------------------|-------------------|
| C1 | approved 判定条件不一致 | document-review-reply.md に Needs Discussion = 0 条件を追加 | requirements.md, design.md, tasks.md |
| C2 | continueDocumentReviewLoop 詳細仕様不足 | Design に内部処理フロー・イベント発火の詳細を追加 | design.md |
| C3 | handlers.ts 実装方針不明確 | 既存 executeDocumentReviewReply 関数の変更点を Tasks に明記 | tasks.md |

### Warnings (Should Address)

| # | Issue | Recommended Action | Affected Documents |
|---|-------|-------------------|-------------------|
| W1 | MAX_DOCUMENT_REVIEW_ROUNDS 定義場所 | Design に明示的に「autoExecutionCoordinator.ts の Constants セクションに追加」と記載 | design.md |
| W2 | 状態同期タイミング問題 | Design の Error Handling に永続化失敗時の処理を追加 | design.md |
| W3 | roundDetails スキーマ命名 | 変数名を `roundNumber` に統一するルールを明記 | design.md |
| W4 | ログ出力粒度 | Monitoring セクションにログレベルとメトリクスを追加 | design.md |
| W5 | Needs Discussion 定義曖昧 | document-review-reply.md に判定ガイドラインを追加 | design.md, tasks.md |

### Suggestions (Nice to Have)

| # | Issue | Recommended Action |
|---|-------|-------------------|
| I1 | E2E テストカバレッジ | Tasks に具体的なテストシナリオを追加 |
| I2 | Remote UI 変更範囲 | Task 4.3 に具体的なコンポーネント名を追加 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|-------------------|-------------------|
| Critical | C1 | `document-review-reply.md` の approved 判定条件を「Fix Required = 0 AND Needs Discussion = 0」に変更。現行 line 211-213 を修正 | design.md, tasks.md |
| Critical | C2 | `continueDocumentReviewLoop` の詳細仕様を Design に追加（イベント発火、状態遷移、spec.json 更新タイミング） | design.md |
| Critical | C3 | Tasks 3.1, 3.2 に既存 `executeDocumentReviewReply` 関数の具体的変更点を追記 | tasks.md |
| Warning | W1 | Design の Technology Stack または State Management セクションに定数定義場所を明記 | design.md |
| Warning | W2 | Error Handling セクションに「spec.json 永続化失敗時」の行を追加 | design.md |
| Warning | W3 | Data Models セクションに命名規則を追記 | design.md |
| Warning | W4 | Monitoring セクションにログレベルとメトリクス項目を追加 | design.md |
| Warning | W5 | Tasks 2 に Needs Discussion 判定ガイドラインの追加を含める | tasks.md |
| Info | I1 | Task 4.2 に具体的なテストシナリオ例を追加 | tasks.md |
| Info | I2 | Task 4.3 に Remote UI コンポーネント名を明記 | tasks.md |

---

_This review was generated by the document-review command._
