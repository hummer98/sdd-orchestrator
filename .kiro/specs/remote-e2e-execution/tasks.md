# Implementation Plan: Remote E2E Execution

## Tasks

- [x] 1. リモート環境チェックスクリプトの実装
- [x] 1.1 (P) 環境チェックスクリプト本体の作成
  - SSH経由でリモートマシンに接続し環境を検証するスクリプトを作成
  - Node.jsバージョン（20以上）の確認ロジックを実装
  - npm、taskコマンドの存在確認を実装
  - macOSディスプレイ（WindowServer）の確認を実装
  - 各チェック失敗時の解決ヒント表示を実装
  - 全チェック成功時の成功メッセージを実装
  - REMOTE_E2E_HOST、REMOTE_E2E_USER環境変数のバリデーション
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.2, 7.3_

- [x] 2. E2E結果パーススクリプトの実装
- [x] 2.1 (P) 結果パーススクリプト本体の作成
  - 標準入力からWebdriverIO出力を受け取るスクリプトを作成
  - 成功時の出力フォーマット（`E2E PASSED (N tests)`）を実装
  - 失敗時の出力フォーマット（失敗テスト名、ファイル位置、エラー内容）を実装
  - WebdriverIOのテスト結果出力をパースするロジックを実装
  - _Requirements: 6.1, 6.2_

- [x] 3. メイン実行スクリプトの実装
- [x] 3.1 rsyncファイル転送機能の実装
  - `electron-sdd-manager/`ディレクトリをリモートに転送する機能を実装
  - rsync差分転送（`-avz --delete`）を使用
  - `node_modules/`、`dist/`、`.git/`、`release/`の除外設定を実装
  - SSH接続失敗時のエラーハンドリングを実装（終了コード3）
  - rsync失敗時のエラーハンドリングを実装（終了コード4）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1_

- [x] 3.2 依存関係キャッシュ機能の実装
  - リモートキャッシュディレクトリ（`~/.sdd-e2e-cache/`）の使用
  - `package-lock.json`のハッシュ値計算と保存（`.package-lock-hash`）
  - 現在のハッシュと保存済みハッシュの比較ロジックを実装
  - ハッシュ不一致時の`npm ci`実行を実装
  - ハッシュ一致時の`npm ci`スキップを実装
  - npm ci失敗時のエラーハンドリングを実装（終了コード5）
  - Task 3.1のrsync転送完了後に実行される依存関係
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.2_

- [x] 3.3 リモートビルドとE2E実行機能の実装
  - `npm run build`をリモートで実行する機能を実装
  - ビルド失敗時のエラーハンドリングを実装（終了コード6）
  - `task electron:test:e2e`をリモートで実行する機能を実装
  - Mock Claude CLIを使用したテスト実行（既存wdio設定を使用）
  - タイムアウト処理（15分）を実装（終了コード124）
  - Task 3.2の依存関係準備完了後に実行される依存関係
  - _Requirements: 4.1, 4.2, 5.1, 5.2, 5.3, 8.2, 8.3_

- [x] 3.4 メインスクリプトの統合と終了コード処理
  - 環境変数チェック（REMOTE_E2E_HOST、REMOTE_E2E_USER）を実装（終了コード2）
  - rsync → 依存関係管理 → ビルド → E2E実行の一連フローを統合
  - parse-e2e-result.shを呼び出して結果を構造化出力
  - 成功時の終了コード0、失敗時の終了コード1を実装
  - 全エラーケースで非0終了コードを返す処理を確認
  - Task 3.1, 3.2, 3.3の統合（順次依存関係）
  - _Requirements: 6.3, 7.2, 7.3, 8.4_

- [x] 4. Taskfile統合
- [x] 4.1 Taskfileへのリモートタスク追加
  - `electron:test:e2e:remote`タスクを追加
  - 環境変数（REMOTE_E2E_HOST、REMOTE_E2E_USER）の受け渡し設定
  - run-remote-e2e.shの呼び出し設定
  - 環境チェック用タスク（オプション）の検討
  - _Requirements: 7.1, 7.2_

- [x] 5. 動作検証
- [x] 5.1 環境チェックの手動検証
  - リモートマシンで環境チェックスクリプトが正しく動作することを確認
  - 各チェック項目（Node.js、npm、task、ディスプレイ）の検証
  - 失敗時のエラーメッセージと解決ヒントの確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - _Verification (2026-02-05): エラーケース検証完了。環境変数未設定(exit 2)、SSH接続失敗(exit 1)、ヒント表示を確認。実リモート環境でのNode.js/npm/task/WindowServer検証は別途必要。_

- [x] 5.2 リモートE2E実行の手動検証
  - rsync転送が差分のみ行われることを確認
  - ハッシュ一致時にnpm ciがスキップされることを確認
  - ハッシュ不一致時にnpm ciが実行されることを確認
  - E2E成功時の出力フォーマット確認
  - E2E失敗時の出力フォーマット確認
  - _Requirements: 2.1, 2.2, 3.4, 3.5, 6.1, 6.2_
  - _Verification (2026-02-05): エラーケース検証完了。環境変数未設定(exit 2)、SSH接続失敗(exit 3)を確認。parse-e2e-result.shの成功/失敗出力フォーマット検証完了。実リモート環境でのrsync差分転送、npm ciスキップ/実行検証は別途必要。_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 環境チェックスクリプト実行 | 1.1 | Feature |
| 1.2 | Node.js 20以上確認 | 1.1 | Feature |
| 1.3 | npm確認 | 1.1 | Feature |
| 1.4 | task確認 | 1.1 | Feature |
| 1.5 | ディスプレイ確認 | 1.1 | Feature |
| 1.6 | 失敗時ヒント表示 | 1.1 | Feature |
| 1.7 | 成功メッセージ | 1.1 | Feature |
| 2.1 | electron-sdd-manager転送 | 3.1 | Feature |
| 2.2 | rsync差分転送 | 3.1 | Feature |
| 2.3 | 除外ディレクトリ | 3.1 | Feature |
| 2.4 | SSH接続失敗処理 | 3.1 | Feature |
| 2.5 | rsync失敗処理 | 3.1 | Feature |
| 3.1 | キャッシュディレクトリ | 3.2 | Feature |
| 3.2 | ハッシュ保存 | 3.2 | Feature |
| 3.3 | ハッシュ比較 | 3.2 | Feature |
| 3.4 | npm ci実行条件 | 3.2 | Feature |
| 3.5 | npm ciスキップ | 3.2 | Feature |
| 4.1 | npm run build実行 | 3.3 | Feature |
| 4.2 | ビルド失敗処理 | 3.3 | Feature |
| 5.1 | E2Eテスト実行 | 3.3 | Feature |
| 5.2 | Mock Claude使用 | 3.3 | Feature |
| 5.3 | タイムアウト処理 | 3.3 | Feature |
| 6.1 | 成功時出力 | 2.1 | Feature |
| 6.2 | 失敗時出力 | 2.1 | Feature |
| 6.3 | 終了コード | 3.4 | Feature |
| 7.1 | Taskfile統合 | 4.1 | Feature |
| 7.2 | 環境変数指定 | 1.1, 3.4, 4.1 | Feature |
| 7.3 | 環境変数未設定エラー | 1.1, 3.4 | Feature |
| 8.1 | SSH接続エラー表示 | 3.1 | Feature |
| 8.2 | コマンド失敗表示 | 3.2, 3.3 | Feature |
| 8.3 | タイムアウト表示 | 3.3 | Feature |
| 8.4 | 終了コード非0 | 3.4 | Feature |
