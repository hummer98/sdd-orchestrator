# Bug Analysis: commandset-profile-agent-cleanup

## Summary
cc-sdd-agentプロファイルから他のプロファイルへ切り替える際、既存のagentフォルダ（`.claude/agents/kiro/`）の処理に関する確認ダイアログが表示されず、ユーザーが意図せずファイルを残したり削除したりしてしまう可能性がある。

## Root Cause
**プロファイル切り替え時にagentフォルダの存在チェックと削除ロジックが実装されていない**

### Technical Details
- **Location**: `electron-sdd-manager/src/renderer/components/CommandsetInstallDialog.tsx:106-128`
- **Component**: CommandsetInstallDialog / UnifiedCommandsetInstaller
- **Trigger**: cc-sdd-agentプロファイルが既にインストールされている状態で、cc-sddまたはspec-managerプロファイルを選択してインストールする時

### 現在のコードフロー

1. `CommandsetInstallDialog.tsx` でプロファイル選択
2. `handleInstall()` が `onInstall(selectedProfile, progressCallback)` を呼び出し
3. `UnifiedCommandsetInstaller.installByProfile()` が実行
4. `installCommandset()` で各コマンドセットをインストール

**問題点**:
- `installByProfile()` はagentフォルダの**インストール**のみを行い、**削除**ロジックが存在しない
- cc-sdd-agent → cc-sdd/spec-manager への切り替え時、`.claude/agents/kiro/` が残り続ける
- agentを含まないプロファイルに切り替えても、古いagentファイルが参照される可能性

## Impact Assessment
- **Severity**: Medium
- **Scope**: cc-sdd-agentを使用後に他プロファイルに切り替えるユーザー
- **Risk**:
  - 古いagentファイルが残ることで予期しない動作
  - ユーザーが手動でagentフォルダを削除する必要がある

## Related Code

**プロファイル定義（CommandsetInstallDialog.tsx:53-75）:**
```typescript
const PROFILES: Profile[] = [
  {
    name: 'cc-sdd',
    commandsets: ['cc-sdd', 'bug', 'document-review'],  // agentsなし
  },
  {
    name: 'cc-sdd-agent',
    commandsets: ['cc-sdd-agent', 'bug', 'document-review', 'agents'],  // agentsあり
  },
  {
    name: 'spec-manager',
    commandsets: ['spec-manager', 'bug', 'document-review'],  // agentsなし
  },
];
```

**agentインストール先（ccSddWorkflowInstaller.ts:411）:**
```typescript
const targetPath = join(projectPath, '.claude', 'agents', 'kiro', `${agent}.md`);
```

## Proposed Solution

### Option 1: プロファイル切り替え前に確認ダイアログを表示（推奨）
- Description: 新規プロファイルがagentを含まず、既存agentフォルダが存在する場合、3択ダイアログを表示
- Pros: ユーザーが明示的に選択可能、データ損失防止
- Cons: UIの追加実装が必要

### Option 2: 自動削除（警告付き）
- Description: agentを含まないプロファイルへの切り替え時、自動削除して結果を通知
- Pros: 実装がシンプル
- Cons: ユーザーの意図に反する可能性

### Recommended Approach
**Option 1**: ユーザー確認ダイアログを実装

**実装箇所:**
1. `CommandsetInstallDialog.tsx` に新しいダイアログ状態 `'agent-cleanup-confirm'` を追加
2. `handleInstall()` でプロファイル切り替え前にagentフォルダの存在確認
3. 3択ダイアログを表示:
   - 「agentを維持」→ 削除せずにインストール続行
   - 「削除する」→ `.claude/agents/kiro/` を削除してからインストール
   - 「キャンセル」→ インストール処理を中断

**IPC追加:**
- `checkAgentFolderExists(projectPath)` - agentフォルダ存在確認
- `deleteAgentFolder(projectPath)` - agentフォルダ削除

## Dependencies
- `CommandsetInstallDialog.tsx` - ダイアログUI
- `unifiedCommandsetInstaller.ts` - 削除ロジック追加
- `handlers.ts` - IPCハンドラー追加
- `preload/index.ts` - API公開

## Testing Strategy
1. cc-sdd-agentをインストール済みのプロジェクトでcc-sddに切り替え
2. ダイアログが表示されることを確認
3. 各ボタンの動作を確認:
   - 「agentを維持」→ agentフォルダが残る
   - 「削除する」→ agentフォルダが削除される
   - 「キャンセル」→ 処理中断、変更なし
4. agentフォルダが存在しない場合はダイアログが表示されないことを確認
