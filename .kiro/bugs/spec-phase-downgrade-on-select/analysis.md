# Bug Analysis: spec-phase-downgrade-on-select

## Summary
SpecListItemクリック時の自動修正ロジックが、フェーズ階層を考慮せずに条件判定しているため、`inspection-complete`や`deploy-complete`のspecが`implementation-complete`にダウングレードされる。

## Root Cause
**条件式の論理エラー**: `currentPhase !== 'implementation-complete'` は「より高度なフェーズ」でも true を返す。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts:94`
- **Component**: specDetailStore.selectSpec()
- **Trigger**: タスク100%完了のspecを選択した際、自動修正ロジックが実行される

### フェーズ階層（低 → 高）
```
initialized
  ↓
requirements-generated
  ↓
design-generated
  ↓
tasks-generated
  ↓
implementation-complete  ← 自動修正の目標
  ↓
inspection-complete      ← これもダウングレードされる（バグ）
  ↓
deploy-complete          ← これもダウングレードされる（バグ）
```

### 問題のコード
```typescript
// specDetailStore.ts:89-102
if (isAllComplete && currentPhase !== 'implementation-complete') {
  // この条件は deploy-complete, inspection-complete でも true
  await window.electronAPI.syncSpecPhase(spec.path, 'impl-complete', { skipTimestamp: true });
  specJson.phase = 'implementation-complete';
}
```

**なぜ問題か:**
| currentPhase | `!== 'implementation-complete'` | 結果 |
|--------------|--------------------------------|------|
| `tasks-generated` | true | ✓ 正しく昇格 |
| `implementation-complete` | false | ✓ スキップ |
| `inspection-complete` | true | ✗ ダウングレード |
| `deploy-complete` | true | ✗ ダウングレード |

## Impact Assessment
- **Severity**: High
- **Scope**: `inspection-complete`または`deploy-complete`フェーズの全てのspec
- **Risk**: spec.jsonファイルが意図せず書き換わり、ワークフロー状態が失われる

## Proposed Solution

### Option 1: 後方フェーズのリストで除外
```typescript
const advancedPhases = ['implementation-complete', 'inspection-complete', 'deploy-complete'];
if (isAllComplete && !advancedPhases.includes(currentPhase)) {
  // implementation-complete未満のフェーズのみ自動修正
}
```
- Pros: シンプル、読みやすい
- Cons: フェーズ追加時にリスト更新が必要

### Option 2: インデックス比較で順序を考慮
```typescript
const phaseOrder: SpecPhase[] = [
  'initialized', 'requirements-generated', 'design-generated',
  'tasks-generated', 'implementation-complete', 'inspection-complete', 'deploy-complete'
];
const currentIndex = phaseOrder.indexOf(currentPhase);
const targetIndex = phaseOrder.indexOf('implementation-complete');
if (isAllComplete && currentIndex < targetIndex) {
  // より低いフェーズからのみ昇格を許可
}
```
- Pros: フェーズ追加に強い、順序が明示的
- Cons: やや冗長

### Recommended Approach
**Option 1** を推奨。理由：
- 変更が最小限（1行の条件修正）
- 意図が明確に読み取れる
- 既存のフェーズ階層は安定しており、頻繁な追加は予想されない

## Dependencies
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts`
- `SpecPhase` 型定義（変更不要）

## Testing Strategy
1. **Unit Test**: specDetailStore.test.ts に以下を追加
   - `deploy-complete`フェーズのspecを選択後、phaseが変更されないこと
   - `inspection-complete`フェーズのspecを選択後、phaseが変更されないこと
   - `tasks-generated`フェーズ（タスク100%完了）を選択後、`implementation-complete`に遷移すること

2. **Manual Test**: Electronアプリで実際に確認
   - deploy-completeのspecをクリック → phaseが維持されることを確認
