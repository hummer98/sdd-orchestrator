---
description: E2Eテストを実行し、レポートを docs/e2e-report/ に保存
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Task, AskUserQuestion
---

# E2E Run Command

E2Eテストを実行し、結果レポートを `docs/e2e-report/` に保存します。
オプションで失敗テストの自動修正も行います。

## Usage

```
/e2e:run [options]
```

### Options

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `--electron` | Electron E2E (WebdriverIO) のみ実行 | - |
| `--remoteui` | Remote UI E2E (Playwright) のみ実行 | - |
| `--fix` | 失敗テストを解析・修正 | - |
| (なし) | 全E2Eテストを実行 | all |

### Examples

```
/e2e:run                     # 全E2Eテスト実行
/e2e:run --electron          # Electron E2Eのみ
/e2e:run --remoteui          # Remote UI E2Eのみ
/e2e:run --fix               # 全テスト実行 + 失敗テスト修正
/e2e:run --electron --fix    # Electron E2Eのみ + 修正
```

## Instructions

### 0. 引数の解析

ユーザー入力からオプションを解析:

- `--electron`: scope = `electron`
- `--remoteui`: scope = `remoteui`
- 両方指定 or 指定なし: scope = `all`
- `--fix`: fixMode = true

### 1. ステアリング読み込み（必須）

以下を**必ず全文読み込んで**プロジェクトのE2Eテスト構成を把握する。
テスト実行コマンド、環境変数、プロジェクト選択方法、ヘルパー関数一覧が記載されている。

| ファイル | 読み込み条件 |
|---------|-------------|
| `.kiro/steering/e2e-testing.md` | scope が `electron` または `all` |
| `.kiro/steering/web-e2e-testing.md` | scope が `remoteui` または `all` |

**重要な禁止事項**（過去の繰り返し失敗パターン）:
- **プロジェクト選択の独自実装禁止**: `selectProjectViaStore()` は deprecated。`SDD_PROJECT_PATH` 環境変数を使用（wdio.conf.ts で設定済み）
- **ヘルパー関数のローカル再実装禁止**: `e2e-wdio/helpers/` の既存関数を使うこと
- **テスト実行コマンドの改変禁止**: ステアリングに記載のコマンドをそのまま使用
- **既存Electronプロセスのkill禁止**: 開発用Electronアプリを `kill`/`pkill`/`task electron:stop` 等で停止してはならない。ポート競合時はスキップしてレポートに記載

### 2. テスト実行 (e2e-test-runner エージェント)

`e2e-test-runner` サブエージェントにテスト実行を委譲する。

```
Task tool:
  subagent_type: general-purpose (※ .claude/agents/e2e/test-runner.md のプロンプトに従わせる)
  prompt: |
    あなたは `.claude/agents/e2e/test-runner.md` に定義された E2E Test Runner Agent です。
    このファイルを読み込んで、指示に従ってテストを実行してください。

    パラメータ:
    - scope: {scope}
    - reportDate: {YYYY-MM-DD}

    実行後、以下を返してください:
    1. レポートファイルパス
    2. 失敗したテストファイルのリスト（パスとエラー概要）
    3. 全体サマリー
```

### 3. 結果の確認

エージェントから返された結果を確認:
- レポートファイルが生成されたことを確認
- 失敗テストの一覧を取得

### 4. --fix モード（オプション）

`--fix` が指定されている場合、失敗したテストを解析・修正する。

#### 4.1 修正判定ルール

各失敗テストについて、以下の判定ロジックを適用:

| 条件 | 仕様書の有無 | 判断 | アクション |
|------|-------------|------|-----------|
| 仕様書なし + 原因不明 | なし | 判断困難 | レポートに追記（修正しない） |
| 仕様書なし + 期待値の不一致が明確 | なし | テスト修正 | テストコードを修正 |
| 仕様書あり + テストが間違い | あり | テスト修正 | テストコードを修正 |
| 仕様書あり + 実装が間違い | あり | 実装バグ | 原因調査 + 修正方法をレポートに追記 |

#### 4.2 仕様書の探索

失敗テストに対応する仕様書を検索:

```bash
# テストファイル名からキーワードを抽出
# 例: auto-execution-flow.e2e.spec.ts → "auto-execution"

# 関連仕様書を検索
Glob: .kiro/specs/*/requirements.md
Grep: "auto-execution" in .kiro/specs/*/design.md
```

#### 4.3 失敗テストの解析

各失敗テストについてサブエージェントで修正を実施:

```
Task tool:
  subagent_type: general-purpose
  prompt: |
    以下のE2Eテストが失敗しています。解析して修正してください。

    ## 失敗テスト情報
    - ファイル: {testFilePath}
    - エラー: {errorMessage}
    - フレームワーク: {wdio|playwright}

    ## 仕様書
    {specContent or "仕様書なし"}

    ## 修正ルール
    - 仕様書なし + 原因不明 → 修正せず、分析結果のみ返す
    - 仕様書なし + 期待値の不一致が明確 → テストコードを修正
    - 仕様書あり + テストが間違い → テストコードを修正
    - 仕様書あり + 実装が間違い → 修正せず、原因と修正方法を返す

    ## 参照ドキュメント（必ず全文読み込むこと）
    - `.kiro/steering/e2e-testing.md`（Electron E2E）
    - `.kiro/steering/web-e2e-testing.md`（Remote UI E2E）

    ## 禁止事項
    - selectProjectViaStore() は deprecated。SDD_PROJECT_PATH 環境変数を使用
    - ヘルパー関数のローカル再実装禁止（e2e-wdio/helpers/ の既存関数を使用）
    - UIダイアログやメニューバー経由のプロジェクト選択は不安定であり使用禁止

    ## 出力形式
    以下を返してください:
    1. 判定結果: テスト修正 / 実装バグ報告 / 判断困難
    2. 修正内容（修正した場合）
    3. 分析結果（修正しなかった場合: 原因推測、修正方法の提案）
```

**並列実行**: 独立した失敗テストは並列でサブエージェントに委譲する。
ただし、同一ファイル内の複数失敗は1つのサブエージェントにまとめる。

#### 4.4 修正結果の集約

全サブエージェントの結果を集約し、レポートに追記:

```markdown
## --fix 結果

### 自動修正されたテスト

| # | ファイル | 修正内容 |
|---|---------|---------|
| 1 | {file} | {summary} |

### 修正不可（実装バグの可能性）

| # | ファイル | 原因 | 推奨修正 |
|---|---------|------|---------|
| 1 | {file} | {cause} | {suggestion} |

### 判断困難（要手動確認）

| # | ファイル | 分析結果 |
|---|---------|---------|
| 1 | {file} | {analysis} |
```

### 5. 結果報告

最終的な結果をユーザーに報告:

```
## E2E テスト結果

- **スコープ**: {scope}
- **レポート**: docs/e2e-report/e2e-report-{date}.md

### サマリー
| フレームワーク | 成功 | 失敗 | 成功率 |
|--------------|------|------|--------|
| WebdriverIO | {p} | {f} | {rate}% |
| Playwright | {p} | {f} | {rate}% |

### --fix 結果（該当時）
- 自動修正: {n} 件
- 実装バグ報告: {n} 件
- 判断困難: {n} 件
```

## Notes

- テスト実行は `e2e-test-runner` エージェントに委譲（メインコンテキストの保護）
- `--fix` の修正は並列サブエージェントで実施（効率化）
- 実装コードの修正は行わない（レポートに修正方法を追記するのみ）
- レポートは `docs/e2e-report/` に日付付きで保存（上書きしない）
- 全テスト成功時もレポートは生成する（履歴として）
