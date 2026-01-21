# Bug Analysis: bug-artifact-content-not-displayed

## Summary
spec-path-ssot-refactor後、BugsタブでArtifact内容が表示されない。`readArtifact` IPCハンドラが常に`resolveSpecPath`を使用し、Bug用の`resolveBugPath`分岐が欠如している。

## Root Cause
`39e7dcd feat(spec-path-ssot): IPC API nameベース移行`で、`readArtifact` IPCハンドラがSpec専用のパス解決ロジックのみを実装し、Bug用の分岐を追加しなかった。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/ipc/handlers.ts:638`
- **Component**: IPC handlers / ArtifactEditor
- **Trigger**: BugsタブでArtifact（report.md等）を選択時

**問題のコード** (handlers.ts:632-649):
```typescript
ipcMain.handle(
  IPC_CHANNELS.READ_ARTIFACT,
  async (_event, specName: string, filename: string) => {
    // ...
    const specPathResult = await fileService.resolveSpecPath(currentProjectPath, specName);
    //                                        ^^^^^^^^^^^^^^^ Bug用のresolveBugPathが必要
    if (!specPathResult.ok) {
      throw new Error(`Spec not found: ${specName}`);  // ← Bugの場合ここでエラー
    }
    // ...
  }
);
```

**データフロー**:
```
BugPane (baseName=bugName)
  → ArtifactEditor
    → editorStore.loadArtifact(bugName, artifact)
      → window.electronAPI.readArtifact(bugName, filename)
        → handlers.ts: resolveSpecPath(bugName)  ❌ .kiro/specs/から探す
        → "Spec not found" エラー → コンテンツ空
```

## Impact Assessment
- **Severity**: High
- **Scope**: Bugsタブ全体 - すべてのBugのArtifact表示が不可
- **Risk**: 低 - 修正による副作用リスクは小さい（API拡張のみ）

## Related Code
| ファイル | 行 | 役割 |
|---------|---|-----|
| `handlers.ts` | 632-649 | READ_ARTIFACT IPCハンドラ（修正対象） |
| `preload/index.ts` | 75-76 | readArtifact API定義（拡張必要） |
| `editorStore.ts` | 133 | loadArtifact関数（拡張必要） |
| `ArtifactEditor.tsx` | 48 | コンポーネント（prop追加必要） |
| `BugPane.tsx` | 72-78 | ArtifactEditor使用箇所 |
| `SpecPane.tsx` | 139-145 | ArtifactEditor使用箇所（参考） |

## Proposed Solution

### Option 1: readArtifact APIにentityType追加（推奨）
- **Description**: `readArtifact(name, filename, entityType)` 形式に拡張
- **Pros**:
  - 既存の共有ArtifactEditorを活用
  - Spec/Bug両対応が明確
  - SSOTを維持（パス解決はMain側で一元化）
- **Cons**:
  - 複数ファイルの変更が必要

### Recommended Approach
**Option 1を採用**: APIレベルでentityTypeを追加し、Main側で適切なパス解決を行う

**修正内容**:
1. `preload/index.ts`: `readArtifact(name, filename, entityType?: 'spec' | 'bug')` に拡張
2. `handlers.ts`: entityTypeに応じて`resolveSpecPath`/`resolveBugPath`を使い分け
3. `editorStore.ts`: loadArtifactにentityTypeパラメータ追加
4. `ArtifactEditor.tsx`: `entityType` propを追加（デフォルト: 'spec'）
5. `BugPane.tsx`: `entityType="bug"` を渡す

## Dependencies
- `fileService.resolveSpecPath` / `resolveBugPath` - 既存実装を活用
- `electron.d.ts` - 型定義の更新

## Testing Strategy
1. **手動テスト**: Bugsタブで既存バグを選択し、Artifactが表示されることを確認
2. **ユニットテスト**: readArtifactハンドラのentityType分岐テスト
3. **回帰テスト**: SpecsタブのArtifact表示に影響がないことを確認
