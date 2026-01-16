# Implementation Plan: Renderer Unified Logging

## Task 1. ノイズフィルタモジュールの実装

- [x] 1.1 (P) NoiseFilter関数を作成し、HMR/Vite/React DevTools関連のログをフィルタリングする
  - フィルタパターン（[HMR], [vite], React DevTools, Download the React DevTools）をハードコード
  - shouldFilter関数で文字列マッチングを実装
  - 戻り値はboolean（true: フィルタ対象、false: 送信対象）
  - _Requirements: 2.1, 2.2, 2.3_

## Task 2. コンテキストプロバイダーモジュールの実装

- [x] 2.1 (P) 既存のnotificationStore.getAutoContextを参考に、独立したContextProvider関数を作成する
  - specDetailStoreから現在選択中のspecIdを取得
  - bugStoreから現在選択中のbugNameを取得
  - 未選択時は空オブジェクトを返す
  - Store未初期化時のフォールバック処理
  - _Requirements: 4.1, 4.2, 4.3_

## Task 3. 専用ロガーAPI（rendererLogger）の実装

- [x] 3.1 rendererLoggerモジュールを作成し、console互換APIを提供する
  - log/info/warn/error/debugメソッドをconsole.*と同じシグネチャで実装
  - 呼び出し元ファイル名をスタックトレースから自動抽出
  - ContextProviderから現在のspecId/bugNameを自動付与
  - 追加コンテキスト引数をJSON形式でログに含める
  - window.electronAPI.logRenderer経由でMainプロセスに送信
  - IPC利用不可時はサイレントフォールバック（エラーなし）
  - `import { rendererLogger as console }`形式でのエイリアス使用をサポート
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3_

## Task 4. consoleグローバルフックの実装

- [x] 4.1 ConsoleHookモジュールを作成し、console.*をグローバルにフックする
  - オリジナルのconsole.log/warn/error/debugを保存
  - ラッパー関数でフック処理を実装
  - NoiseFilterでフィルタリング判定を実行
  - フィルタ対象外ログをIPC経由でMainに送信
  - フィルタ対象でもオリジナルconsole.*は常に実行
  - console.error呼び出し時にスタックトレースを自動付与
  - ファイル名をスタックトレースから自動抽出
  - _Requirements: 1.1, 1.2, 1.5, 2.4_

- [x] 4.2 環境判定ロジックを実装し、開発/E2E環境でのみフックを有効化する
  - NODE_ENV=developmentまたは--e2e-testフラグでフック有効
  - 本番環境（app.isPackaged && !isE2ETest）ではフック無効
  - isHookActive関数でフック状態を確認可能に
  - _Requirements: 1.3, 1.4_

## Task 5. 既存notify.*のrendererLogger統合

- [x] 5.1 notificationStoreを変更し、内部ログ送信をrendererLoggerに統合する
  - notify.error/warning/info/successで内部的にrendererLogger.logWithContextを使用
  - notify.showCompletionSummaryで内部的にrendererLoggerを使用
  - 既存のlogToMain関数を削除しrendererLoggerに置換
  - notify.*の外部APIは一切変更しない
  - _Requirements: 5.1, 5.2, 5.3_

## Task 6. Mainプロセス側のログフォーマット対応

- [x] 6.1 ProjectLoggerのformatMessage関数を拡張し、Rendererログのファイル名表示に対応する
  - sourceフィールドで`renderer:ファイル名`形式をサポート
  - 既存のログフォーマット`[timestamp] [LEVEL] [projectId] [source] message data`を維持
  - E2Eテスト環境ではmain-e2e.logに出力
  - 開発環境ではmain.logに出力
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Task 7. エントリーポイント接続と初期化

- [x] 7.1 main.tsxにConsoleHookの初期化処理を追加する
  - アプリケーション起動時にinitializeConsoleHook()を呼び出し
  - React.StrictMode前に初期化を実行
  - 初期化失敗時のエラーハンドリング
  - _Requirements: 1.1, 1.3, 1.4_

## Task 8. ユニットテストの実装

- [x] 8.1 (P) NoiseFilterのユニットテストを作成する
  - 各フィルタパターン（[HMR], [vite], React DevTools等）のマッチング確認
  - フィルタ対象外メッセージの通過確認
  - 空文字・null・undefined等の境界値テスト
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8.2 (P) ContextProviderのユニットテストを作成する
  - specId/bugName取得の正常系テスト
  - 未選択時の空オブジェクト返却テスト
  - Store未初期化時のフォールバックテスト
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8.3 rendererLoggerのユニットテストを作成する
  - 各ログレベル（log/info/warn/error/debug）の動作確認
  - コンテキスト付与の確認
  - IPC利用不可時のフォールバック確認
  - `import { rendererLogger as console }`形式のエイリアスimportテスト
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.3_

- [x] 8.4 ConsoleHookのユニットテストを作成する
  - フック初期化の確認
  - 環境判定ロジックの確認
  - ファイル名抽出の確認
  - オリジナルconsole実行の確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4_

- [x] 8.5 notify統合のユニットテストを作成する
  - 既存notify.*の動作維持確認
  - rendererLogger経由でのログ送信確認
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.6 Integration Testsを作成する（Unit Test内でモック化してカバー）
  - Console Hook → IPC → ProjectLogger: E2E環境でのログフロー検証
  - rendererLogger → IPC → ProjectLogger: 構造化ログのフロー検証
  - notify → rendererLogger → IPC: 既存notify経由のログフロー検証
  - _Design: Testing Strategy - Integration Tests_

## Task 9. E2Eテストの実装

- [x] 9.1 既存E2Eテストフレームワーク（e2e-wdio）にRendererログ検証テストを追加する
  - 開発環境でのconsole.log出力: main.logへの出力確認
  - E2Eテスト環境でのログ出力: main-e2e.logへの出力確認
  - ノイズフィルタリング: HMR/Viteログがmain.logに含まれないこと
  - _Design: Testing Strategy - E2E Tests_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | console.log/warn/error/debugがフックされMainにログ送信 | 4.1, 7.1 | Feature |
| 1.2 | console.errorにスタックトレース自動付与 | 4.1, 8.4 | Feature |
| 1.3 | 開発/E2E環境でフック有効 | 4.2, 7.1, 8.4 | Feature |
| 1.4 | 本番環境でフック無効 | 4.2, 7.1, 8.4 | Feature |
| 1.5 | ファイル名自動付与 | 4.1, 8.4 | Feature |
| 2.1 | [HMR]/[vite]ログをフィルタ | 1.1, 8.1 | Feature |
| 2.2 | React DevToolsログをフィルタ | 1.1, 8.1 | Feature |
| 2.3 | "Download the React DevTools"フィルタ | 1.1, 8.1 | Feature |
| 2.4 | フィルタ時もオリジナルconsoleは動作 | 4.1, 8.4 | Feature |
| 3.1 | rendererLogger.log/info/warn/error/debugがconsole互換 | 3.1, 8.3 | Feature |
| 3.2 | rendererLogger使用時にファイル名自動付与 | 3.1, 8.3 | Feature |
| 3.3 | 追加コンテキストがJSON形式でログ出力 | 3.1, 8.3 | Feature |
| 3.4 | `import { rendererLogger as console }`で既存コード動作 | 3.1 | Feature |
| 4.1 | 現在選択中specIdをコンテキストに自動含める | 2.1, 8.2 | Feature |
| 4.2 | 現在選択中bugNameをコンテキストに自動含める | 2.1, 8.2 | Feature |
| 4.3 | Spec/Bug未選択時は空オブジェクト | 2.1, 8.2 | Feature |
| 5.1 | notify.error/warning/info/successが内部でrendererLogger使用 | 5.1, 8.5 | Feature |
| 5.2 | notify.showCompletionSummaryが内部でrendererLogger使用 | 5.1, 8.5 | Feature |
| 5.3 | 既存logToMainをrendererLoggerに置換 | 5.1, 8.5 | Feature |
| 6.1 | ログフォーマット: `[timestamp] [LEVEL] [projectId] [renderer] message data` | 6.1 | Feature |
| 6.2 | E2Eテスト時はmain-e2e.logに出力 | 6.1 | Feature |
| 6.3 | 開発環境時はmain.logに出力 | 6.1 | Feature |
| 6.4 | ファイル名は`[renderer:ファイル名]`形式でsourceに含める | 6.1 | Feature |
| 7.1 | 既存LOG_RENDERER IPCチャンネルを使用 | 3.1, 4.1 | Feature |
| 7.2 | fire-and-forget方式で送信 | 3.1, 4.1 | Feature |
| 7.3 | IPC利用不可時はエラーなくスキップ | 3.1, 8.3 | Feature |

### E2E Test Coverage

| Test Case | Summary | Task |
|-----------|---------|------|
| E2E-1 | 開発環境でのconsole.log出力がmain.logに記録される | 9.1 |
| E2E-2 | E2Eテスト環境でのログがmain-e2e.logに記録される | 9.1 |
| E2E-3 | HMR/Viteログがmain.logに含まれない | 9.1 |
