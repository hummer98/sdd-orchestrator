# Implementation Plan

## Task Overview

| Major Task | Description | Parallel |
|------------|-------------|----------|
| 1 | specsWatcherServiceからのinspection-complete自動更新削除 | - |
| 2 | spec-inspectionエージェントへのphase更新機能追加 | P |
| 3 | spec-mergeコマンドへの前提条件チェック追加 | P |
| 4 | テストの更新と追加 | - |

---

## Tasks

- [x] 1. specsWatcherServiceからのinspection-complete自動更新削除

- [x] 1.1 checkInspectionCompletionメソッドを削除
  - specsWatcherServiceからcheckInspectionCompletionプライベートメソッドを完全に削除
  - inspection.rounds検証ロジックとphase更新ロジックを削除
  - 関連するインポート（使用されなくなった依存）があれば削除
  - _Requirements: 1.3_

- [x] 1.2 handleEventからのcheckInspectionCompletion呼び出しを削除
  - handleEventメソッド内のspec.json変更時のcheckInspectionCompletion呼び出しを削除
  - updateSpecJsonFromPhase呼び出し（inspection-complete関連）を削除
  - checkTaskCompletion呼び出しは維持すること
  - checkDeployCompletion呼び出し（worktreeフィールド削除）は維持すること
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_

- [x] 2. spec-inspectionエージェントへのphase更新機能追加

- [x] 2.1 (P) spec-inspection agentにphase更新ステップを追加
  - 既存Step 6（spec.json更新）の後にStep 6.5を追加
  - GO判定時のみphaseを`inspection-complete`に更新
  - NOGO判定時はphase更新をスキップ
  - phaseが既に`inspection-complete`または`deploy-complete`の場合はスキップ
  - phase更新時にupdated_atも現在のUTCタイムスタンプ（ISO 8601形式）で更新
  - Writeツールで直接spec.jsonを更新
  - 更新失敗時はログに記録し、ユーザーに手動更新を案内
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. spec-mergeコマンドへの前提条件チェック追加

- [x] 3.1 (P) spec-mergeにinspection-complete前提条件チェックを追加
  - Step 1（Prerequisites）の後、Step 2（Prepare Worktree）の前にStep 1.5を追加
  - worktreeのspec.jsonからphaseを読み取り
  - phaseが`inspection-complete`以外の場合、エラーメッセージを表示して中断
  - inspection.roundsの最新roundがgoでない場合、エラーメッセージを表示して中断
  - 両方のチェックがパスした場合のみStep 2に進む
  - 既存のdeploy-complete設定ロジックは維持
  - エラーメッセージには次のステップ（spec-inspection実行）を案内
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. テストの更新と追加

- [x] 4.1 specsWatcherServiceのテストからinspection-complete関連テストを削除
  - checkInspectionCompletionの動作検証テストを削除
  - inspection-complete自動更新のテストを削除
  - checkTaskCompletion（implementation-complete）のテストは維持
  - debounce動作のテストは維持
  - inspection-complete自動更新テストを新規追加しないこと
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Verify: Grep "checkInspectionCompletion|inspection-complete" in specsWatcherService.test.ts should return no matches_

- [x] 4.2 (P) spec-inspectionのphase更新テストを追加
  - GO判定時にspec.json.phaseがinspection-completeに更新されることを検証
  - NOGO判定時にspec.json.phaseが変更されないことを検証
  - phase更新時にupdated_atも更新されることを検証
  - 既存のinspection-completeまたはdeploy-completeの場合、phaseが変更されないことを検証
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | inspection更新時にphase自動更新しない | 1.2 | Feature |
| 1.2 | updateSpecJsonFromPhase呼び出し削除 | 1.2 | Feature |
| 1.3 | checkInspectionCompletion削除 | 1.1 | Feature |
| 1.4 | 手動更新のファイル監視維持 | 1.2 | Feature |
| 2.1 | GO判定時にphase更新 | 2.1 | Feature |
| 2.2 | NOGO時はphase更新しない | 2.1 | Feature |
| 2.3 | Agent実行完了前にphase更新 | 2.1 | Feature |
| 2.4 | updated_at同時更新 | 2.1 | Feature |
| 2.5 | 既存inspection/deploy-complete維持 | 2.1 | Feature |
| 3.1 | spec.json.phase読み取り | 3.1 | Feature |
| 3.2 | inspection-complete以外でエラー | 3.1 | Feature |
| 3.3 | 最新roundがNOGO時エラー | 3.1 | Feature |
| 3.4 | 検証通過後deploy-complete | 3.1 | Feature |
| 4.1 | task完了でimpl-complete更新 | 1.2 | Feature |
| 4.2 | checkTaskCompletion維持 | 1.2 | Feature |
| 4.3 | impl-complete動作同一 | 1.2 | Feature |
| 5.1 | .kiro/specs/監視継続 | 1.2 | Feature |
| 5.2 | 300ms以内の変更検知 | 1.2 | Feature |
| 5.3 | phase変更時のイベント発行 | 1.2 | Feature |
| 5.4 | chokidar設定維持 | 1.2 | Feature |
| 6.1 | checkInspectionCompletionテスト削除 | 4.1 | Feature |
| 6.2 | inspection-complete自動更新テスト削除 | 4.1 | Feature |
| 6.3 | impl-completeテスト維持 | 4.1 | Feature |
| 6.4 | inspection-complete自動更新テスト追加禁止 | 4.1 | Feature |
| 7.1 | GO判定でphase更新テスト | 4.2 | Feature |
| 7.2 | NOGO判定でphase維持テスト | 4.2 | Feature |
| 7.3 | updated_at更新テスト | 4.2 | Feature |
| 7.4 | 既存phase維持テスト | 4.2 | Feature |
