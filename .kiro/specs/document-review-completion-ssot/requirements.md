# Requirements: DocumentReview完了判定のSSOT統一

## Decision Log

### 完了判定のSSOT選定
- **議論**: UIは `roundDetails.length >= 1` で緑チェック表示、AutoExecutionCoordinatorは `documentReview.status === 'approved'` でimplフェーズへの進行を判定している。trpc-full-migrationのように7ラウンド実施済みでも `status: "pending"` のspecでは、UIが緑チェックを表示しているにもかかわらず自動実行でimplに進めない矛盾が発生。
- **結論**: `documentReview.status === 'approved'` をSSOTとしてUI・自動実行の両方で統一する
- **理由**: AutoExecutionCoordinatorの判定は厳密で正しい。UIの判定が甘すぎるのが根本原因。`status` フィールドはDocumentReviewServiceで明示的に管理されており、SSoTとして信頼できる

### 未承認状態（pending + roundDetailsあり）のUI表示
- **議論**: 多ラウンド実施済みだが未承認の状態を中間アイコン（例: オレンジ色チェック）で表示するか、単に未完了（灰色丸）とするか
- **結論**: `unchecked`（灰色丸）で表示する。中間状態アイコンは追加しない
- **理由**: KISS原則に従い、approved = 緑チェック、それ以外 = 未完了の2値で充分。中間状態の追加はユーザー混乱の原因になりうる

### 自動実行フローでのapproved永続化
- **議論**: 自動実行の `executeDocumentReviewReply` が `fixStatus === 'not_required'` と判定した場合、`coordinator.handleDocumentReviewCompleted(specPath, true)` で次フェーズに進むが、`documentReview.status` を `'approved'` に更新していない。そのため再度自動実行を開始した際に `getLastCompletedPhase` がdocument-reviewを完了と認識できない
- **結論**: `handleDocumentReviewCompleted(specPath, true)` を呼ぶ前に `docReviewService.approveReview(specPath)` を呼んで `status: 'approved'` を永続化する
- **理由**: 自動実行が「完了」と判定したならspec.jsonにもその状態を反映すべき。次回の自動実行開始時にも正しく認識できる

### ループ継続時のapproveReview呼び出し
- **議論**: `fixStatus === 'applied'` かつ `currentRoundNumber < MAX_ROUNDS` の場合（ループ継続）にapproveReviewを呼ぶべきか
- **結論**: 呼ばない
- **理由**: 修正が適用されただけで再レビューが必要な状態。approvedにすると次回自動実行でdocument-reviewをスキップしてしまう

## Introduction

DocumentReviewの完了判定がUI（`DocumentReviewPanel.tsx`の`getProgressIndicatorState`）とMain Process（`autoExecutionCoordinator.ts`の`getLastCompletedPhase`）で異なる基準を使用しており、ユーザーにとって矛盾した表示・動作となっている。`documentReview.status === 'approved'` をSSOT（Single Source of Truth）として統一し、UI表示と自動実行のGO/NOGO判定を一致させる。

## Requirements

### Requirement 1: UI完了インジケーターの厳密化

**Objective:** 開発者として、DocumentReviewPanelの緑チェックが自動実行の進行可否と一致してほしい。そうすることで、UIの表示を信頼してワークフローを進められる。

#### Acceptance Criteria
1. `documentReview.status` が `'approved'` の場合、進捗インジケーターは `checked`（緑チェック）を表示する
2. `documentReview.status` が `'in_progress'` の場合、または `isExecuting` が true の場合、進捗インジケーターは `executing`（青パルスBot）を表示する
3. `documentReview.status` が `'pending'` の場合、`roundDetails` の件数に関わらず、進捗インジケーターは `unchecked`（灰色丸）を表示する
4. `documentReview.status` が null/undefined の場合、進捗インジケーターは `unchecked`（灰色丸）を表示する

#### 影響範囲
- `src/shared/components/review/DocumentReviewPanel.tsx` の `getProgressIndicatorState` 関数

### Requirement 2: 自動実行フローでのapproved状態永続化

**Objective:** 自動実行システムとして、document-reviewフェーズが完了と判定された場合に `status: 'approved'` をspec.jsonに永続化したい。そうすることで、次回の自動実行開始時にもdocument-review完了状態を正しく認識できる。

#### Acceptance Criteria
1. `executeDocumentReviewReply` で `fixStatus === 'not_required'` と判定された場合、`docReviewService.approveReview(specPath)` が呼ばれ、`coordinator.handleDocumentReviewCompleted(specPath, true)` の前に `documentReview.status` が `'approved'` に更新される
2. フォールバックロジックで `fixRequired === 0 && needsDiscussion === 0` と判定された場合も、同様に `approveReview` が呼ばれる
3. `documentReview.status` が既に `'approved'` の場合、`approveReview` の重複呼び出しは行わない（`isApproved` ガード）
4. `fixStatus === 'applied'` かつ `currentRoundNumber < MAX_DOCUMENT_REVIEW_ROUNDS` の場合（ループ継続）は `approveReview` を呼ばない
5. `fixStatus === 'pending'` の場合は `approveReview` を呼ばない
6. `approveReview` の呼び出しが失敗しても、`handleDocumentReviewCompleted` の呼び出しは継続する（ログ出力のみ）

#### 影響範囲
- `src/main/trpc/helpers/projectSetup.ts` の `executeDocumentReviewReply` 関数

### Requirement 3: ユニットテストの整合性

**Objective:** テストエンジニアとして、UI完了インジケーターのテストが新しいSSOTルールを正しく検証してほしい。

#### Acceptance Criteria
1. `status: 'approved'` + `roundDetails` ありの場合に `progress-indicator-checked` が表示されるテストが存在する
2. `status: 'pending'` + `roundDetails` ありの場合に `progress-indicator-unchecked` が表示されるテストが存在する
3. `status: 'pending'` + `roundDetails` なしの場合に `progress-indicator-unchecked` が表示されるテストが存在する
4. `status: 'in_progress'` の場合に `progress-indicator-executing` が表示されるテストが存在する
5. 既存の `status: 'pending'` で `checked` を期待するテストは新しい期待値に修正される

#### 影響範囲
- `src/shared/components/review/DocumentReviewPanel.test.tsx`
- `src/renderer/components/DocumentReviewPanel.test.tsx`

### Requirement 4: E2Eテストでの多ラウンドdocumentReview検証

**Objective:** E2Eテストで、多ラウンドのdocumentReview（approved状態）から自動実行ボタンを押してimplが開始されることを検証したい。

#### Acceptance Criteria
1. E2Eテストのfixture `ALL_PHASES_COMPLETED_SPEC_JSON` が、複数ラウンドの `roundDetails`（少なくとも3ラウンド以上）を含む `documentReview` を持つ
2. 各ラウンドは `status: 'reply_complete'`, `fixStatus: 'applied'` の履歴を持ち、最終的に `documentReview.status: 'approved'` である
3. この多ラウンド状態で自動実行ボタンを押した際、implフェーズが正常に開始される
4. `SDD_PROJECT_PATH` 環境変数方式でプロジェクト選択を行う（`selectProjectViaStore` は使用しない）

#### 影響範囲
- `electron-sdd-manager/e2e-wdio/auto-execution-impl-phase.e2e.spec.ts`

## Remote UI対応

**Remote UI対応: 不要（shared経由で自動反映）**

`getProgressIndicatorState` は `src/shared/` 配下の共有コンポーネントに定義されており、Electron版・Remote UI版の両方で自動的に使用される。ロジック変更はRemote UIにも自動反映されるため、Remote UI固有の追加コード変更は不要。

## Out of Scope

- DocumentReview UIの中間状態アイコン（オレンジ色チェック等）の追加
- `documentReview.status` の自動遷移ロジックの変更（`pending` → `approved` の自動遷移は追加しない。明示的な `approveReview` 呼び出しまたは自動実行フローでの判定による）
- InspectionPanelの完了判定変更（Inspectionは `approved` ステータスを持たず、別のドメインモデル）
- DocumentReviewServiceの `approveReview()` メソッド自体の変更

## Open Questions

- なし（設計フェーズで詳細な実装方針を決定）
