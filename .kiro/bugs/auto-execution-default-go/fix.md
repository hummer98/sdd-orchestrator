# Bug Fix: auto-execution-default-go

## Summary
自動実行の許可設定（permissions）のデフォルト値を全て `true`（GO）に変更し、ユーザーが手動で設定を変更する必要がないようにした。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/types/index.ts` | `DEFAULT_SPEC_AUTO_EXECUTION_STATE.permissions` の全フィールドを `true` に変更 |
| `electron-sdd-manager/src/renderer/types/workflow.test.ts` | テストの期待値を `true` に更新（3箇所） |

### Code Changes

**index.ts (L243-250)**
```diff
  permissions: {
-   requirements: false,
-   design: false,
-   tasks: false,
-   impl: false,
-   inspection: false,
-   deploy: false,
+   requirements: true,
+   design: true,
+   tasks: true,
+   impl: true,
+   inspection: true,
+   deploy: true,
  },
```

**workflow.test.ts (L264-272)**
```diff
- it('should have all permissions set to false by default', () => {
+ it('should have all permissions set to true by default', () => {
    const { permissions } = DEFAULT_SPEC_AUTO_EXECUTION_STATE;
-   expect(permissions.requirements).toBe(false);
-   expect(permissions.design).toBe(false);
-   expect(permissions.tasks).toBe(false);
-   expect(permissions.impl).toBe(false);
-   expect(permissions.inspection).toBe(false);
-   expect(permissions.deploy).toBe(false);
+   expect(permissions.requirements).toBe(true);
+   expect(permissions.design).toBe(true);
+   expect(permissions.tasks).toBe(true);
+   expect(permissions.impl).toBe(true);
+   expect(permissions.inspection).toBe(true);
+   expect(permissions.deploy).toBe(true);
  });
```

**workflow.test.ts (L303-304)**
```diff
- expect(state.permissions.tasks).toBe(false);
- expect(state.permissions.impl).toBe(false);
+ expect(state.permissions.tasks).toBe(true);
+ expect(state.permissions.impl).toBe(true);
```

## Implementation Notes
- `enabled` は `false` のままとし、ユーザーが明示的に自動実行を有効化する必要がある設計を維持
- `validationOptions` のデフォルトも `false` のままとし、バリデーション実行は任意とした
- 既存の `spec.json` に保存された設定は影響を受けない（後方互換性あり）

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
`index.ts` の `permissions` 内の全フィールドを `false` に戻す。

## Related Commits
- *To be added after commit*
