# Requirements: Remote UI React Migration

## Decision Log

### 1. UI実装技術の選択

**Discussion**: 現在のRemote UIはVanilla JavaScriptで実装されている（約4,534行）。一方、Electron版はReact + TypeScriptで実装されている（約25,654行）。両者の機能差分が大きく（Electron版が85%多くの機能を持つ）、重複実装が発生している。

**検討した選択肢**:
- **案A**: Vanilla JSで実装を継続し、全機能を追加実装
  - 工数: 約26日
  - 問題: Electron版と重複実装、保守性の悪化、バグ修正が2倍
- **案B**: ReactにマイグレーションしてからElectron版とコンポーネントを共有
  - 工数: 約20日（6日短縮）
  - メリット: 85-90%のコンポーネント共有、技術的負債回避

**Conclusion**: ReactへのマイグレーションとElectron版との共有化

**Rationale**:
- コンポーネント共有により開発効率が50%向上
- 年間保守コストが43%削減（70日→40日）
- 型安全性とテストコードの共有による品質向上
- 将来的な機能追加が容易

---

### 2. ビルド構成

**Discussion**: Electron版とRemote UIのビルド設定をどう管理するか。

**検討した選択肢**:
- **案A**: 独立ビルド維持（Vite別設定）
  - メリット: ビルド設定の分離、最適化が容易、デプロイが独立
  - デメリット: ビルド設定が2つ必要
- **案B**: 統合ビルド（マルチエントリーポイント）
  - メリット: ビルド設定が1つ、依存関係管理が統一
  - デメリット: ビルド時間増加、最適化が複雑

**Conclusion**: 案A（独立ビルド）を採用

**Rationale**:
- Remote UIは静的ファイル配信のみ（Electronとデプロイ方法が異なる）
- 最適化戦略が異なる（Electron: Node.js前提、Web: ブラウザ互換性）
- tech.mdの既存パターン（`remote-ui/: 独立したReactアプリ（Vite別ビルド）`）を踏襲

---

### 3. API抽象化層の設計

**Discussion**: Electron版はIPC、Remote版はWebSocketと通信方法が異なる。

**検討した選択肢**:
- 既存のWebSocketHandlerパターンを維持
- API抽象化層（IpcApiClient/WebSocketApiClient）を導入

**Conclusion**: API抽象化層を導入

**Rationale**:
- コンポーネントが通信方法を意識しない設計
- Provider Patternで依存注入により柔軟性確保
- テスタビリティの向上
- 将来的な通信方式の追加・変更が容易

---

### 4. レスポンシブ対応の実装方法

**Discussion**: モバイル（スマートフォン）とデスクトップで異なるUIを提供する必要がある。

**検討した選択肢**:
- **案A**: サーバー側でUser AgentによりHTMLを切り替え
  - メリット: 初期レスポンスが高速
  - デメリット: SPAの利点が失われる
- **案B**: クライアント側（React）でレスポンシブ対応
  - メリット: SPAの利点、タブレットの柔軟な対応、1つのHTMLエントリーポイント
  - デメリット: 初期ロード時のサイズ増加

**Conclusion**: 案B（クライアント側レスポンシブ）

**Rationale**:
- User Agentだけでなく画面サイズも考慮できる
- タブレットの扱いが柔軟
- SPAとしての一貫性

---

### 5. 機能スコープ

**Discussion**: Electron版には多くの機能があるが、Remote UIでどこまで実装するか。

**検討した選択肢**:
- Phase 1のみ（基本機能）
- 全機能を同等に実装

**Conclusion**: 全機能を同等に実装（Project Agent、Inspection、Document Review等を含む）

**Rationale**:
- コンポーネント共有により実装コストが大幅削減
- わざわざコンポーネントを分ける理由がない
- チームメンバーが同一環境でリモート確認できる必要性

---

### 6. ファイル編集とプロジェクト選択

**Discussion**: ブラウザのセキュリティ制約により、ローカルファイルシステムへの直接アクセスは不可能。

**Conclusion**:
- **ファイル編集**: サーバー経由で保存（WebSocket経由でElectronプロセスに依頼）
- **プロジェクト選択機能**: 不要。現在選択中のプロジェクトのみリモートアクセス可能
- **SSH設定**: Remote UIでは設定不可（閲覧のみ）

**Rationale**:
- プロジェクトが変更されたらサーバーは一旦停止して良い
- SSH設定はElectron版でのみ意味がある
- ファイル編集はサーバー経由で実現可能

---

### 7. 認証とセキュリティ

**Discussion**: PCブラウザやスマートフォンからのアクセスには認証が必要。

**Conclusion**: トークンベース認証を採用

**Rationale**:
- QRコード/URLコピーでDiscord/Slackを通じてリモートセッションを公開
- トークンの有効期限設定が可能
- 既存のRemoteAccessPanel（QRコード生成）を活用

---

### 8. ネットワーク環境

**Discussion**: ローカルネットワークのみか、インターネット経由も対応するか。

**Conclusion**: LAN/インターネット両対応

**Rationale**:
- 開発者本人がスマホからアクセス（外出先）
- チームメンバーがリモートから状況を把握
- 既存のCloudflare Tunnel統合を活用

---

### 9. 既存Specとの関係

**Discussion**: `mobile-remote-access`（実装完了）と`remote-ui-workflow`（タスク生成済み）をどう扱うか。

**Conclusion**: 完全置き換え。既存互換性は考慮しない

**Rationale**:
- React化により根本的にアーキテクチャが変わる
- 段階的マイグレーションは複雑性が増す
- 一度に切り替える方が保守性が高い

---

### 10. 実装の段階分け

**Discussion**: 全機能を一度に実装するか、Phase分けするか。

**Conclusion**: 1つのSpecとして扱い、requirements.mdに段階的実装を明記

**Rationale**:
- 技術的には連続した作業
- Phase間の依存関係が強い
- 1つのSpecとして追跡する方が管理しやすい

---

### 11. CLI起動オプション（E2Eテスト対応）

**Discussion**: E2Eテストを自動化するために、コマンドライン引数でプロジェクト指定とRemote UI自動起動が必要。

**検討した選択肢**:
- 手動起動のみ（テストで複雑な手順が必要）
- CLI起動オプション提供（テスト自動化が容易）

**Conclusion**: CLI起動オプションを提供

**Rationale**:
- PlaywrightやWebdriverIOでのE2Eテストが可能になる
- CI/CD環境での自動テストが実現できる
- 開発者がローカルでテストを実行しやすい
- ヘッドレスモードによりCI環境での動作が安定

---

## Introduction

SDD OrchestratorのRemote UI（現在Vanilla JavaScript実装）をReactに完全移行し、Electron版とコンポーネントを共有する。User Agent判定によりモバイル/デスクトップで異なるUIを提供し、トークンベース認証により安全なリモートアクセスを実現する。

本機能により、チームメンバーが同一環境でリモートから状況を把握でき、開発者本人がスマートフォンからもアクセス可能になる。

---

## Requirements

### Requirement 1: React移行とビルド基盤

**Objective**: Remote UIをVanilla JavaScriptからReact + TypeScriptに完全移行し、Electron版とコンポーネントを共有可能にする。

#### Acceptance Criteria

1. When Remote UIプロジェクトを構築する場合、システムはViteビルドを使用し、独立した設定ファイル（`vite.config.remote.ts`）で管理すること
2. 現在の`src/main/remote-ui/`ディレクトリ（Vanilla JS）を完全に削除し、新しく`src/remote-ui/`ディレクトリ（React）を作成すること
3. `src/shared/`ディレクトリに共有可能なコンポーネント、API抽象化層、型定義を配置すること
4. Electron版（`src/renderer/`）とRemote UI版（`src/remote-ui/`）でコンポーネント共有率85%以上を達成すること
5. ビルド成果物は`dist/remote-ui/`に出力され、`remoteAccessServer.ts`から静的ファイルとして配信されること

---

### Requirement 2: API抽象化層

**Objective**: IPC（Electron）とWebSocket（Remote UI）の通信方法の違いを抽象化し、コンポーネントが通信方法を意識しない設計にする。

#### Acceptance Criteria

1. When API抽象化層を実装する場合、システムは以下のインタフェースを定義すること:
   - `ApiClient`: 共通のAPIインタフェース（`getSpecs()`, `executePhase()`, `stopAgent()`, `resumeAgent()`, `getBugs()`, `getAgents()`, 等）
   - `IpcApiClient`: Electron IPC実装（`window.electronAPI`を使用）
   - `WebSocketApiClient`: WebSocket実装（既存の`webSocketHandler.ts`と連携）

2. If Remote UIからAPIを呼び出す場合、システムは`WebSocketApiClient`を使用してWebSocket経由でリクエストを送信すること

3. If Electron UIからAPIを呼び出す場合、システムは`IpcApiClient`を使用してIPCハンドラを呼び出すこと

4. When コンポーネントがAPIを使用する場合、システムは`useApi()` hookまたは`ApiClientProvider`経由でAPI Clientにアクセスすること

5. ファイル保存機能（`saveFile`）は、Electron版ではローカルファイルシステムに保存し、Remote UI版ではWebSocket経由でサーバーに保存リクエストを送信すること

---

### Requirement 3: コンポーネント共有化

**Objective**: Electron版の既存Reactコンポーネントを共有可能にし、Remote UIで再利用する。

#### Acceptance Criteria

1. When コンポーネントを共有化する場合、システムは以下のコンポーネントを`src/shared/components/`に配置すること:
   - `SpecList`, `SpecDetail`, `BugList`, `BugDetail`
   - `AgentListPanel`, `LogViewer`
   - `WorkflowView`, `BugWorkflowView`
   - `AutoExecutionStatusDisplay`, `BugAutoExecutionStatusDisplay`
   - `ProjectAgentPanel`, `InspectionPanel`, `DocumentReviewPanel`, `ValidationPanel`
   - その他UI基本要素（`Button`, `Card`, `Modal`, `Toast`, `Spinner`, 等）

2. If コンポーネントがプラットフォーム固有の機能（ファイルダイアログ、SSH設定等）を使用する場合、システムは`usePlatform()` hookで機能の有無を判定し、条件分岐でレンダリングすること

3. When Zustandストアを共有化する場合、システムは通信方法（IPC/WebSocket）に依存しない実装にし、API抽象化層を経由してデータを取得すること

4. Electron専用のコンポーネント（`SSHConnectionDialog`, `CloudflareTunnelDialog`, `FilePickerDialog`）は`src/renderer/electron-specific/`に配置すること

5. Web専用のコンポーネント（認証ページ等）は`src/remote-ui/web-specific/`に配置すること

---

### Requirement 4: レスポンシブUI（モバイル/デスクトップ対応）

**Objective**: User Agent判定により、スマートフォンとデスクトップで異なるUIを提供する。

#### Acceptance Criteria

1. When Remote UIをロードする場合、システムは`navigator.userAgent`を判定し、モバイルデバイス（iPhone, iPad, Android）かデスクトップかを識別すること

2. If モバイルデバイスの場合、システムは`<MobileLayout />`コンポーネントをレンダリングすること:
   - コンパクトなUI（タブ切り替えメイン）
   - タッチ操作に最適化されたボタンサイズ
   - 縦スクロール中心のレイアウト

3. If デスクトップの場合、システムは`<DesktopLayout />`コンポーネントをレンダリングすること:
   - Electron版と同等の複雑なUI（サイドバー、複数ペイン）
   - マウス操作に最適化
   - 横幅を活用したレイアウト

4. When タブレット（iPad等）の場合、システムは画面サイズに応じてモバイル/デスクトップレイアウトを選択すること

5. レスポンシブ対応はTailwind CSSのブレークポイント（`sm:`, `md:`, `lg:`）を活用すること

---

### Requirement 5: トークンベース認証

**Objective**: Remote UIへのアクセスをトークンベース認証で保護し、安全なリモートセッションを提供する。

#### Acceptance Criteria

1. When Remote Serverを起動する場合、システムはアクセストークンを生成すること（ランダム32バイト、有効期限24時間）

2. If Remote UIにアクセスする場合、システムはURLクエリパラメータ（`?token=xxx`）でトークンを検証すること

3. If トークンが無効または期限切れの場合、システムはエラーメッセージを表示し、アクセスを拒否すること

4. When トークンが有効な場合、システムはWebSocket接続を確立し、セッションを開始すること

5. システムは接続中のクライアント数を`RemoteAccessPanel`に表示すること

6. トークンのリフレッシュ機能（既存の`refreshAccessToken()`）を使用し、Electron UI側でトークンを再生成できること

---

### Requirement 6: QRコード・URL共有機能の活用

**Objective**: 既存のQRコード生成機能を活用し、スマートフォンからの簡単なアクセスを実現する。

#### Acceptance Criteria

1. 既存の`RemoteAccessPanel.tsx`（Electron側）のQRコード表示機能をそのまま使用すること

2. When Remote Serverを起動する場合、システムは以下の情報を表示すること:
   - ローカルURL（`http://{localIp}:{port}?token=xxx`）
   - ローカルURL用QRコード
   - Tunnel URL（Cloudflare有効時、`https://xxx.trycloudflare.com?token=xxx`）
   - Tunnel URL用QRコード（トークン付き）

3. URLコピーボタン（既存の`handleCopyUrl`, `handleCopyTunnelUrl`）を使用し、Discord/Slackへの共有を容易にすること

4. QRコードをスマートフォンでスキャンした場合、システムは自動的にブラウザでRemote UIを開き、トークン認証を通過すること

---

### Requirement 7: 全機能の実装（Electron版と同等）

**Objective**: Remote UIでElectron版と同等の機能を提供する。

#### Acceptance Criteria

1. **Specsタブ**: 以下の機能を実装すること
   - Spec一覧表示（カード形式、検索・フィルタリング）
   - Spec詳細表示（requirements, design, tasks, researchの表示）
   - Phase実行（requirements, design, tasks, implementation）
   - 自動実行（Auto Execute All、オプション選択）
   - Validation実行（gap, design）
   - Document Review実行
   - Inspection実行（複数Round表示）
   - Agent制御（停止、再開、削除）
   - ログ表示（リアルタイム更新、自動スクロール）

2. **Bugsタブ**: 以下の機能を実装すること
   - Bug一覧表示（カード形式、Phase表示）
   - Bug詳細表示（report, analysis, fix, verificationの表示）
   - Bug Phase実行（analyze, fix, verify）
   - Bug Auto Execution
   - Agent制御（停止、再開、削除）

3. **Project Agentタブ**: 以下の機能を実装すること
   - Project Agent一覧表示
   - Ask Project機能（カスタムプロンプト送信）
   - Agent制御（停止、再開、削除）

4. If ブラウザのセキュリティ制約により実現不可能な機能（ローカルファイルダイアログ、SSH設定）がある場合、システムは以下の対応を行うこと:
   - プロジェクト選択機能は提供しない（現在選択中のプロジェクトのみアクセス可能）
   - SSH設定は閲覧のみ（設定変更不可）
   - ファイル編集はサーバー経由で保存（WebSocket経由でElectronプロセスに依頼）

---

### Requirement 8: ネットワーク対応

**Objective**: ローカルネットワーク（LAN）とインターネット経由（Cloudflare Tunnel）の両方でアクセス可能にする。

#### Acceptance Criteria

1. When ローカルネットワーク内からアクセスする場合、システムは`http://{localIp}:{port}?token=xxx`形式のURLを提供すること

2. When インターネット経由でアクセスする場合、システムは既存のCloudflare Tunnel統合（`publishToCloudflare`オプション）を使用し、`https://xxx.trycloudflare.com?token=xxx`形式のURLを提供すること

3. If Cloudflare Tunnelが有効な場合、システムはTunnel URLとQRコードを優先的に表示すること

4. システムは接続元（LAN/インターネット）を区別せず、同じRemote UIを提供すること

---

### Requirement 9: プロジェクト切り替え時の動作

**Objective**: Electron版でプロジェクトが変更された場合の動作を定義する。

#### Acceptance Criteria

1. When Electron版で異なるプロジェクトを選択した場合、システムはRemote Serverを一旦停止すること

2. If Remote Serverが停止した場合、接続中のRemote UIクライアントにはWebSocket切断を通知し、再接続オーバーレイを表示すること

3. ユーザーが新しいプロジェクトでRemote Serverを再起動した場合、新しいトークンとURLが生成されること

4. 既存のRemote UIクライアントは、古いトークンでは新しいサーバーに接続できないこと

---

### Requirement 10: 既存機能との互換性

**Objective**: 既存のElectron側Remote Access機能（RemoteAccessPanel, remoteAccessServer, webSocketHandler）を最大限活用する。

#### Acceptance Criteria

1. Electron側の以下のコンポーネント・サービスは変更せずにそのまま使用すること:
   - `RemoteAccessPanel.tsx`: QRコード表示、URL表示、サーバー制御
   - `RemoteAccessDialog.tsx`: Remote Accessダイアログ
   - `CloudflareSettingsPanel.tsx`: Cloudflare設定
   - `remoteAccessServer.ts`: Express静的サーバー + WebSocketサーバー
   - `webSocketHandler.ts`: WebSocket通信ハンドラ

2. When `webSocketHandler.ts`に新しいメッセージタイプを追加する場合、システムは既存のメッセージタイプとの互換性を維持すること

3. 既存の`remoteAccessStore.ts`（Zustand）を活用し、Remote UI側でも同等のストア構造を使用すること

4. `staticFileServer.ts`が新しいReact版Remote UIの静的ファイルを`dist/remote-ui/`から配信すること

---

### Requirement 11: CLI起動オプション（E2Eテスト対応）

**Objective**: コマンドライン引数でプロジェクト指定とRemote UI自動起動を可能にし、E2Eテストの自動化を実現する。

#### Acceptance Criteria

1. When `--project=<path>` オプションを指定した場合、システムは起動時に指定されたプロジェクトを自動的に読み込むこと

2. When `--remote-ui=auto` オプションを指定した場合、システムはRemote Serverを自動的に起動すること

3. If `--remote-port=<port>` オプションを指定した場合、システムは指定されたポートでRemote Serverを起動すること（デフォルト: 3000）

4. When Remote Serverが起動した場合、システムは標準出力にアクセスURLを出力すること（形式: `REMOTE_UI_URL=http://localhost:3000?token=xxx`）

5. If `--headless` オプションを指定した場合、システムはElectronウィンドウを表示せずにバックグラウンドで動作すること

6. If `--remote-token=<token>` オプションを指定した場合（テスト用途）、システムは指定された固定トークンを使用すること

7. If `--no-auth` オプションを指定した場合（ローカルテスト用途）、システムはトークン認証を無効化すること

8. When E2Eテストで使用する場合、PlaywrightまたはWebdriverIOが以下のコマンドでElectronを起動できること:
   ```bash
   electron . --project=/path/to/test-project --remote-ui=auto --remote-port=3000 --headless
   ```

9. システムは起動オプションのヘルプを`--help`で表示すること

---

## Out of Scope

以下は本Specの対象外とする：

- **既存Vanilla JS版との互換性維持**: 完全置き換えのため、移行期の互換性は考慮しない
- **Electron版の機能追加**: Electron側の新機能追加は別Specで対応
- **モバイルネイティブアプリ**: ブラウザベースのみ対応（iOS/Androidネイティブアプリは対象外）
- **マルチプロジェクト同時アクセス**: 1つのRemote Serverインスタンスは1プロジェクトのみ管理
- **リアルタイムコラボレーション編集**: 複数ユーザーが同時編集する機能は対象外（閲覧・実行は可能）
- **オフライン対応**: Remote UIはサーバー接続必須
- **ブラウザ互換性の広範なサポート**: モダンブラウザ（Chrome, Safari, Edge最新版）のみ対象

---

## Open Questions

以下は設計フェーズで検討すべき事項：

1. **WebSocketプロトコルの拡張**: 既存の`webSocketHandler.ts`にどのようなメッセージタイプを追加するか？（ファイル保存リクエスト、Project Agent操作等）

2. **エラーハンドリング戦略**: WebSocket切断時の再接続ロジック、トークン期限切れ時のユーザー体験

3. **パフォーマンス最適化**: 大量のログデータのストリーミング、複数Specの一覧表示時の仮想スクロール

4. **テスト戦略**:
   - E2Eテストでモバイル/デスクトップUIをどうテストするか？
   - WebSocketモックの実装方法
   - PlaywrightでのElectron起動とブラウザテストの統合方法
   - CI環境でのヘッドレステスト実行

5. **段階的実装の詳細**: Phase 1（基盤）、Phase 2（コンポーネント共有）、Phase 3（全機能統合）の具体的なタスク分割

6. **PlatformCapabilitiesの詳細設計**: どの機能をElectron専用とし、どの機能をWeb版でも提供するかの境界線

7. **ファイル編集のUX**: Remote UIでファイル編集時、保存の遅延やエラーをどう表現するか？

8. **トークンのストレージ**: Remote UI側でトークンをlocalStorageに保存するか？（再接続時の利便性 vs セキュリティ）

9. **CLI起動オプションの実装詳細**:
   - 既存のElectron起動フローへの統合方法
   - 環境変数との併用
   - 設定ファイル（JSON/YAML）による起動オプション指定のサポート有無
