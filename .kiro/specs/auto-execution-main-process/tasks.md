# Implementation Plan

## Task Format Template

> **Parallel marker**: Append ` (P)` only to tasks that can be executed in parallel. Omit the marker when running in `--sequential` mode.

---

## Tasks

- [x] 1. AutoExecutionCoordinator基盤実装
- [x] 1.1 自動実行状態管理のコア構造を実装
  - 自動実行の状態を管理するMap構造を実装（specPath -> AutoExecutionState）
  - AutoExecutionStateインターフェースを定義（status, currentPhase, executedPhases, errors, startTime, lastActivityTime）
  - 既存のRenderer側ExecutionContext型を継承・拡張したAutoExecutionContextを実装
  - ビジネスルール（同一specIdで複数実行不可、phases順序制約）を検証ロジックとして実装
  - _Requirements: 1.1, 1.2, 7.1_

- [x] 1.2 自動実行の開始・停止・状態取得APIを実装
  - start(specPath, options)メソッドを実装（ALREADY_EXECUTING、MAX_CONCURRENT_REACHEDエラー対応）
  - stop(specPath)メソッドを実装（NOT_EXECUTINGエラー対応）
  - getStatus(specPath)とgetAllStatuses()メソッドを実装
  - retryFrom(specPath, phase)メソッドを実装
  - validatePreconditionsロジックを移植
  - _Requirements: 1.1, 1.2, 8.5_

- [x] 1.3 AgentRegistryとの連携を実装
  - AgentRegistryのAGENT_STATUS_CHANGEイベントをサブスクライブ
  - エージェント完了検出時のコールバック処理を実装
  - trackedAgentIdsによるエージェント追跡機構を実装
  - エージェントエラー終了時の自動実行停止ロジックを実装
  - _Requirements: 1.3, 2.1, 2.3_

- [x] 1.4 フェーズ遷移と自動承認ロジックを実装
  - エージェント完了時の次フェーズ判定ロジックを実装
  - 自動承認が許可されている場合のautoApprovePhase処理を実装
  - getNextPermittedPhase関数（permissions設定に基づく）を実装
  - SpecManagerServiceへのフェーズ実行依頼処理を実装
  - _Requirements: 2.2, 2.4, 2.5_

- [x] 2. IPCハンドラ実装
- [x] 2.1 (P) IPC通信のチャンネル定義を追加
  - channels.tsに自動実行関連チャンネル名を追加（start, stop, status, all-status）
  - 送信イベント用チャンネル名を追加（status-changed, phase-completed, error）
  - TypeScript型定義を追加
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2.2 autoExecutionHandlers IPCハンドラを実装
  - ipc:auto-execution:start ハンドラを実装
  - ipc:auto-execution:stop ハンドラを実装
  - ipc:auto-execution:status ハンドラを実装
  - ipc:auto-execution:all-status ハンドラを実装
  - AutoExecutionCoordinatorへの委譲処理を実装
  - specPathの存在確認バリデーションを追加
  - _Requirements: 4.1, 4.2, 4.3_
  - _Note: 2.1のチャンネル定義に依存_

- [x] 2.3 状態変更イベントのRenderer通知を実装
  - AUTO_EXECUTION_STATUS_CHANGEDイベントの送信処理を実装
  - PHASE_COMPLETEDイベントの送信処理を実装
  - AUTO_EXECUTION_ERRORイベントの送信処理を実装
  - BrowserWindow.webContents.send経由での通知を実装
  - _Requirements: 4.4, 4.5, 4.6_
  - _Note: 2.2のハンドラ実装に依存_

- [x] 3. WebSocketHandler拡張（Remote UI対応）
- [x] 3.1 (P) WorkflowControllerインターフェースの拡張
  - autoExecuteStart、autoExecuteStop、autoExecuteStatusメソッドを追加
  - AutoExecutionCoordinatorへの委譲処理を実装
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.2 WebSocketメッセージハンドラを追加
  - AUTO_EXECUTE_STARTメッセージの受信処理を実装
  - AUTO_EXECUTE_STOPメッセージの受信処理を実装
  - AUTO_EXECUTE_STATUSメッセージの受信処理を実装
  - _Requirements: 5.1, 5.2, 5.3_
  - _Note: 3.1のインターフェース拡張に依存_

- [x] 3.3 Remote UIへのブロードキャスト処理を実装
  - AUTO_EXECUTION_STATUSブロードキャストを実装
  - AUTO_EXECUTION_PHASE_COMPLETEDブロードキャストを実装
  - AUTO_EXECUTION_ERRORブロードキャストを実装
  - 接続中の全クライアントへの同時配信処理を実装
  - _Requirements: 5.4, 5.5, 5.6, 7.2_
  - _Note: 3.2のハンドラ実装に依存_

- [x] 4. Renderer側リファクタリング
- [x] 4.1 (P) useAutoExecution Hookを実装
  - startAutoExecution、stopAutoExecution、retryFromPhase アクションを実装
  - isAutoExecuting、autoExecutionStatus、autoExecutionPhase 状態を定義
  - canStart、canStop 派生状態を計算
  - IPC呼び出しへの変換処理を実装
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 4.2 IPC受信イベントのStore反映を実装
  - AUTO_EXECUTION_STATUS_CHANGEDイベントのリスナーを登録
  - PHASE_COMPLETEDイベントのリスナーを登録
  - AUTO_EXECUTION_ERRORイベントのリスナーを登録
  - specStore/workflowStoreへの状態反映処理を実装
  - _Requirements: 3.2, 3.3_
  - _Note: 4.1のHook実装に依存_

- [x] 4.3 既存AutoExecutionService呼び出し箇所の置き換え
  - WorkflowViewコンポーネントでのuseAutoExecution Hook使用に変更
  - PhaseExecutionPanelコンポーネントでのHook使用に変更
  - agentStore直接参照を削除
  - 旧AutoExecutionServiceの非推奨化（警告ログ出力）
  - _Requirements: 1.4, 3.3_
  - _Note: 4.2の実装に依存_

- [x] 5. Remote UI側実装
- [x] 5.1 (P) autoExecution Storeを実装
  - statuses Record構造を定義
  - startAutoExecution、stopAutoExecution アクションを実装
  - WebSocket送信処理を実装
  - _Requirements: 6.1, 6.2_

- [x] 5.2 WebSocketイベントハンドラを実装
  - handleStatusUpdate処理を実装
  - handlePhaseCompleted処理を実装
  - handleError処理を実装
  - 再接続時の状態再取得処理を実装
  - _Requirements: 6.4, 6.5, 6.6_
  - _Note: 5.1のStore実装に依存_

- [x] 5.3 Remote UI自動実行コンポーネントを実装
  - 開始/停止ボタンの表示処理を実装
  - 現在実行中フェーズのリアルタイム表示を実装
  - 進捗状態（pending/executing/completed/error）の視覚表示を実装
  - WebSocket接続確立時の状態取得処理を実装
  - _Requirements: 6.1, 6.2, 6.3_
  - _Note: 5.2のハンドラ実装に依存_

- [x] 6. エラーハンドリングとリカバリー
- [x] 6.1 (P) エージェントクラッシュ検出を実装
  - プロセス終了コード監視を実装
  - 異常終了時の自動実行停止処理を実装
  - エラー状態の記録処理を実装
  - _Requirements: 8.1_

- [x] 6.2 (P) タイムアウト処理を実装
  - 設定されたタイムアウト時間の監視を実装
  - タイムアウト時の自動実行停止処理を実装
  - タイムアウトエラーの記録処理を実装
  - _Requirements: 8.2_

- [x] 6.3 spec.json読み取りエラー処理を実装
  - FileService例外のキャッチ処理を実装
  - 自動実行一時停止処理を実装
  - エラーログ記録処理を実装
  - _Requirements: 8.3_
  - _Note: 1.2の状態管理実装に依存_

- [x] 6.4 UIリカバリー機能を実装
  - エラー詳細表示処理を実装
  - 再開オプションの表示処理を実装
  - retryFromPhase呼び出し処理を実装
  - _Requirements: 8.4, 8.5_
  - _Note: 4.1のHook実装に依存_

- [x] 7. 状態同期とSSoT保証
- [x] 7.1 状態変更の同時通知を実装
  - IPC通知とWebSocket通知の同時発行処理を実装
  - 通知順序の保証処理を実装
  - _Requirements: 7.2_
  - _Note: 2.3と3.3の実装に依存_

- [x] 7.2 新規接続クライアントへの状態提供を実装
  - IPC接続時の現在状態返却処理を実装
  - WebSocket接続時の現在状態返却処理を実装
  - _Requirements: 7.3_
  - _Note: 7.1の実装に依存_

- [x] 7.3 ファイル監視連携を実装
  - SpecsWatcherからの変更通知受信処理を実装
  - 自動実行継続可否の判定処理を実装
  - 変更検出時の状態更新処理を実装
  - _Requirements: 7.4_
  - _Note: 1.1の状態管理実装に依存_

- [x] 7.4 複数クライアント一貫性保証を実装
  - 同時接続クライアントへの一括通知処理を実装
  - 状態不整合検出時のリカバリー処理を実装
  - _Requirements: 7.5_
  - _Note: 7.1、7.2の実装に依存_

- [x] 8. 後方互換性対応
- [x] 8.1 既存IPCチャンネル名の互換性維持を実装
  - 新旧チャンネル名のマッピング処理を実装
  - deprecation警告の出力処理を実装
  - _Requirements: 9.1_

- [x] 8.2 (P) spec.json形式の互換性確認テストを追加
  - 既存autoExecutionフィールドの読み書きテストを追加
  - 新フィールド追加時の後方互換性テストを追加
  - _Requirements: 9.2_

- [x] 8.3 旧バージョンクライアント互換モードを実装
  - 接続時のバージョン確認処理を実装
  - 互換モードでの動作切り替え処理を実装
  - _Requirements: 9.3_
  - _Note: 2.2のハンドラ実装に依存_

- [x] 8.4 (P) ログフォーマット互換性を確認
  - ProjectLogger出力フォーマットの確認テストを追加
  - 既存ログ解析ツールとの互換性検証を実施
  - _Requirements: 9.4_

- [x] 9. テスト実装
- [x] 9.1 AutoExecutionCoordinatorユニットテストを追加
  - start/stop/getStatus メソッドのテストを追加
  - handleAgentCompleted のテストを追加
  - validatePreconditions のテストを追加
  - getNextPermittedPhase のテストを追加
  - _Requirements: 1.1, 1.2, 2.1, 2.2_
  - _Note: 1.1-1.4の実装完了に依存_

- [x] 9.2 IPC通信統合テストを追加
  - start -> status-changed -> stop フローのテストを追加
  - エラー発生時の通知テストを追加
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Note: 2.1-2.3の実装完了に依存_

- [x] 9.3 WebSocket通信統合テストを追加
  - Remote UIからの開始/停止操作テストを追加
  - ブロードキャスト配信テストを追加
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - _Note: 3.1-3.3の実装完了に依存_

- [x] 9.4 AgentRegistry連携テストを追加
  - エージェント完了検出テストを追加
  - 次フェーズ開始テストを追加
  - _Requirements: 2.1, 2.2, 2.3_
  - _Note: 1.3の実装完了に依存_

- [x] 9.5 後方互換性E2Eテストを追加
  - 既存E2Eテストがパスすることを確認
  - 新規自動実行E2Eテストを追加
  - _Requirements: 9.5_
  - _Note: 全実装完了に依存_

- [x] 10. 統合と最終検証
- [x] 10.1 全コンポーネントの統合テストを実施
  - Main Process側コンポーネントの統合確認
  - Renderer側コンポーネントの統合確認
  - Remote UI側コンポーネントの統合確認
  - Desktop UIとRemote UIの同時操作テスト
  - _Requirements: 7.1, 7.2, 7.5_
  - _Note: タスク1-9の全完了に依存_

- [x] 10.2 性能テストを実施
  - MAX_CONCURRENT_SPECS件の同時実行テスト
  - IPC/WebSocket通知レイテンシ計測
  - _Requirements: 7.5_
  - _Note: 10.1の統合テスト完了に依存_

- [x] 10.3 旧AutoExecutionServiceのクリーンアップ
  - Renderer側の旧コード削除（非推奨期間経過後）
  - 関連テストコードの更新
  - _Requirements: 1.4_
  - _Note: 10.1、10.2の検証完了に依存_

- [x] 10.4 ドキュメント更新
  - symbol-semantic-map.mdにAutoExecutionCoordinatorの記載を追加
  - operations.mdの自動実行操作手順を更新（Main Process移行後の操作フロー）
  - debugging.mdに自動実行関連のトラブルシューティング情報を追加
  - _Requirements: N/A (Document Review W-3)_
  - _Note: 10.3の完了に依存_

---

## Inspection Fix Tasks (inspection-1)

以下のタスクはInspection結果に基づく修正タスクです。

- [x] 11. IPCハンドラ登録の統合
- [x] 11.1 handlers.tsにAutoExecutionハンドラを登録
  - `autoExecutionHandlers.ts`から`registerAutoExecutionHandlers`をインポート
  - `AutoExecutionCoordinator`のシングルトンインスタンスを生成
  - `registerIpcHandlers()`関数内で`registerAutoExecutionHandlers(coordinator)`を呼び出し
  - WebSocketHandler生成時にもCoordinatorインスタンスを共有
  - _Fixes: Critical Issue #1 (registerAutoExecutionHandlersの未呼び出し)_
  - _Fixes: Critical Issue #2 (AutoExecutionCoordinatorのインスタンス管理不備)_
  - _Fixes: Critical Issue #3 (Renderer -> IPC -> Main通信の未接続)_
  - _Fixes: Critical Issue #4 (Dead Code: autoExecutionHandlers.ts)_

- [x] 11.2 AutoExecutionCoordinatorインスタンス共有の実装
  - handlers.ts内でAutoExecutionCoordinatorをシングルトンとして初期化
  - WebSocketHandler拡張時にCoordinatorを依存性注入
  - 必要に応じてgetCoordinatorInstance()エクスポート関数を追加
  - _Note: 11.1に依存_

- [x] 11.3 統合テストで動作確認
  - IPC経由での自動実行開始・停止が動作することを確認
  - useAutoExecution Hookからの呼び出しが正常に動作することを確認
  - 既存のE2Eテストがパスすることを確認
  - _Note: 11.1、11.2に依存_

- [x] 11.4 Dead Code警告の解消確認
  - autoExecutionHandlers.tsが実行時に使用されていることを確認
  - AutoExecutionCoordinatorがIPCおよびWebSocketから利用されていることを確認
  - useAutoExecution HookがUI側から呼び出されていることを確認
  - _Note: 11.3に依存_
