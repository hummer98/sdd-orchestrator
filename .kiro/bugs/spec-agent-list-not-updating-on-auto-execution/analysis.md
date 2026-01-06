# Bug Analysis: spec-agent-list-not-updating-on-auto-execution

## Summary
自動実行中にAgentが起動してもAgentListPanelのUI（Agent一覧）が更新されない。IPCイベントの条件分岐で`event.record`が存在しない場合にレンダラーへの通知がスキップされている。

## Root Cause
**Location**: `electron-sdd-manager/src/main/ipc/handlers.ts:2083`
**Component**: AgentRecordWatcher → IPC Event → agentStore 経路
**Trigger**: `AgentRecordWatcherService.readRecord()` が失敗した場合、または `event.record` が `undefined` の場合

### Technical Details

#### イベントフロー
1. 自動実行で `specManagerService.startAgent` が呼ばれる
2. `AgentRecordService.writeRecord()` が `.kiro/runtime/agents/{specId}/{agentId}.json` を書き込む
3. `AgentRecordWatcherService` (chokidar) がファイル変更を検出
4. `handleEvent()` → `readRecord()` でファイル内容を読み取り
5. **handlers.ts:2081-2103** でIPCイベントをレンダラーに送信
6. **agentStore.ts:397-454** で `onAgentRecordChanged` リスナーがストアを更新
7. **AgentListPanel.tsx** がZustandの `agents` 状態を購読してUI更新

#### 問題のコード（handlers.ts:2081-2103）
```typescript
agentRecordWatcherService.onChange((event) => {
  logger.debug('[handlers] Agent record changed', { type: event.type, specId: event.specId, agentId: event.agentId });
  if (!window.isDestroyed() && event.record) {  // ← event.record が undefined だと通知されない
    // Send the full AgentInfo to renderer
    const agentInfo: AgentInfo = { /* ... */ };
    window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, agentInfo);
  } else if (!window.isDestroyed() && event.type === 'unlink') {
    // For unlink events, send just the IDs
    window.webContents.send(IPC_CHANNELS.AGENT_RECORD_CHANGED, event.type, {
      agentId: event.agentId,
      specId: event.specId,
    });
  }
  // ← event.record が undefined かつ type !== 'unlink' の場合、何も通知されない
});
```

#### AgentRecordWatcherService.readRecord() の問題箇所
```typescript
private async readRecord(filePath: string): Promise<AgentRecord | undefined> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as AgentRecord;
  } catch (error) {
    logger.warn('[AgentRecordWatcherService] Failed to read record', { filePath, error });
    return undefined;  // ← 読み取り失敗時に undefined を返す
  }
}
```

### 推定される失敗シナリオ
1. **ファイル書き込み中の読み取り**: chokidarの `awaitWriteFinish` オプション（100ms）が設定されているが、書き込みとほぼ同時に読み取りが発生する可能性
2. **JSONパースエラー**: ファイル内容が不完全な状態で読み取られた場合
3. **ファイルアクセスエラー**: 一時的なファイルロック等

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行機能のみ。手動実行ではUI上のボタンクリック→startAgent→イベント発火の順序で実行されるため問題が発生しにくい
- **Risk**: 自動実行中にAgent一覧が表示されないため、ユーザーがAgentのログを確認できない

## Related Code
- `electron-sdd-manager/src/main/ipc/handlers.ts:2081-2103` - IPC通知条件
- `electron-sdd-manager/src/main/services/agentRecordWatcherService.ts:65-72` - readRecord
- `electron-sdd-manager/src/main/services/agentRecordWatcherService.ts:133-151` - handleEvent（debounce処理）
- `electron-sdd-manager/src/renderer/stores/agentStore.ts:397-454` - onAgentRecordChanged リスナー

## Proposed Solution

### Option 1: readRecord失敗時のリトライ（推奨）
- Description: `readRecord`が失敗した場合、短い遅延後にリトライ（最大3回程度）
- Pros: 一時的なファイルアクセスエラーに対応可能、シンプルな修正
- Cons: リトライ上限に達した場合は依然として通知されない

### Option 2: readRecord失敗時もIPC通知（フォールバック）
- Description: `event.record`が`undefined`でも`event.specId`と`event.agentId`がある場合はレンダラーに通知し、レンダラー側で`loadAgents()`を呼び出してリロード
- Pros: 確実にUI更新が発生する
- Cons: 追加のIPCラウンドトリップが発生

### Option 3: awaitWriteFinishの調整
- Description: `stabilityThreshold`を100msから200-300ms程度に増加
- Pros: ファイル書き込み完了を待つ時間が増えるため、読み取り成功率が上がる
- Cons: 通知の遅延が増加、根本解決にはならない

### Recommended Approach
**Option 1 + Option 3 の組み合わせ**

1. `AgentRecordWatcherService.readRecord()`にリトライロジックを追加
2. `awaitWriteFinish.stabilityThreshold`を150-200msに調整
3. ログレベルを`warn`から`debug`に変更（ノイズ削減）

```typescript
private async readRecord(filePath: string, retries = 3): Promise<AgentRecord | undefined> {
  for (let i = 0; i < retries; i++) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as AgentRecord;
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 50 * (i + 1)));
        continue;
      }
      logger.debug('[AgentRecordWatcherService] Failed to read record after retries', { filePath, error });
      return undefined;
    }
  }
}
```

## Dependencies
- chokidar (ファイル監視ライブラリ)
- Electron IPC通信
- Zustand (状態管理)

## Testing Strategy
1. **単体テスト**: `AgentRecordWatcherService.readRecord`のリトライロジックをテスト
2. **統合テスト**: 自動実行を開始し、Agent一覧にAgentが表示されることを確認
3. **E2Eテスト**: 自動実行シナリオでAgent一覧の更新を検証
