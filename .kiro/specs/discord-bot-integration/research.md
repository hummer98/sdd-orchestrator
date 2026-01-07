# Research & Design Decisions

---
**Purpose**: Discord Bot統合機能の技術設計に向けた調査結果と設計判断を記録する。

**Usage**:
- ディスカバリーフェーズでの調査活動と結果をログ化
- `design.md`には詳細すぎる設計判断のトレードオフを文書化
- 将来の監査や再利用のための参照と根拠を提供
---

## Summary
- **Feature**: `discord-bot-integration`
- **Discovery Scope**: New Feature（新規外部依存関係、複雑な統合）
- **Key Findings**:
  - Discord.js v14はSlash Commands、Buttons、Modalsをネイティブサポート
  - メッセージ編集レート制限は5回/5秒/チャンネル（ストリーミング設計に影響）
  - Electron safeStorage APIがToken暗号化の推奨ソリューション

## Research Log

### Discord.js v14 Slash Commands

- **Context**: Discordから`/sdd`コマンドを受信し、Claude Codeに転送する機能の実現方法
- **Sources Consulted**:
  - [Discord.js Guide - Creating Slash Commands](https://discordjs.guide/creating-your-bot/slash-commands.html)
  - [Discord.js Guide - Command Deployment](https://discordjs.guide/creating-your-bot/command-deployment)
  - [Mastering Discord.js v14](https://blog.geotechinfo.net/mastering-discord-js-v14-a-guide-to-building-bots-with-slash-commands-integration-380c0312811f)
- **Findings**:
  - Slash Commandsは`SlashCommandBuilder`で定義し、REST APIで登録
  - Guild-specific登録（開発用）とGlobal登録（本番用）の2種類
  - Interactionは3秒以内に応答必須（`deferReply()`でストリーミング対応可能）
  - `ephemeral: true`でユーザーのみに見えるメッセージを送信可能
- **Implications**:
  - `/sdd`コマンドは単一のSlash Commandとして登録
  - Claude Code応答待ちには`deferReply()`を使用し、`editReply()`でストリーミング更新

### Discord.js v14 Button Components

- **Context**: AskQuestion対応でDiscordボタンUIを実装する方法
- **Sources Consulted**:
  - [Discord.js Guide - Component Interactions](https://discordjs.guide/interactive-components/interactions.html)
  - [Discord.js Guide - Buttons](https://v13.discordjs.guide/interactions/buttons)
- **Findings**:
  - v14では`MessageButton` → `ButtonBuilder`にリネーム
  - `ActionRowBuilder`で最大5つのボタンを1行に配置
  - `ComponentType.Button`でcollector設定
  - ボタン応答は`update()`でメッセージを編集、または`reply()`で新規応答
  - タイムアウトは`awaitMessageComponent()`の`time`オプションで設定
- **Implications**:
  - AskQuestionの選択肢はボタンとして動的に生成
  - 5分タイムアウトを設定し、期限切れ時はボタン無効化

### Discord.js Modals（テキスト入力）

- **Context**: AskQuestionがテキスト入力を要求する場合のUI
- **Sources Consulted**:
  - [Discord.js Guide - Modals](https://discordjs.guide/interactions/modals)
  - [Discord.JS Modals Explained](https://wornoffkeys.medium.com/discord-js-modals-e70e6bd30d9c)
- **Findings**:
  - `ModalBuilder` + `TextInputBuilder`で構築
  - ActionRowあたり1つのTextInput、最大5行
  - `TextInputStyle.Short`（1行）と`TextInputStyle.Paragraph`（複数行）
  - **重要**: モーダル表示は最初の応答でなければならない（`deferReply()`後は不可）
- **Implications**:
  - テキスト入力が必要な場合は、ボタンクリック後にモーダルを表示
  - ボタン応答時に`showModal()`を呼び出す設計

### メッセージ編集レート制限

- **Context**: Claude Code応答をストリーミングでDiscordに表示する際の制限
- **Sources Consulted**:
  - [Discord API Rate Limits](https://discord.com/developers/docs/topics/rate-limits)
  - [Discord API Rate Limiting Guide](https://stateful.com/blog/discord-rate-limiting)
  - [Rate Limits & API Optimization](https://deepwiki.com/discordjs/discord.js/5.3-rate-limits-and-api-optimization)
- **Findings**:
  - グローバル: 50リクエスト/秒
  - サーバー別: 5リクエスト/5秒
  - メッセージ編集も同様のレート制限
  - Discord.jsは自動的にレート制限をキュー管理
  - 429エラー時は`X-RateLimit-Reset-After`ヘッダーで待機時間取得
- **Implications**:
  - ストリーミング更新間隔は最低1秒（要件6.2準拠）
  - 実装では1.5秒間隔を推奨（安全マージン）
  - Discord.jsのビルトインレート制限ハンドリングを活用

### Token暗号化（safeStorage vs keytar）

- **Context**: Bot Tokenを安全にローカル保存する方法
- **Sources Consulted**:
  - [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
  - [How to securely store sensitive information with node-keytar](https://cameronnokes.com/blog/how-to-securely-store-sensitive-information-in-electron-with-node-keytar/)
  - [Replacing Keytar with Electron's safeStorage](https://freek.dev/2103-replacing-keytar-with-electrons-safestorage-in-ray)
- **Findings**:
  - **safeStorage**（Electron 15+）:
    - ネイティブ依存なし、Electron組み込み
    - macOS: Keychain Access使用、他アプリからアクセス不可
    - Windows: DPAPI使用、同一ユーザーのみ復号可能
    - Linux: シークレットストア依存（利用不可の場合はフォールバック）
  - **keytar**:
    - ネイティブモジュール、ビルド必要
    - Electron 15以降はsafeStorageで代替可能
    - atom/node-keytarはアーカイブ済み
- **Implications**:
  - Electron safeStorage APIを使用（追加依存なし）
  - electron-storeと組み合わせて暗号化済みトークンを保存
  - 環境変数優先のフォールバック設計

### 既存アーキテクチャ分析

- **Context**: SDD Orchestratorの既存パターンとの統合方法
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/agentProcess.ts`
  - `electron-sdd-manager/src/main/ipc/channels.ts`
  - `electron-sdd-manager/src/preload/index.ts`
- **Findings**:
  - AgentProcessパターン: spawn → イベントハンドラ → 出力コールバック
  - IPCパターン: channels.ts定義 → handlers.ts実装 → preload公開
  - Zustandストア: renderer側状態管理
  - electron-store: 設定永続化（既存）
  - safeStorage: 未使用（新規導入）
- **Implications**:
  - DiscordBotServiceは既存AgentProcessパターンを参考に設計
  - Discord APIとの通信層を独立サービスとして分離
  - 既存のIPC/preloadパターンに従って統合

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Single Service | DiscordBotServiceが全責務を担当 | シンプル、依存少 | 肥大化リスク、テスト困難 | 小規模機能向け |
| Layered Services | Bot管理、メッセージング、Claude連携を分離 | 責務分離、テスト容易 | 複雑性増加 | 推奨 |
| Event-Driven | イベントバスで疎結合 | 拡張性高 | 過剰設計、デバッグ困難 | 将来拡張向け |

**Selected**: Layered Services
- DiscordBotService: Bot起動/停止、接続管理
- DiscordMessageService: メッセージ送受信、ストリーミング
- DiscordInteractionHandler: ボタン/モーダル処理
- ClaudeCodeBridge: Claude Codeプロセスとの連携

## Design Decisions

### Decision: Bot Token優先順位

- **Context**: Token設定の柔軟性と運用利便性のバランス
- **Alternatives Considered**:
  1. 環境変数のみ — CI/CD向けだがデスクトップアプリでは不便
  2. アプリ設定のみ — シンプルだが複数プロジェクト対応不可
  3. 三段階優先順位 — 環境変数 > プロジェクト設定 > アプリ全体設定
- **Selected Approach**: 三段階優先順位
- **Rationale**: 開発/本番/複数プロジェクトの各ユースケースに対応可能
- **Trade-offs**: 設定の複雑性増加（どこで設定されているか分かりにくい可能性）
- **Follow-up**: UI上で「現在有効なToken源」を表示する

### Decision: ストリーミング更新間隔

- **Context**: Discord API制限とユーザー体験のバランス
- **Alternatives Considered**:
  1. 0.5秒間隔 — レスポンシブだがレート制限リスク高
  2. 1秒間隔（要件最小値） — ギリギリでリスクあり
  3. 1.5秒間隔 — 安全マージン確保
  4. 2秒間隔 — 安全だがユーザー体験低下
- **Selected Approach**: 1.5秒間隔（設定可能）
- **Rationale**: レート制限5回/5秒に対して約3回/5秒で十分な余裕
- **Trade-offs**: 応答がやや遅く感じる可能性
- **Follow-up**: メトリクス収集でレート制限発生率を監視

### Decision: Token暗号化方式

- **Context**: Bot Token保存時のセキュリティ確保
- **Alternatives Considered**:
  1. node-keytar — ネイティブモジュール、ビルド複雑
  2. electron-store暗号化 — AES-256-CBCだが整合性保証なし
  3. safeStorage + electron-store — OS統合、追加依存なし
- **Selected Approach**: safeStorage + electron-store
- **Rationale**: Electron組み込み、ネイティブビルド不要、各OSの標準セキュリティ機構使用
- **Trade-offs**: Linux環境でシークレットストア未設定時はセキュリティ低下
- **Follow-up**: Linux環境でのセットアップガイド作成

### Decision: Claude Code連携方式

- **Context**: Discord経由の指示をClaude Codeプロセスに送信する方法
- **Alternatives Considered**:
  1. 新規プロセス起動 — 毎回起動でオーバーヘッド大
  2. 既存AgentProcess再利用 — セッション管理複雑
  3. 専用ProviderAgentProcess — Discord専用セッション管理
- **Selected Approach**: 専用ProviderAgentProcess + AgentRegistryの拡張
- **Rationale**: 既存のAgentProcess/AgentRegistryパターンを活用しつつ、Discord固有の要件（ストリーミング、AskQuestion）に対応
- **Trade-offs**: 既存コードとの重複可能性
- **Follow-up**: 共通部分の抽出とリファクタリング検討

## Risks & Mitigations

- **Discord API接続不安定** — 指数バックオフで最大5回再接続、失敗時はBot停止とUI通知
- **レート制限超過** — Discord.jsの自動キュー管理 + 保守的な更新間隔
- **Token漏洩** — safeStorage暗号化、ログマスク、HTTPS強制
- **Claude Codeプロセスハング** — 既存のハングタイムアウト機構を活用
- **チャンネル競合** — 同一チャンネルID設定時の警告表示

## References

- [Discord.js Guide](https://discordjs.guide/) — 公式ガイド
- [Discord Developer Portal - Rate Limits](https://discord.com/developers/docs/topics/rate-limits) — API制限詳細
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage) — Token暗号化API
- [GitHub - Discord.js v14 Command Handlers](https://github.com/Nathaniel-VFX/Discord.js-v14-Command-Handlers) — 実装参考
