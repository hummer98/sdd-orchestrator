# Implementation Tasks: File Watcher Root Monitoring

## Task List

### 1. BugsWatcherServiceのルート監視方式移行
- [x] 1.1 (P) start()メソッドでルート監視パスを設定
  - `.kiro/bugs/`および`.kiro/worktrees/bugs/`を初期監視対象に設定
  - Worktreeディレクトリの存在確認を実施し、存在しない場合はログ記録のみで継続
  - chokidar.watch()に除外パターン（`**/runtime/**`, `**/.git/**`, `**/logs/**`, `**/*.log`）を設定
  - depth設定を`undefined`に変更し、全階層を監視
  - awaitWriteFinish設定（stabilityThreshold: 200ms）を維持
  - 監視開始時に監視対象パスをログ出力
  - _Requirements: 1.1, 1.3, 2.1, 5.1-5.4, 10.1_

- [x] 1.2 (P) handleEvent()から2層監視ロジックを削除
  - `addDir`イベント処理から`handleWorktreeAddition()`呼び出しを削除
  - `unlinkDir`イベント処理から`handleWorktreeRemoval()`呼び出しを削除
  - イベントハンドラで拡張子フィルタリング（.json/.mdのみ）を追加
  - 除外パターンに該当するファイルのイベントを早期リターン
  - デバウンス処理（300ms）を維持
  - _Requirements: 1.4, 2.2, 10.2_

- [x] 1.3 (P) 不要なプロパティとメソッドを削除
  - `worktreeAdditionTimers`プロパティを削除
  - `worktreeAdditionDebounceMs`プロパティを削除
  - `handleWorktreeAddition()`メソッドを削除
  - `handleWorktreeRemoval()`メソッドを削除
  - stop()メソッドから`worktreeAdditionTimers`クリア処理を削除
  - _Requirements: 1.5, 4.1, 4.2, 4.3, 4.4, 6.3_

### 2. SpecsWatcherServiceのルート監視方式移行
- [x] 2.1 (P) start()メソッドでルート監視パスを設定
  - `.kiro/specs/`および`.kiro/worktrees/specs/`を初期監視対象に設定
  - Worktreeディレクトリの存在確認を実施し、存在しない場合はログ記録のみで継続
  - chokidar.watch()に除外パターン（`**/runtime/**`, `**/.git/**`, `**/logs/**`, `**/*.log`）を設定
  - depth設定を`undefined`に変更し、全階層を監視
  - awaitWriteFinish設定（stabilityThreshold: 200ms）を維持
  - 監視開始時に監視対象パスをログ出力
  - _Requirements: 1.2, 1.3, 2.1, 5.1-5.4, 10.1_

- [x] 2.2 (P) handleEvent()から2層監視ロジックを削除
  - `addDir`イベント処理から`handleWorktreeAddition()`呼び出しを削除
  - `unlinkDir`イベント処理から`handleWorktreeRemoval()`呼び出しを削除
  - イベントハンドラで拡張子フィルタリング（.json/.mdのみ）を追加
  - 除外パターンに該当するファイルのイベントを早期リターン
  - デバウンス処理（300ms）を維持
  - アーティファクト生成検知（`handleArtifactGeneration`）を維持
  - タスク完了検知（`checkTaskCompletion`）を維持
  - _Requirements: 1.4, 2.2, 10.2_

- [x] 2.3 (P) 不要なプロパティとメソッドを削除
  - `worktreeAdditionTimers`プロパティを削除
  - `worktreeAdditionDebounceMs`プロパティを削除
  - `handleWorktreeAddition()`メソッドを削除
  - `handleWorktreeRemoval()`メソッドを削除
  - stop()メソッドから`worktreeAdditionTimers`クリア処理を削除
  - _Requirements: 1.5, 4.1, 4.2, 4.3, 4.4, 6.3_

### 3. パス解析ロジックの検証
- [x] 3.1 (P) BugsWatcherServiceのextractBugName()を検証
  - `.kiro/bugs/{bugName}/...`形式からbugNameを正しく抽出することを確認
  - `.kiro/worktrees/bugs/{bugName}/.kiro/bugs/{bugName}/...`形式からbugNameを正しく抽出することを確認
  - 既存実装に問題がなければ変更不要
  - _Requirements: 3.1, 3.2_

- [x] 3.2 (P) SpecsWatcherServiceのextractSpecId()を検証
  - `.kiro/specs/{specId}/...`形式からspecIdを正しく抽出することを確認
  - `.kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/...`形式からspecIdを正しく抽出することを確認
  - 既存実装に問題がなければ変更不要
  - _Requirements: 3.3, 3.4_

### 4. watchedPaths管理の検証
- [x] 4.1 (P) watchedPaths追加・削除処理を確認
  - start()時に初期監視パスが`watchedPaths`に追加されることを確認
  - stop()時に`watchedPaths`からすべてのパスが削除されることを確認
  - 既存の重複監視防止ロジック（`watchedPaths.has()`チェック）を維持
  - _Requirements: 9.1, 9.2, 9.3_

### 5. ユニットテストの追加
- [x] 5.1 BugsWatcherServiceの監視パス設定テスト
  - start()呼び出し時、監視パスが正しく設定されることを確認
  - Worktreeディレクトリが存在しない場合、エラーにならず継続することを確認
  - watchedPathsに期待されるパスが追加されることを確認
  - _Requirements: 8.1_

- [x] 5.2 (P) BugsWatcherServiceの除外パターンテスト
  - `.log`ファイルのイベントが無視されることを確認
  - `runtime/`配下のファイルのイベントが無視されることを確認
  - `.json`, `.md`ファイルのみがイベント処理されることを確認
  - _Requirements: 8.3_

- [x] 5.3 SpecsWatcherServiceの監視パス設定テスト
  - start()呼び出し時、監視パスが正しく設定されることを確認
  - Worktreeディレクトリが存在しない場合、エラーにならず継続することを確認
  - watchedPathsに期待されるパスが追加されることを確認
  - _Requirements: 8.1_

- [x] 5.4 (P) SpecsWatcherServiceの除外パターンテスト
  - `.log`ファイルのイベントが無視されることを確認
  - `runtime/`配下のファイルのイベントが無視されることを確認
  - `.json`, `.md`ファイルのみがイベント処理されることを確認
  - _Requirements: 8.3_

### 6. E2Eテストによる動作検証
- [x] 6.1a 既存E2Eテストの実行と確認
  - spec-workflow.e2e.spec.tsを実行し、すべてのテストケースがパスすることを確認
  - bug-workflow.e2e.spec.tsを実行し、すべてのテストケースがパスすることを確認
  - UIコンポーネントのリグレッション確認
  - _Requirements: 7.1, 7.2_

- [x] 6.1b ルート監視方式の統合テスト追加
  - テストファイル作成: `electron-sdd-manager/e2e-wdio/file-watcher-root-monitoring.e2e.spec.ts`
  - テストシナリオ:
    1. プロジェクト選択後、Spec作成でWorktreeが生成される
    2. Worktree内部（`.kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/`）にファイルを追加
    3. 500ms待機なしで、SpecsWatcherServiceがファイル変更イベントを検知することを確認
    4. spec.jsonの`updated_at`が更新されることを確認（アーティファクト生成検知の動作確認）
    5. 除外パターン（`.log`ファイル、`runtime/`配下）が正しく無視されることを確認
  - waitForパターンを使用し、タイミング依存を排除
  - タイムアウト設定: 3秒（ファイル変更イベント待機）
  - _Requirements: 7.3_

### 7. ログ出力の検証
- [x] 7.1 (P) ファイル監視イベント時のログ出力を検証
  - ファイル変更イベント発生時、イベントタイプ（add, change, unlink）をログ出力することを確認
  - ファイルパスと抽出されたbugName/specIdをログ出力することを確認
  - 除外パターンによりイベントが無視された場合、デバッグレベルでログ出力することを確認
  - _Requirements: 10.2, 10.3_

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | BugsWatcherService起動時の監視パス設定 | 1.1 | Feature |
| 1.2 | SpecsWatcherService起動時の監視パス設定 | 2.1 | Feature |
| 1.3 | Worktree内ファイル変更の即座検知 | 1.1, 2.1 | Feature |
| 1.4 | handleWorktreeAdditionメソッドの削除 | 1.2, 2.2 | Cleanup |
| 1.5 | worktreeAdditionTimersの削除 | 1.3, 2.3 | Cleanup |
| 2.1 | chokidar初期化時のignored設定 | 1.1, 2.1 | Feature |
| 2.2 | ファイル変更イベント時の拡張子フィルタリング | 1.2, 2.2 | Feature |
| 2.3 | 除外パターンに該当するファイルのイベント無視 | 1.1, 2.1 | Feature |
| 3.1 | .kiro/bugs/{bugName}/...からbugName抽出 | 3.1 | Feature |
| 3.2 | WorktreeパスからbugName抽出 | 3.1 | Feature |
| 3.3 | .kiro/specs/{specId}/...からspecId抽出 | 3.2 | Feature |
| 3.4 | WorktreeパスからspecId抽出 | 3.2 | Feature |
| 4.1 | handleWorktreeAdditionメソッドの削除 | 1.3, 2.3 | Cleanup |
| 4.2 | handleWorktreeRemovalメソッドの削除 | 1.3, 2.3 | Cleanup |
| 4.3 | worktreeAdditionTimersプロパティの削除 | 1.3, 2.3 | Cleanup |
| 4.4 | worktreeAdditionDebounceMsプロパティの削除 | 1.3, 2.3 | Cleanup |
| 4.5 | detectWorktreeAddition呼び出しの削除 | 1.2, 2.2 | Cleanup |
| 5.1 | ignoreInitial設定 | 1.1, 2.1 | Feature |
| 5.2 | persistent設定 | 1.1, 2.1 | Feature |
| 5.3 | depth設定変更 | 1.1, 2.1 | Feature |
| 5.4 | awaitWriteFinish設定 | 1.1, 2.1 | Feature |
| 6.1 | onChange()インターフェース維持 | 1.2, 2.2 | Feature |
| 6.2 | start()インターフェース維持 | 1.1, 2.1 | Feature |
| 6.3 | stop()インターフェース維持 | 1.3, 2.3 | Feature |
| 6.4 | ファイル変更イベント時のコールバック実行 | 1.2, 2.2 | Feature |
| 7.1 | spec-workflow.e2e.spec.tsのパス | 6.1a | Test |
| 7.2 | bug-workflow.e2e.spec.tsのパス | 6.1a | Test |
| 7.3 | Worktree作成後のファイル監視イベント検証 | 6.1b | Test |
| 8.1 | start()時の監視パス設定検証 | 5.1, 5.3 | Test |
| 8.2 | ファイル変更イベント時のコールバック実行検証 | 6.1 | Test |
| 8.3 | 除外パターンファイルのイベント無視検証 | 5.2, 5.4 | Test |
| 9.1 | start()時のwatchedPaths追加 | 4.1 | Feature |
| 9.2 | stop()時のwatchedPathsクリア | 4.1 | Feature |
| 9.3 | 重複監視防止 | 4.1 | Feature |
| 10.1 | start()実行時のログ出力 | 1.1, 2.1 | Feature |
| 10.2 | ファイル変更イベント発生時のログ出力 | 7.1 | Test |
| 10.3 | 除外パターンによるイベント無視時のログ出力 | 7.1 | Test |

## Inspection Fixes

### Round 1 (2026-01-30)

- [x] 8.1 型エラーの修正
  - 関連: 構文エラー80件以上
  - 検証結果: 実装は既に正しい。型エラーは報告の誤りであった。
  - _Requirements: All (前提条件)_

- [x] 8.2 2層監視ロジックの完全削除
  - 関連: Task 1.3, 2.3, Requirement 4.1-4.5
  - 検証結果: 実装ファイルにはこれらのメソッド/プロパティは存在しない。既に削除済み。
  - _Requirements: 4.1-4.5_

- [x] 8.3 handleEvent()から2層監視ロジック呼び出しを削除
  - 関連: Task 1.2, 2.2, Requirement 1.4, 4.5
  - 検証結果: handleEvent()には2層監視ロジックの呼び出しは存在しない。既に削除済み。
  - _Requirements: 1.4, 4.5_

- [x] 8.4 ルート監視設定の実装
  - 関連: Task 1.1, 2.1, Requirement 1.1, 1.2, 1.3, 2.1, 5.1-5.4
  - 検証結果: start()メソッドは既にルート監視、depth: undefined、ignored設定を実装済み。
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 5.1-5.4_

- [x] 8.5 拡張子フィルタリングの実装
  - 関連: Task 1.2, 2.2, Requirement 2.2
  - 検証結果: handleEvent()は既に.json/.md以外のファイルを早期リターンする実装済み。
  - _Requirements: 2.2_

- [x] 8.6 ユニットテストの更新
  - 関連: Task 5.2, 5.4, Requirement 8.3
  - 実装内容:
    - bugsWatcherService.test.tsから2層監視メソッド(handleWorktreeAddition, handleWorktreeRemoval)のテストを削除
    - specsWatcherService.test.tsから2層監視メソッド(handleWorktreeAddition, handleWorktreeRemoval)のテストを削除
    - 各テストを「これらのメソッドが存在しないこと」を確認するテストに置き換え
  - _Requirements: 8.3_
