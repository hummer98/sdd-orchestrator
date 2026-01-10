# Bug Analysis: bugs-folder-creation

## Summary
コマンドセットインストール時に `.kiro/bugs` ディレクトリが作成されておらず、bugsWatcherServiceの初回監視でディレクトリ不在による問題が発生する可能性がある。

## Root Cause
**`ensureProjectDirectories` メソッドに `.kiro/bugs` ディレクトリが含まれていない**

### Technical Details
- **Location**: [unifiedCommandsetInstaller.ts:446-460](electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts#L446-L460)
- **Component**: `UnifiedCommandsetInstaller.ensureProjectDirectories()`
- **Trigger**: プロファイルによるコマンドセットインストール時

### 現状のコード（問題箇所）
```typescript
private async ensureProjectDirectories(projectPath: string): Promise<void> {
  const requiredDirs = [
    path.join(projectPath, '.kiro', 'steering'),
    path.join(projectPath, '.kiro', 'specs'),
    // .kiro/bugs が含まれていない
  ];
  // ...
}
```

### 関連する監視サービスの一貫性問題

| サービス | ディレクトリ作成 | 監視方法 |
|---------|-----------------|---------|
| `specsWatcherService` | なし（`ensureProjectDirectories`で作成） | 直接監視 |
| `bugsWatcherService` | なし | 親ディレクトリ監視（動的検出対応済み） |
| `agentRecordWatcherService` | **自己作成**（82-88行） | 直接監視 |

`agentRecordWatcherService`は既にstart()内でディレクトリを作成する修正が適用されている（Bug fix: agent-watcher-missing-dir）が、他のサービスとの一貫性がない。

## Impact Assessment
- **Severity**: Medium
- **Scope**: 新規プロジェクトでバグワークフローを使用する際に影響
- **Risk**:
  - バグフォルダが存在しない状態でUIがバグリストを表示しようとすると空になる
  - 最初のバグ作成時まで監視が正しく機能しない可能性

## Related Code

### 1. unifiedCommandsetInstaller.ts（修正対象）
```typescript
// Line 446-460
private async ensureProjectDirectories(projectPath: string): Promise<void> {
  const requiredDirs = [
    path.join(projectPath, '.kiro', 'steering'),
    path.join(projectPath, '.kiro', 'specs'),
  ];
  // bugs ディレクトリが欠落
}
```

### 2. agentRecordWatcherService.ts（参考：既存の修正パターン）
```typescript
// Line 82-88 - Bug fix: agent-watcher-missing-dir
if (!fs.existsSync(agentsDir)) {
  fs.mkdirSync(agentsDir, { recursive: true });
  logger.info('[AgentRecordWatcherService] Created agents directory', { agentsDir });
}
```

### 3. bugsWatcherService.ts（現状：親ディレクトリ監視で対応）
```typescript
// Line 74-100 - 親ディレクトリ.kiro/を監視してbugs/作成を検出
const kiroDir = path.join(this.projectPath, '.kiro');
this.watcher = chokidar.watch(kiroDir, { /* ... */ });
```

## Proposed Solution

### Option 1: ensureProjectDirectories に bugs を追加（推奨）
- Description: `unifiedCommandsetInstaller.ts`の`ensureProjectDirectories`メソッドに`.kiro/bugs`を追加
- Pros:
  - シンプルで影響範囲が小さい
  - 他のディレクトリ作成と一貫性がある
  - インストール時に確実にディレクトリが作成される
- Cons: なし

### Option 2: bugsWatcherService に自己作成ロジックを追加
- Description: `agentRecordWatcherService`と同様にstart()内でディレクトリを作成
- Pros:
  - 監視サービスが自律的にディレクトリを管理
- Cons:
  - bugsWatcherServiceは既に親ディレクトリ監視で対応しているため冗長
  - インストーラーとの責務分離が曖昧になる

### Recommended Approach
**Option 1**を採用。修正は1行追加のみで完了。

```typescript
const requiredDirs = [
  path.join(projectPath, '.kiro', 'steering'),
  path.join(projectPath, '.kiro', 'specs'),
  path.join(projectPath, '.kiro', 'bugs'),  // 追加
];
```

## Dependencies
- `electron-sdd-manager/src/main/services/unifiedCommandsetInstaller.ts`
- 関連テスト: `unifiedCommandsetInstaller.test.ts`（ディレクトリ作成の検証を追加する必要がある可能性）

## Testing Strategy
1. **単体テスト**: `ensureProjectDirectories`が`.kiro/bugs`を作成することを検証
2. **統合テスト**: プロファイルインストール後に`.kiro/bugs`ディレクトリが存在することを確認
3. **E2Eテスト**: 新規プロジェクトでバグワークフローが正常に動作することを確認
