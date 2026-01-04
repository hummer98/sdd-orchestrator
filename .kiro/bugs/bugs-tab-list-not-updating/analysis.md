# Bug Analysis: bugs-tab-list-not-updating

## Summary
bugsタブから新規バグレポートを作成・完了しても、bugsタブの一覧が自動更新されない。これはbugsフォルダのファイル監視（chokidar）が、**ディレクトリが存在しない状態で起動した場合に後から作成されたディレクトリを検出できない**ことが原因。

## Root Cause

### Technical Details
- **Location**: [bugsWatcherService.ts:56](electron-sdd-manager/src/main/services/bugsWatcherService.ts#L56)
- **Component**: BugsWatcherService（Main Process）
- **Trigger**: プロジェクト選択時に `.kiro/bugs/` ディレクトリが存在しない場合

### 問題のコード
```typescript
// bugsWatcherService.ts:56
this.watcher = chokidar.watch(bugsDir, {
  ignoreInitial: true,
  persistent: true,
  depth: 2,
  // ...
});
```

### 根本原因の詳細
1. **chokidarの動作**: chokidarは監視対象パス（`.kiro/bugs/`）が**存在しない場合**でもエラーを発生させずに監視を開始する
2. **ディレクトリ作成の検出不可**: しかし、親ディレクトリ（`.kiro/`）を監視していないため、後から `.kiro/bugs/` ディレクトリが作成されてもイベントを受け取れない
3. **新規バグ作成フロー**: バグ新規作成時にClaudeエージェントが `.kiro/bugs/{bug-name}/` ディレクトリを作成しても、watcherはそれを検出できない

### イベントフローの問題点
```
1. プロジェクト選択時
   └─ startBugsWatcher() が呼ばれる (handlers.ts:1629)
      └─ BugsWatcherService.start() が実行される
         └─ chokidar.watch('.kiro/bugs') ← ディレクトリが存在しなくても開始
            └─ "ready" イベントは発火するが、ディレクトリ作成は検出されない

2. バグ新規作成時
   └─ Claudeエージェントが .kiro/bugs/{bug-name}/report.md を作成
      └─ watcherはディレクトリ作成を検出できない（親ディレクトリを監視していないため）
         └─ IPC_CHANNELS.BUGS_CHANGED イベントが発火しない
            └─ レンダラー側のrefreshBugs()が呼ばれない
```

## Impact Assessment
- **Severity**: Medium
- **Scope**: 新規プロジェクト、または初めてバグを作成するプロジェクトで発生
- **Risk**: 既存の `.kiro/bugs/` ディレクトリがあるプロジェクトでは問題なし

## Related Code
```typescript
// CreateBugDialog.tsx:65 - 現在のワークアラウンド
// 2秒後に手動でrefreshBugs()を呼び出している
setTimeout(() => refreshBugs(), 2000);
```

このワークアラウンドも問題がある:
- 2秒では不十分な場合がある（エージェント実行に時間がかかる場合）
- エージェント完了を待たずに固定時間で更新している

## Proposed Solution

### Option 1: 親ディレクトリ監視方式（推奨）
- `.kiro/` ディレクトリを監視し、`bugs` サブディレクトリの作成を検出
- 作成を検出したら `.kiro/bugs/` の監視を開始
- Pros: リアルタイム検出が可能
- Cons: 監視ロジックが複雑になる

### Option 2: ディレクトリ存在確認＋作成方式
- watcher開始前に `.kiro/bugs/` ディレクトリを確認し、存在しなければ作成
- Pros: シンプルな実装
- Cons: 副作用（空ディレクトリが作成される）

### Option 3: エージェント完了時の明示的リフレッシュ
- バグ作成エージェント完了時に明示的に `refreshBugs()` を呼び出す
- Pros: 確実なタイミングで更新
- Cons: ファイル監視と二重管理になる

### Recommended Approach
**Option 1** を採用：

1. BugsWatcherServiceを拡張し、`.kiro/` ディレクトリを監視するモードを追加
2. `addDir` イベントで `bugs` ディレクトリの作成を検出
3. 検出時に `.kiro/bugs/` の監視を開始（再帰的監視に切り替え）

または、より簡易的なアプローチとして:
- chokidarの設定を変更して `.kiro/bugs/**` ではなく `.kiro/**` を監視し、パスフィルタリングで bugs 配下のみを処理する

## Dependencies
- chokidar（ファイル監視ライブラリ）
- Main Process: handlers.ts, bugsWatcherService.ts
- Renderer Process: bugStore.ts, CreateBugDialog.tsx

## Testing Strategy
1. **Unit Test**: BugsWatcherServiceのディレクトリ作成検出テストを追加
2. **Integration Test**: `.kiro/bugs/` が存在しない状態からの新規バグ作成テスト
3. **E2E Test**: 新規プロジェクトでのバグ作成→一覧更新確認
