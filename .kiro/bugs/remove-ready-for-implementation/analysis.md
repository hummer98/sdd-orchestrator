# Bug Analysis: remove-ready-for-implementation

## Summary
`ready_for_implementation` フィールドはspec.jsonに存在するが、ソースコード内では一切使用されていない未使用フィールド。後方互換性を考慮せず完全削除する。

## Root Cause
過去のワークフロー設計で導入されたが、現在の `getPhaseStatus()` ロジックでは `impl_completed` フラグを使用しており、`ready_for_implementation` は参照されていない。

### Technical Details
- **Location**:
  - テンプレート: `.kiro/settings/templates/specs/init.json:21`
  - テンプレート: `electron-sdd-manager/resources/templates/settings/templates/specs/init.json:21`
- **Component**: Spec JSON Schema / Workflow Types
- **Trigger**: 未使用フィールドの残存

## Impact Assessment
- **Severity**: Low
- **Scope**: 既存のspec.jsonファイル（27ファイル）とテンプレート（2ファイル）
- **Risk**: なし（フィールドは使用されていないため削除しても機能に影響なし）

## Related Code
```typescript
// electron-sdd-manager/src/renderer/types/workflow.ts:132-137
// 実装フェーズ - ready_for_implementation は使用されていない
if (phase === 'impl') {
  if (specJson.impl_completed) {
    return 'approved';
  }
  return 'pending';
}
```

## Proposed Solution
### Option 1: 完全削除（推奨）
- Description: すべてのファイルから `ready_for_implementation` を削除
- Pros: コードベースがクリーンになる、混乱を防げる
- Cons: なし（マイグレーション不要）

### Recommended Approach
完全削除。マイグレーションは不要（未使用フィールドのため）。

## Dependencies
- テンプレートファイル（2箇所）
- 既存spec.jsonファイル（27箇所）
- テストファイルのコメント（1箇所）

## Affected Files
### テンプレート（削除必須）
1. `.kiro/settings/templates/specs/init.json`
2. `electron-sdd-manager/resources/templates/settings/templates/specs/init.json`

### 既存spec.json（削除対象）
- `.kiro/specs/*/spec.json` - 27ファイル
- `electron-sdd-manager/e2e-wdio/fixtures/bugs-pane-test/.kiro/specs/test-feature/spec.json`

### テストファイル（コメント修正）
- `electron-sdd-manager/src/renderer/types/workflow.test.ts:146` - テスト名のコメントを修正

## Testing Strategy
1. テンプレートから削除後、新規spec作成で `ready_for_implementation` が含まれないことを確認
2. 既存のテストが通ることを確認（`npm test`）
3. アプリケーションが正常に動作することを確認
