# Requirements: Safari WebSocket Stability

## Decision Log

### Heartbeat実装方式
- **Discussion**: ブラウザのWebSocket APIはネイティブのping/pongフレームを公開していない。サーバー側wsライブラリのネイティブpingとの併用も検討。
- **Conclusion**: アプリケーションレベルのHeartbeat（JSON PING/PONGメッセージ）を採用
- **Rationale**: ブラウザ側でネイティブpingの送信・検知ができないため、JSONメッセージベースが唯一の選択肢

### Heartbeat間隔
- **Discussion**: Safariがアイドル接続を切断する閾値は約30-60秒。業界標準は20-30秒間隔。設定可能にするか固定値にするか。
- **Conclusion**: 20秒固定
- **Rationale**: Safari切断閾値に対して十分なマージンがあり、業界標準に準拠。設定可能にする複雑さに見合うメリットがない

### visibilitychange時の動作
- **Discussion**: 3つのオプションを検討
  - A: 接続が切れていたら即座に再接続
  - B: 接続状態に関わらずHeartbeatを即座に送信して生存確認
  - C: A + B 両方
- **Conclusion**: オプションC（再接続 + 即座のHeartbeat）
- **Rationale**: 最も堅牢。画面復帰時に接続断と接続劣化の両方を検知・回復できる

### 再接続バックオフ戦略
- **Discussion**: 現行は線形バックオフ（1s, 2s, 3s...最大5s）。指数バックオフへの変更を検討。
- **Conclusion**: 指数バックオフ（1s→2s→4s→8s→16s→30s max）
- **Rationale**: ネットワーク不安定時にサーバーへの負荷を軽減しつつ、最大30秒で妥当な再接続頻度を維持

### UI表示
- **Discussion**: 接続状態のUI表示について、新規実装か既存活用か。
- **Conclusion**: 既存の`ReconnectOverlay`コンポーネントをそのまま活用
- **Rationale**: 試行回数表示、カウントダウン、手動再接続ボタンなど十分な機能が既に実装済み

### テスト戦略
- **Discussion**: E2Eテストの実施可否。Safari環境のシミュレーションについて。
- **Conclusion**: 単体テストのみ、E2Eテストは除外
- **Rationale**: Safari環境のシミュレーションが困難であり、現実的ではない

## Introduction

Safari（特にiOS/iPadOS）のWebブラウザでは、WebSocket接続に関する固有の問題が存在する。ページがバックグラウンドになった時、画面ロック時、タブ切り替え時などに、Safariは無警告でWebSocket接続を切断する。この機能は、Remote UI（スマートフォンからSDD Orchestratorを操作するWebアプリ）のSafariユーザーに頻繁な接続失敗を引き起こしている。

本仕様では、Heartbeat（ping/pong）メカニズムとvisibilitychange対応により、Safari環境でのWebSocket接続安定性を向上させる。

## Requirements

### Requirement 1: Heartbeat（ping/pong）メカニズム

**Objective:** Remote UIユーザーとして、接続が無警告で切断された場合でも、システムが自動的に検知して再接続してほしい。これにより、操作中に突然接続が失われることなく、安定した操作を継続できる。

#### Acceptance Criteria

1.1. WebSocket接続が確立された後、クライアントは20秒間隔でPINGメッセージをサーバーに送信する

1.2. PINGメッセージのフォーマットは `{ type: 'PING', timestamp: <number> }` とする

1.3. サーバーはPINGメッセージを受信したら、即座にPONGメッセージを返す

1.4. PONGメッセージのフォーマットは `{ type: 'PONG', timestamp: <number> }` とする（timestampはPINGで受け取った値をエコーバック）

1.5. クライアントは連続2回のPONG未受信（40秒間応答なし）を検知した場合、接続を切断して再接続を開始する

1.6. WebSocket接続が切断された場合、Heartbeatタイマーは停止する

1.7. WebSocket接続が再確立された場合、Heartbeatタイマーを再開する

### Requirement 2: visibilitychange対応

**Objective:** Remote UIユーザーとして、画面をロックしたり他のアプリに切り替えた後、画面に戻った時に即座に接続状態が回復してほしい。これにより、アプリを再度開いた時にすぐに操作を再開できる。

#### Acceptance Criteria

2.1. クライアントは`document.visibilitychange`イベントを監視する

2.2. `document.visibilityState`が`visible`に変化した時、接続状態を確認する

2.3. If 接続が切断されている場合, then 即座に再接続を試みる

2.4. If 接続が維持されている場合, then 即座にPINGを送信して接続の生存を確認する

2.5. 生存確認のPINGに対して10秒以内にPONGが返らない場合、接続を切断して再接続を開始する

### Requirement 3: 指数バックオフ再接続

**Objective:** システムとして、ネットワークが不安定な状況でも、サーバーに過度な負荷をかけずに再接続を試みたい。これにより、サーバーの安定性を維持しながら、ユーザーの接続を回復できる。

#### Acceptance Criteria

3.1. 再接続の遅延時間は指数バックオフで計算する: 1秒 → 2秒 → 4秒 → 8秒 → 16秒 → 30秒（最大）

3.2. 最大遅延時間は30秒とし、それ以降は30秒間隔で再試行を継続する

3.3. 再接続が成功した場合、バックオフカウンターをリセットする

3.4. 既存の`ReconnectOverlay`コンポーネントに、次の試行までの秒数を正確に表示する

3.5. 最大試行回数（現行5回）の制限は維持する

### Requirement 4: サーバー側PING/PONG対応

**Objective:** サーバーとして、クライアントからのHeartbeat要求に応答し、接続の生存を確認したい。

#### Acceptance Criteria

4.1. WebSocketHandlerはメッセージタイプ`PING`を認識する

4.2. PINGメッセージを受信した場合、同じクライアントにPONGメッセージを返す

4.3. PONGメッセージには受信したPINGのtimestampをエコーバックする

4.4. PING/PONGメッセージはログに記録しない（トラフィックノイズ防止）

### Requirement 5: 単体テスト

**Objective:** 開発者として、Heartbeatとvisibilitychange機能が正しく動作することを自動テストで検証したい。

#### Acceptance Criteria

5.1. WebSocketApiClientのHeartbeat開始・停止ロジックのテストを追加する

5.2. PONG未受信時の接続切断ロジックのテストを追加する

5.3. visibilitychange時の動作（再接続/PING送信）のテストを追加する

5.4. 指数バックオフの計算ロジックのテストを追加する

5.5. WebSocketHandlerのPING/PONG応答ロジックのテストを追加する

## Out of Scope

- E2Eテスト（Safari環境のシミュレーションが困難）
- NoSleep.js等のバックグラウンド維持ライブラリの導入（バッテリー消費・UX副作用あり）
- Heartbeat間隔の設定UI
- サーバー側からのPING送信（クライアント主導のみ）
- `ReconnectOverlay`コンポーネントのUI変更

## Open Questions

- なし（設計フェーズで詳細を決定）

## References

- [Safari iOS WebSocket Problems - Apple Community](https://discussions.apple.com/thread/256142477)
- [Safari dropping WebSocket due to inactivity - Socket.io Issue #2924](https://github.com/socketio/socket.io/issues/2924)
- [WebSocket Keepalive Best Practices - websockets documentation](https://websockets.readthedocs.io/en/stable/topics/keepalive.html)
- [Safari reconnect after screen lock - graphql-ws Discussion #290](https://github.com/enisdenjo/graphql-ws/discussions/290)
