# Bug Fix: remove-implementation-in-progress-state

## Summary
`implementation-in-progress`ステートをシステムから削除し、document-reviewボタンの有効化条件から除外。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| `electron-sdd-manager/src/renderer/types/index.ts` | `SpecPhase`型から`implementation-in-progress`を削除 |
| `electron-sdd-manager/src/main/services/documentReviewService.ts` | canStartReview条件から`implementation-in-progress`チェックを削除 |
| `electron-sdd-manager/src/main/services/fileService.ts` | マイグレーション時に`tasks-generated`を使用、implケースをno-opに変更 |
| `electron-sdd-manager/src/renderer/stores/specStore.ts` | 自動フェーズ修正ロジックを削除 |
| `electron-sdd-manager/src/renderer/components/SpecList.tsx` | UI表示マッピング・フィルターオプションから削除 |
| `electron-sdd-manager/src/main/services/fileService.test.ts` | テストを更新 |
| `electron-sdd-manager/src/main/services/documentReviewService.test.ts` | テストを更新 |

### Code Changes

#### 1. types/index.ts - SpecPhase型
```diff
 export type SpecPhase =
   | 'initialized'
   | 'requirements-generated'
   | 'design-generated'
   | 'tasks-generated'
-  | 'implementation-in-progress'
   | 'implementation-complete';
```

#### 2. documentReviewService.ts - canStartReview条件
```diff
-      // Check if implementation has started
-      if (specJson.phase === 'implementation-in-progress' || specJson.phase === 'implementation-complete') {
-        logger.debug('[DocumentReviewService] Implementation already started');
+      // Check if implementation is complete
+      if (specJson.phase === 'implementation-complete') {
+        logger.debug('[DocumentReviewService] Implementation already complete');
         return false;
       }
```

#### 3. fileService.ts - マイグレーションロジック
```diff
     if (approvals.tasks.approved) {
-      newPhase = 'implementation-in-progress';
+      newPhase = 'tasks-generated';
     }
```

#### 4. fileService.ts - syncSpecPhase
```diff
         case 'impl':
-          // Update phase to implementation-in-progress when impl starts
-          specJson.phase = 'implementation-in-progress';
+          // impl case is no-op (implementation-in-progress state was removed)
           break;
```

#### 5. specStore.ts - 自動フェーズ修正
```diff
           if (isAllComplete && currentPhase !== 'implementation-complete') {
             ...
           }
-          // If some tasks started but phase is still tasks-generated, fix to implementation-in-progress
-          else if (hasStartedImpl && !isAllComplete && currentPhase === 'tasks-generated') {
-            console.log('[specStore] Auto-fixing phase to implementation-in-progress', { spec: spec.name, currentPhase });
-            try {
-              await window.electronAPI.syncSpecPhase(spec.path, 'impl', { skipTimestamp: true });
-              specJson.phase = 'implementation-in-progress';
-            } catch (error) {
-              console.error('[specStore] Failed to auto-fix phase:', error);
-            }
-          }
+          // Note: implementation-in-progress state was removed. Phase stays as tasks-generated during implementation.
```

#### 6. SpecList.tsx - UI表示
```diff
 const PHASE_LABELS: Record<SpecPhase, string> = {
   initialized: '初期化',
   'requirements-generated': '要件定義済',
   'design-generated': '設計済',
   'tasks-generated': 'タスク済',
-  'implementation-in-progress': '実装中',
   'implementation-complete': '実装完了',
 };
```

## Implementation Notes
- `implementation-in-progress`は無意味な中間状態だったため完全に削除
- 実装中のフェーズは`tasks-generated`のまま維持される
- 全タスク完了時のみ`implementation-complete`に遷移
- document-reviewは`tasks-generated`かつtasks承認済みの状態で有効になる

## Breaking Changes
- [x] Breaking changes (documented below)

既存のspec.jsonに`implementation-in-progress`が設定されている場合、その値は型エラーとなる可能性がある。ただし、ユーザー要求により後方互換性は考慮しない。

## Rollback Plan
1. 各ファイルの変更をgit revertで戻す
2. `implementation-in-progress`をSpecPhaseに再追加

## Related Commits
- *（コミット後に記載）*

## Test Results
修正した関連テスト（fileService.test.ts, documentReviewService.test.ts）: **60 passed**
