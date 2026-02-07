# Requirements: tRPC Full Migration（完全移行）

## Decision Log

### 移行戦略
- **Discussion**: Big Bang移行 vs 段階的移行
- **Conclusion**: ドメイン単位の段階的移行だが、他の開発は停止して移行に集中
- **Rationale**: 1PRにつき1ドメインに留めることで、問題発生時の切り分けが容易

### 移行順序
- **Discussion**: どのドメインから移行するか
- **Conclusion**: 依存関係が少ない参照系API → 複雑なドメイン（Agent/WebSocket）の順
- **Rationale**: パイロット移行で問題を早期発見し、ノウハウを蓄積してから複雑な部分に着手

### テストカバレッジ
- **Discussion**: 移行前のテスト作成要否
- **Conclusion**: 移行前に「現在動いていることを証明するテスト」を確認/作成
- **Rationale**: テストが失敗している状態で移行を開始してはならない（計画書ガイドライン）

### Remote UI対応
- **Discussion**: Remote UIのtRPC対応方式
- **Conclusion**: 移行完了後に別途検討。本Specでは既存WebSocket通信を維持
- **Rationale**: 移行スコープを限定し、リスクを分散

## Introduction

本Specは、electron-sdd-managerにおける全IPCチャンネル（約219個、正確な数値は各ドメインマッピングテーブル参照）をtRPCに移行し、最終的にレガシーIPCを撤廃することを定義する。`trpc-infrastructure` Spec完了後に実行する。

**移行規模**:
- 対象チャンネル: 219個
- 対象ハンドラファイル: 22個
- 対象preload行数: 2,771行
- 対象Service: 79個（既存、変更最小限）

## Requirements

### Requirement 1: パイロット移行（参照系API）

**Objective:** AIエージェントが「ロジック分離 → ルーター実装 → UI側差し替え」のサイクルを確立するため、依存関係が少ない参照系APIから移行を開始する

#### Acceptance Criteria
1. 以下のチャンネルがtRPCに移行されていること:
   - `GET_APP_VERSION` → `system.getAppVersion`
   - `GET_PLATFORM` → `system.getPlatform`
   - `GET_NODE_ENV` → `system.getNodeEnv`（新規追加プロシージャ）
   - `getAppPath` → `system.getAppPath`（新規追加プロシージャ、`app.getAppPath()` を提供）
2. 各APIにZodスキーマが定義されていること
3. Renderer側の呼び出しがtRPCフックに置換されていること
4. 統合テストが作成されていること
5. 古いIPCハンドラが削除されていること
6. preload/index.tsから対応するAPIが削除されていること

### Requirement 2: Config/Settings移行

**Objective:** 設定管理関連のIPCをtRPCに移行する

#### Acceptance Criteria
1. `src/main/trpc/routers/config.ts` にconfig routerが存在すること
2. 以下のドメインが移行されていること:
   - Recent Projects管理（GET/ADD/REMOVE）
   - App Settings（GET/SET）
   - Permissions管理
   - Engine設定
   - Tool Path設定
3. 各APIにZodスキーマが定義されていること
4. config routerに統合される全22プロシージャの元ハンドラが削除されていること（`configHandlers.ts`由来18チャンネル + `projectHandlers.ts`由来2チャンネル〔GET_RECENT_PROJECTS, ADD_RECENT_PROJECT〕+ `handlers.ts`由来2チャンネル〔VCS_SCHEME_GET, VCS_SCHEME_SET〕）
5. 統合テストが作成されていること

### Requirement 3: Project/File移行

**Objective:** プロジェクト・ファイル関連のIPCをtRPCに移行する

#### Acceptance Criteria
1. `src/main/trpc/routers/project.ts` にproject routerが存在すること
2. `src/main/trpc/routers/file.ts` にfile routerが存在すること
3. 以下のドメインが移行されていること:
   - プロジェクト選択・パス管理
   - ファイル読み書き
   - ディレクトリ検証
   - パス解決
4. 各APIにZodスキーマが定義されていること
5. 既存の`projectHandlers.ts`（14チャンネル）、`fileHandlers.ts`（7チャンネル）が削除されていること
6. 統合テストが作成されていること

### Requirement 4: Spec/Bug移行

**Objective:** Spec・Bug管理関連のIPCをtRPCに移行する

#### Acceptance Criteria
1. `src/main/trpc/routers/spec.ts` にspec routerが存在すること
2. `src/main/trpc/routers/bug.ts` にbug routerが存在すること
3. 以下のドメインが移行されていること:
   - Spec CRUD
   - Spec実行・承認・Inspection
   - Bug CRUD
   - Bug実行・検証
   - Worktree関連操作
4. 各APIにZodスキーマが定義されていること
5. 既存の`specHandlers.ts`（safeHandle 24チャンネル + webContents.send 1イベント = 計25）、`bugHandlers.ts`（7チャンネル）、worktree関連ハンドラが削除されていること
6. 統合テストが作成されていること

### Requirement 5: Agent移行

**Objective:** Agent管理関連のIPCをtRPCに移行する

#### Acceptance Criteria
1. `src/main/trpc/routers/agent.ts` にagent routerが存在すること
2. 以下のドメインが移行されていること:
   - Agent起動・停止・再開
   - Agent状態取得
   - Agentログ取得
   - Agent削除
3. 各APIにZodスキーマが定義されていること
4. 既存の`agentHandlers.ts`（10チャンネル）が削除されていること
5. 統合テストが作成されていること

### Requirement 6: Auto Execution移行

**Objective:** 自動実行関連のIPCをtRPCに移行する

#### Acceptance Criteria
1. `src/main/trpc/routers/autoExecution.ts` にautoExecution routerが存在すること
2. 以下のドメインが移行されていること:
   - Spec Auto Execution制御
   - Bug Auto Execution制御
   - ステータス取得・イベント通知
3. 各APIにZodスキーマが定義されていること
4. 既存の`autoExecutionHandlers.ts`（safeHandle 8チャンネル + イベント通知5チャンネル = 計13、イベント通知はReq 8で対応）、`bugAutoExecutionHandlers.ts`（safeHandle 6チャンネル + イベント通知6チャンネル = 計12、イベント通知はReq 8で対応）が削除されていること
5. 統合テストが作成されていること

### Requirement 7: Git/Worktree移行

**Objective:** Git・Worktree関連のIPCをtRPCに移行する

#### Acceptance Criteria
1. `src/main/trpc/routers/git.ts` にgit routerが存在すること
2. 以下のドメインが移行されていること:
   - Git差分取得
   - ファイル内容取得
   - Worktree作成・削除・変換
3. 各APIにZodスキーマが定義されていること
4. 既存の`gitHandlers.ts`（safeHandle 5チャンネル + webContents.send 1イベント = 計6）、worktree関連ハンドラが削除されていること
5. 統合テストが作成されていること

### Requirement 8: イベント通知（Subscription）移行

**Objective:** Main → Renderer方向のイベント通知をtRPC Subscriptionに移行する

#### Acceptance Criteria
1. tRPC Subscriptionが正しく設定されていること
2. 以下のイベント通知が移行されていること:
   - Agent出力・ステータス変更
   - Spec/Bug変更通知
   - Auto Execution状態変更
   - ファイル変更検知
   - Remote Server状態変更
3. 既存の`ipcRenderer.on`リスナーが削除されていること
4. Renderer側でSubscriptionフックが使用されていること
5. 統合テストが作成されていること

### Requirement 9: その他ドメイン移行

**Objective:** 残りの全IPCチャンネルをtRPCに移行する

#### Acceptance Criteria
1. 以下のドメインが移行されていること:
   - Cloudflare Tunnel（10プロシージャ、うちSubscription 1個はReq 8で対応）
   - Install関連（20プロシージャ）
   - MCP Server（6チャンネル）
   - Schedule Task（9プロシージャ、うちSubscription 1個はReq 8で対応）
   - SSH関連（7プロシージャ、うちSubscription 1個はReq 8で対応）
   - Remote Access（既存WebSocket通信は維持、IPC部分のみ）
   - Metrics（4チャンネル）
   - Logging/Menu/その他（28チャンネル）
2. 各APIにZodスキーマが定義されていること
3. 対応する既存ハンドラファイルが削除されていること
4. 統合テストが作成されていること

### Requirement 10: レガシーIPC撤廃

**Objective:** 全てのレガシーIPCコードを削除し、tRPCのみの構成にする

#### Acceptance Criteria
1. `src/preload/index.ts` が削除または最小限（tRPC以外の必須機能のみ）になっていること
2. `src/main/ipc/channels.ts` が削除されていること
3. `src/main/ipc/handlers.ts` および全てのドメイン別ハンドラファイルが削除されていること
4. `electron.d.ts` のレガシーAPI型定義が削除されていること
5. `contextBridge.exposeInMainWorld('electronAPI', ...)` が削除されていること
6. `window.electronAPI` の参照が全てのRenderer/Remote UIコードから削除されていること
7. TypeScriptコンパイルが成功すること
8. 全ての統合テストがpassすること

### Requirement 11: E2Eテスト（人間検証項目）

**Objective:** 統合テストで担保できない機能について、人間によるテスト項目を定義する

#### Acceptance Criteria
1. 以下の項目についてE2Eテストまたは人間によるテストチェックリストが作成されていること:
   - アプリケーション起動・メイン画面表示（Smoke Test）
   - ファイル選択ダイアログ動作
   - プロジェクト選択 → エージェント実行開始（Critical Path）
   - Remote UI接続・操作
2. E2Eテストが実行可能な項目は自動化されていること
3. 人間によるテストが必要な項目はチェックリストとして文書化されていること

### Requirement 12: ドキュメント更新

**Objective:** 移行完了後のアーキテクチャを反映したドキュメントが整備されている

#### Acceptance Criteria
1. `.kiro/steering/tech.md` のIPC設計パターンセクションがtRPCに更新されていること
2. `.kiro/steering/structure.md` のディレクトリ構造がtRPCを反映していること
3. `docs/future-concepts/trpc-migration-plan.md` に完了ステータスが追記されていること
4. 新規開発者向けのtRPC API追加手順が文書化されていること

## Out of Scope

- Remote UI用tRPC over WebSocket（将来の別Specで検討）
- パフォーマンス最適化（移行完了後に必要に応じて検討）
- 新機能追加（移行完了まで他の開発は停止）

## Open Questions

1. **Subscriptionの実装方式**: electron-trpcでSubscriptionをどのように実装するか？（調査が必要）
   - **調査ポイント**: WebSocket不要でIPC経由のSubscriptionが可能か
   - **解決済み**: research.md DD-003参照。electron-trpcはIPC経由のSubscriptionをネイティブサポートしており、`observable()`ヘルパーでEventEmitterをSubscriptionに変換可能

2. **Remote UIの将来対応**: tRPC over WebSocketを導入する場合、アーキテクチャ変更の影響範囲は？
   - **暫定回答**: 本Spec完了後に別途検討

3. **バッチ移行の単位**: 1PRあたりどの程度のチャンネル数を移行するか？
   - **暫定回答**: ドメイン単位（1ハンドラファイル = 1PR程度）

## Testing Strategy

### 統合テスト（主軸）

| レイヤー | テスト内容 | 担保する品質 |
|---------|----------|------------|
| Service Unit Test | Service層のロジック検証 | ロジックの正しさ |
| tRPC Router Test | Zodスキーマ、ルーター呼び出し検証 | 型安全性、API契約 |
| IPC Integration Test | electron モジュールMock、ハンドラ登録検証 | IPC繋ぎ込み |

### E2Eテスト（最小限）

| テスト項目 | 目的 | 自動化 |
|-----------|-----|--------|
| Smoke Test | アプリ起動確認 | 可 |
| Critical Path | プロジェクト選択→エージェント実行 | 可 |
| ファイルダイアログ | Native機能確認 | 困難 |
| Remote UI接続 | WebSocket通信確認 | 可 |

### 人間テスト（E2Eで困難な項目）

- Native File Dialog動作
- ドラッグ&ドロップ
- メニューバー操作
- ウィンドウリサイズ・最小化・最大化

## Dependencies

- **前提Spec**: `trpc-infrastructure`（必須、先に完了すること）
- **後続Spec**: なし（本Specで移行完了）

## References

- [元計画書](/docs/future-concepts/trpc-migration-plan.md)
- [trpc-infrastructure Spec](/docs/.kiro/specs/trpc-infrastructure/requirements.md)
- [electron-trpc公式ドキュメント](https://github.com/jsonnull/electron-trpc)
- [tRPC Subscriptions](https://trpc.io/docs/subscriptions)
