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
