# Bug Analysis: bugs-agent-list-not-updating

## Summary
Bug選択時に`switchAgentWatchScope` IPCが呼び出されていないため、エージェントディレクトリの変更が監視されず、BugsエージェントリストがFix等の実行後も更新されない。

## Root Cause
**agent-watcher-optimization機能のTask 4.2（Renderer側連携）が未実装**。

Main Process側のIPC連携（Task 4.1）は実装済みだが、Renderer側からのIPC呼び出しが実装されていない。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/bugStore.ts:117` (`selectBug`関数)
- **Component**: bugStore, specDetailStore, preload/index.ts
- **Trigger**: バグを選択してもswitchAgentWatchScope IPCが呼び出されない

### 問題の連鎖
1. **preload/index.ts**: `switchAgentWatchScope` APIが露出されていない
2. **bugStore.ts**: `selectBug`で`switchAgentWatchScope`を呼び出していない
3. **specDetailStore.ts**: `selectSpec`でも同様に呼び出していない（Spec側も同様のバグあり）

## Impact Assessment
- **Severity**: Medium
- **Scope**: Bugs/Specタブでエージェント実行時のリアルタイム更新が機能しない
- **Risk**: 低（機能が動かないだけで、データ損失やセキュリティリスクはない）

## Related Code
```typescript
// handlers.ts:688-695 - IPC handler実装済み
ipcMain.handle(IPC_CHANNELS.SWITCH_AGENT_WATCH_SCOPE, async (_event, scopeId: string | null) => {
  if (agentRecordWatcherService) {
    logger.info('[handlers] Switching agent watch scope', { scopeId });
    await agentRecordWatcherService.switchWatchScope(scopeId);
  } else {
    logger.warn('[handlers] Cannot switch scope: agent record watcher not running');
  }
});
```

```typescript
// bugStore.ts:117-142 - switchAgentWatchScope呼び出しが欠落
selectBug: async (bug: BugMetadata, options?: { silent?: boolean }) => {
  // ... 現在の実装にはswitchAgentWatchScopeの呼び出しがない
}
```

## Proposed Solution

### Option 1: preload + store改修（推奨）
- **Description**: preload APIに`switchAgentWatchScope`を追加し、bugStore/specDetailStoreから呼び出す
- **Pros**:
  - agent-watcher-optimization仕様に沿った正規の実装
  - Spec/Bug両方の問題を解決
- **Cons**:
  - 複数ファイルの変更が必要

### Option 2: 監視範囲を全体に戻す
- **Description**: AgentRecordWatcherServiceを全ディレクトリ監視に戻す
- **Pros**:
  - 変更が最小限
- **Cons**:
  - agent-watcher-optimization機能のパフォーマンス改善が無効になる

### Recommended Approach
**Option 1**を採用。以下の変更を行う：

1. `preload/index.ts`に`switchAgentWatchScope` APIを追加
2. `bugStore.ts`の`selectBug`で呼び出し追加
3. `specDetailStore.ts`の`selectSpec`で呼び出し追加（同様のバグ修正）

## Dependencies
- `electron-sdd-manager/src/preload/index.ts`: API露出追加
- `electron-sdd-manager/src/renderer/stores/bugStore.ts`: 呼び出し追加
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts`: 呼び出し追加（同様のバグ修正）

## Testing Strategy
1. **ユニットテスト**: bugStore/specDetailStoreで`switchAgentWatchScope`が呼び出されることを確認
2. **手動テスト**:
   - Bugsタブでバグを選択→Fix実行→エージェント一覧が更新されることを確認
   - Specタブでスペックを選択→Phase実行→エージェント一覧が更新されることを確認
3. **E2Eテスト**: 既存のエージェント関連テストがPassすることを確認
