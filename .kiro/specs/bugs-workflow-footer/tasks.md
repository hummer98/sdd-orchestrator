# Implementation Plan: Bugs Workflow Footer

## Tasks

- [x] 1. bugStore の useWorktree ステート削除
- [x] 1.1 (P) bugStore から useWorktree 関連の削除
  - useWorktree ステート、setUseWorktree アクション、initializeUseWorktree アクションを削除
  - BugWorkflowView からの import と使用箇所を削除
  - CreateBugDialog から useWorktree/setUseWorktree の使用を削除
  - CreateBugDialog の「Worktreeモードで作成」スイッチ UI を削除
  - CreateBugDialog.test.tsx の関連テストを更新
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. 型定義の追加
- [x] 2.1 (P) electron.d.ts に convertBugToWorktree の型定義追加
  - convertBugToWorktree 関数の型を追加（成功時: ok, value / 失敗時: ok, error）
  - エラータイプとして NOT_ON_MAIN_BRANCH, BUG_NOT_FOUND, ALREADY_WORKTREE_MODE, WORKTREE_CREATE_FAILED, BUG_JSON_UPDATE_FAILED を定義
  - value には path, absolutePath, branch, created_at を含める
  - _Requirements: 12.1, 12.2_

- [x] 2.2 (P) BugJson 型の worktree フィールド確認
  - BugJson 型に worktree フィールドが存在するか確認
  - 存在しない場合は BugWorktreeConfig を参照する optional worktree フィールドを追加
  - _Requirements: 11.1, 11.2_

- [x] 3. convertBugToWorktree IPC API の実装
- [x] 3.1 preload スクリプトへの API 追加
  - preload.ts に convertBugToWorktree を追加
  - contextBridge.exposeInMainWorld で API を公開
  - _Requirements: 5.1_

- [x] 3.2 IPC ハンドラの実装
  - convertBugToWorktree ハンドラを既存の bugWorktreeHandlers に追加
  - main ブランチチェックを実装（worktreeService.isOnMainBranch を使用）
  - main ブランチでない場合は NOT_ON_MAIN_BRANCH エラーを返す
  - worktree パスを `../{project}-worktrees/bugs/{bugName}` として生成
  - `bugfix/{bugName}` ブランチを作成
  - bug.json に worktree フィールドを追加（path, branch, created_at）
  - 成功時は ok: true と worktree 情報を返却、失敗時は ok: false とエラー情報を返却
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 4. UI コンポーネントの実装
- [x] 4.1 (P) canShowConvertButton 関数の実装
  - BugWorkflowFooter.tsx 内またはユーティリティファイルに関数を実装
  - isOnMain が false の場合は false を返す
  - bugJson が null/undefined の場合は false を返す
  - bugJson.worktree が存在する場合は false を返す
  - 全条件を満たす場合のみ true を返す
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.2 BugWorkflowFooter コンポーネントの作成
  - electron-sdd-manager/src/renderer/components/BugWorkflowFooter.tsx を作成
  - Props として isAutoExecuting, hasRunningAgents, onAutoExecution, isOnMain, bugJson, onConvertToWorktree, isConverting を受け取る
  - p-4 border-t スタイルでフッターエリアを表示
  - 自動実行ボタン: 非実行時は「自動実行」(Play アイコン)、実行時は「停止」(Square アイコン)を表示
  - 自動実行ボタンは Agent 実行中に disabled、flex-1 で横幅いっぱいに広がる
  - 「Worktreeに変更」ボタン: canShowConvertButton が true の場合のみ表示、GitBranch アイコン付き
  - 変換ボタンは変換中・Agent実行中・自動実行中に disabled、変換中は「変換中...」を表示
  - SpecWorkflowFooter と同様の視覚的デザインを維持
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. useConvertBugToWorktree フックの実装
- [x] 5.1 フックの作成
  - electron-sdd-manager/src/renderer/hooks/useConvertBugToWorktree.ts を作成
  - isOnMain, isConverting ステートを保持
  - handleConvert(bugName: string) で変換処理を実行
  - refreshMainBranchStatus() で main ブランチ状態を更新
  - 変換成功時は notify.success、失敗時は notify.error を表示
  - 変換成功後は bugStore の selectBug を呼び出して詳細をリフレッシュ
  - worktreeCheckMain IPC を使用して main ブランチ状態を取得
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4_

- [x] 6. BugWorkflowView の変更
- [x] 6.1 ヘッダーから自動実行ボタンを削除
  - 294-330行目付近の自動実行/停止ボタンを削除
  - 関連するハンドラは残す（フッターで使用）
  - _Requirements: 6.1_

- [x] 6.2 チェックボックスセクションの削除
  - 346-364行目付近の「Worktreeを使用」チェックボックスとセクションを削除
  - _Requirements: 6.2_

- [x] 6.3 fix 実行時の worktree 自動作成ロジック削除
  - handleExecutePhase から fix 実行時の createBugWorktree 呼び出しロジックを削除
  - bug.json の worktree フィールドを参照するのみの実装に変更
  - deploy ボタンの既存ロジック（worktree 存在時は bug-merge）は維持
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 6.4 BugWorkflowFooter の統合
  - useConvertBugToWorktree フックをインポートして使用
  - コンポーネント最下部に BugWorkflowFooter を追加
  - 適切な props を渡す（isAutoExecuting, hasRunningAgents, onAutoExecution, isOnMain, bugJson, onConvertToWorktree, isConverting）
  - _Requirements: 6.3, 6.4_

- [x] 7. テストの実装
- [x] 7.1 (P) canShowConvertButton 関数のユニットテスト
  - isOnMain = false の場合 false を返すことを確認
  - bugJson = null の場合 false を返すことを確認
  - bugJson.worktree が存在する場合 false を返すことを確認
  - 全条件満たす場合 true を返すことを確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.2 (P) BugWorkflowFooter コンポーネントのテスト
  - 自動実行ボタンの表示切り替え（実行中/非実行中）を確認
  - Agent 実行中の disabled 状態を確認
  - 変換ボタンの表示条件を確認
  - 変換中の disabled 状態とテキスト変更を確認
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.4, 3.6_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | BugWorkflowFooter.tsx を作成 | 4.2 | Feature |
| 1.2 | props 定義 | 4.2 | Feature |
| 1.3 | p-4 border-t スタイル | 4.2 | Feature |
| 1.4 | SpecWorkflowFooter と同様の視覚的デザイン | 4.2 | Feature |
| 2.1 | 自動実行ボタン表示（非実行時） | 4.2 | Feature |
| 2.2 | 停止ボタン表示（実行時） | 4.2 | Feature |
| 2.3 | Agent 実行中は disabled | 4.2 | Feature |
| 2.4 | onAutoExecution ハンドラ呼び出し | 4.2 | Feature |
| 2.5 | 停止クリック時のハンドラ呼び出し | 4.2 | Feature |
| 2.6 | Play/Square アイコン | 4.2 | Feature |
| 2.7 | flex-1 スタイル | 4.2 | Feature |
| 3.1 | 表示条件を満たすときのみボタン表示 | 4.2 | Feature |
| 3.2 | 表示条件の定義 | 4.2 | Feature |
| 3.3 | onConvertToWorktree ハンドラ呼び出し | 4.2 | Feature |
| 3.4 | 変換中・Agent実行中・自動実行中は disabled | 4.2 | Feature |
| 3.5 | GitBranch アイコン | 4.2 | Feature |
| 3.6 | 変換中テキスト表示 | 4.2 | Feature |
| 4.1 | canShowConvertButton 関数提供 | 4.1 | Feature |
| 4.2 | main ブランチでない場合 false | 4.1 | Feature |
| 4.3 | bugJson が null の場合 false | 4.1 | Feature |
| 4.4 | worktree フィールド存在時 false | 4.1 | Feature |
| 4.5 | 全条件満たす場合 true | 4.1 | Feature |
| 5.1 | convertBugToWorktree IPC API 提供 | 3.1, 3.2 | Feature |
| 5.2 | main ブランチ確認 | 3.2 | Feature |
| 5.3 | NOT_ON_MAIN_BRANCH エラー | 3.2 | Feature |
| 5.4 | worktree パス生成 | 3.2 | Feature |
| 5.5 | bugfix/{bugName} ブランチ作成 | 3.2 | Feature |
| 5.6 | bug.json に worktree フィールド追加 | 3.2 | Feature |
| 5.7 | 成功時 ok: true と worktree 情報返却 | 3.2 | Feature |
| 5.8 | 失敗時 ok: false とエラー情報返却 | 3.2 | Feature |
| 6.1 | ヘッダーから自動実行ボタン削除 | 6.1 | Feature |
| 6.2 | チェックボックスセクション削除 | 6.2 | Feature |
| 6.3 | BugWorkflowFooter 追加 | 6.4 | Feature |
| 6.4 | BugWorkflowFooter に props 渡し | 6.4 | Feature |
| 7.1 | handleConvertToWorktree ハンドラ追加 | 5.1 | Feature |
| 7.2 | isConverting ステート設定 | 5.1 | Feature |
| 7.3 | selectedBug null 時の早期リターン | 5.1 | Feature |
| 7.4 | convertBugToWorktree IPC 呼び出し | 5.1 | Feature |
| 7.5 | 成功メッセージ表示 | 5.1 | Feature |
| 7.6 | エラーメッセージ表示 | 5.1 | Feature |
| 7.7 | finally で isConverting を false に | 5.1 | Feature |
| 8.1 | ブランチ取得手段の提供 | 5.1 | Feature |
| 8.2 | IPC 経由でブランチ情報取得 | 5.1 | Feature |
| 8.3 | isOnMain ステート保持 | 5.1 | Feature |
| 8.4 | main/master 時 isOnMain を true に | 5.1 | Feature |
| 9.1 | useWorktree ステート削除 | 1.1 | Infrastructure |
| 9.2 | setUseWorktree アクション削除 | 1.1 | Infrastructure |
| 9.3 | BugWorkflowView から import 削除 | 1.1 | Infrastructure |
| 10.1 | fix 実行時の自動作成ロジック削除 | 6.3 | Feature |
| 10.2 | bug.json worktree フィールド参照のみ | 6.3 | Feature |
| 10.3 | deploy ボタンの既存ロジック維持 | 6.3 | Feature |
| 11.1 | BugJson 型に worktree フィールド確認 | 2.2 | Infrastructure |
| 11.2 | worktree フィールドの構造 | 2.2 | Infrastructure |
| 12.1 | electron.d.ts に型定義追加 | 2.1 | Infrastructure |
| 12.2 | 型定義の構造 | 2.1 | Infrastructure |
