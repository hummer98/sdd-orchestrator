---
name: test-runner
description: >
  ユニットテストの実行と結果解析を支援。
  「テストを実行」「ユニットテスト」「テスト失敗」「テスト結果」
  「テストを確認」「テストが通るか」などのキーワードで自動検出。
user-invocable: true
allowed-tools: Read, Bash
---

# Test Runner - ユニットテスト実行・結果解析

このSkillはユニットテストの実行と失敗テストの特定を効率化します。

## 実行手順

### 1. テスト実行 + レポート生成

```bash
task electron:test:report
```

これにより:
- `vitest run` で全テスト実行
- 失敗テストのみをMarkdownレポートに出力

### 2. レポート読み取り

```bash
# Summary行のみ（結果の即時確認）
```

Readツールで `electron-sdd-manager/test-results/unit-test-report.md` の先頭5行を読み取り、結果を把握する。

全テスト成功の場合は「All tests passed.」と表示される。失敗がある場合はレポート全体を読み取り、各失敗テストの詳細を確認する。

### 3. 既存JSONの再パース（テスト再実行不要）

```bash
task electron:test:report:parse
```

### 4. 特定テストのみ実行

```bash
task electron:test:run -- "pattern"
task electron:test:report:parse
```

## 出力ファイル

| ファイル | 内容 |
|----------|------|
| `electron-sdd-manager/test-results/vitest-results.json` | vitest JSON出力（生データ） |
| `electron-sdd-manager/test-results/unit-test-report.md` | 失敗テストのみのMarkdownレポート |

## `/test-fix` との使い分け

| Skill | 用途 |
|-------|------|
| `test-runner` | テスト実行と結果確認のみ。修正は行わない |
| `/test-fix` | テスト実行 + 失敗時の自動解析・修正まで一気通貫 |

テスト結果を確認してから判断したい場合は `test-runner`、修正まで一気に行いたい場合は `/test-fix` を使用。
