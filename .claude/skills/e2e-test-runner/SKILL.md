---
name: e2e-test-runner
description: >
  E2Eテストの実行と結果解析を支援。
  「E2Eテストを実行」「E2Eを通して」「electron-e2eが通るように」
  「E2E失敗」「E2E結果」「E2Eを確認」などのキーワードで自動検出。
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep, Edit, Write
---

# E2E Test Runner - E2Eテスト実行・結果解析

E2Eテスト（WebdriverIO / Playwright）の実行と失敗テストの特定を効率化するSkill。

## 実行手順

### 1. テスト実行 + レポート生成

```bash
# フルビルド + 全テスト実行 + レポート生成
task electron:test:e2e:report

# ビルドスキップ（前回ビルド済みの場合）
task electron:test:e2e:report:nobuild

# 特定specのみ
task electron:test:e2e:report -- --spec "e2e-wdio/app-launch*"
```

タイムアウトは10分（600000ms）に設定すること。

### 2. レポート読み取り

```bash
ls -t docs/e2e-report/e2e-report-*.md | head -1
```

Readツールで最新レポートを読み取り、結果を把握する。

- 全テスト成功: Pass Rate 100%
- 失敗あり: Failed Specsセクションに失敗ファイル一覧、Failure Detailsにエラー詳細

### 3. 失敗テストの修正

失敗テストがある場合:

1. レポートのFailed Specsからファイルを特定
2. Failure Detailsからエラー内容を把握
3. テストファイルと対応するソースコードを読み込み
4. 修正を実施
5. 修正後、再度 `task electron:test:e2e:report:nobuild` で検証

### 4. 特定テストのみ再実行（修正確認用）

```bash
# ビルドスキップ + 特定spec
task electron:test:e2e:report -- --no-build --spec "e2e-wdio/bug-workflow*"
```

## 出力ファイル

| ファイル | 内容 |
|----------|------|
| `docs/e2e-report/e2e-report-YYYY-MM-DD.md` | テスト結果Markdownレポート |

## 関連Skill・コマンドとの使い分け

| Skill/Command | 用途 |
|---------------|------|
| `e2e-test-runner` (このSkill) | E2Eテスト実行と結果確認。修正も行う |
| `e2e-test-writer` | 新規E2Eテストの記述支援 |
| `/e2e:run` | サブエージェント委譲型の包括的E2E実行+修正 |
| `/e2e:report` | シンプルなE2E実行+結果表示（このSkillと同等） |

## テスト失敗の調査・修正方針

**あてずっぽうの修正は禁止。** 必ず以下の手順で原因を特定してから修正すること。

### 1. ログで事実を確認する

- **Main processログ**: chromedriver出力に `[INFO]` `[main]` で記録される（テスト出力に直接表示）
- **Rendererログ**: `E2E_VERBOSE_LOGS=true` で実行し、`[Renderer Console]` プレフィックスの出力を確認
  - Rendererの `console.info/warn/error` はMain processの `webContents.on('console-message')` 経由で `main-e2e.log` に記録される
  - wdio.conf.ts の `afterTest` / `after` hookが差分を抽出して表示
- **テスト内デバッグ**: `waitForCondition` のiteration 4毎のログ出力、`browser.execute` でストア状態ダンプ

### 2. 情報が不足している場合はログを追加する

修正の前にまずロギングを追加してビルド・テスト実行し、何が起きているかを正確に把握する。

- **Rendererにログ追加**: `console.info(\`[コンポーネント名] メッセージ key=${value}\`)` 形式（`[object Object]`回避のためテンプレートリテラルを使う）
- **Main processにログ追加**: `logger.info('[モジュール名] メッセージ', { key: value })` 形式
- `npm run build` → テスト実行 → ログ確認 のサイクルで事実を積み上げる

### 3. 原因を特定してから修正する

- ログから時系列を再構成し、「何が・いつ・どの順序で起きたか」を把握
- 仮説を立て、その仮説がログと矛盾しないか検証
- 原因が特定できてから初めてコード修正に着手

### 4. 修正後の検証

- 修正前と同じログポイントで修正が効いていることを確認
- 関連テスト（同じ機能に依存するテスト群）も実行して回帰がないことを確認

## 注意事項

- E2Eテスト実行前に必ずビルドが必要（`--no-build` 指定時を除く）
- テスト修正時は `.kiro/steering/e2e-testing.md` のガイドラインに従う
- `selectProjectViaStore()` は deprecated - `SDD_PROJECT_PATH` 環境変数を使用
- `selectSpecViaStore()` は非推奨 - `selectSpecViaUI()` を使用
