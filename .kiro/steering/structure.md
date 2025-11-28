# Project Structure

## Organization Philosophy

**モジュール分離**: 各アプリケーション（Tauri版、Electron版）は独立したディレクトリで管理。共通パターンは踏襲するが、コードは分離。

## Directory Patterns

### Application Root
**Location**: `/sdd-manager-app/`, `/electron-sdd-manager/`
**Purpose**: 各デスクトップアプリケーションのルート
**Example**: 独立した`package.json`、`node_modules`、ビルド設定

### Source Structure (共通パターン)
```
src/
├── components/     # UIコンポーネント
├── stores/         # Zustand状態管理
├── hooks/          # カスタムフック
├── types/          # TypeScript型定義
├── utils/          # ユーティリティ関数
├── config/         # 設定
├── lib/            # ライブラリ
└── test/           # テストセットアップ
```

### Electron固有構造
```
electron-sdd-manager/src/
├── main/           # Electronメインプロセス
│   ├── services/   # バックエンドサービス
│   └── ipc/        # IPCハンドラ
├── preload/        # preloadスクリプト
└── renderer/       # レンダラープロセス（React）
    ├── components/
    └── stores/
```

### Tauri固有構造
```
sdd-manager-app/
├── src/            # Reactフロントエンド
└── src-tauri/      # Rustバックエンド
    └── src/
        ├── error.rs
        ├── models.rs
        └── lib.rs
```

### Kiro/SDD Configuration
**Location**: `/.kiro/`
**Purpose**: Spec-Driven Development設定・仕様
**Structure**:
```
.kiro/
├── steering/       # プロジェクトメモリ (product.md, tech.md, structure.md)
├── specs/          # 機能仕様 (feature単位)
└── settings/       # SDD設定・テンプレート
```

## Naming Conventions

- **Components**: PascalCase (`SpecListPanel.tsx`, `ApprovalPanel.tsx`)
- **Stores**: camelCase (`projectStore.ts`, `editorStore.ts`)
- **Hooks**: `use` prefix + camelCase (`useFileWatcher.tsx`)
- **Tests**: `*.test.ts(x)` (実装ファイルと同ディレクトリ)
- **Types**: `types/index.ts` に集約、または `types/*.d.ts`

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

### Service Pattern (Electron main)
```
main/services/
├── agentProcess.ts      # AIエージェントプロセス管理
├── fileService.ts       # ファイル操作
├── commandService.ts    # コマンド実行
└── specManagerService.ts # Spec管理
```

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
