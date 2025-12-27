# Bug Fix: inspection-completed-field-mismatch

## Summary
`getPhaseStatus` 関数が `inspection.passed` を参照するように修正し、`ExtendedSpecJson` 型から不要な `inspection_completed` フィールドを削除。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| [workflow.ts](electron-sdd-manager/src/renderer/types/workflow.ts) | `getPhaseStatus` 関数で `inspection.passed` を参照するよう変更 |
| [workflow.ts](electron-sdd-manager/src/renderer/types/workflow.ts) | `ExtendedSpecJson` 型から `inspection_completed` を削除 |
| [workflow.test.ts](electron-sdd-manager/src/renderer/types/workflow.test.ts) | テストケースを `inspection.passed` ベースに更新 |

### Code Changes

**workflow.ts:121-124** - getPhaseStatus関数の修正
```diff
  // 検査フェーズ
  if (phase === 'inspection') {
-   return specJson.inspection_completed ? 'approved' : 'pending';
+   return specJson.inspection?.passed ? 'approved' : 'pending';
  }
```

**workflow.ts:96-102** - ExtendedSpecJson型の修正
```diff
 export interface ExtendedSpecJson extends SpecJson {
   /** 実装完了フラグ（オプショナル、デフォルト: false） */
   impl_completed?: boolean;
-  /** 検査完了フラグ（オプショナル、デフォルト: false） */
-  inspection_completed?: boolean;
   /** デプロイ完了フラグ（オプショナル、デフォルト: false） */
   deploy_completed?: boolean;
 }
```

**workflow.test.ts:160-187** - テストケースの更新
```diff
 describe('inspection phase', () => {
-  it('should return pending when inspection_completed is undefined', () => {
+  it('should return pending when inspection is undefined', () => {
     const specJson = createMockSpecJson();
     expect(getPhaseStatus('inspection', specJson)).toBe('pending');
   });

-  it('should return approved when inspection_completed is true', () => {
+  it('should return pending when inspection.passed is false', () => {
+    const specJson = createMockSpecJson({
+      inspection: {
+        passed: false,
+        inspected_at: '2024-01-01T00:00:00Z',
+        report_file: 'inspection-1.md',
+      },
+    });
+    expect(getPhaseStatus('inspection', specJson)).toBe('pending');
+  });
+
+  it('should return approved when inspection.passed is true', () => {
     const specJson = createMockSpecJson({
-      inspection_completed: true,
+      inspection: {
+        passed: true,
+        inspected_at: '2024-01-01T00:00:00Z',
+        report_file: 'inspection-1.md',
+      },
     });
     expect(getPhaseStatus('inspection', specJson)).toBe('approved');
   });
 });
```

## Implementation Notes
- SSOT原則に従い、`inspection.passed` を唯一の真実とした
- `InspectionState` 型は既に正しく定義されていたため、型定義の変更は不要
- NOGOケース（`passed: false`）のテストを追加し、カバレッジを向上

## Breaking Changes
- [x] No breaking changes

`inspection_completed` フィールドはspec-inspection-agentによって設定されることがなかったため、削除しても既存の動作に影響なし。

## Rollback Plan
1. `workflow.ts` で `inspection.passed` を `inspection_completed` に戻す
2. `ExtendedSpecJson` に `inspection_completed?: boolean` を追加
3. テストを元に戻す

## Test Results
```
 ✓ src/renderer/types/workflow.test.ts (29 tests) 5ms

 Test Files  1 passed (1)
      Tests  29 passed (29)
```

## Related Commits
- *（未コミット - 検証後にコミット予定）*
