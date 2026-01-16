# Bug Analysis: remove-auto-skip-settings

## Summary

document-reviewとinspectionの自動実行において「skip」オプションを削除し、これらのフローを必須化する。現在、両機能には`run | pause | skip`の3値フラグがあるが、`skip`を削除して`run | pause`の2値にする必要がある。

## Root Cause

**これはバグではなく、設計変更の要求**

現在の設計では、document-reviewとinspectionの自動実行に対して「skip」オプションが存在する。これにより、ユーザーがこれらの重要なワークフローをスキップできてしまう。要件として、これらのフローを必須とするため、skip機能を削除する必要がある。

### Technical Details

- **Location**: 複数ファイルに分散（型定義、UIコンポーネント、ビジネスロジック）
- **Component**: DocumentReview/Inspection自動実行フラグ関連
- **Trigger**: skip設定の存在自体が問題

## Impact Assessment

- **Severity**: Medium - 機能削除であり、既存動作に影響
- **Scope**: 自動実行ワークフローを使用するユーザー
- **Risk**: 既存のspec.jsonに`skip`値が保存されている場合のマイグレーション対応が必要

## Related Code

### 1. 型定義

**`src/shared/types/review.ts:78`**
```typescript
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause' | 'skip';
```

**`src/shared/types/review.ts:87-91`**
```typescript
export const INSPECTION_AUTO_EXECUTION_FLAG = {
  RUN: 'run',
  PAUSE: 'pause',
  SKIP: 'skip',  // 削除対象
} as const;
```

**`src/renderer/types/index.ts:232`**
```typescript
export type DocumentReviewFlag = 'skip' | 'run' | 'pause';
```

**`src/renderer/types/index.ts:235`**
```typescript
export type InspectionAutoExecutionFlag = 'run' | 'pause' | 'skip';
```

**`src/renderer/types/inspection.ts:15-19`**
```typescript
export const INSPECTION_AUTO_EXECUTION_FLAG = {
  RUN: 'run',
  PAUSE: 'pause',
  SKIP: 'skip',  // 削除対象
} as const;
```

### 2. UIコンポーネント

**`src/renderer/components/DocumentReviewPanel.tsx:17`**
```typescript
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause' | 'skip';
```

**`src/renderer/components/DocumentReviewPanel.tsx:114-123`** - getNextAutoExecutionFlag
```typescript
function getNextAutoExecutionFlag(current: DocumentReviewAutoExecutionFlag): DocumentReviewAutoExecutionFlag {
  switch (current) {
    case 'run':
      return 'pause';
    case 'pause':
      return 'skip';  // 変更: → 'run' に戻す
    case 'skip':
      return 'run';   // 削除
  }
}
```

**`src/renderer/components/DocumentReviewPanel.tsx:125-149`** - renderAutoExecutionFlagIcon
- `skip`のcaseを削除

**`src/renderer/components/DocumentReviewPanel.tsx:151-160`** - getAutoExecutionFlagTooltip
- `skip`のcaseを削除

**`src/renderer/components/InspectionPanel.tsx:101-112`** - getNextAutoExecutionFlag
- 同様に変更

**`src/renderer/components/InspectionPanel.tsx:114-138`** - renderAutoExecutionFlagIcon
- `skip`のcaseを削除

**`src/renderer/components/InspectionPanel.tsx:140-149`** - getAutoExecutionFlagTooltip
- `skip`のcaseを削除

### 3. ビジネスロジック

**`src/main/services/autoExecutionCoordinator.ts:92`**
```typescript
export type DocumentReviewFlag = 'run' | 'pause' | 'skip';
```
→ `'skip'`を削除

**`src/main/services/autoExecutionCoordinator.ts:660`**
```typescript
if (currentPhase === 'tasks' && options.documentReviewFlag !== 'skip') {
```
→ この条件分岐は常にtrueになるため、条件自体を削除可能

### 4. Storeロジック

**`src/renderer/stores/workflowStore.ts:114`**
```typescript
export type DocumentReviewAutoExecutionFlag = 'run' | 'pause' | 'skip';
```
→ `'skip'`を削除

### 5. Progress Indicator Logic

**`src/shared/types/review.ts:183-186`**
```typescript
if (autoExecutionFlag === 'skip') {
  return 'skip-scheduled';
}
```
→ この分岐を削除

**`src/renderer/types/inspection.ts:371-373`**
```typescript
if (autoExecutionFlag === 'skip') {
  return 'skip-scheduled';
}
```
→ この分岐を削除

**`src/shared/types/review.ts:102-107`** - INSPECTION_PROGRESS_INDICATOR_STATE
```typescript
SKIP_SCHEDULED: 'skip-scheduled',  // 削除対象
```

**`src/renderer/types/inspection.ts:30-36`**
```typescript
SKIP_SCHEDULED: 'skip-scheduled',  // 削除対象
```

## Proposed Solution

### Option 1（推奨）: 完全削除アプローチ

`skip`値を完全に削除し、型定義を2値に変更する。

**変更内容**:
1. 型定義から`'skip'`を削除
2. 定数オブジェクトから`SKIP`を削除
3. UIコンポーネントの`skip`分岐を削除
4. Progress Indicator から`skip-scheduled`状態を削除
5. ビジネスロジックのskip関連条件を削除
6. テストファイルの更新

**Pros**:
- クリーンな実装
- 不要なコードパスが消える
- 将来の混乱を防ぐ

**Cons**:
- 既存spec.jsonに`skip`値が保存されている場合の対応が必要

### Option 2: 値の変換アプローチ

`skip`値を読み込み時に`pause`に変換する。

**Pros**:
- 既存データとの互換性を維持

**Cons**:
- 変換ロジックが残る
- 将来的に削除が必要

### Recommended Approach

**Option 1（完全削除アプローチ）を推奨**

理由:
1. skip機能は今後使用しない方針
2. 変換ロジックを残すと技術的負債になる
3. 既存spec.jsonの`skip`値は読み込み時に`pause`にフォールバックすれば十分

**マイグレーション戦略**:
- 型定義で`skip`を削除
- 実際の読み込み時に、値が`skip`の場合は`pause`として扱う（デフォルト値のフォールバック）
- これにより型は2値だが、古いデータも安全に処理可能

## Dependencies

- `src/shared/types/review.ts` - 型定義
- `src/renderer/types/index.ts` - 型定義
- `src/renderer/types/inspection.ts` - 型定義・ヘルパー関数
- `src/renderer/components/DocumentReviewPanel.tsx` - UIコンポーネント
- `src/renderer/components/InspectionPanel.tsx` - UIコンポーネント
- `src/shared/components/review/DocumentReviewPanel.tsx` - 共有UIコンポーネント
- `src/shared/components/review/InspectionPanel.tsx` - 共有UIコンポーネント
- `src/renderer/stores/workflowStore.ts` - 状態管理
- `src/main/services/autoExecutionCoordinator.ts` - ビジネスロジック
- `src/main/ipc/handlers.ts` - IPCハンドラ（skipDocumentReview関連）
- `src/preload/index.ts` - skipDocumentReview API
- テストファイル各種

## Testing Strategy

1. **型チェック**: `npm run typecheck`で型エラーがないことを確認
2. **単体テスト**: 既存のworkflowStore.test.ts、inspection.test.ts等を更新・実行
3. **E2Eテスト**: auto-execution-document-review.e2e.spec.tsの更新・実行
4. **手動テスト**:
   - 自動実行フラグの切り替えが`run`⇔`pause`の2値になっていること
   - 既存の`skip`値を持つspec.jsonを読み込んでも正常動作すること

## Files to Modify

| ファイル | 変更内容 |
|---------|---------|
| `src/shared/types/review.ts` | 型定義から`skip`削除、定数削除 |
| `src/renderer/types/index.ts` | 型定義から`skip`削除 |
| `src/renderer/types/inspection.ts` | 型定義・定数・ヘルパー関数更新 |
| `src/renderer/components/DocumentReviewPanel.tsx` | skip関連ロジック削除 |
| `src/renderer/components/InspectionPanel.tsx` | skip関連ロジック削除 |
| `src/shared/components/review/DocumentReviewPanel.tsx` | skip関連ロジック削除 |
| `src/shared/components/review/InspectionPanel.tsx` | skip関連ロジック削除 |
| `src/renderer/stores/workflowStore.ts` | 型定義更新 |
| `src/main/services/autoExecutionCoordinator.ts` | DocumentReviewFlag型更新、条件削除 |
| `src/main/ipc/handlers.ts` | skipDocumentReview IPC削除 |
| `src/preload/index.ts` | skipDocumentReview API削除 |
| `src/renderer/types/electron.d.ts` | skipDocumentReview型削除 |
| テストファイル | skip関連テストケース削除・更新 |
