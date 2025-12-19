# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Language

必ず日本語で応答してください

## Project Context

### Paths

- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`
- Bugs: `.kiro/bugs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications

- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines

- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow

### Feature Development (Full SDD)

- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

### Bug Fix (Lightweight Workflow)

小規模なバグ修正にはフルSDDプロセスは不要。以下の軽量ワークフローを使用：

```
Report → Analyze → Fix → Verify
```

| コマンド                                | 説明             |
| --------------------------------------- | ---------------- |
| `/kiro:bug-create <name> "description"` | バグレポート作成 |
| `/kiro:bug-analyze [name]`              | 根本原因の調査   |
| `/kiro:bug-fix [name]`                  | 修正の実装       |
| `/kiro:bug-verify [name]`               | 修正の検証       |
| `/kiro:bug-status [name]`               | 進捗確認         |

**使い分け**:

- **小規模バグ**: Bug Fixワークフロー（軽量・高速）
- **設計変更を伴う複雑なバグ**: Full SDDワークフロー

## Development Rules

- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration

- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

## Development Commands

### Electronアプリ制御（多重起動防止機能付き）

Electronアプリの操作には`task`コマンドを使用する。

| コマンド                | 説明                                       |
| ----------------------- | ------------------------------------------ |
| `task electron:dev`     | フォアグラウンドで起動（インタラクティブ） |
| `task electron:start`   | バックグラウンドで起動                     |
| `task electron:stop`    | 停止                                       |
| `task electron:restart` | 再起動                                     |
| `task electron:status`  | 状態確認                                   |
| `task electron:logs`    | ログ表示（tail -f）                        |

### その他

| コマンド                 | 説明                   |
| ------------------------ | ---------------------- |
| `task electron:build`    | Electronアプリのビルド |
| `task electron:test:e2e` | E2Eテスト実行          |

## Experimental Tools (実験的ツール)

SDD Orchestratorでは、実験的なslash commands/agentsをメニューからプロジェクトにインストールできます。

### インストール方法

SDD Orchestratorの「ツール」メニュー → 「実験的ツール」から選択。

| メニュー項目 | インストール先 | 用途 |
|-------------|--------------|------|
| Planコマンドをインストール (実験的) | `.claude/commands/plan.md` | 実装前のプランニング・設計 |
| Debugエージェントをインストール (実験的) | `.claude/agents/debug.md` | デバッグ・トラブルシューティング |
| Commitコマンドをインストール (実験的) | `.claude/commands/commit.md` | 構造化されたコミットメッセージ生成 |

### 各ツールの概要

#### Planコマンド (`/plan`)

実装前に機能の計画・設計を行うためのコマンド。以下を含む構造化された計画を生成：
- 要件の明確化
- 技術的アプローチ
- 実装タスクの分解
- リスクと対策
- 成功基準

**使い方**: `/plan [機能の説明]`

#### Debugエージェント

問題の診断と解決に特化したサブエージェント。体系的なトラブルシューティングを実行：
- ログ分析
- コード追跡
- 環境診断
- テストデバッグ

**起動方法**: `@debug` または Claude Code のAgent選択メニューから

#### Commitコマンド (`/commit`)

Conventional Commits形式に従った構造化されたコミットメッセージを生成：
- 変更内容の分析
- type/scopeの提案
- メッセージの自動生成

**使い方**: `/commit`

### steering-debugコマンド

`/kiro:steering-debug` はプロジェクト情報を収集し、Debugエージェントに必要な `.kiro/steering/debugging.md` を自動生成するコマンド。

**収集する情報**:
- 起動方法（package.json scripts, Taskfile.yml等）
- MCP設定
- E2Eコマンドラインツール
- ログ参照方法
- トラブルシューティングノウハウ

**使い方**: `/kiro:steering-debug`

不明点がある場合はユーザーに質問し、情報を補完します。

## Debugging

デバッグ・動作確認には専用の `debug` agent を使用。

### 自動起動トリガー

以下の状況では `debug` agent の使用を検討：

| トリガー | 用途 |
|----------|------|
| `task electron:*` 実行後にエラー発生 | 環境問題の診断 |
| MCP electronツール使用時 | UI操作・ログ取得の詳細手順 |
| E2Eテスト失敗時 | テスト失敗の原因調査 |
| 「ログを確認」「デバッグ」等のユーザー指示 | 各種デバッグ作業 |
| Electronアプリが期待通り動作しない | 動作確認・トラブルシューティング |

### MCP Electron操作の制限事項

- **メニュー操作不可**: MCP electronツールではネイティブメニュー（ファイル、編集、表示等）を操作できない
- **代替手段**: メニュー経由の機能テストにはIPCを直接呼び出す
  ```javascript
  // 例: レイアウトリセット
  window.electronAPI.resetLayoutConfig()
  // 例: レイアウト読み込み
  window.electronAPI.loadLayoutConfig()
  ```

### 詳細情報

デバッグの詳細手順は `.kiro/steering/debugging.md` を参照。
Agent定義は `.claude/agents/debug.md` にある。
