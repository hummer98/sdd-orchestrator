# Bug Analysis: gitview-eisdir-on-untracked-directory

## Summary
GitViewで未追跡ディレクトリをクリックすると「EISDIR: illegal operation on a directory, read」エラーが発生する。`parsePorcelain()` がディレクトリとファイルを区別せず、`generateUntrackedDiff()` がディレクトリに対して `readFile()` を実行することが原因。

## Root Cause

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/GitService.ts`
  - Line 337-363: `parsePorcelain()` メソッド
  - Line 396-425: `generateUntrackedDiff()` メソッド
- **Component**: GitService (Main Process)
- **Trigger**:
  1. `git status --porcelain` が未追跡ディレクトリを末尾スラッシュ付きで返す（例: `?? .kiro/bugs/foo/`）
  2. `parsePorcelain()` がスラッシュを除去せず、ディレクトリをファイルとして扱う（Line 343: `path = line.substring(3).trim()`）
  3. ユーザーがGitViewでこのパスをクリック
  4. `getDiff()` → `generateUntrackedDiff()` → `readFile(fullPath)` が呼ばれる（Line 399）
  5. ディレクトリに対する `readFile()` は EISDIR エラーをスローする（Line 416-423）

### Architectural Issue
`GitFileStatus` 型定義（`electron-sdd-manager/src/shared/api/types.ts:783-788`）はファイルのみを想定しており、ディレクトリを区別する手段がない。

```typescript
export interface GitFileStatus {
  path: string;
  status: 'A' | 'M' | 'D' | '??';
  // ディレクトリかどうかを示すフラグがない
}
```

## Impact Assessment
- **Severity**: Medium
- **Scope**:
  - 未追跡ディレクトリを含むプロジェクトでGitViewを使用するすべてのユーザー
  - Worktree環境および通常のブランチ環境の両方で発生
- **Risk**:
  - ユーザーエクスペリエンスの低下（エラーメッセージが表示される）
  - データ損失リスクはなし（読み取り専用操作）

## Related Code

### parsePorcelain() メソッド (GitService.ts:337-363)
```typescript
private parsePorcelain(output: string): GitFileStatus[] {
  const files: GitFileStatus[] = [];
  const lines = output.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const statusCode = line.substring(0, 2).trim();
    const path = line.substring(3).trim(); // ← スラッシュを除去していない

    let status: GitFileStatus['status'];

    if (statusCode === '??') {
      status = '??';
    } else if (statusCode.includes('M')) {
      status = 'M';
    } else if (statusCode.includes('A')) {
      status = 'A';
    } else if (statusCode.includes('D')) {
      status = 'D';
    } else {
      status = 'M';
    }

    files.push({ path, status }); // ← ディレクトリもファイルとして追加される
  }

  return files;
}
```

### generateUntrackedDiff() メソッド (GitService.ts:396-425)
```typescript
private async generateUntrackedDiff(projectPath: string, filePath: string): Promise<Result<string, ApiError>> {
  try {
    const fullPath = join(projectPath, filePath);
    const content = await readFile(fullPath, 'utf-8'); // ← ディレクトリに対してreadFileを実行すると EISDIR エラー

    // Generate diff with all lines as additions
    const lines = content.split('\n');
    const diffLines = [
      `diff --git a/${filePath} b/${filePath}`,
      'new file mode 100644',
      `--- /dev/null`,
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${lines.length} @@`,
      ...lines.map(line => `+${line}`),
    ];

    return {
      success: true,
      data: diffLines.join('\n'),
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'system_error',
        message: `Failed to read untracked file: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}
```

## Proposed Solution

### Recommended Approach: ディレクトリを除外する（SSOT原則に従う）

**方針**: `parsePorcelain()` で末尾スラッシュを検出し、ディレクトリエントリを除外する。

**理由**:
1. **Git semantics**: `git status --porcelain` がディレクトリを報告するのは、「このディレクトリ配下に未追跡ファイルがある」という情報。ディレクトリ自体は Git の追跡対象ではない。
2. **SSOT**: GitFileStatus はファイルの変更状態を表す。ディレクトリは変更状態を持たない（内容物だけが追跡される）。
3. **最小変更**: 型定義を変更せず、パース時にフィルタリングするだけで済む。

**実装**:
```typescript
// GitService.ts:337-363
private parsePorcelain(output: string): GitFileStatus[] {
  const files: GitFileStatus[] = [];
  const lines = output.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const statusCode = line.substring(0, 2).trim();
    let path = line.substring(3).trim();

    // Skip directories (git status --porcelain reports untracked dirs with trailing slash)
    if (path.endsWith('/')) {
      continue;
    }

    let status: GitFileStatus['status'];

    if (statusCode === '??') {
      status = '??';
    } else if (statusCode.includes('M')) {
      status = 'M';
    } else if (statusCode.includes('A')) {
      status = 'A';
    } else if (statusCode.includes('D')) {
      status = 'D';
    } else {
      status = 'M';
    }

    files.push({ path, status });
  }

  return files;
}
```

**Pros**:
- 最小限の変更（1箇所に3行追加）
- 型定義変更不要
- Gitのセマンティクスに忠実（ディレクトリは追跡対象ではない）
- SSOT原則に準拠（ファイルのみを扱う）

**Cons**:
- なし

### Alternative Option: ディレクトリを明示的に扱う（却下）

型定義を拡張してディレクトリフラグを追加し、UI側でディレクトリの場合はクリック不可にする。

**却下理由**:
- **過剰設計**: ディレクトリ自体は Git の追跡対象ではなく、表示する必要がない
- **複雑性**: 型定義変更 + UI側の条件分岐が必要
- **一貫性**: Gitの他の出力（`git diff --name-status`）はディレクトリを報告しない

## Dependencies
- **影響を受けるコンポーネント**:
  - `GitService.parsePorcelain()` (修正箇所)
  - `GitView` (UI) - 変更不要（ディレクトリが表示されなくなるだけ）

## Testing Strategy
1. **単体テスト**: `GitService.test.ts` に以下のケースを追加
   - 末尾スラッシュ付きパスがフィルタリングされること
   - 通常のファイルパスは正常にパースされること
   - 混在したケース（ファイル + ディレクトリ）が正しく処理されること

2. **統合テスト**:
   - 未追跡ディレクトリを含むプロジェクトでGitViewを開く
   - ディレクトリがファイルリストに表示されないこと
   - 未追跡ファイルは正常に表示され、クリック可能であること

3. **回帰テスト**:
   - Worktree環境での動作確認
   - 通常のブランチ環境での動作確認
