# OpenAI Codex 統合検討

## 概要

本ドキュメントでは、SDD Orchestratorの一部プロセスにOpenAI Codexを採用する可能性について調査・検討した結果をまとめる。

現在の実装はClaude Code CLI決め打ちであり、以下のコマンド形式を使用している：

```bash
claude -p --verbose --output-format stream-json [command]
```

## 調査結果

### OpenAI Codex CLIの概要

OpenAI Codexは、ターミナルで動作するコーディングエージェントCLI。Rustで実装され、高速な動作が特徴。

**インストール方法**:
```bash
npm i -g @openai/codex
# または
brew install --cask codex
```

**認証**:
- ChatGPTアカウント（Plus, Pro, Business, Edu, Enterprise）
- または OpenAI APIキー（環境変数 `OPENAI_API_KEY`）

### Claude Code CLI との機能比較

| 機能 | Claude Code | OpenAI Codex | 評価 |
|------|-------------|--------------|------|
| 非対話モード | `claude -p` | `codex exec` / `codex e` | ✅ 同等 |
| ストリーミングJSON出力 | `--output-format stream-json` | `--json` / `--experimental-json` | ✅ 同等 |
| セッション継続 | `--resume SESSION_ID` | `codex exec resume [SESSION_ID]` | ✅ 同等 |
| プロンプト入力 | コマンドライン引数 | コマンドライン引数 / stdin (`-`) | ✅ 同等 |
| 最終出力の保存 | JSONパース必要 | `--output-last-message, -o` | ⭐ Codex優位 |
| 構造化出力スキーマ | なし | `--output-schema` | ⭐ Codex優位 |
| MCP Server対応 | 有 | 有（`codex --mcp` として動作可） | ✅ 同等 |
| **Slash Commands (exec mode)** | ✅ 動作する | ❌ 動作しない | ⚠️ **致命的差異** |

### Codex CLI 非対話モード詳細

```bash
# 基本的な非対話実行
codex exec "Update the changelog for the next release"

# JSONストリーム出力（Claude Code の stream-json 相当）
codex exec --json "Fix the bug" > output.jsonl

# セッション継続
codex exec resume SESSION_ID

# 最新セッション継続
codex exec --last "Continue the fix"

# 最終メッセージのみファイル出力
codex exec -o result.txt "Summarize the changes"

# スキーマ指定で構造化出力
codex exec --output-schema schema.json "Analyze the code"
```

### Codex SDK (TypeScript) の利点

CLIに加え、Node.js SDKが提供されており、より柔軟なプログラマティック制御が可能。

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
const thread = codex.startThread({ workingDirectory: "/path/to/project" });

// バッファモード（完了まで待機）
const turn = await thread.run("Diagnose and fix the test failure");
console.log(turn.finalResponse);
console.log(turn.items);

// ストリーミングモード（リアルタイムイベント処理）
const { events } = await thread.runStreamed("Fix the issue");
for await (const event of events) {
  switch (event.type) {
    case "item.completed":
      console.log("item", event.item);
      break;
    case "turn.completed":
      console.log("usage", event.usage);
      break;
  }
}

// セッション継続
const resumedThread = codex.resumeThread(savedThreadId);
await resumedThread.run("Continue implementation");

// 構造化出力
const turn = await thread.run("Summarize status", {
  outputSchema: { type: "object", properties: { summary: { type: "string" } } }
});
```

### 現在のSDD Orchestrator実装

現在の実装 ([specManagerService.ts](../../electron-sdd-manager/src/main/services/specManagerService.ts)) では：

```typescript
const CLAUDE_CLI_BASE_FLAGS = ['-p', '--verbose', '--output-format', 'stream-json'] as const;
```

このフラグでClaude CLIを起動し、JSONL形式のストリーム出力をパースしている。

## 統合の実現可能性

### ✅ 技術的には可能

1. **CLI互換性**: Codex CLIの `codex exec --json` は Claude の `claude -p --output-format stream-json` と同様のJSONL出力を提供
2. **SDK利用**: TypeScript SDKを使用すればより柔軟な統合が可能
3. **プロセス管理**: 現在の `AgentProcess` 抽象化層を拡張することで対応可能

### 想定される変更箇所

```
electron-sdd-manager/src/main/services/
├── agentProcess.ts           # 抽象インターフェースは変更不要
├── providerAgentProcess.ts   # Provider概念を拡張（claude/codex）
└── specManagerService.ts     # Provider選択ロジック追加
```

### 実装アプローチ案

#### Option A: CLI呼び出し方式（低コスト）

現在のプロセススポーン方式を維持し、コマンドを切り替える：

```typescript
// 設定でプロバイダーを選択
interface AgentConfig {
  provider: 'claude' | 'codex';
}

// CLIコマンド構築
function buildCommand(config: AgentConfig, prompt: string): { command: string; args: string[] } {
  if (config.provider === 'codex') {
    return {
      command: 'codex',
      args: ['exec', '--json', prompt]
    };
  }
  return {
    command: 'claude',
    args: ['-p', '--verbose', '--output-format', 'stream-json', prompt]
  };
}
```

#### Option B: SDK統合方式（高機能）

Codex SDKを直接統合し、より細かい制御を実現：

```typescript
import { Codex } from "@openai/codex-sdk";

class CodexAgentProcess implements AgentProcess {
  private codex: Codex;
  private thread: Thread;

  async execute(prompt: string): AsyncGenerator<AgentEvent> {
    const { events } = await this.thread.runStreamed(prompt);
    for await (const event of events) {
      yield this.convertToAgentEvent(event);
    }
  }
}
```

## 制約事項・懸念

### コンテキスト注入メカニズムの比較

| 機能 | Claude Code | OpenAI Codex | exec mode |
|------|-------------|--------------|-----------|
| プロジェクト指示 | `CLAUDE.md` | `AGENTS.md` | ✅ 両方動作 |
| カスタムコマンド | `.claude/commands/*.md` (Slash Commands) | `~/.codex/prompts/*.md` | ❌ Codexのみ不可 |
| 構造化タスク | Slash Commands | **Skills** (`$skill-name`) | ⚠️ 検証必要 |
| ツール制限 | `allowed-tools` frontmatter | Skills の `SKILL.md` | ⚠️ 検証必要 |

### ⚠️ 1. Slash Commands が exec mode で動作しない

SDD Orchestratorは以下のようにSlash Commandsを非対話モードで実行している：

```bash
# Claude Code - 動作する
claude -p --output-format stream-json "/kiro:spec-requirements my-feature"
```

Codex CLIでは Custom Prompts (`/command`) は動作しない：

```bash
# Codex - 動作しない（プレーンテキストとして解釈される）
codex exec "/my-command"
```

**参考**: [GitHub Issue #3641](https://github.com/openai/codex/issues/3641)

### ✅ 代替手段: Agent Skills

Codexには **[Agent Skills](https://developers.openai.com/codex/skills/)** という機能があり、Claude Code Skills と概念的に同等：

#### Codex Skills vs Claude Code Skills

| 特性 | Claude Code | OpenAI Codex |
|------|-------------|--------------|
| ファイル | `SKILL.md` | `SKILL.md` |
| 配置場所 | `.claude/skills/`, `~/.claude/skills/` | `.codex/skills/`, `~/.codex/skills/` |
| 構造 | フォルダ + SKILL.md + scripts | フォルダ + SKILL.md + scripts/references/assets |
| frontmatter | `name`, `description`, `allowed-tools` | `name`, `description` |
| 明示的呼び出し | なし（Skillsは自動発見のみ） | **`$skill-name` で可能** |
| モデル自律呼び出し | ✅ | ✅ |

#### 呼び出しモデルの違い

**Claude Code**:
```
Slash Commands (/command) → ユーザーが明示的に呼び出し
Skills (SKILL.md)         → モデルが自律的に使用（明示呼び出し不可）
```

**OpenAI Codex**:
```
Custom Prompts (/command) → exec mode では動作しない
Skills ($skill-name)      → 明示呼び出し OR モデル自律使用（exec mode 要検証）
```

#### exec mode での呼び出し

```bash
# Skills は $skill-name 形式で呼び出し
codex exec "$my-skill do something"
```

> "If the user names a skill (with $SkillName or plain text) OR the task clearly matches a skill's description, you must use that skill for that turn."

**exec mode での動作は文書上は可能に見えるが、要検証**

### 2. 移植パス

現在の `.claude/commands/kiro/*.md` を Codex Skills に移植する場合：

| Claude Code | Codex Skills |
|-------------|--------------|
| `.claude/commands/kiro/spec-requirements.md` | `~/.codex/skills/spec-requirements/SKILL.md` |
| `allowed-tools: Read, Task` | Skills内でtool制限を定義 |
| `/kiro:spec-requirements` | `$spec-requirements` |

**移植コスト**: 中程度（構造変換が必要だが、概念的には同等）

### 3. 出力フォーマットの差異

- Claude: `stream-json` の具体的なスキーマは文書化済み
- Codex: `--json` の出力スキーマは要確認（JSONL形式は同様だがイベント構造が異なる可能性）

### 4. セッション管理の互換性

- 両者でセッションIDの形式が異なる
- 混在使用時のセッション継続は困難

### ~~認証管理の複雑化~~ → 問題なし

環境変数で十分対応可能：
```bash
export ANTHROPIC_API_KEY=sk-ant-...  # Claude
export OPENAI_API_KEY=sk-...         # Codex
```

## ユースケース別推奨

| ユースケース | 推奨プロバイダー | 理由 |
|-------------|-----------------|------|
| spec-requirements | Claude | Slash Commands必須、日本語対応 |
| spec-design | Claude | Slash Commands必須、複雑な設計思考 |
| spec-tasks | Claude | Slash Commands必須 |
| spec-impl (TDD実装) | **Codex検討可** | プロンプト直接渡しで対応可能 |
| bug-analyze | Claude | Slash Commands必須 |
| bug-fix | **Codex検討可** | プロンプト直接渡しで対応可能 |

## 結論・推奨

### 短期（現時点）: **導入見送り、ただし再評価の余地あり**

**理由**:

1. **Skills の exec mode 動作が未検証**
   - Agent Skills (`$skill-name`) が exec mode で動作すれば、移植パスは存在する
   - 実機検証が必要

2. **移植コスト vs メリットが不明**
   - 32個のSlash Commands → Skills への変換作業
   - Codex特有のメリット（コード生成品質等）の定量評価が必要

3. **現状で機能要件を満たしている**
   - Claude Codeで問題なく動作中
   - 緊急性がない

### 次のアクション（検証項目）

Codex導入を真剣に検討する場合、以下を実機検証：

```bash
# 1. AGENTS.md が exec mode で読み込まれるか
echo "Test instruction" > AGENTS.md
codex exec --json "What are my instructions?"

# 2. Skills が exec mode で呼び出せるか
mkdir -p ~/.codex/skills/test-skill
cat > ~/.codex/skills/test-skill/SKILL.md << 'EOF'
---
name: test-skill
description: Test skill for exec mode
---
You are a test skill. Say "SKILL ACTIVATED".
EOF
codex exec --json "\$test-skill hello"
```

### 中期（将来検討）: **Skills 検証後に再評価**

検証結果次第で：

| Skills exec mode | 判断 |
|------------------|------|
| ✅ 動作する | 移植コスト評価 → 部分導入検討 |
| ❌ 動作しない | 見送り（Codex側の対応待ち） |

### 実装する場合のロードマップ

1. **Phase 1**: 抽象化層の整備
   - `AgentProvider` インターフェース定義
   - 既存コードの`ClaudeProvider`へのリファクタリング

2. **Phase 2**: Codex CLI統合
   - `CodexProvider` 実装（CLI方式）
   - 出力パーサーの実装
   - **プロンプト展開レイヤー**: Slash Commandsの内容を直接展開して渡す仕組み

3. **Phase 3**: UI/設定対応
   - プロバイダー選択UI
   - プロジェクト設定へのプロバイダー項目追加

4. **Phase 4**: SDK統合（オプション）
   - Codex SDKによる高度な統合
   - ストリーミングイベントの統合

## 参考リンク

- [Codex CLI](https://developers.openai.com/codex/cli/)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/)
- [Codex Slash Commands](https://developers.openai.com/codex/cli/slash-commands/)
- [Codex SDK](https://developers.openai.com/codex/sdk/)
- [Codex SDK TypeScript (GitHub)](https://github.com/openai/codex/tree/main/sdk/typescript)
- [Codex SDK (npm)](https://www.npmjs.com/package/@openai/codex-sdk)
- [GitHub Issue: JSON output for exec runs](https://github.com/openai/codex/issues/2288)
- [GitHub Issue: Slash Commands in exec mode](https://github.com/openai/codex/issues/3641)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless)

---

*調査日: 2026-01-04*
*更新: Slash Commands exec mode 制約の深堀り*
