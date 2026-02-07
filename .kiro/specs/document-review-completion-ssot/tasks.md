# Implementation Plan

## Task 1. UI進捗インジケーターのSSOTロジック修正
- [x] 1.1 (P) `getProgressIndicatorState` の判定ロジックを `status === 'approved'` ベースに変更する
  - Priority 2 の判定条件を `roundDetails.length >= 1` から `reviewState?.status === 'approved'` に変更
  - Priority 1（`executing`）とデフォルト（`unchecked`）は変更なし
  - `status: 'pending'` + `roundDetails` ありの場合は `unchecked` を返す
  - _Requirements: 1.1, 1.3, 1.4_
  - _Method: getProgressIndicatorState_
  - _Verify: Grep "status === 'approved'" in DocumentReviewPanel.tsx_

## Task 2. 自動実行フローでのapproved状態永続化
- [x] 2.1 (P) `executeDocumentReviewReply` に `approveReview` 呼び出しを追加する
  - `fixStatus === 'not_required'` かつ `!isApproved` の場合、`handleDocumentReviewCompleted` の前に `docReviewService.approveReview(specPath)` を呼ぶ
  - フォールバック（`fixRequired === 0 && needsDiscussion === 0`）でも同様に `approveReview` を呼ぶ
  - `approveReview` の呼び出しは try-catch で囲み、失敗時はログ出力のみでフロー継続
  - `isApproved` ガードにより重複呼び出しを防止
  - `fixStatus === 'applied'`（ループ継続）および `fixStatus === 'pending'` の分岐では `approveReview` を呼ばない
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Method: approveReview, handleDocumentReviewCompleted_
  - _Verify: Grep "approveReview" in projectSetup.ts_

## Task 3. 共有UIコンポーネントのユニットテスト修正
- [x] 3.1 (P) `DocumentReviewPanel.test.tsx`（shared）の進捗インジケーターテストを新SSOTルールに合わせて修正・追加する
  - `status: 'approved'` + `roundDetails` ありで `progress-indicator-checked` が表示されるテストを追加
  - `status: 'pending'` + `roundDetails` ありで `progress-indicator-unchecked` が表示されるテストを追加（既存テストの期待値修正）
  - `status: 'pending'` + `roundDetails` なしで `progress-indicator-unchecked` のテストを確認
  - `status: 'in_progress'` で `progress-indicator-executing` のテストを確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 (P) `DocumentReviewPanel.test.tsx`（renderer）の既存テスト期待値を修正する
  - `status: 'pending'` + `roundDetails` ありで `checked` を期待するテストを `unchecked` に修正
  - _Requirements: 3.5_

## Task 4. E2Eテストフィクスチャの多ラウンド化
- [x] 4.1 (P) `ALL_PHASES_COMPLETED_SPEC_JSON` フィクスチャを多ラウンド対応に更新する
  - `roundDetails` に3ラウンド以上の履歴を追加（キー名 `rounds` を `roundDetails` に修正）
  - 各ラウンドに `fixStatus` フィールドを追加（ラウンド1-2: `'applied'`、最終ラウンド: `'not_required'`）
  - 各ラウンドの `status` を `'reply_complete'` に修正（RoundStatus型に準拠）
  - 各ラウンドのタイムスタンプフィールドを `startedAt`, `completedAt` から `reviewCompletedAt`, `replyCompletedAt` に修正（RoundDetail型に準拠）
  - `documentReview.status: 'approved'` を維持
  - 多ラウンド状態でのimplフェーズ開始が既存テストで正常にパスすることを確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `status: 'approved'` で `checked` 表示 | 1.1 | Feature |
| 1.2 | `status: 'in_progress'` or `isExecuting` で `executing` 表示 | 1.1 | Feature |
| 1.3 | `status: 'pending'` + `roundDetails` ありで `unchecked` 表示 | 1.1 | Feature |
| 1.4 | `status: null/undefined` で `unchecked` 表示 | 1.1 | Feature |
| 2.1 | `not_required` 判定時に `approveReview` 呼び出し | 2.1 | Feature |
| 2.2 | フォールバックでも `approveReview` 呼び出し | 2.1 | Feature |
| 2.3 | `isApproved` ガードで重複呼び出し防止 | 2.1 | Feature |
| 2.4 | ループ継続時は `approveReview` を呼ばない | 2.1 | Feature |
| 2.5 | `fixStatus === 'pending'` 時は呼ばない | 2.1 | Feature |
| 2.6 | `approveReview` 失敗時もフロー継続 | 2.1 | Feature |
| 3.1 | `approved` + `roundDetails` ありで `checked` テスト | 3.1 | Test |
| 3.2 | `pending` + `roundDetails` ありで `unchecked` テスト | 3.1 | Test |
| 3.3 | `pending` + `roundDetails` なしで `unchecked` テスト | 3.1 | Test |
| 3.4 | `in_progress` で `executing` テスト | 3.1 | Test |
| 3.5 | 既存の `pending` で `checked` 期待テスト修正 | 3.1, 3.2 | Test |
| 4.1 | 多ラウンド `roundDetails` のフィクスチャ | 4.1 | Test |
| 4.2 | 最終 `status: 'approved'` の検証 | 4.1 | Test |
| 4.3 | 多ラウンド状態でimplフェーズ開始検証 | 4.1 | Test |
| 4.4 | `SDD_PROJECT_PATH` 環境変数方式 | 4.1 | Test |
