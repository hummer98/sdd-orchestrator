# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.
---

## Summary
- **Feature**: `mobile-remote-access`
- **Discovery Scope**: Complex Integration
- **Key Findings**:
  - ws ライブラリは Node.js WebSocket サーバーの事実上の標準で、Electron メインプロセスで直接使用可能
  - qrcode パッケージで Data URL 形式の QR コード生成が可能、追加の画像処理不要
  - Tailwind CSS v4 CDN でビルドプロセス不要のモバイル UI 実装が可能

## Research Log

### HTTP/WebSocket サーバーライブラリ選定

- **Context**: Electron メインプロセスで HTTP と WebSocket を同時にホストする最適な方法の調査
- **Sources Consulted**:
  - [ws - npm](https://www.npmjs.com/package/ws) - WebSocket サーバー/クライアント実装
  - [express-ws - npm](https://www.npmjs.com/package/express-ws) - Express + WebSocket 統合
  - [Node.js WebSocket](https://nodejs.org/en/learn/getting-started/websocket) - Node.js 公式ドキュメント
  - [electron-websocket-express](https://github.com/mafikes/electron-websocket-express) - Electron での実装例
- **Findings**:
  - `ws` は高性能で広く使用されている WebSocket 実装（週 7000 万以上のダウンロード）
  - Node.js v22 でも WebSocket サーバーはネイティブサポートされておらず、`ws` が必要
  - Express の HTTP サーバーと `ws` を組み合わせることで、同一ポートで HTTP と WebSocket を提供可能
  - Electron メインプロセスでの WebSocket サーバー運用は一般的なパターン
- **Implications**:
  - `ws` ライブラリを WebSocket サーバーに採用
  - HTTP 静的ファイル配信には Express または Node.js 標準の http モジュールを使用
  - 同一ポートでの HTTP/WebSocket 統合アーキテクチャを採用

### QR コード生成ライブラリ選定

- **Context**: 接続 URL を QR コード化してモバイルからの接続を容易にする
- **Sources Consulted**:
  - [qrcode - npm](https://www.npmjs.com/package/qrcode) - QR コードジェネレータ
  - [node-qrcode - GitHub](https://github.com/soldair/node-qrcode)
- **Findings**:
  - `qrcode` パッケージは `toDataURL()` で Base64 PNG エンコードを直接生成可能
  - エラー訂正レベル（L/M/Q/H）をサポート
  - サーバーサイドで生成し、レンダラープロセスで `<img>` タグとして表示可能
- **Implications**:
  - `qrcode` パッケージを採用
  - Data URL 形式で生成し、IPC 経由でレンダラーに渡す
  - エラー訂正レベルは M（中）をデフォルトに設定

### Tailwind CSS CDN 調査

- **Context**: ビルドプロセス不要のモバイル UI 実装方法の調査
- **Sources Consulted**:
  - [Play CDN - Tailwind CSS](https://tailwindcss.com/docs/installation/play-cdn)
  - [Responsive Design - Tailwind CSS](https://tailwindcss.com/docs/responsive-design)
- **Findings**:
  - Tailwind CSS v4 は `@tailwindcss/browser@4` として CDN 提供
  - モバイルファーストの設計思想で、unprefixed クラスがモバイル向け
  - ブレークポイント: sm (640px), md (768px), lg (1024px), xl (1280px)
  - ダークモード対応: `dark:` プレフィックスで OS 設定に追従
- **Implications**:
  - 静的 HTML + Tailwind CDN + Vanilla JS 構成を採用
  - モバイルファースト設計でスマートフォン最適化
  - `prefers-color-scheme` メディアクエリでダークモード自動切り替え

### ローカル IP アドレス取得

- **Context**: LAN 内接続用 URL を生成するためのローカル IP アドレス取得方法
- **Sources Consulted**:
  - [Get local IP address in Node.js - Stack Overflow](https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js)
  - [os.networkInterfaces examples](https://www.tabnine.com/code/javascript/functions/os/networkInterfaces)
- **Findings**:
  - `os.networkInterfaces()` で全ネットワークインターフェース情報を取得可能
  - Node.js 18+ では `family` が数値（4 または 6）に変更
  - 内部アドレス（127.0.0.1）をフィルタリングして非ローカル IPv4 を取得
  - 複数インターフェース存在時は最初の有効な IPv4 を使用
- **Implications**:
  - `os.networkInterfaces()` を使用した IP アドレス取得ユーティリティを実装
  - Node.js バージョン互換性を考慮した family チェック
  - Wi-Fi/Ethernet の両方に対応

### WebSocket レート制限

- **Context**: DoS 攻撃防止のためのレート制限実装方法
- **Sources Consulted**:
  - [ws-rate-limit - npm](https://www.npmjs.com/package/ws-rate-limit)
  - [rate-limiter-flexible - npm](https://www.npmjs.com/package/rate-limiter-flexible)
  - [express-rate-limit - npm](https://www.npmjs.com/package/express-rate-limit)
- **Findings**:
  - `express-rate-limit` は HTTP リクエスト向け、WebSocket には別途対応が必要
  - `ws-rate-limit` は `ws` ライブラリ専用のシンプルなレート制限
  - `rate-limiter-flexible` はより柔軟で、メモリベースの実装も可能
  - レート超過時は WebSocket close code 1008 で接続切断
- **Implications**:
  - HTTP API には `express-rate-limit` または自前実装
  - WebSocket メッセージには `rate-limiter-flexible` のメモリストアを使用
  - 要件の 100 リクエスト/分をクライアント IP ごとに適用

### プライベート IP アドレス範囲

- **Context**: LAN 内からの接続のみ許可するセキュリティ要件の実装
- **Sources Consulted**: RFC 1918、一般的なネットワーク知識
- **Findings**:
  - プライベート IP 範囲:
    - 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
    - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
  - リンクローカル: 169.254.0.0/16
  - ループバック: 127.0.0.0/8
- **Implications**:
  - IP アドレス検証関数で上記範囲をチェック
  - CORS 設定と組み合わせてセキュリティを強化
  - パブリック IP からのリクエストは 403 Forbidden で拒否

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Express + ws 統合 | Express HTTP サーバー上で ws WebSocket を動作 | 同一ポート、成熟したエコシステム | 依存関係が増加 | Electron での実績あり |
| Node.js http + ws | 標準 http モジュール + ws | 軽量、依存少 | Express のミドルウェアなし | シンプルな用途に最適 |
| Socket.io | 自動再接続・フォールバック機能付き | 高機能、クライアント SDK | オーバーヘッド大、バンドルサイズ大 | 今回の要件には過剰 |

**選定**: Node.js http + ws の組み合わせを採用。静的ファイル配信はシンプルな自前実装で十分であり、Express の追加依存は不要。

## Design Decisions

### Decision: WebSocket メッセージプロトコル

- **Context**: クライアント-サーバー間の通信フォーマット統一
- **Alternatives Considered**:
  1. 独自バイナリプロトコル - 効率的だがデバッグ困難
  2. JSON-RPC 2.0 - 標準的だが複雑
  3. カスタム JSON メッセージ - シンプルで拡張性あり
- **Selected Approach**: カスタム JSON メッセージ形式
  ```typescript
  interface WebSocketMessage {
    type: string;      // メッセージタイプ
    payload?: unknown; // データペイロード
    requestId?: string; // リクエスト-レスポンス対応用（オプション）
  }
  ```
- **Rationale**: シンプルで理解しやすく、Vanilla JS での処理も容易
- **Trade-offs**: JSON パースのオーバーヘッドあり、型安全性はクライアント側で担保不可
- **Follow-up**: メッセージタイプの一覧を仕様として文書化

### Decision: ポート自動選択戦略

- **Context**: 複数 Electron インスタンス同時起動時のポート競合回避
- **Alternatives Considered**:
  1. 固定ポートのみ - 競合時にエラー
  2. ランダムポート - 予測不可能
  3. 連番ポート探索 - 予測可能で管理しやすい
- **Selected Approach**: 連番ポート探索（8765-8775）
- **Rationale**: 要件 2.3 に準拠、ユーザーが把握しやすい範囲
- **Trade-offs**: 範囲制限があり、11 インスタンス以上は起動不可
- **Follow-up**: ポート範囲は設定可能にすることを検討

### Decision: モバイル UI アーキテクチャ

- **Context**: ビルドプロセス不要のモバイル UI 実装
- **Alternatives Considered**:
  1. React SPA + Vite ビルド - 高機能だがビルド必要
  2. Vue/Svelte + CDN - 中間的だが学習コスト
  3. 静的 HTML + Tailwind CDN + Vanilla JS - シンプルで即時利用可能
- **Selected Approach**: 静的 HTML + Tailwind CDN + Vanilla JS
- **Rationale**: 要件 7.1 に準拠、追加ツール不要、デバッグ容易
- **Trade-offs**: 大規模化時にコード管理が困難になる可能性
- **Follow-up**: 機能拡張時に SPA 化を再検討

### Decision: 再接続戦略

- **Context**: WebSocket 接続切断時の自動再接続実装
- **Alternatives Considered**:
  1. 固定間隔リトライ - サーバー負荷が高い
  2. 線形バックオフ - 中程度の負荷軽減
  3. 指数バックオフ - 効果的な負荷軽減
- **Selected Approach**: 指数バックオフ（最大 5 回）
  - 初回: 1 秒
  - 2 回目: 2 秒
  - 3 回目: 4 秒
  - 4 回目: 8 秒
  - 5 回目: 16 秒
- **Rationale**: 要件 8.2 に準拠、サーバー負荷と UX のバランス
- **Trade-offs**: 最大待機時間が長くなる可能性
- **Follow-up**: ユーザーによる手動再接続は常時有効

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket 接続がファイアウォールでブロック | 機能不全 | 低 | 同一ポートで HTTP/WS を提供、ポート範囲の文書化 |
| 複数デバイスからの同時接続による負荷 | パフォーマンス低下 | 中 | 接続数制限（最大 10 クライアント）、レート制限 |
| LAN 外からの不正アクセス | セキュリティリスク | 低 | プライベート IP チェック、CORS 設定 |
| モバイルブラウザの WebSocket サポート差異 | 互換性問題 | 低 | 標準的な WebSocket API のみ使用、フォールバックなし |
| Electron アプリ終了時の WebSocket 切断 | データロス | 中 | graceful shutdown 実装、クライアント側再接続 |

## References

- [ws - Node.js WebSocket library](https://github.com/websockets/ws) - WebSocket サーバー実装
- [qrcode - npm](https://www.npmjs.com/package/qrcode) - QR コード生成
- [Tailwind CSS CDN](https://tailwindcss.com/docs/installation/play-cdn) - CSS フレームワーク
- [rate-limiter-flexible](https://www.npmjs.com/package/rate-limiter-flexible) - レート制限
- [RFC 1918](https://tools.ietf.org/html/rfc1918) - プライベート IP アドレス範囲
