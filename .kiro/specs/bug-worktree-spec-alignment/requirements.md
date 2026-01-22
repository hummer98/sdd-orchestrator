# Requirements: Bug Worktree Spec Alignment

## Decision Log

### 未コミットBugのメイン側削除
- **Discussion**: Bugをworktreeに変換した際、メイン側のbugディレクトリを残すか削除するか
- **Conclusion**: Specと同様にメイン側を削除する
- **Rationale**: Specとの動作統一、ファイルの重複を避ける

### コミット済みBugの扱い
- **Discussion**: コミット状態によって処理を分岐させるか
- **Conclusion**: Specと同様の3状態判定を導入
  - untracked: 変換可能（コピー→削除）
  - committed-clean: 変換可能（スキップ）
  - committed-dirty: エラー
- **Rationale**: Specとの一貫性、予期しないファイル上書きを防止

### シンボリックリンクの範囲
- **Discussion**: Bugのworktreeにシンボリックリンクを作成するか
- **Conclusion**: Specと同様にlogs/runtimeのシンボリックリンクを作成
- **Rationale**: ログ・ランタイム情報の共有、Specとの動作統一

### 既存worktreeへの影響
- **Discussion**: 既存のworktreeモードBugへの対応方法
- **Conclusion**: 既存は放置（手動修正）、新規作成分から新動作を適用
- **Rationale**: 移行処理の複雑化を避ける、影響範囲を限定

## Introduction

Bugのworktree変換処理をSpecと同じ動作に統一する。現在Bugは「ディレクトリモード」という独自方式を使用しているが、Specの変換処理（convertWorktreeService）と同等の動作に改修し、コードベースの一貫性を向上させる。

## Requirements

### Requirement 1: コミット状態チェック

**Objective:** 開発者として、Bugのgitコミット状態に応じた適切なworktree変換処理が行われることで、ファイルの整合性が保たれる

#### Acceptance Criteria
1. When Bugをworktreeに変換する際、システムは `git status --porcelain` でBugディレクトリのコミット状態を判定する
2. If 状態が `untracked`（未追跡または新規追加）であれば、システムは変換を許可する
3. If 状態が `committed-clean`（コミット済み・差分なし）であれば、システムは変換を許可する
4. If 状態が `committed-dirty`（コミット済み・差分あり）であれば、システムはエラー「Bugに未コミットの変更があります。先にコミットしてください」を返す

### Requirement 2: 未コミットBugの変換処理

**Objective:** 開発者として、未コミットのBugをworktreeに変換した際、メイン側のファイルが削除されることで、ファイルの重複を避けられる

#### Acceptance Criteria
1. When 未コミット（untracked）のBugをworktreeに変換する際、システムはBugファイルをworktreeにコピーする
2. When コピーが成功した後、システムはメイン側の `.kiro/bugs/{bugName}/` ディレクトリを削除する
3. If コピーに失敗した場合、システムはworktreeをロールバックし、メイン側のファイルは残す

### Requirement 3: コミット済みBugの変換処理

**Objective:** 開発者として、コミット済みのBugをworktreeに変換した際、不要なコピー処理がスキップされる

#### Acceptance Criteria
1. When コミット済み・差分なし（committed-clean）のBugをworktreeに変換する際、システムはファイルコピーをスキップする
2. The system shall git worktree作成時に自動的にBugファイルが含まれることを前提とする
3. When worktree作成後、システムはworktree内にBugディレクトリが存在することを検証する
4. If worktree内にBugディレクトリが存在しない場合、システムはエラー「Worktree内にBugが見つかりません」を返す

### Requirement 4: シンボリックリンク作成

**Objective:** 開発者として、Bugのworktreeでもログ・ランタイム情報がメインと共有されることで、デバッグが容易になる

#### Acceptance Criteria
1. When Bugのworktreeを作成した後、システムは `.kiro/logs` へのシンボリックリンクを作成する
2. When Bugのworktreeを作成した後、システムは `.kiro/runtime` へのシンボリックリンクを作成する
3. The system shall シンボリックリンク作成前に、ターゲットディレクトリ（メイン側）が存在することを確認し、なければ作成する
4. If worktree内に既存のlogs/runtimeディレクトリがあれば、システムはそれを削除してからシンボリックリンクを作成する

### Requirement 5: エラーハンドリング

**Objective:** 開発者として、worktree変換中のエラーが適切に処理されることで、データ損失を防げる

#### Acceptance Criteria
1. If ブランチ作成に失敗した場合、システムはエラー「ブランチ作成に失敗しました」を返す
2. If worktree作成に失敗した場合、システムは作成したブランチを削除し、エラー「Worktree作成に失敗しました」を返す
3. If ファイルコピーに失敗した場合、システムはworktreeをロールバックし、エラー「ファイル移動に失敗しました」を返す
4. If シンボリックリンク作成に失敗した場合、システムはエラー「シンボリックリンク作成に失敗しました」を返す（部分的にセットアップ済みの状態となる）

## Out of Scope

- 既存のworktreeモードBugの自動移行処理
- worktree削除時の動作変更（現状維持）
- Specのworktree変換処理の変更
- UIの変更

## Open Questions

- なし（設計フェーズで詳細を検討）
