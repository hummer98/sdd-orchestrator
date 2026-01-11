# Bug Analysis: persist-skip-permission-per-project

## Summary
`skipPermissions`設定（`--dangerously-skip-permissions`オプション）がプロジェクト毎に永続化されず、アプリ再起動や別プロジェクトへの切り替え時にリセットされる。

## Root Cause

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/stores/agentStore.ts:36` - `skipPermissions: boolean`の定義
  - `electron-sdd-manager/src/renderer/stores/agentStore.ts:90` - 初期値`false`
  - `electron-sdd-manager/src/renderer/stores/agentStore.ts:520-522` - `setSkipPermissions`アクション
  - `electron-sdd-manager/src/renderer/components/AgentListPanel.tsx:198-210` - UIチェックボックス
- **Component**: agentStore（Zustand store）
- **Trigger**: アプリ再起動、または別プロジェクトへの切り替え

### 問題の詳細

1. **メモリ内のみで状態管理**:
   - `skipPermissions`はZustand storeの状態としてメモリ内でのみ保持
   - プロジェクト設定ファイル（`.kiro/sdd-orchestrator.json`）への永続化処理が**未実装**
   - アプリ再起動時は常に`false`にリセット

2. **現在のデータフロー**:
   ```
   UI変更 → agentStore（メモリ）→ ❌ 永続化されない
   アプリ起動 → agentStore初期化 → 常にfalse
   ```

3. **期待されるデータフロー**:
   ```
   UI変更 → agentStore → sdd-orchestrator.jsonに保存 ✅
   アプリ起動 → sdd-orchestrator.jsonから復帰 → agentStore同期 ✅
   ```

4. **関連コード（現在の実装）**:
   ```typescript
   // agentStore.ts:36 - 定義
   interface AgentState {
     // ...
     skipPermissions: boolean;
   }

   // agentStore.ts:90 - 初期値（常にfalse）
   skipPermissions: false,

   // agentStore.ts:520-522 - 設定変更（永続化なし）
   setSkipPermissions: (enabled: boolean) => {
     set({ skipPermissions: enabled });
   },
   ```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 自動実行時に`--dangerously-skip-permissions`を使用したいユーザー
- **Risk**: 毎回手動でチェックボックスをONにする必要があり、UX低下

## Related Code

### 現在のUI実装（AgentListPanel.tsx:198-210）
```typescript
<label
  className="ml-auto flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
  title="--dangerously-skip-permissions オプションを有効化"
>
  <input
    type="checkbox"
    checked={skipPermissions}
    onChange={(e) => setSkipPermissions(e.target.checked)}
    className="w-3 h-3 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
    aria-label="Skip Permissions"
  />
  <span className="select-none">Skip Permissions</span>
</label>
```

### 設定ファイル構造（sdd-orchestrator.json）
```json
{
  "version": 3,
  "profile": { ... },
  "layout": { ... },
  "commandsets": { ... }
  // ❌ skipPermissionsフィールドがない
}
```

## Proposed Solution

### Option 1: sdd-orchestrator.jsonに保存（推奨）
- Description: `skipPermissions`を`sdd-orchestrator.json`に追加し、プロジェクト設定として永続化
- Pros:
  - プロジェクト毎に異なる設定が可能
  - 既存のlayoutConfigServiceパターンを活用可能
  - アプリ再起動後も設定が保持される
- Cons:
  - layoutConfigServiceの拡張が必要

### Option 2: spec.jsonのautoExecution内に保存
- Description: 各Specの`spec.json`の`autoExecution`セクションに保存
- Pros:
  - 既存のautoExecution永続化パターン（auto-execution-settings-not-persisted修正）と一致
  - Spec毎に異なる設定が可能
- Cons:
  - skipPermissionsはSpec固有ではなくプロジェクト共通設定として適切

### Recommended Approach
**Option 1**を推奨。理由：
1. `skipPermissions`はプロジェクト全体に適用される設定
2. 既存の`layoutConfigService`パターンを活用可能
3. `sdd-orchestrator.json`に他のプロジェクト設定（layout, profile）と一緒に保存するのが自然

## Implementation Plan

### 1. sdd-orchestrator.json構造の拡張
```json
{
  "version": 3,
  "profile": { ... },
  "layout": { ... },
  "commandsets": { ... },
  "settings": {
    "skipPermissions": false  // 新規追加
  }
}
```

### 2. layoutConfigService.tsの拡張
- `settings.skipPermissions`の読み書きメソッドを追加

### 3. agentStoreの修正
- `setSkipPermissions`でsdd-orchestrator.jsonへの保存を追加
- アプリ起動時（App.tsx）でsdd-orchestrator.jsonから復帰

### 4. App.tsxの修正
- プロジェクト選択時に`skipPermissions`設定を復帰

## Dependencies
- `layoutConfigService` - 拡張が必要
- `agentStore` - 永続化処理の追加
- `App.tsx` - 起動時の復帰処理

## Testing Strategy
1. `skipPermissions`を有効化
2. アプリを再起動
3. 設定が保持されていることを確認
4. 別プロジェクトに切り替え、元のプロジェクトに戻る
5. プロジェクト毎に設定が保持されていることを確認
