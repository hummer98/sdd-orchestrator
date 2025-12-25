# Bug Analysis: remove-implementation-in-progress-state

## Summary
`implementation-in-progress`ステートは実質的に無意味であり、document-reviewボタンの有効化条件から除外すべき。

## Root Cause
`implementation-in-progress`ステートは「実装が開始されたが完了していない中間状態」として設計されたが、現在のワークフローでは以下の理由で無意味：
1. 実装完了判定は`TaskProgress`で十分に管理されている
2. ステートが条件分岐を複雑化させているだけ
3. `tasks-generated` → `implementation-complete`への直接遷移で問題ない

### Technical Details
- **Location**:
  - [types/index.ts:8](electron-sdd-manager/src/renderer/types/index.ts#L8) - `SpecPhase`型定義
  - [documentReviewService.ts:76](electron-sdd-manager/src/main/services/documentReviewService.ts#L76) - canStartReview条件
  - [fileService.ts:234](electron-sdd-manager/src/main/services/fileService.ts#L234) - マイグレーション時の設定
  - [fileService.ts:524-526](electron-sdd-manager/src/main/services/fileService.ts#L524-L526) - syncSpecPhase時の設定
  - [specStore.ts:265-274](electron-sdd-manager/src/renderer/stores/specStore.ts#L265-L274) - 自動フェーズ修正
  - [SpecList.tsx:20,29,70](electron-sdd-manager/src/renderer/components/SpecList.tsx#L20) - UI表示・フィルター
- **Component**: SpecPhase状態管理、DocumentReviewService
- **Trigger**: tasksが承認され、implが開始されると`implementation-in-progress`に遷移

## Impact Assessment
- **Severity**: Low
- **Scope**: Spec状態管理全般
- **Risk**:
  - 後方互換性への考慮は不要（ユーザー要求）
  - 既存の`implementation-in-progress`状態のspecは`tasks-generated`として扱う

## Related Code

### 1. SpecPhase型定義 (削除対象)
```typescript
// electron-sdd-manager/src/renderer/types/index.ts:3-9
export type SpecPhase =
  | 'initialized'
  | 'requirements-generated'
  | 'design-generated'
  | 'tasks-generated'
  | 'implementation-in-progress'  // ← 削除
  | 'implementation-complete';
```

### 2. canStartReview条件 (修正対象)
```typescript
// electron-sdd-manager/src/main/services/documentReviewService.ts:75-79
// Check if implementation has started
if (specJson.phase === 'implementation-in-progress' || specJson.phase === 'implementation-complete') {
  logger.debug('[DocumentReviewService] Implementation already started');
  return false;
}
// ↓ 修正後
if (specJson.phase === 'implementation-complete') {
  logger.debug('[DocumentReviewService] Implementation already complete');
  return false;
}
```

### 3. fileService.ts マイグレーション・syncSpecPhase
```typescript
// Line 234: マイグレーション時は tasks-generated を使用
// Line 524-526: 'impl'ケースは削除

## Proposed Solution

### Option 1: 完全削除（推奨）
- **Description**: `implementation-in-progress`をシステムから完全に削除
- **Pros**: コードベースがシンプルになる、後方互換性不要なので問題なし
- **Cons**: なし

### Recommended Approach
Option 1を採用。以下のファイルを修正：

1. **types/index.ts**: `SpecPhase`から`implementation-in-progress`を削除
2. **documentReviewService.ts**: canStartReview条件を修正（`implementation-in-progress`チェックを削除）
3. **fileService.ts**:
   - マイグレーション時は`tasks-generated`を使用
   - syncSpecPhaseの'impl'ケースは削除
4. **specStore.ts**: 自動フェーズ修正ロジックを削除
5. **SpecList.tsx**: UI表示マッピング・フィルターオプションから削除
6. **テストファイル**: 関連テストを更新

## Dependencies
- fileService.ts, fileService.test.ts
- documentReviewService.ts, documentReviewService.test.ts
- specStore.ts, specStore.test.ts
- SpecList.tsx
- types/index.ts, workflow.test.ts

## Testing Strategy
1. 各ユニットテストを更新し、`implementation-in-progress`への参照を削除
2. document-reviewボタンがtasks-generated状態で有効になることを確認
3. impl開始後も`tasks-generated`のまま維持されることを確認
4. 全タスク完了時に`implementation-complete`へ正しく遷移することを確認
