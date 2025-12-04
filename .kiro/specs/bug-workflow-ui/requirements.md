# Requirements Document

## Introduction

Bug Workflow UIは、SDD ManagerのElectron版サイドバーにバグ管理機能を追加する機能である。既存のSpec一覧（SpecList）と新規のバグ一覧（BugList）をタブで切り替え可能なDocsTabs親コンポーネントを導入し、`.kiro/bugs/`ディレクトリ内のバグを管理・表示する。各バグに対してReport → Analyze → Fix → Verifyのワークフロー進捗を可視化し、AIエージェント経由でバグワークフローコマンド（`/kiro:bug-create`, `/kiro:bug-analyze`, `/kiro:bug-fix`, `/kiro:bug-verify`）を実行可能にする。

## Requirements

### Requirement 1: DocsTabs親コンポーネント

**Objective:** As a 開発者, I want サイドバーでSpec一覧とバグ一覧をタブで切り替えたい, so that 仕様開発とバグ管理を統一的なUIで操作できる

#### Acceptance Criteria
1. The DocsTabs shall display two tabs: "Specs" and "Bugs"
2. When ユーザーがタブをクリックする, the DocsTabs shall 対応するリスト（SpecListまたはBugList）を表示する
3. The DocsTabs shall 選択中のタブを視覚的にハイライトする
4. The DocsTabs shall タブ選択状態を維持し、再描画時も保持する

### Requirement 2: BugListコンポーネント

**Objective:** As a 開発者, I want .kiro/bugs/内のバグ一覧を確認したい, so that 現在のバグ状況を把握できる

#### Acceptance Criteria
1. The BugList shall `.kiro/bugs/`ディレクトリ内のバグレポートを一覧表示する
2. The BugList shall 各バグのワークフロー進捗（Report, Analyze, Fix, Verify）をステータスバッジで表示する
3. When ユーザーがバグをクリックする, the BugList shall 対応するバグの詳細をエディタパネルに表示する
4. While プロジェクトが選択されていない状態, the BugList shall 「プロジェクトを選択してください」メッセージを表示する
5. If `.kiro/bugs/`ディレクトリが存在しない場合, the BugList shall 空の状態メッセージを表示する

### Requirement 3: バグ進捗ステータス表示

**Objective:** As a 開発者, I want 各バグのワークフロー進捗を一目で確認したい, so that 対応が必要なバグの状態を素早く把握できる

#### Acceptance Criteria
1. The BugList shall 各バグのbug.jsonからphaseを読み取り、進捗ステータスを決定する
2. The BugList shall Report → Analyze → Fix → Verifyの4段階進捗をステップインジケーターで表示する
3. The BugList shall 完了したフェーズを視覚的に区別する（完了: 塗りつぶし、未完了: アウトライン）
4. The BugList shall 現在のフェーズをハイライト表示する

### Requirement 4: CreateBugDialogコンポーネント

**Objective:** As a 開発者, I want UIからバグを作成したい, so that CLIを使わずに素早くバグ報告を開始できる

#### Acceptance Criteria
1. When ユーザーがBugListの「新規バグ」ボタンをクリックする, the CreateBugDialog shall 開く
2. The CreateBugDialog shall バグ名入力フィールドを提供する
3. The CreateBugDialog shall バグ説明入力フィールド（テキストエリア）を提供する
4. When ユーザーが「作成」ボタンをクリックする and バグ名と説明が入力されている, the CreateBugDialog shall Agentに`/kiro:bug-create`コマンドを送信する
5. If バグ名が空の場合, the CreateBugDialog shall エラーメッセージを表示し作成を阻止する
6. When バグ作成が完了する, the CreateBugDialog shall 閉じてBugListを更新する

### Requirement 5: バグワークフローアクション

**Objective:** As a 開発者, I want UIから各ワークフローステップを実行したい, so that バグ対応を効率的に進められる

#### Acceptance Criteria
1. The BugList shall 選択されたバグに対して実行可能なアクションボタンを表示する
2. When ユーザーが「Analyze」ボタンをクリックする, the BugList shall Agentに`/kiro:bug-analyze`コマンドを送信する
3. When ユーザーが「Fix」ボタンをクリックする, the BugList shall Agentに`/kiro:bug-fix`コマンドを送信する
4. When ユーザーが「Verify」ボタンをクリックする, the BugList shall Agentに`/kiro:bug-verify`コマンドを送信する
5. While Agentがコマンドを実行中, the BugList shall 対象アクションボタンをローディング状態で表示する
6. The BugList shall 現在のフェーズに応じて次に実行可能なアクションのみを有効化する

### Requirement 6: バグストア（状態管理）

**Objective:** As a システム, I want バグ一覧と選択状態を管理したい, so that 複数コンポーネント間でバグ情報を共有できる

#### Acceptance Criteria
1. The bugStore shall バグ一覧（bugs配列）を管理する
2. The bugStore shall 選択中のバグ（selectedBugName）を管理する
3. The bugStore shall バグ一覧を再読み込みするloadBugsアクションを提供する
4. The bugStore shall バグを選択するselectBugアクションを提供する
5. When バグファイルに変更が発生する, the bugStore shall 自動的にバグ一覧を更新する

### Requirement 7: Agentコマンド連携

**Objective:** As a システム, I want バグワークフローコマンドをAgentに送信したい, so that UIからバグ対応ワークフローを実行できる

#### Acceptance Criteria
1. The agentStore shall バグ関連コマンド（`/kiro:bug-create`, `/kiro:bug-analyze`, `/kiro:bug-fix`, `/kiro:bug-verify`）を送信する機能を持つ
2. When コマンド送信が成功する, the agentStore shall Agent出力をログパネルに表示する
3. If コマンド送信が失敗する場合, the agentStore shall エラー通知を表示する
4. The agentStore shall コマンド実行中の状態（isExecuting）を管理する
