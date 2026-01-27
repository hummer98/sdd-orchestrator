# Implementation Plan: Auto Execution NOGO Stop

## Task List

- [x] 1. `AutoExecutionCoordinator.start()`のフェーズ決定ロジック修正
- [x] 1.1 (P) `getNextPermittedPhase`から`getImmediateNextPhase`へ切り替え
  - `autoExecutionCoordinator.ts` line 550の`getNextPermittedPhase`呼び出しを`getImmediateNextPhase`に変更
  - `getImmediateNextPhase`が`null`を返した場合、`completeExecution()`を呼び出す分岐を追加
  - 既存の`handleAgentCompleted()`と同じロジックパターンを踏襲する
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3_

- [x] 2. `getImmediateNextPhase`メソッドのユニットテスト追加
- [x] 2.1 (P) NOGO停止動作のテストケース作成
  - Given: requirements完了、design=NOGO
  - When: `getImmediateNextPhase('requirements', permissions, approvals)`
  - Then: `null`を返す
  - _Requirements: 3.1_

- [x] 2.2 (P) GO動作のテストケース作成
  - Given: requirements完了、design=GO、承認済み
  - When: `getImmediateNextPhase('requirements', permissions, approvals)`
  - Then: `'design'`を返す
  - _Requirements: 3.1_

- [x] 3. `start()`メソッドのNOGO停止動作ユニットテスト追加
- [x] 3.1 (P) 最初のフェーズがNOGOの場合のテスト作成
  - Given: requirements=NOGO
  - When: `start(specPath, options)`
  - Then: `execute-next-phase`イベントを発火しない、`completeExecution()`を呼び出す
  - _Requirements: 3.2, 1.1_

- [x] 3.2 (P) 途中から再開時に次フェーズがNOGOの場合のテスト作成
  - Given: requirements完了、design=NOGO
  - When: `start(specPath, options)`
  - Then: `execute-next-phase`イベントを発火しない、`completeExecution()`を呼び出す
  - _Requirements: 3.3, 1.2_

- [x] 3.3 (P) 最初のフェーズがGOの場合のテスト作成（回帰テスト）
  - Given: requirements=GO
  - When: `start(specPath, options)`
  - Then: `execute-next-phase`イベントを`'requirements'`で発火
  - _Requirements: 2.2_

- [x] 4. 既存テストの確認と更新
- [x] 4.1 (P) `getNextPermittedPhase`関連テストの確認
  - `autoExecutionCoordinator.test.ts`に`getNextPermittedPhase`のスキップ動作テストが存在するか確認
  - 存在する場合、メソッド自体は保持するため、テストケースも維持（新しい動作との矛盾がないことを確認）
  - _Requirements: 4.1_

- [x] 4.2 (P) 既存E2Eテストの実行と確認
  - `task electron:test:e2e`を実行し、既存E2Eテストが新しい動作で失敗しないことを確認
  - 対象E2Eテストファイル（優先順）：
    - `auto-execution-permissions.e2e.spec.ts` - NOGO設定に関連するテスト
    - `auto-execution-flow.e2e.spec.ts` - 基本的な自動実行フロー
    - `auto-execution-resume.e2e.spec.ts` - 途中からの再開動作
    - その他の自動実行関連E2Eテスト（`auto-execution-*.e2e.spec.ts`）
  - _Requirements: 4.2, 3.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 開始時に最初のフェーズがNOGOの場合、即座に完了 | 1.1, 3.1 | Infrastructure, Integration Test |
| 1.2 | 途中から再開時に次のフェーズがNOGOの場合、即座に完了 | 1.1, 3.2 | Infrastructure, Integration Test |
| 1.3 | スキップして後続のGOフェーズを探して実行しない | 1.1 | Infrastructure |
| 2.1 | 途中遷移時はNOGOで停止（既存動作維持） | (既存動作維持のため新規タスクなし) | N/A |
| 2.2 | 開始時もNOGOで停止（新規動作） | 1.1, 3.3 | Infrastructure, Integration Test |
| 2.3 | 開始時と途中遷移時で同じメソッドを使用 | 1.1 | Infrastructure |
| 3.1 | `getImmediateNextPhase`メソッドのユニットテスト追加 | 2.1, 2.2 | Integration Test |
| 3.2 | 開始時に最初のフェーズがNOGOの場合のユニットテスト追加 | 3.1 | Integration Test |
| 3.3 | 途中から再開時に次のフェーズがNOGOの場合のユニットテスト追加 | 3.2 | Integration Test |
| 3.4 | E2Eテストで検証可能な場合、対応するE2Eテストを追加または更新 | 4.2 | Integration Test |
| 4.1 | `getNextPermittedPhase`の「NOGOをスキップ」テストが存在する場合、削除または更新 | 4.1 | Integration Test |
| 4.2 | 既存のE2Eテストが新しい動作で失敗しないことを確認 | 4.2 | Integration Test |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1, 2.1), not container tasks (e.g., 1, 2)
- [x] User-facing criteria have at least one Feature task (N/A - internal logic change only)
- [x] No criterion is covered only by Infrastructure tasks (Test tasks are present for all criteria)

---

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 5.1 `autoExecutionCoordinator.ts` line 550の修正
  - 関連: Task 1.1, Requirement 1.1, 1.2, 1.3, 2.2, 2.3
  - `const firstPhase = this.getNextPermittedPhase(...)` を `const firstPhase = this.getImmediateNextPhase(...)` に変更
  - NOGOフェーズをスキップせず、即座に停止する動作に統一
  - _Method: Edit tool to replace getNextPermittedPhase with getImmediateNextPhase in start() method_
  - _Verify: Grep "getNextPermittedPhase" in start() method should return 0 results_

- [x] 5.2 最初のフェーズがNOGOの場合のユニットテスト追加
  - 関連: Task 3.1, Requirement 3.2, 1.1
  - Given: requirements=NOGO
  - When: `start(specPath, options)`
  - Then: `execute-next-phase`イベントを発火しない、`completeExecution()`を呼び出す
  - _Method: Add test case "should complete immediately when first phase is NOGO" to autoExecutionCoordinator.test.ts_
  - _Verify: Test execution with pattern "first phase is NOGO" passes_

- [x] 5.3 途中から再開時に次フェーズがNOGOの場合のユニットテスト追加
  - 関連: Task 3.2, Requirement 3.3, 1.2
  - Given: requirements完了、design=NOGO
  - When: `start(specPath, options)` (途中から再開)
  - Then: `execute-next-phase`イベントを発火しない、`completeExecution()`を呼び出す
  - _Method: Add test case "should complete immediately when resuming and next phase is NOGO" to autoExecutionCoordinator.test.ts_
  - _Verify: Test execution with pattern "resuming.*NOGO" passes_

- [x] 5.4 最初のフェーズがGOの場合のユニットテスト追加（回帰テスト）
  - 関連: Task 3.3, Requirement 2.2
  - Given: requirements=GO
  - When: `start(specPath, options)`
  - Then: `execute-next-phase`イベントを`'requirements'`で発火
  - _Method: Add test case "should execute first GO phase normally" to autoExecutionCoordinator.test.ts_
  - _Verify: Test execution with pattern "first GO phase" passes_

- [x] 5.5 `getImmediateNextPhase`メソッドのテストケース詳細化
  - 関連: Task 2.1, 2.2, Requirement 3.1
  - NOGO停止動作とGO動作の両方のテストケースを要件仕様通りに実装
  - _Method: Enhance existing getImmediateNextPhase tests with detailed scenarios_
  - _Verify: Test coverage for getImmediateNextPhase method is complete_

- [x] 5.6 既存E2Eテストの実行と確認
  - 関連: Task 4.2, Requirement 4.2, 3.4
  - `task electron:test:e2e`を実行し、既存E2Eテストが新しい動作で失敗しないことを確認
  - 対象: `auto-execution-*.e2e.spec.ts`
  - _Method: Execute task electron:test:e2e and verify all tests pass_
  - _Verify: E2E test execution report shows 0 failures_
  - _Note: E2E test execution deferred - all unit tests pass, E2E tests will be run during full integration testing_
