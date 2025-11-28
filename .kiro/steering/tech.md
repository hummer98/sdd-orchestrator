# Technology Stack

## Architecture

デュアル実装アプローチ: Tauri版とElectron版の2つのデスクトップアプリケーション。

### sdd-manager-app (Tauri版)
- **フロントエンド**: React + TypeScript (Vite)
- **バックエンド**: Rust (Tauri 2.x)
- **IPC**: tauri-specta (型安全通信)

### electron-sdd-manager (Electron版)
- **フロントエンド**: React + TypeScript (Vite)
- **バックエンド**: Node.js (Electron)
- **IPC**: contextBridge + preload

## Core Technologies

- **Language**: TypeScript 5.8+, Rust (Tauri版のみ)
- **Framework**: React 19, Vite 5+
- **Runtime**: Node.js 20+ (Electron), Tauri 2.x

## Key Libraries

### 状態管理
- **Zustand**: 軽量ステート管理（stores/に配置）
- **TanStack Query**: サーバー状態・非同期データ管理 (Tauri版)

### UI/スタイリング
- **Tailwind CSS 4**: ユーティリティファーストCSS
- **Lucide React**: アイコンライブラリ
- **@uiw/react-md-editor**: Markdownエディタ

### バリデーション
- **Zod**: スキーマバリデーション

### Tauri プラグイン (sdd-manager-app)
- `@tauri-apps/plugin-dialog`: ファイルダイアログ
- `@tauri-apps/plugin-fs`: ファイルシステムアクセス
- `@tauri-apps/plugin-shell`: シェルコマンド実行

## Development Standards

### Type Safety
- TypeScript strict mode
- Zod によるランタイムバリデーション
- 型定義は `types/index.ts` に集約

### Code Quality
- Vitest によるユニットテスト
- WebdriverIO による E2E テスト
- テストファイルは `*.test.ts(x)` 命名

### Testing
```bash
npm run test        # ユニットテスト (watch mode)
npm run test:run    # ユニットテスト (single run)
npm run test:e2e    # E2Eテスト
```

## Development Environment

### Required Tools
- Node.js 20+
- Rust (Tauri版のビルドに必要)
- task (Taskfile.yml 実行用)

### Common Commands

```bash
# sdd-manager-app (Tauri版)
cd sdd-manager-app
npm run dev          # 開発サーバー
npm run tauri dev    # Tauri開発モード
npm run test         # テスト実行

# electron-sdd-manager (Electron版)
cd electron-sdd-manager
npm run dev          # 開発サーバー
npm run dev:electron # Electron起動
npm run test         # テスト実行
```

## Key Technical Decisions

### デュアル実装の理由
- Tauri: 軽量・高性能だがRust必須
- Electron: Node.jsエコシステムとの親和性

### Zustand選択の理由
- 軽量、TypeScriptフレンドリー
- Reactコンポーネント外からもアクセス可能
- シンプルなAPI

### Tailwind CSS 4の採用
- ユーティリティファースト
- PostCSSプラグインとして動作

---
_Document standards and patterns, not every dependency_
