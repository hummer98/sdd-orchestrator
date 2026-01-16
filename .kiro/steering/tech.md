# Technology Stack

## Architecture

Electronベースのデスクトップアプリケーション。

### electron-sdd-manager
- **フロントエンド**: React + TypeScript (Vite)
- **バックエンド**: Node.js (Electron 35)
- **IPC**: contextBridge + preload

## Core Technologies

- **Language**: TypeScript 5.8+
- **Framework**: React 19, Vite 5+
- **Runtime**: Node.js 20+, Electron 35

## Key Libraries

### 状態管理
- **Zustand**: 軽量ステート管理（stores/に配置）

### UI/スタイリング
- **Tailwind CSS 4**: ユーティリティファーストCSS
- **Lucide React**: アイコンライブラリ
- **@uiw/react-md-editor**: Markdownエディタ

### バリデーション
- **Zod**: スキーマバリデーション

### 通信・ネットワーク
- **ssh2**: SSH接続（リモートプロジェクト操作）
- **ws**: WebSocket（リモートUI通信）
- **express**: 静的ファイルサーバー

### ファイル監視
- **chokidar**: ファイルシステム監視

## Development Standards

### Type Safety
- TypeScript strict mode
- Zod によるランタイムバリデーション
- 型定義は `types/index.ts` に集約、ドメイン別ファイルは `types/*.ts`

### Code Quality
- Vitest によるユニットテスト
- WebdriverIO による E2E テスト
- テストファイルは `*.test.ts(x)` 命名（実装と同ディレクトリ）

### Testing
```bash
npm run test        # ユニットテスト (watch mode)
npm run test:run    # ユニットテスト (single run)
npm run test:e2e    # E2Eテスト
```

## Development Environment

### Required Tools
- Node.js 20+
- task (Taskfile.yml 実行用)

### Common Commands

```bash
cd electron-sdd-manager
npm run dev          # 開発サーバー
npm run dev:electron # Electron起動
npm run test         # テスト実行

# または task コマンド（ルートから）
task electron:dev    # フォアグラウンド起動
task electron:start  # バックグラウンド起動
task electron:stop   # 停止
```

## Verification Commands

spec-impl 完了時に実行する検証コマンド:

```bash
cd electron-sdd-manager && npm run build && npm run typecheck
```

## Key Technical Decisions

### Electron選択の理由
- Node.jsエコシステムとの親和性
- プロセス管理・シェル実行が容易
- デスクトップ統合（メニュー、通知）

### Zustand選択の理由
- 軽量、TypeScriptフレンドリー
- Reactコンポーネント外からもアクセス可能
- シンプルなAPI

### Tailwind CSS 4の採用
- ユーティリティファースト
- PostCSSプラグインとして動作

### IPC設計パターン
- `channels.ts`: チャンネル名定義（型安全）
- `handlers.ts`: IPCハンドラ実装
- preload経由でrendererに公開

### spec.json updated_at 更新ルール

`updated_at`フィールドはSpec一覧のソート順に使用される。更新タイミングの設計原則:

| 更新タイプ | `updated_at`の更新 | 例 |
|-----------|-------------------|-----|
| ユーザーアクション | **更新する** | 設定変更、承認、レビュー操作、アーティファクト生成 |
| 自動補正 | **更新しない**（`skipTimestamp: true`） | タスク完了検知、Inspection GO検知、UI同期 |

**アーティファクト生成検知**（specsWatcherService）:
- requirements.md, design.md, tasks.mdの生成を検知
- スキル実行によるファイル生成はユーザーアクションとして扱う
- `add`イベントのみ対象（`change`は含まない）

**実装パターン**:
```typescript
// ユーザーアクション: タイムスタンプ更新あり
await fileService.updateSpecJsonFromPhase(specPath, 'design-approved');

// 自動補正: タイムスタンプ更新なし
await fileService.updateSpecJsonFromPhase(specPath, 'impl-complete', { skipTimestamp: true });
```

### Remote UI アーキテクチャ

Electronアプリはブラウザからアクセス可能なRemote UIを提供する。

**アーキテクチャ概要**:
- **API抽象化層**: `ApiClient`インタフェースで通信方式を透過化
  - `IpcApiClient`: Electron IPC経由（preload + contextBridge）
  - `WebSocketApiClient`: WebSocket経由（Remote UI）
- **共有コンポーネント**: `src/shared/`でElectron版とRemote UI版で85%以上のコード共有
- **PlatformProvider**: プラットフォーム固有機能の有無を条件分岐

**構成**:
- `remoteAccessServer.ts`: Express静的サーバー + WebSocketサーバー
- `webSocketHandler.ts`: WebSocket経由のIPC-like通信
- `remote-ui/`: React SPA（Vite別ビルド、`vite.config.remote.ts`）
- `shared/`: Electron版/Remote UI版共有コード

**ビルドスクリプト**:
- `npm run dev:remote`: Remote UI開発サーバー
- `npm run build:remote`: Remote UI本番ビルド

**Remote UIで利用可能な機能**:
- ワークフロー表示・操作
- Spec/Bug一覧と詳細表示
- Agent実行状態の監視・制御
- ログのリアルタイム表示
- Auto Execution開始・停止

**Desktop UI vs Remote UI**:
| 観点 | Desktop UI | Remote UI |
|------|------------|-----------|
| アクセス | Electronウィンドウ | ブラウザ（localhost / Cloudflare Tunnel） |
| 通信 | IpcApiClient | WebSocketApiClient |
| Provider | ApiClientProvider + PlatformProvider | 同左 |
| レスポンシブ | - | MobileLayout / DesktopLayout |
| 機能範囲 | フル機能 | 閲覧・実行（設定変更は制限あり） |
| 状態管理 | shared/stores | shared/stores（ApiClient経由で同期） |

**CLI起動オプション（E2Eテスト用）**:
```bash
sdd-orchestrator --project=/path/to/project --remote-ui=auto --headless --e2e-test
```
- `--remote-ui=auto`: Remote UIサーバーを自動起動
- `--headless`: ウィンドウを表示しない
- `--remote-token=<token>`: 固定アクセストークン指定

## 新規Spec作成時の確認事項

### Remote UI影響チェック

新しい機能を設計する際は、以下を明確にすること：

1. **Remote UIへの影響有無**
   - この機能はRemote UIからも利用可能にするか？
   - Desktop専用機能か？

2. **Remote UIも変更する場合**
   - WebSocketハンドラの追加が必要か？
   - `remote-ui/` 側のコンポーネント・stores追加が必要か？
   - 同期方式（push/pull）の設計

3. **要件定義での明記**
   - `requirements.md` に「Remote UI対応: 要/不要」を記載
   - 対応する場合、どの操作をRemote UIで許可するか明記

### ロギング設計
- **ProjectLogger**: プロジェクト別ログファイル + グローバルログへの二重書き込み
- **LogRotationManager**: 10MB/日付単位ローテーション、30日保持
- **ログ保存場所**:
  - グローバル: `~/Library/Logs/SDD Orchestrator/main.log`（本番）
  - プロジェクト: `{projectPath}/.kiro/logs/main.log`
- **フォーマット**: `[timestamp] [LEVEL] [projectId] message`

---
_Document standards and patterns, not every dependency_
_updated_at: 2025-12-19_
