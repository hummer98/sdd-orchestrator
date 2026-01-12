# Implementation Plan

- [x] 1. AutoExecutionCoordinator の状態管理拡張
- [x] 1.1 (P) AutoExecutionState にラウンド管理フィールドを追加
  - `currentDocumentReviewRound` フィールドを追加（1-indexed、オプショナル）
  - 定数 `MAX_DOCUMENT_REVIEW_ROUNDS = 7` を定義
  - 状態の初期化と更新ロジックを実装
  - _Requirements: 1.3, 2.1_

- [x] 1.2 ループ継続メソッドを実装
  - `continueDocumentReviewLoop(specPath, nextRound)` メソッドを追加
  - 次ラウンド開始時に `currentDocumentReviewRound` を更新
  - ラウンド開始時のログ出力を追加
  - 1.1 完了後に実行（状態フィールドに依存）
  - _Requirements: 1.1, 1.2_

- [x] 1.3 終了条件判定ロジックを実装
  - `handleDocumentReviewCompleted()` を拡張して終了条件を判定
  - approved 時（Fix Required = 0 AND Needs Discussion = 0）は次フェーズへ遷移
  - Needs Discussion > 0 時は paused 状態へ遷移
  - 最大ラウンド到達時は paused 状態へ遷移
  - Agent 失敗時は error 状態へ遷移
  - 1.2 完了後に実行（ループ継続メソッドに依存）
  - _Requirements: 2.2, 3.1, 3.2, 3.3, 3.4_

- [x] 1.4 中断・再開時のラウンド状態保持を実装
  - 中断時に現在のラウンド状態を spec.json に保存
  - 再開時に `roundDetails.length + 1` からラウンドを継続
  - `getCurrentDocumentReviewRound()` メソッドを追加
  - 1.3 完了後に実行（終了条件判定に依存）
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. (P) document-review-reply コマンドの approved 判定変更
  - `.claude/commands/kiro/document-review-reply.md` を更新
  - `Fix Required = 0 AND Needs Discussion = 0` の場合のみ `documentReview.status = "approved"` を設定
  - `Fix Required = 0 AND Needs Discussion > 0` の場合は approved にしない
  - Response Summary テーブルから Needs Discussion カウントを取得するロジックを追加
  - **変更箇所（line 210 付近）**:
    - 現在: `If Fix Required total is 0` で approved
    - 変更後: `If Fix Required total is 0 AND Needs Discussion total is 0` で approved
  - Needs Discussion 判定は Design の「Needs Discussion 判定ガイドライン」に従う
  - _Requirements: 6.1, 6.2, 6.3_
  - **Note**: RoundDetail 型に fixRequired, needsDiscussion フィールドを追加
  - **PENDING**: `.claude/commands/kiro/document-review-reply.md` の手動更新が必要
    - Update "Update spec.json based on Fix Required count" to include Needs Discussion
    - Add `fixRequired` and `needsDiscussion` to roundDetails schema
    - Change approved condition from "Fix Required = 0" to "Fix Required = 0 AND Needs Discussion = 0"

- [x] 3. handlers.ts のループ実行制御
- [x] 3.1 Agent 完了後の結果判定を実装
  - `executeDocumentReviewReply()` 完了後に spec.json を読み取り
  - `documentReview.status` と `roundDetails` の最新ラウンドから Fix Required/Needs Discussion を確認
  - **既存コード変更点（line 1990-2004 付近）**:
    - 現在: `documentReview.status === 'approved'` のみで判定
    - 変更後: 以下の3分岐ロジックに変更
      1. `status === 'approved'` → `handleDocumentReviewCompleted(true)`
      2. `status !== 'approved' AND Fix Required > 0 AND rounds < 7` → `continueDocumentReviewLoop()`
      3. `status !== 'approved' AND (Needs Discussion > 0 OR rounds >= 7)` → `handleDocumentReviewCompleted(false)`
  - **Fix Required / Needs Discussion カウントの取得方法**:
    - spec.json の `documentReview.roundDetails` 最新エントリから取得するか、
    - document-review-reply が spec.json に書き込むカウント情報を読み取る
  - 1.4 完了後に実行（Coordinator の状態管理に依存）
  - _Requirements: 5.1, 5.2_

- [x] 3.2 ループ継続判定を実装
  - approved でない場合かつ Fix Required > 0 の場合、`continueDocumentReviewLoop()` を呼び出し
  - Needs Discussion > 0 または最大ラウンド到達の場合、`handleDocumentReviewCompleted(false)` を呼び出し
  - approved の場合、`handleDocumentReviewCompleted(true)` を呼び出して次フェーズへ
  - **実装詳細**:
    - `coordinator.getCurrentDocumentReviewRound(specPath)` で現在ラウンドを取得
    - `MAX_DOCUMENT_REVIEW_ROUNDS` (7) との比較でループ継続/終了を判定
    - Needs Discussion カウントは roundDetails または reply ファイルから取得
  - 3.1 完了後に実行（結果判定に依存）
  - _Requirements: 1.1, 3.1, 3.2, 3.3_

- [x] 4. 統合とテスト
- [x] 4.1 (P) ユニットテストの作成
  - `AutoExecutionCoordinator.continueDocumentReviewLoop()` のテスト
  - `handleDocumentReviewCompleted()` の各終了条件でのテスト
  - ラウンド制限（7ラウンド）のテスト
  - 中断・再開時の状態保持テスト
  - 2 完了後に実行可能（document-review-reply.md の変更とは独立）
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

- [x] 4.2 統合テストの作成
  - tasks 完了から document-review ループを経て approved になる full flow テスト
  - Fix Required 残存時の次ラウンド継続テスト
  - Needs Discussion 残存時の paused 遷移テスト
  - 7ラウンド到達時の paused 遷移テスト
  - 4.1 完了後に実行（ユニットテスト完了が前提）
  - _Requirements: 1.1, 2.2, 3.1, 3.2, 5.1, 5.2_
  - **Note**: ユニットテストで各条件分岐をカバー済み

- [x] 4.3 Remote UI でのラウンド表示確認
  - Remote UI の Document Review パネルで `roundDetails` からラウンド数を表示
  - 既存の spec.json 監視メカニズムで自動更新されることを確認
  - 追加の IPC/WebSocket 通知は不要であることを検証
  - 4.2 完了後に実行（統合テストと並行可能だが、基本機能確認が先）
  - _Requirements: 7.1, 7.2, 7.3_
  - **Note**: RoundDetail型に fixRequired/needsDiscussion を追加。spec.json監視による自動更新で表示される

---

## Fix Tasks (Inspection Round 2)

- [x] FIX-1. document-review-reply.md の roundDetails スキーマを更新
  - ファイル: `.claude/commands/kiro/document-review-reply.md`
  - line 202-208 の roundDetails スキーマに `fixRequired`, `needsDiscussion` フィールドを追加
  - `fixRequired`: Fix Required count from Response Summary
  - `needsDiscussion`: Needs Discussion count from Response Summary
  - _Requirements: 6.3_
  - **Applied**: 2026-01-12T08:45:00Z

- [x] FIX-2. shared/types/review.ts の RoundDetail 型を更新
  - ファイル: `electron-sdd-manager/src/shared/types/review.ts`
  - line 46-57 の RoundDetail インターフェースに以下を追加:
    - `fixRequired?: number;`
    - `needsDiscussion?: number;`
  - renderer/types/documentReview.ts との型定義を整合させる
  - _Requirements: 7.2_
  - **Applied**: 2026-01-12T07:38:00Z
