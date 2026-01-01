# Bug Analysis: requirement-file-update-not-reflected

## Summary
Agent完了後にファイル更新がUIに反映されない問題、およびAgent実行中にファイル編集が妨害される問題。根本原因は「refreshSpecs/selectSpecの雑な呼び出し」によるUI更新アプローチ。本来はファイル監視の仕組みでspec.jsonとUI間の同期を行うべき。

## Root Cause

### 設計上の問題: refreshSpecs/selectSpecによる雑なUI更新

現在の実装では、UI更新が必要な場面で`refreshSpecs()`や`selectSpec()`を無差別に呼び出している。これらは**全ファイルを再読み込み**するため、以下の問題が発生：

1. **過剰なファイル読み込み**: 1ファイルの変更で全artifact（requirements.md, design.md, tasks.md等）を再読み込み
2. **状態の強制上書き**: ユーザーが編集中の内容も含めて、ファイルシステムの内容で上書き
3. **不要な再レンダリング**: 変更のないコンポーネントも含めて全体が再レンダリング

### 問題1: 過剰なrefreshSpecs呼び出し箇所

| 場所 | トリガー | 問題点 |
|------|---------|--------|
| [specStore.ts:381-394](electron-sdd-manager/src/renderer/stores/specStore.ts#L381-L394) | ファイル変更検知 | 全Spec再読み込み |
| [WorkflowView.tsx:434-455](electron-sdd-manager/src/renderer/components/WorkflowView.tsx#L434-L455) | Agent完了検知 | 500ms後に再読み込み |
| [AutoExecutionService.ts:203](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L203) | autoExecution状態更新 | selectSpec直接呼び出し |
| [AutoExecutionService.ts:1072-1074](electron-sdd-manager/src/renderer/services/AutoExecutionService.ts#L1072-L1074) | autoApprove完了 | selectSpec直接呼び出し |

### 問題2: ファイル監視イベントがUIに適切に伝播しない

現在のフロー:
```
specsWatcherService.ts (Main)
  ↓ chokidar: 個別ファイル変更検知
  ↓ IPC: SPECS_CHANGED (specId, path情報付き)
specStore.ts (Renderer)
  ↓ onSpecsChanged callback
  ↓ refreshSpecs() ← ここで粒度が失われる
  ↓ selectSpec() → 全artifact再読み込み
UI更新
```

問題点:
- Main Processは「どのファイルが変更されたか」を正確に検知している
- しかしRenderer側で`refreshSpecs()`を呼ぶことで、その粒度が失われる
- 結果として全ファイルを再読み込みする非効率な処理になっている

## Impact Assessment
- **Severity**: High
- **Scope**:
  - requirements.md, design.md, tasks.md等のSpec関連ファイルを編集するすべてのユーザー
  - Agent実行中に手動編集を行うワークフローが完全に妨害される
- **Risk**:
  - ユーザーの編集作業が繰り返しキャンセルされるUX問題
  - 過剰なファイル読み込みによるパフォーマンス低下

## Proposed Solution

### 推奨: ファイル監視ベースの粒度細かいUI同期

**設計方針**:
- `refreshSpecs()`/`selectSpec()`の雑な呼び出しを廃止
- ファイル監視イベントに基づいて、変更されたファイル/フィールドのみを更新
- spec.jsonの変更はspec.jsonのみ、requirements.mdの変更はrequirements.mdのみ更新

**実装アプローチ**:

#### Phase 1: specStoreに粒度細かい更新メソッド追加

```typescript
// specStore.ts に追加
interface SpecActions {
  // 既存
  selectSpec: (spec: SpecMetadata) => Promise<void>;
  refreshSpecs: () => Promise<void>;

  // 新規追加: 粒度細かい更新
  updateSpecJson: (specId: string) => Promise<void>;  // spec.jsonのみ再読み込み
  updateArtifact: (specId: string, artifact: 'requirements' | 'design' | 'tasks' | 'research') => Promise<void>;
  updateSpecMetadata: (specId: string) => Promise<void>;  // 一覧のメタデータのみ更新
}
```

#### Phase 2: ファイル変更イベントの粒度を活用

```typescript
// specStore.ts: onSpecsChanged の改善
watcherCleanup = window.electronAPI.onSpecsChanged((event) => {
  const { selectedSpec, specDetail } = get();

  // 選択中のSpecでなければメタデータのみ更新
  if (!selectedSpec || event.specId !== selectedSpec.name) {
    get().updateSpecMetadata(event.specId);
    return;
  }

  // 変更されたファイルに応じて適切なメソッドを呼び出し
  const fileName = path.basename(event.path);

  if (fileName === 'spec.json') {
    get().updateSpecJson(event.specId);
  } else if (fileName === 'requirements.md') {
    get().updateArtifact(event.specId, 'requirements');
  } else if (fileName === 'design.md') {
    get().updateArtifact(event.specId, 'design');
  } else if (fileName === 'tasks.md') {
    get().updateArtifact(event.specId, 'tasks');
  }
  // その他のファイルは無視（または必要に応じて処理）
});
```

#### Phase 3: 不要なrefreshSpecs/selectSpec呼び出しの削除

| 削除対象 | 代替処理 |
|---------|---------|
| WorkflowView.tsx useEffect内のrefreshSpecs | 削除（ファイル監視で自動更新） |
| AutoExecutionService.ts selectSpec呼び出し | updateSpecJson()に置き換え |
| handleApprovePhase後のselectSpec | updateSpecJson()に置き換え |

### 実装ステップ

1. **specStoreに粒度細かい更新メソッド追加**
   - `updateSpecJson()`: spec.jsonのみ再読み込みしてspecDetailを更新
   - `updateArtifact()`: 特定のartifactのみ再読み込み
   - `updateSpecMetadata()`: Spec一覧のメタデータのみ更新

2. **onSpecsChangedコールバックの改善**
   - ファイル名に基づいて適切な更新メソッドを呼び出し
   - `refreshSpecs()`の呼び出しを削除

3. **WorkflowView.tsx useEffectの削除**
   - Agent完了時のrefreshSpecs呼び出しを削除
   - ファイル監視で自動的にUIが更新されるようになる

4. **AutoExecutionService.tsの修正**
   - `selectSpec()`呼び出しを`updateSpecJson()`に置き換え

5. **その他の`selectSpec`/`refreshSpecs`呼び出し箇所の精査**
   - 本当に全ファイル再読み込みが必要な箇所のみ残す
   - それ以外は粒度細かいメソッドに置き換え

## Dependencies
- `specsWatcherService.ts`: 変更不要（既に粒度細かいイベントを発火）
- `specStore.ts`: 粒度細かい更新メソッド追加、onSpecsChanged改善
- `WorkflowView.tsx`: Agent完了時useEffect削除
- `AutoExecutionService.ts`: selectSpec呼び出しを粒度細かいメソッドに置き換え

## Testing Strategy
1. **spec.json変更テスト**: spec.jsonを外部で変更し、phaseステータスのみがUIに反映されることを確認
2. **artifact変更テスト**: requirements.mdを外部で変更し、その内容のみがUIに反映されることを確認
3. **Agent実行中編集テスト**: Agent実行中にdesign.mdを手動編集し、編集内容が保持されることを確認
4. **Agent完了後更新テスト**: Agent完了後、生成されたファイル内容がUIに即座に反映されることを確認
5. **パフォーマンステスト**: 1ファイル変更時に不要なファイル読み込みが発生しないことを確認
