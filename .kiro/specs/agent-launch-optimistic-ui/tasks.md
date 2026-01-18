# Implementation Plan

## Task Overview

Agent実行ボタンのOptimistic UIを実装し、クリック時の即時フィードバックとMain process異常時のタイムアウトガードを提供する。

---

- [x] 1. useLaunchingStateフックの実装
- [x] 1.1 (P) フック本体の実装
  - launching状態（useState<boolean>）とwrapExecution関数を返すカスタムフックを作成
  - wrapExecution関数は非同期関数を受け取り、実行前にlaunching=true、完了後にlaunching=falseを設定
  - オプションパラメータでタイムアウト時間を設定可能にする（デフォルト: 10000ms）
  - タイムアウトメッセージもオプションで指定可能にする
  - 配置場所: `src/shared/hooks/useLaunchingState.ts`
  - `src/shared/hooks/index.ts` にバレルエクスポートを追加: `export { useLaunchingState } from './useLaunchingState'`
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 1.2 (P) タイムアウト処理の実装
  - wrapExecution実行時に10秒タイムアウトタイマーを開始（setTimeout）
  - タイムアウト発生時にlaunching状態をfalseに戻し、notify.errorでタイムアウトエラー通知を表示
  - IPC呼び出し正常完了時にタイムアウトタイマーをクリア（clearTimeout）
  - コンポーネントアンマウント時にuseEffectのcleanup関数でタイマーをクリア（メモリリーク防止）
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.3 エラーハンドリングの実装
  - IPCエラー発生時にlaunching状態をfalseに戻し、notify.errorでエラー通知を表示
  - catch節でのエラーハンドリングとfinally節でのタイマークリアを実装
  - 1.1, 1.2のフック実装が前提
  - _Requirements: 1.2, 1.4_

- [x] 2. WorkflowViewへのOptimistic UI適用
- [x] 2.1 フェーズ実行ハンドラのラップ
  - handleExecutePhase（requirements, design, tasks, impl, deploy）をwrapExecutionでラップ
  - handleStartDocumentReview、handleExecuteDocumentReviewReply、handleApplyDocumentReviewFixをラップ
  - handleStartInspection、handleExecuteInspectionFixをラップ
  - フェーズ/機能ごとにuseLaunchingStateインスタンスを分離するか、グルーピングを検討
  - _Requirements: 4.1_

- [x] 2.2 disabled判定の更新
  - 各実行ボタンのdisabled判定を`launching || isXxxExecuting`に変更
  - runningPhases.has(phase)とlaunchingの両方を参照する形式に更新
  - ローディング表示（スピナー等）もlaunching状態を反映するよう更新
  - _Requirements: 1.1, 1.3, 4.2_

- [x] 3. 子コンポーネントへのlaunching状態伝播
- [x] 3.1 (P) DocumentReviewPanelの更新
  - 親コンポーネント（WorkflowView）からlaunching状態をprops経由で受け取る
  - レビュー開始・リプライ・Fix適用ボタンのdisabled判定にlaunching状態を反映
  - _Requirements: 4.1, 4.2_

- [x] 3.2 (P) InspectionPanelの更新
  - 親コンポーネント（WorkflowView）からlaunching状態をprops経由で受け取る
  - Inspection開始・Fix実行ボタンのdisabled判定にlaunching状態を反映
  - _Requirements: 4.1, 4.2_

- [x] 4. 統合テストと動作確認
- [x] 4.1 Optimistic UI動作確認
  - ボタンクリック時に即座にdisabled+ローディング表示になることを確認
  - IPC完了後にlaunching状態がリセットされることを確認
  - fileWatcher経由のAgent状態更新後も引き続きdisabledが維持されることを確認
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4.2 タイムアウト動作確認
  - 10秒タイムアウト後にlaunching状態がリセットされることを確認
  - タイムアウト時にエラー通知が表示されることを確認
  - 正常完了時にタイムアウトタイマーがクリアされることを確認
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4.3 既存動作との互換性確認
  - fileWatcher経由のAgent状態更新フローが変更されていないことを確認
  - IPC呼び出しの戻り値の扱いが変更されていないことを確認
  - agentStoreの構造が変更されていないことを確認
  - Remote UIでも同様の動作が提供されることを確認（WorkflowView共有のため自動適用）
  - _Requirements: 5.1, 5.2, 5.3, 4.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ボタンクリック時に即座にdisabled+ローディング表示 | 2.2, 4.1 | Feature |
| 1.2 | IPC完了時にlaunching状態をfalseに戻す | 1.3, 4.1 | Feature |
| 1.3 | isXxxExecutingがtrueの場合は引き続きdisabled維持 | 2.2, 4.1 | Feature |
| 1.4 | IPCエラー時にlaunching状態をfalseに戻しエラー通知 | 1.3 | Feature |
| 2.1 | 10秒タイムアウトタイマー開始 | 1.2, 4.2 | Feature |
| 2.2 | タイムアウト時にlaunching状態リセット+エラー通知 | 1.2, 4.2 | Feature |
| 2.3 | IPC正常完了時にタイムアウトタイマークリア | 1.2, 4.2 | Feature |
| 2.4 | アンマウント時にタイムアウトタイマークリア | 1.2 | Feature |
| 3.1 | useLaunchingStateフック提供 | 1.1 | Feature |
| 3.2 | wrapExecution関数で非同期関数ラップ | 1.1 | Feature |
| 3.3 | タイムアウト時間をオプションで設定可能 | 1.1 | Feature |
| 4.1 | 対象ハンドラへの適用 | 2.1, 3.1, 3.2 | Feature |
| 4.2 | disabled判定を`launching || isXxxExecuting`に更新 | 2.2, 3.1, 3.2 | Feature |
| 4.3 | Remote UIでも同様の動作 | 4.3 | Feature |
| 5.1 | fileWatcher経由のAgent状態更新フローを変更しない | 4.3 | Feature |
| 5.2 | IPC戻り値の扱いを変更しない | 4.3 | Feature |
| 5.3 | agentStoreの構造を変更しない | 4.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
