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
│   ├── remote-ui/  # リモートアクセス用静的UI
│   └── utils/      # メインプロセス用ユーティリティ
├── preload/        # preloadスクリプト
├── renderer/       # レンダラープロセス（React）
│   ├── components/ # UIコンポーネント
│   ├── stores/     # Zustand状態管理
│   ├── hooks/      # カスタムフック
│   ├── types/      # TypeScript型定義
│   ├── services/   # レンダラー側サービス
│   └── utils/      # ユーティリティ関数
├── e2e/            # E2Eテスト
└── test/           # テストセットアップ
```

### Kiro/SDD Configuration
**Location**: `/.kiro/`
**Purpose**: Spec-Driven Development設定・仕様
**Structure**:
```
.kiro/
├── steering/       # プロジェクトメモリ (product.md, tech.md, structure.md)
├── specs/          # 機能仕様 (feature単位)
├── bugs/           # バグレポート (bug単位)
└── settings/       # SDD設定・テンプレート
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

### Store Pattern (Zustand)
```typescript
// stores/configStore.ts
export const useConfigStore = create<ConfigState>((set) => ({
  // state
  projectPath: null,
  // actions
  setProjectPath: (path) => set({ projectPath: path }),
}))
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
_updated_at: 2025-12-19_
