# Project Structure

## Organization Philosophy

**単一アプリケーション**: Electronベースのデスクトップアプリケーション。メインプロセスとレンダラープロセスの分離を基本とする。

## Directory Patterns

### Application Root
**Location**: `/electron-sdd-manager/`
**Purpose**: Electronアプリケーションのルート
**Example**: `package.json`、`node_modules`、ビルド設定

### Electron構造
```
electron-sdd-manager/src/
├── main/           # Electronメインプロセス
│   ├── services/   # バックエンドサービス
│   │   └── ssh/    # SSH関連サービス
│   ├── ipc/        # IPCハンドラ
│   └── utils/      # メインプロセス用ユーティリティ
├── preload/        # preloadスクリプト
├── renderer/       # レンダラープロセス（Electron React）
│   ├── components/ # Electron専用UIコンポーネント
│   ├── electron-specific/ # Electron専用コンポーネント（SSH, CLI等）
│   ├── stores/     # [UI State Only] UI専用状態管理 (editorStore, modalStore)
│   ├── hooks/      # カスタムフック
│   ├── types/      # TypeScript型定義
│   ├── services/   # レンダラー側サービス
│   └── utils/      # ユーティリティ関数
├── shared/         # Electron版/Remote UI版共有コード
│   ├── api/        # ApiClient抽象化層 (IpcApiClient, WebSocketApiClient)
│   ├── components/ # 共有UIコンポーネント (spec/, bug/, workflow/, etc.)
│   ├── hooks/      # 共有フック (useDeviceType等)
│   ├── providers/  # React Context Provider (PlatformProvider等)
│   ├── stores/     # [Domain State SSOT] 共有Zustand stores (agentStore, bugStore, specStore)
│   └── types/      # 共有型定義
├── remote-ui/      # Remote UIアプリケーション（Web版React）
│   ├── layouts/    # MobileLayout, DesktopLayout
│   ├── web-specific/ # Web専用コンポーネント (AuthPage, ReconnectOverlay)
│   ├── main.tsx    # エントリーポイント
│   └── App.tsx     # ルートコンポーネント
├── e2e/            # E2Eテスト
└── test/           # テストセットアップ
```

## State Management Rules (Strict)

### 1. Domain State (SSOT)
**Location**: `src/shared/stores/`
**Content**: ビジネスロジック、データモデル、APIレスポンス
**Examples**: `agentStore` (エージェント一覧), `bugStore` (バグ一覧), `specStore` (仕様書)
**Rule**: **重複禁止**。Renderer/RemoteUIに関わらず、ドメインデータは必ずここを参照する。

### 2. UI State
**Location**: `src/renderer/stores/` (Electron), `src/remote-ui/stores/` (Web)
**Content**: UIの一時的な状態、表示制御
**Examples**: `editorStore` (スクロール位置), `modalStore` (ダイアログ開閉)
**Rule**: ドメインデータを含めてはならない。ドメインデータが必要な場合は `shared` ストアを参照するか、Selectorを使用する。

## Electron Process Boundary Rules (Strict)

**背景**: AIはIPC往復の削減やReactのリアクティビティ活用を理由に、Mainプロセスで保持すべきステートをRendererに配置しがちである。これはElectronアーキテクチャの原則に反し、以下の問題を引き起こす:
- Rendererクラッシュ時のステート消失
- 複数ウィンドウ/Remote UI間でのステート不整合
- セキュリティ境界の曖昧化

### Main Processが保持すべきステート

| カテゴリ | 具体例 | 理由 |
|----------|--------|------|
| **セッション状態** | 選択中プロジェクトパス、認証状態 | 複数ウィンドウで共有、Rendererクラッシュ耐性 |
| **プロセス管理** | 起動中Agent、子プロセスの状態 | プロセスライフサイクルはMainの責務 |
| **ファイル監視** | chokidar watcherインスタンス | Node.js APIはMainでのみ使用可能 |
| **永続設定** | アプリ設定、最近使ったプロジェクト | electron-store経由でMainが管理 |
| **ネットワーク接続** | WebSocket接続、Remote UIセッション | サーバーサイド処理はMainの責務 |
| **機密情報** | トークン、認証情報 | Rendererは信頼境界外 |

### Rendererへの委譲禁止パターン

以下の理由でRendererにステートを配置することは**禁止**:

| 禁止理由 | 具体例 | なぜ問題か |
|----------|--------|-----------|
| 「IPC往復を減らしたい」 | プロジェクト選択状態をRendererのみで保持 | Mainとの状態不整合、再起動時の復元不可 |
| 「Reactで簡単に実装できる」 | Agent一覧をRenderer内Zustandで完結 | Remote UIとの同期が必要、Mainが正確な状態を知れない |
| 「preload API定義が面倒」 | 新機能のステートをRenderer内で閉じる | IPC設計をスキップすると後で負債になる |

### ステート配置の判断基準

新しいステートを追加する際、以下のチェックリストで配置先を決定する:

| 質問 | Yes → Main | No → Renderer可 |
|------|------------|-----------------|
| Rendererクラッシュ後も復元が必要か？ | ✓ | |
| 複数ウィンドウ/Remote UIで共有が必要か？ | ✓ | |
| アプリ再起動後も保持すべきか？ | ✓ | |
| 機密情報を含むか？ | ✓ | |
| Node.js APIへのアクセスが必要か？ | ✓ | |
| UIの一時的な表示状態のみか？ | | ✓ |

**1つでもYesがあればMain Processで保持する。**

### 正しい実装パターン

```
[Main Process]
├── セッション状態の保持
├── プロセス/ファイル監視の管理
├── IPCハンドラでステート変更を受け付け
└── ステート変更時にRendererへブロードキャスト

[Renderer Process]
├── UIステート（表示制御、フォーム入力中の値）
├── Main Processステートの読み取り専用キャッシュ
└── ステート変更はIPC経由でMainに依頼
```

### アンチパターン例

```typescript
// ❌ NG: RendererでAgent状態を管理（Mainが知らない状態が生まれる）
const useAgentStore = create((set) => ({
  runningAgents: [],
  startAgent: (config) => {
    // Renderer内で状態を更新してからIPCを呼ぶ
    set({ runningAgents: [...runningAgents, config] });
    window.electronAPI.startAgent(config);
  }
}));

// ✅ OK: MainでAgent状態を管理し、RendererはIPCでリクエスト
const useAgentStore = create((set) => ({
  runningAgents: [], // Mainからの同期データ
  requestStartAgent: async (config) => {
    // MainにリクエストしてMainが状態を更新、ブロードキャストで同期
    await window.electronAPI.startAgent(config);
  }
}));
```

### 設計レビュー時の確認事項

Electron機能の設計時、以下を必ず確認する:

1. **新しいステートはどこで保持するか？** → 上記判断基準で決定
2. **Renderer側のステートは「Mainのキャッシュ」になっているか？** → Rendererが真実の情報源にならない
3. **ステート変更の流れは Renderer → IPC → Main → ブロードキャスト → Renderer か？** → 逆方向のフローは設計ミス

## Component Organization Rules (Strict)

### 1. Shared Components (SSOT)
**Location**: `src/shared/components/`
**Content**: Electron版とRemote UI版で共有するUIコンポーネント
**Subdirectories**: `ui/`, `spec/`, `bug/`, `workflow/`, `review/`, `execution/`, `project/`, `agent/`
**Rule**: **重複禁止**。両環境で使用するコンポーネントは必ずここに配置する。

### 2. Platform-Specific Components
**Location**: `src/renderer/components/` (Electron), `src/remote-ui/` (Web)
**Content**: 各プラットフォーム専用のコンポーネント
**Examples**: `SSHConnectDialog` (Electron専用), `AuthPage` (Web専用)
**Rule**: 共通コンポーネントの重複コピーを配置してはならない。

### 3. Re-export Pattern
**Purpose**: 後方互換性とインポートパスの簡略化
**Method**: `renderer/components/index.ts` から shared コンポーネントを再exportする
```typescript
// renderer/components/index.ts
// 共通コンポーネントはsharedから再export
export { PhaseItem, type PhaseItemProps } from '@shared/components/workflow';
export { BugListItem, type BugListItemProps } from '@shared/components/bug';
```

## Naming Conventions

- **Components**: PascalCase (`SpecListPanel.tsx`, `ApprovalPanel.tsx`)
- **Services**: camelCase (`agentProcess.ts`, `fileService.ts`)
- **Stores**: camelCase (`projectStore.ts`, `editorStore.ts`)
- **Hooks**: `use` prefix + camelCase (`useFileWatcher.tsx`)
- **Tests**: `*.test.ts(x)` (実装ファイルと同ディレクトリ)
- **Types**: `types/index.ts` に集約、ドメイン別は `types/*.ts`

## Import Organization

```typescript
// 外部ライブラリ
import { useState } from 'react'
import { create } from 'zustand'

// 内部モジュール (相対パス)
import { useConfigStore } from '../stores'
import { SpecListPanel } from '../components'

// 型
import type { Spec, Phase } from '../types'
```

## Code Organization Principles

### Barrel Exports
各ディレクトリに`index.ts`を配置し、外部へのエクスポートを集約:
```typescript
// components/index.ts
export { SpecListPanel } from './SpecListPanel'
export { ApprovalPanel } from './ApprovalPanel'
```

### Co-location
テストファイルは実装ファイルと同ディレクトリに配置:
```
components/
├── SpecListPanel.tsx
├── SpecListPanel.test.tsx
├── ApprovalPanel.tsx
└── ApprovalPanel.test.tsx
```

### Service Pattern (main process)
ドメイン別にサービスを分離:
- **Spec管理**: `specManagerService.ts`
- **バグ管理**: `bugService.ts`
- **エージェント**: `agentProcess.ts`, `agentRegistry.ts`
- **ファイル**: `fileService.ts`
- **コマンド**: `commandService.ts`
- **SSH/リモート**: `ssh/` ディレクトリ配下
- **設定管理**: `settingsFileManager.ts`, `profileManager.ts`

### IPC Pattern
```
main/ipc/
├── channels.ts         # チャンネル名定義
├── handlers.ts         # 主要IPCハンドラ
├── remoteAccessHandlers.ts  # リモートアクセス用
└── sshHandlers.ts      # SSH用
```

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
_updated_at: 2025-01-19_