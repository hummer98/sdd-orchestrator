# Bug Analysis: worktree-impl-start-trim-error

## Summary
`WorktreeService.execGit`メソッドがNode.jsの`exec`コールバックの引数形式を誤って定義しているため、実行時に`Cannot read properties of undefined (reading 'trim')`エラーが発生する。

## Root Cause
`ExecFunction`型とその使用箇所がNode.jsの`child_process.exec`の実際のコールバックシグネチャと不一致。

### Technical Details
- **Location**: `electron-sdd-manager/src/main/services/worktreeService.ts:20-24`, `108-127`
- **Component**: WorktreeService
- **Trigger**: 任意の`execGit`メソッド呼び出し（例：「Worktreeで実装」ボタン押下時）

**問題の型定義（20-24行目）**:
```typescript
export type ExecFunction = (
  command: string,
  options: { cwd: string },
  callback: (error: Error | null, result: { stdout: string; stderr: string }) => void
) => { kill: () => void };
```

**問題の使用箇所（113, 122行目）**:
```typescript
(error, result) => {
  // ...
  resolve({ ok: true, value: result.stdout.trim() });  // ← result.stdoutがundefined
}
```

**Node.jsの実際のシグネチャ**:
```typescript
callback: (error: Error | null, stdout: string, stderr: string) => void
```

コードは`result`がオブジェクト`{ stdout, stderr }`であることを期待しているが、実際のNode.js `exec`は`stdout`と`stderr`を**別々の引数**として渡す。そのため：
- `result`には`stdout`文字列が直接入る
- `result.stdout`は`undefined`
- `undefined.trim()`で`TypeError`発生

**テストが成功する理由**:
テストは依存性注入（DI）でモックの`ExecFunction`を注入しており、モック関数は型定義通りのオブジェクト形式で値を返すためテストは通過する。しかし、本番環境では102行目で`nodeExec`を`ExecFunction`に**unsafeなキャスト**しているため、型システムがエラーを検出できない。

## Impact Assessment
- **Severity**: High
- **Scope**: WorktreeService全体（spec/bugの両方のworktree機能）
- **Risk**: worktree作成・削除・ブランチ操作すべてが動作しない

## Related Code
**102行目 - unsafeなキャスト**:
```typescript
this.execFn = execFn || (nodeExec as unknown as ExecFunction);
```

このダブルキャスト（`as unknown as`）は型安全性を完全に無視しており、根本的な問題。

## Proposed Solution

### Option 1: ExecFunction型を修正（推奨）
Node.jsの実際のシグネチャに合わせて型定義を修正：

```typescript
export type ExecFunction = (
  command: string,
  options: { cwd: string },
  callback: (error: Error | null, stdout: string, stderr: string) => void
) => { kill: () => void };
```

**コールバックの修正**:
```typescript
(error, stdout, stderr) => {
  if (error) {
    // ...
    resolve({ ok: false, error: { type: 'GIT_ERROR', message } });
  } else {
    resolve({ ok: true, value: stdout.trim() });
  }
}
```

- **Pros**: 型安全性を確保、unsafeなキャストを削除可能
- **Cons**: テストコードのモック関数も修正が必要

### Option 2: promisify版execを使用
`util.promisify(exec)`を使用し、`{ stdout, stderr }`オブジェクトを返す形式に変更。

- **Pros**: async/awaitで自然に書ける、オブジェクト形式が得られる
- **Cons**: 戻り値の型が異なるためDI設計の変更が必要

### Recommended Approach
**Option 1**を推奨。理由：
1. 最小限の変更で修正可能
2. 既存のDI設計を維持
3. 型安全性を確保（unsafeキャストを排除）
4. テストの修正も同じパターンで対応可能

## Dependencies
- `worktreeService.test.ts` - モック関数`createMockExec`の修正が必要

## Testing Strategy
1. 修正後にすべての既存テストが通過することを確認
2. 手動テスト: 実際に「Worktreeで実装」ボタンを押下してworktreeが作成されることを確認
3. E2Eテスト: worktree作成・削除のE2Eテストを実行（存在する場合）

## References
- [Node.js child_process.exec ドキュメント](https://nodejs.org/api/child_process.html)
