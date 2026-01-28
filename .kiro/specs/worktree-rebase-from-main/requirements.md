# Requirements: Worktree Rebase from Main

## Decision Log

### 実行タイミング
- **Discussion**: 手動ボタンのみか、spec-merge前の自動実行も含めるか
- **Conclusion**: 手動ボタンのみ
- **Rationale**: ユーザーが任意のタイミングでmainの変更を取り込める。自動実行はspec-merge時の挙動を複雑にする

### コンフリクト解決方式
- **Discussion**: AI自動解決、ユーザー手動解決、jjのコンフリクトファーストクラス機能のいずれを採用するか
- **Conclusion**: AI自動解決（最大7回試行）
- **Rationale**: spec-mergeと同じ方式で一貫性を保つ。jjでもコンフリクトは発生するため、AI解決は有効

### 対象スコープ
- **Discussion**: Specのみか、Bugのworktreeモードも含めるか
- **Conclusion**: SpecとBug両方
- **Rationale**: 両方のワークフローでworktreeモードを使用するため、一貫したUXを提供

### Remote UI対応
- **Discussion**: Desktop UIのみか、Remote UIも対応するか
- **Conclusion**: Remote UIも対応
- **Rationale**: リモートからもworktree操作を可能にし、統一されたアクセス性を提供

### ボタンラベル
- **Discussion**: 「mainに追従」「Rebase from main」「mainを取り込み」のいずれか
- **Conclusion**: 「mainを取り込み」
- **Rationale**: 日本語で動作を説明し、ユーザーにとって分かりやすい表現

### ツール選択
- **Discussion**: jj必須か、jj優先でgitフォールバックか
- **Conclusion**: jj優先・gitフォールバック
- **Rationale**: jj-merge-supportと同じ方式。jjがない環境でも動作継続

### 確認ダイアログ
- **Discussion**: 実行前に確認ダイアログを表示するか
- **Conclusion**: 確認なし（即座に実行）
- **Rationale**: 操作性を優先。rebaseは安全な操作であり、コンフリクトはAIが解決

### 最新時の挙動
- **Discussion**: mainに新しいコミットがない場合の挙動
- **Conclusion**: 「既に最新です」と表示
- **Rationale**: ユーザーに結果をフィードバックし、操作が完了したことを明示

### スクリプトファイル
- **Discussion**: rebase処理をスクリプト化するか、直接コマンド実行か
- **Conclusion**: `.kiro/scripts/rebase-worktree.sh` を作成
- **Rationale**: merge-spec.shと同様にスクリプト化することで安定性とメンテナンス性を向上

## Introduction

Worktreeモードで実装作業中に、mainブランチの最新変更を取り込むためのrebase機能を提供する。「Worktreeに変更」ボタンが表示される位置（worktreeモード時は非表示）に「mainを取り込み」ボタンを配置し、jjを優先してrebaseを実行する。コンフリクトが発生した場合はAIによる自動解決を試行する。

## Requirements

### Requirement 1: UIボタン表示（Spec）

**Objective:** SpecワークフローのユーザーがWorktreeモード時にmainの変更を取り込めるよう、適切なタイミングでボタンが表示される

#### Acceptance Criteria
1. When SpecがWorktreeモード（spec.jsonにworktree.pathあり）の場合、SpecWorkflowFooterに「mainを取り込み」ボタンが表示される
2. If Specが通常モード（worktree.pathなし）の場合、ボタンは表示されない
3. While Agent実行中の場合、ボタンはdisabled状態になる
4. While 自動実行中の場合、ボタンはdisabled状態になる
5. While rebase処理中の場合、ボタンは「取り込み中...」と表示されdisabled状態になる

### Requirement 2: UIボタン表示（Bug）

**Objective:** BugワークフローのユーザーがWorktreeモード時にmainの変更を取り込めるよう、適切なタイミングでボタンが表示される

#### Acceptance Criteria
1. When BugがWorktreeモード（bug.jsonにworktree.pathあり）の場合、BugWorkflowFooterに「mainを取り込み」ボタンが表示される
2. If Bugが通常モード（worktree.pathなし）の場合、ボタンは表示されない
3. While Agent実行中の場合、ボタンはdisabled状態になる
4. While 自動実行中の場合、ボタンはdisabled状態になる
5. While rebase処理中の場合、ボタンは「取り込み中...」と表示されdisabled状態になる

### Requirement 3: Rebaseスクリプト

**Objective:** システムとして、jj優先・gitフォールバックでrebase処理を安定的に実行したい

#### Acceptance Criteria
1. When `.kiro/scripts/rebase-worktree.sh` スクリプトが作成される場合、システムはjjコマンドの存在を確認する
2. If jjが存在する場合、システムは `jj rebase -d main` でrebaseを実行する
3. If jjが存在しない場合、システムは `git rebase main` を実行する
4. When mainブランチに新しいコミットがない場合、スクリプトは終了コード0と「Already up to date」メッセージを返す
5. When rebaseがコンフリクトで失敗した場合、スクリプトは終了コード1を返す
6. When rebaseが成功した場合、スクリプトは終了コード0を返す

### Requirement 4: コンフリクト解決

**Objective:** システムとして、rebase時のコンフリクトをAIで自動解決し、ユーザーの介入を最小化したい

#### Acceptance Criteria
1. When rebaseがコンフリクトで失敗した場合、システムはAIによる自動解決を試行する
2. When AIがコンフリクトを解決した場合、システムは `git rebase --continue` または `jj squash` でrebaseを続行する
3. If 7回試行しても解決できない場合、システムはユーザーにコンフリクト状態を報告して中断する
4. When 中断した場合、システムは `git rebase --abort` または `jj undo` でworktreeを元の状態に戻す

### Requirement 5: IPCハンドラ

**Objective:** レンダラープロセスからメインプロセスのrebase処理を呼び出せるようにする

#### Acceptance Criteria
1. When レンダラーがrebaseをリクエストした場合、mainプロセスは`.kiro/scripts/rebase-worktree.sh`を実行する
2. When スクリプトが成功した場合、mainプロセスは成功レスポンスを返す
3. When スクリプトが「Already up to date」を返した場合、mainプロセスは最新状態レスポンスを返す
4. When スクリプトがコンフリクトを報告した場合、mainプロセスはコンフリクト解決フローを開始する
5. When IPCハンドラが追加される場合、システムは`worktree:rebase-from-main`チャンネルを使用する

### Requirement 6: Store統合（Spec）

**Objective:** SpecのStoreでrebase状態を管理し、UIが状態を参照できるようにする

#### Acceptance Criteria
1. When rebaseが開始される場合、storeは `isRebasing: true` を設定する
2. When rebaseが完了する場合、storeは `isRebasing: false` を設定する
3. When rebaseが成功した場合、storeは成功通知を表示する
4. When 「既に最新です」の場合、storeは情報通知を表示する
5. When rebaseがエラーで失敗した場合、storeはエラー通知を表示する

### Requirement 7: Store統合（Bug）

**Objective:** BugのStoreでrebase状態を管理し、UIが状態を参照できるようにする

#### Acceptance Criteria
1. When rebaseが開始される場合、storeは `isRebasing: true` を設定する
2. When rebaseが完了する場合、storeは `isRebasing: false` を設定する
3. When rebaseが成功した場合、storeは成功通知を表示する
4. When 「既に最新です」の場合、storeは情報通知を表示する
5. When rebaseがエラーで失敗した場合、storeはエラー通知を表示する

### Requirement 8: Remote UI対応

**Objective:** ブラウザからもrebase操作を行えるようにする

#### Acceptance Criteria
1. When Remote UIでSpec/BugをWorktreeモードで表示した場合、「mainを取り込み」ボタンが表示される
2. When Remote UIからボタンを押下した場合、WebSocket経由でrebase処理が実行される
3. When 処理完了後、Remote UI上でも成功/エラー/最新状態のメッセージが表示される
4. When rebase処理中、Remote UIでもボタンがdisabled状態になる

### Requirement 9: スクリプトテンプレート配置

**Objective:** commandsetインストール時にrebaseスクリプトが配置されるようにする

#### Acceptance Criteria
1. When commandsetがインストールされる場合、システムは`electron-sdd-manager/resources/templates/scripts/rebase-worktree.sh`を`.kiro/scripts/rebase-worktree.sh`にコピーする
2. When スクリプトがコピーされる場合、システムは実行権限（chmod +x）を付与する
3. When `.kiro/scripts/` ディレクトリが存在しない場合、システムは自動的に作成する
4. When スクリプトが既に存在する場合、システムは上書きする

### Requirement 10: エラーハンドリング

**Objective:** ユーザーがエラー発生時に適切なフィードバックを受け、問題を理解できるようにする

#### Acceptance Criteria
1. If rebase-worktree.shが存在しない場合、「スクリプトが見つかりません。commandsetを再インストールしてください」が表示される
2. If worktreeディレクトリが存在しない場合、「Worktreeディレクトリが見つかりません」が表示される
3. If gitリポジトリでない場合、「Gitリポジトリではありません」が表示される
4. If mainブランチが存在しない場合、「mainブランチが見つかりません」が表示される
5. If コンフリクト解決に失敗した場合、「コンフリクトを解決できませんでした。手動で解決してください」が表示される

## Out of Scope

- spec-merge前の自動rebase（手動ボタンのみ）
- rebaseのプレビュー機能（どのコミットが取り込まれるか事前確認）
- mainブランチ以外からのrebase（常にmainから取り込み）
- 部分的なrebase（特定コミットのみ取り込み）
- rebase履歴の記録・表示

## Open Questions

- なし（対話で全て解決済み）
