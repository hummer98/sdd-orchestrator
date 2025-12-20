# MCP Server構想

## 概要

SDD OrchestratorをMCP（Model Context Protocol）サーバーとして公開し、外部のAIエージェント（Claude Code、他のAIアシスタント等）からワークフロープロセスを実行可能にする構想。

## 背景・動機

### ユースケース

1. **マルチプロジェクト連携**: 別プロジェクトのClaude CodeからSDD Orchestratorで管理しているプロジェクトのワークフローを実行
2. **AIエージェント間連携**: 複数のAIエージェントが協調してSDDワークフローを進行
3. **自動化パイプライン**: スクリプトやCIからのワークフロートリガー（将来拡張）

### 期待される効果

- AIエージェントがSDDワークフローを**標準プロトコル**で呼び出せる
- Electron UIを介さずにワークフロー実行が可能
- エージェント間の**疎結合な連携**を実現

---

## アーキテクチャ検討

### 検討した選択肢

| 選択肢 | 説明 | メリット | デメリット |
|--------|------|----------|------------|
| **(A) Electron内蔵型** | Electron appのmainプロセス内でMCP Serverをホスト | 既存構造を活用、最小工数 | Electron起動が前提 |
| **(B) スタンドアロン切り出し** | ワークフローエンジンを分離し、CLI/MCP/APIで提供 | ヘッドレス運用可能 | 大規模リファクタリング |
| **(C) ハイブリッド** | 両方サポート | 柔軟性最大 | 複雑性増大 |

### 選定: **(A) Electron内蔵型**

**理由:**
- 主要ユースケース（AIエージェント連携）では、開発者がElectronでプロジェクトを開いている状態が自然
- `SpecManagerService`は既にElectron非依存で設計されており、追加の抽象化不要
- 既存のWebSocketハンドラーと同じパターンで実装可能
- ヘッドレス運用が必要になった場合、この設計からの切り出しは容易

```
┌─────────────────────────────────────────────────────────┐
│ Electron App (SDD Orchestrator)                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ IPC Handlers │  │ WebSocket    │  │ MCP Server   │  │ ← 新規追加
│  │ (UI用)       │  │ (モバイル用) │  │ (AI連携用)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         ▼                 ▼                 ▼          │
│  ┌─────────────────────────────────────────────────┐   │
│  │           SpecManagerService                    │   │
│  │  (既存のワークフローエンジン - 変更なし)         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 現状分析

### SpecManagerServiceの依存関係

`SpecManagerService`はElectronに**直接依存していない**。

```typescript
// Electron依存のあるサービス（少数）
import { app } from 'electron'; // logger.ts のみ
import type { WebContents } from 'electron'; // commandService.ts
```

`logger.ts`の`app`依存は、ログディレクトリ取得のためであり、環境変数やコンストラクタ引数で置換可能。

### 既存のWorkflowControllerインターフェース

WebSocketハンドラー用に定義済みのインターフェースがMCP Toolにほぼそのまま使える：

```typescript
// electron-sdd-manager/src/main/services/webSocketHandler.ts

interface WorkflowController {
  executePhase(specId: string, phase: string): Promise<WorkflowResult<AgentInfo>>;
  stopAgent(agentId: string): Promise<WorkflowResult<void>>;
  resumeAgent(agentId: string): Promise<WorkflowResult<AgentInfo>>;
  autoExecute?(specId: string): Promise<WorkflowResult<AgentInfo>>;
  sendAgentInput?(agentId: string, text: string): Promise<WorkflowResult<void>>;
}
```

---

## 提案するMCP Tools

### 基本操作

| Tool名 | 説明 | 入力 |
|--------|------|------|
| `sdd_list_specs` | プロジェクト内の仕様一覧取得 | `projectPath?` |
| `sdd_get_spec` | 仕様の詳細取得 | `specId` |
| `sdd_get_spec_status` | 仕様の進捗状況取得 | `specId` |

### ワークフロー実行

| Tool名 | 説明 | 入力 |
|--------|------|------|
| `sdd_spec_init` | 新規仕様初期化 | `projectPath`, `description` |
| `sdd_execute_phase` | フェーズ実行 | `specId`, `phase` |
| `sdd_execute_validation` | バリデーション実行 | `specId`, `validationType` |
| `sdd_execute_task_impl` | タスク実装実行 | `specId`, `taskId` |

### Agent管理

| Tool名 | 説明 | 入力 |
|--------|------|------|
| `sdd_list_agents` | 実行中Agent一覧 | `specId?` |
| `sdd_stop_agent` | Agent停止 | `agentId` |
| `sdd_resume_agent` | Agent再開 | `agentId` |
| `sdd_get_agent_log` | Agentログ取得 | `agentId` |

### バグワークフロー

| Tool名 | 説明 | 入力 |
|--------|------|------|
| `sdd_bug_create` | バグレポート作成 | `name`, `description` |
| `sdd_bug_analyze` | バグ分析実行 | `bugName` |
| `sdd_bug_fix` | バグ修正実行 | `bugName` |
| `sdd_bug_verify` | バグ検証実行 | `bugName` |

---

## 実装方針

### Phase 1: 基盤構築

1. **MCPサーバーモジュール作成** (`src/main/services/mcpServer.ts`)
2. **Stdio/HTTP-SSEトランスポート対応**
3. **基本Tools実装** (list_specs, get_spec, execute_phase)

### Phase 2: 完全なWorkflow対応

1. **全フェーズのTool実装**
2. **Agent管理Tools実装**
3. **ログ取得機能**

### Phase 3: 認証・セキュリティ

1. **ローカルのみ/認証トークン対応**
2. **レート制限**
3. **監査ログ**

---

## 技術的考慮事項

### MCPサーバーの起動方式

| 方式 | 説明 | ユースケース |
|------|------|-------------|
| **Stdio** | 標準入出力 | Claude Codeからの直接呼び出し |
| **HTTP/SSE** | HTTPサーバー | 複数クライアント、Web連携 |

推奨: **Stdio**をメインとし、必要に応じてHTTP/SSEも追加。

### プロジェクトコンテキスト

MCPクライアントからの呼び出し時、プロジェクトパスの扱い：

1. **Electron起動時のプロジェクト**: デフォルトとして使用
2. **Tool引数で指定**: 明示的なプロジェクト指定をサポート

### 非同期ワークフローの扱い

SDDワークフローは長時間実行のため：

1. Tool呼び出しは**Agent起動**で即座にreturn
2. 進捗確認は`get_agent_log`や`get_spec_status`で取得
3. ストリーミングは将来拡張（MCP Resourcesとして検討）

---

## 将来の拡張可能性

### ヘッドレス運用への拡張

Electron内蔵型で始めた場合でも、以下の手順で切り出し可能：

1. `logger.ts`のElectron依存を環境変数化
2. `SpecManagerService`を独立npmパッケージ化
3. CLIエントリーポイント追加
4. MCPサーバーをスタンドアロン起動可能に

### MCP Resources対応

- 仕様ドキュメント（requirements.md, design.md等）をResourceとして公開
- リアルタイムログストリームをResource subscriptionで配信

---

## 関連ドキュメント

- [Workflow DSL構想](./workflow-dsl.md)
- [WebSocketHandler実装](../../electron-sdd-manager/src/main/services/webSocketHandler.ts)
- [SpecManagerService](../../electron-sdd-manager/src/main/services/specManagerService.ts)

---

## ステータス

| 項目 | 状態 |
|------|------|
| 構想ステータス | 📝 ドラフト |
| 優先度 | 中 |
| 前提条件 | なし |
| 推定工数 | Phase 1: 中規模、Phase 2-3: 各小〜中規模 |
