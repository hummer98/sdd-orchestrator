# Requirements: Merge Script Consolidation

## Decision Log

### 問題の根本原因

- **Discussion**: `spec-merge.md` が `update-spec-for-deploy.sh` を worktree 内で実行し、`worktree` フィールドを削除した後、`merge-spec.sh` が `worktree.branch` を読もうとして失敗する。2つのスクリプトがバラバラに動作することでタイミング問題が発生。
- **Conclusion**: `merge-spec.sh` に責務を統合し、`update-spec-for-deploy.sh` を削除する
- **Rationale**: 単一スクリプトで全処理を行うことで、実行順序の問題が発生しない

### ブランチチェックの方針

- **Discussion**: `merge-spec.sh` 内で `git checkout main` を実行すべきか
- **Conclusion**: checkout せず、main/master/dev でなければ abort する
- **Rationale**: 暗黙的な状態変更は避けるべき。前提条件を満たしていなければ早期失敗が安全

### spec.json 更新のタイミング

- **Discussion**: マージ後に main 側で更新するか、worktree 内で更新して squash merge に含めるか
- **Conclusion**: worktree 内で更新 → squash merge でその更新も含める → ただしブランチ名取得はマージ前に先に行う
- **Rationale**: 全ての変更が単一の squash commit に含まれ、履歴がクリーンになる

### Bug ワークフローの対応

- **Discussion**: Bug ワークフロー（`bug-merge.md` / `update-bug-for-deploy.sh`）も同じ問題構造を持つか
- **Conclusion**: 同様のパターンで `merge-bug.sh` を新規作成し、`update-bug-for-deploy.sh` を削除する
- **Rationale**: 一貫した設計で保守性を向上

## Introduction

Spec および Bug のマージワークフローにおいて、`update-*-for-deploy.sh` と `merge-*.sh` が分離していることで発生するタイミング問題を解決する。責務を `merge-spec.sh` と `merge-bug.sh`（新規）に統合し、不要なスクリプトを削除する。

## Requirements

### Requirement 1: merge-spec.sh の責務統合

**Objective:** As a 開発者, I want merge-spec.sh が spec.json 更新を含む全マージ処理を単一スクリプトで実行できること, so that 実行順序の問題が発生しない

#### Acceptance Criteria

1. When merge-spec.sh が実行されると, the system shall worktree 内の spec.json から `worktree.branch` を正しいパスで読み取る
2. When 現在のブランチが main/master/dev 以外の場合, the system shall エラーメッセージを出力して exit code 2 で終了する（checkout は行わない）
3. When ブランチ名取得後, the system shall worktree 内で spec.json を更新する（`worktree` フィールド削除、`phase` を `deploy-complete` に、`updated_at` 更新）
4. When spec.json 更新後, the system shall worktree 内で変更をコミットする
5. When worktree 準備完了後, the system shall jj squash または git merge --squash でマージを実行する
6. When マージ成功後, the system shall main 側でコミットを作成する
7. When コミット完了後, the system shall worktree ディレクトリを削除する
8. When worktree 削除後, the system shall feature ブランチを削除する

### Requirement 2: merge-bug.sh の新規作成

**Objective:** As a 開発者, I want Bug 修正のマージも同様に単一スクリプトで実行できること, so that Spec と Bug で一貫した動作になる

#### Acceptance Criteria

1. When merge-bug.sh が実行されると, the system shall worktree 内の bug.json から `worktree.branch` を正しいパスで読み取る
2. When 現在のブランチが main/master/dev 以外の場合, the system shall エラーメッセージを出力して exit code 2 で終了する
3. When ブランチ名取得後, the system shall worktree 内で bug.json を更新する（`worktree` フィールド削除、`updated_at` 更新）
4. When bug.json 更新後, the system shall worktree 内で変更をコミットする
5. When worktree 準備完了後, the system shall jj squash または git merge --squash でマージを実行する
6. When マージ成功後, the system shall main 側でコミットを作成する
7. When コミット完了後, the system shall worktree ディレクトリを削除する
8. When worktree 削除後, the system shall bugfix ブランチを削除する

### Requirement 3: 不要スクリプトの削除

**Objective:** As a 保守担当者, I want 使用されなくなったスクリプトが削除されること, so that コードベースがクリーンに保たれる

#### Acceptance Criteria

1. The system shall `.kiro/scripts/update-spec-for-deploy.sh` を削除する
2. The system shall `.kiro/scripts/update-bug-for-deploy.sh` を削除する

### Requirement 4: spec-merge.md の更新

**Objective:** As a AI エージェント, I want spec-merge.md が更新された merge-spec.sh を正しく呼び出すこと, so that ワークフローが正常に動作する

#### Acceptance Criteria

1. The system shall Step 2.3 の `update-spec-for-deploy.sh` 呼び出しを削除する
2. The system shall Step 3 で merge-spec.sh を呼び出すのみに簡素化する
3. If merge-spec.sh がエラーを返した場合, then the system shall エラーハンドリングを適切に行う

### Requirement 5: bug-merge.md の更新

**Objective:** As a AI エージェント, I want bug-merge.md が新規作成された merge-bug.sh を正しく呼び出すこと, so that Bug ワークフローが正常に動作する

#### Acceptance Criteria

1. The system shall Step 2.3 の `update-bug-for-deploy.sh` 呼び出しを削除する
2. The system shall Step 3 で merge-bug.sh を呼び出す形に変更する
3. If merge-bug.sh がエラーを返した場合, then the system shall エラーハンドリングを適切に行う

### Requirement 6: エラーハンドリング

**Objective:** As a 開発者, I want マージスクリプトが適切なエラーコードとメッセージを返すこと, so that 問題発生時に原因が特定できる

#### Acceptance Criteria

1. When jq がインストールされていない場合, the system shall exit code 2 とインストール手順を出力する
2. When spec.json/bug.json が見つからない場合, the system shall exit code 2 と期待されるパスを出力する
3. When `worktree.branch` が見つからない場合, the system shall exit code 2 とエラー原因を出力する
4. When 現在のブランチが main/master/dev 以外の場合, the system shall exit code 2 と現在のブランチ名を出力する
5. When マージコンフリクトが発生した場合, the system shall exit code 1 を返す（クリーンアップは行わない）
6. When worktree 削除に失敗した場合, the system shall 警告を出力して処理を継続する
7. When ブランチ削除に失敗した場合, the system shall 警告を出力して処理を継続する

## Out of Scope

- jj/git の選択ロジックの変更（現状維持）
- コンフリクト自動解決機能（spec-merge.md 側の責務）
- inspection 完了チェック（spec-merge.md 側の責務）
- 後方互換性の維持（削除するスクリプトへの参照は全て更新する）

## Open Questions

- なし（対話で全て解決済み）
