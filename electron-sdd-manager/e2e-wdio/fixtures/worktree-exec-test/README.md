# Worktree Execution Test Fixture

## Purpose
worktree実行ワークフローのE2Eテスト用fixtureプロジェクト。

## Initial State
- **Phase**: tasks（タスク承認済み）
- **Document Review**: approved（レビュー完了）
- **Worktree**: なし（未開始状態）

## Test Scenarios

### Scenario 1: worktreeモード実装開始
1. worktreeモードチェックボックスをON
2. impl実行ボタンをクリック
3. worktreeが作成され、spec.json.worktreeにpath/branch/created_atが保存

### Scenario 2: 通常モード実装開始
1. worktreeモードチェックボックスをOFF（デフォルト）
2. impl実行ボタンをクリック
3. spec.json.worktreeにbranch/created_atのみ保存（pathなし）

### Scenario 3: チェックボックスのロック
1. 実装開始前はチェックボックス変更可能
2. 実装開始後（spec.json.worktree.branch存在）はロック

### Scenario 4: 既存worktree時の自動ON
1. spec.json.worktree.pathが存在する状態でロード
2. チェックボックスが自動でON＆ロック

## Reset Instructions
テスト前にspec.jsonを初期状態に戻す必要がある。
worktreeフィールドを削除し、phaseをtasksに戻す。
