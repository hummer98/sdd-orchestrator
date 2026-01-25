# Requirements: Document Review Phase Promotion

## Decision Log

### フェーズの位置
- **Discussion**: Document Review をワークフローのどこに配置するか
- **Conclusion**: `tasks` と `impl` の間に配置
- **Rationale**: 既存の動作と同じ位置。tasks 完了後、実装前にドキュメント品質を確認する

### permissions への統合方法
- **Discussion**: `documentReviewFlag` を廃止して permissions に統合する際、どのような形式にするか（GO/NOGO の2値 vs run/pause/skip の3値）
- **Conclusion**: 他のフェーズと同様に `boolean` (GO/NOGO) で統合
- **Rationale**: 現状の `run`/`pause` は実装されておらず機能していない。シンプルな GO/NOGO で十分

### NOGO 時の動作
- **Discussion**: NOGO 設定時にスキップするか停止するか
- **Conclusion**: 停止（他のフェーズと同じ動作）
- **Rationale**: 一貫性。NOGO フェーズに到達したら自動実行を停止する

### フェーズ完了の定義
- **Discussion**: Document Review フェーズの「完了」をどう定義するか
- **Conclusion**: `documentReview.status === 'approved'` になったとき
- **Rationale**: セマンティックに正しい。ドキュメントレビューが通過した状態

### permissions.documentReview のデフォルト値
- **Discussion**: 新しい permission のデフォルト値をどうするか
- **Conclusion**: `true` (GO)
- **Rationale**: requirements, design, tasks と同様。デフォルトで自動実行される

### フェーズ実行の統一
- **Discussion**: 専用イベント (`execute-document-review`) を維持するか、汎用イベント (`execute-next-phase`) に統一するか
- **Conclusion**: 汎用イベントに統一
- **Rationale**: フェーズ化の目的（特殊扱いをやめる）に合致。一貫性の向上

### UI 変更
- **Discussion**: UI の変更範囲
- **Conclusion**: 最小限（permissions 設定 UI の変更程度）
- **Rationale**: 既存の Document Review パネルはそのまま使える

### spec.json.approvals への追加
- **Discussion**: approvals 構造に documentReview を追加するか
- **Conclusion**: 不要
- **Rationale**: 既存の `documentReview.status` で完了判定可能。approvals は「生成→承認」フロー用であり、Document Review の「レビュー→修正ループ→承認」とは異なる

### コマンド変更
- **Discussion**: `/kiro:spec-*` コマンドの変更が必要か
- **Conclusion**: 不要
- **Rationale**: Document Review は自動実行フローの中で呼ばれる。手動実行は既存の `/kiro:document-review` を使用

## Introduction

Document Review を「特殊なサブプロセス」から「正式なワークフローフェーズ」へ昇格させる。これにより、`documentReviewFlag` を廃止して `permissions` 設定に統合し、他のフェーズと一貫した制御が可能になる。

現状の問題点：
1. `documentReviewFlag` の `run`/`pause` 設定が実装されておらず機能していない
2. Document Review だけ `PHASE_ORDER` に含まれず特殊扱いされている
3. 設計ドキュメントと実装の乖離がある

## Requirements

### Requirement 1: フェーズ順序の変更

**Objective:** ワークフローにおいて Document Review を正式なフェーズとして認識できるようにする

#### Acceptance Criteria

1. `PHASE_ORDER` が以下の順序になること:
   ```
   requirements -> design -> tasks -> document-review -> impl -> inspection
   ```
2. `WorkflowPhase` 型に `'document-review'` が含まれること
3. 既存のフェーズ遷移ロジックが Document Review フェーズを正しく処理すること

### Requirement 2: permissions への統合

**Objective:** `documentReviewFlag` を廃止し、他のフェーズと同様に `permissions` で制御できるようにする

#### Acceptance Criteria

1. `AutoExecutionPermissions` 型に `documentReview: boolean` が追加されること
2. `documentReviewFlag` フィールドが削除されること
3. `permissions.documentReview` のデフォルト値が `true` であること
4. `permissions.documentReview === false` の場合、Document Review フェーズで自動実行が停止すること（スキップではない）
5. spec.json の `autoExecution` 構造から `documentReviewFlag` が削除されること

### Requirement 3: 汎用イベントへの統一

**Objective:** Document Review の実行を他のフェーズと同じイベント駆動パターンに統一する

#### Acceptance Criteria

1. `execute-document-review` イベントが廃止されること
2. Document Review フェーズが `execute-next-phase` イベントで実行されること
3. `execute-next-phase` ハンドラ内で Document Review 固有の処理（ループ等）が行われること
4. 既存の Document Review ループ処理が正常に動作すること

### Requirement 4: フェーズ完了判定

**Objective:** Document Review フェーズの完了を正しく判定できるようにする

#### Acceptance Criteria

1. `documentReview.status === 'approved'` のとき、Document Review フェーズが完了したとみなされること
2. フェーズ完了後、次のフェーズ（impl）への遷移が行われること
3. ループ処理（最大7ラウンド）が完了しても approved にならない場合、paused 状態になること

### Requirement 5: inspection イベントの統一

**Objective:** `execute-inspection` イベントも同様に廃止し、一貫性を高める

#### Acceptance Criteria

1. `execute-inspection` イベントが廃止されること
2. inspection フェーズが `execute-next-phase` イベントで実行されること
3. inspection 固有の処理（autofix 等）が正常に動作すること

### Requirement 6: UI 設定の更新

**Objective:** permissions 設定 UI が新しい構造を反映する

#### Acceptance Criteria

1. `documentReviewFlag` のトグル UI が削除されること
2. `permissions.documentReview` の GO/NOGO トグルが追加されること
3. フェーズ一覧表示に Document Review が含まれること

### Requirement 7: 後方互換性

**Objective:** 既存の spec.json との互換性を維持する

#### Acceptance Criteria

1. 既存の `documentReviewFlag` を持つ spec.json が読み込めること
2. マイグレーション時に `documentReviewFlag: 'run'` → `permissions.documentReview: true` に変換されること
3. マイグレーション時に `documentReviewFlag: 'pause'` → `permissions.documentReview: true` に変換されること（pause は機能していなかったため）

## Out of Scope

- Remote UI の大幅な変更（shared/stores の変更に追従するのみ）
- spec.json の `approvals` 構造への Document Review 追加
- `/kiro:spec-*` コマンドの変更
- Document Review パネル UI の変更
- 新しい Document Review フラグ（run/pause 等）の実装

## Open Questions

### OQ-1: `execute-spec-merge` イベントの統一について

**Question**: `execute-spec-merge` イベントも同様に統一すべきか？（現在は inspection 完了後に呼ばれる）

**Resolution**: スコープ外として決定

**Rationale**: `execute-spec-merge` は inspection 完了後のマージ操作用イベントであり、フェーズ遷移の一部ではない。フェーズ実行（`execute-next-phase`）とは異なる性質を持つアクションであるため、本仕様のスコープ外とする。将来的な統一は別途検討可能だが、本機能の目的（Document Review のフェーズ化）とは独立した課題。
