# Research & Design Decisions: GitHub Issue Integration

## Summary

- **Feature**: `github-issue-integration`
- **Discovery Scope**: Complex Integration
- **Key Findings**:
  - Electron `safeStorage` APIはOSキーチェーン統合によるPAT暗号化に最適
  - GitHub REST API v3は十分な機能を提供、GraphQL v4は本件では不要
  - 既存Bugワークフローの廃止範囲は広い（12 tRPCプロシージャ、6 CLIコマンド、4サービス、複数UI）が構造的に独立しており安全に削除可能

## Research Log

### Electron safeStorage API調査

- **Context**: PATの安全な保存方法の選定
- **Sources Consulted**:
  - [Electron safeStorage公式ドキュメント](https://www.electronjs.org/docs/latest/api/safe-storage)
  - [electron/electron GitHub](https://github.com/electron/electron/blob/main/docs/api/safe-storage.md)
- **Findings**:
  - `safeStorage.encryptString(plaintext)` → Buffer、`safeStorage.decryptString(buffer)` → string
  - macOS: Keychain、Windows: DPAPI、Linux: Secret Service (kwallet/gnome-libsecret)
  - `safeStorage.isEncryptionAvailable()` で事前チェック可能
  - AES-128 CBC暗号化
  - `app.whenReady()` 後にのみ使用可能（`app.isReady()` チェック必要）
  - 暗号化済みBufferの保存にはBase64エンコードしてelectron-storeに格納するパターンが推奨
- **Implications**:
  - 暗号化済みトークンは `configStore`（electron-store）に保存
  - キーは `github.tokens.{projectPathHash}` 形式
  - GitHub Enterprise URLは暗号化不要（平文で保存）

### GitHub REST API v3 vs GraphQL v4

- **Context**: Issue/PR操作に最適なAPIバージョンの選定
- **Findings**:
  - REST API v3: シンプル、十分なIssue/PR/Label CRUD
  - GraphQL v4: より効率的なクエリ可能だが、本件の要件（Issue一覧、詳細、コメント、Label操作）ではREST v3で十分
  - REST v3のレート制限: 5000 requests/hour（authenticated）
  - Issue一覧: `GET /repos/{owner}/{repo}/issues` — PRも含まれるため `pull_request` フィールドでフィルタ必要
- **Implications**: REST API v3を採用。GraphQLは将来の最適化オプションとして保留

### gh CLI vs 直接HTTP通信

- **Context**: Slash CommandsからのGitHub API操作方法
- **Findings**:
  - `gh` CLI: GitHub公式ツール、認証管理内蔵、JSON出力対応（`--json`）
  - `gh` CLIは開発者環境に高確率でインストール済み
  - `gh api` コマンドで任意のAPIエンドポイントを呼び出し可能
  - `gh issue view`, `gh pr create` 等の高レベルコマンドあり
  - GitHub Enterprise対応: `GH_HOST` 環境変数で切り替え可能
- **Implications**: Slash Commandsは `gh` CLI使用。UIからのAPI操作はNode.js `fetch`/`https` を使用し `gh` CLI非依存

### 既存Bugワークフロー廃止範囲の調査

- **Context**: 安全な削除のための依存関係マッピング
- **Findings**:
  - **tRPC**: `bugRouter` に12プロシージャ。`appRouter` から参照
  - **Services**: `bugService`, `bugWorkflowService`, `bugsWatcherService`, `convertBugWorktreeService`, `bugWorkflowInstaller` — すべて独立モジュール
  - **Stores**: `bugStore`（shared）, `bugAutoExecutionStore`（shared）— 他storeからの参照は `agentStore` のentityIdパターンのみ
  - **UI**: `BugPane`, `BugActionButtons`, `BugWorkflowView`, `CreateBugDialog` — `DocsTabs` から参照
  - **CLI**: `commands/bug/` 配下6ファイル — 独立テンプレート
  - **Templates**: `templates/bugs/` — 独立ディレクトリ
  - **Scripts**: `create-bug-worktree.sh`, `merge-bug.sh` — 独立スクリプト
  - **Config**: `sdd-orchestrator.json` の `commandsets.bug` エントリ
  - **Types**: `bug.ts`, `bugJson.ts` — `bugAutoExecution.ts` は store内で定義
  - **WebSocket**: `webSocketHandler.ts` にBug関連メッセージハンドラ
  - **Context DI**: `context.ts` に `bugService` プロパティ
- **Implications**: 依存が一方向であり、順序立てた削除で安全に廃止可能。`agentStore` のentityIdパターン変更のみ注意

### IssueListの設計: Issue vs PR分離

- **Context**: GitHub REST APIの `GET /repos/{owner}/{repo}/issues` はPRも含むため、表示方法を検討
- **Findings**:
  - GitHubのIssueリストAPIではPRも返される（`pull_request` フィールドの有無で判別）
  - PR専用API: `GET /repos/{owner}/{repo}/pulls`
  - UIとしてIssueとPRを分離表示するか、統合表示するか
- **Implications**: UI上はサブタブ（Issues / Pull Requests）で分離表示。データ取得は別APIを使用（PR専用APIからはmerge状態等の詳細情報が取れる）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| GitHub API SSOT | ローカルにデータ保存せずGitHub APIを直接参照 | 常に最新、同期不要 | ネットワーク依存、レート制限 | 採用 |
| ローカルキャッシュ + GitHub同期 | `.kiro/issues/` にローカルコピーを保持 | オフライン対応 | 同期の複雑さ、コンフリクト | 不採用 |
| WebSocket Realtime | GitHub Webhookでリアルタイム更新 | 即座の更新 | Webhook設定が必要、NAT越え問題 | 将来検討 |

## Execution Model Decision

### Considered Approaches

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| CLI Invocation | `gh-issue.sh` 経由で `gh` CLI呼び出し | コンテキスト効率、開発者に馴染み | `gh` CLI依存 |
| MCP Direct Call | MCP tools経由でGitHub API | ツール統合 | コンテキストウィンドウ消費大 |
| Hybrid | UI: Node.js HTTP、Slash Commands: `gh` CLI | 最適な技術を用途別に使い分け | 二重経路の管理 |

### Selected Approach

**Choice**: Hybrid（DD-005）

**Rationale**:
- Slash CommandsはClaude Codeのターミナル環境で動作し、`gh` CLIが最も自然な選択
- UIはElectron Main Processで動作し、Node.js HTTPが最も効率的
- `gh` CLI未インストール環境でもUIは完全に動作

**Implications for design.md**:
- Slash Command定義は `gh-issue.sh` を呼び出す形式
- tRPCルーターは `GitHubApiService`（Node.js HTTP）を使用
- 両経路で `GITHUB_TOKEN` 環境変数によるトークン共有が可能

## Risks & Mitigations

- **Risk**: `gh` CLI未インストール → Slash Commands使用不可
  - **Mitigation**: UIからの全操作はNode.js HTTP経由で動作。`gh` CLI未検出時にインストールガイドを表示
- **Risk**: GitHub APIレート制限（5000 req/h）超過
  - **Mitigation**: ポーリング間隔を60秒に設定。レート制限ヘッダーの監視とUIへの警告表示
- **Risk**: safeStorage APIがLinux環境でSecret Service未設定時に失敗
  - **Mitigation**: `isEncryptionAvailable()` チェック。フォールバックとして `GITHUB_TOKEN` 環境変数をサポート
- **Risk**: 大規模Bugワークフロー廃止による既存テスト破綻
  - **Mitigation**: 廃止対象のテストも全削除。新しいIssueワークフローのテストを並行作成
- **Risk**: owner/repo自動検出がfork等で意図しないリポジトリを検出
  - **Mitigation**: 設定画面でowner/repoの手動オーバーライドを可能にする（将来拡張）

## References

- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [GitHub REST API v3 - Issues](https://docs.github.com/en/rest/issues)
- [GitHub REST API v3 - Pull Requests](https://docs.github.com/en/rest/pulls)
- [GitHub REST API v3 - Labels](https://docs.github.com/en/rest/issues/labels)
- [gh CLI Manual](https://cli.github.com/manual/)
