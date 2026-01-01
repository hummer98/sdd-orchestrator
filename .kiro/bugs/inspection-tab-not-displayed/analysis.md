# Bug Analysis: inspection-tab-not-displayed

## Summary
inspectionコマンド完了後、メインパネルにinspection-{n}.mdファイルのタブが表示されない問題。根本原因は`updateSpecJson()`がspec.jsonのinspectionフィールドを更新するが、対応するinspection artifactを再読み込みしないため。

## Root Cause

### Technical Details
- **Location**: [specStore.ts:523-558](electron-sdd-manager/src/renderer/stores/specStore.ts#L523-L558)
- **Component**: specStore.updateSpecJson()
- **Trigger**: inspection-*.mdファイルが変更されると、ファイルウォッチャーが`updateSpecJson()`を呼び出すが、この関数はspec.jsonのみを更新し、inspection artifactを再読み込みしない

### 問題の流れ

1. spec-inspectionコマンドがinspection-{n}.mdファイルを作成
2. spec-inspectionコマンドがspec.jsonにinspectionフィールドを追加
3. SpecsWatcherServiceがファイル変更を検知
4. specStore.tsの416行目でinspection-*.mdファイル変更時に`updateSpecJson()`が呼ばれる
5. **問題**: `updateSpecJson()`はspec.jsonだけを読み込み、`specDetail.artifacts.inspection`を更新しない

### コード分析

**現在のupdateSpecJson実装**:
```typescript
// specStore.ts:523-558
updateSpecJson: async () => {
  const { selectedSpec, specDetail } = get();
  if (!selectedSpec || !specDetail) return;

  const specJson = await window.electronAPI.readSpecJson(selectedSpec.path);

  // 問題: specJsonのみ更新し、artifacts.inspectionを更新していない
  set({
    specDetail: {
      ...specDetail,
      specJson,  // spec.jsonは更新される
      // artifacts は更新されない → inspection artifact が古いまま
    },
  });
};
```

**SpecPane.tsxのタブ生成ロジック**:
```typescript
// SpecPane.tsx:84-100
const inspectionTabs = useMemo((): TabInfo[] => {
  const inspection = specDetail?.specJson?.inspection;
  if (!inspection?.report_file) {
    return [];  // report_fileがなければタブなし
  }
  // ...
}, [specDetail?.specJson?.inspection]);
```

SpecPane.tsxはspec.jsonのinspectionフィールドに依存してタブを生成するため、spec.jsonが正しく更新されればタブは表示されるはず。しかし、タブをクリックしてもartifacts.inspectionが未読み込みのため空になる可能性がある。

## Impact Assessment
- **Severity**: Medium
- **Scope**: inspection完了後のUI表示に影響
- **Risk**: inspection結果をUIで確認できないため、ユーザーがファイルを直接開く必要がある

## Related Code
```typescript
// selectSpec内でinspection artifactを読み込む処理（正しい実装）
// specStore.ts:222-244
const getInspectionArtifact = async (): Promise<ArtifactInfo | null> => {
  const inspection = specJson.inspection;
  if (!inspection?.report_file) {
    return null;
  }
  try {
    const artifactPath = `${spec.path}/${inspection.report_file}`;
    const content = await window.electronAPI.readArtifact(artifactPath);
    return { exists: true, updatedAt: null, content };
  } catch {
    return null;
  }
};
```

## Proposed Solution

### Option 1: updateSpecJsonでinspection artifactも再読み込み（推奨）
- Description: `updateSpecJson()`内でspec.jsonを読み込んだ後、inspectionフィールドがあればartifacts.inspectionも読み込む
- Pros:
  - 最小限の変更で修正可能
  - 既存のgetInspectionArtifactロジックを再利用可能
  - パフォーマンス影響が少ない（必要な時のみ読み込み）
- Cons:
  - updateSpecJson関数の責務が少し増える

### Option 2: inspection-*.md変更時に専用の更新関数を呼ぶ
- Description: specStore.tsのファイルウォッチャー処理で、inspection-*.md変更時に`updateInspectionArtifact()`を別途呼び出す
- Pros:
  - 関心の分離が明確
- Cons:
  - 新しい関数の追加が必要
  - ファイルウォッチャーの処理が複雑化

### Recommended Approach
**Option 1を推奨**: `updateSpecJson()`を拡張して、spec.jsonにinspectionフィールドがあればartifacts.inspectionも読み込むようにする。これにより、inspection完了後のUI更新が正しく行われる。

## Dependencies
- [specStore.ts](electron-sdd-manager/src/renderer/stores/specStore.ts) - updateSpecJson関数の修正
- SpecsWatcherService - 変更不要（現在の動作で正しい）

## Testing Strategy
1. inspection-*.mdファイル作成時にタブが表示されることを確認
2. タブクリック時にコンテンツが正しく表示されることを確認
3. 既存のspec.json更新機能に影響がないことを確認
4. E2Eテスト: inspectionフロー完了後のUI状態を検証
