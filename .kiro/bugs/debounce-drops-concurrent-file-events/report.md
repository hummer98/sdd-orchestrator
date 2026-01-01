# Bug Report: debounce-drops-concurrent-file-events

## Overview
SpecsWatcherServiceのdebounce処理が単一タイマーで実装されているため、同一spec内で300ms以内に複数ファイルが変更されると、最後のファイルのイベントしかRendererに通知されない。これにより、inspection実行中にtasks.mdが更新されてもタスクパネルUIが更新されない問題が発生する。

## Status
**Pending**

## Environment
- Date Reported: 2026-01-02T12:30:00+09:00
- Affected Component: electron-sdd-manager/src/main/services/specsWatcherService.ts
- Severity: Medium

## Steps to Reproduce

1. タスクが存在する仕様（tasks.mdあり）を選択
2. spec-inspectionを実行
3. inspection実行中に以下が発生:
   - spec.jsonが更新（inspection field追加）
   - inspection-N.mdが作成
   - tasks.mdにタスクが追記される
4. タスクパネルを確認

## Expected Behavior
tasks.mdの変更がUIに反映され、追加されたタスクがタスクパネルに表示される

## Actual Behavior
tasks.mdの変更イベントがdebounceによりキャンセルされ、タスクパネルが更新されない

## Error Messages / Logs
```
[SpecsWatcherService] File event { type: 'change', filePath: '.../tasks.md', specId: '...' }
[SpecsWatcherService] File event { type: 'add', filePath: '.../inspection-1.md', specId: '...' }
# ↑ 300ms以内に発生すると、tasks.mdのイベントがキャンセルされる
```

## Related Files
- electron-sdd-manager/src/main/services/specsWatcherService.ts (Line 106-114)

## Root Cause
```typescript
// 現在の実装（問題あり）
if (this.debounceTimer) {
  clearTimeout(this.debounceTimer);  // 前のイベントをキャンセル
}

this.debounceTimer = setTimeout(() => {
  const event: SpecsChangeEvent = { type, path: filePath, specId };
  this.callbacks.forEach((cb) => cb(event));
}, this.debounceMs);  // 300ms
```

単一のdebounceTimerを使用しているため、新しいイベントが来ると前のイベントがキャンセルされる。

## Proposed Fix
ファイルパスごとに個別のdebounceタイマーを管理する:

```typescript
private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

private handleEvent(type, filePath): void {
  const specId = this.extractSpecId(filePath);
  const key = filePath;

  const existing = this.debounceTimers.get(key);
  if (existing) clearTimeout(existing);

  this.debounceTimers.set(key, setTimeout(() => {
    const event = { type, path: filePath, specId };
    this.callbacks.forEach((cb) => cb(event));
    this.debounceTimers.delete(key);
  }, this.debounceMs));
}
```

## Additional Context
- 0.15.1で確認された問題
- 0.15.2のinspectionタブ修正（1d5a4be）では解消されていない
- inspection以外でも、複数ファイルが短時間で更新されるシナリオで同様の問題が発生する可能性あり
