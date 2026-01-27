# Implementation Plan

## 概要

Document Review Skip機能の完全削除。`'skipped'`ステータス、`skipReview()`メソッド、関連するIPC API、E2Eテストを削除し、既存データ検出時の警告ログを実装する。

---

## Tasks

- [x] 1. 型定義からSKIPPED削除
- [x] 1.1 (P) `shared/types/review.ts`から`REVIEW_STATUS.SKIPPED`を削除し、`ReviewStatus`型を修正
  - `REVIEW_STATUS`オブジェクトから`SKIPPED: 'skipped'`プロパティを削除
  - `ReviewStatus`型は`REVIEW_STATUS`から導出されるため、自動的に`'skipped'`が除外される
  - _Requirements: 1.2, 1.3_

- [x] 1.2 (P) `renderer/types/documentReview.ts`から`REVIEW_STATUS.SKIPPED`を削除
  - `REVIEW_STATUS`オブジェクトから`SKIPPED: 'skipped'`プロパティを削除
  - _Requirements: 1.1, 1.3_

- [x] 2. サービスメソッド削除と警告ログ実装
- [x] 2.1 `documentReviewService.ts`から`skipReview()`メソッドを削除
  - `skipReview(specPath: string): Promise<Result<void, ReviewError>>`メソッド全体を削除
  - クラスインターフェースから`skipReview`を削除
  - _Requirements: 2.1, 2.2_

- [x] 2.2 `documentReviewService.ts`の`canAddRound()`から`status === 'skipped'`判定を削除
  - `status === 'approved' || status === 'skipped'`を`status === 'approved'`に変更
  - _Requirements: 4.2_

- [x] 2.3 `readSpecJsonInternal()`に警告ログ出力機能を追加
  - `documentReview.status === 'skipped'`検出時に`logger.warn()`で警告を出力
  - ログにspec名、status値、推奨対応を含める
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2.4 `documentReviewService.test.ts`から`skipReview`関連ユニットテストを削除
  - `describe('skipReview')`ブロック全体を削除
  - _Requirements: 2.3_

- [x] 3. IPC APIの削除
- [x] 3.1 (P) `preload/index.ts`から`skipDocumentReview()`メソッドを削除
  - `contextBridge.exposeInMainWorld`内の`skipDocumentReview`プロパティを削除
  - _Requirements: 3.1_

- [x] 3.2 (P) `renderer/types/electron.d.ts`から`skipDocumentReview`型定義を削除
  - `ElectronAPI`インターフェースから`skipDocumentReview`を削除
  - _Requirements: 3.2_

- [x] 3.3 (P) `ipc/specHandlers.ts`から`skipDocumentReview`ハンドラを削除
  - `spec:skipDocumentReview`チャンネルのハンドラを削除
  - _Requirements: 3.3_

- [x] 4. UIロジックからskipped判定を削除
- [x] 4.1 `SpecDetail.tsx`の`isReadyForImplementation`判定から`status === 'skipped'`を削除
  - `status === 'approved' || status === 'skipped'`を`status === 'approved'`に変更
  - _Requirements: 4.1_

- [x] 4.2 Grep検索でその他の`status === 'skipped'`判定がないことを確認
  - 残存箇所がある場合は削除
  - _Requirements: 4.3_

- [x] 5. UIボタンの確認
- [x] 5.1 `DocumentReviewPanel.tsx`にSkipボタンが存在しないことを確認
  - Grep検索で`review-skip-button`等のskip関連テスト識別子を検索
  - 存在しない場合はPASS（`document-review-phase` specで削除済み）
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. E2Eヘルパー関数から`'skip'`オプションを削除
- [x] 6.1 `auto-execution.helpers.ts`の`setDocumentReviewFlag()`から`'skip'`を削除
  - 型定義を`'run' | 'pause' | 'skip'`から`'run' | 'pause'`に変更
  - `'skip'`オプションの処理ロジックを削除
  - _Requirements: 5.2_

- [x] 7. E2Eテストの修正
- [x] 7.1 `auto-execution-document-review.e2e.spec.ts`の`Scenario 1: Document Review skipped`を削除
  - skip機能のテストケース全体を削除
  - _Requirements: 5.1_

- [x] 7.2 (P) `auto-execution-resume.e2e.spec.ts`の`setDocumentReviewFlag('skip')`を代替手段に置換
  - 2箇所の呼び出しを特定し、`permissions.documentReview = false`相当の処理に置換
  - テストの意図（Document Reviewをスキップして後続フェーズをテスト）を維持
  - _Requirements: 5.3, 5.4_

- [x] 7.3 (P) `auto-execution-impl-phase.e2e.spec.ts`の`setDocumentReviewFlag('skip')`を代替手段に置換
  - 2箇所の呼び出しを特定し、代替手段に置換
  - _Requirements: 5.3, 5.4_

- [x] 7.4 (P) `auto-execution-impl-flow.e2e.spec.ts`の`setDocumentReviewFlag('skip')`を代替手段に置換
  - 3箇所の呼び出しを特定し、代替手段に置換
  - _Requirements: 5.3, 5.4_

- [x] 7.5 (P) `inspection-workflow.e2e.spec.ts`の`setDocumentReviewFlag('skip')`を代替手段に置換
  - 2箇所の呼び出しを特定し、代替手段に置換
  - _Requirements: 5.3, 5.4_

- [x] 7.6 (P) `auto-execution-flow.e2e.spec.ts`の`setDocumentReviewFlag('skip')`を代替手段に置換
  - 1箇所の呼び出しを特定し、代替手段に置換
  - _Requirements: 5.3, 5.4_

- [x] 8. Dead Code検証
- [x] 8.1 Grep検索で削除漏れがないことを確認
  - `'skipped'`（型定義・ステータス値として）
  - `skipReview`（メソッド名として）
  - `skipDocumentReview`（IPC API名として）
  - `SKIPPED`（定数名として）
  - 検索結果がコメント/ドキュメントのみであることを確認
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. 検証
- [x] 9.1 TypeScriptコンパイルエラーがないことを確認
  - `cd electron-sdd-manager && npm run build && npm run typecheck`
  - _Requirements: 1.4_

- [x] 9.2 ユニットテストが成功することを確認
  - `cd electron-sdd-manager && npm run test:run`
  - _Requirements: 2.3_

- [x] 9.3 E2Eテストが成功することを確認
  - `task electron:test:e2e`
  - E2Eテストでの失敗は既存のworktree関連・schedule-task関連のテストであり、今回の変更とは無関係
  - document-review-ui-states.e2e.spec.ts, document-review.e2e.spec.ts は PASSED
  - auto-execution-document-review.e2e.spec.ts の Scenario 1 (skip) は正常に削除済み
  - _Requirements: 5.4_

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 10.1 `auto-execution-document-review.e2e.spec.ts`から`'skipped'`を削除
  - 関連: Task 8.1, Requirement 4.3, 8.1
  - 行415の`expect(['in_progress', 'pending', 'approved', 'skipped'])`から`'skipped'`を削除

- [x] 10.2 `document-review-ui-states.e2e.spec.ts`から`skipped` fixture定義を削除
  - 関連: Task 8.1, Requirement 8.1
  - 行145-149の`skipped: {...}`オブジェクト定義を削除

- [x] 10.3 `document-review-ui-states.e2e.spec.ts`から`Status: skipped` describeブロックを削除
  - 関連: Task 8.1, Requirement 8.1
  - 行625-658の`describe('Status: skipped', ...)`ブロック全体を削除
  - ファイルヘッダーコメントの`status: pending | in_progress | approved | skipped`から`skipped`も削除

- [x] 10.4 削除後のE2Eテスト実行・検証
  - 関連: Task 9.3, Requirement 5.4
  - `npm run typecheck`でコンパイルエラーがないことを確認
  - E2Eテストが成功することを確認

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | `renderer/types/documentReview.ts`の`SKIPPED`削除 | 1.2 | Infrastructure |
| 1.2 | `shared/types/review.ts`の`SKIPPED`削除 | 1.1 | Infrastructure |
| 1.3 | `ReviewStatus`型から`'skipped'`削除 | 1.1, 1.2 | Infrastructure |
| 1.4 | TypeScriptコンパイルエラーなし | 9.1 | Feature |
| 2.1 | `skipReview()`メソッド削除 | 2.1 | Infrastructure |
| 2.2 | `DocumentReviewService`インターフェースから`skipReview`削除 | 2.1 | Infrastructure |
| 2.3 | `skipReview`関連ユニットテスト削除 | 2.4 | Infrastructure |
| 3.1 | `preload/index.ts`から`skipDocumentReview()`削除 | 3.1 | Infrastructure |
| 3.2 | `ElectronAPI`型から`skipDocumentReview`削除 | 3.2 | Infrastructure |
| 3.3 | `specHandlers.ts`から`skipDocumentReview`ハンドラ削除 | 3.3 | Infrastructure |
| 4.1 | `SpecDetail.tsx`の`isReadyForImplementation`から`'skipped'`削除 | 4.1 | Feature |
| 4.2 | `canAddRound()`から`status === 'skipped'`削除 | 2.2 | Feature |
| 4.3 | その他の`status === 'skipped'`判定削除 | 4.2 | Feature |
| 5.1 | `auto-execution-document-review.e2e.spec.ts`のskipテスト削除 | 7.1 | Infrastructure |
| 5.2 | `setDocumentReviewFlag()`から`'skip'`削除 | 6.1 | Infrastructure |
| 5.3 | 各E2Eテストで`setDocumentReviewFlag('skip')`を代替手段に置換 | 7.2, 7.3, 7.4, 7.5, 7.6 | Feature |
| 5.4 | 代替手段がテストの意図に適していること | 7.2, 7.3, 7.4, 7.5, 7.6, 9.3 | Feature |
| 6.1 | `DocumentReviewPanel.tsx`にSkipボタンがないこと確認 | 5.1 | Feature |
| 6.2 | `data-testid="review-skip-button"`がないこと確認 | 5.1 | Feature |
| 6.3 | `document-review-phase` specで削除済みの場合PASS | 5.1 | Feature |
| 7.1 | `readSpecJsonInternal()`で`status === 'skipped'`検出時に警告ログ | 2.3 | Feature |
| 7.2 | ログにSpec名、status値、推奨対応を含む | 2.3 | Feature |
| 7.3 | ログレベルは`warn` | 2.3 | Feature |
| 8.1 | `'skipped'`キーワードで削除漏れなし | 8.1 | Feature |
| 8.2 | `skipReview`キーワードで削除漏れなし | 8.1 | Feature |
| 8.3 | `skipDocumentReview`キーワードで削除漏れなし | 8.1 | Feature |
| 8.4 | `SKIPPED`定数で削除漏れなし | 8.1 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
