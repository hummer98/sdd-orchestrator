# Requirements: Auto Execution NOGO Stop

## Decision Log

### NOGOフェーズの動作方針

- **Discussion**: 自動実行開始時に`getNextPermittedPhase`を使用しており、NOGOフェーズをスキップして次のGOフェーズから開始する動作になっていた。一方、実行途中では`getImmediateNextPhase`を使用してNOGOで停止する。この一貫性のない動作について検討。
- **Conclusion**: スキップ動作は異常動作として削除し、開始時・途中の両方でNOGOフェーズで停止する
- **Rationale**: ユーザーがNOGOに設定した意図は「そのフェーズを実行しない」であり、「スキップして次を実行」ではない。以前はスキップが仕様だったが、現在は停止が期待される動作。

### 途中から再開シナリオ

- **Discussion**: requirements(完了) → design(NOGO) → tasks(GO) の場合、designをスキップしてtasksから実行すべきか、designがNOGOなので即座に完了すべきか
- **Conclusion**: designがNOGOなので何も実行せず完了する
- **Rationale**: 「次のフェーズがNOGO」という状況は開始時も途中も同じ扱いにすべき

### UIフィードバック

- **Discussion**: NOGOで停止した場合、理由を表示すべきか
- **Conclusion**: 「完了」として表示（現状維持）
- **Rationale**: 追加のUI変更は不要。自動実行が正常に完了した扱いで問題ない

## Introduction

自動実行の開始時にNOGOフェーズをスキップする動作を修正し、実行途中と同様にNOGOフェーズで停止（完了）するよう一貫した動作にする。

## Requirements

### Requirement 1: 自動実行開始時のNOGO停止

**Objective:** 開発者として、自動実行開始時に次のフェーズがNOGOの場合は即座に完了してほしい。NOGOフェーズをスキップして次のGOフェーズから開始する動作は望まない。

#### Acceptance Criteria

1. When 自動実行を開始し、最初に実行すべきフェーズがNOGOの場合, the system shall 何も実行せず即座に完了状態になる
2. When 自動実行を開始し、既に一部フェーズが完了している状態で次のフェーズがNOGOの場合, the system shall 何も実行せず即座に完了状態になる
3. The system shall NOT スキップして後続のGOフェーズを探して実行する

### Requirement 2: 一貫した動作

**Objective:** 開発者として、自動実行の開始時と途中遷移時で同じロジックが適用され、一貫した動作になることを期待する。

#### Acceptance Criteria

1. When 自動実行中にフェーズが完了した場合, the system shall 次のフェーズがNOGOならそこで停止する（既存動作を維持）
2. When 自動実行を開始する場合, the system shall 次のフェーズがNOGOならそこで停止する（新規動作）
3. The system shall 開始時と途中遷移時で同じメソッド（`getImmediateNextPhase`）を使用するか、同等のロジックを適用する

### Requirement 3: テストカバレッジ

**Objective:** 品質保証として、この動作変更がユニットテストとE2Eテストでカバーされることを期待する。

#### Acceptance Criteria

1. The system shall `getImmediateNextPhase`メソッドのユニットテストを追加する
2. The system shall 「開始時に最初のフェーズがNOGOの場合」のユニットテストを追加する
3. The system shall 「途中から再開時に次のフェーズがNOGOの場合」のユニットテストを追加する
4. If E2Eテストで検証可能な場合, then the system shall 対応するE2Eテストを追加または更新する

### Requirement 4: 既存テストの更新

**Objective:** 既存のテストが新しい動作を正しく反映するよう更新する。

#### Acceptance Criteria

1. If `getNextPermittedPhase`の「NOGOをスキップ」テストが存在する場合, then the system shall そのテストを削除または更新する
2. The system shall 既存のE2Eテストが新しい動作で失敗しないことを確認する

## Out of Scope

- UIへの追加フィードバック（「NOGOのため停止」等の理由表示）
- `getNextPermittedPhase`メソッド自体の削除（他で使用されている可能性があるため）
- BugAutoExecutionCoordinatorへの同様の変更（別途検討）

## Open Questions

### `getNextPermittedPhase`メソッドの使用箇所

**Status**: 調査済み

**Grep結果**（`grep -r "getNextPermittedPhase" electron-sdd-manager/src/`）:
- `autoExecutionCoordinator.ts` line 550: `start()`メソッドで使用（本スペックで修正対象）
- `bugAutoExecutionCoordinator.ts` line 268: `start()`メソッドで使用（影響あり）
- `autoExecutionCoordinator.test.ts` line 692-742: ユニットテストで使用

**影響範囲**:
- **AutoExecutionCoordinator**: 本スペックで修正する
- **BugAutoExecutionCoordinator**: 同様の問題があるが、Out of Scopeとして別途対応を検討する（将来のスペックまたはバグ修正で対応）

**結論**: `getNextPermittedPhase`メソッドは`BugAutoExecutionCoordinator`でも使用されているため、本スペックの修正は`AutoExecutionCoordinator`のみに限定し、`BugAutoExecutionCoordinator`への同様の変更は別途検討する。

## Technical Notes

### 影響箇所

- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts`
  - `start`メソッド（550行目）: `getNextPermittedPhase` → `getImmediateNextPhase`または同等のロジックに変更
- `electron-sdd-manager/src/main/services/autoExecutionCoordinator.test.ts`
  - `getImmediateNextPhase`のユニットテスト追加
  - 開始時のNOGO停止テスト追加

### 参考: 2つのメソッドの違い

| メソッド | 動作 | 現在の使用箇所 |
|----------|------|----------------|
| `getNextPermittedPhase` | NOGOをスキップして次のGOを返す | `start()` |
| `getImmediateNextPhase` | NOGOならnullを返す（停止） | `handleAgentCompleted()`, `markPhaseComplete()` |
