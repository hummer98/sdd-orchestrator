# Requirements: Bugs Worktree Support

## Decision Log

### worktree作成タイミング
- **Discussion**: bug-create時、bug-analyze時、bug-fix時のいずれでworktreeを作成するか
- **Conclusion**: `bug-fix` 開始時にworktreeを作成
- **Rationale**: bug-create/analyzeはコードを「読む」フェーズで、mainブランチで調査する方が自然。bug-fixで初めてコードを「書く」ため、ここで分離するのがSpecワークフローの「impl開始時」と対称的で一貫性がある

### 状態管理方法
- **Discussion**: ファイル存在ベースのままか、bug.jsonを新設するか、既存ファイルにメタデータを追記するか
- **Conclusion**: bug.jsonを新設してworktreeフィールドを持たせる
- **Rationale**: SSOT原則に従い、メタデータはJSONで管理。spec.jsonと同じパターンで一貫性があり、将来的な拡張も容易

### worktreeパス
- **Discussion**: Specと同じパスか、bugs専用サブディレクトリか
- **Conclusion**: `../{project}-worktrees/bugs/{bug-name}` 形式でbugs専用サブディレクトリを使用
- **Rationale**: ファイルシステム上でSpec用（feature）とBug用が明確に分離され、一目で識別可能

### ブランチ命名規則
- **Discussion**: feature/と同じ形式か、bugfix/で区別するか
- **Conclusion**: `bugfix/{bug-name}` 形式で固定
- **Rationale**: feature/ブランチとの明確な区別が可能

### worktree使用のオプトイン
- **Discussion**: Specのように常にworktreeを作成するか、オプトインにするか
- **Conclusion**: オプトイン方式。プロジェクト設定でデフォルト値を持ち、UI上でオーバーライド可能
- **Rationale**: バグ修正は規模が様々なため、小規模な修正ではworktreeが不要な場合もある

### worktree設定の永続化
- **Discussion**: bug固有の設定を永続化するか
- **Conclusion**: プロジェクト設定のデフォルト値のみ永続化。bug固有の設定はオンメモリで永続化不要
- **Rationale**: 実装の複雑さを避けつつ、ユーザビリティを確保

### プロジェクト設定のUI
- **Discussion**: worktreeデフォルト設定をどこに配置するか
- **Conclusion**: ツールメニューにトグル表示（インストール時デフォルトはOFF）
- **Rationale**: 既存のツールメニュー構造を活用

### bug-mergeスキル
- **Discussion**: Specのspec-mergeと同様にbug-mergeを新設するか
- **Conclusion**: `/kiro:bug-merge {bug-name}` を新設し、コマンドセットインストールに含める
- **Rationale**: worktree使用時のマージ＆クリーンアップを自動化

### Specワークフローとの整合性
- **Discussion**: Specワークフローもオプトインにするか
- **Conclusion**: Specは現行のまま（常にworktree）、Bugsのみオプトイン
- **Rationale**: 既存の動作を変更せず、段階的に機能拡張

## Introduction

Bugsワークフロー（bug-create → bug-analyze → bug-fix → bug-verify）にgit worktree機能を追加し、mainブランチで調査しながら別のworktreeで修正作業を行えるようにする機能。bug-fix開始時にworktreeを作成するオプションを提供し、修正・検証完了後にbug-mergeでmainブランチにマージ、worktreeをクリーンアップする。プロジェクト設定でデフォルト値を持ち、UI上でオーバーライド可能。

## Requirements

### Requirement 1: bug.json導入

**Objective:** システムとして、バグのメタデータとworktree状態を一元管理したい

#### Acceptance Criteria
1. When `bug-create` が実行されたとき, the system shall `.kiro/bugs/{bug-name}/bug.json` を作成する
2. The bug.json shall 以下の構造を持つ:
   ```json
   {
     "bug_name": "{bug-name}",
     "created_at": "ISO-8601",
     "updated_at": "ISO-8601"
   }
   ```
3. When worktreeが作成されたとき, the system shall bug.jsonにworktreeフィールドを追加する:
   ```json
   {
     "worktree": {
       "path": "../{project}-worktrees/bugs/{bug-name}",
       "branch": "bugfix/{bug-name}",
       "created_at": "ISO-8601"
     }
   }
   ```
4. The system shall worktreeフィールドの有無でworktreeモードを判定する

### Requirement 2: bug-*スキルのbug.json対応

**Objective:** 開発者として、bug-*スキルがbug.jsonを適切に管理することで、状態追跡を一貫して行いたい

#### Acceptance Criteria
1. When `bug-create` を実行するとき, the system shall bug.jsonを新規作成する
2. When `bug-analyze` を実行するとき, the system shall bug.jsonのupdated_atを更新する
3. When `bug-fix` を実行するとき, the system shall worktree使用時にbug.jsonにworktreeフィールドを追加する
4. When `bug-verify` を実行するとき, the system shall bug.jsonのupdated_atを更新する
5. When `bug-status` を実行するとき, the system shall bug.jsonからworktree状態も読み取り表示する

### Requirement 3: Worktree作成（bug-fix）

**Objective:** 開発者として、bug-fix開始時にオプションでworktreeを作成し、分離された作業環境で修正を行いたい

#### Acceptance Criteria
1. When bug-fix開始時にworktree使用が選択されているとき, the system shall mainブランチにいることを確認する
2. If mainブランチにいない場合, then the system shall エラーを表示してbug-fixを中断する
3. When worktree使用が選択されmainブランチにいるとき, the system shall `../{project}-worktrees/bugs/{bug-name}` にworktreeを作成する
4. When worktreeを作成するとき, the system shall `bugfix/{bug-name}` 形式のブランチを作成する
5. When worktree作成が成功したとき, the system shall bug.jsonにworktreeフィールドを追加する
6. If worktree作成が失敗した場合, then the system shall エラーを表示してbug-fixを中断する
7. The worktree.pathフィールド shall mainプロジェクトルート基準の相対パスで保存される
8. When worktree使用が選択されていないとき, the system shall 通常通りmainブランチで修正を行う

### Requirement 4: bug-mergeスキル

**Objective:** 開発者として、worktreeの変更をmainブランチにマージし、worktreeをクリーンアップしたい

#### Acceptance Criteria
1. The system shall `/kiro:bug-merge {bug-name}` コマンドを提供する
2. When bug-mergeを実行するとき, the system shall pwdがmainブランチのプロジェクトであることを確認する
3. When bug-mergeを実行するとき, the system shall worktreeブランチをmainにマージする
4. If gitマージでコンフリクトが発生した場合, then the system shall AIによる自動解決を試行する
5. If 自動解決に失敗した場合, then the system shall ユーザーに報告してマージを中断する
6. When マージが成功したとき, the system shall worktreeを削除する
7. When worktree削除が完了したとき, the system shall bug.jsonからworktreeフィールドを削除する
8. When 全てのクリーンアップが完了したとき, the system shall 成功メッセージを表示する

### Requirement 5: コマンドセット更新

**Objective:** 開発者として、コマンドセットインストール時にbug-mergeが含まれるようにしたい

#### Acceptance Criteria
1. When コマンドセットをインストールするとき, the system shall bug-mergeスキルを含める
2. The bug-mergeスキル shall 他のbug-*スキルと同じ場所に配置される

### Requirement 6: テンプレートファイル

**Objective:** システムとして、bug.json作成時に一貫したテンプレートを使用したい

#### Acceptance Criteria
1. The system shall bug.jsonのテンプレートファイルを提供する
2. When bug-createを実行するとき, the system shall テンプレートを基にbug.jsonを生成する

### Requirement 7: skill-reference.md更新

**Objective:** 開発者として、bug-*ワークフローの変更がドキュメントに反映されていることを確認したい

#### Acceptance Criteria
1. The skill-reference.md shall bug-*セクションにbug.json管理の記述を含む
2. The skill-reference.md shall bug-mergeスキルの説明を含む
3. The skill-reference.md shall worktree関連のフィールドと状態遷移を記述する

### Requirement 8: Electron UI - worktreeチェックボックス

**Objective:** 開発者として、UI上でworktree使用を選択・確認したい

#### Acceptance Criteria
1. When バグ新規作成ダイアログを表示するとき, the system shall worktree使用チェックボックスを表示する
2. When Bugsワークフローエリアを表示するとき, the system shall エリア上部にworktree使用チェックボックスを表示する
3. The チェックボックス shall プロジェクト設定のデフォルト値で初期化される
4. When チェックボックスが変更されたとき, the system shall その値をオンメモリで保持する
5. When bug-fixを開始するとき, the system shall チェックボックスの値に基づいてworktree作成を決定する

### Requirement 9: Electron UI - プロジェクト設定トグル

**Objective:** 開発者として、Bugsワークフローのworktreeデフォルト設定を管理したい

#### Acceptance Criteria
1. The system shall ツールメニューに「Bugs: Worktreeをデフォルトで使用」トグルを表示する
2. When トグルが変更されたとき, the system shall 設定を永続化する
3. The トグル shall インストール時のデフォルト値としてOFFを持つ
4. When 新規バグ作成時, the system shall このデフォルト値でチェックボックスを初期化する

### Requirement 10: Electron UI - worktreeインジケーター

**Objective:** 開発者として、どのバグがworktreeモードで作業中か一目で識別したい

#### Acceptance Criteria
1. When バグ一覧を表示するとき, the system shall 各バグのworktree状態を判定する
2. When bug.jsonにworktreeフィールドが存在する場合, the system shall 視覚的なインジケーターを表示する
3. The インジケーター shall Specワークフローのworktreeインジケーターと一貫したデザインを持つ

### Requirement 11: Agent起動時のpwd設定

**Objective:** 開発者として、Agent起動時に自動でworktreeディレクトリで作業を開始したい

#### Acceptance Criteria
1. When bug.jsonにworktreeフィールドが存在する状態でAgentを起動するとき, the system shall worktree.pathをpwdとして設定する
2. When 同じバグに対して複数のAgentを起動するとき, the system shall 全てのAgentに同じworktreeパスを設定する

## Out of Scope

- 既存worktreeの検出・紐付け機能（手動でbug.json編集は可能）
- worktree作成場所のカスタマイズ
- ブランチ命名規則のカスタマイズ
- Specワークフローのworktreeオプトイン化（将来検討）
- bug-verify成功時の自動マージ（手動でbug-merge実行）
- Remote UI対応（初期スコープ外、Desktop UI専用機能）

## Open Questions

- bug-merge失敗時のロールバック戦略（spec-mergeと同様の課題）
