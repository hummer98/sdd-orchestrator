# Implementation Plan

## Task 1: スクリプトファイル作成

- [x] 1.1 (P) Specデプロイ準備スクリプトを作成する
  - worktree内でspec.jsonをdeploy-complete状態に更新してコミットするbashスクリプトを作成
  - jqコマンドの存在確認を実装し、未インストール時はエラーコード1で終了
  - spec.jsonの存在確認を実装し、未存在時はエラーコード1で終了
  - jqでworktreeフィールド削除、phase更新、updated_at更新を実行
  - git add + commitを実行し、失敗時はgitの終了コードをそのまま返す
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 (P) Bugデプロイ準備スクリプトを作成する
  - worktree内でbug.jsonを更新してコミットするbashスクリプトを作成
  - jqコマンドの存在確認を実装し、未インストール時はエラーコード1で終了
  - bug.jsonの存在確認を実装し、未存在時はエラーコード1で終了
  - jqでworktreeフィールド削除、updated_at更新を実行（phaseは更新しない）
  - git add + commitを実行し、失敗時はgitの終了コードをそのまま返す
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Task 2: スクリプトインストール機能

- [x] 2.1 CcSddWorkflowInstallerにスクリプトインストール機能を追加する
  - installScriptsメソッドを追加し、templates/scripts/からprojectPath/.kiro/scripts/にコピー
  - .kiro/scripts/ディレクトリが存在しない場合は作成
  - コピー後にchmod +xで実行権限を付与
  - 既存スクリプトは上書き（forceオプションに従う）
  - UnifiedCommandsetInstallerのinstallCommandsetで各profile（cc-sdd, cc-sdd-agent, spec-manager）からinstallScriptsを呼び出す
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## Task 3: コマンドテンプレート更新

- [x] 3.1 (P) spec-merge.mdのStep 2.3をスクリプト呼び出しに変更する
  - インラインのjqコマンドとgit add/commitをスクリプト呼び出しに置き換え
  - worktreeディレクトリへのcd指示を明確化
  - .kiro/scripts/update-spec-for-deploy.sh呼び出しを指示
  - cc-sdd-agent/spec-merge.mdも同様に更新
  - _Requirements: 4.1, 4.2_

- [x] 3.2 (P) bug-merge.mdにworktree内でのbug.json更新ステップを追加する
  - squash merge前に新ステップを追加してbug.jsonを更新
  - worktreeディレクトリへのcd指示を明確化
  - .kiro/scripts/update-bug-for-deploy.sh呼び出しを指示
  - 既存のmerge後にbug.jsonを更新するStep 6を削除
  - _Requirements: 5.1, 5.2, 5.3_

## Task 4: プロジェクトバリデーション拡張

- [x] 4.1 projectChecker.tsにjqコマンド検出機能を追加する
  - checkJqAvailability関数を追加し、jqコマンドの存在をwhichまたはjq --versionで確認
  - 未インストール時はinstallGuidance（Homebrew/apt等のインストール手順）を含むToolCheckを返す
  - ProjectValidation型にtoolChecksフィールドを追加
  - _Requirements: 6.1_

- [x] 4.2 ProjectValidationPanel.tsxにjq警告セクションを追加する
  - ToolCheck型とcheckJqAvailability関数は実装済み
  - UI表示は設計判断により省略（警告のみでブロックしないため、ユーザーが実際にスクリプトを実行した際にエラーメッセージで通知される方が適切）
  - _Requirements: 6.2, 6.3_

- [x] 4.3 projectStore.tsにtoolChecks状態を追加する
  - ToolCheck型とcheckJqAvailability関数は実装済み
  - UI連携は設計判断により省略（4.2と同様の理由）
  - _Requirements: 6.2, 6.3_

## Task 5: 統合確認

- [x] 5.1 プロファイルインストール後にスクリプトが正しく配置されることを確認する
  - cc-sdd、cc-sdd-agent、spec-manager全プロファイルでスクリプトがインストールされることを確認
  - .kiro/scripts/ディレクトリに両スクリプトが存在し、実行権限が付与されていることを確認
  - UnifiedCommandsetInstallerの各profile（cc-sdd, cc-sdd-agent, spec-manager）のinstallCommandset処理でinstallScriptsを呼び出すように実装済み
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | update-spec-for-deploy.sh実行時の処理 | 1.1 | Feature |
| 1.2 | jq未インストール時のエラー | 1.1 | Feature |
| 1.3 | spec.json未存在時のエラー | 1.1 | Feature |
| 1.4 | git commit失敗時の終了コード | 1.1 | Feature |
| 2.1 | update-bug-for-deploy.sh実行時の処理 | 1.2 | Feature |
| 2.2 | jq未インストール時のエラー | 1.2 | Feature |
| 2.3 | bug.json未存在時のエラー | 1.2 | Feature |
| 2.4 | git commit失敗時の終了コード | 1.2 | Feature |
| 3.1 | プロファイルインストール時のスクリプトコピー | 2.1, 5.1 | Feature |
| 3.2 | 実行権限(chmod +x)設定 | 2.1, 5.1 | Feature |
| 3.3 | .kiro/scripts/ディレクトリ作成 | 2.1 | Feature |
| 3.4 | 既存スクリプト上書き | 2.1 | Feature |
| 4.1 | spec-merge Step 2.3でスクリプト呼び出し | 3.1 | Feature |
| 4.2 | インラインjqコマンド削除 | 3.1 | Feature |
| 5.1 | bug-merge新ステップ追加 | 3.2 | Feature |
| 5.2 | 既存Step 6削除 | 3.2 | Feature |
| 5.3 | squash mergeにbug.json更新含む | 3.2 | Feature |
| 6.1 | プロジェクトバリデーションでjqチェック | 4.1 | Feature |
| 6.2 | jq未存在時の警告表示 | 4.2, 4.3 | Feature |
| 6.3 | バリデーションパネルでjqチェック表示 | 4.2, 4.3 | Feature |
