# Implementation Plan: Safari WebSocket Stability

## タスク一覧

- [x] 1. クライアント側Heartbeat機能の実装
- [x] 1.1 (P) WebSocketApiClientにHeartbeat管理機能を追加
  - 20秒間隔でPINGメッセージを送信するタイマーを実装
  - `{ type: 'PING', timestamp: <number> }` フォーマットでメッセージを構築
  - PONG受信時にmissedPongCountをリセットする処理を追加
  - 連続2回のPONG未受信を検知して接続切断・再接続を開始する
  - WebSocket接続時にHeartbeatを開始、切断時に停止する処理を組み込む
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_
  - _Method: startHeartbeat, stopHeartbeat, handlePong, sendPing_
  - _Verify: Grep "startHeartbeat|stopHeartbeat|handlePong|sendPing" in WebSocketApiClient.ts_

- [x] 1.2 (P) visibilitychange監視機能を追加
  - document.visibilitychangeイベントを監視するリスナーを設定
  - visible状態への変化時に接続状態を確認する
  - 接続断の場合は即座に再接続を試みる
  - 接続維持の場合は即座にPINGを送信し、10秒以内にPONGが返らなければ再接続
  - コンポーネントアンマウント時にリスナーをクリーンアップ
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - _Method: handleVisibilityChange, sendImmediatePing_
  - _Verify: Grep "visibilitychange|handleVisibilityChange|sendImmediatePing" in WebSocketApiClient.ts_

- [x] 1.3 指数バックオフ再接続ロジックを実装
  - 現行の線形バックオフを指数バックオフに変更（1s→2s→4s→8s→16s→30s）
  - 最大遅延時間を30秒に設定
  - 再接続成功時にバックオフカウンターをリセット
  - 次の試行までの秒数をReconnectOverlayに正確に渡す
  - 最大試行回数5回の制限を維持
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - _Method: calculateBackoffDelay_
  - _Verify: Grep "INITIAL_BACKOFF|MAX_BACKOFF|BACKOFF_MULTIPLIER" in WebSocketApiClient.ts_

- [x] 2. サーバー側PING/PONG対応の実装
- [x] 2.1 webSocketHandlerにPING/PONG応答機能を追加
  - routeMessage()のswitch文にPINGケースを追加
  - PINGメッセージ受信時に同一クライアントへPONGメッセージを返す
  - 受信したtimestampをPONGメッセージにエコーバック
  - PING/PONGメッセージはログに記録しない条件を追加
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Method: handlePing, routeMessage_
  - _Verify: Grep "case 'PING'|handlePing" in webSocketHandler.ts_

- [x] 3. 単体テストの実装
- [x] 3.1 (P) WebSocketApiClientのHeartbeatテストを追加
  - startHeartbeat/stopHeartbeat呼び出しでタイマーが開始・停止することを検証
  - PONG受信でmissedPongCountがリセットされることを検証
  - 連続2回PONG未受信でforceReconnectが呼ばれることを検証
  - _Requirements: 5.1, 5.2_

- [x] 3.2 (P) WebSocketApiClientのvisibilitychangeテストを追加
  - visible時に接続断ならreconnectが呼ばれることを検証
  - visible時に接続維持ならPINGが即座に送信されることを検証
  - 10秒以内にPONGが返らなければ再接続が開始されることを検証
  - _Requirements: 5.3_

- [x] 3.3 (P) 指数バックオフ計算ロジックのテストを追加
  - 遅延時間が1s→2s→4s→8s→16s→30sと計算されることを検証
  - 30秒以上にはならないことを検証
  - 再接続成功後にカウンターがリセットされることを検証
  - _Requirements: 5.4_

- [x] 3.4 (P) webSocketHandlerのPING/PONGテストを追加
  - PINGメッセージ受信でPONGが返却されることを検証
  - PONGメッセージにPINGのtimestampがエコーバックされることを検証
  - PING/PONGメッセージがログに記録されないことを検証
  - _Requirements: 5.5_

---

## Inspection Fixes

### Round 1 (2026-01-27)

- [x] 4.1 WebSocketApiClient Heartbeat機能実装
  - 関連: Task 1.1, Requirement 1.1-1.7
  - `startHeartbeat()`, `stopHeartbeat()`, `handlePong()`, `sendPing()`メソッドを追加
  - 20秒間隔のタイマーを実装し、PING送信とPONG受信監視を行う
  - `missedPongCount`カウンターを実装し、連続2回PONG未受信で再接続
  - WebSocket接続確立時に`startHeartbeat()`、切断時に`stopHeartbeat()`を呼び出す
  - _Method: startHeartbeat, stopHeartbeat, handlePong, sendPing, HEARTBEAT_INTERVAL, missedPongCount_
  - _Verify: Grep "startHeartbeat|stopHeartbeat|handlePong|sendPing|HEARTBEAT_INTERVAL|missedPongCount" in WebSocketApiClient.ts_

- [x] 4.2 WebSocketApiClient visibilitychange監視実装
  - 関連: Task 1.2, Requirement 2.1-2.5
  - `handleVisibilityChange()`, `sendImmediatePing()`メソッドを追加
  - `document.visibilitychange`イベントリスナーを設定し、visible時に接続確認
  - 接続断の場合は即座に再接続、接続維持の場合は即座にPINGを送信
  - 10秒以内にPONGが返らない場合は再接続を開始
  - _Method: handleVisibilityChange, sendImmediatePing, visibilitychange listener_
  - _Verify: Grep "visibilitychange|handleVisibilityChange|sendImmediatePing" in WebSocketApiClient.ts_

- [x] 4.3 指数バックオフ再接続実装
  - 関連: Task 1.3, Requirement 3.1-3.5
  - `calculateBackoffDelay()`メソッドを追加（または既存の再接続ロジックを変更）
  - `INITIAL_BACKOFF`, `MAX_BACKOFF`, `BACKOFF_MULTIPLIER`定数を追加
  - 遅延時間を1s→2s→4s→8s→16s→30s（最大）で計算
  - 再接続成功時にバックオフカウンターをリセット
  - `ReconnectOverlay`に次の試行までの秒数を正確に渡す
  - _Method: INITIAL_BACKOFF, MAX_BACKOFF, BACKOFF_MULTIPLIER, calculateBackoffDelay_
  - _Verify: Grep "INITIAL_BACKOFF|MAX_BACKOFF|BACKOFF_MULTIPLIER" in WebSocketApiClient.ts_

- [x] 4.4 サーバー側PING/PONG応答実装
  - 関連: Task 2.1, Requirement 4.1-4.4
  - `webSocketHandler.ts`に`handlePing()`メソッドを追加
  - `routeMessage()`のswitch文に`case 'PING':`を追加
  - PINGメッセージを受信したら即座にPONGメッセージを返す
  - PONGメッセージには受信したPINGの`timestamp`をエコーバック
  - PING/PONGメッセージはログに記録しない条件を追加
  - _Method: handlePing, routeMessage with case 'PING'_
  - _Verify: Grep "case 'PING'|handlePing" in webSocketHandler.ts_

- [x] 4.5 WebSocketApiClient Heartbeatテスト実装
  - 関連: Task 3.1, Requirement 5.1, 5.2
  - `WebSocketApiClient.test.ts`にHeartbeat開始・停止テストを追加
  - PONG受信で`missedPongCount`がリセットされることを検証
  - 連続2回PONG未受信で`forceReconnect()`が呼ばれることを検証
  - _Verify: Grep "startHeartbeat|stopHeartbeat|missedPongCount" in WebSocketApiClient.test.ts_

- [x] 4.6 WebSocketApiClient visibilitychangeテスト実装
  - 関連: Task 3.2, Requirement 5.3
  - `WebSocketApiClient.test.ts`にvisibilitychange動作テストを追加
  - visible時に接続断なら`reconnect()`が呼ばれることを検証
  - visible時に接続維持ならPINGが即座に送信されることを検証
  - 10秒以内にPONGが返らなければ再接続が開始されることを検証
  - _Verify: Grep "visibilitychange|handleVisibilityChange" in WebSocketApiClient.test.ts_

- [x] 4.7 指数バックオフ計算テスト実装
  - 関連: Task 3.3, Requirement 5.4
  - `WebSocketApiClient.test.ts`に指数バックオフ計算テストを追加
  - 遅延時間が1s→2s→4s→8s→16s→30sと計算されることを検証
  - 30秒以上にはならないことを検証
  - 再接続成功後にカウンターがリセットされることを検証
  - _Verify: Grep "INITIAL_BACKOFF|MAX_BACKOFF|BACKOFF_MULTIPLIER" in WebSocketApiClient.test.ts_

- [x] 4.8 webSocketHandler PING/PONGテスト実装
  - 関連: Task 3.4, Requirement 5.5
  - `webSocketHandler.test.ts`にPING/PONG応答テストを追加
  - PINGメッセージ受信でPONGが返却されることを検証
  - PONGメッセージにPINGの`timestamp`がエコーバックされることを検証
  - PING/PONGメッセージがログに記録されないことを検証
  - _Verify: Grep "PING|PONG|handlePing" in webSocketHandler.test.ts_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 20秒間隔でPINGメッセージ送信 | 1.1 | Feature |
| 1.2 | PINGメッセージフォーマット | 1.1 | Feature |
| 1.3 | サーバーがPONGを返す | 2.1 | Feature |
| 1.4 | PONGメッセージフォーマット | 2.1 | Feature |
| 1.5 | 連続2回PONG未受信で再接続 | 1.1 | Feature |
| 1.6 | 切断時Heartbeat停止 | 1.1 | Feature |
| 1.7 | 再接続時Heartbeat再開 | 1.1 | Feature |
| 2.1 | visibilitychangeイベント監視 | 1.2 | Feature |
| 2.2 | visible時に接続確認 | 1.2 | Feature |
| 2.3 | 切断時即座に再接続 | 1.2 | Feature |
| 2.4 | 接続維持時即座にPING送信 | 1.2 | Feature |
| 2.5 | 10秒以内PONG未受信で再接続 | 1.2 | Feature |
| 3.1 | 指数バックオフ計算 | 1.3 | Feature |
| 3.2 | 最大30秒間隔 | 1.3 | Feature |
| 3.3 | 成功時バックオフリセット | 1.3 | Feature |
| 3.4 | 次の試行までの秒数表示 | 1.3 | Feature |
| 3.5 | 最大5回試行制限維持 | 1.3 | Feature |
| 4.1 | WebSocketHandlerがPINGを認識 | 2.1 | Feature |
| 4.2 | PINGにPONGで応答 | 2.1 | Feature |
| 4.3 | timestampをエコーバック | 2.1 | Feature |
| 4.4 | PING/PONGをログに記録しない | 2.1 | Feature |
| 5.1 | Heartbeat開始・停止テスト | 3.1 | Feature |
| 5.2 | PONG未受信時切断テスト | 3.1 | Feature |
| 5.3 | visibilitychange動作テスト | 3.2 | Feature |
| 5.4 | 指数バックオフ計算テスト | 3.3 | Feature |
| 5.5 | WebSocketHandler PING/PONGテスト | 3.4 | Feature |
