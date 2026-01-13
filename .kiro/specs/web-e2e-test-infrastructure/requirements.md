# Requirements: Web E2Eテスト基盤

## Decision Log

### テストフレームワーク選定
- **Discussion**: WebdriverIO（既存）vs Playwright
- **Conclusion**: Playwrightを採用
- **Rationale**:
  - Remote UIは「ブラウザ経由でアクセスするWeb UI」であり、純粋なWebテストとして分離するのが適切
  - 既存WebdriverIOはElectronアプリのE2Eテストとして機能しており、関心の分離が明確になる
  - CI実行が軽量・高速

### E2Eテスト専用フラグ
- **Discussion**: `--web-e2e-test`のような専用フラグが必要か
- **Conclusion**: 不要
- **Rationale**: 既存CLI起動オプション（`--project`, `--remote-ui=auto`, `--no-auth`, `--remote-port`）の組み合わせで十分対応可能

### 内部データ操作方式
- **Discussion**: Playwrightからspec.jsonやAgent状態を直接操作する仕組みが必要か
- **Conclusion**: Mock Claude活用で対応
- **Rationale**:
  - 既存mock-claude.shがMarkdownファイル生成、spec.json更新を行える
  - Mock Claude → ファイル生成 → WebSocket通知 → UI更新 の流れでほとんどのシナリオをカバー可能
  - 追加の内部データ操作APIは不要

### Fixture方針
- **Discussion**: 専用fixtureを作成するか、既存を流用するか
- **Conclusion**: 既存fixtures（`e2e-wdio/fixtures/`）を流用
- **Rationale**: 既に整備されたテストデータを再利用でき、一貫性を保てる

## Introduction

Remote UIをPlaywrightでE2Eテストするための基盤を整備する。Electronアプリを起動してRemote UIを有効化し、ブラウザからアクセスしてテストを実行する。既存のMock Claude CLIを活用することで、API呼び出しなしでワークフロー全体のテストが可能となる。

## Requirements

### Requirement 1: Playwright設定

**Objective:** 開発者として、Remote UI用のPlaywrightテスト環境を構築したい。テストの実行と管理が統一された方法で行えるようにするため。

#### Acceptance Criteria
1. `electron-sdd-manager/playwright.config.ts`が存在し、Remote UIテスト用の設定が定義されていること
2. `baseURL`がRemote UIのデフォルトポート（`http://localhost:8765`）に設定されていること
3. テストファイルのパターンが`e2e-playwright/**/*.spec.ts`で定義されていること
4. テストレポート出力先が設定されていること
5. `npm run test:web-e2e`コマンドでPlaywrightテストが実行できること

### Requirement 2: Electronアプリ起動ヘルパー

**Objective:** 開発者として、テスト実行前にElectronアプリを適切な設定で起動したい。手動操作なしでRemote UIが利用可能な状態にするため。

#### Acceptance Criteria
1. テストセットアップでElectronアプリが以下のオプションで起動されること:
   - `--project=<fixture-path>`: テスト用fixtureプロジェクト
   - `--remote-ui=auto`: Remote UI自動起動
   - `--no-auth`: 認証無効化（テスト用）
   - `--remote-port=8765`: ポート固定
2. 環境変数`E2E_MOCK_CLAUDE_COMMAND`が設定され、Mock Claude CLIが使用されること
3. Remote UIが応答可能になるまで待機してからテストが開始されること
4. テスト終了後にElectronプロセスが確実に終了されること
5. 起動失敗時に明確なエラーメッセージが出力されること

### Requirement 3: Mock Claude CLI連携

**Objective:** 開発者として、Mock Claude CLIを活用してワークフローテストを実装したい。実際のClaude API呼び出しなしでフェーズ実行をテストするため。

#### Acceptance Criteria
1. Mock Claude CLIがテスト環境で有効化されていること
2. フェーズ実行（requirements, design, tasks, impl）がMock応答で動作すること
3. Mock Claudeが生成したファイル（requirements.md等）がRemote UIに反映されること
4. spec.jsonの状態更新がRemote UIに反映されること

### Requirement 4: 基本Smoke Test

**Objective:** 開発者として、Remote UIの基本動作を検証するテストを用意したい。リグレッションを早期に検出するため。

#### Acceptance Criteria
1. Remote UIにブラウザからアクセスできることを検証するテストが存在すること
2. Spec一覧が表示されることを検証するテストが存在すること
3. Spec選択で詳細パネルが表示されることを検証するテストが存在すること
4. Bugsタブへの切り替えが動作することを検証するテストが存在すること
5. テストが`npm run test:web-e2e`で実行できること

### Requirement 5: Steering文書

**Objective:** 開発者として、Web E2Eテストの記述・実行方法を理解したい。新しいテストシナリオを追加する際の指針とするため。

#### Acceptance Criteria
1. `.kiro/steering/web-e2e-testing.md`が作成されること
2. 以下のセクションが含まれること:
   - テスト環境のセットアップ手順
   - テスト実行コマンド
   - テストシナリオ記述パターン（例付き）
   - Mock Claude活用方法
   - 既存E2E（WebdriverIO）との使い分け
   - トラブルシューティング
3. 既存のe2e-testing.mdとの関連が明記されていること

### Requirement 6: ディレクトリ構造

**Objective:** 開発者として、Web E2Eテストのファイルが整理された場所に配置されていることを期待する。保守性と見通しを確保するため。

#### Acceptance Criteria
1. テストファイルが`electron-sdd-manager/e2e-playwright/`ディレクトリに配置されること
2. ヘルパー関数が`electron-sdd-manager/e2e-playwright/helpers/`に配置されること
3. 既存の`e2e-wdio/fixtures/`を参照してテストが実行できること

## Out of Scope

- WebSocket経由の直接データ操作API（Mock Claudeで対応可能なため）
- Playwrightを使った新規の複雑なワークフローテスト（基盤整備後に追加）
- 既存WebdriverIOテストのPlaywrightへの移行
- Cloudflare Tunnel経由のリモートアクセステスト
- モバイルデバイス実機テスト
- CI/CD統合（GitHub Actions設定等）はPhase 2として対応

## Open Questions

- 特になし（Phase 2として内部データ操作が必要になった場合は別Specで対応）
