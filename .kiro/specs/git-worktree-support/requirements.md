# Requirements: Git Worktree Support

## Decision Log

### worktree作成タイミング
- **Discussion**: impl開始時に自動で作成するか、手動トリガーにするか
- **Conclusion**: impl開始時に自動で作成
- **Rationale**: ユーザーの操作を最小化し、シームレスなワークフローを実現するため

### 既存worktreeへの対応
- **Discussion**: 手動で作成した既存worktreeを検出・紐付けする機能を含めるか
- **Conclusion**: 新規作成のみサポート。既存worktreeを使いたい場合はspec.jsonを手動編集
- **Rationale**: 実装の複雑さを避け、シンプルな動作を優先

### worktree作成場所
- **Discussion**: カスタムパスを設定可能にするか
- **Conclusion**: `../{project}-worktrees/{feature-name}` 形式の固定パスを使用
- **Rationale**: 設定項目を増やさず、一貫性のあるパス構造を維持

### spec.jsonのパス形式
- **Discussion**: worktreeパスを絶対パスで保存するか相対パスで保存するか
- **Conclusion**: 相対パス（mainプロジェクトルート基準）
- **Rationale**: プロジェクト移動時の堅牢性を確保

### ブランチ命名規則
- **Discussion**: カスタマイズ可能にするか固定にするか
- **Conclusion**: `feature/{feature-name}` で固定
- **Rationale**: 混乱を避け、一貫性を保つ

### worktreeパスの`{project}`定義
- **Discussion**: `../{project}-worktrees/{feature-name}`の`{project}`が何を指すか
- **Conclusion**: mainプロジェクトのディレクトリ名（path.basename(projectPath)）
- **Rationale**: シンプルで一貫性があり、ファイルシステム上で識別しやすい

### spec-merge実行方法
- **Discussion**: UIボタン、コマンド、または両方
- **Conclusion**: コマンド `/kiro:spec-merge {feature}` を用意。UIは既存のDeployボタンを条件分岐で流用
- **Rationale**: 既存UIを活用しつつ、コマンドでの柔軟な実行も可能に

### worktree削除タイミング
- **Discussion**: マージ後自動削除か手動削除か
- **Conclusion**: spec-mergeスキル内でクリーンアップを自動実行
- **Rationale**: pwdがmainブランチなので安全に削除可能、ユーザー操作を最小化

### spec.jsonのworktreeフィールド管理
- **Discussion**: マージ後にフィールドを履歴として残すか削除するか
- **Conclusion**: クリーンアップ時にフィールドを削除
- **Rationale**: 状態をシンプルに保ち、フィールドの有無でworktreeモードを判定

### コンフリクト解決
- **Discussion**: gitマージ時のコンフリクトを手動解決にするか自動解決を試みるか
- **Conclusion**: AIによる自動解決を試行
- **Rationale**: ユーザー介入を最小化し、ワークフローの自動化を推進

### inspection失敗時の挙動
- **Discussion**: inspection失敗時にspec-mergeに進むか中断するか
- **Conclusion**: 7回試行しても解決しない場合はユーザーに報告して中断
- **Rationale**: 無限ループを防ぎつつ、十分なリトライ機会を提供

### ワーキングツリーの状態チェック
- **Discussion**: 未コミットの変更がある場合にエラーにするか
- **Conclusion**: 未コミットありでも実行可能
- **Rationale**: 柔軟な運用を許容

### Open in Mainボタン
- **Discussion**: mainブランチ側を開くボタンを実装するか
- **Conclusion**: スコープ外
- **Rationale**: 用途が不明確であり、必要性が低い

### Impl開始UIの分岐
- **Discussion**: Impl開始時にworktree作成を強制するか、選択制にするか
- **Conclusion**: 「カレントブランチで実装」と「Worktreeで実装」の2つのボタンを提供
- **Rationale**: ユーザーにワークフローの選択権を与え、既存のカレントブランチ実装も継続サポート。worktreeが既に存在する場合は継続のみ許可

## Introduction

Git worktree機能を活用し、mainブランチで仕様策定を行いながら、別のworktreeで実装作業を並行して行えるようにする機能。impl開始時にworktreeを自動作成し、実装・inspection完了後にspec-mergeでmainブランチにマージ、worktreeをクリーンアップする一連のワークフローを提供する。

## Requirements

### Requirement 1: Worktree自動作成

**Objective:** 開発者として、impl開始時に自動でworktreeが作成されることで、手動のgit操作なしに分離された作業環境を得たい

#### Acceptance Criteria
1. When impl開始ボタンが押下されたとき, the system shall mainブランチにいることを確認する
2. If mainブランチにいない場合, then the system shall エラーを表示してimplを中断する
3. When mainブランチでimpl開始されたとき, the system shall `../{project}-worktrees/{feature-name}` にworktreeを作成する
4. When worktreeを作成するとき, the system shall `feature/{feature-name}` 形式のブランチを作成する
5. When worktree作成が成功したとき, the system shall spec.jsonにworktreeフィールドを追加する
6. If worktree作成が失敗した場合, then the system shall エラーを表示してimplを中断する
7. The worktree.pathフィールド shall mainプロジェクトルート基準の相対パスで保存される

### Requirement 2: spec.jsonのworktreeフィールド

**Objective:** システムとして、worktreeの状態を追跡し、モード判定を行いたい

#### Acceptance Criteria
1. When worktreeが作成されたとき, the system shall 以下の構造でworktreeフィールドを追加する:
   ```json
   {
     "worktree": {
       "path": "../{project}-worktrees/{feature-name}",
       "branch": "feature/{feature-name}",
       "created_at": "ISO-8601"
     }
   }
   ```
2. The system shall worktreeフィールドの有無でworktreeモードを判定する
3. When worktreeフィールドが存在する場合, the system shall worktreeモードとして動作する

### Requirement 3: Agent起動時のpwd設定

**Objective:** 開発者として、Agent起動時に自動でworktreeディレクトリで作業を開始したい

#### Acceptance Criteria
1. When spec.jsonにworktreeフィールドが存在する状態でAgentを起動するとき, the system shall worktree.pathをpwdとして設定する
2. When 同じspecに対して複数のAgentを起動するとき, the system shall 全てのAgentに同じworktreeパスを設定する

### Requirement 4: Agent一覧でのworktree識別表示

**Objective:** 開発者として、どのAgentがworktreeで作業しているか一目で識別したい

#### Acceptance Criteria
1. When Agent一覧を表示するとき, the system shall 各Agentのpwdがworktreeかどうかを判定する
2. When Agentのpwdがworktreeのパスにマッチする場合, the system shall 視覚的なインジケーターを表示する

### Requirement 5: Deployボタンの条件分岐

**Objective:** 開発者として、worktreeモード時はDeployボタンでspec-mergeを実行したい

#### Acceptance Criteria
1. When worktreeフィールドが存在しない場合, the system shall Deployボタンで `/commit` を実行する
2. When worktreeフィールドが存在する場合, the system shall Deployボタンで `/kiro:spec-merge {feature-name}` を実行する

### Requirement 6: 自動実行フロー

**Objective:** 開発者として、impl完了後にinspectionとspec-mergeが自動で実行されることで、手動操作を最小化したい

#### Acceptance Criteria
1. When impl完了後に自動実行が有効な場合, the system shall inspectionを開始する
2. The inspection shall worktree内で実行される
3. When inspectionで問題が検出された場合, the system shall AI Agentによる修正を試行して再度inspectionを実行する
4. If 7回試行しても問題が解決しない場合, then the system shall ユーザーに報告して自動実行を中断する
5. When inspectionが成功した場合, the system shall spec-mergeを実行する

### Requirement 7: spec-mergeスキル

**Objective:** 開発者として、worktreeの変更をmainブランチにマージし、worktreeをクリーンアップしたい

#### Acceptance Criteria
1. The system shall `/kiro:spec-merge {feature-name}` コマンドを提供する
2. When spec-mergeを実行するとき, the system shall pwdがmainブランチのプロジェクトであることを確認する
3. When spec-mergeを実行するとき, the system shall worktreeブランチをmainにマージする
4. If gitマージでコンフリクトが発生した場合, then the system shall AIによる自動解決を試行する
5. If 自動解決に失敗した場合, then the system shall ユーザーに報告してマージを中断する
6. When マージが成功したとき, the system shall worktreeを削除する
7. When worktree削除が完了したとき, the system shall spec.jsonからworktreeフィールドを削除する
8. When 全てのクリーンアップが完了したとき, the system shall 成功メッセージを表示する

### Requirement 8: 監視パスの切り替え

**Objective:** システムとして、worktreeモード時は適切なパスを監視したい

#### Acceptance Criteria
1. When worktreeフィールドが存在する場合, the system shall worktreeパスを基準にファイル監視を行う
2. When worktreeフィールドが存在しない場合, the system shall mainプロジェクトパスを基準にファイル監視を行う

### Requirement 9: Impl開始UIの分岐

**Objective:** 開発者として、カレントブランチで実装するか、worktreeを作成して実装するかを選択したい

#### Acceptance Criteria
1. When Implパネルを表示するとき, the system shall 2つのImpl開始オプションを提供する
2. The system shall 「カレントブランチで実装」ボタンを表示する
3. The system shall 「Worktreeで実装」ボタンを表示する
4. When 「カレントブランチで実装」ボタンが押下されたとき, the system shall 現在のブランチ・ディレクトリでAgentを起動する
5. When 「Worktreeで実装」ボタンが押下されたとき, the system shall mainブランチにいることを確認する
6. If 「Worktreeで実装」選択時にmainブランチにいない場合, then the system shall エラーを表示してimplを中断する
7. When 「Worktreeで実装」がmainブランチで実行されたとき, the system shall worktreeを作成してからAgentを起動する
8. When spec.jsonにworktreeフィールドが既に存在する場合, the system shall 「Worktreeで実装」ボタンのみを表示する（既存worktreeで継続）
9. When spec.jsonにworktreeフィールドが既に存在する場合, the system shall 「カレントブランチで実装」ボタンを非表示にする

## Out of Scope

- 既存worktreeの検出・紐付け機能（手動でspec.json編集は可能）
- worktree作成場所のカスタマイズ
- ブランチ命名規則のカスタマイズ
- 「Open in Main」ボタン
- worktreeモード実行中の解除UI（impl開始後にworktreeを途中で解除する機能。impl開始時の選択UIはRequirement 9でサポート）
- Remote UI対応（初期スコープ外、Desktop UI専用機能）

### 複数specのworktreeモード同時使用
- **Discussion**: 複数のspecが同時にworktreeモードの場合の管理方法
- **Conclusion**: 各Specは独立したworktreeを持つため問題なし
- **Rationale**: worktreeは`{feature-name}`単位で異なるパスに作成されるため、衝突しない

## Open Questions

- spec-merge失敗時のロールバック戦略（部分的にマージされた状態からの復旧方法）
