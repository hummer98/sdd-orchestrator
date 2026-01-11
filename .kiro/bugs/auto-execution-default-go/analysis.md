# Bug Analysis: auto-execution-default-go

## Summary
自動実行の許可設定（permissions）のデフォルト値が全て `false`（NOGO）になっており、ユーザーが手動で全て GO に変更する必要がある。

## Root Cause
`DEFAULT_SPEC_AUTO_EXECUTION_STATE` 定数において、`permissions` の全フィールドが `false` で初期化されている。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/types/index.ts:241-257`
- **Component**: `SpecAutoExecutionState` 型とそのデフォルト値
- **Trigger**: 新しい Spec が作成された際、または `autoExecution` フィールドが存在しない既存 Spec が読み込まれた際に、このデフォルト値が適用される

## Impact Assessment
- **Severity**: Low（機能は動作するが、UX が悪い）
- **Scope**: 全ての自動実行ワークフロー
- **Risk**: 変更による既存動作への影響は軽微

## Related Code
```typescript
// electron-sdd-manager/src/renderer/types/index.ts:241-257
export const DEFAULT_SPEC_AUTO_EXECUTION_STATE: SpecAutoExecutionState = {
  enabled: false,
  permissions: {
    requirements: false,  // ← これを true に変更
    design: false,        // ← これを true に変更
    tasks: false,         // ← これを true に変更
    impl: false,          // ← これを true に変更
    inspection: false,    // ← これを true に変更
    deploy: false,        // ← これを true に変更
  },
  documentReviewFlag: 'pause',
  validationOptions: {
    gap: false,
    design: false,
    impl: false,
  },
};
```

## Proposed Solution

### Option 1: デフォルト値を全て GO に変更（推奨）
- Description: `DEFAULT_SPEC_AUTO_EXECUTION_STATE` の `permissions` を全て `true` に変更
- Pros:
  - シンプルな変更（1ファイル、数行の修正）
  - ユーザーの期待通りの動作になる
  - 後方互換性あり（既存の spec.json に保存された設定は影響なし）
- Cons:
  - 関連テストの更新が必要（`workflow.test.ts`）

### Recommended Approach
**Option 1** を採用。変更対象は以下の2ファイル：

1. `electron-sdd-manager/src/renderer/types/index.ts` - デフォルト値の変更
2. `electron-sdd-manager/src/renderer/types/workflow.test.ts` - テストの期待値を更新

## Dependencies
- 他のコンポーネントは `DEFAULT_SPEC_AUTO_EXECUTION_STATE` を参照しているが、参照方法の変更は不要
- `createSpecAutoExecutionState()` ファクトリー関数も自動的に新しいデフォルト値を使用する

## Testing Strategy
1. 単体テスト: `workflow.test.ts` の期待値を `true` に更新
2. 手動テスト: Electron アプリで新規 Spec 作成時にデフォルト設定が GO になっていることを確認
3. E2E テスト: 既存の自動実行テストが引き続きパスすることを確認

## Files to Modify
| File | Change |
|------|--------|
| `electron-sdd-manager/src/renderer/types/index.ts` | L244-249: `false` → `true` |
| `electron-sdd-manager/src/renderer/types/workflow.test.ts` | L266-272, L280-282: 期待値を `true` に更新 |
