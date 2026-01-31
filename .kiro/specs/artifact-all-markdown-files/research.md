# Research & Design Decisions: Artifact全Markdownファイル表示

## Summary

- **Feature**: artifact-all-markdown-files
- **Discovery Scope**: Extension (既存Artifact Editor拡張)
- **Key Findings**:
  - 既存のdynamicTabsメカニズムを活用可能（大規模な設計変更不要）
  - specsWatcherServiceが既に*.mdを監視しており、新規ウォッチャー不要
  - SpecDetail型の拡張で後方互換性を保持可能

## Research Log

### Investigation 1: 既存のタブ生成メカニズム

**Context**: ArtifactEditorのタブ生成ロジックを調査し、拡張ポイントを特定する必要があった。

**Sources Consulted**:
- `electron-sdd-manager/src/renderer/components/ArtifactEditor.tsx`
- `electron-sdd-manager/src/renderer/components/SpecPane.tsx`
- `electron-sdd-manager/src/shared/constants/artifacts.ts`

**Findings**:
- 固定タブは`SPEC_ARTIFACT_TABS`定数で定義（requirements, design, tasks, research）
- 動的タブはSpecPane/BugPaneで生成され、`dynamicTabs` propでArtifactEditorに渡される
- ArtifactEditor内の`visibleTabs`メモで固定タブ+dynamicTabsを統合
- document-review-*, inspection-*タブは既にdynamicTabsメカニズムで実装済み

**Implications**:
- 新規ファイル検出ロジックもdynamicTabsに追加する形で実装可能
- ArtifactEditor本体の変更は不要（既存のdynamicTabs処理を活用）
- SpecPane/BugPaneに新規useMemoフックを追加するだけで実装可能

### Investigation 2: ファイルウォッチャーの既存実装

**Context**: *.mdファイルの追加/削除をリアルタイムで検知する方法を調査。

**Sources Consulted**:
- `electron-sdd-manager/src/main/services/specsWatcherService.ts`
- `electron-sdd-manager/src/main/services/bugsWatcherService.ts`

**Findings**:
- specsWatcherServiceは既にchokidarで`*.md`ファイルを監視している
- ファイル追加/削除時にspecs-changedイベントを送信
- Renderer側のspecStoreがイベントを受信し、SpecDetail再読み込みをトリガー
- 同様にbugsWatcherServiceもbugs-changedイベントを送信

**Implications**:
- 新規ウォッチャーの追加は不要（既存ウォッチャーで十分）
- *.mdファイルの変更は既にspecs-changed/bugs-changedイベントでキャプチャ済み
- UI側は既存のイベントリスナーで自動更新される（追加実装不要）

### Investigation 3: SpecDetail型の運搬設計

**Context**: ファイル一覧をUI層に運搬する最適な方法を検討。

**Sources Consulted**:
- `electron-sdd-manager/src/renderer/types/index.ts`
- `electron-sdd-manager/src/shared/api/IpcApiClient.ts`
- `electron-sdd-manager/src/shared/api/WebSocketApiClient.ts`

**Findings**:
- SpecDetailは既にspec情報の運搬に使用されており、SSOT原則に従っている
- artifactsフィールドで固定タブのファイル存在情報を運搬中
- オプショナルフィールド追加は後方互換性を保持可能

**Implications**:
- `markdownFiles?: string[]`をSpecDetailに追加
- IpcApiClient/WebSocketApiClientのgetSpecDetail内で設定
- 既存コードは`markdownFiles`未定義でも動作継続（後方互換性）

### Investigation 4: Remote UI対応の設計

**Context**: Remote UI（WebSocket経由）でも同等の機能を提供する必要がある。

**Sources Consulted**:
- `electron-sdd-manager/src/main/services/webSocketHandler.ts`
- `electron-sdd-manager/src/remote-ui/components/RemoteArtifactEditor.tsx`

**Findings**:
- WebSocketHandlerはIPC APIと同等のエンドポイントを提供
- RemoteArtifactEditorは既にdynamicTabs機能を実装済み
- SpecDetailの運搬はWebSocket経由でも同様のデータ構造

**Implications**:
- WebSocketHandlerに`list-markdown-files-in-spec`エンドポイントを追加
- RemoteArtifactEditorでSpecPaneと同様の動的タブ生成ロジックを実装
- データ構造は統一されているため、コード重複を最小化可能

## Architecture Pattern Evaluation

### Option 1: dynamicTabsメカニズム拡張（選択）

| Aspect | Description |
|--------|-------------|
| Approach | 既存のdynamicTabsプロパティに追加ファイルタブを統合 |
| Strengths | 既存設計に準拠、実装コスト低、後方互換性保持 |
| Risks | タブ数増加時のUI操作性低下（100個超は現実的に稀） |
| Notes | document-review, inspectionと同様のパターン |

### Option 2: 別途タブグループ追加（却下）

| Aspect | Description |
|--------|-------------|
| Approach | ArtifactEditorに新規プロパティ`additionalTabs`を追加 |
| Strengths | タブグループを明確に分離 |
| Risks | ArtifactEditor本体の変更が必要、設計複雑化 |
| Notes | 現状のタブ数では過剰設計 |

### Option 3: ファイルエクスプローラー統合（却下）

| Aspect | Description |
|--------|-------------|
| Approach | 左サイドバーにファイルツリーを追加 |
| Strengths | 大量ファイルのナビゲーション向上 |
| Risks | UIレイアウト大幅変更、既存ワークフロー破壊 |
| Notes | 将来的な拡張として検討可能 |

## Design Decisions

### Decision: dynamicTabsメカニズム拡張

**Context**: 新規ファイルをどうタブ表示に統合するか。

**Alternatives Considered**:
1. **dynamicTabsに統合**（選択）
2. 別途タブグループ追加
3. ファイルエクスプローラー統合

**Selected Approach**: dynamicTabsメカニズム拡張

**Rationale (Why)**:
- **Technical reasons**: 既存のdocument-review, inspectionタブと同じパターンを適用可能
- **Maintainability**: ArtifactEditor本体の変更不要、影響範囲を最小化
- **Consistency**: 既存設計に準拠し、新規開発者が理解しやすい
- **Implementation cost**: SpecPane/BugPaneにuseMemoフック追加のみで実装可能

**Trade-offs**:
- **Benefits**: 実装コスト低、後方互換性保持、既存UIパターン踏襲
- **Compromises**: タブ数が100個超の場合にUI操作性が低下する可能性（現実的には稀）

**Follow-up**: タブ数増加時のUX改善は別specで対応（タブグループ化、ファイルエクスプローラー等）

### Decision: 既存ウォッチャー活用

**Context**: *.mdファイルの追加/削除をどう検知するか。

**Alternatives Considered**:
1. **既存specsWatcherService活用**（選択）
2. 新規ウォッチャー追加
3. ポーリング

**Selected Approach**: 既存specsWatcherService活用

**Rationale (Why)**:
- **Technical reasons**: specsWatcherServiceは既に*.mdを監視対象としている
- **Resource efficiency**: 新規ウォッチャー追加はリソース消費増加、設計複雑化
- **Consistency**: 既存のspecs-changedイベントフローを活用

**Trade-offs**:
- **Benefits**: 実装コスト0（既存機能で完結）、リソース消費なし
- **Compromises**: なし

**Follow-up**: なし

### Decision: SpecDetail型拡張

**Context**: ファイル一覧をUI層にどう運搬するか。

**Alternatives Considered**:
1. **SpecDetail.markdownFilesフィールド追加**（選択）
2. 別途IPC APIでファイル一覧取得
3. Local Stateで管理

**Selected Approach**: SpecDetail.markdownFilesフィールド追加

**Rationale (Why)**:
- **Technical reasons**: SpecDetailは既にspec情報のSSOTとして機能
- **Data flow simplification**: IPC往復回数を増やさず、一括でデータ取得
- **SSOT principle**: 複数箇所での状態管理を回避

**Trade-offs**:
- **Benefits**: データフロー単純化、SSOT原則準拠、後方互換性保持
- **Compromises**: SpecDetail型の肥大化（軽微: 配列フィールド1つのみ）

**Follow-up**: なし

## Implementation Guidance

### FileService.listMarkdownFilesInSpec実装例

```typescript
async listMarkdownFilesInSpec(specPath: string): Promise<Result<string[], FileError>> {
  // 1. Path validation
  const validation = validatePath(projectPath, specPath);
  if (!validation.ok) return validation;

  // 2. Check spec.json existence
  const specJsonPath = join(specPath, 'spec.json');
  try {
    await access(specJsonPath);
  } catch {
    return { ok: false, error: { type: 'SPEC_NOT_FOUND', path: specPath, reason: 'spec.json not found' } };
  }

  // 3. Read directory
  try {
    const dirents = await readdir(specPath, { withFileTypes: true });

    // 4. Filter *.md files (exclude fixed/dynamic tabs)
    const excludedPatterns = [
      'requirements.md',
      'design.md',
      'tasks.md',
      'research.md',
      /^document-review-\d+\.md$/,
      /^document-review-\d+-reply\.md$/,
      /^inspection-\d+\.md$/,
    ];

    const markdownFiles = dirents
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
      .map(dirent => dirent.name)
      .filter(name => {
        if (excludedPatterns.includes(name)) return false;
        for (const pattern of excludedPatterns) {
          if (pattern instanceof RegExp && pattern.test(name)) return false;
        }
        return true;
      });

    return { ok: true, value: markdownFiles };
  } catch (error) {
    return { ok: false, error: { type: 'FILE_READ_ERROR', path: specPath, reason: String(error) } };
  }
}
```

### SpecPane.additionalMarkdownTabs実装例

```typescript
// SpecPane.tsx内
const additionalMarkdownTabs = useMemo((): TabInfo[] => {
  if (!specDetail?.markdownFiles || specDetail.markdownFiles.length === 0) {
    return [];
  }

  // Sort alphabetically (case-insensitive)
  const sortedFiles = [...specDetail.markdownFiles].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Convert to TabInfo[]
  return sortedFiles.map(filename => ({
    key: filename.replace('.md', '') as ArtifactType, // e.g., "architecture.md" → "architecture"
    label: filename,
  }));
}, [specDetail?.markdownFiles]);

// Combine all dynamic tabs
const dynamicTabs = useMemo(
  () => [...documentReviewTabs, ...inspectionTabs, ...additionalMarkdownTabs],
  [documentReviewTabs, inspectionTabs, additionalMarkdownTabs]
);
```

### IPC Handler登録例

```typescript
// fileHandlers.ts内
ipcMain.handle(IPC_CHANNELS.LIST_MARKDOWN_FILES_IN_SPEC, async (_, specPath: string) => {
  try {
    const result = await fileService.listMarkdownFilesInSpec(specPath);
    if (!result.ok) {
      throw new Error(result.error.reason);
    }
    return result.value;
  } catch (error) {
    logger.error('[IPC] listMarkdownFilesInSpec error:', error);
    throw error;
  }
});
```

## Risks & Mitigations

### Risk 1: タブ数増加によるUI操作性低下

**Mitigation**: 現段階では対処不要（spec直下に100個超の*.mdファイルを配置するケースは稀）。将来的にタブグループ化やファイルエクスプローラー統合を検討。

### Risk 2: ファイル名の重複（既存タブとの衝突）

**Mitigation**: FileService.listMarkdownFilesInSpecで固定・動的タブパターンを除外済み。ユーザーが意図的に同名ファイルを作成した場合は、その他*.mdタブに表示されない（既存タブが優先）。

### Risk 3: パフォーマンス（大量ファイル検出）

**Mitigation**: readdir操作は同期的処理で十分高速（100ms以内）。React側のuseMemoで再計算を最小化。

## References

- [Node.js fs.readdir documentation](https://nodejs.org/api/fs.html#fspromisesreaddirpath-options)
- [React useMemo documentation](https://react.dev/reference/react/useMemo)
- [Electron IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)
- Internal: `.kiro/steering/structure.md` - State Management Rules
- Internal: `.kiro/steering/design-principles.md` - AI Design Principles
