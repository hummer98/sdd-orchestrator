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

## ステータス

- **発見日**: 2025-12-14
- **最終更新**: 2025-12-15
- **バグステータス**: 未修正（Claude Code開発チーム認識済み）
- **緊急度**: 高（CC-SDD Workflowの中核機能に影響）

## 今後の対応

1. ✅ 問題の特定と原因調査
2. ✅ 関連GitHub Issueの収集
3. ⏳ 必要に応じてGitHub Issue #5465にコメント追加
4. ⏳ Electronアプリ側での代替実装を検討
5. ⏳ Claude Code開発チームのバグ修正を待つ
