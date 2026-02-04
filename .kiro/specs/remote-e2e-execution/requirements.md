# Requirements: Remote E2E Execution

## Decision Log

### 転送範囲
- **Discussion**: プロジェクト全体を転送するか、`electron-sdd-manager/`のみにするか
- **Conclusion**: `electron-sdd-manager/`のみを転送
- **Rationale**: E2Eテストは`e2e-wdio/fixtures/`に自前のテストデータを持っており、プロジェクトルートの`.kiro/`は不要。転送量を最小化できる。

### node_modulesの扱い
- **Discussion**: 毎回`npm ci`、キャッシュ維持、または転送のいずれか
- **Conclusion**: キャッシュ維持 + `package-lock.json`のhash比較で必要時のみ`npm ci`
- **Rationale**: 通常実行では転送+ビルドのみで高速化。依存関係変更時のみ`npm ci`を実行し、確実性と速度を両立。

### 出力フォーマット
- **Discussion**: どの程度の情報を返すか（終了コードのみ、全ログ、構造化データ等）
- **Conclusion**: 成功時は簡潔なサマリー、失敗時は失敗テスト名とエラー内容のみ
- **Rationale**: AIエージェントは何を投げたか知っているため、失敗情報に集中。トークン消費を抑制。

### ビルドの実行場所
- **Discussion**: ローカルで事前ビルドして転送するか、リモートでビルドするか
- **Conclusion**: リモートでビルド
- **Rationale**: 転送量削減。`dist/`は生成物であり、転送するより再ビルドの方が確実。

### SSH認証
- **Discussion**: 認証方式をスコープに含めるか
- **Conclusion**: SSH鍵認証を前提とし、実装スコープ外。接続失敗時のエラーハンドリングのみ対応。
- **Rationale**: SSH設定は環境依存であり、ユーザーが事前に設定済みであることを前提とする。

### 並列実行
- **Discussion**: 複数エージェントが同時にリモートE2Eを実行する可能性
- **Conclusion**: 並列実行は考慮しない
- **Rationale**: Electron E2Eは同時に1つのアプリインスタンスしか安定して操作できない。ポート競合、ファイルロック等の問題があり、技術的に困難。

## Introduction

AIエージェントがE2Eテストを記述→動作確認するサイクルを高速に回すため、ローカルの変更をGitHubにpushせずにリモートMacOSマシンでE2Eテストを実行する機能を提供する。rsyncによる差分転送、SSH経由でのリモート実行、失敗情報の構造化出力を行う。

## Requirements

### Requirement 1: リモート環境チェック

**Objective:** 開発者として、リモートマシンがE2E実行に必要な環境を満たしているか確認したい。初回セットアップや環境問題のトラブルシューティングを容易にするため。

#### Acceptance Criteria
1. When `check-environment.sh`を実行したとき、the system shall リモートマシンに接続して環境をチェックする
2. The system shall Node.jsのバージョンが20以上であることを確認する
3. The system shall npmコマンドが利用可能であることを確認する
4. The system shall taskコマンドが利用可能であることを確認する
5. The system shall ディスプレイが利用可能であることを確認する（macOSのWindowServer）
6. If いずれかのチェックが失敗した場合、then the system shall 失敗項目と解決方法のヒントを表示する
7. If すべてのチェックが成功した場合、then the system shall 成功メッセージを表示する

### Requirement 2: ファイル転送

**Objective:** 開発者として、ローカルの変更を高速にリモートマシンに転送したい。E2Eテスト実行前の待ち時間を最小化するため。

#### Acceptance Criteria
1. When リモートE2E実行を開始したとき、the system shall `electron-sdd-manager/`ディレクトリをリモートマシンに転送する
2. The system shall rsyncを使用して差分転送を行う
3. The system shall `node_modules/`、`dist/`、`.git/`、`release/`を転送から除外する
4. If SSH接続に失敗した場合、then the system shall エラーメッセージを表示して終了する
5. If rsync転送に失敗した場合、then the system shall エラーメッセージを表示して終了する

### Requirement 3: 依存関係キャッシュ

**Objective:** 開発者として、リモートでの`npm ci`実行を最小化したい。通常の実行サイクルを高速化するため。

#### Acceptance Criteria
1. The system shall リモートマシン上に固定のキャッシュディレクトリを使用する
2. The system shall `package-lock.json`のハッシュ値を保存する
3. When 転送後、the system shall 現在の`package-lock.json`のハッシュと保存済みハッシュを比較する
4. If ハッシュが異なる場合、then the system shall `npm ci`を実行し、新しいハッシュを保存する
5. If ハッシュが同じ場合、then the system shall `npm ci`をスキップする

### Requirement 4: リモートビルド実行

**Objective:** 開発者として、リモートマシンでElectronアプリをビルドしたい。E2Eテスト実行の前提条件を満たすため。

#### Acceptance Criteria
1. When 依存関係の準備が完了したとき、the system shall `npm run build`を実行する
2. If ビルドが失敗した場合、then the system shall ビルドエラーの内容を表示して終了する

### Requirement 5: E2Eテスト実行

**Objective:** 開発者として、リモートマシンでE2Eテストを実行したい。ローカル環境に依存せずにテストを検証するため。

#### Acceptance Criteria
1. When ビルドが完了したとき、the system shall WebdriverIO E2Eテストを実行する
2. The system shall Mock Claude CLIを使用してテストを実行する
3. If テスト実行がタイムアウトした場合（15分）、then the system shall タイムアウトエラーを表示して終了する

### Requirement 6: 結果出力

**Objective:** 開発者/AIエージェントとして、E2Eテスト結果を簡潔に把握したい。次のアクションを迅速に判断するため。

#### Acceptance Criteria
1. If すべてのテストが成功した場合、then the system shall 以下の形式で出力する:
   ```
   E2E PASSED (N tests)
   ```
2. If いずれかのテストが失敗した場合、then the system shall 以下の形式で出力する:
   ```
   E2E FAILED (M passed, N failed)

   Failed tests:
   - {file}:{line} "{test name}"
     Error: {error message}
   ```
3. The system shall 終了コードで成功（0）/失敗（非0）を示す

### Requirement 7: Taskfile統合

**Objective:** 開発者として、標準的なtaskコマンドでリモートE2Eを実行したい。既存のワークフローと統一するため。

#### Acceptance Criteria
1. The system shall `task electron:test:e2e:remote`コマンドで実行可能であること
2. The system shall 環境変数`REMOTE_E2E_HOST`、`REMOTE_E2E_USER`でリモート接続先を指定可能であること
3. If 環境変数が未設定の場合、then the system shall エラーメッセージを表示して終了する

### Requirement 8: エラーハンドリング

**Objective:** 開発者として、実行中のエラーを明確に把握したい。問題の特定と解決を迅速に行うため。

#### Acceptance Criteria
1. If SSH接続に失敗した場合、then the system shall 「SSH接続エラー」と接続先情報を表示する
2. If リモートでコマンド実行に失敗した場合、then the system shall 失敗したコマンドとエラー出力を表示する
3. If タイムアウトした場合、then the system shall 「タイムアウト」とタイムアウト時間を表示する
4. The system shall すべてのエラーケースで非0の終了コードを返す

## Out of Scope

- SSH鍵の設定・管理
- リモートマシンのNode.js/task等のインストール
- 複数リモートマシンの切り替え
- 並列E2E実行
- スクリーンショット/動画キャプチャの取得
- GitHub Actions self-hosted runnerとの統合

## Open Questions

- E2E実行後のリモートワークスペースのクリーンアップは行うべきか（ディスク容量管理）
