# TypeScriptソースコード 肥大化調査レポート (2026-02-06)

本レポートは、プロジェクト内のTypeScriptファイル（テストコードを除く）のうち、ファイルサイズが大きい上位10ファイルを抽出し、その構造と最適化・分割の必要性を評価したものです。

## 調査対象ファイル TOP 10

| 順位 | サイズ (Bytes) | パス |
| :--- | :--- | :--- |
| 1 | 129,595 | `electron-sdd-manager/src/main/services/webSocketHandler.ts` |
| 2 | 107,618 | `electron-sdd-manager/src/main/services/specManagerService.ts` |
| 3 | 101,699 | `electron-sdd-manager/src/preload/index.ts` |
| 4 | 69,735 | `electron-sdd-manager/src/main/services/autoExecutionCoordinator.ts` |
| 5 | 68,804 | `electron-sdd-manager/src/renderer/types/electron.d.ts` |
| 6 | 61,660 | `electron-sdd-manager/src/main/ipc/handlers.ts` |
| 7 | 47,266 | `electron-sdd-manager/src/shared/api/WebSocketApiClient.ts` |
| 8 | 44,181 | `electron-sdd-manager/src/main/services/mcp/specToolHandlers.ts` |
| 9 | 40,139 | `electron-sdd-manager/src/main/services/mcp/bugToolHandlers.ts` |
| 10 | 38,569 | `electron-sdd-manager/src/main/services/worktreeService.ts` |

---

## 各ファイルの分析と提案

### 1. `webSocketHandler.ts` (約4,140行)
- **役割**: モバイルリモートアクセス用のWebSocket接続管理とメッセージルーティング。
- **現状**: 単一のファイルで膨大な数のメッセージタイプとロジックを処理しており、非常に肥大化している。
- **提案**: **分割を強く推奨**。メッセージの種類（Spec, Bug, Agent等）ごとにハンドラクラスを分割し、`WebSocketServerManager` は接続管理とルーティングに専念させるべき。

### 2. `specManagerService.ts` (約2,800行)
- **役割**: Spec ManagerとSDD Agentプロセスの管理。
- **現状**: プロセス生成、ログ解析、状態管理など多岐にわたる責務を担っている。一部は他サービスに委譲されているが、本体が依然として巨大。
- **提案**: **機能単位でのサブサービス化を推奨**。例えば `AgentProcessFactory` や `AgentExecutionManager` などにロジックをさらに切り出す。

### 3. `preload/index.ts` (約2,770行)
- **役割**: RendererプロセスへのIPC APIの露出。
- **現状**: 2700行を超える単純な `ipcRenderer.invoke` の羅列になっており、保守性が低い。
- **提案**: **ドメイン別の分割を推奨**。`preload/fs.ts`, `preload/spec.ts` などのようにドメインごとに分割し、`index.ts` で結合する構成にする。

### 4. `autoExecutionCoordinator.ts` (約2,000行)
- **役割**: 自動実行（Auto-Execution）の状態遷移と調整。
- **現状**: フェーズごとの複雑な遷移ロジックが1ファイルに集中している。
- **提案**: **フェーズハンドラの抽出を検討**。各フェーズ（requirements, design等）の固有ロジックを別のクラスや関数に切り出すことで、コーディネーター自体の見通しを良くする。

### 5. `renderer/types/electron.d.ts` (約2,040行)
- **役割**: `electronAPI` の型定義。
- **現状**: APIの数に比例して肥大化。
- **提案**: **Preloadの分割に合わせる**。APIのドメインごとに型定義ファイルを分割することで、管理を容易にする。

### 6. `main/ipc/handlers.ts` (約1,320行)
- **役割**: IPCハンドラのオーケストレーター。
- **現状**: すでに `register...Handlers` として機能分割されているが、インポートと初期化コードだけで1300行に達している。
- **提案**: **初期化ロジックのグルーピング**。関連するサービスやハンドラの初期化をモジュール化し、このファイルでのインポート数を削減する。

### 7. `shared/api/WebSocketApiClient.ts`
- **役割**: WebSocket APIのクライアント実装。
- **現状**: サーバー側の `webSocketHandler.ts` の複雑さをそのまま反映している。
- **提案**: **ドメイン別クライアントへの分割**。`SpecApiClient`, `BugApiClient` のように分割し、それらを束ねる構成にする。

### 8 & 9. `mcp/specToolHandlers.ts` / `mcp/bugToolHandlers.ts`
- **役割**: MCPツールのハンドラ。
- **現状**: 実装されているツールの数に比例してサイズが増大。
- **提案**: **個別ツールファイルへの分割**。特に複雑なツールについては、1ツール1ファイルの構成にすることを検討。

### 10. `worktreeService.ts`
- **役割**: Git worktreeの管理。
- **現状**: 上記に比べればサイズは抑えられているが、Git操作の複雑さが集中している。
- **提案**: 現時点では許容範囲だが、これ以上Git関連の機能が増える場合は、低レベルなGit操作と高レベルなWorktree管理を分離することを検討。

---

## 結論と次のステップ

上位3ファイル（`webSocketHandler.ts`, `specManagerService.ts`, `preload/index.ts`）は、**設計上の限界を超えて肥大化**しており、リファクタリングの優先度が非常に高いです。

特に **Preload API (`preload/index.ts`)** と **WebSocketハンドラ (`webSocketHandler.ts`)** は、単純な構造の繰り返しが多いため、ドメイン単位での分割による効果が即座に得られやすいと考えられます。
