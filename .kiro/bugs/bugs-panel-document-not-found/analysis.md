# Bug Analysis: bugs-panel-document-not-found

## Summary
BugsタブでBugアイテムを選択した際、ドキュメントファイルが実際に存在するにもかかわらず「ドキュメント未生成」と表示される。原因は`bugService.readBugDetail`がアーティファクトのコンテンツを読み込んでいないため。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/bugService.ts:182-204`
- **Component**: BugService.getBugArtifacts
- **Trigger**: Bug選択時のIPCハンドラー経由でのbugDetail読み込み

### 詳細分析
`BugService.getBugArtifacts`メソッドでは、アーティファクトファイルの存在確認とパス情報のみを返しており、**ファイルの内容（content）を読み込んでいない**。

**問題のコード** (`bugService.ts:183-195`):
```typescript
const getArtifact = async (name: string): Promise<BugArtifactInfo | null> => {
  try {
    const filePath = join(bugPath, `${name}.md`);
    const stats = await stat(filePath);
    return {
      exists: true,
      path: filePath,
      updatedAt: stats.mtime.toISOString(),
      // ❌ content プロパティがない
    };
  } catch {
    return null;
  }
};
```

一方、`BugArtifactEditor`コンポーネント (`BugArtifactEditor.tsx:29-38`) では `content` プロパティをチェックしている:
```typescript
function getArtifactContent(bugDetail: BugDetail, tab: BugDocumentTab): string | null {
  const artifact = bugDetail.artifacts[tab];
  if (!artifact || !artifact.exists || !artifact.content) {
    return null;  // ← contentがundefinedなのでnullを返す
  }
  return artifact.content;
}
```

結果として、ファイルが存在していても `content` が undefined のため、UIには「ドキュメント未生成」と表示される。

### 比較: Specの場合
`specStore.ts:199-207`では、spec選択時に`window.electronAPI.readArtifact`を呼び出してコンテンツを読み込んでいる:
```typescript
const getArtifactInfo = async (name: string): Promise<ArtifactInfo | null> => {
  try {
    const artifactPath = `${spec.path}/${name}.md`;
    const content = await window.electronAPI.readArtifact(artifactPath);
    return { exists: true, updatedAt: null, content };  // ✅ contentを含めている
  } catch {
    return null;
  }
};
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: すべてのBugsタブでのドキュメント表示が影響を受ける
- **Risk**: データ損失のリスクはない（読み取り専用の問題）

## Related Code
- [bugService.ts:182-204](electron-sdd-manager/src/main/services/bugService.ts#L182-L204) - getBugArtifactsメソッド
- [BugArtifactEditor.tsx:29-38](electron-sdd-manager/src/renderer/components/BugArtifactEditor.tsx#L29-L38) - getArtifactContent関数
- [bugStore.ts:94-119](electron-sdd-manager/src/renderer/stores/bugStore.ts#L94-L119) - selectBugアクション
- [handlers.ts:1085-1095](electron-sdd-manager/src/main/ipc/handlers.ts#L1085-L1095) - READ_BUG_DETAIL IPCハンドラー

## Proposed Solution

### Option 1: bugServiceでコンテンツを読み込む（推奨）
`getBugArtifacts`メソッドでファイル内容も読み込むように修正。

**修正箇所**: `bugService.ts:183-195`
```typescript
const getArtifact = async (name: string): Promise<BugArtifactInfo | null> => {
  try {
    const filePath = join(bugPath, `${name}.md`);
    const stats = await stat(filePath);
    const content = await readFile(filePath, 'utf-8');  // 追加
    return {
      exists: true,
      path: filePath,
      updatedAt: stats.mtime.toISOString(),
      content,  // 追加
    };
  } catch {
    return null;
  }
};
```

- Pros: シンプル、1箇所の修正で完了、specStoreのパターンと一致
- Cons: バグ詳細読み込み時に常にすべてのファイル内容を読み込むためオーバーヘッドがある

### Option 2: bugStoreでコンテンツを読み込む
specStoreと同様に、bugStoreの`selectBug`アクションで追加のIPC呼び出しを行う。

- Pros: 既存のspecStoreパターンに完全に一致
- Cons: renderer側の修正が必要、複数ファイルの変更

### Recommended Approach
**Option 1を推奨**。

理由:
1. 最小限の変更で修正可能
2. MainプロセスでのI/O処理は適切な場所
3. Bugのドキュメントは通常小さいため、パフォーマンスへの影響は軽微

## Dependencies
- `BugArtifactInfo`型に`content`プロパティが既に定義されているか確認が必要

## Testing Strategy
1. 既存のreport.mdを持つBugを選択し、内容が正しく表示されることを確認
2. analysis.md, fix.md, verification.mdも同様にテスト
3. ファイルが存在しない場合のフォールバック動作を確認
4. 既存のBugService単体テストを更新
