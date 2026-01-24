# Claude Code 実行権限システム詳細調査レポート

## 概要

Claude Codeの実行権限システムは複数のレイヤーで構成されており、設定の優先順位やバグにより予期しない動作が発生することがある。本レポートでは、公式ドキュメントとGitHub Issueを基に、権限システムの仕様とバグを詳細に分析する。

---

## 1. 設定の優先順位（Settings Hierarchy）

### 公式仕様（高→低）

| 優先度 | 設定ソース | パス | 説明 |
|--------|-----------|------|------|
| 1 (最高) | Managed | `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS) | 企業ポリシー、**オーバーライド不可** |
| 2 | CLI引数 | `--allowedTools`, `--permission-mode` 等 | セッション固有の一時設定 |
| 3 | Local Project | `.claude/settings.local.json` | 個人用プロジェクト設定（gitignored） |
| 4 | Shared Project | `.claude/settings.json` | チーム共有設定（コミット対象） |
| 5 (最低) | User | `~/.claude/settings.json` | 全プロジェクト共通の個人設定 |

**参照**: [Claude Code Settings](https://code.claude.com/docs/en/settings)

### 権限ルールの評価順序

```
1. deny ルール（最優先、必ずブロック）
2. ask ルール（確認プロンプト表示）
3. allow ルール（自動許可）
```

**重要**: 同じツールに対して`deny`と`allow`の両方が存在する場合、**denyが常に優先**される。

---

## 2. CLIオプションの仕様

### 主要フラグ一覧

| フラグ | 説明 | 挙動 |
|--------|------|------|
| `--permission-mode <mode>` | 権限モードを指定 | `default`, `acceptEdits`, `plan`, `dontAsk`, `bypassPermissions` |
| `--allowedTools "Tool1,Tool2"` | 許可ツールのホワイトリスト | 指定ツールはプロンプトなしで実行 |
| `--disallowedTools "Tool1,Tool2"` | 禁止ツールのブラックリスト | 指定ツールは利用不可になる |
| `--dangerously-skip-permissions` | 全権限チェックをスキップ | **危険**: 全操作が無確認で実行 |
| `--tools "Tool1,Tool2"` | 利用可能ツールの制限 | `""` で全ツール無効化、`"default"` で全有効 |

**参照**: [CLI Reference](https://code.claude.com/docs/en/cli-reference)

### パターン構文

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",     // プレフィックスマッチ（:*）
      "Bash(git * main)",    // グロブマッチ（*）
      "Read(./src/**)",      // パス glob
      "Bash"                 // 全 Bash コマンド（括弧なし）
    ]
  }
}
```

**注意**: `Bash(*)` は**全コマンドにマッチしない**。全Bashコマンドを許可するには `"Bash"` を使用する。

---

## 3. Subagent（Task Tool）の権限継承

### 公式仕様

| 設定 | 挙動 |
|------|------|
| `permissionMode: default` | 親から権限コンテキストを継承 |
| `permissionMode: bypassPermissions` | **親がbypassPermissionsの場合、子も強制的にbypassPermissions** |
| `tools` フィールド | 利用可能ツールのホワイトリスト |
| `disallowedTools` フィールド | 利用禁止ツールのブラックリスト |

**参照**: [Create custom subagents](https://code.claude.com/docs/en/sub-agents)

### 背景実行時の制限

| 実行モード | 権限プロンプト | MCPツール |
|------------|---------------|-----------|
| フォアグラウンド | ユーザーに転送 | 利用可能 |
| バックグラウンド | **自動deny**（事前許可のみ有効） | **利用不可** |

---

## 4. Slash Command（Skills）の権限設定

### Frontmatterフィールド

```yaml
---
name: safe-reader
description: Read files without making changes
allowed-tools: Read, Grep, Glob
permissionMode: plan
---
```

| フィールド | 説明 |
|-----------|------|
| `allowed-tools` | スキル実行時に許可するツール |
| `permissionMode` | スキル実行時の権限モード |
| `tools` | 利用可能ツールの制限 |
| `disallowedTools` | 禁止ツール |

**参照**: [Slash commands](https://code.claude.com/docs/en/slash-commands)

---

## 5. 確認されているバグ・問題

### 5.1 `--allowedTools` が `bypassPermissions` モードで無視される

**Issue**: [#12232](https://github.com/anthropics/claude-code/issues/12232)

**現象**:
```bash
# ❌ 動作しない（Read以外も実行される）
claude -p "get my public ip" --allowedTools Read --permission-mode bypassPermissions

# ✅ 動作する
claude -p "get my public ip" --disallowedTools Bash --permission-mode bypassPermissions
```

**影響**: ホワイトリストによるセキュリティ制限が機能しないため、CI/CD環境での最小権限の原則が適用できない。

**ステータス**: Open（2026年1月15日時点でも再現）

---

### 5.2 Subagentが親の権限を継承しない（MCP Server Mode）

**Issue**: [#5465](https://github.com/anthropics/claude-code/issues/5465)

**現象**:
- MCP Server Mode でTask toolを使用してsubagentを生成すると、親プロセスのファイルシステム権限が継承されない
- subagentが権限プロンプトを表示するが、MCPインターフェースでは応答不可

**影響**: MCP Server ModeでTask機能が**完全に使用不可**。

**ステータス**: Closed (not planned)

**試行した回避策（全て失敗）**:
- `--permission-mode bypassPermissions` → subagentに伝播しない
- 環境変数での権限設定 → 継承されない
- 管理者権限での実行 → 効果なし

---

### 5.3 Built-in Plan Agentが親のsettings.json権限を無視

**Issue**: [#10906](https://github.com/anthropics/claude-code/issues/10906)

**現象**:
- `~/.claude/settings.json` で許可したツールに対して、Plan agentが繰り返し権限を要求
- パイプ（`|`）を含むコマンドで特に発生

**原因**:
1. Built-in subagentは独自のツール設定を持つ
2. 親のsettings.jsonからの継承が実装されていない
3. Built-in agent のカスタマイズ手段がない

**回避策**:
```json
{
  "permissions": {
    "allow": ["Bash"]  // 全Bashを許可（セキュリティリスクあり）
  }
}
```

**ステータス**: Open

---

### 5.4 Custom Slash Commandsの権限バイパス問題

**Issue**: [#6625](https://github.com/anthropics/claude-code/issues/6625)（Closed - 仕様通り）

**当初の報告**: Custom slash commandsがBash等のツールを権限プロンプトなしで実行

**公式回答**: **仕様通りの動作**。`allowed-tools` frontmatterで事前認可されたツールは個別の権限確認をスキップする。

---

### 5.5 Gitコミットが権限プロンプトなしで実行される

**Issue**: [#16710](https://github.com/anthropics/claude-code/issues/16710)

**現象**: Custom slash commandからgit commitが実行される際、allowlistに含まれていなくても権限プロンプトが表示されない。

**ステータス**: Open

---

### 5.6 `--disallowedTools` がMCPツールに効かない

**Issue**: [#12863](https://github.com/anthropics/claude-code/issues/12863)

**現象**: `-p`（非インタラクティブ）モードで`--disallowedTools`を使用しても、MCPツールはブロックされない。

**影響**: Built-inツールは正常にブロックされるが、MCPツールは無視される。

---

### 5.7 非インタラクティブモードでグローバル設定が上書きできない

**Issue**: [#5809](https://github.com/anthropics/claude-code/issues/5809)

**現象**: `~/.claude.json` のツール・MCPサーバー設定を `--allowedTools`/`--disallowedTools` で上書きできない。

---

## 6. セキュリティ脆弱性（CVE/GHSA）

Claude Codeには権限バイパスに関連する複数のセキュリティ脆弱性が報告されている。

### 6.1 公式セキュリティアドバイザリ

| アドバイザリ | 概要 | 深刻度 | 発表日 |
|-------------|------|--------|--------|
| [GHSA-66m2-gx93-v996](https://github.com/anthropics/claude-code/security/advisories/GHSA-66m2-gx93-v996) | シンボリックリンクによるdenyルールバイパス | Low | 2025-10-03 |
| [GHSA-x56v-x2h6-7j34](https://github.com/anthropics/claude-code/security/advisories/GHSA-x56v-x2h6-7j34) | echoコマンドのコマンドインジェクション | - | 2025-09-10 |
| [GHSA-x5gv-jw7f-j6xj](https://github.com/anthropics/claude-code/security/advisories/GHSA-x5gv-jw7f-j6xj) | デフォルトallowlistが過度に許可的（ネットワーク流出） | - | - |
| [GHSA-pmw4-pwvc-3hx2](https://github.com/anthropics/claude-code/security/advisories/GHSA-pmw4-pwvc-3hx2) | パスプレフィックス衝突によるパス制限バイパス | - | - |

### 6.2 報告されている未修正の脆弱性

| Issue | 概要 |
|-------|------|
| [#4956](https://github.com/anthropics/claude-code/issues/4956) | コマンドチェーン（`&&`, `;`, `\|`）によるBash権限バイパス |
| [#13371](https://github.com/anthropics/claude-code/issues/13371) | コマンドオプション挿入による権限バイパス（新しい攻撃ベクトル） |
| [#6495](https://github.com/anthropics/claude-code/issues/6495) | ExitPlanModeワークフローを悪用したbypassPermissions達成 |
| [#6631](https://github.com/anthropics/claude-code/issues/6631) | Read/Writeツールのdeny設定が機能しない |
| [#2625](https://github.com/anthropics/claude-code/issues/2625) | denyルールと`--disallowedTools`が完全に無視される |

---

## 7. 権限解決フローの概要図

```
┌─────────────────────────────────────────────────────────────────┐
│                    ツール実行リクエスト                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Managed Settings (Enterprise) │  ← 最優先、オーバーライド不可
              │ deny ルールをチェック         │
              └───────────────────────────────┘
                              │
                    deny match? ─── Yes ──→ ❌ ブロック
                              │
                              No
                              ▼
              ┌───────────────────────────────┐
              │ CLI引数をチェック             │
              │ --disallowedTools            │
              │ --allowedTools               │
              │ --permission-mode            │
              └───────────────────────────────┘
                              │
                     処理（⚠️バグあり）
                              │
                              ▼
              ┌───────────────────────────────┐
              │ settings.json 階層をマージ    │
              │ Local > Project > User        │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ 権限ルール評価                │
              │ 1. deny（最優先）             │
              │ 2. ask                        │
              │ 3. allow                      │
              └───────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
           deny            ask            allow
              │               │               │
              ▼               ▼               ▼
        ❌ ブロック     ❓ プロンプト    ✅ 実行
```

---

## 8. 推奨事項

### 8.1 安全な設定パターン

```json
// .claude/settings.json
{
  "permissions": {
    "deny": [
      "Read(.env*)",
      "Read(./secrets/**)",
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Bash(curl:*)",
      "Bash(wget:*)"
    ],
    "allow": [
      "Bash(npm run:*)",
      "Bash(git commit:*)",
      "Bash(git status)",
      "Read(./src/**)",
      "Edit(./src/**)"
    ]
  }
}
```

### 8.2 バグ回避策

| 問題 | 回避策 |
|------|--------|
| `--allowedTools` が効かない | `--disallowedTools` でブラックリスト方式を使用 |
| Subagent権限継承失敗 | Task toolの使用を避け、直接ツールを使用 |
| Plan agent権限問題 | `"Bash"` を全許可（セキュリティトレードオフ） |
| MCP Server Mode | 通常のCLIモードで実行 |

### 8.3 CI/CD環境での注意点

1. **ホワイトリストが機能しない**: `--allowedTools` + `bypassPermissions` の組み合わせは期待通りに動作しない
2. **ブラックリストを使用**: `--disallowedTools` でリスクのあるツールを明示的に禁止
3. **コンテナ隔離を推奨**: `--dangerously-skip-permissions` 使用時は必ずネットワーク隔離されたコンテナ内で実行

---

## 9. 関連リソース

### 公式ドキュメント
- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Slash commands](https://code.claude.com/docs/en/slash-commands)
- [Configure permissions (Agent SDK)](https://platform.claude.com/docs/en/agent-sdk/permissions)

### 主要なバグ報告
- [#12232](https://github.com/anthropics/claude-code/issues/12232) - allowedTools ignored with bypassPermissions
- [#5465](https://github.com/anthropics/claude-code/issues/5465) - Subagent permission inheritance failure
- [#10906](https://github.com/anthropics/claude-code/issues/10906) - Plan agent ignores settings.json
- [#6625](https://github.com/anthropics/claude-code/issues/6625) - Slash command permission bypass (仕様通り)
- [#12863](https://github.com/anthropics/claude-code/issues/12863) - disallowedTools doesn't affect MCP tools
- [#5809](https://github.com/anthropics/claude-code/issues/5809) - Non-interactive mode global settings override

### セキュリティアドバイザリ
- [GitHub Security Advisories](https://github.com/anthropics/claude-code/security/advisories)

### 解説記事
- [Claude Code Permissions Complete Guide](https://www.eesel.ai/blog/claude-code-permissions)
- [Claude Code Internals: Permission System](https://kotrotsos.medium.com/claude-code-internals-part-8-the-permission-system-624bd7bb66b7)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## 10. まとめ

Claude Codeの権限システムは複雑な階層構造を持ち、以下の点で注意が必要：

1. **設定の優先順位**: Managed > CLI > Local > Project > User
2. **ルール評価順序**: deny > ask > allow
3. **既知のバグ**: ホワイトリスト（`--allowedTools`）がbypassPermissionsモードで機能しない
4. **Subagent問題**: MCP Server Mode、Built-in agentでの権限継承に多数の問題
5. **セキュリティ脆弱性**: コマンドチェーン、シンボリックリンク等によるバイパス手法が報告済み

**最終更新**: 2026年1月24日

---

# 附録: SDD Orchestrator プロジェクト権限設定見直し

## A0. 非対話型環境向けPermission Mode比較

本プロジェクトはElectron SDD ManagerやCI/CDから**非対話型プロセス**としてClaudeを起動するため、権限プロンプトに応答できない。この制約下での最適な設定を検討する。

### Permission Mode 比較表

| Mode | 権限プロンプト | ツール制限 | 非対話型適性 | セキュリティ |
|------|--------------|-----------|-------------|-------------|
| `default` | 表示（応答必要）| なし | ❌ 使用不可 | ✅ 高 |
| `acceptEdits` | Edit自動承認 | なし | ⚠️ 部分的 | ⚠️ 中 |
| `plan` | 読み取りのみ | Write/Edit禁止 | ✅ 安全 | ✅ 高 |
| **`dontAsk`** | **自動deny** | **toolsフィールドで明示** | **✅ 最適** | **✅ 高** |
| `bypassPermissions` | スキップ | なし（全許可） | ✅ 動作する | ❌ 低 |

### 非対話型環境での推奨: `dontAsk` + `tools`

```yaml
---
permissionMode: dontAsk
tools: Read, Write, Edit, Glob, Grep, Bash
---
```

**動作**:
- `tools` に明示されたツールは**プロンプトなしで使用可能**
- `tools` に含まれないツールは**自動的にdeny**
- 権限プロンプトは一切表示されない

**メリット**:
1. 非対話型でも確実に動作
2. 必要なツールだけに制限可能
3. `bypassPermissions` より安全

### bypassPermissions vs dontAsk

```
bypassPermissions:
├── 全ツールが使用可能
├── disallowedToolsでブラックリスト制限（⚠️バグあり）
└── 「全許可 - 禁止リスト」方式

dontAsk:
├── toolsフィールドのツールのみ使用可能
├── それ以外は自動deny
└── 「明示的許可」方式（ホワイトリスト）
```

**結論**: 非対話型環境では **`dontAsk` + `tools`** が最も安全で確実。

---

## A1. 現状分析

### A1.1 現在のSlash Command設定一覧

| コマンド | allowed-tools | permissionMode | 問題点 |
|----------|---------------|----------------|--------|
| `spec-requirements` | Read, Task | なし | ✅ 適切 |
| `spec-design` | Read, Task | なし | ✅ 適切 |
| `spec-tasks` | (agent定義) | bypassPermissions | ⚠️ commandとagent定義が混在 |
| `spec-impl` | Read, Task | なし | ✅ 適切 |
| `spec-inspection` | (agent定義) | bypassPermissions | ⚠️ commandとagent定義が混在 |
| `spec-init` | Bash, Read, Write, Glob | なし | ⚠️ Bash範囲が広すぎ |
| `spec-plan` | Bash, Read, Write, Glob, Grep, WebSearch, WebFetch, Task | なし | ⚠️ Bash範囲が広すぎ |
| `spec-quick` | Read, SlashCommand, TodoWrite, Bash, Write, Glob | なし | ⚠️ Bash範囲が広すぎ |
| `spec-merge` | Bash, Read, Write, Edit, Glob | なし | ⚠️ Bash範囲が広すぎ |
| `spec-status` | Bash, Read, Glob, Write, Edit, MultiEdit, Update | なし | ⚠️ 過剰な権限 |
| `spec-ask` | Read, Glob, Bash | なし | ⚠️ Bash範囲が広すぎ |
| `document-review` | Read, Write, Glob, Grep | なし | ✅ 適切 |
| `document-review-reply` | Read, Write, Edit, Glob, Grep | なし | ✅ 適切 |
| `validate-design` | Read, Task | なし | ✅ 適切 |
| `validate-gap` | Read, Task | なし | ✅ 適切 |
| `validate-impl` | Read, Task | なし | ✅ 適切 |
| `bug-create` | Bash, Read, Write, Glob | なし | ⚠️ Bash範囲が広すぎ |
| `bug-analyze` | Bash, Read, Write, Edit, Glob, Grep | なし | ⚠️ Bash範囲が広すぎ |
| `bug-fix` | Bash, Read, Write, Edit, Glob, Grep | なし | ⚠️ Bash範囲が広すぎ |
| `bug-verify` | Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion | なし | ⚠️ Bash範囲が広すぎ |
| `bug-status` | なし | なし | ❓ 未設定 |
| `bug-merge` | 不明 | なし | ❓ 未確認 |
| `steering` | Read, Task, Glob | なし | ✅ 適切 |
| `steering-custom` | Task | なし | ✅ 適切 |
| `steering-debug` | Read, Write, Glob, Grep, Bash | なし | ⚠️ Bash範囲が広すぎ |
| `steering-e2e-testing` | Read, Write, Edit, Glob, Grep, Bash | なし | ⚠️ Bash範囲が広すぎ |
| `steering-verification` | Read, Task, Glob | なし | ✅ 適切 |
| `commit` | Bash(git *), Read, Glob | なし | ✅ 適切（gitに限定） |
| `test-fix` | Bash, Read, Edit, Glob, Grep, AskUserQuestion | なし | ⚠️ Bash範囲が広すぎ |
| `release` | なし（未設定） | なし | ❓ 未設定 |

### A1.2 現在のAgent設定一覧

| エージェント | tools | permissionMode | 問題点 |
|-------------|-------|----------------|--------|
| `debug` | Read, Glob, Grep, Bash, MCP(electron) | bypassPermissions | ⚠️ Bash無制限 |
| `spec-design-agent` | Read, Write, Edit, Grep, Glob, WebSearch, WebFetch | bypassPermissions | ✅ 適切 |
| `spec-requirements-agent` | Read, Write, Edit, Glob, WebSearch, WebFetch | bypassPermissions | ✅ 適切 |
| `spec-tasks-agent` | Read, Write, Edit, Glob, Grep | bypassPermissions | ✅ 適切 |
| `spec-tdd-impl-agent` | Read, Write, Edit, MultiEdit, Bash, Glob, Grep, WebSearch, WebFetch | bypassPermissions | ⚠️ Bash無制限（実装に必要だが要注意） |
| `spec-inspection-agent` | Read, Bash, Grep, Glob, Write, Task | bypassPermissions | ⚠️ Bash無制限 |
| `steering-agent` | Read, Write, Edit, Glob, Grep, Bash | bypassPermissions | ⚠️ Bash無制限 |
| `steering-custom-agent` | Read, Write, Edit, Glob, Grep, Bash | bypassPermissions | ⚠️ Bash無制限 |
| `validate-design-agent` | Read, Grep, Glob | bypassPermissions | ✅ 適切（読み取り専用） |
| `validate-gap-agent` | Read, Grep, Glob, WebSearch, WebFetch | bypassPermissions | ✅ 適切 |
| `validate-impl-agent` | Read, Bash, Grep, Glob | bypassPermissions | ⚠️ Bash無制限 |

### A1.3 settings.local.json の問題点

現在の `settings.local.json` は170以上のallow設定があり、実質的に**全許可状態**:

```json
{
  "permissions": {
    "allow": [
      "Bash(rm:*)",      // ⚠️ 危険: ファイル削除
      "Bash(curl:*)",    // ⚠️ 危険: ネットワーク流出
      // ... 150以上のルール
    ],
    "deny": []           // ❌ denyルールが空
  }
}
```

**問題点**:
1. `rm` コマンドが許可されている（プロジェクト外も削除可能）
2. `curl` が許可されている（データ流出リスク）
3. `deny` が空（安全弁がない）

---

## A2. 推奨設定

### A2.1 フェーズ別の権限設計

```
┌────────────────────────────────────────────────────────────────────┐
│ Phase 1: Specification（仕様作成）                                  │
│ ─────────────────────────────────────────────────────────────────  │
│ リスク: 低（主にドキュメント生成）                                    │
│ 許可: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch           │
│ Bash: git status, date, ls のみ                                     │
│ 禁止: 破壊的コマンド、ネットワーク送信                                │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Phase 2: Validation（検証）                                         │
│ ─────────────────────────────────────────────────────────────────  │
│ リスク: 低（読み取り中心）                                           │
│ 許可: Read, Grep, Glob                                              │
│ Bash: npm test, vitest (読み取り系のみ)                             │
│ 禁止: Write, Edit（読み取り専用）                                    │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Phase 3: Implementation（実装）                                      │
│ ─────────────────────────────────────────────────────────────────  │
│ リスク: 高（コード変更、コマンド実行）                                │
│ 許可: Read, Write, Edit, MultiEdit, Glob, Grep, Bash               │
│ Bash: npm, node, git, task, vitest 等                               │
│ 禁止: rm -rf, sudo, curl (送信), システム変更                        │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│ Phase 4: Inspection（検査）                                          │
│ ─────────────────────────────────────────────────────────────────  │
│ リスク: 中（ビルド・テスト実行）                                     │
│ 許可: Read, Grep, Glob, Write(レポートのみ)                         │
│ Bash: npm test, npm run build, git 等                               │
│ 禁止: 本番環境操作                                                   │
└────────────────────────────────────────────────────────────────────┘
```

### A2.2 Slash Command 推奨設定

#### Specification Phase（仕様作成）

```yaml
# spec-requirements.md
---
allowed-tools: Read, Task
---
# ✅ 現状維持（Taskでsubagentに委譲）

# spec-design.md
---
allowed-tools: Read, Task
---
# ✅ 現状維持

# spec-tasks.md（command版を追加、agent版と分離）
---
allowed-tools: Read, Task
---
# ⚠️ 現状: commandファイルにagent定義が混在 → 分離を推奨

# spec-init.md
---
allowed-tools: Read, Write, Glob, Bash(git status), Bash(date:*), Bash(mkdir:*)
---
# ✅ 改善: Bashを必要最小限に限定

# spec-plan.md
---
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Task, Bash(git status), Bash(date:*)
---
# ✅ 改善: Bashを必要最小限に限定

# spec-status.md
---
allowed-tools: Read, Glob
---
# ✅ 改善: 状態確認は読み取りのみで十分
```

#### Validation Phase（検証）

```yaml
# validate-design.md
---
allowed-tools: Read, Task
---
# ✅ 現状維持

# validate-gap.md
---
allowed-tools: Read, Task
---
# ✅ 現状維持

# validate-impl.md
---
allowed-tools: Read, Task
---
# ✅ 現状維持

# document-review.md
---
allowed-tools: Read, Glob, Grep
---
# ✅ 改善: Writeを削除（レビューは読み取り専用）

# document-review-reply.md
---
allowed-tools: Read, Write, Edit, Glob, Grep
---
# ✅ 現状維持（修正を行うため）
```

#### Implementation Phase（実装）

```yaml
# spec-impl.md
---
allowed-tools: Read, Task
---
# ✅ 現状維持（subagentに委譲）

# bug-fix.md
---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(git:*), Bash(task:*)
---
# ✅ 改善: Bashを必要なコマンドに限定

# test-fix.md
---
allowed-tools: Read, Edit, Glob, Grep, AskUserQuestion, Bash(npm test:*), Bash(npx vitest:*), Bash(task:*)
---
# ✅ 改善: Bashをテスト実行に限定
```

#### Inspection Phase（検査）

```yaml
# spec-inspection.md（command版を追加）
---
allowed-tools: Read, Task
---
# ✅ 改善: commandはTaskに委譲、agent側でBashを制御
```

#### Bug Workflow

```yaml
# bug-create.md
---
allowed-tools: Read, Write, Glob, Bash(date:*), Bash(mkdir:*)
---
# ✅ 改善: Bashを最小限に

# bug-analyze.md
---
allowed-tools: Read, Write, Glob, Grep, Bash(npm test:*), Bash(git:*)
---
# ✅ 改善: 解析に必要なコマンドのみ

# bug-verify.md
---
allowed-tools: Read, Write, Glob, Grep, AskUserQuestion, Bash(npm test:*), Bash(npx vitest:*), Bash(task:*)
---
# ✅ 改善: 検証に必要なテストコマンドのみ
```

#### Utility Commands

```yaml
# commit.md
---
allowed-tools: Read, Glob, Bash(git:*)
---
# ✅ 現状維持（gitに限定済み）

# release.md
---
allowed-tools: Read, Glob, Bash(git:*), Bash(npm:*), Bash(task:*)
---
# ✅ 追加: frontmatter設定を追加すべき
```

### A2.3 Agent 推奨設定（非対話型環境向け）

**重要**: 非対話型環境では `permissionMode: dontAsk` + `tools` フィールドが最適。
`tools` に明示したツールのみ使用可能、それ以外は自動deny。

#### 読み取り専用Agent

```yaml
# validate-design-agent.md
---
tools: Read, Grep, Glob
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更、toolsで明示したもの以外は自動deny

# validate-gap-agent.md
---
tools: Read, Grep, Glob, WebSearch, WebFetch
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更

# validate-impl-agent.md
---
tools: Read, Grep, Glob, Bash
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更、Bashはテスト実行に必要
```

#### 仕様生成Agent（Bashなし）

```yaml
# spec-design-agent.md
---
tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更（Bashなしで安全）

# spec-requirements-agent.md
---
tools: Read, Write, Edit, Glob, WebSearch, WebFetch
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更

# spec-tasks-agent.md
---
tools: Read, Write, Edit, Glob, Grep
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更
```

#### 実装Agent（Bash必要）

```yaml
# spec-tdd-impl-agent.md
---
tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, WebSearch, WebFetch
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更
# Bashは実装に必要だがdontAskにより他ツールは自動deny
# 危険コマンドはBash自体の判断に委ねる（LLMの安全制約）
```

#### 検査Agent

```yaml
# spec-inspection-agent.md
---
tools: Read, Grep, Glob, Write, Bash, Task
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更
# Writeはレポート出力に必要
# Bashはビルド・テスト実行に必要
```

#### Steering Agent

```yaml
# steering-agent.md
---
tools: Read, Write, Edit, Glob, Grep
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更、Bashは不要

# steering-custom-agent.md
---
tools: Read, Write, Edit, Glob, Grep
permissionMode: dontAsk
---
# ✅ 改善: 同上
```

#### Debug Agent（特殊）

```yaml
# debug.md
---
tools: Read, Glob, Grep, Bash, mcp__electron__*
permissionMode: dontAsk
---
# ✅ 改善: dontAskに変更、MCPツールも明示
```

### A2.3.1 bypassPermissions vs dontAsk 移行判断

| シナリオ | 推奨 | 理由 |
|----------|------|------|
| 仕様生成（Bashなし） | `dontAsk` | Bash不要、安全に制限可能 |
| 読み取り専用検証 | `dontAsk` | 書き込み不要、安全 |
| 実装（Bash必要） | `dontAsk` | toolsにBash含めれば動作 |
| CI/CD自動実行 | `dontAsk` | 最小権限を明示可能 |
| 緊急デバッグ | `bypassPermissions` | 制限が障害になる場合のみ |

**移行方針**: 全agentを `dontAsk` に統一し、必要なツールを `tools` で明示する。

### A2.4 settings.json 推奨設定（非対話型環境向け）

**重要**: 非対話型環境では `dontAsk` + `tools` による制限が主。
settings.json の `deny` は**最終防衛線**として設定。

#### .claude/settings.json（チーム共有・最終防衛線）

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(sudo rm:*)",
      "Bash(:(){ :|:& };:)",
      "Bash(mkfs:*)",
      "Bash(dd if=/dev/zero:*)",
      "Read(.env)",
      "Read(.env.*)",
      "Write(.env)",
      "Write(.env.*)",
      "Edit(.env)",
      "Edit(.env.*)"
    ],
    "allow": [],
    "ask": []
  }
}
```

**ポイント**:
- `deny` は**絶対に実行させたくない**コマンドのみ（最小限）
- `allow` は空（dontAsk + toolsで制御）
- `ask` は空（非対話型ではプロンプト不可）

#### .claude/settings.local.json（非対話型環境向け・簡素化）

```json
{
  "permissions": {
    "deny": [],
    "allow": []
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["electron", "playwright"]
}
```

**ポイント**:
- `allow` は不要（dontAsk + toolsで制御するため）
- MCPサーバー設定のみ残す
- **現在の170以上のallowルールは削除可能**

---

## A3. Claude起動時オプション推奨（非対話型環境向け）

### A3.1 非対話型環境での基本方針

```
┌─────────────────────────────────────────────────────────────┐
│ 非対話型環境での権限制御フロー                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Agent定義の tools フィールド  → ツール使用可能範囲      │
│  2. Agent定義の permissionMode    → dontAsk（自動deny）    │
│  3. settings.json の deny         → 最終防衛線            │
│                                                             │
│  ⚠️ CLI の --allowedTools は dontAsk/bypassPermissions で  │
│     効かないバグあり → 依存しない                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### A3.2 Subagent起動（Task tool経由）

```typescript
// Slash Commandからsubagentを起動
Task(
  subagent_type="spec-design-agent",
  mode="dontAsk",  // ← 非対話型向け
  prompt="..."
)
```

**注意**: subagentの`permissionMode`はagent定義ファイルで設定。
親がdontAskでも子は独自設定を持てる。

### A3.3 CLI直接起動（非対話型）

```bash
# ✅ 推奨: dontAskモード
claude -p "generate requirements" --permission-mode dontAsk

# ⚠️ dontAskでは--allowedToolsが効く可能性あり（要検証）
claude -p "generate requirements" \
  --permission-mode dontAsk \
  --allowedTools "Read,Write,Edit,Glob,Grep"

# 🔄 代替: bypassPermissions + disallowedTools（バグ回避）
claude -p "generate requirements" \
  --permission-mode bypassPermissions \
  --disallowedTools "Bash"
```

### A3.4 SDK使用時

```python
from claude_code_sdk import ClaudeCode

# ✅ 推奨: dontAskモード
claude = ClaudeCode(
    permission_mode="dontAsk",
    allowed_tools=["Read", "Write", "Edit", "Glob", "Grep"],
    max_turns=50,
)

# 🔄 代替: bypassPermissions + disallowedTools
claude = ClaudeCode(
    permission_mode="bypassPermissions",
    disallowed_tools=["Bash"],
    max_turns=50,
)
```

### A3.5 Electron SDD Manager からの起動

```typescript
// spec-manager profile（非対話型）
const claudeArgs = [
  "--permission-mode", "dontAsk",
  // toolsはagent定義で制御、CLIオプションは最小限
];

// 実装フェーズ（Bash必要）
const implArgs = [
  "--permission-mode", "dontAsk",
  "--allowedTools", "Read,Write,Edit,MultiEdit,Glob,Grep,Bash",
];
```

### A3.6 フェーズ別推奨設定

| フェーズ | permissionMode | tools（Agent定義） | CLIオプション |
|----------|---------------|-------------------|---------------|
| Requirements | dontAsk | Read, Write, Edit, Glob, WebSearch, WebFetch | なし |
| Design | dontAsk | Read, Write, Edit, Glob, Grep, WebSearch, WebFetch | なし |
| Tasks | dontAsk | Read, Write, Edit, Glob, Grep | なし |
| Validation | dontAsk | Read, Grep, Glob | なし |
| Implementation | dontAsk | Read, Write, Edit, MultiEdit, Glob, Grep, **Bash** | なし |
| Inspection | dontAsk | Read, Grep, Glob, Write, **Bash**, Task | なし |
| Bug Fix | dontAsk | Read, Write, Edit, Glob, Grep, **Bash** | なし |

---

## A4. 優先度別アクションアイテム（非対話型環境向け）

### 高優先度（即時対応）

| # | 項目 | 対象ファイル | 内容 |
|---|------|-------------|------|
| 1 | **全Agentを`dontAsk`に移行** | `.claude/agents/kiro/*.md` | `permissionMode: bypassPermissions` → `dontAsk` |
| 2 | settings.jsonにdenyルール追加 | `.claude/settings.json` | 最終防衛線として破壊的コマンドを禁止 |
| 3 | settings.local.json簡素化 | `.claude/settings.local.json` | 170以上のallowルールを削除（不要） |
| 4 | spec-inspection commandとagent分離 | `.claude/commands/kiro/spec-inspection.md` | command/agent定義の混在を解消 |

### 中優先度（安定化）

| # | 項目 | 対象ファイル | 内容 |
|---|------|-------------|------|
| 5 | spec-tasks commandとagent分離 | `.claude/commands/kiro/spec-tasks.md` | command/agent定義の混在を解消 |
| 6 | Slash commandのallowed-tools整理 | 各command/*.md | 必要最小限のツールに絞る |
| 7 | release.mdにfrontmatter追加 | `.claude/commands/release.md` | 明示的なツール制限を追加 |

### 低優先度（改善）

| # | 項目 | 対象ファイル | 内容 |
|---|------|-------------|------|
| 8 | spec-status.mdの権限削減 | `.claude/commands/kiro/spec-status.md` | 読み取り専用に |
| 9 | bug-status.mdにfrontmatter追加 | `.claude/commands/kiro/bug-status.md` | 明示的設定を追加 |

---

## A5. 既知のバグへの対応方針（非対話型環境向け）

| バグ | 影響 | 非対話型での対応方針 |
|------|------|---------------------|
| `--allowedTools`がbypassPermissionsで無視 | ツール制限が効かない | ✅ **dontAsk + tools フィールドで解決** |
| `--disallowedTools`がMCPツールに効かない | MCPツールがブロックできない | ⚠️ Agent定義のtoolsフィールドで制御 |
| Built-in Plan agentが権限継承しない | 繰り返し確認 | ✅ **非対話型ではPlan agentを使用しない** |
| Subagent権限継承問題（MCP Server Mode） | Task機能が使えない | ✅ **CLI直接起動なら問題なし** |
| 親のbypassPermissionsがsubagentに継承 | 子も強制bypass | ✅ **dontAskなら継承されない** |

### dontAskモードによるバグ回避

```
bypassPermissions の問題:
├── --allowedTools が効かない（バグ #12232）
├── 親がbypassなら子も強制bypass（仕様）
└── 全ツールが使用可能（セキュリティリスク）

dontAsk の利点:
├── tools フィールドでホワイトリスト制御
├── --allowedTools も効く可能性（要検証）
├── 権限プロンプトは自動deny（非対話型対応）
└── bypassPermissionsより安全
```

---

## A6. 移行手順

### Step 1: Agent定義の更新

```bash
# 全agentのpermissionModeを一括変更
for f in .claude/agents/kiro/*.md; do
  sed -i '' 's/permissionMode: bypassPermissions/permissionMode: dontAsk/g' "$f"
done
```

### Step 2: settings.json更新

```bash
# .claude/settings.json に deny ルールを追加
cat > .claude/settings.json << 'EOF'
{
  "permissions": {
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(sudo rm:*)",
      "Read(.env)",
      "Read(.env.*)",
      "Write(.env)",
      "Edit(.env)"
    ],
    "allow": [],
    "ask": []
  }
}
EOF
```

### Step 3: settings.local.json簡素化

```bash
# 大量のallowルールを削除
cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "deny": [],
    "allow": []
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": ["electron", "playwright"],
  "hooks": {
    "Notification": [{"hooks": [{"type": "command", "command": "afplay /System/Library/Sounds/Ping.aiff"}]}],
    "Stop": [{"hooks": [{"type": "command", "command": "afplay /System/Library/Sounds/Hero.aiff"}]}]
  }
}
EOF
```

### Step 4: 動作検証

```bash
# 非対話型でのテスト
claude -p "read CLAUDE.md and summarize" --permission-mode dontAsk

# Agent経由でのテスト
# Electron SDD Manager から各フェーズを実行し、権限エラーが出ないことを確認
```

---

**附録 最終更新**: 2026年1月24日
