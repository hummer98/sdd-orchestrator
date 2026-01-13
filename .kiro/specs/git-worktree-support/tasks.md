# Implementation Plan

## Task 1. WorktreeConfig型定義の追加
- [x] 1.1 (P) SpecJson型にWorktreeConfigフィールドを追加
  - worktreeフィールドの型定義（path, branch, created_at）
  - オプショナルフィールドとして既存SpecJson型を拡張
  - 後方互換性を維持（フィールド未定義時は通常モード）
  - _Requirements: 2.1, 2.2, 2.3_

## Task 2. WorktreeServiceの実装
- [x] 2.1 git worktree操作のサービス基盤を実装
  - child_process.execでgitコマンドを実行する共通パターン
  - Result型によるエラーハンドリング
  - WorktreeError型の定義（NOT_ON_MAIN_BRANCH, WORKTREE_EXISTS等）
  - _Requirements: 1.6_
- [x] 2.2 mainブランチ確認機能を実装
  - git branch --show-currentで現在のブランチを取得
  - main/masterブランチかどうかを判定
  - _Requirements: 1.1, 1.2_
- [x] 2.3 worktree作成機能を実装
  - git branchでfeature/{feature-name}ブランチを作成
  - git worktree addでworktreeを作成
  - gitデフォルトの場所（親ディレクトリ）にworktreeを配置
  - 相対パスでWorktreeInfoを返却
  - _Requirements: 1.3, 1.4, 1.7_
- [x] 2.4 worktree削除機能を実装
  - git worktree removeでworktreeを削除
  - git branch -dでブランチを削除
  - _Requirements: 7.6, 7.7_
- [x] 2.5 パス解決・存在確認機能を実装
  - 相対パスから絶対パスへの変換
  - worktree存在確認
  - 監視パス取得のためのgetWatchPathメソッド
  - _Requirements: 8.1, 8.2_

## Task 3. IPC Handlersの拡張
- [x] 3.1 worktree関連IPCチャンネルを追加
  - worktree:check-main チャンネルの実装
  - worktree:create チャンネルの実装
  - worktree:remove チャンネルの実装
  - worktree:resolve-path チャンネルの実装
  - preloadスクリプトへのAPI追加
  - _Requirements: 1.1, 1.3, 1.6_

## Task 4. impl開始時のworktree自動作成
- [x] 4.1 SpecManagerServiceのimpl開始処理を拡張
  - mainブランチ確認の追加
  - mainブランチでない場合のエラーハンドリング
  - worktree作成処理の呼び出し
  - spec.jsonへのworktreeフィールド追加
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
- [x] 4.2 worktreeモード時のAgent cwd設定
  - spec.jsonのworktreeフィールドを参照
  - worktree.pathを絶対パスに変換してcwdに設定
  - 複数Agent起動時も同一worktreeパスを使用
  - _Requirements: 3.1, 3.2_

## Task 5. Agent一覧でのworktree識別表示
- [x] 5.1 (P) AgentListPanelにworktree識別インジケーターを追加
  - Agentのcwdがworktreeパスにマッチするかを判定
  - worktreeモードのAgentに視覚的インジケーターを表示
  - ツールチップでworktreeパスを表示
  - _Requirements: 4.1, 4.2_

## Task 6. Deployボタンの条件分岐
- [x] 6.1 (P) WorkflowViewのDeployボタン動作を分岐
  - spec.jsonのworktreeフィールド有無を判定
  - worktreeなし: 既存の/commit実行
  - worktreeあり: /kiro:spec-merge {feature-name}実行
  - _Requirements: 5.1, 5.2_

## Task 7. 監視パスの切り替え
- [x] 7.1 SpecsWatcherServiceの監視パス動的切り替え
  - worktreeフィールド存在時はworktreeパスを監視
  - worktreeフィールド未存在時はmainプロジェクトパスを監視
  - spec.json変更時の監視パス再設定
  - _Requirements: 8.1, 8.2_

## Task 8. spec-mergeスキルの実装
- [x] 8.1 spec-mergeスキルファイルを作成
  - スキル定義ファイルの作成
  - allowed-tools設定（Bash, Read, Write, Edit, Glob）
  - spec.jsonからworktree情報を読み取る
  - _Requirements: 7.1, 7.2_
- [x] 8.2 マージ処理を実装
  - pwdがmainブランチのプロジェクトであることを確認
  - git merge --squashでworktreeブランチをマージ
  - git commitでマージコミット作成
  - _Requirements: 7.3_
- [x] 8.3 コンフリクト解決処理を実装
  - gitマージでコンフリクト発生時にAI自動解決を試行
  - コンフリクトファイルの検出と解析
  - 最大7回までリトライ
  - 解決失敗時はユーザーに報告して中断
  - _Requirements: 7.4, 7.5_
- [x] 8.4 クリーンアップ処理を実装
  - git worktree removeでworktreeディレクトリを削除
  - git branch -dでfeatureブランチを削除
  - spec.jsonからworktreeフィールドを削除
  - 完了メッセージの表示
  - _Requirements: 7.6, 7.7, 7.8_

## Task 9. 自動実行フローへのinspection連携
- [x] 9.1 impl完了後のinspection自動実行
  - impl完了検出後にinspectionを自動開始
  - worktree内でinspection実行
  - inspection失敗時のAI Agentによる修正とリトライ
  - 最大7回試行後にユーザー報告
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
- [x] 9.2 inspection成功後のspec-merge自動実行
  - inspection成功を検出
  - spec-mergeを自動実行
  - _Requirements: 6.5_

## Task 10. 統合テストの実装
- [x] 10.1 worktree作成・削除のユニットテスト
  - WorktreeServiceの各メソッドのモックテスト
  - エラーケースのテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
- [x] 10.2 E2Eテストの追加
  - impl開始からworktree作成までのフロー
  - spec-merge実行からworktree削除までのフロー
  - Agent一覧でのworktree識別表示
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 7.1, 7.2, 7.3, 7.6, 7.7, 7.8_

## Task 11. Spec一覧でのworktree状態表示
- [x] 11.1 (P) SpecListItemにworktreeバッジを追加
  - spec.jsonのworktreeフィールド有無を判定
  - worktreeモード時にGitBranchアイコン+「worktree」バッジを表示
  - ホバー時にworktreeパスとブランチ名をツールチップ表示
  - _Requirements: 4.1, 4.2_
- [x] 11.2 SpecListItemコンポーネントにworktree propsを追加
  - SpecListItemPropsにworktree?: WorktreeConfigを追加
  - 親コンポーネント（SpecList）からworktree情報を受け渡し
  - _Requirements: 4.1_

## Task 12. Spec詳細画面でのworktree情報表示
- [x] 12.1 (P) SpecDetailにworktree情報セクションを追加
  - worktreeフィールド存在時のみ表示
  - 表示項目: パス、ブランチ名、作成日時
  - GitBranchアイコンを使用した視覚的な識別
  - _Requirements: 4.1, 4.2_
- [x] 12.2 worktree情報のフォーマット処理
  - 相対パスと絶対パスの両方を表示
  - 作成日時を人間が読みやすい形式に変換
  - _Requirements: 4.2_

## Task 13. Remote UIでのworktree表示
- [x] 13.1 (P) SpecsView（Remote UI）にworktreeバッジを追加
  - specJsonMapからworktree情報を取得
  - Spec一覧にworktreeモードバッジを表示
  - _Requirements: 4.1_
- [x] 13.2 SpecDetailView（Remote UI）にworktree情報を追加
  - Electronレンダラー版と同等のworktree情報セクション
  - _Requirements: 4.1, 4.2_
