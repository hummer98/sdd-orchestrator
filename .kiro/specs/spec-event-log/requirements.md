# Requirements: Spec Event Log

## Decision Log

### イベントログのスコープ
- **Discussion**: プロジェクト全体で横断的に見るか、Spec単位で見るか
- **Conclusion**: Spec単位
- **Rationale**: 特定のSpecに関して「何が起きたか」を追跡したいというユースケースに最適。プロジェクト全体のイベントはシステムログ（project-log-separation機能）で対応済み

### UI形式
- **Discussion**: モーダル、サイドパネル、タブのいずれか
- **Conclusion**: モーダルダイアログ
- **Rationale**: 既存のワークフロー画面を邪魔せず、必要なときだけ詳細を確認できる

### ボタン配置
- **Discussion**: AutoExecutionStatusDisplay内、WorkflowView上部、Specヘッダー、フッター
- **Conclusion**: WorkflowViewフッター（自動実行ボタンの横）
- **Rationale**: ユーザーから「Specフッターがあればそこに」という要望。フッターエリアは既存の自動実行ボタンがあり、操作系UIの集約場所として適切

### ボタン表示条件
- **Discussion**: イベントがあるときだけ表示するか、常に表示するか
- **Conclusion**: 常に表示
- **Rationale**: イベントがない場合でも「イベントなし」状態を確認できる方がユーザーにとって明確

### 永続化
- **Discussion**: セッション中のみか、ファイルに保存するか
- **Conclusion**: ファイルに永続化（`.kiro/specs/{spec-name}/events.jsonl`）
- **Rationale**: 過去のイベントを後から参照できることで、問題調査やワークフロー履歴の確認が可能になる

### ファイル配置
- **Discussion**: 各Specディレクトリ内か、集約ログディレクトリか
- **Conclusion**: Specディレクトリ内（`.kiro/specs/{spec-name}/events.jsonl`）
- **Rationale**: Spec単位のスコープに合わせ、関連ファイルを同一ディレクトリに集約。Specの削除時にログも一緒に削除される

### 記録対象イベント
- **Discussion**: どのようなアクションを記録するか
- **Conclusion**: Agent操作、自動実行、レビュー/Inspection、承認操作、phase遷移、worktree操作
- **Rationale**: ユーザーが「何が起きたか」を把握するために必要なイベントを網羅。システム内部の技術的ログとは別に、ユーザー視点でのアクティビティを記録

### Remote UI対応
- **Discussion**: Electron版のみか、Remote UIも対応するか
- **Conclusion**: 対応する（sharedコンポーネントとして実装）
- **Rationale**: 既存のコンポーネント共有パターンに従い、モバイル/Web版でも同じ機能を提供

### リアルタイム通知
- **Discussion**: トースト等で即時通知するか
- **Conclusion**: 不要
- **Rationale**: 既存のAgent状態表示やワークフローUIで進行状況は把握可能。イベントログはあくまで履歴参照用

## Introduction

本機能は、Spec単位でのイベントログ（アクティビティログ）を記録・閲覧する仕組みを提供する。従来のシステムログ（デバッグ用）とは異なり、ユーザーが「このSpecに対して何が起きたか」を後から追跡できるようにすることで、ワークフローの透明性と問題調査の効率を向上させる。

## Requirements

### Requirement 1: イベントログの記録

**Objective:** As a ユーザー, I want Specに関するイベントが自動的に記録されること, so that 後から何が起きたかを確認できる

#### Acceptance Criteria

1. When spec-agentが開始する（自動実行またはユーザー操作による）, the system shall イベントを記録する
2. When spec-agentが正常終了する, the system shall イベントを記録する
3. When spec-agentが失敗する, the system shall イベントを記録する（エラー情報を含む）
4. When 自動実行が開始する, the system shall イベントを記録する
5. When 自動実行が終了する（成功/失敗を含む）, the system shall イベントを記録する
6. When worktreeが作成される, the system shall イベントを記録する
7. When worktreeが削除/マージされる, the system shall イベントを記録する
8. When ドキュメントレビューが開始/完了する, the system shall イベントを記録する
9. When Inspectionが開始/完了する, the system shall イベントを記録する
10. When ファイル承認（approve）操作が行われる, the system shall イベントを記録する
11. When spec.jsonのphaseが自動更新される, the system shall イベントを記録する

### Requirement 2: イベントログの永続化

**Objective:** As a ユーザー, I want イベントログがファイルに保存されること, so that アプリを再起動しても過去のイベントを参照できる

#### Acceptance Criteria

1. The system shall イベントログを `.kiro/specs/{spec-name}/events.jsonl` に保存する
2. The system shall 各イベントをJSON Lines形式（1行1イベント）で記録する
3. The system shall 各イベントにUTCタイムスタンプを含める
4. The system shall 各イベントにイベント種別（type）を含める
5. The system shall 各イベントに関連する詳細情報（phase、agent ID、エラーメッセージ等）を含める
6. When ログファイルが存在しない, the system shall 自動的にファイルを作成する

### Requirement 3: イベントログビューア

**Objective:** As a ユーザー, I want GUIからイベントログを閲覧できること, so that ファイルを直接開かずに履歴を確認できる

#### Acceptance Criteria

1. The system shall WorkflowViewフッター（自動実行ボタンの横）にログビューアを開くボタンを配置する
2. The system shall ボタンを常に表示する（イベントがなくても）
3. When ユーザーがボタンをクリックする, the system shall モーダルダイアログでイベントログを表示する
4. The system shall イベントを時系列で表示する（新しいイベントが上）
5. The system shall 各イベントのタイムスタンプ、種別、詳細を表示する
6. The system shall イベント種別ごとに視覚的な区別を提供する（アイコン/色）
7. If イベントがない, the system shall 「イベントなし」メッセージを表示する

### Requirement 4: イベントデータ構造

**Objective:** As a 開発者, I want イベントログが構造化されていること, so that 解析や拡張が容易である

#### Acceptance Criteria

1. The system shall 以下の基本フィールドを全イベントに含める:
   - `timestamp`: ISO 8601形式のUTCタイムスタンプ
   - `type`: イベント種別
   - `message`: 人間が読める説明
2. The system shall イベント種別に応じた追加フィールドをサポートする:
   - Agent関連: `agentId`, `phase`, `command`, `exitCode`
   - 自動実行関連: `status`, `startPhase`, `endPhase`
   - 承認関連: `phase`, `approved`
   - Worktree関連: `worktreePath`, `branch`
   - Phase遷移関連: `oldPhase`, `newPhase`
3. The system shall 以下のイベント種別を定義する:
   - `agent:start`, `agent:complete`, `agent:fail`
   - `auto-execution:start`, `auto-execution:complete`, `auto-execution:fail`, `auto-execution:stop`
   - `approval:update`
   - `worktree:create`, `worktree:merge`, `worktree:delete`
   - `phase:transition`
   - `review:start`, `review:complete`
   - `inspection:start`, `inspection:complete`

### Requirement 5: Remote UI対応

**Objective:** As a ユーザー, I want Remote UI（モバイル/Web版）からもイベントログを閲覧できること, so that 外出先でもワークフロー履歴を確認できる

#### Acceptance Criteria

1. The system shall イベントログビューアをsharedコンポーネントとして実装する
2. The system shall Electron版とRemote UI版で同一のUIコンポーネントを使用する
3. The system shall WebSocket API経由でイベントログを取得できるようにする
4. The system shall IPC API経由でイベントログを取得できるようにする（Electron版）

### Requirement 6: イベントログサービス

**Objective:** As a 開発者, I want イベントログの記録が一元化されていること, so that 各機能から一貫した方法でイベントを記録できる

#### Acceptance Criteria

1. The system shall EventLogServiceをメインプロセスに実装する
2. The system shall EventLogServiceがイベントの記録・読み取りを一元管理する
3. The system shall 既存のサービス（agentProcess、autoExecutionCoordinator等）からEventLogServiceを呼び出せるようにする
4. The system shall イベント記録がファイル書き込みエラーで失敗しても、元の処理に影響を与えないようにする

## Out of Scope

- プロジェクト横断でのイベントログ集約表示
- イベントログの検索/フィルタ機能（将来の拡張として検討）
- イベントログのエクスポート機能
- イベントログの保持期間制限/自動削除
- リアルタイム通知（トースト等）
- Bugワークフローのイベントログ（Spec単位の機能として実装）

## Open Questions

- イベントログファイルのサイズが肥大化した場合の対策（ローテーション等）は設計フェーズで検討
- イベントの詳細度（verbose/minimal）の切り替えは将来の拡張として検討可能
