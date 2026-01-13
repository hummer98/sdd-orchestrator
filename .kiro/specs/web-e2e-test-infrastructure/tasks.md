# Implementation Plan

## Task 1. Playwrightプロジェクト構造と設定

- [x] 1.1 (P) ディレクトリ構造を作成
  - `electron-sdd-manager/e2e-playwright/` ディレクトリを新規作成
  - `electron-sdd-manager/e2e-playwright/helpers/` サブディレクトリを作成
  - _Requirements: 6.1, 6.2_

- [x] 1.2 (P) Playwright設定ファイルを作成
  - `playwright.config.ts`をelectron-sdd-manager直下に新規作成
  - `baseURL`を`http://localhost:8765`に設定
  - `testDir`を`./e2e-playwright`、`testMatch`を`**/*.spec.ts`に設定
  - レポーター設定（list, html）とトレース・スクリーンショット設定を追加
  - globalSetup/globalTeardownを設定
  - 単一ワーカー・非並列実行を設定（Electronプロセス共有のため）
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.3 (P) package.jsonにテスト実行スクリプトを追加
  - `test:web-e2e`コマンドを追加（`npx playwright test`）
  - `test:web-e2e:headed`コマンドを追加（headed mode）
  - `test:web-e2e:ui`コマンドを追加（UI mode）
  - _Requirements: 1.5, 4.5_

## Task 2. Electronアプリ起動ヘルパー

- [x] 2.1 electron-launcher.tsを実装
  - `ElectronLauncherConfig`インタフェースを定義（projectPath, remotePort, mockClaudePath, timeout）
  - `ElectronLauncher`クラスを実装しstart/stop/isRunningメソッドを提供
  - Electronアプリを`--project`, `--remote-ui=auto`, `--no-auth`, `--remote-port`オプションで起動
  - `E2E_MOCK_CLAUDE_COMMAND`環境変数を設定しMock Claude CLIを有効化
  - Remote UIが応答可能になるまでHTTPポーリングで待機する機能を実装
  - 起動失敗時に明確なエラーメッセージを出力
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1_

- [x] 2.2 global-setup.tsを実装
  - ElectronLauncherを使用してテスト前にElectronアプリを起動
  - 既存fixtureプロジェクト（`e2e-wdio/fixtures/test-project`）を使用
  - プロセスIDとRemote UI URLを環境変数経由でteardownに共有
  - _Requirements: 2.1, 2.2, 2.3, 6.3_

- [x] 2.3 global-teardown.tsを実装
  - global-setupで起動したElectronプロセスを終了
  - プロセスツリーごとの終了を試み、残存プロセスのクリーンアップも実行
  - 終了失敗時は警告ログを出力し強制終了を試行
  - _Requirements: 2.4_

## Task 3. Remote UIヘルパー関数

- [x] 3.1 remote-ui.helpers.tsを実装
  - `waitForConnection`: WebSocket接続確立を待機する関数
  - `waitForSpecList`: Spec一覧が表示されるまで待機する関数
  - `selectSpec`: 特定のSpecを選択する関数
  - `switchToTab`: Specs/Bugsタブを切り替える関数
  - `waitForPhaseGenerated`: 指定フェーズが生成済み状態になるまで待機する関数
  - 既存Remote UIの`data-testid`属性を活用したセレクタを使用
  - _Requirements: 3.3, 3.4_

## Task 4. 基本Smoke Test

- [x] 4.1 smoke.spec.tsを作成
  - Remote UIへのアクセスと接続状態表示を検証するテストを実装
  - Spec一覧が表示されることを検証するテストを実装
  - Spec選択で詳細パネルが表示されることを検証するテストを実装
  - Bugsタブへの切り替えが動作することを検証するテストを実装
  - ヘルパー関数を活用してテストコードを簡潔に保つ
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Task 5. Steering文書

- [x] 5.1 web-e2e-testing.mdを作成
  - セットアップ手順セクション（Playwrightインストール、ビルド要件）
  - テスト実行コマンドセクション（npm scripts、オプション）
  - テストシナリオ記述パターンセクション（ヘルパー関数使用例付き）
  - Mock Claude活用方法セクション（環境変数設定、ワークフローテスト例）
  - 既存E2E（WebdriverIO）との使い分けセクション（責務分離の説明）
  - トラブルシューティングセクション（よくある問題と解決策）
  - 既存e2e-testing.mdとの関連を明記
  - _Requirements: 5.1, 5.2, 5.3_

## Task 6. 統合テストと動作確認

- [x] 6.1 全体統合テストの実行と検証
  - `npm run test:web-e2e`でPlaywrightテストが実行できることを確認
  - global-setup/teardownが正常に動作することを確認
  - smoke.spec.tsの全4テストがパスすることを確認
  - テストレポートが`playwright-report/`に出力されることを確認
  - _Requirements: 1.5, 4.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | playwright.config.ts存在 | 1.2 | Infrastructure |
| 1.2 | baseURL設定（localhost:8765） | 1.2 | Infrastructure |
| 1.3 | テストパターン e2e-playwright/**/*.spec.ts | 1.2 | Infrastructure |
| 1.4 | レポート出力設定 | 1.2 | Infrastructure |
| 1.5 | npm run test:web-e2e実行可能 | 1.3, 6.1 | Infrastructure |
| 2.1 | Electronアプリ起動オプション | 2.1, 2.2 | Infrastructure |
| 2.2 | E2E_MOCK_CLAUDE_COMMAND設定 | 2.1, 2.2 | Infrastructure |
| 2.3 | Remote UI応答待機 | 2.1, 2.2 | Infrastructure |
| 2.4 | テスト後プロセス終了 | 2.3 | Infrastructure |
| 2.5 | 起動失敗時エラーメッセージ | 2.1 | Infrastructure |
| 3.1 | Mock Claude CLI有効化 | 2.1 | Infrastructure |
| 3.2 | フェーズ実行がMock応答で動作 | - | Existing (mock-claude.sh) |
| 3.3 | 生成ファイルがUIに反映 | 3.1 | Infrastructure |
| 3.4 | spec.json更新がUIに反映 | 3.1 | Infrastructure |
| 4.1 | Remote UIアクセス検証テスト | 4.1 | Feature |
| 4.2 | Spec一覧表示検証テスト | 4.1 | Feature |
| 4.3 | Spec選択・詳細パネル検証テスト | 4.1 | Feature |
| 4.4 | Bugsタブ切り替え検証テスト | 4.1 | Feature |
| 4.5 | npm run test:web-e2eで実行可能 | 1.3, 6.1 | Infrastructure |
| 5.1 | web-e2e-testing.md作成 | 5.1 | Documentation |
| 5.2 | セクション含有（セットアップ〜トラブルシューティング） | 5.1 | Documentation |
| 5.3 | e2e-testing.mdとの関連明記 | 5.1 | Documentation |
| 6.1 | e2e-playwright/ディレクトリ配置 | 1.1 | Infrastructure |
| 6.2 | helpers/サブディレクトリ配置 | 1.1 | Infrastructure |
| 6.3 | 既存fixtures参照 | 2.2 | Infrastructure |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks (Requirement 4 has Feature tasks)
