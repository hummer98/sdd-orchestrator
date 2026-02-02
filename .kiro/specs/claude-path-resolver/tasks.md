# Implementation Plan

## Tasks

- [x] 1. ClaudePathResolverService の実装
- [x] 1.1 パス解決サービスの基本実装
  - ログインシェル（`$SHELL -l`）経由で `which claude` を実行する機能を実装
  - `$SHELL` 環境変数からデフォルトシェルを検出（未設定時は `/bin/sh` をフォールバック）
  - 解決結果（成功/失敗）をインスタンスにキャッシュ
  - E2E テスト用の環境変数オーバーライド（`E2E_MOCK_CLAUDE_COMMAND`）をサポート
  - _Requirements: 1.1, 1.2, 1.3, 2.4_

- [x] 1.2 パス解決サービスの公開API実装
  - `resolveClaudePath()`: 初回のみパス解決を実行、以降はキャッシュを返却
  - `getClaudePath()`: キャッシュされたパスを取得（未解決時は 'claude'）
  - `isResolved()`: パス解決が成功したかどうかを返却
  - _Requirements: 1.1, 1.3, 2.4_

- [x] 2. アプリ起動時のパス解決統合
- [x] 2.1 起動シーケンスへの統合
  - `app.whenReady()` 内で `resolveClaudePath()` を呼び出し
  - パス解決失敗時にワーニングダイアログを表示
  - ワーニングメッセージ：「claudeコマンドが見つかりません。Claude Codeがインストールされているか、PATHが通っているか確認してください」
  - ワーニングは起動時に一度だけ表示（繰り返し表示しない）
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Agent起動処理の更新
- [x] 3.1 (P) agentProcess.ts の更新
  - 既存の `getClaudeCommand()` 関数を `getClaudePath()` に置き換え
  - ハードコードされた PATH 環境変数追加（`/opt/homebrew/bin:/usr/local/bin`）を削除
  - spawn時に解決されたフルパスを command として使用
  - _Requirements: 1.4, 3.1, 3.2_

- [x] 3.2 (P) providerAgentProcess.ts の更新
  - ハードコードされた PATH 環境変数追加を削除
  - `getClaudePath()` を使用してコマンドパスを取得
  - spawn時に解決されたフルパスを command として使用
  - _Requirements: 1.4, 3.1, 3.2_

- [x] 4. ユニットテストの実装
- [x] 4.1 ClaudePathResolverService のユニットテスト
  - `resolveClaudePath()` 成功ケース：which コマンドがパスを返した場合のキャッシュ設定
  - `resolveClaudePath()` 失敗ケース：which コマンドが失敗した場合のエラーハンドリング
  - `getClaudePath()` キャッシュ動作：解決前後での返却値の違い
  - E2E 環境変数オーバーライド：`E2E_MOCK_CLAUDE_COMMAND` 設定時の動作
  - _Requirements: 1.1, 1.2, 1.3, 2.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | which claude をログインシェル内で実行 | 1.1, 1.2 | Feature |
| 1.2 | $SHELL でデフォルトシェル検出、-l フラグ使用 | 1.1, 4.1 | Feature |
| 1.3 | 解決パスをセッション中キャッシュ | 1.1, 1.2, 4.1 | Feature |
| 1.4 | Agent起動時にキャッシュパスを使用 | 3.1, 3.2 | Feature |
| 2.1 | パス解決失敗時にワーニング通知 | 2.1 | Feature |
| 2.2 | ワーニングメッセージ内容 | 2.1 | Feature |
| 2.3 | 起動時に一度だけワーニング表示 | 2.1 | Feature |
| 2.4 | 自動フォールバック実装しない | 1.1, 1.2, 4.1 | Feature |
| 3.1 | ハードコードPATH追加を削除 | 3.1, 3.2 | Cleanup |
| 3.2 | 解決パスのみで実行 | 3.1, 3.2 | Feature |
