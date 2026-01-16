# Implementation Plan

## Task 1. FixStatus型定義と RoundDetail インターフェース更新

- [x] 1.1 (P) FixStatus 型を定義し RoundDetail を更新する
  - `FixStatus` 型を `'not_required' | 'pending' | 'applied'` の3値として定義する
  - JSDoc で各値の意味を説明する（not_required: 次プロセスへ進む、pending: 停止、applied: 再レビュー）
  - `RoundDetail` インターフェースに `fixStatus?: FixStatus` フィールドを追加する
  - `fixApplied?: boolean` フィールドを削除する
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3_

## Task 2. 遅延移行ロジックの実装

- [x] 2.1 normalizeRoundDetail メソッドを拡張する
  - `fixStatus` が未定義で `fixApplied: true` の場合、`fixStatus: 'applied'` に変換する
  - `fixStatus` が未定義で `fixApplied` がfalseまたは未定義かつ `fixRequired > 0` または `needsDiscussion > 0` の場合、`fixStatus: 'pending'` に変換する
  - `fixStatus` が未定義で `fixRequired === 0` かつ `needsDiscussion === 0` の場合、`fixStatus: 'not_required'` に変換する
  - `fixStatus` が既に存在する場合は変換しない（`fixStatus` を優先）
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Task 3. document-review-reply コマンドテンプレート更新

- [x] 3.1 (P) cc-sdd 用テンプレートを更新する
  - `.claude/commands/kiro/document-review-reply.md` の `fixApplied` 参照を `fixStatus` に更新する
  - fixStatus 判定ロジックを記載する（--autofix/--fix で修正適用時は `applied`、fixRequired/needsDiscussion > 0 で `pending`、それ以外は `not_required`）
  - roundDetails スキーマの説明を更新する
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.2 (P) spec-manager 用テンプレートを更新する
  - `electron-sdd-manager/resources/templates/commands/spec-manager/document-review-reply.md` の `fixApplied` 参照を `fixStatus` に更新する
  - fixStatus 判定ロジックを記載する
  - roundDetails スキーマの説明を更新する
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.3 (P) document-review 用テンプレートを更新する
  - `electron-sdd-manager/resources/templates/commands/document-review/document-review-reply.md` の `fixApplied` 参照を `fixStatus` に更新する
  - fixStatus 判定ロジックを記載する
  - roundDetails スキーマの説明を更新する
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

## Task 4. 自動実行ループの判定ロジック更新

- [x] 4.1 handlers.ts の判定ロジックを fixStatus ベースに更新する
  - document-review-reply 完了後の判定ロジックを `fixStatus` ベースに変更する
  - `fixStatus === 'not_required'` の場合、`documentReview.status: 'approved'` を設定しレビューサイクルを脱出する
  - `fixStatus === 'pending'` の場合、自動実行を停止する（人間の介入待ち）
  - `fixStatus === 'applied'` の場合、次のラウンドの document-review を開始する
  - `fixStatus` が未定義の場合のフォールバック動作を実装する（normalizeRoundDetail で変換されるため通常は発生しない）
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Task 5. ドキュメント更新

- [x] 5.1 (P) skill-reference.md に RoundDetail スキーマセクションを追加する
  - `.kiro/steering/skill-reference.md` に RoundDetail スキーマセクションを新規追加する
  - `fixStatus` フィールドの説明を含める（3つの値: not_required, pending, applied とその意味）
  - その他のフィールド（roundNumber, status, fixRequired, needsDiscussion）の説明も含める
  - _Requirements: 7.1, 7.2_

## Task 6. テスト更新と検証

- [x] 6.1 normalizeRoundDetail の単体テストを追加する
  - `fixApplied: true` から `fixStatus: 'applied'` への変換をテストする
  - `fixApplied: false` + counts > 0 から `fixStatus: 'pending'` への変換をテストする
  - `fixApplied: undefined` + counts = 0 から `fixStatus: 'not_required'` への変換をテストする
  - `fixStatus` が既に存在する場合に優先されることをテストする
  - 両フィールドが存在する場合に `fixStatus` が優先されることをテストする
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.4_

- [x] 6.2 handlers.ts の判定ロジックテストを更新する
  - `fixStatus: 'not_required'` で approved フローが動作することをテストする
  - `fixStatus: 'pending'` で停止フローが動作することをテストする
  - `fixStatus: 'applied'` で継続フローが動作することをテストする
  - `fixStatus: undefined` のフォールバック動作をテストする
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.4_

- [x] 6.3 既存テストの fixApplied 参照を更新する
  - テストファイル内の `fixApplied` 参照を `fixStatus` に更新する
  - テストデータの `fixApplied` フィールドを `fixStatus` に変更する
  - _Requirements: 6.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | RoundDetail に fixStatus フィールド追加 | 1.1 | Infrastructure |
| 1.2 | FixStatus 型定義 | 1.1 | Infrastructure |
| 1.3 | fixApplied フィールド削除 | 1.1 | Infrastructure |
| 2.1 | 修正適用時に applied 設定 | 3.1, 3.2, 3.3 | Feature |
| 2.2 | fixRequired/needsDiscussion > 0 で pending 設定 | 3.1, 3.2, 3.3 | Feature |
| 2.3 | counts = 0 で not_required 設定 | 3.1, 3.2, 3.3 | Feature |
| 3.1 | document-review-reply (no flag) で fixStatus 設定 | 3.1, 3.2, 3.3 | Feature |
| 3.2 | --autofix 修正ありで applied 設定 | 3.1, 3.2, 3.3 | Feature |
| 3.3 | --autofix 修正なしで not_required 設定 | 3.1, 3.2, 3.3 | Feature |
| 3.4 | --fix で applied 設定 | 3.1, 3.2, 3.3 | Feature |
| 3.5 | テンプレート内 fixApplied 参照を fixStatus に更新 | 3.1, 3.2, 3.3 | Feature |
| 4.1 | not_required で approved 設定・サイクル脱出 | 4.1 | Feature |
| 4.2 | pending で停止 | 4.1 | Feature |
| 4.3 | applied で新ラウンド開始 | 4.1 | Feature |
| 4.4 | handlers.ts 判定ロジック更新 | 4.1 | Feature |
| 5.1 | fixApplied: true から applied 変換 | 2.1 | Feature |
| 5.2 | fixApplied: false + counts > 0 から pending 変換 | 2.1 | Feature |
| 5.3 | fixApplied: undefined + counts = 0 から not_required 変換 | 2.1 | Feature |
| 5.4 | normalizeRoundDetail メソッド実装 | 2.1 | Feature |
| 6.1 | FixStatus 型を review.ts に追加 | 1.1 | Infrastructure |
| 6.2 | RoundDetail インターフェース更新 | 1.1 | Infrastructure |
| 6.3 | fixApplied フィールド削除 | 1.1 | Infrastructure |
| 6.4 | 関連テストファイル更新 | 6.1, 6.2, 6.3 | Feature |
| 7.1 | skill-reference.md 更新 | 5.1 | Feature |
| 7.2 | コマンドテンプレート fixApplied 参照更新 | 3.1, 3.2, 3.3 | Feature |
