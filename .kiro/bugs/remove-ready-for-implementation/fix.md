# Bug Fix: remove-ready-for-implementation

## Summary
未使用の `ready_for_implementation` フィールドを全ファイルから完全削除

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `.kiro/settings/templates/specs/init.json` | `ready_for_implementation` 行を削除 |
| `electron-sdd-manager/resources/templates/settings/templates/specs/init.json` | `ready_for_implementation` 行を削除 |
| `electron-sdd-manager/src/renderer/types/workflow.test.ts` | テスト名を修正（コメント更新） |
| `.kiro/specs/*/spec.json` (27ファイル) | `ready_for_implementation` 行を削除 |

### Code Changes

**テンプレートファイル**
```diff
     }
   },
-  "ready_for_implementation": false
+  }
 }
```

**テストファイル**
```diff
-      it('should return pending when ready_for_implementation is true', () => {
+      it('should return pending when impl_completed is not set', () => {
```

## Implementation Notes
- `ready_for_implementation` はソースコード内で一切使用されていなかった
- 現在の `getPhaseStatus()` は `impl_completed` フラグのみを使用
- マイグレーション不要（未使用フィールドのため）
- ログファイル内の参照は履歴として残存（問題なし）

## Breaking Changes
- [x] No breaking changes

## Rollback Plan
1. `git revert` で変更を元に戻す
2. または各ファイルに `"ready_for_implementation": false` を手動追加

## Related Commits
- *このfixをコミット後に追記*

## Test Results
- `workflow.test.ts`: 28テスト全てパス
- 変更した箇所に関連するテストは全て成功
