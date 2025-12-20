---
description: Generate/update E2E testing steering document from test files
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Kiro E2E Testing Steering

E2Eテストファイルを解析し、`.kiro/steering/e2e-testing.md` を生成または更新します。

## Mode Detection

1. `.kiro/steering/e2e-testing.md` の存在を確認
   - **Create Mode**: ファイルが存在しない → 新規作成
   - **Update Mode**: ファイルが存在する → 差分更新

## Analysis Steps

### 1. E2Eテスト構成の収集

以下のファイルを解析:

```
Glob: electron-sdd-manager/e2e-wdio/**/*.spec.ts
Glob: electron-sdd-manager/wdio.conf.ts
```

### 2. 各テストファイルの詳細解析

各 `.spec.ts` ファイルについて:
- `describe()` ブロックの構造
- `it()` テストケースの一覧
- Requirements Coverage（コメントから抽出）
- 使用している `data-testid` セレクタ

### 3. 共通パターンの抽出

- `browser.electron.execute()` の使用パターン
- `$('[data-testid="..."]')` セレクタの一覧
- セキュリティ/安定性アサーションのパターン

### 4. カバレッジ統計の計算

- E2Eテストファイル数
- テストケース総数（`it()` の数）
- ユニットテストファイル数（比較用）
- `data-testid` 付きコンポーネント数

## Output Format

`.kiro/steering/e2e-testing.md` の構成:

```markdown
# E2Eテスト標準

## フレームワークアーキテクチャ
- 技術スタック（WebdriverIO, wdio-electron-service, Mocha, Electron）
- WebdriverIO採用理由
- アーキテクチャ概要

## テスト設定
- wdio.conf.ts の主要設定
- 実行コマンド

## テストファイル一覧
- ファイル名、目的、テスト数の表

## テストファイル詳細
- 各ファイルの目的
- テストスイート一覧
- 要件カバレッジ

## 共通テストパターン
- 要素選択
- Electron APIアクセス
- 条件付きテスト

## セキュリティ/安定性アサーション

## 既知の制限事項

## テストデータセレクタリファレンス

## カバレッジ評価
- 現状の統計
- 十分にカバーされている領域
- 改善が必要な領域
- 推奨改善アクション
```

## Update Mode Logic

既存ファイルがある場合:

1. 現在のテストファイルを再解析
2. 以下のセクションを更新:
   - テストファイル一覧（テスト数の更新）
   - テストファイル詳細（新規/削除されたテストを反映）
   - テストデータセレクタリファレンス（新規data-testidを追加）
   - カバレッジ評価（統計の更新）
3. 更新日を現在の日付に変更

## Execution

```bash
# テストファイルの一覧取得
Glob: electron-sdd-manager/e2e-wdio/**/*.spec.ts

# 各テストファイルを読み込み
Read: 各specファイル

# wdio.conf.ts の設定確認
Read: electron-sdd-manager/wdio.conf.ts

# data-testid の使用箇所を検索
Grep: data-testid in electron-sdd-manager/src/renderer/components

# ユニットテストファイル数のカウント
Bash: find electron-sdd-manager/src -name "*.test.ts" -o -name "*.test.tsx" | wc -l

# コンポーネント数のカウント
Bash: ls electron-sdd-manager/src/renderer/components/*.tsx | grep -v test | wc -l
```

## Notes

- 日本語で出力
- テストケースの詳細は `it()` の説明文から抽出
- 要件カバレッジは `Requirements:` コメントから抽出
- 更新日は常に現在の日付を使用
- プログレスバー形式でカバレッジを視覚化
