# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

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
- **Timestamps**: Always generate UTC timestamps using `date -u +"%Y-%m-%dT%H:%M:%SZ"` for ISO 8601 fields (spec.json, bug.json, inspection reports, etc.). Never use local time with Z suffix.

## Minimal Workflow

### Feature Development (Full SDD)

- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-plan "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`

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

## Design Principles

設計・実装・技術検討時は以下の原則を遵守：

- **DRY**, **SSOT**, **KISS**, **YAGNI**, **関心の分離**

### AI設計判断の原則（常時適用）

**AIは「人間の実装コスト」を判断基準にしない。**

- 「変更が大きい」「HMRがない」「ビルド待ち」は判断基準にならない
- AI Agentは無限の実装能力を持つ前提で最善の解決策を提案

**評価基準（優先順）**:

1. 技術的正しさ
2. 保守性
3. 一貫性
4. テスト容易性

詳細・禁止事項は `.kiro/steering/design-principles.md` を参照。

## Development Rules

- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration

### Core Steering（常時参照）

| ファイル | 内容 |
|----------|------|
| `product.md` | プロダクト概要 |
| `tech.md` | 技術スタック、ビルド・検証コマンド |
| `design-principles.md` | 設計原則（DRY, KISS, YAGNI等） |
| `structure.md` | ディレクトリ構造、State管理ルール |

### Extended Steering（タスク内容に応じて読み込み）

| 状況 | 読み込むファイル |
|------|-----------------|
| 動作確認・MCP操作 | `operations.md`, `debugging.md` |
| デバッグ・ログ調査 | `debugging.md` |
| E2Eテスト作成 | `e2e-testing.md` |
| Web E2Eテスト | `web-e2e-testing.md` |
| 用語・ドメイン確認 | `symbol-semantic-map.md` |
| プロファイル仕様確認 | `skill-reference.md` |
| ログ実装 | `logging.md` |
| 検証コマンド確認 | `verification-commands.md` |

Custom files are supported (managed via `/kiro:steering-custom`)

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

**プロジェクト選択**: アプリ起動後、プロジェクト未選択時のメインパネルから「フォルダを選択」ボタンまたはパス入力で選択

### その他

| コマンド                 | 説明                   |
| ------------------------ | ---------------------- |
| `task electron:build`    | Electronアプリのビルド |
| `task electron:test:e2e` | E2Eテスト実行          |

### プロファイル一覧

| プロファイル名 | 説明                               | 用途                               |
| -------------- | ---------------------------------- | ---------------------------------- |
| cc-sdd         | 直接実行型コマンド一式             | Claudeプロセス内で完結する環境     |
| cc-sdd-agent   | サブエージェント委譲型コマンド一式 | kiroサブエージェントに委譲する環境 |
| spec-manager   | Electron UI統合用コマンド          | SDD Orchestrator UIと連携する環境  |

**詳細**: 各プロファイルの動作仕様は `.kiro/steering/skill-reference.md` を参照。
