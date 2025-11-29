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

| コマンド | 説明 |
|---------|------|
| `/kiro:bug-create <name> "description"` | バグレポート作成 |
| `/kiro:bug-analyze [name]` | 根本原因の調査 |
| `/kiro:bug-fix [name]` | 修正の実装 |
| `/kiro:bug-verify [name]` | 修正の検証 |
| `/kiro:bug-status [name]` | 進捗確認 |

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

| コマンド | 説明 |
|---------|------|
| `task electron:dev` | フォアグラウンドで起動（インタラクティブ） |
| `task electron:start` | バックグラウンドで起動 |
| `task electron:stop` | 停止 |
| `task electron:restart` | 再起動 |
| `task electron:status` | 状態確認 |
| `task electron:logs` | ログ表示（tail -f） |

### テスト時のプロジェクト指定

E2Eテストや動作確認時は、以下のディレクトリを起動時引数で指定する：

```bash
# 起動時にプロジェクトパスを指定（推奨）
task electron:start PROJECT=/Users/yamamoto/git/sdd-manager

# フォアグラウンドで起動する場合
task electron:dev PROJECT=/Users/yamamoto/git/sdd-manager

# または npm run dev で直接指定
cd electron-sdd-manager && npm run dev -- /Users/yamamoto/git/sdd-manager
```

これにより、アプリ起動時に自動的にプロジェクトが選択された状態になる。

### ログ表示

| コマンド | 説明 |
|---------|------|
| `task logs:agent` | Agent出力を人間が読みやすい形式で表示（最新50件） |
| `task logs:agent:verbose` | Agent出力を詳細表示（ツール入力含む） |
| `task logs:agent:all` | 全てのAgent出力を表示 |
| `task logs:main` | メインプロセスログを表示 |

オプション: `-n 100`（行数指定）、`-v`（詳細）、`-a`（全て）

### その他

| コマンド | 説明 |
|---------|------|
| `task electron:build` | Electronアプリのビルド |
| `task electron:test:e2e` | E2Eテスト実行 |

## Troubleshooting

### ELECTRON_RUN_AS_NODE問題

**症状**: Electronアプリ起動時に`TypeError: Cannot read properties of undefined (reading 'whenReady')`エラーが発生

**原因**: Claude CodeなどのElectronベースIDEから実行すると、`ELECTRON_RUN_AS_NODE`環境変数が設定され、ElectronがNode.jsモードで動作してしまう。この状態では`require("electron")`がAPIオブジェクトではなくパス文字列を返す。

**解決策**: `scripts/electron-app.sh`で`unset ELECTRON_RUN_AS_NODE`を実行してから起動する（既に対応済み）。

**参考**: [GitHub Issue #8200](https://github.com/electron/electron/issues/8200), [Stack Overflow](https://stackoverflow.com/questions/45274548/node-js-require-returns-a-string-instead-of-module-object)
