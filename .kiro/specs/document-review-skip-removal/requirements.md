# Requirements: Document Review Skip機能の完全削除

## Decision Log

### スコープの決定
- **Discussion**: `document-review-phase` specで`documentReviewFlag`（run/pause/skip）を`permissions.documentReview`（GO/NOGO）に統合したが、`documentReview.status = 'skipped'`自体や関連する実装コード・テストコードは削除されていない。完全削除、段階的削除、保守モードのいずれを選択するか
- **Conclusion**: 完全削除を実施
- **Rationale**: Skip機能は設計思想に反する。Document Reviewは品質管理の必須プロセスであり、スキップ手段を提供すべきではない。UIからのアクセス手段は既に削除済みだが、実装コードとテストの残存はメンテナンスコストとなる

### E2Eテストの扱い
- **Discussion**: 約10ファイルのE2Eテストがskip機能を使用している。テストを書き換えるか、skip機能のテスト自体を削除するか
- **Conclusion**: Skip機能のテストを削除
- **Rationale**: Skip機能自体を削除するため、その動作を検証するテストも不要。他のテストでskip機能を便利に使っている箇所は、別の方法（permissions.documentReview = falseで停止、等）に書き換える

### 既存データのマイグレーション
- **Discussion**: 既存のspec.jsonで`documentReview.status = 'skipped'`になっているデータをどう扱うか（マイグレーション、エラー扱い、放置）
- **Conclusion**: 放置（マイグレーション不要）
- **Rationale**: 既存データの書き換えはリスクが高く、新規実行時には発生しない。読み込み時に警告ログを出力することで、異常な状態であることを記録する

### エラーハンドリング
- **Discussion**: `status = 'skipped'`のデータを読み込んだ場合の動作（無視、警告ログ、エラー）
- **Conclusion**: 警告ログを出力
- **Rationale**: エラーにすると既存データが使えなくなる。無視すると気づかない。警告ログで記録することで、将来的な対応の判断材料を残す

### 代替手段の方針
- **Discussion**: Document Reviewをスキップしたい場合の推奨方法（permissions.documentReview = false、手動Approve、スキップ自体を非推奨）
- **Conclusion**: スキップ自体を非推奨（Document Reviewは必須プロセス）
- **Rationale**: Document Reviewは仕様書の品質を保証する重要なプロセス。スキップ手段を提供しないことで、品質管理の徹底を促す

## Introduction

`document-review-phase` specで`documentReviewFlag`の3値（run/pause/skip）を`permissions.documentReview`の2値（GO/NOGO）に統合したが、`documentReview.status = 'skipped'`自体や関連する実装コード・テストコードは削除されていなかった。本specでは、skip機能を完全に削除し、Document Reviewを必須プロセスとする設計思想を徹底する。

## Requirements

### Requirement 1: 型定義からskipped statusの削除

**Objective:** `ReviewStatus`型から`'skipped'`を削除し、有効なステータスを明確化する

#### Acceptance Criteria

1. `src/renderer/types/documentReview.ts`の`REVIEW_STATUS`から`SKIPPED`定数が削除されること
2. `src/shared/types/review.ts`の`REVIEW_STATUS`から`SKIPPED`定数が削除されること
3. `ReviewStatus`型から`'skipped'`リテラル型が削除されること
4. TypeScriptコンパイルエラーが発生しないこと

### Requirement 2: サービスメソッドの削除

**Objective:** `skipReview()`メソッドを削除し、スキップ機能への内部アクセス手段を廃止する

#### Acceptance Criteria

1. `src/main/services/documentReviewService.ts`から`skipReview()`メソッドが削除されること
2. `DocumentReviewService`クラスのインターフェースから`skipReview`が削除されること
3. 関連するユニットテスト（`documentReviewService.test.ts`内のskipReview関連テスト）が削除されること

### Requirement 3: IPC APIの削除

**Objective:** Renderer/Remote UIからskip機能を呼び出す手段を削除する

#### Acceptance Criteria

1. `src/preload/index.ts`から`skipDocumentReview()`メソッドが削除されること
2. `ElectronAPI`型定義から`skipDocumentReview`が削除されること
3. `src/main/ipc/handlers.ts`から`skipDocumentReview`のIPCハンドラが削除されること（存在する場合）

### Requirement 4: ロジックからskipped判定の削除

**Objective:** `status === 'skipped'`の判定分岐を削除し、コードを簡潔化する

#### Acceptance Criteria

1. `src/renderer/components/SpecDetail.tsx`の`isReadyForImplementation`判定から`status === 'skipped'`が削除されること
2. `src/main/services/documentReviewService.ts`の`canAddRound()`から`status === 'skipped'`判定が削除されること
3. その他のファイルで`status === 'skipped'`を含む判定分岐がないこと（Grep検証）

### Requirement 5: E2Eテストの削除・修正

**Objective:** Skip機能のテストを削除し、他のテストでskip機能を使用している箇所を修正する

#### Acceptance Criteria

1. `electron-sdd-manager/e2e-wdio/auto-execution-document-review.e2e.spec.ts`の`Scenario 1: Document Review skipped`テストが削除されること
2. `electron-sdd-manager/e2e-wdio/helpers/auto-execution.helpers.ts`の`setDocumentReviewFlag()`関数から`'skip'`オプションが削除されること
3. 以下のファイルで`setDocumentReviewFlag('skip')`呼び出しが削除または代替手段に置き換えられること：
   - `auto-execution-resume.e2e.spec.ts`（2箇所）
   - `auto-execution-impl-phase.e2e.spec.ts`（2箇所）
   - `auto-execution-impl-flow.e2e.spec.ts`（3箇所）
   - `inspection-workflow.e2e.spec.ts`（2箇所）
   - `auto-execution-flow.e2e.spec.ts`（1箇所）
4. 代替手段（例：`permissions.documentReview = false`でDocument Reviewフェーズを停止）が各テストの意図に適していること

### Requirement 6: UIボタンの確認

**Objective:** Document ReviewパネルにSkipボタンが存在しないことを確認する

#### Acceptance Criteria

1. `src/shared/components/review/DocumentReviewPanel.tsx`に「スキップ」ボタンが存在しないこと（存在する場合は削除）
2. `data-testid="review-skip-button"`等のskip関連テスト識別子が存在しないこと（Grep検証）
3. Skipボタンの削除が`document-review-phase` specで既に完了している場合は、本要件をPASSとする

### Requirement 7: 警告ログの実装

**Objective:** `status = 'skipped'`のデータを読み込んだ場合に警告ログを出力する

#### Acceptance Criteria

1. `src/main/services/documentReviewService.ts`の`readSpecJsonInternal()`または類似メソッドで、`documentReview.status === 'skipped'`を検出したとき、警告ログを出力すること
2. ログメッセージは以下の情報を含むこと：
   - Spec名
   - 現在のstatus値（'skipped'）
   - 推奨対応（手動でstatusを修正する、等）
3. ログレベルは`warn`であること（`logger.warn()`使用）

### Requirement 8: Dead Code削除の確認

**Objective:** skip機能に関連するデッドコードが残存していないことを確認する

#### Acceptance Criteria

1. 以下のキーワードでGrep検索し、削除漏れがないこと：
   - `'skipped'`（型定義・ステータス値として）
   - `skipReview`（メソッド名として）
   - `skipDocumentReview`（IPC API名として）
   - `SKIPPED`（定数名として）
2. 検索結果に残存している箇所は、コメントやドキュメントのみであること（実装コードではない）

## Out of Scope

- `documentReview.status`フィールド自体の削除（他のstatus値は継続使用）
- Remote UIの大幅な変更（shared/stores, shared/componentsの変更に追従するのみ）
- 既存のspec.jsonファイルのマイグレーション（`status = 'skipped'`の書き換え）
- Document Reviewパネルの機能拡張（Skip以外の新機能追加）
- `document-review-phase` specで実装された機能の変更

## Open Questions

なし（対話で全て解決済み）
