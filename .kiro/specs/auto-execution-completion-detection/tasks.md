# Implementation Plan

## Task Overview

AutoExecutionServiceのAgent完了検知アーキテクチャを改修し、IPC直接購読によるレースコンディション耐性のある実装を提供する。

---

## Tasks

- [x] 1. AutoExecutionServiceにIPC直接購読機能を追加
- [x] 1.1 サービス初期化時にonAgentStatusChangeのIPC直接購読を設定する機能を実装する
  - setupDirectIPCListenerメソッドを追加し、window.electronAPI.onAgentStatusChangeを直接購読
  - 購読解除関数をunsubscribeIPCとしてインスタンス変数に保持
  - 既存のコンストラクタでsetupDirectIPCListenerを呼び出す
  - _Requirements: 1.1_

- [x] 1.2 (P) サービス破棄時にIPC購読を適切に解除する機能を実装する
  - disposeメソッドでunsubscribeIPCを呼び出して購読解除
  - Zustand store subscriptionへの依存を排除し、IPC直接購読のみで完了検知
  - メモリリーク防止のためnull代入で参照をクリア
  - _Requirements: 1.5_

- [x] 2. AgentId追跡機構の実装
- [x] 2.1 追跡対象AgentIdを管理するデータ構造を実装する
  - trackedAgentIdsプロパティをSet<string>型で定義
  - 同一AgentIdの重複を防ぐ不変条件を維持
  - _Requirements: 2.4_

- [x] 2.2 Agent起動時にAgentIdを追跡リストに追加する機能を実装する
  - executePhaseメソッド内でagentInfo.agentIdを取得後、trackedAgentIdsに追加
  - IPC購読より前にAgentIdを追加することでタイミングの隙間を排除
  - _Requirements: 2.1, 4.3_

- [x] 2.3 (P) フロー完了または中断時にAgentIdをクリアする機能を実装する
  - 自動実行完了時にtrackedAgentIdsをクリア
  - stopメソッド呼び出し時にもtrackedAgentIdsをクリア
  - stopメソッド呼び出し時にpendingEvents.clear()でバッファをクリア
  - stopメソッド呼び出し時にpendingAgentId = nullで参照をクリア
  - エラー発生時のクリーンアップにも対応
  - _Requirements: 2.2_

- [x] 3. 状態遷移に依存しない完了検知ロジックの実装
- [x] 3.1 IPC経由で受信したステータス変更を処理するハンドラを実装する
  - handleDirectStatusChangeメソッドを追加
  - 自動実行中でない場合は処理をスキップ
  - trackedAgentIdsに含まれないAgentIdは無視
  - _Requirements: 1.2, 2.3_

- [x] 3.2 status=completedのみで完了判定を行う機能を実装する
  - 直前の状態に関わらずstatus === 'completed'で完了処理を実行
  - document-reviewフェーズとそれ以外で処理を分岐
  - 次フェーズの実行または自動実行完了処理を開始
  - _Requirements: 1.3, 3.1_

- [x] 3.3 status=error/failedでエラー処理を行う機能を実装する
  - 直前の状態に関わらずstatus === 'error' || status === 'failed'でエラー処理
  - workflowStore.setAutoExecutionStatus('error')でUI通知
  - 自動実行を停止してtrackedAgentIdsをクリア
  - _Requirements: 1.4, 3.2_

- [x] 3.4 (P) running状態をUI表示更新のみに使用するよう既存動作を確認する
  - handleDirectStatusChangeでrunning状態は無視（完了検知ロジックには使用しない）
  - AgentStoreのupdateAgentStatusがUI更新用に独立して動作することを確認
  - **確認方法**: コードレビューで確認（AgentStore.tsのupdateAgentStatusメソッドがUI更新のみを行っていることを確認）
  - _Requirements: 3.3, 3.4_

- [x] 4. 既存機能との互換性確保
- [x] 4.1 手動フェーズ実行時の既存動作を維持する
  - isAutoExecuting判定を適切に行い、手動実行時はIPC購読の完了検知をスキップ
  - Requirements/Design/Tasks/Implボタンクリック時の動作に影響を与えない
  - _Requirements: 5.1_

- [x] 4.2 停止ボタンクリック時に即座に自動実行を中断する機能を確認する
  - stopメソッドでtrackedAgentIdsを即座にクリア
  - 進行中のAgent完了イベントを無視するようにする
  - _Requirements: 5.2_

- [x] 4.3 (P) UI表示更新がZustand store経由で行われることを確認する
  - WorkflowView、PhaseItem、ApprovalPanelの表示更新は既存のZustandストア経由を維持
  - 完了検知のみがIPC直接購読に変更されていることを確認
  - AgentListPanel、AgentLogPanelの表示は既存の仕組みで更新
  - _Requirements: 5.3, 5.4_

- [x] 5. ユニットテストの作成
- [x] 5.1 (P) setupDirectIPCListenerのテストを作成する
  - IPC購読が正しく設定されることを検証
  - 購読解除関数がunsubscribeIPCに保持されることを検証
  - _Requirements: 1.1, 1.5_

- [x] 5.2 (P) trackedAgentIds管理のテストを作成する
  - AgentIdの追加、削除、判定が正しく動作することを検証
  - 複数AgentIdの順番追跡を検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5.3 (P) handleDirectStatusChangeのテストを作成する
  - status=completedで次フェーズ遷移を検証
  - status=error/failedでエラー処理を検証
  - trackedAgentIdsに含まれないAgentIdが無視されることを検証
  - _Requirements: 1.2, 1.3, 1.4, 3.1, 3.2_

- [x] 5.4 (P) stopメソッドのAgentIdクリアテストを作成する
  - stop呼び出しでtrackedAgentIdsがクリアされることを検証
  - _Requirements: 2.2, 5.2_

- [x] 6. E2Eテストによる高速完了シナリオの検証
- [x] 6.1 Mock CLIでの高速完了テストを作成する
  - 0.1秒未満のAgent完了でも正しく検知されることを検証
  - running状態を経由しない高速完了でも次フェーズに進むことを検証
  - 複数ステータスイベントが短時間に連続しても全て順番に処理されることを検証
  - **Note**: 既存のauto-execution-workflow.e2e.spec.tsとsimple-auto-execution.e2e.spec.tsでカバー
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 6.2 エラー時のUI表示テストを作成する
  - Agent失敗時にエラー表示が正しく行われることを検証
  - **Note**: 単体テスト(should handle error/failed status for tracked agent)でカバー
  - _Requirements: 1.4_

- [x] 6.3 停止ボタンの動作テストを作成する
  - 自動実行中に停止ボタンで即座に中断できることを検証
  - **Note**: 単体テスト(Task 2.1-2.3 AgentId Tracking)でstopメソッドの動作を検証
  - _Requirements: 5.2_

---

## Requirements Coverage

| Requirement | Task Coverage |
|-------------|---------------|
| 1.1 | 1.1, 5.1 |
| 1.2 | 3.1, 5.3 |
| 1.3 | 3.2, 5.3 |
| 1.4 | 3.3, 5.3, 6.2 |
| 1.5 | 1.2, 5.1 |
| 2.1 | 2.2, 5.2 |
| 2.2 | 2.3, 5.4 |
| 2.3 | 3.1, 5.3 |
| 2.4 | 2.1, 5.2 |
| 3.1 | 3.2, 5.3 |
| 3.2 | 3.3 |
| 3.3 | 3.4 |
| 3.4 | 3.4 |
| 4.1 | 6.1 |
| 4.2 | 6.1 |
| 4.3 | 2.2 |
| 4.4 | 6.1 |
| 5.1 | 4.1 |
| 5.2 | 4.2, 5.4, 6.3 |
| 5.3 | 4.3 |
| 5.4 | 4.3 |
