# Implementation Plan

## Tasks

### 1. 共通ヘルパー関数の実装

- [x] 1.1 (P) worktreeHelpersモジュールの作成
  - EntityType型定義（'specs' | 'bugs'）を追加
  - WorktreeEntityInfo型定義（name, path, worktreeBasePath）を追加
  - _Requirements: 8.1_

- [x] 1.2 (P) getWorktreeBasePath関数の実装
  - プロジェクトパス、エンティティタイプ、名前からWorktree基底パスを算出
  - 相対パスと絶対パスの両方を返却
  - パターン: `.kiro/worktrees/{type}/{name}`
  - _Requirements: 8.1, 8.4_

- [x] 1.3 (P) getWorktreeEntityPath関数の実装
  - Worktree内のエンティティディレクトリパスを算出
  - パターン: `.kiro/worktrees/{type}/{name}/.kiro/{type}/{name}`
  - _Requirements: 8.1, 8.4_

- [x] 1.4 scanWorktreeEntities関数の実装
  - `.kiro/worktrees/{type}/`ディレクトリをスキャン
  - 各Worktreeディレクトリ内のエンティティ存在確認
  - 存在するWorktreeエンティティ情報の配列を返却
  - _Requirements: 8.1, 8.4_

### 2. WorktreeServiceの汎用API実装

- [x] 2.1 getEntityWorktreePathメソッドの実装
  - worktreeHelpersを使用してパス生成
  - 既存のgetWorktreePath実装を内部で使用
  - _Requirements: 2.1_

- [x] 2.2 createEntityWorktreeメソッドの実装
  - ブランチ命名規則の適用（specs=feature/*, bugs=bugfix/*）
  - 既存のcreateWorktree実装を汎用化
  - Worktreeディレクトリ作成、ブランチ作成、待機処理
  - _Requirements: 2.2, 2.6_

- [x] 2.3 removeEntityWorktreeメソッドの実装
  - 既存のremoveWorktree実装を汎用化
  - Worktreeディレクトリ削除、ブランチ削除
  - _Requirements: 2.3_

- [x] 2.4 既存APIのエイリアス化
  - getWorktreePathをgetEntityWorktreePath('specs', ...)に委譲
  - createWorktreeをcreateEntityWorktree('specs', ...)に委譲
  - removeWorktreeをremoveEntityWorktree('specs', ...)に委譲
  - getBugWorktreePathをgetEntityWorktreePath('bugs', ...)に委譲
  - createBugWorktreeをcreateEntityWorktree('bugs', ...)に委譲
  - removeBugWorktreeをremoveEntityWorktree('bugs', ...)に委譲
  - _Requirements: 2.4, 2.5_

### 3. BugService.readBugsのWorktree対応

- [x] 3.1 scanWorktreeEntitiesを使用したWorktree Bug読み込み
  - worktreeHelpers.scanWorktreeEntities(projectPath, 'bugs')を呼び出し
  - 各Worktree Bugディレクトリからbug.jsonを読み込み
  - _Requirements: 3.1, 3.4, 8.2, 8.3_

- [x] 3.2 メインBugとWorktree Bugのマージロジック
  - メインBug一覧とWorktree Bug一覧を取得
  - 同名Bugが存在する場合はメインBugを優先
  - _Requirements: 3.2_

- [x] 3.3 worktree情報のBugMetadataマッピング
  - bug.json.worktreeフィールドからworktree情報を抽出
  - BugMetadataにworktree情報を設定
  - _Requirements: 3.3_

### 4. BugsWatcherServiceのWorktreeパス対応

- [x] 4.1 監視パスの拡張
  - `.kiro/worktrees/bugs/`ディレクトリを監視対象に追加
  - SpecsWatcherServiceと同様のパターンで監視設定
  - _Requirements: 4.1, 4.3_

- [x] 4.2 extractBugNameのWorktreeパス対応
  - `/project/.kiro/bugs/my-bug/...` → my-bug
  - `/project/.kiro/worktrees/bugs/my-bug/.kiro/bugs/my-bug/...` → my-bug
  - 両方のパスパターンからBug名を正しく抽出
  - _Requirements: 4.2_

- [x] 4.3 Worktree Bugのディレクトリイベント対応
  - addDirイベント時にBug一覧リロード
  - unlinkDirイベント時にBug一覧リロード
  - _Requirements: 4.4, 4.5_

### 5. Bug Worktree作成フローの更新

- [x] 5.1 ディレクトリ方式でのWorktree作成
  - WorktreeService.createEntityWorktree('bugs', bugName)を呼び出し
  - `.kiro/worktrees/bugs/{bugName}`ディレクトリが作成されることを確認
  - _Requirements: 6.1_
  - _Method: createEntityWorktree_
  - _Verify: Grep "createEntityWorktree.*'bugs'" in bugWorktreeHandlers.ts_

- [x] 5.2 Worktree内のBug構造作成とファイルコピー
  - Worktree内に`.kiro/bugs/{bugName}/`構造を作成
  - メインの`.kiro/bugs/{bugName}/`からBugファイルをコピー
  - _Requirements: 6.2, 6.3_

- [x] 5.3 Worktree内bug.jsonの更新
  - worktreeフィールドを追加（path, branch, created_at）
  - メインのbug.jsonは変更しない
  - _Requirements: 6.4_

- [x] 5.4 Symlink作成（logs, runtime）
  - Specと同様のSymlink作成処理を適用
  - _Requirements: 6.5_

### 6. Bug-mergeフローの更新

- [x] 6.1 Worktreeディレクトリ削除処理
  - WorktreeService.removeEntityWorktree('bugs', bugName)を呼び出し
  - `.kiro/worktrees/bugs/{bugName}`ディレクトリが削除されることを確認
  - _Requirements: 7.1_
  - _Method: removeEntityWorktree_
  - _Verify: Grep "removeEntityWorktree.*'bugs'" in bugWorktreeHandlers.ts_

- [x] 6.2 bugfixブランチ削除とworktreeフィールドクリーンアップ
  - bugfix/{bugName}ブランチの削除
  - メインbug.jsonからworktreeフィールドを削除（存在する場合）
  - _Requirements: 7.2, 7.3_

### 7. 旧フラグ方式の削除

- [x] 7.1 (P) 旧フラグ方式判定ロジックの削除
  - `.kiro/bugs/{bug-name}/bug.json`のworktreeフィールドによるモード判定ロジックを削除
  - Worktree判定はディレクトリ構造のみで行う
  - _Requirements: 5.1_

- [x] 7.2 (P) UIコンポーネントのディレクトリ方式対応
  - BugListItem等のUIコンポーネントをディレクトリ方式に対応
  - Worktree情報の表示ロジックを更新
  - _Requirements: 5.2_

- [x] 7.3 テストの更新
  - 旧フラグ方式に依存するテストを更新または削除
  - ディレクトリ方式のテストを追加
  - _Requirements: 5.3_

### 8. FileService.readSpecsの共通ヘルパー使用

- [x] 8.1 readSpecsのリファクタリング
  - 既存のWorktreeスキャンロジックをworktreeHelpers.scanWorktreeEntitiesに置き換え
  - 既存の動作を維持しつつコードを共通化
  - _Requirements: 8.2_

### 9. 統合テストとE2Eテスト

- [x] 9.1 worktreeHelpers単体テスト
  - scanWorktreeEntities、getWorktreeBasePath、getWorktreeEntityPathのテスト
  - _Requirements: 8.1, 8.4_

- [x] 9.2 BugService.readBugs統合テスト
  - Worktree Bug読み込みのテスト
  - メインBug優先マージのテスト
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 9.3 Bug Worktree作成フロー統合テスト
  - ディレクトリ方式でのWorktree作成確認
  - Bugファイルコピー、worktreeフィールド追加の確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9.4 Bug-mergeフロー統合テスト
  - Worktreeディレクトリ削除、ブランチ削除の確認
  - worktreeフィールドクリーンアップの確認
  - _Requirements: 7.1, 7.2, 7.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Worktree Bugのディレクトリ配置 | 5.1 | Feature |
| 1.2 | bug.json.worktreeフィールド | 5.3 | Feature |
| 1.3 | メインbugsにWorktree Bug非存在 | 5.2 | Feature |
| 1.4 | worktreeフィールド設定 | 5.3 | Feature |
| 2.1 | getEntityWorktreePath提供 | 2.1 | Feature |
| 2.2 | createEntityWorktree提供 | 2.2 | Feature |
| 2.3 | removeEntityWorktree提供 | 2.3 | Feature |
| 2.4 | 既存getWorktreePathエイリアス | 2.4 | Infrastructure |
| 2.5 | 既存getBugWorktreePathエイリアス | 2.4 | Infrastructure |
| 2.6 | ブランチ命名（feature/bugfix） | 2.2 | Feature |
| 3.1 | readBugsのWorktree読み込み | 3.1 | Feature |
| 3.2 | メインBug優先マージ | 3.2 | Feature |
| 3.3 | worktree情報マッピング | 3.3 | Feature |
| 3.4 | 共通スキャンロジック使用 | 3.1 | Infrastructure |
| 4.1 | BugsWatcherのworktree監視 | 4.1 | Feature |
| 4.2 | Worktree Bug変更イベント | 4.2 | Feature |
| 4.3 | SpecsWatcherと同様のパターン | 4.1 | Infrastructure |
| 4.4 | addDirイベント対応 | 4.3 | Feature |
| 4.5 | unlinkDirイベント対応 | 4.3 | Feature |
| 5.1 | 旧フラグ方式ロジック削除 | 7.1 | Infrastructure |
| 5.2 | UIコンポーネント更新 | 7.2 | Feature |
| 5.3 | テスト更新 | 7.3 | Infrastructure |
| 6.1 | bug-fix時のWorktreeディレクトリ作成 | 5.1 | Feature |
| 6.2 | Worktree内の.kiro/bugs構造作成 | 5.2 | Feature |
| 6.3 | Bugファイルのコピー | 5.2 | Feature |
| 6.4 | bug.json.worktreeフィールド追加 | 5.3 | Feature |
| 6.5 | Symlink作成（logs, runtime） | 5.4 | Feature |
| 7.1 | bug-merge時のディレクトリ削除 | 6.1 | Feature |
| 7.2 | bugfixブランチ削除 | 6.2 | Feature |
| 7.3 | worktreeフィールド削除 | 6.2 | Feature |
| 8.1 | scanWorktreeEntities提供 | 1.1, 1.4 | Infrastructure |
| 8.2 | FileService.readSpecsでの使用 | 8.1 | Infrastructure |
| 8.3 | BugService.readBugsでの使用 | 3.1 | Feature |
| 8.4 | スキャンパターン定義 | 1.2, 1.3, 1.4 | Infrastructure |

### Coverage Validation Checklist

- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
