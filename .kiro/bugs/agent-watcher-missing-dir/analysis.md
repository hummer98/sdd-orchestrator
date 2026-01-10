# Bug Analysis: agent-watcher-missing-dir

## Summary
`AgentRecordWatcherService` が `.kiro/runtime/agents/` ディレクトリが存在しない状態で監視を開始すると、ディレクトリ作成後もファイル変更を検知できない。

## Root Cause

### Technical Details
- **Location**: [agentRecordWatcherService.ts:77-88](electron-sdd-manager/src/main/services/agentRecordWatcherService.ts#L77-L88)
- **Component**: `AgentRecordWatcherService.start()`
- **Trigger**: プロジェクト選択時に `.kiro/runtime/agents/` ディレクトリが存在しない場合

### 詳細説明
`AgentRecordWatcherService.start()` は `.kiro/runtime/agents/` ディレクトリを直接監視しようとする：

```typescript
// Line 77-88 in agentRecordWatcherService.ts
start(): void {
  const agentsDir = path.join(this.projectPath, '.kiro', 'runtime', 'agents');
  logger.info('[AgentRecordWatcherService] Starting watcher', { agentsDir });

  this.watcher = chokidar.watch(agentsDir, {
    ignoreInitial: false,
    persistent: true,
    depth: 2,
    // ...
  });
}
```

**問題点**: `chokidar` はデフォルトで存在しないパスを監視できるが、その親ディレクトリも存在しない場合（`.kiro/runtime/` 自体が存在しない）、監視が正しく機能しない可能性がある。

**対照的に正しく動作している例**: `BugsWatcherService` は同様の問題を解決済み：

```typescript
// Line 74-79 in bugsWatcherService.ts
start(): void {
  // Watch .kiro/ directory to detect bugs/ creation even if it doesn't exist
  const kiroDir = path.join(this.projectPath, '.kiro');
  const bugsDir = path.join(kiroDir, 'bugs');

  this.watcher = chokidar.watch(kiroDir, {
    // ...
    // フィルタリングで bugs/ 配下のみ処理
  });
}
```

### イベントフロー
1. Electronアプリ起動 → プロジェクト選択
2. `AgentRecordWatcherService.start()` が呼ばれる
3. `.kiro/runtime/agents/` が存在しない → chokidar が監視開始するが不完全
4. SDD Agent起動 → `AgentRecordService.writeRecord()` がディレクトリを作成
5. エージェントレコードファイルが作成されるが、Watcherが検知できない
6. UIが更新されない

### 追加調査: `.kiro/runtime/` 自体の問題
`.kiro/runtime/` ディレクトリも存在しない可能性がある：
- **作成箇所**: `AgentRecordService.writeRecord()` の `fs.mkdir(dirPath, { recursive: true })` で遅延作成
- **テストのみで明示的作成**: `specManagerService.specManager.test.ts:49`
- **本番コードでの事前作成なし**: Watcher起動時に親ディレクトリ `.kiro/runtime/` が存在しない場合、`chokidar` の監視がさらに不安定になる

### 比較: 各Watcherサービスの実装状況
| サービス | 監視対象 | 存在保証 | 対策 |
|---------|---------|---------|------|
| `SpecsWatcherService` | `.kiro/specs/` | ✅ 通常存在 | なし |
| `BugsWatcherService` | `.kiro/` → `bugs/` フィルタ | ✅ `.kiro/` は存在 | 親監視+フィルタ |
| `AgentRecordWatcherService` | `.kiro/runtime/agents/` | ❌ 遅延作成 | **なし（バグ）** |

## Impact Assessment
- **Severity**: Medium
- **Scope**: 新規プロジェクト、または `.kiro/runtime/agents/` が削除された既存プロジェクトで影響
- **Risk**: エージェントの状態変更がUIに反映されない（UX問題）

## Related Code

### 監視対象ディレクトリの作成タイミング
`AgentRecordService.writeRecord()` でディレクトリが作成される（遅延作成）：

```typescript
// Line 46-55 in agentRecordService.ts
async writeRecord(record: AgentRecord): Promise<void> {
  const dirPath = path.join(this.basePath, record.specId);

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });  // ここで作成

  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
}
```

### Watcher起動タイミング
- [handlers.ts:2130](electron-sdd-manager/src/main/ipc/handlers.ts#L2130) - プロジェクト選択時
- [windowManager.ts:419](electron-sdd-manager/src/main/services/windowManager.ts#L419) - ウィンドウサービス初期化時

## Proposed Solution

### Option 1: Watcher起動前にディレクトリを作成（推奨）
- Description: `start()` 内で `fs.mkdirSync(agentsDir, { recursive: true })` を呼ぶ
- Pros:
  - 最小限の変更（2-3行追加）
  - 既存のロジックをほぼ維持
  - `projectLogger.ts` で同様のパターンが使用されている（実績あり）
  - `.kiro/runtime` は既に `.gitignore` に含まれているためコミット問題なし
- Cons:
  - ディレクトリが削除された場合、次回起動まで検知できない（稀なケース）

### Option 2: BugsWatcherService パターンの適用
- Description: `.kiro/` を監視し、`ignored` オプションで `runtime/agents/` 配下のみ処理
- Pros:
  - ディレクトリ作成タイミングに完全に依存しない
  - ディレクトリの動的作成・削除に対応可能
- Cons:
  - depth 設定の調整が必要（4階層: `.kiro/` → `runtime/` → `agents/` → `{specId}/` → `*.json`）
  - フィルタリングロジックの追加（複雑性増加）
  - オーバーエンジニアリングの可能性

### Recommended Approach
**Option 1** を推奨。シンプルで効果的：
1. 最小限の変更で問題を解決
2. `projectLogger.ts` と同じパターン（コードベースの一貫性）
3. `.gitignore` 対応済みでコミット問題なし
4. KISS原則に従う

## Dependencies
- `agentRecordWatcherService.ts` の修正
- 既存のテストがあれば更新（存在しないディレクトリでの動作テスト追加）

## Testing Strategy
1. **単体テスト**: `.kiro/runtime/agents/` が存在しない状態でWatcher起動
2. **E2Eテスト**: 新規プロジェクトでエージェント実行 → UIにエージェント状態が表示されることを確認
3. **回帰テスト**: 既存のエージェント監視機能が正常に動作することを確認
