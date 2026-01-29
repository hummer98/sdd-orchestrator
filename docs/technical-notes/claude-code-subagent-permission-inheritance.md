# Claude Code サブエージェントのパーミッション継承問題

## 問題

Claude CodeのTaskツールで起動されたサブエージェント（spec-requirements-agentなど）が、親プロセスのファイルシステムパーミッションを継承せず、Write/Edit/Readなどのツール操作が拒否される。

### 具体的な症状

1. `.claude/settings.local.json`に`Write(**)`などのパーミッションが設定されている
2. `.claude/agents/kiro/spec-requirements.md`にも`tools`の指定がある
3. しかし、Taskツールで起動されたサブエージェントがファイル操作を試みると以下のエラーが発生：
   ```
   Claude requested permissions to write to /path/to/file.md, but you haven't granted it yet.
   ```
4. エージェントの実行自体は成功（exit code 0）するが、ファイルへの書き込みが全て失敗する

### 影響範囲

- CC-SDD Workflowの全サブエージェント（spec-requirements、spec-design、spec-tasksなど）
- MCPサーバーモードでの実行
- WindowsおよびWSL環境で特に顕著（macOSでも発生）

## 原因

### GitHub Issue #5465での報告内容

[Task subagents fail to inherit permissions in MCP server mode](https://github.com/anthropics/claude-code/issues/5465)

- **期待される動作**: サブエージェントは親のClaude Codeプロセスのパーミッションを継承すべき（Read、Write、Bashなどの他のツールと同様に追加のパーミッションプロンプトなしで動作すべき）
- **実際の動作**: サブエージェントは継承されたパーミッションなしで起動され、MCPプロトコルを通じて許可できないパーミッションを要求する
- **影響**: Taskツール機能が実質的に使用不可能になる

### エージェント定義ファイルの`tools`設定の限界

`.claude/agents/`内のエージェント定義ファイルでは、YAMLフロントマターで`tools`を指定可能：

```yaml
---
name: spec-requirements-agent
description: Generate requirements
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---
```

**理論上**:
- `tools`フィールドを省略すると、メインスレッドから全てのツール（MCPツールを含む）を継承
- 個別に指定することで、より細かい制御が可能

**現実**:
- このバグのため、定義ファイルで`tools`を指定してもパーミッションは正しく継承されない
- 実行時にパーミッション要求が発生し、MCPインターフェース経由では応答不可

## 関連する問題

### Issue #5140: ユーザーレベルsettings.jsonが適用されない

[permissions from user settings.json is NOT applied at project level](https://github.com/anthropics/claude-code/issues/5140)

- ユーザーレベル（`~/.claude/settings.json`）のパーミッションが、コマンド実行時に適用されない
- `/permissions`コマンドでは読み込まれているように見えるが、実際には機能しない
- プロジェクトレベル（`.claude/settings.local.json`）に配置すると正常動作

### Issue #13340: グローバル/ローカルsettings.jsonのallowが尊重されない

[global/local settings.json allow permissions are not respected by Claude Code](https://github.com/anthropics/claude-code/issues/13340)

- settings.jsonに記載されたパーミッションがClaude Codeによって尊重されない
- 既に許可済みの操作でも再度パーミッション要求が発生

### Issue #6850: settings.local.jsonのallowが機能しない

[settings.local.json allow not working - keeps asking and wanting to add existing items again](https://github.com/anthropics/claude-code/issues/6850)

- 既に`settings.local.json`に保存されているコマンドでも、Claude Codeが再度パーミッションを要求
- 同じフォーマットで再度追加するよう提案される

### Issue #5456: サブエージェントがモデル設定を継承しない

[Sub-agents Don't Inherit Model Configuration in Task Tool](https://github.com/anthropics/claude-code/issues/5456)

- サブエージェントが設定されたモデルを継承せず、デフォルトモデルで動作
- パーミッション以外にも、サブエージェントの起動メカニズムに根本的な継承問題がある

## 現在の回避策

### 短期的な対応

**唯一の回避策**: Taskツールを完全に避け、個別のツール（Read、Write、Bashなど）を使用して手動で操作を実行する

```typescript
// サブエージェントを使わない実装例
// Before: Task toolでサブエージェントを起動
await agent.runTask({
  subagent_type: 'spec-requirements-agent',
  prompt: 'Generate requirements...'
});

// After: メインエージェントで直接操作
const content = await generateRequirements(); // ロジックをメインエージェントに実装
await fs.writeFile('requirements.md', content);
```

### 中期的な対応

1. Claude Code開発チームによるバグ修正を待つ
2. GitHub Issueをフォローして進捗を確認
3. 必要に応じてIssueにコメントして影響範囲を報告

### 代替案: Electronアプリ側での直接ファイル操作

CC-SDD Workflowのような統合環境では、エージェント実行後にElectronアプリ側でファイル操作を行う仕組みを検討：

```typescript
// Electronアプリ側でファイル操作を代行
async function runAgentWithFileWrite(
  agentType: string,
  outputPath: string
) {
  // エージェントを実行（パーミッション問題で書き込み失敗）
  const result = await runAgent(agentType);

  // エージェントの出力をパースして取得
  const content = parseAgentOutput(result);

  // Electronアプリのファイルシステムアクセスで直接書き込み
  await fs.writeFile(outputPath, content);
}
```

**課題**:
- エージェントの出力からファイル内容を抽出する必要がある
- 複数ファイルの更新が必要な場合、パース処理が複雑になる
- エージェントとアプリの責務分離が不明瞭になる

## 検証方法

### パーミッション設定の確認

```bash
# プロジェクトレベルのパーミッション確認
cat .claude/settings.local.json

# エージェント定義の確認
cat .claude/agents/kiro/spec-requirements.md
```

### エージェント実行ログの確認

```bash
# 最新のエージェントログを確認
cat .kiro/specs/{spec-name}/logs/agent-*.log | grep -A 5 "requested permissions"
```

エラーメッセージ例：
```
Claude requested permissions to write to /Users/yamamoto/git/firex/.kiro/specs/firestore-cli-tool/requirements.md, but you haven't granted it yet.
```

### 回避策の動作確認

サブエージェントを使わずに直接操作を実装し、正常にファイルが更新されることを確認。

## 参考リンク

### 公式ドキュメント

- [Subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Handling Permissions - Claude Docs](https://platform.claude.com/docs/en/agent-sdk/permissions)
- [Permission Model in Claude Code](https://skywork.ai/blog/permission-model-claude-code-vs-code-jetbrains-cli/)

### GitHub Issues

- [#5465: Task subagents fail to inherit permissions in MCP server mode](https://github.com/anthropics/claude-code/issues/5465) - **メイン問題**
- [#5140: permissions from user settings.json is NOT applied at project level](https://github.com/anthropics/claude-code/issues/5140)
- [#13340: global/local settings.json allow permissions are not respected](https://github.com/anthropics/claude-code/issues/13340)
- [#6850: settings.local.json allow not working](https://github.com/anthropics/claude-code/issues/6850)
- [#5456: Sub-agents Don't Inherit Model Configuration](https://github.com/anthropics/claude-code/issues/5456)
- [#6631: Permission Deny Configuration Not Enforced for Read/Write Tools](https://github.com/anthropics/claude-code/issues/6631)

### コミュニティ記事

- [Practical guide to mastering Claude Code's main agent and Sub-agents](https://jewelhuq.medium.com/practical-guide-to-mastering-claude-codes-main-agent-and-sub-agents-fd52952dcf00)
- [Understanding Claude Code Permissions and Security Settings](https://www.petefreitag.com/blog/claude-code-permissions/)
- [Best practices for Claude Code subagents](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)

## 影響を受けるファイル

### CC-SDD Workflow

- `.claude/agents/kiro/spec-requirements.md`
- `.claude/agents/kiro/spec-design.md`
- `.claude/agents/kiro/spec-tasks.md`
- `.claude/agents/kiro/spec-tdd-impl-agent.md`
- その他全てのサブエージェント定義ファイル

### Electronアプリ

- `electron-sdd-manager/src/main/services/agentProcess.ts` - エージェント実行処理
- `electron-sdd-manager/src/main/services/fileService.ts` - ファイル操作処理

## 実験による検証結果（2026-01-29）

### 実験環境

- Claude Code version: 2.1.22
- テストプロジェクト: orcking（`.claude/agents/kiro/*.md` に `permissionMode: dontAsk` 設定済み）

### 実験1: CLI起動時のpermissionMode決定

```bash
# 引数なしで起動
claude -p "echo 'test'" --output-format stream-json --verbose 2>&1 | head -1 | jq '{permissionMode}'
# 結果: {"permissionMode": "default"}

# --permission-mode dontAsk を指定
claude -p "echo 'test'" --output-format stream-json --verbose --permission-mode dontAsk 2>&1 | head -1 | jq '{permissionMode}'
# 結果: {"permissionMode": "dontAsk"}
```

**結論**: エージェント定義ファイル（`.claude/agents/kiro/*.md`）の `permissionMode` は、**CLI起動時には適用されない**。CLI引数で明示的に指定する必要がある。

### 実験2: dontAskモードでのサブエージェントWrite操作

```bash
claude -p "Use the spec-design-agent to create a test file at /tmp/claude-test-123.txt" \
  --permission-mode dontAsk --output-format stream-json --verbose
```

**結果**:
```
Permission to use Write has been denied.
Permission to use Bash has been denied.
```

`dontAsk` モードでは、サブエージェントが `tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch` を持っていても、Write/Bashが自動的にdenyされる。

### 実験3: bypassPermissionsモードでのサブエージェントWrite操作

```bash
claude -p "Use the spec-design-agent to create a test file at /tmp/claude-test-456.txt" \
  --permission-mode bypassPermissions --output-format stream-json --verbose
```

**結果**: **成功** - ファイルが作成された

### 実験結果まとめ

| 親プロセス permissionMode | サブエージェント Write/Bash |
|--------------------------|---------------------------|
| `default`（引数なし）     | 権限プロンプト発生（非対話型では応答不可） |
| `dontAsk`               | **自動deny**（エージェント定義のtools無視） |
| `bypassPermissions`     | **成功** |

### 実験4: エージェント定義の `permissionMode: bypassPermissions` が適用されるか

エージェント定義を一時的に `permissionMode: bypassPermissions` に変更し、親プロセスが `default` モードのときにサブエージェントが書き込めるかテスト。

```bash
# spec-design.md を permissionMode: bypassPermissions に変更後
claude -p "You MUST use the Task tool to invoke spec-design-agent. Ask it to create /tmp/claude-test-abc.txt" \
  --output-format stream-json --verbose
```

**結果**: **成功** - サブエージェントがファイルを作成できた

ログから確認された動作：
- 親プロセス: `"permissionMode":"default"`
- サブエージェントがWriteツールを使用: `"content":"File created successfully at: /tmp/claude-test-abc.txt"`
- `permission_denials: []`（権限エラーなし）

### 結論

| 親プロセス permissionMode | エージェント定義 permissionMode | サブエージェント Write |
|--------------------------|-------------------------------|----------------------|
| `default` | `dontAsk` | **失敗**（権限プロンプト発生、非対話型で応答不可） |
| `default` | `bypassPermissions` | **成功** ✅ |
| `dontAsk` | `dontAsk` | **失敗**（自動deny） |
| `bypassPermissions` | `dontAsk` | **成功** ✅（親の `bypassPermissions` が優先） |

**重要な発見**:

1. **エージェント定義の `permissionMode` はサブエージェント起動時に適用される**
2. **`bypassPermissions` を設定すれば、親が `default` でもサブエージェントは書き込み可能**
3. **`dontAsk` では Write/Bash が常に失敗する**（`tools` フィールドに含まれていても）
4. **`tools` フィールドは使用可能ツールの「制限」であり、`allow` ルールの「代替」ではない**
5. **`dontAsk` モードでは `settings.json` の `allow` ルールがないツールは自動deny**される（`tools` フィールドは無関係）

### 推奨設定

サブエージェントでファイル操作が必要な場合：

```yaml
---
name: spec-design-agent
permissionMode: bypassPermissions  # ← dontAsk ではなく bypassPermissions
tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch
---
```

または、親プロセスを `--permission-mode bypassPermissions` で起動する。

### permission-control-refactoring Spec の評価

permission-control-refactoringの設計（requirements.md, design.md）と今回の実験結果を照らし合わせた分析。

**設計の前提（Design Decision DD-001）**:
```
Decision: Agent定義でpermissionMode: dontAsk + toolsフィールドによる明示的制御を採用
Rationale: dontAskモードではtoolsフィールドに含まれないツールは自動的にdenyされる
```

**今回の実験で判明した事実**:

| 設計の想定 | 実験結果 | 評価 |
|-----------|---------|------|
| `dontAsk` + `tools: Write` でWriteが使用可能 | **失敗** - Write denied | ❌ 想定と異なる |
| エージェント定義の`permissionMode`がサブエージェントに適用される | **成功** - `bypassPermissions`設定で動作 | ✅ 正しい |
| settings.local.jsonに依存しない | 未検証 | - |

**結論**: permission-control-refactoringの設計は**「`dontAsk` + `tools`で制御できる」という前提に基づいているが、実験ではこの組み合わせでは動作しなかった**。

**考えられる原因**:
1. **`dontAsk`モードの仕様誤解**: `dontAsk`は「許可されていないツールを自動deny」ではなく、「allowルール（settings.json）がないツールは自動deny」かもしれない
2. **`tools`フィールドと`allow`ルールの関係**: `tools`フィールドは使用可能ツールの**制限**（ホワイトリスト）であり、`allow`ルールの**代替**ではない可能性
3. **親プロセスの`permissionMode`の影響**: 親が`default`の場合、サブエージェントの`dontAsk`でも権限プロンプトが発生する

**現在のSDD Orchestrator設定**:

sdd-orchestratorでは現在、全エージェントが `permissionMode: dontAsk` で設定されている（inspection-3.mdで確認）。しかし：

- **SDD OrchestratorからのClaude起動時**に `--permission-mode` は渡されていない
- 親プロセスは `default` モードで起動される
- サブエージェント定義の `dontAsk` は適用されるが、**`dontAsk` + `tools`ではWrite操作が失敗する**

**本当に動いているのか？**:

inspection-3.mdでは「E2Eテスト17件全パス」と報告されているが、今回の実験結果と矛盾する。

**E2Eテストコード（`permission-control.e2e.spec.ts`）を確認した結果**:

テストは以下のみを検証しており、**実際のAgent実行やファイル書き込みは検証していない**：
- `skipPermissions` のデフォルト値が `false` であること
- ストアの値が正しく設定されること
- 多数の `TODO` コメントで「実際のCLI検証は未実装」と記載

```typescript
// テストコードより抜粋
// TODO: Verify actual CLI command generation through agent logs
// This would require:
// 1. Start an agent
// 2. Check agent log file
// 3. Verify --dangerously-skip-permissions is NOT present
```

**結論**: E2Eテストは「skipPermissions=falseでサブエージェントがWriteできる」ことを検証していない。テストがパスしても、実際の動作保証にはならない。

**追加実験: 親プロセスも `dontAsk` で起動**

```bash
claude -p "Use spec-design-agent to create /tmp/claude-test-dontask.txt" \
  --permission-mode dontAsk --output-format stream-json --verbose
```

**結果**: **失敗** - `Permission to use Write has been denied.`

| 親 permissionMode | サブエージェント permissionMode | サブエージェント Write |
|-------------------|-------------------------------|----------------------|
| `default` | `dontAsk` | **失敗**（権限プロンプト発生） |
| `dontAsk` | `dontAsk` | **失敗**（自動deny） |
| `default` | `bypassPermissions` | **成功** |
| `bypassPermissions` | `dontAsk` | **成功** |

**最終結論**: **`dontAsk` モードでは、`tools` フィールドに `Write` があっても、Write操作は常に失敗する。**

permission-control-refactoringの設計前提「`dontAsk` + `tools`で制御できる」は**誤り**であり、サブエージェントでファイル操作を行うには **`permissionMode: bypassPermissions`** が必要。

**推奨対応**:
1. 全エージェント定義を `permissionMode: bypassPermissions` に変更
2. E2Eテストの実行環境を確認（`--dangerously-skip-permissions`が付いている可能性）

### SDD Orchestratorへの影響

現在のSDD Orchestrator（`buildClaudeArgs()`）は `--permission-mode` を渡していないため、親プロセスは常に `default` モードで起動される。

推奨対応：
1. 全エージェント定義を `permissionMode: bypassPermissions` に変更
2. または親プロセス起動時に `--permission-mode bypassPermissions` を追加
3. `--dangerously-skip-permissions` を使用（現在はオプション、最も確実）

## ステータス

- **発見日**: 2025-12-14
- **最終更新**: 2026-01-29
- **バグステータス**: 未修正（Claude Code開発チーム認識済み）
- **緊急度**: 高（CC-SDD Workflowの中核機能に影響）

## 今後の対応

1. ✅ 問題の特定と原因調査
2. ✅ 関連GitHub Issueの収集
3. ✅ 実験による動作検証（2026-01-29）
4. ⏳ 必要に応じてGitHub Issue #5465にコメント追加
5. ⏳ Electronアプリ側での代替実装を検討
6. ⏳ Claude Code開発チームのバグ修正を待つ
