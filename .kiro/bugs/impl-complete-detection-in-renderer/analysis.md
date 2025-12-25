# Bug Analysis: impl-complete-detection-in-renderer

## Summary
tasks.md の全タスク完了検知がレンダラープロセス (specStore) に実装されており、メインプロセスでの監視が行われていないため、アプリ終了時や spec 未選択時に phase 更新が行われない。

## Root Cause

**設計上の責務配置ミス**: タスク完了判定ロジックがレンダラープロセスに実装されているが、これはメインプロセスで行うべき処理である。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/specStore.ts:248-265`
- **Component**: specStore.selectSpec() 関数
- **Trigger**: ユーザーが UI で spec を選択した時のみ発火

### 問題のコードフロー

```
現在の実装:
┌────────────────────────────────────────┐
│ レンダラープロセス (specStore)          │
│ ┌────────────────────────────────────┐ │
│ │ selectSpec() 呼び出し時のみ        │ │
│ │ ↓                                  │ │
│ │ tasks.md を window.electronAPI で読込│ │
│ │ ↓                                  │ │
│ │ 正規表現でチェックボックス数カウント│ │
│ │ ↓                                  │ │
│ │ isAllComplete = completed === total │ │
│ │ ↓                                  │ │
│ │ IPC: syncSpecPhase('impl-complete') │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
           ↓ IPC呼び出し
┌────────────────────────────────────────┐
│ メインプロセス (fileService)           │
│ updateSpecJsonFromPhase() 実行        │
│ → spec.json 書き込み                  │
└────────────────────────────────────────┘
```

### 問題のコード

```typescript
// specStore.ts:248-265
if (total > 0) {
  const currentPhase = specJson.phase;
  const isAllComplete = completed === total;

  // If all tasks complete but phase is not implementation-complete, fix it
  if (isAllComplete && currentPhase !== 'implementation-complete') {
    console.log('[specStore] Auto-fixing phase to implementation-complete', { spec: spec.name, currentPhase });
    try {
      await window.electronAPI.syncSpecPhase(spec.path, 'impl-complete', { skipTimestamp: true });
      specJson.phase = 'implementation-complete';
    } catch (error) {
      console.error('[specStore] Failed to auto-fix phase:', error);
    }
  }
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**:
  - CLI (`/kiro:spec-impl`) で実装を完了したユーザー全員
  - アプリを閉じた状態で Claude CLI を使用するワークフロー
- **Risk**:
  - phase が正しく反映されないため、`documentReviewService.canStartReview()` の判定が不正確になる
  - ワークフロー表示が実態と乖離する

## Related Code

### specsWatcherService.ts（メインプロセス）

chokidar でファイル変更を監視しているが、**tasks.md のパース・判定は行っていない**:

```typescript
// specsWatcherService.ts:60-68
this.watcher = chokidar.watch(specsDir, {
  ignoreInitial: true,
  persistent: true,
  depth: 2, // Watch spec folders and their immediate contents
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
});
```

単純にファイル変更イベントをコールバックに通知するのみ:

```typescript
// specsWatcherService.ts:98-101
this.debounceTimer = setTimeout(() => {
  const event: SpecsChangeEvent = { type, path: filePath, specId };
  this.callbacks.forEach((cb) => cb(event));
}, this.debounceMs);
```

### fileService.ts（メインプロセス）

spec.json 更新機能は既に存在するが、**自発的に tasks.md を読んで判定する機能はない**:

```typescript
// fileService.ts:499-530
async updateSpecJsonFromPhase(
  specPath: string,
  completedPhase: 'requirements' | 'design' | 'tasks' | 'impl' | 'impl-complete',
  options?: { skipTimestamp?: boolean }
): Promise<Result<void, FileError>> {
  // ... 受動的に呼ばれるのみ
}
```

## Proposed Solution

### Option 1: specsWatcherService に tasks.md パース機能を追加（推奨）

**Description**: specsWatcherService で tasks.md 変更検知時に自動で完了判定を行う

**Pros**:
- メインプロセスで完結する（Single Source of Truth）
- アプリ起動中は常に監視される
- レンダラーの状態に依存しない

**Cons**:
- specsWatcherService の責務が増える
- tasks.md パースロジックの重複（specStore と共通化が必要）

### Option 2: 専用サービス TaskCompletionWatcherService を新設

**Description**: tasks.md の監視と完了判定を専門に行うサービスを追加

**Pros**:
- 関心の分離が明確
- テストしやすい
- 拡張性が高い

**Cons**:
- 新規ファイル追加
- specsWatcherService との連携が必要

### Recommended Approach

**Option 1** を推奨。理由:
1. specsWatcherService は既に specs ディレクトリを監視しており、tasks.md も監視範囲内
2. 最小限の変更で実現可能
3. 既存の onChange コールバック機構を活用できる

**実装概要**:
1. specsWatcherService に `checkTaskCompletion(specPath: string)` メソッドを追加
2. tasks.md 変更時にパースして isAllComplete を判定
3. 完了時は fileService.updateSpecJsonFromPhase() を直接呼び出す
4. specStore の判定ロジックは削除または fallback として残す

## Dependencies
- `electron-sdd-manager/src/main/services/specsWatcherService.ts`
- `electron-sdd-manager/src/main/services/fileService.ts`
- `electron-sdd-manager/src/renderer/stores/specStore.ts`

## Testing Strategy
1. **Unit Test**: specsWatcherService.checkTaskCompletion() のパースロジック
2. **Integration Test**: tasks.md 変更 → spec.json phase 更新の E2E フロー
3. **Manual Test**:
   - SDD Orchestrator を閉じた状態で CLI で tasks.md を完了
   - アプリ再起動時に phase が implementation-complete になっていることを確認
