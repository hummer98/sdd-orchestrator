# Claude Code Skills 移行検討ガイド

## 概要

現在の cc-sdd-agent プリセット（Slash Commands + Subagents）を Claude Code Skills に移行する可能性について検討。

**最終更新**: 2026-01-18
**参照ドキュメント**: [Claude Code Skills公式ドキュメント](https://code.claude.com/docs/en/skills)

---

## Claude Code Skills とは

Claude Code Skills は、Claudeにタスク固有の知識を教える拡張機能。

### 基本概念

| 項目 | 説明 |
|------|------|
| **定義** | Markdownファイル（SKILL.md）+ 関連リソースを含むディレクトリ |
| **起動方法** | Claude が自然言語から自動検出（Model-invoked） |
| **設計思想** | 「知識を提供する」コンポーネント |
| **トークン効率** | 起動時は名前と説明のみロード（Progressive Disclosure） |

### SKILL.md の構造

```yaml
---
name: my-skill-name            # 必須: kebab-case, 最大64文字
description: Brief description  # 必須: いつ使うか, 最大1024文字
allowed-tools: Read, Grep       # オプション: 許可ツール
model: claude-sonnet-4          # オプション: 使用モデル
context: fork                   # オプション: 独立コンテキスト
user-invocable: true            # オプション: /skill-name で呼び出し可
---

# Skill Content

Instructions and guidance...
```

### ディレクトリ構造例

```
my-skill/
├── SKILL.md              # 必須: 500行以下推奨
├── reference.md          # 詳細ドキュメント
├── examples.md           # 使用例
└── scripts/
    └── helper.py         # 実行可能スクリプト
```

### Skills vs Slash Commands vs Subagents

| 項目 | Skills | Slash Commands | Subagents |
|------|--------|----------------|-----------|
| **起動方法** | 自動検出 | ユーザーが `/cmd` と入力 | Task tool から呼び出し |
| **引数** | `$ARGUMENTS` のみ | `$1`, `$2`, `$ARGUMENTS` | prompt パラメータ |
| **Task tool 呼び出し** | ❌ 不可 | ✅ 可能 | ✅ 可能 |
| **ユースケース** | 知識提供、自動ガイド | ワークフロー実行 | 独立した複雑タスク |
| **コンテキスト** | メイン会話に注入 | メイン会話 | 独立（fork可） |

---

## 現状のアーキテクチャ

### cc-sdd-agent の構造

```
.claude/
├── commands/kiro/              # Slash Commands（ユーザー起動）
│   ├── spec-requirements.md    # → Task tool → subagent委譲
│   ├── spec-design.md
│   ├── spec-tasks.md
│   └── spec-impl.md
└── agents/kiro/                # Subagents（Task toolで呼び出し）
    ├── spec-requirements.md
    ├── spec-design.md
    ├── spec-tasks.md
    └── spec-impl.md
```

### コマンドとサブエージェントの関係

| Slash Command | Subagent | 役割 |
|---------------|----------|------|
| `/kiro:spec-requirements` | `spec-requirements-agent` | EARS形式の要件生成 |
| `/kiro:spec-design` | `spec-design-agent` | 技術設計文書生成 |
| `/kiro:spec-tasks` | `spec-tasks-agent` | 実装タスク生成 |
| `/kiro:spec-impl` | `spec-tdd-impl-agent` | TDD実装 |

### 現在の実行フロー

```
User → /kiro:spec-design feature-name
           ↓
Slash Command (spec-design.md)
  - allowed-tools: Read, Task
  - 引数パース ($1, $2)
  - バリデーション
           ↓
Task tool 呼び出し
  - subagent_type: "spec-design-agent"
  - prompt: コンテキスト情報
           ↓
Subagent 実行
  - 独自ツールセット
  - bypassPermissions
  - 自律的に完了
```

---

## Skill化の技術的制約

### 制約1: SkillからTask toolを呼び出せない

**問題**: Skillは `allowed-tools` でツール制限はできるが、**Skill内からTask toolを呼び出すことはできない**。

```yaml
# これは不可能
---
name: sdd-workflow
description: SDD workflow management
allowed-tools: Task  # ← 許可できるが、Skill内から呼び出せない
---
```

**理由**: Skillは「知識を提供する」コンポーネントであり、Tool呼び出しの実行主体ではない。

### 制約2: 引数サポートの制限

**問題**: Skillは `$ARGUMENTS` のみサポート。`$1`, `$2` などの位置引数は**使用不可**。

| 機能 | Slash Commands | Skills |
|------|:--------------:|:------:|
| `$ARGUMENTS` | ✅ | ✅ |
| `$1`, `$2`, `$3` | ✅ | ❌ |
| `argument-hint` | ✅ | ❌ |

**影響**: `/kiro:spec-design feature-name -y` のようなコマンドは、Skillでは再現困難。

### 制約3: サブエージェント内でのSkill自動検出

**問題**: Task toolで生成されたサブエージェント内では、**Skillは自動検出されない**。

```yaml
# .claude/agents/my-agent.md
---
name: my-agent
skills: sdd-requirements, sdd-design  # 明示的指定が必須
---
```

**影響**: 現在のSubagentベースのアーキテクチャでは、Skillを使用する場合、各Subagentに明示的にSkillを指定する必要がある。

### 制約4: Skill間の連携不可

**問題**: SkillからSkillを直接呼び出すことはできない。

```
Skill A → Skill B  # 不可能
```

**影響**: SDDワークフロー（requirements → design → tasks → impl）のような連続フェーズを1つのSkillで表現できない。

### 制約5: コンテキスト圧迫

**問題**: 多数のSkillを定義すると、起動時にすべての説明がロードされ、コンテキストを圧迫する。

| Skill数 | 起動時コスト | 影響 |
|---------|--------------|------|
| 1-5個 | 数百トークン | 無視可能 |
| 6-15個 | 数千トークン | 軽微 |
| 16+個 | 10K+トークン | **要注意** |

**影響**: 現在27個のSlash Commandsがある。Skill化するとコンテキスト圧迫の懸念。

---

## Skill化パターンの検討

### パターンA: 完全Skill化（不可能）

```
Skills のみで SDD ワークフローを実装
```

**判定**: ❌ **不可能**

- Task tool呼び出し不可
- 引数パース制限
- フェーズ間連携不可

### パターンB: ハイブリッド（Slash Command + Skill知識）

```
Slash Commands: ユーザー起動、引数パース、Task tool呼び出し
Skills: 知識提供（ガイドライン、ルール、テンプレート）
Subagents: 実際の処理実行
```

**判定**: ⚠️ **限定的に可能**

**実装イメージ**:
```
.claude/
├── commands/kiro/
│   └── spec-design.md         # Task tool呼び出し（変更なし）
├── skills/
│   └── sdd-knowledge/
│       ├── SKILL.md           # SDD知識の自動提供
│       ├── EARS-FORMAT.md
│       └── DESIGN-PRINCIPLES.md
└── agents/kiro/
    └── spec-design.md         # skills: sdd-knowledge を指定
```

**メリット**:
- 知識をSkillとして自動提供
- 既存アーキテクチャを維持

**デメリット**:
- Subagentへの明示的Skill指定が必要
- コンテキスト効率の改善は限定的

### パターンC: Model-invoked自動実行（部分適用）

```
特定の状況でClaudeが自動的にSkillを検出・使用
```

**判定**: ⚠️ **限定的に可能**

**適用可能なユースケース**:
- ユーザーが「要件を作成して」と言った → `sdd-requirements` Skillが自動検出
- 明示的な `/kiro:spec-requirements` は不要に

**課題**:
- 自動検出の信頼性が不安定
- 複雑なワークフロー（引数付き、フェーズ指定）には不向き

---

## 実装アイデア

### アイデア1: 知識層のSkill化

**概要**: ルールやテンプレートをSkillとして提供し、Subagentが自動的に参照。

```yaml
# .claude/skills/sdd-knowledge/SKILL.md
---
name: sdd-knowledge
description: >
  SDD (Spec-Driven Development) の知識ベース。
  要件定義、設計、タスク生成時に自動参照される。
user-invocable: false  # ユーザーは直接呼び出さない
---

# SDD Knowledge Base

## EARS Format
[EARS-FORMAT.md](EARS-FORMAT.md)

## Design Principles
[DESIGN-PRINCIPLES.md](DESIGN-PRINCIPLES.md)

## Templates
- Requirements: [requirements-template.md](requirements-template.md)
- Design: [design-template.md](design-template.md)
```

**Subagentでの使用**:
```yaml
# .claude/agents/kiro/spec-design.md
---
name: spec-design-agent
skills: sdd-knowledge  # Skill を継承
---
```

**評価**:
- メリット: 知識の一元管理、Progressive Disclosure
- デメリット: 現在の `.kiro/settings/` からの移行コスト

### アイデア2: Quick Start Skill

**概要**: 初心者向けにSDDワークフロー全体をガイドするSkill。

```yaml
# .claude/skills/sdd-quickstart/SKILL.md
---
name: sdd-quickstart
description: >
  SDDワークフローのクイックスタートガイド。
  「新しい機能を作りたい」「SDDで開発を始めたい」という時に自動検出。
---

# SDD Quick Start

## ワークフロー概要

1. **初期化**: `/kiro:spec-init feature-name "説明"`
2. **要件定義**: `/kiro:spec-requirements feature-name`
3. **設計**: `/kiro:spec-design feature-name`
4. **タスク生成**: `/kiro:spec-tasks feature-name`
5. **実装**: `/kiro:spec-impl feature-name`

## 詳細ガイド
...
```

**評価**:
- メリット: ユーザーが「SDDを始めたい」と言った時に自動ガイド
- デメリット: 実際の実行はSlash Commandsが必要

### アイデア3: Validation Skill

**概要**: バリデーション系コマンドをSkill化。

```yaml
# .claude/skills/sdd-validation/SKILL.md
---
name: sdd-validation
description: >
  仕様書の品質検証。ギャップ分析、設計レビュー、実装検証。
  「設計をレビューして」「実装が正しいか確認して」という時に自動検出。
allowed-tools: Read, Grep, Glob
---
```

**評価**:
- メリット: バリデーションは引数が単純（feature-name のみ）
- デメリット: Task tool委譲が必要な場合は不可

---

## 結論と推奨

### 結論: 完全Skill化は不可能、部分適用は検討価値あり

| 評価項目 | 完全Skill化 | ハイブリッド | 現状維持 |
|---------|:-----------:|:------------:|:--------:|
| 技術的実現性 | ❌ | ⚠️ | ✅ |
| コンテキスト効率 | - | △ 改善限定 | ○ |
| 開発コスト | - | 中 | なし |
| ユーザー体験 | - | △ 変化なし | ○ |
| 保守性 | - | △ 複雑化 | ○ |

### 推奨アプローチ

**現状維持を推奨**。理由:

1. **技術的制約が大きい**: Skillの設計思想（知識提供）とSDDワークフロー（タスク実行）が合わない
2. **コスト対効果が低い**: 移行コストに見合うメリットがない
3. **現在のアーキテクチャが適切**: Slash Commands + Subagents の組み合わせがSDDワークフローに適している

### 将来的に検討すべきケース

- Claude Code Skillの機能拡張（Task tool呼び出し対応など）
- 知識層の分離ニーズが高まった場合
- 新規ユーザー向けの自動ガイド機能が必要な場合

---

---

## 全Slash Commandsの Skill化適性評価

### 評価基準

| 基準 | Skill向き | Slash Command向き |
|------|-----------|-------------------|
| 起動トリガー | 文脈から自動検出 | 明示的なコマンド実行 |
| 引数 | 不要 or `$ARGUMENTS`のみ | `$1`, `$2` など位置引数が必要 |
| Task tool | 不要 | サブエージェント委譲が必要 |
| 知識提供 | 主目的 | 副次的 |
| ワークフロー制御 | 不向き | 主目的 |

---

### カテゴリ別評価

#### 1. ワークフロー実行系（Slash Command維持）

**判定: ❌ Skill化不可**

| コマンド | 理由 |
|----------|------|
| `spec-requirements` | Task tool委譲、`$1`引数必須 |
| `spec-design` | Task tool委譲、`$1 $2`引数必須 |
| `spec-tasks` | Task tool委譲、`$1 $2`引数必須 |
| `spec-impl` | Task tool委譲、`$1 $2`引数必須 |
| `steering` | Task tool委譲 |
| `steering-custom` | Task tool委譲 |
| `spec-quick` | 複数SlashCommand連続実行 |

**理由**: これらはサブエージェント委譲（Task tool）が必須であり、Skillの技術的制約に抵触。

---

#### 2. バリデーション系（Slash Command維持）

**判定: ❌ Skill化不可**

| コマンド | 理由 |
|----------|------|
| `validate-gap` | Task tool委譲、`$1`引数必須 |
| `validate-design` | Task tool委譲、`$1`引数必須 |
| `validate-impl` | Task tool委譲、`$1`引数必須 |
| `spec-inspection` | Task tool委譲、`$1`引数必須 |
| `document-review` | `$1`引数必須、複雑なレポート生成 |
| `document-review-reply` | `$1`引数必須、修正適用ロジック |

**理由**: サブエージェント委譲 or 複雑な位置引数が必要。

---

#### 3. バグ修正ワークフロー系（Slash Command維持）

**判定: ❌ Skill化不可**

| コマンド | 理由 |
|----------|------|
| `bug-create` | ファイル作成、位置引数 |
| `bug-analyze` | ファイル読み書き、位置引数 |
| `bug-fix` | 実装実行、worktree制御 |
| `bug-verify` | テスト実行、ファイル作成 |
| `bug-merge` | Git操作、位置引数 |
| `bug-status` | 状態表示（軽量だがコマンド形式が適切） |

**理由**: すべてワークフロー制御であり、明示的な実行が必要。

---

#### 4. 対話型コマンド（一部Skill化検討可）

**判定: ⚠️ 部分的にSkill化検討可能**

| コマンド | 現状 | Skill化 | 理由 |
|----------|------|---------|------|
| `spec-plan` | 対話型要件生成 | ⚠️ 検討可 | 「新機能を作りたい」で自動検出可能。ただしファイル作成ロジックが複雑 |
| `project-ask` | Steering読み込み+質問回答 | ✅ **推奨** | 知識自動提供に最適 |
| `spec-ask` | Spec+Steering読み込み+質問回答 | ✅ **推奨** | 知識自動提供に最適 |

---

#### 5. ステータス表示系（Slash Command維持）

**判定: ❌ Skill化不要**

| コマンド | 理由 |
|----------|------|
| `spec-status` | 明示的な状態確認コマンドとして適切 |

**理由**: ユーザーが「状態を確認したい」と明示的に要求するケースが主。自動検出のメリットが薄い。

---

#### 6. ユーティリティ系（Slash Command維持）

**判定: ❌ Skill化不可**

| コマンド | 理由 |
|----------|------|
| `commit` | Git操作、明示的実行が必須 |
| `release` | 複雑なリリースワークフロー、明示的実行が必須 |

**理由**: これらは明確なアクション実行コマンドであり、自動検出のメリットがない。

---

#### 7. 調査・デバッグ系（Skill化検討可）

**判定: ⚠️ 一部Skill化検討可能**

| コマンド/Agent | 現状 | Skill化 | 理由 |
|----------------|------|---------|------|
| `inv` (Slash Command) | 調査モード開始 | ✅ **推奨** | 「調査して」「デバッグして」で自動検出可能 |
| `debug` (Agent) | Electronデバッグ専用 | ⚠️ 検討可 | デバッグ知識の自動提供に有用。ただしMCPツール依存 |

**`inv` (Investigation Mode) のSkill化案**:
```yaml
# .claude/skills/investigation-mode/SKILL.md
---
name: investigation-mode
description: >
  システム調査・デバッグ支援モード。
  「調査して」「問題を特定して」「ログを確認して」「デバッグ」
  などのキーワードで自動検出。
user-invocable: true  # /investigation-mode でも呼び出し可
---

# Investigation Mode

## 調査の優先順位
1. ログ確認を最優先
2. サービス状態の確認
3. 設定・環境変数の確認
4. コード調査

## ログファイルの位置
詳細: [LOGS.md](LOGS.md)

## トラブルシューティング
詳細: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
```

**メリット**:
- ユーザーが「この問題を調査して」と言っただけで調査モードの知識が自動ロード
- `/inv` を明示的に呼ぶ必要がなくなる

---

#### 8. その他

| コマンド | Skill化 | 理由 |
|----------|---------|------|
| `spec-init` | ❌ | 明示的なワークフロー開始 |
| `spec-merge` | ❌ | Git操作、明示的実行が必須 |
| `steering-debug` | ❌ | Task tool委譲 |
| `steering-e2e-testing` | ❌ | Task tool委譲 |

---

### Skill化推奨コマンド

#### 1. `project-ask` → `sdd-project-context` Skill

**現状のコマンド**:
```markdown
---
description: Execute a custom prompt with project steering context
allowed-tools: Read, Glob, Bash
argument-hint: <prompt>
---

# Load Context
Read all steering files to understand project context:
- `.kiro/steering/*.md`

# Execute
With the loaded steering context, process the user's prompt
```

**Skill化案**:
```yaml
# .claude/skills/sdd-project-context/SKILL.md
---
name: sdd-project-context
description: >
  SDDプロジェクトのコンテキストを自動提供。
  「このプロジェクトについて」「技術スタックは？」「アーキテクチャは？」
  などの質問時に自動検出。
user-invocable: false  # 自動検出のみ
---

# Project Context

このSkillはプロジェクトのSteering情報を自動的にロードします。

## 参照ファイル
- [product.md](../../.kiro/steering/product.md) - 製品概要
- [tech.md](../../.kiro/steering/tech.md) - 技術スタック
- [structure.md](../../.kiro/steering/structure.md) - プロジェクト構造
```

**メリット**:
- ユーザーが「このプロジェクトの技術スタックは？」と聞いた時に自動でSteering情報がロードされる
- `/kiro:project-ask` を明示的に呼ぶ必要がなくなる

---

#### 2. `spec-ask` → `sdd-spec-context` Skill

**Skill化案**:
```yaml
# .claude/skills/sdd-spec-context/SKILL.md
---
name: sdd-spec-context
description: >
  特定のSpec仕様のコンテキストを自動提供。
  「この機能の要件は？」「設計はどうなってる？」「タスクの進捗は？」
  などの質問時に自動検出。
user-invocable: true  # /sdd-spec-context feature-name でも呼び出し可
---

# Spec Context

## 使用方法
Specに関する質問をする際、このSkillが自動的にコンテキストを提供します。

例:
- 「user-auth機能の要件を教えて」
- 「このSpecの設計方針は？」

## 参照するファイル
- `.kiro/specs/{feature}/spec.json`
- `.kiro/specs/{feature}/requirements.md`
- `.kiro/specs/{feature}/design.md`
- `.kiro/specs/{feature}/tasks.md`
```

**メリット**:
- Specに関する質問時に自動でコンテキストがロードされる
- 「requirements.mdを読んで」と明示的に指示する必要がなくなる

---

#### 3. SDD知識ベース Skill（新規）

**目的**: EARSフォーマット、設計原則などの知識を自動提供

```yaml
# .claude/skills/sdd-knowledge/SKILL.md
---
name: sdd-knowledge
description: >
  SDD (Spec-Driven Development) の知識ベース。
  「EARSフォーマットで書いて」「設計原則に従って」「TDDで実装」
  などのキーワードで自動検出。
user-invocable: false
---

# SDD Knowledge Base

## EARS Format
要件はEARS (Easy Approach to Requirements Syntax) 形式で記述します。
詳細: [EARS-FORMAT.md](EARS-FORMAT.md)

## Design Principles
設計はDRY, SSOT, KISS, YAGNIの原則に従います。
詳細: [DESIGN-PRINCIPLES.md](DESIGN-PRINCIPLES.md)

## TDD Methodology
実装はTest-Driven Developmentで行います。
詳細: [TDD-GUIDE.md](TDD-GUIDE.md)
```

**メリット**:
- 「EARSで要件を書いて」と言うだけでフォーマットルールが自動ロード
- Subagentに `skills: sdd-knowledge` を指定すれば知識を継承

---

#### 4. `inv` → `investigation-mode` Skill

**現状のコマンド**:
```markdown
# Investigation Mode - システム調査・デバッグ支援

## Investigation Priority
1. ログ確認を最優先
2. サービス状態の確認
3. 設定・環境変数の確認
4. コード調査
```

**Skill化案**:
```yaml
# .claude/skills/investigation-mode/SKILL.md
---
name: investigation-mode
description: >
  システム調査・デバッグ支援モード。
  「調査して」「問題を特定して」「ログを確認して」「デバッグして」
  「エラーの原因は？」などのキーワードで自動検出。
user-invocable: true  # /investigation-mode でも呼び出し可
---

# Investigation Mode

このSkillはシステム調査・デバッグ時に自動的に調査方法をガイドします。

## 調査の優先順位
1. **ログ確認を最優先**
2. サービス状態の確認
3. 設定・環境変数の確認
4. コード調査

## ログファイルの位置
詳細: [LOGS.md](LOGS.md)

## トラブルシューティング手順
詳細: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
```

**メリット**:
- ユーザーが「この問題を調査して」と言うだけで調査モードの知識が自動ロード
- `/inv` を明示的に呼ぶ必要がなくなる
- デバッグ手順が自然に提供される

---

### Skill化ロードマップ

#### Phase 1: 知識層のSkill化（低リスク）

| Skill | 移行元 | 効果 |
|-------|--------|------|
| `sdd-knowledge` | `.kiro/settings/rules/*.md` | ルール・テンプレートの自動提供 |
| `sdd-project-context` | `project-ask` | Steeringの自動ロード |
| `sdd-spec-context` | `spec-ask` | Specコンテキストの自動ロード |
| `investigation-mode` | `inv` | 調査・デバッグ知識の自動提供 |

**実装コスト**: 低
**効果**: コンテキスト自動ロードによるUX向上

#### Phase 2: Subagentへの知識継承（中リスク）

```yaml
# .claude/agents/kiro/spec-design.md
---
name: spec-design-agent
skills: sdd-knowledge, sdd-project-context
---
```

**実装コスト**: 中（全Subagentの更新が必要）
**効果**: Subagent実行時の知識自動ロード

#### Phase 3: ガイドSkill（オプション）

| Skill | 目的 |
|-------|------|
| `sdd-quickstart` | 初心者向けワークフローガイド |
| `sdd-troubleshooting` | エラー時の自動ヘルプ |

**実装コスト**: 低
**効果**: 初心者サポート向上

---

### 移行しないコマンド（最終リスト）

以下は**Slash Commandのまま維持**:

| カテゴリ | コマンド | 理由 |
|----------|----------|------|
| ワークフロー | `spec-init`, `spec-requirements`, `spec-design`, `spec-tasks`, `spec-impl` | Task tool委譲必須 |
| ワークフロー | `spec-quick`, `spec-plan`, `spec-merge` | 複雑なワークフロー制御 |
| バリデーション | `validate-gap`, `validate-design`, `validate-impl`, `spec-inspection` | Task tool委譲必須 |
| ドキュメントレビュー | `document-review`, `document-review-reply` | 位置引数+複雑なロジック |
| バグ修正 | `bug-*` 全コマンド | ワークフロー制御必須 |
| Steering | `steering`, `steering-custom`, `steering-debug`, `steering-e2e-testing` | Task tool委譲必須 |
| ステータス | `spec-status`, `bug-status` | 明示的実行が適切 |
| ユーティリティ | `commit`, `release` | Git操作・明示的実行が必須 |

---

## 結論（更新版）

### 推奨アクション

| 優先度 | アクション | 効果 |
|--------|----------|------|
| **高** | `sdd-project-context` Skill作成 | Steering自動ロード |
| **高** | `sdd-spec-context` Skill作成 | Specコンテキスト自動ロード |
| **高** | `investigation-mode` Skill作成 | 調査・デバッグ知識の自動提供 |
| **中** | `sdd-knowledge` Skill作成 | ルール・テンプレート自動提供 |
| **低** | SubagentにSkill継承設定 | 知識の一元管理 |

### 移行しない理由（再確認）

ワークフロー実行系コマンドは以下の理由でSlash Commandを維持:

1. **Task tool呼び出しが必須**: Skillからは不可能
2. **位置引数 (`$1`, `$2`) が必要**: Skillでは `$ARGUMENTS` のみ
3. **明示的実行が適切**: ワークフロー開始は意図的なアクションであるべき

### 期待される効果

Skill化により:
- 「このプロジェクトの技術スタックは？」→ 自動でSteering情報がロード
- 「EARSフォーマットで要件を書いて」→ 自動でフォーマットルールがロード
- 「user-auth機能の設計を確認して」→ 自動でSpec情報がロード
- 「この問題を調査して」→ 自動で調査・デバッグ手順がロード

**ユーザーが明示的にコマンドを呼ぶ必要が減り、自然な会話でコンテキストが提供される。**

---

## 関連ファイル

### 現在のアーキテクチャ

- [.claude/commands/kiro/](../../.claude/commands/kiro/) - Slash Commands
- [.claude/agents/kiro/](../../.claude/agents/kiro/) - Subagents
- [.kiro/steering/skill-reference.md](../../.kiro/steering/skill-reference.md) - プロファイル仕様

### 参考ドキュメント

- [Claude Code Skills公式ドキュメント](https://code.claude.com/docs/en/skills)
- [Claude Code Slash Commands公式ドキュメント](https://code.claude.com/docs/en/slash-commands)
- [Agent Skills Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Simon Willison: Claude Skills are awesome](https://simonwillison.net/2025/Oct/16/claude-skills/)

---

## 付録A: Slash Commands vs Skills 比較表

| 観点 | Slash Commands | Skills |
|------|----------------|--------|
| **起動方法** | ユーザーが `/cmd` と入力 | Claudeが自動判断 |
| **ファイル構造** | 1ファイル | ディレクトリ + SKILL.md |
| **引数サポート** | `$1`, `$2`, `$ARGUMENTS` | `$ARGUMENTS` のみ |
| **Task tool呼び出し** | ✅ 可能 | ❌ 不可 |
| **自動検出** | ❌ | ✅ |
| **複数ファイル構成** | ❌ | ✅ |
| **コンテキスト効率** | 呼び出し時のみロード | 説明は常時ロード |
| **ユースケース** | コマンド実行、ワークフロー | 知識提供、自動ガイド |

---

## 付録B: 具体的なSkill実装案

### B.1 investigation-mode Skill（最優先推奨）

**現状**: `/inv` Slash Command として実装済み

**Skill化のメリット**:
- 「調査して」「デバッグして」「ログを確認して」で自動検出
- 明示的なコマンド呼び出しが不要に

```
.claude/skills/investigation-mode/
├── SKILL.md
├── LOGS.md              # ログファイル位置
├── TROUBLESHOOTING.md   # トラブルシューティング手順
└── scripts/
    └── collect-logs.sh  # ログ収集スクリプト
```

**SKILL.md 例**:
```yaml
---
name: investigation-mode
description: >
  システム調査・デバッグ支援モード。
  「調査して」「問題を特定して」「ログを確認して」「デバッグして」
  「エラーの原因は？」「なぜ動かない？」などのキーワードで自動検出。
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# Investigation Mode

システム調査時に自動的に以下をガイドします。

## 調査の優先順位

1. **ログ確認を最優先** - 推測ではなく事実に基づく
2. サービス状態の確認
3. 設定・環境変数の確認
4. コード調査

## ログファイル位置
詳細: [LOGS.md](LOGS.md)

## トラブルシューティング手順
詳細: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
```

### B.2 sdd-project-context Skill

**現状**: `/kiro:project-ask` Slash Command として実装

**Skill化のメリット**:
- 「このプロジェクトの技術スタックは？」で自動検出
- Steering情報が自然にロードされる

```yaml
---
name: sdd-project-context
description: >
  SDDプロジェクトのコンテキストを自動提供。
  「このプロジェクトについて」「技術スタックは？」「アーキテクチャは？」
  「プロジェクト構造は？」などの質問時に自動検出。
user-invocable: false
---

# Project Context

このSkillはプロジェクトのSteering情報を自動的にロードします。

## 参照ファイル
- `.kiro/steering/product.md` - 製品概要
- `.kiro/steering/tech.md` - 技術スタック
- `.kiro/steering/structure.md` - プロジェクト構造
- `.kiro/steering/design-principles.md` - 設計原則
```

### B.3 sdd-knowledge Skill

**目的**: SDD知識（EARSフォーマット、設計原則、TDD）の自動提供

```
.claude/skills/sdd-knowledge/
├── SKILL.md
├── EARS-FORMAT.md
├── DESIGN-PRINCIPLES.md
└── TDD-GUIDE.md
```

```yaml
---
name: sdd-knowledge
description: >
  SDD (Spec-Driven Development) の知識ベース。
  「EARSフォーマットで書いて」「設計原則に従って」「TDDで実装」
  「要件を書いて」「設計書を作成」などのキーワードで自動検出。
user-invocable: false
---

# SDD Knowledge Base

## EARS Format
要件はEARS (Easy Approach to Requirements Syntax) 形式で記述します。
詳細: [EARS-FORMAT.md](EARS-FORMAT.md)

## Design Principles
設計はDRY, SSOT, KISS, YAGNIの原則に従います。
詳細: [DESIGN-PRINCIPLES.md](DESIGN-PRINCIPLES.md)

## TDD Methodology
実装はTest-Driven Developmentで行います。
詳細: [TDD-GUIDE.md](TDD-GUIDE.md)
```

### B.4 sdd-quickstart Skill

**目的**: 初心者向けワークフローガイド

```yaml
---
name: sdd-quickstart
description: >
  SDDワークフローのクイックスタートガイド。
  「新しい機能を作りたい」「SDDで開発を始めたい」「機能開発の手順は？」
  などの質問時に自動検出。
user-invocable: true
---

# SDD Quick Start Guide

## ワークフロー概要

```
Planning → Requirements → Design → Tasks → Implementation
```

## 1. 対話的プランニング（推奨）

```
/kiro:spec-plan "機能の説明"
```

対話を通じて要件を明確化し、requirements.md まで生成。

## 2. 設計フェーズ

```
/kiro:spec-design <feature-name>
```

要件をレビュー後、技術設計を生成。

## 3. タスク生成

```
/kiro:spec-tasks <feature-name>
```

設計をレビュー後、実装タスクを生成。

## 4. 実装

```
/kiro:spec-impl <feature-name>
```

TDDで実装を実行。
```

---

## 付録C: Steering ファイルの Skill 化検討

### 現状の Steering ファイル

| ファイル | 内容 | Skill化 |
|----------|------|---------|
| `product.md` | 製品概要 | → `sdd-project-context` |
| `tech.md` | 技術スタック | → `sdd-project-context` |
| `structure.md` | プロジェクト構造 | → `sdd-project-context` |
| `design-principles.md` | 設計原則 | → `sdd-knowledge` |
| `debugging.md` | デバッグ情報 | → `investigation-mode` |
| `operations.md` | MCP操作手順 | → `investigation-mode` |
| `logging.md` | ログ設定 | → `investigation-mode` |
| `e2e-testing.md` | E2Eテスト | → 新規 `e2e-testing` Skill |
| `symbol-semantic-map.md` | 用語定義 | → `sdd-project-context` |
| `skill-reference.md` | プロファイル仕様 | 維持（内部参照用） |

### Steering vs Skill の使い分け

| 用途 | 推奨 | 理由 |
|------|------|------|
| **常時適用ルール** | CLAUDE.md | 毎回ロード |
| **プロジェクト知識** | Steering | 明示的参照時のみ |
| **自動検出したい知識** | Skill | 文脈から自動ロード |
| **Task tool 委譲が必要** | Slash Command | Skill では不可 |

---

## 付録D: 実装ロードマップ

### Phase 1: 知識層のSkill化（低リスク）

| Skill | 移行元 | 工数 | 効果 |
|-------|--------|------|------|
| `investigation-mode` | `/inv` + `debugging.md` | 低 | 調査・デバッグの自動ガイド |
| `sdd-project-context` | `/kiro:project-ask` | 低 | Steering自動ロード |
| `sdd-knowledge` | 新規 | 中 | ルール・テンプレート自動提供 |

### Phase 2: ガイドSkill追加（オプション）

| Skill | 目的 | 工数 |
|-------|------|------|
| `sdd-quickstart` | 初心者向けガイド | 低 |
| `sdd-spec-context` | Spec情報自動ロード | 低 |
| `e2e-testing` | E2Eテスト知識 | 中 |

### Phase 3: Subagentへの知識継承（中リスク）

Subagentに `skills:` フィールドを追加し、知識を継承。

```yaml
# .claude/agents/kiro/spec-design.md
---
name: spec-design-agent
skills: sdd-knowledge, sdd-project-context
---
```

---

## Sources

- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Agent Skills Overview - Claude Platform Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Claude Code Customization Guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)
- [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Simon Willison: Claude Skills are awesome, maybe a bigger deal than MCP](https://simonwillison.net/2025/Oct/16/claude-skills/)
