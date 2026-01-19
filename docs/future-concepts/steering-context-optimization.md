# Steering Context Optimization

Steeringドキュメントの過剰読み込み問題を解消するための改善案。

---

## 問題の背景

### 現状

spec-impl agentは `.kiro/steering/` 全体を読み込む指示になっている：

```markdown
# spec-impl.md (agent定義)
- **Entire `.kiro/steering/` directory** for complete project memory
```

### 定量的な問題

| ファイル | 行数 | サイズ | 常時必要か |
|----------|------|--------|-----------|
| e2e-testing.md | 887 | 30KB | ❌ E2Eテスト作成時のみ |
| skill-reference.md | 292 | 17KB | ❌ プロファイル確認時のみ |
| debugging.md | 249 | 12KB | ❌ 動作確認・デバッグ時のみ |
| operations.md | 304 | 10KB | ❌ MCP操作時のみ |
| web-e2e-testing.md | 332 | 9KB | ❌ Web E2Eテスト時のみ |
| structure.md | 238 | 11KB | ⚠️ 多くのタスクで有用 |
| symbol-semantic-map.md | 203 | 10KB | ⚠️ 用語確認時 |
| tech.md | 205 | 7KB | ✅ 常時必要 |
| logging.md | 75 | 3KB | ❌ ログ実装時のみ |
| design-principles.md | 59 | 3KB | ✅ 常時必要 |
| product.md | 54 | 2KB | ✅ 常時必要 |
| verification.md | 16 | 1KB | ❌ 検証時のみ |
| **合計** | **2,914** | **114KB** | |

**問題点**:
- 114KB ≈ 30,000トークン相当がコンテキストを圧迫
- タスクに無関係な情報がノイズとなり精度低下
- 特に「動作確認」タスクで必要な情報（operations.md）が埋もれる

---

## 参考: Claude Code公式ベストプラクティス

### CLAUDE.mdは簡潔に

> "Your CLAUDE.md file should contain as few instructions as possible - ideally only ones which are universally applicable to your task."
> — [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)

### ポインタを使う、コピーしない

> "Prefer pointers to copies. Don't include code snippets in these files if possible - they will become out-of-date quickly. Instead, include file:line references to point Claude to the authoritative context."
> — [Claude Code: Best practices](https://www.anthropic.com/engineering/claude-code-best-practices)

### サブエージェントでコンテキスト分離

> "Subagents keep your main context clean... Because fetching docs involves reading multiple pages and creates a lot of context noise, keeping this inside a subagent prevents your main chat from hitting context limits."
> — [Claude Code customization guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)

### 75%ルール

> "Sessions that stop at 75% utilization produce less total output but higher-quality, more maintainable code that actually ships."
> — [Claude Code: Best practices](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## 改善案

### 案1: JIT (Just-In-Time) Skill読み込み

**概念**: タスク内容を解析し、必要なsteeringファイルのみを動的に読み込む。

#### 実装方法

**Step 1: コアとオンデマンドの分類**

```
.kiro/steering/
├── [常時読み込み - Core]
│   ├── product.md (2KB)
│   ├── tech.md (7KB)
│   └── design-principles.md (3KB)
│   └── structure.md (11KB)  # 多くのタスクで必要
│
└── [オンデマンド - Extended]
    ├── e2e-testing.md
    ├── web-e2e-testing.md
    ├── operations.md
    ├── debugging.md
    ├── skill-reference.md
    ├── symbol-semantic-map.md
    ├── logging.md
    └── verification.md
```

**Step 2: キーワード→ファイルマッピングSkill**

`.claude/skills/steering-loader/SKILL.md`:

```markdown
---
name: steering-loader
description: >
  タスク内容に基づいて必要なsteeringファイルを特定し読み込む。
  「動作確認」「E2Eテスト」「デバッグ」等のキーワードで自動検出。
user-invocable: false
allowed-tools: Read, Glob
---

# Steering Loader

タスク説明からキーワードを検出し、関連steeringファイルを読み込む。

## キーワード→ファイルマッピング

| キーワード | 読み込むファイル |
|-----------|-----------------|
| 動作確認, UI確認, MCP | operations.md, debugging.md |
| E2Eテスト, wdio, WebdriverIO | e2e-testing.md |
| Web E2E, Playwright, Remote UI | web-e2e-testing.md |
| デバッグ, ログ, エラー調査 | debugging.md |
| 用語, シンボル, ドメイン | symbol-semantic-map.md |
| プロファイル, cc-sdd, spec-manager | skill-reference.md |
| ログ実装, winston, logger | logging.md |
| 検証, verification | verification.md |

## 処理フロー

1. タスク説明文を受け取る
2. キーワードマッチング
3. 必要なファイルパスのリストを返す
4. 呼び出し元がReadで読み込み
```

**Step 3: spec-impl agentの修正**

```markdown
# 変更前
- **Entire `.kiro/steering/` directory** for complete project memory

# 変更後
## Step 0.5: Steering JIT Load

1. Read core steering files:
   - .kiro/steering/product.md
   - .kiro/steering/tech.md
   - .kiro/steering/design-principles.md
   - .kiro/steering/structure.md

2. Analyze task description for keywords:
   - 「動作確認」「UI確認」→ Read operations.md, debugging.md
   - 「E2Eテスト」→ Read e2e-testing.md
   - 「デバッグ」「ログ」→ Read debugging.md
   - Otherwise: Skip extended steering files
```

#### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 既存ファイル構造変更不要 | キーワード検出の精度に依存 |
| tasks.mdフォーマット変更不要 | 判断ロジックの保守が必要 |
| 段階的に導入可能 | 新しいsteeringファイル追加時にマッピング更新必要 |

---

### 案2: タスクタグによる明示的指定

**概念**: tasks.mdの各タスクにタグを付与し、読み込むsteeringを明示指定。

#### 実装方法

**Step 1: tasks.mdフォーマット拡張**

```markdown
## Tasks

- [ ] 1.1 UIコンポーネント実装 `[steering:structure]`
- [ ] 1.2 E2Eテスト作成 `[steering:e2e-testing]`
- [ ] 1.3 動作確認 `[steering:operations,debugging]`
- [ ] 1.4 IPC追加 `[steering:structure,logging]`
```

**Step 2: spec-tasks agentでタグ自動付与**

タスク生成時に、タスク内容からsteeringタグを自動推論して付与。

**Step 3: spec-impl agentでタグ解析**

```markdown
## Step 0.5: Parse Steering Tags

1. Read tasks.md
2. Find target task's steering tags (e.g., `[steering:operations,debugging]`)
3. Read only specified steering files
4. If no tag: Read core files only
```

#### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 明示的で予測可能 | tasks.mdフォーマット変更が必要 |
| タスク単位で最適化 | 既存specの移行作業 |
| AIの判断ミスを防げる | タグ付与の手間（自動化で軽減可能） |

---

### 案3: Slash Command + Skillの階層化

**概念**: 動作確認専用のSlash Commandを作成し、必要なコンテキストを注入。

#### 実装方法

**Step 1: 動作確認専用Slash Command**

`.claude/commands/kiro/verify-ui.md`:

```markdown
---
description: Electronアプリの動作確認を実行
allowed-tools: Read, Bash, mcp__electron__*
argument-hint: <feature-name> [task-number]
---

# UI動作確認

## コンテキスト読み込み

以下のファイルを読み込んでから作業を開始:

1. @.kiro/steering/operations.md
2. @.kiro/steering/debugging.md
3. @.kiro/specs/$1/tasks.md

## プロジェクト選択済みで起動

```bash
task electron:start PROJECT=/Users/yamamoto/git/sdd-orchestrator
```

## 動作確認フロー

1. アプリ起動確認: `task electron:status`
2. スクリーンショット取得: `mcp__electron__take_screenshot`
3. ページ構造確認: `mcp__electron__send_command_to_electron` → `get_page_structure`
4. 操作実行
5. 結果確認

## よくある間違いと対処

- **起動後にプロジェクト未選択**: PROJECT引数を確認
- **MCP操作が失敗**: Electronが起動しているか確認 (`task electron:status`)
- **eval失敗**: `__STORES__`経由を試す（operations.md参照）
```

**Step 2: spec-implからの呼び出し**

tasks.mdに「動作確認」タスクがある場合、spec-impl agentが `/kiro:verify-ui` を呼び出す指示を追加。

```markdown
## Step 3.5: Verification Task Detection

If current task contains「動作確認」「UI確認」:
- Invoke `/kiro:verify-ui {feature} {task-number}`
- This command includes necessary context (operations.md, debugging.md)
```

#### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 動作確認に特化した最適化 | タスク種別ごとにコマンド必要 |
| @参照で必要ファイルのみ読み込み | 管理するコマンドが増える |
| よくある間違いを事前に提示 | spec-impl agentとの連携が複雑 |

---

### 案4: Subagent委譲による完全分離

**概念**: 動作確認タスクを専用サブエージェントに委譲し、メインコンテキストを汚染しない。

#### 実装方法

**Step 1: 動作確認専用サブエージェント**

`.claude/agents/verify-ui.md`:

```markdown
---
name: verify-ui
description: >
  Electronアプリの動作確認を専門に行う。
  「動作確認」「UI確認」「画面確認」タスクで自動委譲。
tools:
  - Read
  - Bash
  - mcp__electron__get_electron_window_info
  - mcp__electron__take_screenshot
  - mcp__electron__send_command_to_electron
  - mcp__electron__read_electron_logs
model: sonnet
permissionMode: bypassPermissions
skills:
  - investigation-mode
---

# UI Verification Agent

## 最初に読み込む

1. `.kiro/steering/operations.md` - MCP操作マニュアル
2. `.kiro/steering/debugging.md` - ログ・トラブルシューティング

## 担当

- Electronアプリの起動確認
- MCP経由のUI操作
- スクリーンショット取得
- 動作確認結果の報告

## 起動手順

1. `task electron:status` で状態確認
2. 未起動なら `task electron:start PROJECT={projectPath}`
3. MCP経由で操作

## 出力形式

```markdown
## 動作確認結果

### 確認項目
- [ ] 確認項目1: 結果
- [ ] 確認項目2: 結果

### スクリーンショット
（必要に応じて）

### 問題点
（あれば）
```
```

**Step 2: spec-impl agentの修正**

```markdown
## Step 3: Execute with TDD

For each selected task:

### 3.5: Task Type Detection

If task contains「動作確認」「UI確認」「画面確認」:
- Delegate to `verify-ui` subagent
- Subagent reads operations.md, debugging.md independently
- Main context remains clean

Otherwise:
- Continue with TDD cycle
```

#### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| コンテキスト完全分離 | サブエージェント間の情報共有が難しい |
| 専用ツールセットで効率化 | 実装タスクとの連携に工夫が必要 |
| 失敗しても再試行容易 | context amnesiaのリスク（CLAUDE.mdで軽減可能） |
| スキル（investigation-mode）を継承可能 | |

---

### 案5: CLAUDE.mdのポインタ方式採用（推奨）

**概念**: CLAUDE.mdにはポインタ（参照先）のみを記載し、詳細は必要時に読み込む。

#### 実装方法

**Step 1: CLAUDE.mdのスリム化**

```markdown
# CLAUDE.md (変更後)

## Project Context
(現状維持 - 必須情報のみ)

## Steering Reference (ポインタ方式)

必要に応じて以下を読み込む:

| 状況 | 読み込むファイル |
|------|-----------------|
| 動作確認・MCP操作 | `.kiro/steering/operations.md` |
| デバッグ・ログ調査 | `.kiro/steering/debugging.md` |
| E2Eテスト作成 | `.kiro/steering/e2e-testing.md` |
| Web E2Eテスト | `.kiro/steering/web-e2e-testing.md` |
| 用語・ドメイン確認 | `.kiro/steering/symbol-semantic-map.md` |
| プロファイル仕様 | `.kiro/steering/skill-reference.md` |

**常時参照**: `product.md`, `tech.md`, `design-principles.md`, `structure.md`

## Development Commands
(現状維持)
```

**Step 2: Agent定義の修正**

```markdown
# spec-impl.md (変更後)

## Step 1: Load Context

### Core Steering (常時読み込み)
- .kiro/steering/product.md
- .kiro/steering/tech.md
- .kiro/steering/design-principles.md
- .kiro/steering/structure.md

### Extended Steering (タスク内容に応じて)
Refer to CLAUDE.md "Steering Reference" table and read relevant files.
```

#### メリット・デメリット

| メリット | デメリット |
|---------|-----------|
| 公式推奨のベストプラクティス準拠 | AIの判断に依存する部分がある |
| CLAUDE.mdを見れば何を読むべきかわかる | 初期読み込みファイルは減らない |
| 段階的に導入可能 | |
| 既存構造を大きく変更しない | |

---

## 推奨: ハイブリッドアプローチ

**案5（ポインタ方式）+ 案4（サブエージェント）の組み合わせ**

### 理由

1. **CLAUDE.mdのスリム化**は公式推奨であり、リスクが低い
2. **動作確認の専用サブエージェント**はコンテキスト分離の効果が大きい
3. **段階的に導入可能**で、問題があれば戻せる

### 実装ステップ

#### Phase 1: CLAUDE.md + Agent定義の修正（低リスク）

1. CLAUDE.mdに「Steering Reference」テーブルを追加
2. spec-impl agentを「Core + On-demand」方式に修正
3. 既存動作を維持しつつ、不要な読み込みを削減

#### Phase 2: 動作確認サブエージェントの導入（中リスク）

1. `.claude/agents/verify-ui.md` を作成
2. spec-impl agentに委譲ロジックを追加
3. investigation-modeスキルとの統合

#### Phase 3: キーワード自動検出の精緻化（オプション）

1. steering-loader Skillを作成
2. 精度を監視しながら調整

---

## 期待される効果

### コンテキスト削減量

| シナリオ | 現状 | 改善後 | 削減率 |
|---------|------|--------|--------|
| 通常の実装タスク | 114KB | 23KB | 80% |
| 動作確認タスク | 114KB | 35KB | 69% |
| E2Eテスト作成 | 114KB | 53KB | 54% |

### 品質向上

- **ノイズ削減**: 無関係な情報によるミスリード防止
- **コンテキスト効率**: 75%ルール遵守が容易に
- **動作確認精度向上**: 必要な情報（operations.md）が確実に読み込まれる

---

## 参考資料

- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code customization guide](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Slash commands - Claude Code Docs](https://code.claude.com/docs/en/slash-commands)
- [Best practices for Claude Code subagents](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)

---

## 関連ドキュメント

- [skill-migration-feasibility.md](./skill-migration-feasibility.md) - Skill移行の実現可能性分析
