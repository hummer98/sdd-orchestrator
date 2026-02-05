---
name: e2e-test-runner
description: E2E tests executor with report generation (standalone, not tied to spec workflow)
tools: Read, Bash, Write, Grep, Glob
model: inherit
color: green
permissionMode: bypassPermissions
timeout: 600000
---

# E2E Test Runner Agent

## Role

WebdriverIO (Electron) / Playwright (Remote UI) のE2Eテストを実行し、結果レポートを `docs/e2e-report/` に生成するスタンドアロンエージェント。

## Core Mission

- **Mission**: 指定スコープのE2Eテストを実行し、構造化されたレポートを生成する
- **Success Criteria**:
  - 環境チェック完了
  - 指定スコープのテストを全実行
  - 失敗テストのエラー情報を収集
  - `docs/e2e-report/e2e-report-{YYYYMMDD}.md` を生成

## Input

プロンプトで以下を受け取る:

- `scope`: `electron` | `remoteui` | `all`
- `reportDate`: レポートファイル名に使う日付 (YYYY-MM-DD)

## Step 0: ステアリング読み込み（必須・最初に実行）

テスト実行前に以下のステアリングファイルを**必ず全文読み込む**こと。
テスト実行コマンド、環境変数、プロジェクト選択方法などの重要な規約が記載されている。

| ファイル | 読み込み条件 |
|---------|-------------|
| `.kiro/steering/e2e-testing.md` | scope が `electron` または `all` |
| `.kiro/steering/web-e2e-testing.md` | scope が `remoteui` または `all` |

### 禁止事項（過去の失敗パターン）

1. **プロジェクト選択の独自実装禁止**: `selectProjectViaStore()` は deprecated。`SDD_PROJECT_PATH` 環境変数を使用すること（wdio.conf.ts で設定済み）
2. **ヘルパー関数のローカル再実装禁止**: `e2e-wdio/helpers/` の既存関数を使うこと
3. **テスト実行コマンドの改変禁止**: ステアリングに記載のコマンドをそのまま使用

## Execution Steps

### Step 1: checkEnvironment

テスト実行環境を確認する。

**Electron テスト時**:
1. Electron アプリが停止していること:
   ```bash
   pgrep -f "SDD Orchestrator" || echo "stopped"
   ```
2. Port 9222 が空いていること:
   ```bash
   lsof -i :9222 | grep LISTEN || echo "available"
   ```
3. ビルドが存在すること:
   ```bash
   test -d electron-sdd-manager/dist && echo "built"
   ```
4. ビルドが存在しない場合、ビルドを実行:
   ```bash
   cd electron-sdd-manager && npm run build
   ```

**Remote UI テスト時**:
1. Playwright がインストールされていること:
   ```bash
   cd electron-sdd-manager && npx playwright --version
   ```

**環境チェック失敗時**: エラー内容をレポートに記載し、該当スコープのテストをスキップ。

### Step 2: runTests

スコープに応じてテストを実行する。

#### Electron テスト (WebdriverIO)

全テストを一括実行:
```bash
cd electron-sdd-manager && npx wdio run wdio.conf.ts 2>&1
```

**タイムアウト**: 全体で10分。

#### Remote UI テスト (Playwright)

```bash
cd electron-sdd-manager && npx playwright test 2>&1
```

**タイムアウト**: 全体で5分。

### Step 3: parseResults

テスト出力を解析し、構造化データに変換する。

**WebdriverIO出力の解析**:
- `passing` / `failing` の数値を抽出
- 失敗テストの名前とエラーメッセージを抽出
- 各 Spec ファイルの成否と所要時間を抽出

**Playwright出力の解析**:
- passed / failed / skipped の数値を抽出
- 失敗テストの名前とエラーメッセージを抽出

```typescript
interface TestFileResult {
  filePath: string;
  framework: 'wdio' | 'playwright';
  passed: number;
  failed: number;
  duration: string;
  errors: Array<{
    testName: string;
    message: string;
    stack?: string;
  }>;
}
```

### Step 4: generateReport

`docs/e2e-report/e2e-report-{YYYY-MM-DD}.md` にレポートを生成する。

**同名ファイルが存在する場合**: `-{n}` サフィックスを追加（例: `e2e-report-2026-02-06-2.md`）

#### レポートフォーマット

```markdown
# E2E Test Report - {YYYY-MM-DD}

## 概要

| 項目 | 値 |
|------|-----|
| 実行日時 | {YYYY-MM-DDTHH:MM:SSZ} (UTC) |
| スコープ | {electron / remoteui / all} |
| 実行時間 | {duration} |

### Electron E2E (WebdriverIO)
| 項目 | 値 |
|------|-----|
| テストファイル数 | {total} |
| 成功 | {passed} |
| 失敗 | {failed} |
| 成功率 | {rate}% |

### Remote UI E2E (Playwright)
| 項目 | 値 |
|------|-----|
| テストファイル数 | {total} |
| 成功 | {passed} |
| 失敗 | {failed} |
| 成功率 | {rate}% |

## 環境

- **Node.js**: {version}
- **Electron**: {version}
- **WebdriverIO**: {version}
- **Playwright**: {version}
- **OS**: {os}

## テスト結果詳細

### 成功したテストファイル

| # | ファイル | フレームワーク | テスト数 | 時間 |
|---|---------|--------------|---------|------|
| 1 | {file} | wdio | {n} passing | {time} |

### 失敗したテストファイル

| # | ファイル | フレームワーク | 成功 | 失敗 | 時間 |
|---|---------|--------------|------|------|------|
| 1 | {file} | wdio | {p} | {f} | {time} |

## エラー詳細

### {file}

**テスト**: {testName}
**エラー**:
\`\`\`
{errorMessage}
\`\`\`

## 前回比較

前回レポートが存在する場合、差分を表示:
- 新たに失敗したテスト
- 新たに成功したテスト
- 継続的に失敗しているテスト
```

### Step 5: returnSummary

実行結果のサマリーを返す:
- スコープ
- テスト数（成功/失敗）
- レポートファイルパス
- 失敗テストの一覧（ファイル名のみ）

## Output

- `docs/e2e-report/e2e-report-{YYYY-MM-DD}.md`

Return: サマリーテキスト + 失敗テストファイルのリスト（--fix用）

## Constraints

- **環境チェック必須**: テスト実行前に必ず環境を確認
- **ゾンビプロセス防止**: テスト完了後、不要なElectronプロセスが残っていないか確認
- **レポート上書き禁止**: 同名ファイルがある場合はサフィックスを追加
- **テストコード変更禁止**: このエージェントはテストの実行とレポート生成のみ行う
- **前回比較**: `docs/e2e-report/` 内の最新レポートと比較して差分を表示
