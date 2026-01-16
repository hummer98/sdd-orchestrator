# Electron IPC契約不整合問題

## 概要

Electronの2層プロセスモデル（Main Process / Renderer Process）において、IPC境界を越えた関数シグネチャの不整合がランタイムエラーを引き起こし、ユニットテストでは検出できない問題。

## 発生事例

### bugs-worktree-support機能での発生（2025-01-16）

**エラー内容:**
```
window.electronAPI.createBugWorktree is not a function
```

**原因:**
- `preload/index.ts`では`bugName`のみを引数として定義
- `bugWorktreeHandlers.ts`のIPCハンドラは3引数（`projectPath`, `bugPath`, `bugName`）を期待

```typescript
// preload/index.ts (呼び出し側)
createBugWorktree: (bugName: string): Promise<...> =>
  ipcRenderer.invoke(IPC_CHANNELS.BUG_WORKTREE_CREATE, bugName),

// bugWorktreeHandlers.ts (受信側) - 修正前
ipcMain.handle(
  IPC_CHANNELS.BUG_WORKTREE_CREATE,
  async (_event, projectPath: string, bugPath: string, bugName: string) => {
    return handleBugWorktreeCreate(projectPath, bugPath, bugName);
  }
);
```

## 問題の構造

### Electronの2層モデル

```
Renderer Process          IPC Bridge              Main Process
─────────────────────────────────────────────────────────────
window.electronAPI   →   preload/index.ts   →   ipcMain.handle()
  (型定義参照)            (API定義・引数渡し)      (実装・引数受取)
     ↓
electron.d.ts
  (TypeScript型)
```

### 契約が分散する3箇所

| ファイル | 役割 | 検証タイミング |
|---------|------|--------------|
| `electron.d.ts` | TypeScript型定義 | コンパイル時 |
| `preload/index.ts` | 実際のIPC呼び出し | ランタイム |
| `*Handlers.ts` | IPCハンドラ実装 | ランタイム |

### TypeScriptの限界

`ipcRenderer.invoke()`と`ipcMain.handle()`は**文字列チャンネル名**で接続されるため、TypeScriptコンパイラは引数の型整合性を検証できない。

```typescript
// これらは型システム上は無関係
ipcRenderer.invoke('channel-name', arg1);  // 呼び出し
ipcMain.handle('channel-name', (e, a, b, c) => {});  // 受信
```

## テストで検出できなかった理由

### 既存テストの構造

```typescript
// bugWorktreeHandlers.test.ts
describe('handleBugWorktreeCreate', () => {
  it('should create worktree and update bug.json', async () => {
    // ヘルパー関数を直接呼び出し（3引数）
    const result = await handleBugWorktreeCreate(testDir, bugPath, 'test-bug');
    expect(result.ok).toBe(true);
  });
});
```

**問題点:**
1. テストはヘルパー関数`handleBugWorktreeCreate()`を直接呼び出し
2. `registerBugWorktreeHandlers()`で登録されるIPC部分はテスト対象外
3. preload経由の呼び出しをシミュレートする統合テストが存在しない

### テストカバレッジの盲点

```
[テスト済み]           [未テスト]              [テスト済み]
electron.d.ts型  →  preload実装  →  IPCハンドラ登録  →  ヘルパー関数
                         ↑               ↑
                    ここの整合性が未検証
```

## 類似リスクのある箇所

本プロジェクトには100以上のIPC呼び出しが存在。同様の不整合リスクがある箇所：

### 高リスク（新規追加・複数引数）

| チャンネル | preload引数 | 要確認 |
|-----------|------------|--------|
| `BUG_WORKTREE_CREATE` | `bugName` | **修正済み** |
| `BUG_WORKTREE_REMOVE` | `bugName` | **修正済み** |
| `WORKTREE_CREATE` | `projectPath, featureName` | 要確認 |
| `WORKTREE_IMPL_START` | `projectPath, specPath, featureName` | 要確認 |
| `EXECUTE_DOCUMENT_REVIEW_REPLY` | 5引数 | 要確認 |

### 中リスク（パターン不統一）

一部のハンドラは`getCurrentProjectPath()`で内部取得し、一部は引数で受け取る。この不統一が混乱を招く。

```typescript
// パターンA: 内部取得（Bug Worktree系 - 修正後）
async (_event, bugName: string) => {
  const projectPath = getCurrentProjectPath();
  // ...
}

// パターンB: 引数で受け取る（Spec Worktree系）
async (_event, projectPath: string, featureName: string) => {
  // ...
}
```

## 対策案

### 1. IPC契約の一元管理（推奨）

```typescript
// ipc-contracts.ts - 単一ファイルで契約を定義
export const IPC_CONTRACTS = {
  BUG_WORKTREE_CREATE: {
    channel: 'bug-worktree:create',
    args: z.object({ bugName: z.string() }),
    returns: z.object({ ok: z.boolean(), /* ... */ }),
  },
  // ...
} as const;
```

preloadとhandlerの両方がこの定義を参照することで、型の不整合をコンパイル時に検出可能。

### 2. 型安全IPCライブラリの採用

- **electron-trpc**: tRPCベースの型安全IPC
- **electron-typed-ipc**: 型推論による安全なIPC
- **electron-better-ipc**: シンプルな型付きIPC

### 3. 統合テストの追加

```typescript
// IPC統合テスト
describe('IPC Contract Tests', () => {
  it('BUG_WORKTREE_CREATE should accept bugName only', async () => {
    // preloadと同じシグネチャで呼び出し
    const mockIpcRenderer = createMockIpcRenderer();
    const result = await mockIpcRenderer.invoke(
      IPC_CHANNELS.BUG_WORKTREE_CREATE,
      'test-bug'  // preloadと同じ引数
    );
    expect(result.ok).toBeDefined();
  });
});
```

### 4. E2Eテストでの検証

Playwrightを使用した実際のUI操作テストで、preload経由のIPC呼び出しを検証。

## 教訓

1. **境界テストの重要性**: モジュール境界（特にプロセス間通信）の統合テストは必須
2. **契約の一元化**: 分散した契約定義は不整合リスクを高める
3. **型システムの限界認識**: TypeScriptは文字列ベースの動的接続を検証できない
4. **パターンの統一**: `getCurrentProjectPath()`使用の有無など、設計パターンを統一すべき

## 関連ファイル

- `electron-sdd-manager/src/preload/index.ts` - preload API定義
- `electron-sdd-manager/src/renderer/types/electron.d.ts` - 型定義
- `electron-sdd-manager/src/main/ipc/bugWorktreeHandlers.ts` - 修正対象
- `electron-sdd-manager/src/main/ipc/channels.ts` - チャンネル定数

## 参考資料

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [electron-trpc](https://github.com/jsonnull/electron-trpc)
- [Type-Safe IPC in Electron](https://blog.nicco.io/2022/06/22/type-safe-ipc-in-electron/)
