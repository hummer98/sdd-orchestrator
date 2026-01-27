# Bug Analysis: auto-execution-flag-cross-spec-contamination

## Summary
Spec Aで自動実行フラグ（document-review）をオフにすると、他のSpec（Spec B, C...）のUI上でもオフに見える問題。根本原因は、auto-execution-ssotリファクタリング後に残存した**不要なworkflowStoreへの同期コード**と、**UIがworkflowStoreのグローバルシングルトン状態を読み取っている**ことによるクロスSpec汚染。

## Root Cause

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts:222-245` (不要な同期コード)
  - `electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts:253-255` (UIがworkflowStoreから読み取り)
- **Component**: specDetailStore, workflowStore, useElectronWorkflowState
- **Trigger**: Spec選択時に`specDetailStore.selectSpec()`が実行され、spec.json → workflowStore への**一方向同期**が発生

### 状態汚染の流れ

```
1. User が Spec A を選択
2. specDetailStore.selectSpec(spec_a) が実行
3. [Line 222-245] spec_a.json.autoExecution.permissions → workflowStore.autoExecutionPermissions へ同期
4. workflowStore は **グローバルシングルトン** なので全Spec共通の状態を持つ
5. User が Spec A の document-review を OFF にする
6. spec_a.json.autoExecution.permissions['document-review'] = false に更新される
7. User が Spec B を選択
8. specDetailStore.selectSpec(spec_b) が実行
9. [Line 222-245] spec_b.json.autoExecution.permissions → workflowStore.autoExecutionPermissions へ同期
10. しかし、UI は [useElectronWorkflowState.ts:253-255] で **workflowStore から読み取っている**
11. 結果: Spec B の実際の spec.json 設定が正しくても、直前の Spec A の設定が workflowStore に残っている
```

### 設計上の矛盾

**auto-execution-ssot リファクタリングのゴール**:
- spec.json を自動実行設定の Single Source of Truth (SSOT) とする
- workflowStore はグローバルデフォルト設定のみを保持

**実装の問題点**:
1. **specDetailStore.selectSpec() [Line 222-245]**: spec.json → workflowStore への**不要な同期**が残存
2. **useElectronWorkflowState.ts [Line 253-255]**: UI が spec.json ではなく **workflowStore から読み取っている**
   ```typescript
   const autoExecutionPermissions = useMemo(() => {
     return specJson?.autoExecution?.permissions ?? DEFAULT_AUTO_EXECUTION_PERMISSIONS;
   }, [specJson?.autoExecution?.permissions]);
   ```
   → 正しくは spec.json から読み取るべき（上記コードは正しい）

3. **handleToggleAutoPermission [Line 257-278]**: spec.json を直接更新する（正しい実装）

→ **矛盾**: 書き込みは spec.json、読み取りは workflowStore（古い状態）

### コードレベルの証拠

**specDetailStore.ts:222-245** (不要な同期コード)
```typescript
// Bug fix: spec-json-to-workflowstore-sync-missing
// Sync autoExecution settings from spec.json to workflowStore
// This ensures UI reflects the spec-scoped settings when switching specs
if (specJson.autoExecution) {
  const t4 = performance.now();
  const { useWorkflowStore } = await import('../workflowStore');
  timings['importWorkflowStore'] = performance.now() - t4;
  const wf = useWorkflowStore.getState();
  if (specJson.autoExecution.permissions) {
    wf.setAutoExecutionPermissions(specJson.autoExecution.permissions);
  }
  // ...
}
```

**useElectronWorkflowState.ts:253-255** (正しい実装だが、上記の同期が汚染を引き起こす)
```typescript
// auto-execution-ssot: Get permissions from spec.json (Single Source of Truth)
const autoExecutionPermissions = useMemo(() => {
  return specJson?.autoExecution?.permissions ?? DEFAULT_AUTO_EXECUTION_PERMISSIONS;
}, [specJson?.autoExecution?.permissions]);
```

→ **useElectronWorkflowStateは正しく実装されている**が、`specDetailStore.selectSpec()`が**workflowStoreを汚染**するため、古いSpec切り替え時の挙動でUI側に影響が出る可能性がある。

**実際のバグ**: UIは `autoExecutionPermissions` (spec.jsonから取得) を使っているが、`handleToggleAutoPermission`が正常に動作しても、Spec切り替え時に`workflowStore`が汚染されるため、**UIの再レンダリング時に古い値が使われる可能性**がある。

## Impact Assessment
- **Severity**: **Medium** (機能不全ではないが、UX混乱とデータ汚染)
- **Scope**:
  - 複数Specを切り替えて作業するユーザー全員が影響を受ける
  - auto-execution設定を持つ全てのSpec（requirements, design, tasks, document-review, impl, inspection, deploy）
- **Risk**:
  - ユーザーが意図しない自動実行設定で作業を進める可能性
  - UI表示とspec.json実態の不整合によるデバッグ困難

## Related Code

**specDetailStore.ts:222-245** (削除対象)
```typescript
// Bug fix: spec-json-to-workflowstore-sync-missing
// Sync autoExecution settings from spec.json to workflowStore
// This ensures UI reflects the spec-scoped settings when switching specs
if (specJson.autoExecution) {
  const t4 = performance.now();
  const { useWorkflowStore } = await import('../workflowStore');
  timings['importWorkflowStore'] = performance.now() - t4;
  const wf = useWorkflowStore.getState();
  if (specJson.autoExecution.permissions) {
    wf.setAutoExecutionPermissions(specJson.autoExecution.permissions);
  }
  // document-review-phase Task 7.1: documentReviewFlag removed - use permissions['document-review'] instead
  // Migration: if old documentReviewFlag exists, convert to permissions['document-review']
  const oldDocReviewFlag = (specJson.autoExecution as any).documentReviewFlag;
  if (oldDocReviewFlag && !specJson.autoExecution.permissions?.['document-review']) {
    // Old format: 'run' -> true, 'pause' -> false
    const docReviewPermission = oldDocReviewFlag === 'run';
    wf.setAutoExecutionPermissions({
      ...wf.autoExecutionPermissions,
      'document-review': docReviewPermission,
    });
  }
  console.log('[specDetailStore] Synced autoExecution settings to workflowStore:', {
    spec: spec.name,
    permissions: specJson.autoExecution.permissions,
  });
}
```

**workflowStore.ts:35-68** (`persistSettingsToSpec`も削除対象)
```typescript
async function persistSettingsToSpec(): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { useSpecStore } = await import('./specStore');
  const specStore = useSpecStore.getState();
  const specDetail = specStore.specDetail;

  if (!specDetail) {
    // No spec selected, skip persistence
    return;
  }

  // Get current state from workflowStore
  const workflowState = useWorkflowStore.getState();

  // Build the autoExecution state object
  const autoExecutionState: SpecAutoExecutionState = {
    enabled: true,
    permissions: { ...workflowState.autoExecutionPermissions },
  };

  try {
    await window.electronAPI.updateSpecJson(specDetail.metadata.name, {
      autoExecution: autoExecutionState,
    });
    console.log('[workflowStore] Settings persisted to spec.json');
  } catch (error) {
    console.error('[workflowStore] Failed to persist settings to spec.json:', error);
  }
}
```

**workflowStore.ts:335-344** (`toggleAutoPermission`内の`persistSettingsToSpec`呼び出しも削除)
```typescript
toggleAutoPermission: (phase: WorkflowPhase) => {
  set((state) => ({
    autoExecutionPermissions: {
      ...state.autoExecutionPermissions,
      [phase]: !state.autoExecutionPermissions[phase],
    },
  }));
  // Persist to spec.json after state update
  persistSettingsToSpec();  // ← 削除対象
},
```

## Proposed Solution

### Option 1: 不要な同期コードを完全削除（推奨）

**理由**: auto-execution-ssot の設計意図に完全に従う

**修正内容**:
1. **specDetailStore.ts:222-245** の workflowStore 同期コードを削除
2. **workflowStore.ts:35-68** の `persistSettingsToSpec()` 関数を削除
3. **workflowStore.ts:335-344** の `toggleAutoPermission` から `persistSettingsToSpec()` 呼び出しを削除
4. **useElectronWorkflowState.ts** は既に正しく実装されているため変更不要

**Pros**:
- SSO自動実行設定の完全実現（spec.jsonがSSOT）
- workflowStoreの本来の役割（グローバルデフォルト）への回帰
- クロスSpec汚染の完全排除
- コードの複雑度削減

**Cons**:
- なし（既存の正しい実装を維持するだけ）

### Recommended Approach

**Option 1** を採用。以下の手順で実装：

1. specDetailStore.selectSpec() から workflowStore 同期コードを削除
2. workflowStore の persistSettingsToSpec() 関数を削除
3. workflowStore.toggleAutoPermission から persistSettingsToSpec() 呼び出しを削除
4. 既存のE2Eテスト（auto-execution系）で動作確認

**設計原則の遵守**:
- **SSOT**: spec.json が自動実行設定の唯一の情報源
- **関心の分離**: workflowStore はグローバルデフォルトのみ、specDetailStore/spec.json は Spec個別設定
- **DRY**: 状態の二重管理を排除

## Dependencies
- `electron-sdd-manager/src/renderer/stores/spec/specDetailStore.ts`
- `electron-sdd-manager/src/renderer/stores/workflowStore.ts`
- `electron-sdd-manager/src/renderer/hooks/useElectronWorkflowState.ts` (変更不要)

## Testing Strategy
1. **E2Eテスト**:
   - Spec A で document-review を OFF → Spec B に切り替え → Spec B の UI が ON のまま（spec.json 通り）
   - Spec A で requirements を OFF → Spec A で requirements を実行 → 実行されない
   - Spec切り替え後にSpec A に戻る → 設定が保持されている
2. **ユニットテスト**:
   - specDetailStore.selectSpec() で workflowStore が変更されないことを確認
   - workflowStore.toggleAutoPermission() がローカルストレージのみに影響することを確認
3. **手動テスト**:
   - 複数Specを連続切り替え → 各Specの設定が独立していることを確認
