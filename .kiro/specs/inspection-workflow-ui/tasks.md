# Implementation Plan

## Task Format Template

Major task only, or Major + Sub-task structure as appropriate.

---

## Tasks

- [x] 1. InspectionState型定義の追加
  - spec.jsonのinspectionフィールド用の新しい型を定義する
  - status（pending/in_progress/completed）、rounds、currentRound、roundDetails配列を含む構造
  - InspectionRoundDetail型（roundNumber、passed、fixApplied、completedAt）を定義する
  - 自動実行フラグ型（run/pause/skip）を定義する
  - 進捗インジケータ状態の型（checked/unchecked/executing/skip-scheduled）を定義する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. (P) InspectionPanelコンポーネントの実装
- [x] 2.1 (P) InspectionPanelの基本構造とスタイル
  - DocumentReviewPanelと同様のUIパターンでパネルを構築する
  - タイトル左側に進捗インジケータ表示領域を設ける
  - タイトル右側に自動実行フラグ制御ボタン配置領域を設ける
  - ラウンド数と現在のラウンド番号を表示するスタッツエリアを実装する
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.2 (P) 進捗インジケータロジックの実装
  - 自動実行フラグが「skip」の場合はskip-scheduledインジケータ（矢印アイコン、黄色）を表示する
  - inspection.statusが「in_progress」またはAgent実行中の場合はexecutingインジケータ（スピナー、青色）を表示する
  - inspection.roundsが1以上の場合はcheckedインジケータ（チェックアイコン、緑色）を表示する
  - inspection未実行の場合はuncheckedインジケータ（空円アイコン、グレー）を表示する
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2.3 GO/NOGO状態表示とアクションボタンの実装
  - roundDetailsの最新ラウンドからGO/NOGO状態をバッジで表示する
  - GO状態（passed: true）の場合は「Inspection開始」ボタンを表示する
  - NOGO状態（passed: false）かつfixApplied: falseの場合は「Fix実行」ボタンを優先的に表示する
  - NOGO状態（passed: false）かつfixApplied: trueの場合は「Inspection開始」ボタンを表示する（再Inspection用）
  - Agent実行中または自動実行モード中は全てのアクションボタンを無効化する
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [x] 2.4 自動実行フラグ制御の実装
  - run/pause/skipの3値をサポートする自動実行フラグトグルを実装する
  - フラグ制御ボタンクリック時にrun→pause→skip→runの順に切り替える
  - フラグ変更をワークフローストア経由でspec.jsonに反映する
  - _Requirements: 1.10, 5.1_

- [x] 3. specManagerServiceのInspection機能拡張
- [x] 3.1 Inspection状態管理メソッドの追加
  - startInspection: 新しいラウンドを開始しroundDetailsにエントリを追加する
  - recordInspectionResult: GO/NOGO判定結果をspec.jsonに記録する
  - recordFixApplied: Fix実行完了時にfixAppliedをtrueに設定する
  - ラウンド番号は1から始まり、roundDetailsは常にroundNumber昇順を維持する
  - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [x] 3.2 Fix実行フローの実装
  - inspection-{n}.mdから指摘事項を取得するロジックを実装する
  - 取得した指摘事項をtasks.mdにFix用タスクとして追加する
  - /kiro:spec-implコマンドを構築してAgent経由で自動実行する
  - impl完了後にfixAppliedをtrueに設定し、UI更新通知を送る
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.3 IPC handlersの追加
  - IPC_CHANNELSにInspection関連チャンネルを定義する（EXECUTE_INSPECTION, EXECUTE_INSPECTION_FIX, SET_INSPECTION_AUTO_EXECUTION_FLAG）
  - handlers.tsにstartInspection, executeInspectionFix, setInspectionAutoExecutionFlagのハンドラを実装する
  - preload/index.tsにInspection用APIを追加する（electronAPI.executeInspection, electronAPI.executeInspectionFix, electronAPI.setInspectionAutoExecutionFlag）
  - _Requirements: 4.2, 4.3, 4.5_

- [x] 4. WorkflowViewへのInspectionPanel統合
  - tasksフェーズが承認済みの場合にInspectionPanelを表示する
  - InspectionPanelをimplフェーズとdeployフェーズの間に配置する
  - inspection.passedがtrue（GO判定）の場合はDeployフェーズを有効化する
  - inspection.passedがfalse（NOGO判定）の場合はDeployフェーズを無効化する
  - inspectionフィールドが存在しない（レガシーspec）場合はinspection.passedから状態を推定する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. 自動実行エンジンのInspectionフェーズ対応
  - 自動実行フラグ「run」の場合はInspectionフェーズを自動実行する
  - 自動実行フラグ「pause」の場合はInspectionフェーズで一時停止する
  - 自動実行フラグ「skip」の場合はInspectionフェーズをスキップしてdeployに進む
  - フラグ変更時にspec.jsonのautoExecution.permissions.inspectionを更新する
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [x] 6. (P) Remote UI（SpecDetail）の新構造対応
- [x] 6.1 SpecDetail新構造解釈の実装
  - inspection.roundDetailsが存在する場合は最新ラウンドのpassed値からGO/NOGO状態を判定する
  - inspection.roundDetailsが存在しない（レガシー構造）場合はinspection.passedを直接参照する
  - inspectionフィールドが存在しない場合はinspectionフェーズをpendingとして表示する
  - getPhaseStatusFromSpec関数を拡張して新構造を解釈する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6.2 WebSocketHandler拡張
  - WorkflowControllerインターフェースにexecuteInspection, executeInspectionFixメソッドを追加する
  - webSocketHandler.tsにInspection開始リクエスト（inspection:start）の処理を追加する
  - webSocketHandler.tsにInspectionFix実行リクエスト（inspection:fix）の処理を追加する
  - リモートからのInspection状態更新をwebSocket経由でブロードキャストする
  - _Requirements: 6.1, 6.4_

- [x] 7. 統合テストとE2Eテストの実装
- [x] 7.1 InspectionPanelのユニットテスト
  - 進捗インジケータ状態計算ロジックのテスト
  - アクションボタン表示条件ロジックのテスト
  - 自動実行フラグトグル動作のテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4_

- [x] 7.2 specManagerServiceの統合テスト
  - Inspection開始→結果記録→Fix記録フローのテスト
  - roundDetails更新と整合性のテスト
  - _Requirements: 2.5, 2.6, 2.7, 2.8, 4.2, 4.3_

- [x] 7.3 WorkflowView統合のE2Eテスト
  - InspectionPanel表示条件のテスト
  - GO/NOGO判定に基づくDeployフェーズ有効化のテスト
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
