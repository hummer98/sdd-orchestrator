# Bug Analysis: electron-bug-create-command

## Summary
CreateBugDialogがspec-initとは異なるパターンでstartAgentを呼び出しており、`claude` CLIではなくスラッシュコマンドを直接commandとして渡しているため、正しく実行されない。

## Root Cause
CreateBugDialogがCreateSpecDialogと異なる実装パターンを使用している。

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/CreateBugDialog.tsx:72-83`
- **Component**: CreateBugDialog / agentStore.startAgent
- **Trigger**: ユーザーがBug新規作成ダイアログで「作成」ボタンをクリック

### 問題のコード（CreateBugDialog.tsx:72-83）
```typescript
const command = '/kiro:bug-create';  // ❌ スラッシュコマンドをそのまま渡している
const args: string[] = [bugName, `"${trimmedDescription}"`];  // ❌ CLIオプションなし

const agentId = await startAgent(
  '',
  'bug-create',
  command,  // '/kiro:bug-create' がそのままプロセス実行される
  args,     // [bugName, description] だけ
  undefined,
  undefined
);
```

### 正しい実装パターン（CreateSpecDialog.tsx:48 → handlers.ts:965-970）
```typescript
// CreateSpecDialogは専用IPCハンドラーを呼び出す
const agentInfo = await window.electronAPI.executeSpecInit(currentProject, trimmed, commandPrefix);

// handlers.ts内で正しくコマンドを組み立て
command: 'claude',
args: ['-p', '--verbose', '--output-format', 'stream-json', `${slashCommand} "${description}"`],
```

## Impact Assessment
- **Severity**: High
- **Scope**: Electronアプリからのすべてのバグ作成機能が動作しない
- **Risk**: CLIで直接`/kiro:bug-create`を実行すれば回避可能

## Related Code
| ファイル | 行 | 役割 |
|---------|------|------|
| `CreateBugDialog.tsx` | 72-83 | 問題のある実装 |
| `CreateSpecDialog.tsx` | 48 | 正しいパターン |
| `handlers.ts` | 949-982 | `EXECUTE_SPEC_INIT`ハンドラー（参考） |
| `agentStore.ts` | 183-221 | `startAgent`（command/argsをそのまま転送） |

## Proposed Solution

### Option 1: 専用IPCハンドラー作成（推奨）
- **Description**: `EXECUTE_BUG_CREATE` IPCハンドラーを作成し、spec-initと同じパターンで実装
- **Pros**:
  - spec-initと一貫性のある設計
  - UI側のロジックがシンプル
  - bugNameをClaude側で生成可能
- **Cons**:
  - 新しいIPCチャネルの追加が必要

### Option 2: CreateBugDialog内でコマンドを正しく組み立て
- **Description**: UI側で`claude`コマンドと正しいargsを組み立てる
- **Pros**:
  - 変更範囲が小さい
- **Cons**:
  - spec-initとパターンが異なる
  - UI側にコマンド組み立てロジックが残る

### Recommended Approach
**Option 1** を推奨。

理由：
1. CreateSpecDialogと一貫したアーキテクチャ
2. bugNameの自動生成をClaude側に委譲可能（`bug-create.md`の設計意図に沿う）
3. 将来的にcommandPrefixの切り替えにも対応しやすい

## Dependencies
- `electron-sdd-manager/src/main/ipc/channels.ts`: 新しいチャネル追加
- `electron-sdd-manager/src/main/ipc/handlers.ts`: ハンドラー追加
- `electron-sdd-manager/src/preload/electron.d.ts`: 型定義追加
- `electron-sdd-manager/src/preload/preload.ts`: API追加

## Testing Strategy
1. Electronアプリでバグ作成ダイアログを開く
2. 説明を入力して「作成」をクリック
3. プロジェクトAgentパネルでエージェントが正常に起動することを確認
4. `.kiro/bugs/`に新しいバグディレクトリが作成されることを確認
