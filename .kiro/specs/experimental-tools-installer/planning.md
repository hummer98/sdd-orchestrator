# 仕様検討記録

## 基本情報
- **作成日**: 2025-12-20
- **機能名**: experimental-tools-installer

## 初期要求
experimentalなslashcommandsを追加インストールするツールメニューをいくつか追加したい。いずれも electron-sdd-manager/resources/templates にこのプロジェクトで使用中のファイルからバンドルする想定。

- kiro:spec-init, spec-manager:init の前段階のプランニング用slashcommands導入
- debug専用サブエージェント導入
- commitコマンド導入

## 質疑応答

### Q1. 機能の位置づけについて
**質問**:
- 1-1. このツールメニューはElectronアプリのどこに配置しますか？
- 1-2. 「experimental」という扱いにする意図は何ですか？

**回答**:
- 1-1: メニューバーの「ツール」メニュー
- 1-2: 表記に「(実験的)」と書いておいてサポート外としたい

### Q2. インストール動作について
**質問**:
- 2-1. 「インストール」とは具体的にどのような動作を指しますか？
- 2-2. インストール先のパスはユーザーが選択できるべきですか？

**回答**:
- 2-1: ユーザーが管理するプロジェクトの `.claude/commands/` や `.claude/agents/` にファイルをコピー
- 2-2: 現在開いているプロジェクトに固定

### Q3. セマンティックマージについて
**質問**:
- 3-1. CLAUDE.mdへの「セマンティックマージ」とは、既存のCLAUDE.mdに追記する形ですか？
- 3-2. CLAUDE.mdが存在しない場合はどうしますか？

**回答**:
- 3-1: Claude Codeにプロンプトとして投げてマージさせる
- 3-2: Claude Codeに任せる

### Q4. steering-debug コマンドについて
**質問**:
- 4-1. このコマンドは `.kiro/steering/debugging.md` を生成するためのものですか？
- 4-2. 生成する内容はテンプレート固定ですか？それとも動的に生成しますか？

**回答**:
- 4-1: はい
- 4-2: プロジェクトの情報を収集してデバッグエージェントに必要な、起動方法、MCP、E2Eのコマンドラインツール、ログの参照方法、トラブルシューティングのノウハウ等が集約されている事を期待

**名前の決定**: `/kiro:steering-debug` を採用（既存の `kiro:steering` と一貫性がある）

### Q5. UIについて
**質問**:
- 5-1. 各コマンドは個別にインストール/アンインストールできるべきですか？
- 5-2. インストール前にプレビューを表示しますか？
- 5-3. 既存ファイルがある場合の挙動は？

**回答**:
- 5-1: 個別に。アンインストール機能は不要。上書きの場合警告表示。
- 5-2: 不要
- 5-3: 警告ダイアログを表示

### Q6. Debugエージェントのインストールフローについて
**質問**:
- 6-1. CLAUDE.mdへのセマンティックマージは、インストール時にClaude Code APIを呼び出して実行しますか？
- 6-2. マージ対象のCLAUDE.md内容は固定テンプレートですか？

**回答**:
- 6-1: Claude Code CLIを `claude` コマンドで呼び出す
- 6-2: テンプレートとして保持しておいてセマンティックマージ用のプロンプトに埋める

### Q7. steering-debugコマンドの実装場所について
**質問**:
- 7-1. このコマンドはどこに実装しますか？
- 7-2. 情報収集のロジックはどの程度自動化しますか？

**回答**:
- 7-1: このsdd-orchestratorプロジェクトの `.claude/commands/` に追加
- 7-2: A+C（一旦収集してみて疑問点を聞く）

### Q8. テンプレートのバンドル方法について
**質問**:
- 8-1. `electron-sdd-manager/resources/templates/` に配置するファイル構成は以下で合っていますか？

```
resources/templates/
├── commands/
│   ├── plan.md
│   └── commit.md
├── agents/
│   └── debug.md
└── claude-md-snippets/
    └── debug-section.md
```

**回答**:
- 8-1: はい

## 調査・検討結果
- 既存の「ツール」メニュー構造を活用して機能追加する方針
- Claude CLI経由でのセマンティックマージにより、CLAUDE.mdの構造を保ちながら内容を追加
- `/kiro:steering-debug` は既存の `/kiro:steering` パターンに従う

## 決定事項

### 追加するメニュー項目（3つ）
| メニュー名 | 動作 |
|-----------|------|
| Planコマンドをインストール (実験的) | `.claude/commands/plan.md` をコピー |
| Debugエージェントをインストール (実験的) | `.claude/agents/debug.md` をコピー + Claude CLI経由でCLAUDE.mdにセマンティックマージ |
| Commitコマンドをインストール (実験的) | `.claude/commands/commit.md` をコピー |

### 新規コマンド
- `/kiro:steering-debug` - プロジェクト情報を収集して `.kiro/steering/debugging.md` を生成

### バンドルするテンプレート構成
```
electron-sdd-manager/resources/templates/
├── commands/
│   ├── plan.md
│   └── commit.md
├── agents/
│   └── debug.md
└── claude-md-snippets/
    └── debug-section.md
```

## 備考
- アンインストール機能は不要
- プレビュー機能は不要
- インストール先は現在開いているプロジェクトに固定
- メニュー項目には「(実験的)」を表記してサポート外であることを明示
