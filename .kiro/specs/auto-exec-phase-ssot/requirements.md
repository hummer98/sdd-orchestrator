# Requirements: 自動実行開始フェーズ判定のSSOT化

## Decision Log

### 1. フェーズ判定のデータソース

- **Discussion**: `getLastCompletedPhase` が `ApprovalsStatus`（requirements/design/tasks のみ）に依存しており、impl以降のフェーズ完了を検出できない。`spec.json.phase` をSSOTとして使うか、`ApprovalsStatus` を拡張するかの選択肢がある。
- **Conclusion**: `getLastCompletedPhase` のみ `spec.json.phase`（SpecPhase）ベースに変更。他のメソッド（`isPreviousPhaseApproved`, `getNextPermittedPhase`, `getImmediateNextPhase`）は `ApprovalsStatus` を使い続ける。
- **Rationale**: 関心の分離。「今どこまで進んだ？」は `spec.json.phase`（SSOT）の責務。「前フェーズは承認済みか？」は `ApprovalsStatus` の責務。各メソッドの関心に適したデータソースを使う。

### 2. document-review フェーズの扱い

- **Discussion**: `spec.json.phase` に `document-review-complete` を追加するか、現状の `documentReview.status` 分離方式を維持するか。
- **Conclusion**: `documentReview.status` 分離方式を維持。SpecPhase に新しい値は追加しない。
- **Rationale**: KISS。document-review は反復的（最大7ラウンド）であり、線形に進む phase モデルに合わない。`tasks-generated` + `documentReview.status === 'approved'` の組み合わせで判定可能。

### 3. 修正スコープ

- **Discussion**: `handleAgentCompleted()` 内の次フェーズ判定も一緒に修正すべきか。
- **Conclusion**: `start()` メソッドのフェーズ判定に限定。`handleAgentCompleted()` は触らない。
- **Rationale**: YAGNI。`handleAgentCompleted()` は `currentPhase` を内部追跡しており正常動作中。「途中から開始」と「実行中の継続」は異なるユースケースであり、壊れていないものを直す理由がない。

## Introduction

自動実行（Auto-Execution）の「途中から開始」フェーズ判定が `ApprovalsStatus`（requirements/design/tasks の3フェーズのみ）に依存しているため、impl 完了後に自動実行を開始すると impl が再実行されるバグがある。`spec.json.phase` を SSOT として使用するよう `getLastCompletedPhase` を改修し、全フェーズの完了状態を正しく判定できるようにする。

## Requirements

### Requirement 1: `getLastCompletedPhase` のシグネチャ変更

**Objective:** 開発者として、`getLastCompletedPhase` が `spec.json.phase` を SSOT として使用するようにしたい。正確なフェーズ判定により、自動実行が正しい地点から再開できるようにするため。

#### Acceptance Criteria

1. `getLastCompletedPhase` の第1引数が `approvals: ApprovalsStatus` から `specPhase: SpecPhase` に変更されること
2. 第2引数 `documentReviewStatus?: 'pending' | 'in_progress' | 'approved'` は維持されること
3. 戻り値の型 `WorkflowPhase | null` は変更されないこと

### Requirement 2: SpecPhase → WorkflowPhase マッピング

**Objective:** 開発者として、`spec.json.phase` の全ての値が正しく `WorkflowPhase` にマッピングされるようにしたい。フェーズ判定の抜け漏れを防ぐため。

#### Acceptance Criteria

1. 以下のマッピングが実装されること:

| SpecPhase | documentReviewStatus | 戻り値 (WorkflowPhase) |
|---|---|---|
| `initialized` | any | `null` |
| `requirements-generated` | any | `'requirements'` |
| `design-generated` | any | `'design'` |
| `tasks-generated` | `!== 'approved'` | `'tasks'` |
| `tasks-generated` | `=== 'approved'` | `'document-review'` |
| `implementation-complete` | any | `'impl'` |
| `inspection-complete` | any | `'inspection'` |
| `deploy-complete` | any | `'inspection'` |

2. 未知の `SpecPhase` 値が渡された場合、`null` を返すこと

### Requirement 3: `start()` メソッドの呼び出し元修正

**Objective:** ユーザーとして、impl 完了済みの spec で自動実行を開始した場合、inspection が実行されるようにしたい。impl が再実行されるバグを解消するため。

#### Acceptance Criteria

1. `start()` メソッドが `spec.json` から `phase` フィールドを読み取ること（既存の spec.json 読み取りブロック内で追加）
2. 読み取った `specPhase` を `getLastCompletedPhase(specPhase, documentReviewStatus)` に渡すこと
3. `spec.json` の読み取りに失敗した場合、`specPhase` は `'initialized'` をフォールバック値とすること
4. 以下のシナリオが正しく動作すること:
   - `phase === 'implementation-complete'` で自動実行開始 → inspection が実行される
   - `phase === 'inspection-complete'` で自動実行開始 → deploy（または完了）
   - `phase === 'tasks-generated'` で自動実行開始 → 既存動作と同一（document-review or impl）

### Requirement 4: 既存ユニットテストの更新

**Objective:** 開発者として、シグネチャ変更に伴い既存テストが新しいインターフェースに追従し、全フェーズのマッピングがテストされるようにしたい。

#### Acceptance Criteria

1. `getLastCompletedPhase()` の既存テストが新シグネチャ（`specPhase` 引数）に更新されること
2. 以下のテストケースが追加されること:
   - `specPhase === 'implementation-complete'` → `'impl'` を返す
   - `specPhase === 'inspection-complete'` → `'inspection'` を返す
   - `specPhase === 'deploy-complete'` → `'inspection'` を返す
   - `specPhase === 'initialized'` → `null` を返す
3. 既存の `start()` 関連テストが新しいフェーズ判定ロジックで正常にパスすること

### Requirement 5: E2E テスト追加

**Objective:** ユーザーとして、impl 完了済み状態からの自動実行がリグレッションしないよう、E2Eテストで保護されるようにしたい。

#### Acceptance Criteria

1. 「impl 完了済み（`phase === 'implementation-complete'`）の状態で自動実行を開始し、inspection が実行される」シナリオのE2Eテストが追加されること
2. テストは既存の auto-execution E2E テストパターン（`auto-execution-impl-flow.e2e.spec.ts` 等）に準拠すること

## Out of Scope

- `isPreviousPhaseApproved` の `default: return true` の修正（YAGNI: 現状バグとして顕在化していない）
- `handleAgentCompleted()` 内の次フェーズ判定の変更（正常動作中）
- `ApprovalsStatus` インターフェースの拡張（impl/inspection の追加は不要）
- `SpecPhase` に `document-review-complete` を追加すること
- `getNextPermittedPhase` / `getImmediateNextPhase` の変更

## Open Questions

- なし（設計フェーズで詳細化すべき点は design.md に委ねる）
