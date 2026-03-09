---
description: E2Eテストを実行して結果サマリーを取得
allowed-tools: Bash, Read, Glob, Grep
---

# E2E Report

E2Eテストを実行し、pass/fail結果のサマリーを取得します。
`/e2e:run` と異なり、サブエージェント委譲やfix機能は含まず、
シンプルにテスト実行+結果表示に特化しています。

## Usage

```
/e2e:report [options]
```

### Options

- `--no-build`: ビルドスキップ（前回のビルドを再利用）
- `--spec <pattern>`: 特定のspecファイルのみ実行

### Examples

```
/e2e:report                           # フルビルド+全テスト
/e2e:report --no-build                # ビルドスキップ
/e2e:report --spec app-launch*        # 特定specのみ
```

## Instructions

### 1. テスト実行

以下のコマンドでE2Eテストを実行し、結果を取得する。

```bash
# 引数をそのまま渡す
task electron:test:e2e:report -- $ARGUMENTS
```

タイムアウトは10分（600000ms）に設定する。

### 2. レポート確認

テスト完了後、生成されたレポートを読み込んで結果を表示する。

```bash
# 最新レポートを読み込み
ls -t docs/e2e-report/e2e-report-*.md | head -1
```

Readツールで最新レポートを読み込み、内容をユーザーに表示する。

### 3. 結果表示

以下の形式で結果をユーザーに報告する:

```
## E2E テスト結果

| Metric | Value |
|--------|-------|
| Passed | N |
| Failed | M |
| Total  | N+M |
| Pass Rate | X% |

### Failed Specs (該当時)
- spec-file-1.e2e.spec.ts
- spec-file-2.e2e.spec.ts

レポート: docs/e2e-report/e2e-report-YYYY-MM-DD.md
```
