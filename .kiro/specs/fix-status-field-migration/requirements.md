# Requirements: fix-status-field-migration

## Decision Log

### fixApplied の問題点

- **Discussion**: `fixApplied: boolean` では3つの状態を区別できない
  - Fix不要（次プロセスへ進める）
  - Fix必要だが未適用（--fix待ち）
  - Fix適用済み（再レビュー必要）
- **Conclusion**: `fixApplied` を廃止し、`fixStatus` フィールドに統合
- **Rationale**: 状態が明示的になり、自動実行ループの判定ロジックがシンプルになる

### fixStatus の値

- **Discussion**: どのような値を持つべきか
- **Conclusion**: `'not_required' | 'pending' | 'applied'` の3値
- **Rationale**:
  - `not_required`: 修正も議論も不要 → 次プロセスへ
  - `pending`: 修正待ち or Discussion待ち → 停止
  - `applied`: 修正適用済み → 再レビューサイクル

### needsDiscussion の扱い

- **Discussion**: `needsDiscussion > 0` の場合どうするか
- **Conclusion**: `pending` 扱いとし、自動実行を停止
- **Rationale**: 議論が必要な項目は人間の判断が必要

### --autofix 時の needsDiscussion

- **Discussion**: `--autofix` 実行時に `needsDiscussion > 0` の場合の挙動
- **Conclusion**: Fix部分は適用し、警告表示。`fixStatus` は `applied` に設定
- **Rationale**: 修正を適用したなら再レビューが必要。Discussion項目は次ラウンドで再確認

### サイクル脱出条件

- **Discussion**: Document Reviewサイクルを脱出する条件
- **Conclusion**: `fixStatus: 'not_required'` になったら自動的に脱出（`documentReview.status: 'approved'` も自動設定）
- **Rationale**: 完全自動化を実現

### 既存データの移行

- **Discussion**: 既存の `fixApplied` フィールドをどう扱うか
- **Conclusion**: 読み込み時に自動変換（遅延移行）
- **Rationale**: 一括移行スクリプトは実行漏れリスクがある。古いspecを開いたときに自然に移行される

### fixRequired の維持

- **Discussion**: `--autofix` 後に `fixRequired` の値をどうするか
- **Conclusion**: 元の値を維持（記録として）
- **Rationale**: 「元々いくつFixが必要だったか」の情報は有用

## Introduction

Document Review Reply後の次アクション判定を明確化するため、`RoundDetail` の `fixApplied: boolean` フィールドを廃止し、`fixStatus: 'not_required' | 'pending' | 'applied'` フィールドに統合する。これにより、自動実行ループの判定ロジックがシンプルになり、3つの状態（次プロセスへ進む、停止、再レビュー）を明確に区別できるようになる。

## Requirements

### Requirement 1: fixStatus フィールドの追加

**Objective:** As a developer, I want a clear field to determine the next action after document-review-reply, so that the auto-execution loop can make correct decisions.

#### Acceptance Criteria

1. `RoundDetail` 型に `fixStatus?: FixStatus` フィールドが追加されること
2. `FixStatus` 型は `'not_required' | 'pending' | 'applied'` であること
3. `fixApplied` フィールドは型定義から削除されること

### Requirement 2: fixStatus の判定ロジック

**Objective:** As a system, I want to determine fixStatus based on fixRequired, needsDiscussion, and whether fixes were applied, so that the correct next action is taken.

#### Acceptance Criteria

1. When fixes were applied in this execution, the system shall set `fixStatus: 'applied'`
2. When `fixRequired > 0` OR `needsDiscussion > 0` and no fixes were applied, the system shall set `fixStatus: 'pending'`
3. When `fixRequired === 0` AND `needsDiscussion === 0` and no fixes were applied, the system shall set `fixStatus: 'not_required'`

### Requirement 3: document-review-reply コマンドの更新

**Objective:** As a user, I want the document-review-reply command to set fixStatus correctly, so that the auto-execution loop works as expected.

#### Acceptance Criteria

1. When document-review-reply (no flag) completes, the system shall set `fixStatus` based on `fixRequired` and `needsDiscussion` counts
2. When document-review-reply --autofix completes with modifications, the system shall set `fixStatus: 'applied'`
3. When document-review-reply --autofix completes without modifications (fixRequired=0, needsDiscussion=0), the system shall set `fixStatus: 'not_required'`
4. When document-review-reply --fix completes, the system shall set `fixStatus: 'applied'`
5. コマンドテンプレート内の `fixApplied` への参照をすべて `fixStatus` に更新すること

### Requirement 4: 自動実行ループの判定ロジック更新

**Objective:** As a system, I want the auto-execution loop to use fixStatus for decision making, so that the correct next action is taken.

#### Acceptance Criteria

1. When `fixStatus === 'not_required'`, the system shall set `documentReview.status: 'approved'` and exit the review cycle
2. When `fixStatus === 'pending'`, the system shall pause execution (waiting for --fix or human intervention)
3. When `fixStatus === 'applied'`, the system shall start a new document-review round
4. `handlers.ts` の判定ロジックを `fixStatus` ベースに更新すること

### Requirement 5: 既存データの遅延移行

**Objective:** As a system, I want to automatically migrate old fixApplied data when reading, so that backward compatibility is maintained.

#### Acceptance Criteria

1. When reading `RoundDetail` with `fixApplied: true`, the system shall convert to `fixStatus: 'applied'`
2. When reading `RoundDetail` with `fixApplied: false` or undefined and `fixRequired > 0` OR `needsDiscussion > 0`, the system shall convert to `fixStatus: 'pending'`
3. When reading `RoundDetail` with `fixApplied` undefined and `fixRequired === 0` AND `needsDiscussion === 0`, the system shall convert to `fixStatus: 'not_required'`
4. 移行ロジックは `documentReviewService.ts` の `normalizeRoundDetail` メソッドに実装すること

### Requirement 6: 型定義の更新

**Objective:** As a developer, I want the TypeScript types to reflect the new schema, so that type safety is maintained.

#### Acceptance Criteria

1. `electron-sdd-manager/src/shared/types/review.ts` に `FixStatus` 型を追加すること
2. `RoundDetail` インターフェースを更新すること
3. `fixApplied` フィールドを削除すること
4. 関連するテストファイルを更新すること

### Requirement 7: ドキュメントの更新

**Objective:** As a developer, I want the documentation to reflect the new schema, so that the behavior is clearly documented.

#### Acceptance Criteria

1. `.kiro/steering/skill-reference.md` の `roundDetails` スキーマ説明を更新すること
2. コマンドテンプレート（3箇所）の `fixApplied` 参照を `fixStatus` に更新すること

## Out of Scope

- `documentReview.status` フィールドの廃止（維持する）
- 一括移行スクリプトの作成（遅延移行で対応）
- UI表示の変更（既存のUIは `fixStatus` を解釈して表示を調整）

## Open Questions

- なし（対話で解決済み）
