# SDD Orchestrator ユースケースカタログ

## 概要

### 目的

E2Eテストカバレッジの測定基盤として、SDD Orchestratorの全ユースケース（UI操作 + バックグラウンドプロセス）をカタログ化する。

### 更新方針

- Spec/Bug完了時の tasks.md に「usecases.md 更新」タスクを含める（手動運用）
- 新機能追加・既存機能変更時に該当ユースケースを追加・修正する

### カテゴリ説明

| カテゴリ | 説明 |
|----------|------|
| UC1: プロジェクト管理 | プロジェクト選択・切り替え・外部連携 |
| UC2: Spec ライフサイクル | 仕様の作成からInspectionまでの全フェーズ |
| UC3: Bug ワークフロー | バグ報告から検証・デプロイまでの軽量フロー |
| UC4: エージェント管理 | AIエージェントの操作・監視・制御 |
| UC5: プロジェクトファイル編集 | CLAUDE.md、Steering、Docsの閲覧・編集 |
| UC6: Git/VCS 操作 | Git差分表示、Worktree管理、VCSスキーム |
| UC7: リモートアクセス | Remote UI、Cloudflare Tunnel、MCP Server |
| UC8: ツール・設定 | Commandsetインストール、CLI、プロジェクト設定 |
| UC9: スケジュール実行 | 定期タスクの設定・実行 |
| UC10: バックグラウンドプロセス | ファイル監視、Watchdog、メトリクス等の自動プロセス |
| UC11: レイアウト・ナビゲーション | タブ切替、ペインリサイズ、ショートカット |

### テストタイプ凡例

| タイプ | 説明 |
|--------|------|
| Electron E2E | WebdriverIO によるデスクトップアプリE2Eテスト |
| Web E2E | Playwright によるRemote UI E2Eテスト |
| 自動プロセス | バックグラウンド処理（直接的なUI操作なし） |

---

## UC1: プロジェクト管理

### UC1.1: プロジェクト選択（フォルダ選択ダイアログ）

- **前提条件**: アプリ起動済み、プロジェクト未選択（ProjectSelectionView表示中）
- **操作手順**:
  1. 「フォルダを選択」ボタンをクリック
  2. OSネイティブのフォルダ選択ダイアログでプロジェクトディレクトリを選択
  3. 「開く」を押下
- **期待結果**:
  - プロジェクトが読み込まれ、Spec一覧・Bug一覧・プロジェクトファイルが表示される
  - ウィンドウタイトルにプロジェクト名が表示される
  - 最近のプロジェクトリストに追加される
  - `.kiro/` ディレクトリのバリデーションが実行される
- **関連 data-testid**: `project-selection-view`
- **テストタイプ**: Electron E2E

### UC1.2: プロジェクト選択（パス入力）

- **前提条件**: アプリ起動済み、プロジェクト未選択
- **操作手順**:
  1. パス入力フィールドにプロジェクトパスを入力
  2. Enterキーまたは確定ボタンを押下
- **期待結果**:
  - UC1.1と同様のプロジェクト読み込み処理が実行される
  - 無効なパスの場合はエラーメッセージが表示される
- **関連 data-testid**: `project-selection-view`
- **テストタイプ**: Electron E2E

### UC1.3: 最近のプロジェクトから選択

- **前提条件**: 過去にプロジェクトを開いた履歴がある
- **操作手順**:
  1. ProjectSelectionViewの最近のプロジェクトリストからプロジェクトをクリック
- **期待結果**:
  - 選択したプロジェクトが読み込まれる
  - リストの順序が更新される（最新が先頭）
- **関連 data-testid**: `project-selection-view`
- **テストタイプ**: Electron E2E

### UC1.4: プロジェクト切り替え（実行中エージェント警告）

- **前提条件**: プロジェクトが選択済み、エージェントが実行中
- **操作手順**:
  1. メニュー > ファイル > プロジェクトを開く（Cmd+O）
  2. 新しいプロジェクトフォルダを選択
  3. 実行中エージェント警告ダイアログが表示される
  4. 「続行」を選択
- **期待結果**:
  - 確認ダイアログで実行中エージェント数が表示される
  - 「続行」で新プロジェクトに切り替わる
  - 「キャンセル」で元のプロジェクトに留まる
- **関連 data-testid**: なし（OSネイティブダイアログ + ProjectSwitchConfirmDialog）
- **テストタイプ**: Electron E2E

### UC1.5: VSCodeで開く

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. プロジェクトの「VSCodeで開く」アクションを実行
- **期待結果**:
  - VSCodeが起動し、現在のプロジェクトディレクトリが開かれる
- **関連 data-testid**: なし（tRPC `misc.openInVscode` 呼び出し）
- **テストタイプ**: Electron E2E

### UC1.6: SSH リモートプロジェクト接続

- **前提条件**: SSH接続可能なリモートホストが存在する
- **操作手順**:
  1. SSH接続ダイアログを開く
  2. SSH URI（`ssh://user@host/path`）を入力
  3. 「接続」ボタンをクリック
- **期待結果**:
  - SSHセッションが確立される
  - リモートプロジェクトのファイルが読み込まれる
  - SSHステータスインジケーターが接続状態を表示
- **関連 data-testid**: `ssh-connect-dialog`, `ssh-uri-input`, `ssh-connect-submit-button`, `ssh-status-indicator`
- **テストタイプ**: Electron E2E

### UC1.7: SSH ホスト鍵検証

- **前提条件**: 未知のSSHホストに初回接続
- **操作手順**:
  1. SSH接続を開始
  2. ホスト鍵検証ダイアログが表示される
  3. フィンガープリントを確認し「Accept」をクリック
- **期待結果**:
  - ホスト鍵が承認され、接続が継続される
  - 「Cancel」の場合は接続が中断される
- **関連 data-testid**: `ssh-auth-hostkey-dialog`, `ssh-auth-fingerprint`, `ssh-auth-accept-button`, `ssh-auth-cancel-button`
- **テストタイプ**: Electron E2E

### UC1.8: SSH パスワード/パスフレーズ認証

- **前提条件**: パスワードまたはパスフレーズ認証が必要なSSHホスト
- **操作手順**:
  1. SSH接続を開始
  2. 認証ダイアログが表示される
  3. パスワード/パスフレーズを入力し「Submit」をクリック
- **期待結果**:
  - 認証が成功し、リモートプロジェクトに接続される
  - 認証失敗時はエラーメッセージが表示される
- **関連 data-testid**: `ssh-auth-password-dialog`, `ssh-auth-input`, `ssh-auth-submit-button`
- **テストタイプ**: Electron E2E

---

## UC2: Spec ライフサイクル

### UC2.1: Spec作成（通常モード）

- **前提条件**: プロジェクトが選択済み、Specsタブ表示中
- **操作手順**:
  1. Spec一覧ヘッダーの「+」ボタンをクリック
  2. CreateSpecDialogが表示される
  3. 説明（description）を入力
  4. Worktreeモードスイッチがオフであることを確認
  5. 「作成」ボタンをクリック
- **期待結果**:
  - `.kiro/specs/{spec-name}/` ディレクトリが作成される
  - `spec.json` が生成される
  - spec-planエージェントが起動し、要件の対話的収集が開始される
  - Spec一覧に新しいSpecが表示される
- **関連 data-testid**: `spec-list-header`, `worktree-mode-switch`, `agent-icon`
- **テストタイプ**: Electron E2E

### UC2.2: Spec作成（Worktreeモード）

- **前提条件**: UC2.1と同様、Gitリポジトリであること
- **操作手順**:
  1. CreateSpecDialogを開く
  2. 説明を入力
  3. Worktreeモードスイッチをオンにする
  4. 「作成」ボタンをクリック
- **期待結果**:
  - UC2.1の結果に加え、Git Worktreeが作成される
  - Specアイテムにworktreeバッジが表示される
  - エージェントはworktreeディレクトリ内で動作する
- **関連 data-testid**: `worktree-mode-switch`, `worktree-badge`, `agent-branch-icon`
- **テストタイプ**: Electron E2E

### UC2.3: Spec一覧表示・フィルタリング

- **前提条件**: プロジェクトに1つ以上のSpecが存在する
- **操作手順**:
  1. Specsタブをクリック
  2. フィルターオプションでフェーズを選択
  3. ソート順を変更
- **期待結果**:
  - Spec一覧が表示される（名前、フェーズバッジ、更新日、実行中エージェント数）
  - フィルター適用で該当フェーズのSpecのみ表示される
  - ソート順が反映される
- **関連 data-testid**: `spec-list-header`, `phase-badge`, `running-agent-count`, `updated-date`
- **テストタイプ**: Electron E2E, Web E2E

### UC2.4: Spec選択・詳細表示

- **前提条件**: Spec一覧にSpecが存在する
- **操作手順**:
  1. Spec一覧からSpecをクリック
- **期待結果**:
  - 中央ペインにArtifactEditor（requirements.md、design.md、tasks.md等のタブ）が表示される
  - 右サイドバーにWorkflowViewとAgentListPanelが表示される
  - 各フェーズの進捗状況が表示される
  - Worktreeモードの場合、worktreeセクションが表示される
- **関連 data-testid**: `workflow-view`, `phase-execution-panel`, `worktree-section`
- **テストタイプ**: Electron E2E, Web E2E

### UC2.5: Requirements フェーズ実行

- **前提条件**: Specが選択済み、requirementsフェーズがpending
- **操作手順**:
  1. WorkflowViewでRequirementsフェーズの「実行」ボタンをクリック
- **期待結果**:
  - spec-requirementsエージェントが起動される
  - フェーズステータスが「executing」に変わる
  - AgentListPanelに実行中エージェントが表示される
  - 完了後、requirements.mdが生成され、フェーズが「generated」になる
- **関連 data-testid**: `progress-icon-executing`, `progress-icon-generated`
- **テストタイプ**: Electron E2E

### UC2.6: Design フェーズ実行

- **前提条件**: Requirementsフェーズが承認済み
- **操作手順**:
  1. WorkflowViewでDesignフェーズの「実行」ボタンをクリック
- **期待結果**:
  - spec-designエージェントが起動される
  - 完了後、design.mdが生成される
- **関連 data-testid**: `progress-icon-executing`, `progress-icon-generated`
- **テストタイプ**: Electron E2E

### UC2.7: Tasks フェーズ実行

- **前提条件**: Designフェーズが承認済み
- **操作手順**:
  1. WorkflowViewでTasksフェーズの「実行」ボタンをクリック
- **期待結果**:
  - spec-tasksエージェントが起動される
  - 完了後、tasks.mdが生成される
- **関連 data-testid**: `progress-icon-executing`, `progress-icon-generated`
- **テストタイプ**: Electron E2E

### UC2.8: Implementation フェーズ実行（個別タスク）

- **前提条件**: Tasksフェーズが承認済み、tasks.mdにタスクが定義されている
- **操作手順**:
  1. ImplPhasePanelで実行対象タスクを確認
  2. 「実行」ボタンをクリック
  3. （オプション）並列モードを有効にする
- **期待結果**:
  - spec-implエージェントが起動される
  - TaskProgressViewにタスク進捗が表示される
  - 個別タスクのステータスが更新される（pending → running → completed）
  - Worktreeモードの場合、worktree内で実装が行われる
- **関連 data-testid**: `impl-phase-panel`, `impl-execute-button`, `progress-bar`, `task-status-completed`, `task-status-running`, `task-status-pending`, `parallel-mode-toggle`
- **テストタイプ**: Electron E2E

### UC2.9: フェーズ承認

- **前提条件**: フェーズが「generated」状態
- **操作手順**:
  1. WorkflowViewで承認対象フェーズの「承認」ボタンをクリック
- **期待結果**:
  - フェーズステータスが「approved」に変わる
  - 次のフェーズが実行可能になる
  - メトリクスにhuman review時間が記録される
- **関連 data-testid**: `progress-icon-approved`
- **テストタイプ**: Electron E2E

### UC2.10: フェーズ却下（理由入力）

- **前提条件**: フェーズが「generated」状態
- **操作手順**:
  1. フェーズの「却下」ボタンをクリック
  2. RejectDialogが表示される
  3. 却下理由を入力
  4. 「却下」ボタンをクリック
- **期待結果**:
  - フェーズステータスが「pending」に戻る
  - 却下理由がspec.jsonに記録される
  - 再実行時に却下理由がエージェントに渡される
- **関連 data-testid**: `progress-icon-pending`
- **テストタイプ**: Electron E2E

### UC2.11: Spec Auto-Execution 開始/停止

- **前提条件**: Specが選択済み、少なくとも1つのフェーズが未完了
- **操作手順**:
  1. SpecWorkflowFooterの「Auto Execution」ボタンをクリック（開始）
  2. 再度クリック（停止）
- **期待結果**:
  - 開始: フェーズが自動的に順番に実行される（requirements → design → tasks → implementation）
  - 各フェーズの自動承認設定に基づき、承認が自動化される
  - 停止: 現在実行中のフェーズ完了後に停止する
- **関連 data-testid**: `auto-execution-button`, `auto-permission-toggle`, `auto-permitted-icon`, `auto-forbidden-icon`
- **テストタイプ**: Electron E2E

### UC2.12: Inspection フェーズ

- **前提条件**: Implementationフェーズが完了済み
- **操作手順**:
  1. InspectionPanelの「Start Inspection」ボタンをクリック
  2. Inspection結果がGO/NO-GOで表示される
  3. NO-GOの場合、「Execute Fix」ボタンで修正を実行
- **期待結果**:
  - Inspectionエージェントが起動され、品質チェックが実行される
  - GO判定: デプロイ可能状態
  - NO-GO判定: 修正が必要、Fix実行可能
- **関連 data-testid**: `inspection-panel`, `start-inspection-button`, `go-nogo-badge-go`, `go-nogo-badge-nogo`, `execute-fix-button`
- **テストタイプ**: Electron E2E

### UC2.13: Spec Ask（質問エージェント）

- **前提条件**: Specが選択済み
- **操作手順**:
  1. Specの「Ask」ボタンをクリック
  2. AskAgentDialogが表示される
  3. 質問プロンプトを入力
  4. 「実行」ボタンをクリック
- **期待結果**:
  - spec-askエージェントが起動される
  - Spec文脈を持った回答がエージェントログに表示される
- **関連 data-testid**: `spec-ask-button`, `ask-agent-dialog`, `ask-prompt-input`, `ask-execute-button`
- **テストタイプ**: Electron E2E, Web E2E

### UC2.14: Document Review 実行

- **前提条件**: Specが選択済み、レビュー対象フェーズが存在する
- **操作手順**:
  1. DocumentReviewPanelの「Start Review」ボタンをクリック
  2. レビュー結果が表示される
  3. 課題がある場合、「Reply」ボタンで対応
  4. 必要に応じて「Apply Fix」で修正を適用
- **期待結果**:
  - document-reviewエージェントが起動される
  - レビュー課題がラウンドごとに表示される
  - Reply/Fix実行で課題が解決される
- **関連 data-testid**: `document-review-panel`, `start-review-button`, `execute-reply-button`, `apply-fix-button`, `progress-indicator-checked`, `progress-indicator-unchecked`
- **テストタイプ**: Electron E2E

### UC2.15: Spec Worktreeマージ

- **前提条件**: Worktreeモードで全フェーズ完了
- **操作手順**:
  1. マージアクションを実行
- **期待結果**:
  - Worktreeブランチがmainにマージされる
  - Worktreeが削除される
  - Specのworktreeフラグが解除される
- **関連 data-testid**: なし（tRPC `spec.executeSpecMerge` 呼び出し）
- **テストタイプ**: Electron E2E

---

## UC3: Bug ワークフロー

### UC3.1: Bug作成（通常モード）

- **前提条件**: プロジェクトが選択済み、Bugsタブ表示中
- **操作手順**:
  1. Bug一覧の「+」ボタンをクリック
  2. CreateBugDialogが表示される
  3. バグの説明を入力
  4. Worktreeモードスイッチがオフであることを確認
  5. 「作成」ボタンをクリック
- **期待結果**:
  - `.kiro/bugs/{bug-name}/` ディレクトリが作成される
  - `bug.json` が生成される
  - bug-createエージェントが起動され、バグレポートが作成される
  - Bug一覧に新しいBugが表示される
- **関連 data-testid**: `create-bug-dialog`, `bug-description-input`, `worktree-mode-switch`, `create-button`
- **テストタイプ**: Electron E2E

### UC3.2: Bug作成（Worktreeモード）

- **前提条件**: UC3.1と同様、Gitリポジトリであること
- **操作手順**:
  1. CreateBugDialogを開く
  2. 説明を入力
  3. Worktreeモードスイッチをオンにする
  4. 「作成」ボタンをクリック
- **期待結果**:
  - UC3.1の結果に加え、Git Worktreeが作成される
  - Bugアイテムにworktreeバッジが表示される
- **関連 data-testid**: `create-bug-dialog`, `worktree-mode-switch`, `worktree-badge`
- **テストタイプ**: Electron E2E

### UC3.3: Bug一覧表示

- **前提条件**: プロジェクトに1つ以上のBugが存在する
- **操作手順**:
  1. Bugsタブをクリック
- **期待結果**:
  - Bug一覧が表示される（名前、フェーズバッジ、更新日、実行中エージェント数）
  - フェーズによるフィルタリングが可能
- **関連 data-testid**: `phase-badge`, `running-agent-count`, `updated-date`, `worktree-badge`
- **テストタイプ**: Electron E2E, Web E2E

### UC3.4: Analyze フェーズ実行

- **前提条件**: Bugが選択済み、Reportフェーズが完了
- **操作手順**:
  1. BugWorkflowViewでAnalyzeフェーズの「実行」ボタンをクリック
- **期待結果**:
  - bug-analyzeエージェントが起動される
  - 根本原因の調査結果がanalysis.mdに記録される
  - フェーズステータスが「completed」に変わる
- **関連 data-testid**: `bug-phase-status-executing`, `bug-phase-status-completed`
- **テストタイプ**: Electron E2E

### UC3.5: Fix フェーズ実行

- **前提条件**: Analyzeフェーズが完了
- **操作手順**:
  1. BugWorkflowViewでFixフェーズの「実行」ボタンをクリック
- **期待結果**:
  - bug-fixエージェントが起動される
  - 修正がコードベースに適用される
- **関連 data-testid**: `bug-phase-status-executing`, `bug-phase-status-completed`
- **テストタイプ**: Electron E2E

### UC3.6: Verify フェーズ実行

- **前提条件**: Fixフェーズが完了
- **操作手順**:
  1. BugWorkflowViewでVerifyフェーズの「実行」ボタンをクリック
- **期待結果**:
  - bug-verifyエージェントが起動される
  - 修正の検証結果が記録される
- **関連 data-testid**: `bug-phase-status-executing`, `bug-phase-status-completed`
- **テストタイプ**: Electron E2E

### UC3.7: Deploy/Merge フェーズ実行

- **前提条件**: Verifyフェーズが完了、Worktreeモードの場合
- **操作手順**:
  1. BugWorkflowViewでDeployフェーズの「実行」ボタンをクリック
- **期待結果**:
  - Worktreeモード: ブランチがmainにマージされ、Worktreeが削除される
  - 通常モード: デプロイフェーズが完了マークされる
- **関連 data-testid**: `bug-phase-status-completed`
- **テストタイプ**: Electron E2E

### UC3.8: Bug Auto-Execution 開始/停止

- **前提条件**: Bugが選択済み
- **操作手順**:
  1. BugWorkflowFooterの「Auto Execution」ボタンをクリック（開始）
  2. 再度クリック（停止）
- **期待結果**:
  - 開始: analyze → fix → verify → deploy が自動的に順番に実行される
  - 停止: 現在実行中のフェーズ完了後に停止する
- **関連 data-testid**: `bug-auto-execute-button`, `auto-execution-status`, `bug-auto-execute-stop`
- **テストタイプ**: Electron E2E, Web E2E

### UC3.9: Worktree変換（通常→Worktree）

- **前提条件**: 通常モードのBugが選択済み、Gitリポジトリであること
- **操作手順**:
  1. BugWorkflowFooterの「Convert to Worktree」ボタンをクリック
- **期待結果**:
  - Git Worktreeが作成される
  - Bugがworktreeモードに変換される
  - worktreeバッジが表示される
- **関連 data-testid**: `bug-convert-worktree-button`, `worktree-badge`
- **テストタイプ**: Electron E2E

### UC3.10: Worktreeリベース

- **前提条件**: Worktreeモードのbugが選択済み
- **操作手順**:
  1. BugWorkflowFooterの「Rebase from main」ボタンをクリック
- **期待結果**:
  - Worktreeブランチがmain/masterからリベースされる
  - コンフリクトがある場合はエラーが表示される
- **関連 data-testid**: `bug-rebase-from-main-button`
- **テストタイプ**: Electron E2E

---

## UC4: エージェント管理

### UC4.1: エージェントログ表示

- **前提条件**: エージェントが1つ以上存在する（実行中または完了）
- **操作手順**:
  1. AgentListPanelでエージェントをクリック
  2. 下部ペインのAgentLogPanelにログが表示される
- **期待結果**:
  - エージェントのログエントリが時系列で表示される
  - エンジンタグ、セッションID、トークン数が表示される
  - 実行中エージェントはリアルタイムでログが更新される
- **関連 data-testid**: `engine-tag`, `copy-session-id`, `running-indicator`, `token-display`, `log-entry`, `text-block`, `tool-use-header`, `tool-result-block`, `result-block`
- **テストタイプ**: Electron E2E

### UC4.2: エージェント停止

- **前提条件**: 実行中のエージェントが存在する
- **操作手順**:
  1. AgentListPanelで実行中エージェントの「停止」ボタンをクリック
- **期待結果**:
  - エージェントプロセスが終了される
  - ステータスが「stopped」に変わる
  - ログに停止記録が追加される
- **関連 data-testid**: なし（AgentListPanel内のボタン）
- **テストタイプ**: Electron E2E

### UC4.3: エージェント削除

- **前提条件**: 停止済みまたは完了したエージェントが存在する
- **操作手順**:
  1. AgentListPanelでエージェントの「削除」ボタンをクリック
- **期待結果**:
  - エージェントレコードが削除される
  - AgentListPanelから該当エージェントが消える
- **関連 data-testid**: なし（AgentListPanel内のボタン）
- **テストタイプ**: Electron E2E

### UC4.4: エージェント入力送信（resume）

- **前提条件**: 完了またはエラー状態のエージェントが存在する
- **操作手順**:
  1. AgentLogPanelでエージェントを選択
  2. AgentInputPanelにテキストを入力
  3. Enterキーで送信（Option+Enterで改行）
- **期待結果**:
  - エージェントが再開（resume）される
  - 入力テキストがエージェントに渡される
  - エージェントステータスが「running」に変わる
- **関連 data-testid**: なし（AgentInputPanel）
- **テストタイプ**: Electron E2E

### UC4.5: 続行指示

- **前提条件**: エージェントが完了状態で、さらなる操作が可能
- **操作手順**:
  1. AgentListPanelの「続行」ボタンをクリック
- **期待結果**:
  - エージェントが空入力でresume実行される
  - エージェントが処理を継続する
- **関連 data-testid**: なし（AgentListPanel内のボタン）
- **テストタイプ**: Electron E2E

### UC4.6: Project Ask（プロジェクトレベル質問）

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. ProjectAgentPanelの「Ask」ボタンをクリック
  2. AskAgentDialogが表示される
  3. 質問プロンプトを入力
  4. 「実行」ボタンをクリック
- **期待結果**:
  - project-askエージェントが起動される
  - プロジェクト全体の文脈を持った回答がログに表示される
- **関連 data-testid**: `project-ask-button`, `ask-agent-dialog`, `ask-prompt-input`, `ask-execute-button`
- **テストタイプ**: Electron E2E, Web E2E

### UC4.7: Project Agent 起動

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. ProjectAgentPanel経由でプロジェクトレベルのエージェントを起動
- **期待結果**:
  - Spec/Bugに紐付かないプロジェクトレベルのエージェントが起動される
  - ProjectAgentPanelにエージェントが表示される
- **関連 data-testid**: `project-agent-panel`, `project-agent-panel-header`
- **テストタイプ**: Electron E2E

---

## UC5: プロジェクトファイル編集

### UC5.1: CLAUDE.md 編集

- **前提条件**: プロジェクトが選択済み、Projectタブ表示中
- **操作手順**:
  1. ProjectFileListの「CLAUDE.md」セクションからCLAUDE.mdを選択
  2. ProjectFileEditorでEditモードに切り替え
  3. 内容を編集
  4. Cmd+S で保存
- **期待結果**:
  - CLAUDE.mdの内容がエディタに表示される
  - 編集後、dirty indicatorが表示される
  - 保存後、ファイルが更新される
- **関連 data-testid**: `project-file-list`, `project-file-editor`, `dirty-indicator`, `edit-mode-button`, `preview-mode-button`
- **テストタイプ**: Electron E2E

### UC5.2: Steering ファイル編集

- **前提条件**: プロジェクトが選択済み、`.kiro/steering/` にファイルが存在
- **操作手順**:
  1. ProjectFileListの「Steering Files」セクションからファイルを選択
  2. 内容を編集・保存
- **期待結果**:
  - Steeringファイルの内容がエディタに表示される
  - 編集・保存が正常に動作する
- **関連 data-testid**: `project-file-list`, `project-file-editor`
- **テストタイプ**: Electron E2E

### UC5.3: Docs ファイル閲覧

- **前提条件**: プロジェクトが選択済み、`docs/` ディレクトリにファイルが存在
- **操作手順**:
  1. ProjectFileListの「Docs」セクションでフォルダを展開
  2. ファイルを選択（.md, .pdf, .html）
- **期待結果**:
  - .md ファイル: MarkdownエディタまたはプレビューでRendering
  - .pdf ファイル: PdfViewerで表示
  - .html ファイル: HtmlViewerで表示
- **関連 data-testid**: `docs-tree-section`, `folder-expanded-icon`, `folder-collapsed-icon`, `file-icon-md`, `file-icon-pdf`, `file-icon-html`, `pdf-viewer`, `html-viewer`
- **テストタイプ**: Electron E2E

### UC5.4: ファイル保存（Cmd+S）

- **前提条件**: ファイルが編集中（dirty状態）
- **操作手順**:
  1. Cmd+S（macOS）/ Ctrl+S（Windows/Linux）を押下
- **期待結果**:
  - ファイルが保存される
  - dirty indicatorが消える
- **関連 data-testid**: `dirty-indicator`
- **テストタイプ**: Electron E2E

### UC5.5: 外部変更検知ダイアログ（Reload/Ignore）

- **前提条件**: エディタでファイルを開いている状態で、外部プロセスがファイルを変更
- **操作手順**:
  1. ファイル変更が検知される
  2. ExternalChangeDialogが表示される
  3. 「Reload」または「Ignore」を選択
- **期待結果**:
  - Reload: エディタの内容がディスク上の最新内容に更新される
  - Ignore: 現在のエディタ内容を維持する
- **関連 data-testid**: `external-change-dialog`
- **テストタイプ**: Electron E2E

### UC5.6: 未保存変更ダイアログ

- **前提条件**: ファイルが編集中（dirty状態）で、別のファイルに切り替えようとする
- **操作手順**:
  1. 別のファイルをクリック
  2. UnsavedChangesDialogが表示される
  3. 「続行」または「キャンセル」を選択
- **期待結果**:
  - 続行: 変更が破棄され、新しいファイルが表示される
  - キャンセル: 現在のファイルに留まる
- **関連 data-testid**: なし（UnsavedChangesDialog）
- **テストタイプ**: Electron E2E

### UC5.7: Edit/Preview モード切替

- **前提条件**: Markdownファイルがエディタで開かれている
- **操作手順**:
  1. モード切替ボタンでEdit/Previewを切り替え
- **期待結果**:
  - Edit: Markdown記法で編集可能
  - Preview: HTMLレンダリングされたプレビュー表示（Mermaidダイアグラム含む）
- **関連 data-testid**: `mode-toggle-group`, `edit-mode-button`, `preview-mode-button`
- **テストタイプ**: Electron E2E

---

## UC6: Git/VCS 操作

### UC6.1: Git差分表示

- **前提条件**: プロジェクトがGitリポジトリ、変更ファイルが存在する
- **操作手順**:
  1. CenterPaneContainerでGit Diffビューに切り替え
  2. GitFileTreeから変更ファイルを選択
- **期待結果**:
  - ファイルツリーに変更ファイル一覧が表示される（A: Added, M: Modified, D: Deleted, ??: Untracked）
  - 選択ファイルのdiffが表示される（Unified/Split/Sourceモード切替可能）
  - バイナリファイルはバイナリインジケーターが表示される
  - 画像ファイルはImageViewerで表示される
- **関連 data-testid**: `git-view-container`, `git-file-tree`, `file-list`, `status-icon-A`, `status-icon-M`, `status-icon-D`, `status-icon-??`, `diff-container`, `diff-content`, `diff-mode-unified`, `diff-mode-split`, `diff-mode-source`, `binary-file-indicator`, `image-viewer`
- **テストタイプ**: Electron E2E

### UC6.2: Worktree作成（Spec用）

- **前提条件**: Specが通常モードで存在、Gitリポジトリであること
- **操作手順**:
  1. SpecWorkflowFooterの「Convert to Worktree」ボタンをクリック
- **期待結果**:
  - Git Worktreeが作成される（feature/{spec-name}ブランチ）
  - Specがworktreeモードに変換される
  - 以降のエージェントはworktreeディレクトリ内で動作する
- **関連 data-testid**: `convert-to-worktree-button`, `worktree-section`
- **テストタイプ**: Electron E2E

### UC6.3: Worktree変換・マージ（Spec用）

- **前提条件**: WorktreeモードのSpecが全フェーズ完了
- **操作手順**:
  1. マージアクションを実行
- **期待結果**:
  - Worktreeブランチがmain/masterにマージされる
  - Worktreeが削除される
- **関連 data-testid**: なし（tRPC呼び出し）
- **テストタイプ**: Electron E2E

### UC6.4: Worktreeリベース（Spec用）

- **前提条件**: WorktreeモードのSpecが選択済み
- **操作手順**:
  1. SpecWorkflowFooterの「Rebase from main」ボタンをクリック
- **期待結果**:
  - Worktreeブランチがmain/masterからリベースされる
- **関連 data-testid**: `rebase-from-main-button`
- **テストタイプ**: Electron E2E

### UC6.5: VCSスキーム選択

- **前提条件**: プロジェクト設定ダイアログが開いている
- **操作手順**:
  1. VcsSchemeSelector でGitまたはJujutsuを選択
- **期待結果**:
  - VCSスキームが変更される
  - 以降のVCS操作が選択したスキームで実行される
- **関連 data-testid**: `vcs-scheme-selector`, `vcs-scheme-selector-button`, `vcs-scheme-dropdown`
- **テストタイプ**: Electron E2E

---

## UC7: リモートアクセス

### UC7.1: Remote UIサーバー起動/停止

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. メニュー > ツール > Remote Accessまたはリモートアクセスダイアログを開く
  2. サーバーの有効/無効チェックボックスを切り替え
- **期待結果**:
  - 起動: WebSocketサーバーが起動し、接続URLが表示される
  - 停止: サーバーが停止し、接続中クライアントが切断される
- **関連 data-testid**: `server-status`, `auto-start-checkbox`, `connection-url`
- **テストタイプ**: Electron E2E

### UC7.2: QRコード表示

- **前提条件**: Remote UIサーバーが起動済み
- **操作手順**:
  1. RemoteAccessPanelを確認
- **期待結果**:
  - 接続URLのQRコードが表示される
  - モバイルデバイスでスキャンしてアクセス可能
- **関連 data-testid**: `qr-code`, `connection-url`
- **テストタイプ**: Electron E2E

### UC7.3: Cloudflare Tunnel設定

- **前提条件**: cloudflaredがインストール済み
- **操作手順**:
  1. リモートアクセスダイアログのCloudflare設定タブを開く
  2. Tunnel Tokenを入力して保存
  3. Tunnelを開始
- **期待結果**:
  - Tunnelが確立され、外部URLが表示される
  - Tunnel用QRコードが表示される
- **関連 data-testid**: `tunnel-url`, `tunnel-qr-code`
- **テストタイプ**: Electron E2E

### UC7.4: MCP Server 起動/停止/設定

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. リモートアクセスダイアログのMCPタブを開く
  2. MCP Serverの有効/無効を切り替え
  3. （オプション）ポート番号を変更
- **期待結果**:
  - 起動: MCP Serverが指定ポートで起動
  - `claude mcp add` コマンドが表示される
  - 停止: MCP Serverが停止
- **関連 data-testid**: `mcp-status-indicator`
- **テストタイプ**: Electron E2E

---

## UC8: ツール・設定

### UC8.1: Commandset インストール（プロファイル選択）

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. メニュー > ツール > Install Commandset
  2. CommandsetInstallDialogが表示される
  3. プロファイルを選択（cc-sdd / cc-sdd-agent / spec-manager）
  4. 「インストール」ボタンをクリック
  5. 共通コマンドの上書き確認がある場合は承認
- **期待結果**:
  - 選択したプロファイルのコマンドセットが `.claude/commands/` にインストールされる
  - インストール結果サマリーが表示される
- **関連 data-testid**: なし（CommandsetInstallDialog）
- **テストタイプ**: Electron E2E

### UC8.2: sdd CLI インストール

- **前提条件**: アプリが起動済み
- **操作手順**:
  1. メニュー > ツール > Install sdd CLI
  2. CliInstallDialogが表示される
  3. インストール先を選択（User / System）
  4. 「インストール」ボタンをクリック
- **期待結果**:
  - sdd CLIが指定パスにインストールされる
  - インストール結果が表示される
- **関連 data-testid**: `cli-install-dialog`, `cli-install-location-user`, `cli-install-location-system`, `cli-install-submit-button`, `cli-install-result`
- **テストタイプ**: Electron E2E

### UC8.3: プロジェクト設定ダイアログ

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. プロジェクト設定ダイアログを開く
  2. レビュースキーム、LLMエンジン、VCSスキーム等を設定
  3. 設定を保存
- **期待結果**:
  - 設定が保存され、以降の操作に反映される
- **関連 data-testid**: `close-button`（ProjectSettingsDialog）
- **テストタイプ**: Electron E2E

### UC8.4: Skip Permissions トグル

- **前提条件**: Specが選択済み、WorkflowView表示中
- **操作手順**:
  1. 各フェーズのauto-permission-toggleを切り替え
- **期待結果**:
  - トグルオン: Auto-Execution時にそのフェーズの承認が自動化される
  - トグルオフ: 手動承認が必要
- **関連 data-testid**: `auto-permission-toggle`, `auto-permitted-icon`, `auto-forbidden-icon`
- **テストタイプ**: Electron E2E

### UC8.5: ツールパス設定

- **前提条件**: リモートアクセスダイアログのToolsタブが開いている
- **操作手順**:
  1. 解決できないツールのパスを手動入力
- **期待結果**:
  - ツールパスが保存され、ステータスが更新される
- **関連 data-testid**: なし（ToolSettingsPanel）
- **テストタイプ**: Electron E2E

---

## UC9: スケジュール実行

### UC9.1: スケジュールタスク設定

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. ProjectAgentPanelのスケジュール設定セクションを開く
  2. ScheduleTaskEditPageでタスク名、プロンプト、スケジュール種別を設定
  3. 「保存」ボタンをクリック
- **期待結果**:
  - スケジュールタスクが保存される
  - タスクリストに表示される
  - 有効/無効トグルで制御可能
- **関連 data-testid**: `schedule-task-list`, `schedule-task-edit-page`, `task-name-input`, `save-button`, `enabled-toggle`
- **テストタイプ**: Electron E2E

### UC9.2: インターバル実行

- **前提条件**: インターバル型のスケジュールタスクが有効
- **操作手順**:
  1. ScheduleTypeSelector で「固定スケジュール」>「インターバル」を選択
  2. 間隔時間を設定（時間単位）
  3. タスクを有効化
- **期待結果**:
  - 指定間隔でタスクが自動実行される
  - 実行中は他のスケジュールタスクはキューに入る
- **関連 data-testid**: `schedule-type-selector`, `category-fixed`, `fixed-type-interval`, `interval-settings`, `hours-interval-input`
- **テストタイプ**: Electron E2E

### UC9.3: 週次実行

- **前提条件**: 週次型のスケジュールタスクが有効
- **操作手順**:
  1. 「固定スケジュール」>「毎週」を選択
  2. 実行曜日と時刻を設定
- **期待結果**:
  - 指定曜日・時刻にタスクが自動実行される
- **関連 data-testid**: `fixed-type-weekly`, `weekly-settings`, `weekday-selector`, `hour-of-day-selector`
- **テストタイプ**: Electron E2E

### UC9.4: アイドル時実行

- **前提条件**: アイドル型のスケジュールタスクが有効
- **操作手順**:
  1. 「条件付き」>「アイドル検出」を選択
  2. アイドル判定時間（分）を設定
- **期待結果**:
  - ユーザーが指定時間操作しなかった場合にタスクが実行される
  - ユーザー操作が再開されるとタスクは次回のアイドル待ちに入る
- **関連 data-testid**: `category-conditional`, `idle-settings`, `idle-minutes-input`, `idle-detection-info-button`
- **テストタイプ**: Electron E2E

### UC9.5: スケジュールタスク即時実行

- **前提条件**: スケジュールタスクが存在する
- **操作手順**:
  1. ScheduleTaskListItemの「実行」ボタンをクリック
  2. ImmediateExecutionWarningDialogが表示される
  3. 確認して実行
- **期待結果**:
  - スケジュール条件に関係なく即座にタスクが実行される
- **関連 data-testid**: `execute-button`, `immediate-execution-warning-dialog`
- **テストタイプ**: Electron E2E

### UC9.6: スケジュールタスク削除

- **前提条件**: スケジュールタスクが存在する
- **操作手順**:
  1. ScheduleTaskListItemの「削除」ボタンをクリック
  2. 確認ダイアログで「削除」を選択
- **期待結果**:
  - タスクが削除される
  - タスクリストから消える
- **関連 data-testid**: `delete-button`, `delete-confirm-dialog`
- **テストタイプ**: Electron E2E

---

## UC10: バックグラウンドプロセス（自動）

### UC10.1: Specファイル監視 → Spec一覧自動更新

- **前提条件**: プロジェクトが選択済み、SpecsWatcherが起動済み
- **トリガー条件**: `.kiro/specs/` 内のファイルが変更される（エージェント実行、外部エディタ等）
- **期待結果**:
  - `SPECS_CHANGED` イベントがEventBusに発火される
  - RendererがtRPC Subscriptionで変更を受信し、Spec一覧を再描画する
  - 新規Spec追加、フェーズ更新がリアルタイムで反映される
- **テストタイプ**: 自動プロセス

### UC10.2: Bugファイル監視 → Bug一覧自動更新

- **前提条件**: プロジェクトが選択済み、BugsWatcherが起動済み
- **トリガー条件**: `.kiro/bugs/` 内のファイルが変更される
- **期待結果**:
  - `BUGS_CHANGED` イベントがEventBusに発火される
  - Bug一覧がリアルタイムで更新される
- **テストタイプ**: 自動プロセス

### UC10.3: Gitインデックス監視 → 差分自動更新

- **前提条件**: プロジェクトがGitリポジトリ、GitFileWatcherが起動済み
- **トリガー条件**: Gitインデックスまたはワーキングツリーに変更が発生
- **期待結果**:
  - `onGitChange` イベントがSubscriptionで通知される
  - GitViewのファイルツリーが自動更新される
- **テストタイプ**: 自動プロセス

### UC10.4: プロジェクトファイル監視 → エディタ自動リロード

- **前提条件**: プロジェクトファイルがエディタで開かれている
- **トリガー条件**: 開いているファイルが外部プロセスによって変更される
- **期待結果**:
  - `onProjectFileChange` イベントが通知される
  - ExternalChangeDialogが表示される（UC5.5参照）
- **テストタイプ**: 自動プロセス

### UC10.5: エージェントレコード監視 → エージェント一覧自動更新

- **前提条件**: エージェントが存在する
- **トリガー条件**: エージェントレコードファイルが変更される（状態遷移、ログ追加等）
- **期待結果**:
  - `AGENT_RECORD_CHANGED` イベントが発火される
  - AgentListPanelが自動更新される
- **テストタイプ**: 自動プロセス

### UC10.6: AgentWatchdog（30秒間隔、孤立エージェント検出）

- **前提条件**: アプリが起動済み
- **トリガー条件**: 30秒間隔の定期実行
- **期待結果**:
  - 孤立エージェント（running状態だがプロセスが存在しない）を検出し、状態を更新
  - ゾンビプロセス（terminal状態だがプロセスが生きている）を検出し、プロセスを終了
- **テストタイプ**: 自動プロセス

### UC10.7: HangDetector（1分間隔、ストールエージェント検出）

- **前提条件**: エージェントが実行中
- **トリガー条件**: 1分間隔の定期実行
- **期待結果**:
  - 設定された閾値以上の時間出力がないエージェントを「hang」として検出
  - ユーザーに通知し、自動停止オプションを提供
- **テストタイプ**: 自動プロセス

### UC10.8: メトリクス記録（エージェント完了時）

- **前提条件**: エージェントが実行中
- **トリガー条件**: エージェントが完了（success/error/stopped）する
- **期待結果**:
  - AI実行時間がメトリクスに記録される
  - Spec/Projectレベルのメトリクスが更新される
  - `onMetricsUpdate` イベントがSubscriptionで通知される
- **関連 data-testid**: `metrics-summary-panel`, `metrics-ai-time`, `metrics-human-time`, `metrics-total-time`, `footer-metrics`
- **テストタイプ**: 自動プロセス

### UC10.9: エージェント完了通知（デスクトップ通知）

- **前提条件**: エージェントが実行中、アプリがバックグラウンド
- **トリガー条件**: エージェントが完了する
- **期待結果**:
  - OSのデスクトップ通知が表示される
  - 通知クリックでアプリがフォアグラウンドに復帰する
- **テストタイプ**: 自動プロセス

### UC10.10: Auto-Execution フェーズ遷移（ドキュメントレビューループ含む）

- **前提条件**: Auto-Executionが開始されている（Spec/Bug）
- **トリガー条件**: フェーズが完了する
- **期待結果**:
  - 次のフェーズが自動的に開始される
  - skip-permission設定に基づき、承認が自動化またはユーザー待ちになる
  - ドキュメントレビューが有効な場合、レビュー→修正ループが自動実行される
  - エラー発生時はリトライまたは停止される
- **テストタイプ**: 自動プロセス

---

## UC11: レイアウト・ナビゲーション

### UC11.1: タブ切替（Specs/Bugs/Project）

- **前提条件**: プロジェクトが選択済み
- **操作手順**:
  1. 左サイドバー上部のタブ（Specs / Bugs / Project）をクリック
- **期待結果**:
  - 選択したタブに対応するコンテンツが表示される
  - Specs: Spec一覧 + WorkflowView
  - Bugs: Bug一覧 + BugWorkflowView
  - Project: ProjectFileList + ProjectFileEditor
- **関連 data-testid**: なし（DocsTabs コンポーネント）
- **テストタイプ**: Electron E2E, Web E2E

### UC11.2: ペインリサイズ

- **前提条件**: アプリが起動済み
- **操作手順**:
  1. ペイン間の境界線（ResizeHandle）をドラッグ
- **期待結果**:
  - ペインサイズが変更される
  - レイアウト設定がプロジェクトごとに永続化される
- **関連 data-testid**: `resize-handle-{direction}`
- **テストタイプ**: Electron E2E

### UC11.3: レイアウトリセット

- **前提条件**: レイアウトがカスタマイズされている
- **操作手順**:
  1. メニュー > 表示 > レイアウトをリセット
- **期待結果**:
  - 全ペインサイズがデフォルト値に戻る
  - 設定が永続化される
- **関連 data-testid**: なし（メニューアクション）
- **テストタイプ**: Electron E2E

### UC11.4: ログ検索（SearchBar）

- **前提条件**: ArtifactEditorでファイルが開かれている
- **操作手順**:
  1. Cmd+F で検索バーを開く
  2. 検索キーワードを入力
  3. 前/次のマッチにナビゲート
  4. （オプション）大文字小文字を区別トグル
- **期待結果**:
  - マッチ箇所がハイライトされる
  - マッチ数が表示される
  - 前/次ボタンでマッチ間を移動できる
- **関連 data-testid**: `search-bar`, `search-input`, `match-count`, `search-prev-button`, `search-next-button`, `case-sensitive-toggle`, `search-close-button`, `search-highlight-layer`, `highlight-active`, `highlight-match`
- **テストタイプ**: Electron E2E

### UC11.5: キーボードショートカット

- **前提条件**: アプリが起動済み
- **操作手順**: 各ショートカットキーを押下
- **期待結果**:

| ショートカット | 動作 |
|----------------|------|
| `Cmd+Shift+N` | 新規ウィンドウ |
| `Cmd+O` | プロジェクトを開く |
| `Cmd+R` | リロード |
| `Cmd+S` | ファイル保存 |
| `Cmd+=` | ズームイン |
| `Cmd+-` | ズームアウト |
| `Cmd+0` | ズームリセット |
| `Ctrl+Cmd+F` | フルスクリーン切替 |

- **テストタイプ**: Electron E2E

### UC11.6: ウィンドウ管理（新規、最小化、フルスクリーン）

- **前提条件**: アプリが起動済み
- **操作手順**:
  1. メニュー > ファイル > 新規ウィンドウ（Cmd+Shift+N）
  2. メニュー > ウィンドウ > 最小化
  3. メニュー > 表示 > フルスクリーン切替
- **期待結果**:
  - 新規ウィンドウ: 独立した新しいウィンドウが開く
  - 最小化: ウィンドウがDockに格納される
  - フルスクリーン: フルスクリーンモードに遷移/解除
- **テストタイプ**: Electron E2E

### UC11.7: イベントログ表示

- **前提条件**: Specが選択済み、実行履歴が存在する
- **操作手順**:
  1. EventLogButtonをクリック
  2. EventLogViewerModalが表示される
- **期待結果**:
  - 実行イベントの履歴が時系列で表示される
  - ローディング/エラー/空の各状態が適切に表示される
- **関連 data-testid**: `event-log-button`, `event-log-modal`, `event-log-modal-close`
- **テストタイプ**: Electron E2E

### UC11.8: レビュー履歴表示

- **前提条件**: ドキュメントレビューが実行済み
- **操作手順**:
  1. DocumentReviewPanel内のレビュー履歴セクションを展開
- **期待結果**:
  - ラウンドごとのレビュー結果が表示される
  - レビュー/返信内容がアコーディオンで展開可能
- **関連 data-testid**: なし（ReviewHistoryView）
- **テストタイプ**: Electron E2E

---

## 付録: Remote UI 固有のユースケース

Remote UI（Web版）は上記ユースケースのサブセットを提供する。以下はRemote UI固有の操作を列挙する。

### RUI-1: モバイルレイアウト

- **前提条件**: Remote UIにモバイルデバイスからアクセス
- **期待結果**: ボトムタブナビゲーション、プルトゥリフレッシュが利用可能
- **関連 data-testid**: `mobile-bottom-tabs`, `remote-status-dot`, `remote-status-text`

### RUI-2: Spec操作（Remote UI）

- **前提条件**: Remote UIが接続済み
- **操作手順**: Spec一覧表示、検索、選択、Ask、Auto-Execution
- **関連 data-testid**: `specs-view`, `specs-search-input`, `specs-list`, `remote-spec-list`, `remote-spec-detail`, `spec-ask-button`, `create-spec-dialog`（Remote版）

### RUI-3: Bug操作（Remote UI）

- **前提条件**: Remote UIが接続済み
- **操作手順**: Bug一覧表示、作成、選択、Auto-Execution
- **関連 data-testid**: `bugs-view`, `remote-bug-list`, `bug-detail-view`, `create-bug-fab`, `create-bug-dialog`（Remote版）, `bug-auto-execute-button`

### RUI-4: プロジェクトファイル閲覧・編集（Remote UI）

- **前提条件**: Remote UIが接続済み
- **操作手順**: CLAUDE.md、Steeringファイルの表示・編集・保存
- **関連 data-testid**: `project-view-loading`, `project-files-claude-section`, `project-files-steering-section`, `save-button`

### RUI-5: エージェントログ表示（Remote UI）

- **前提条件**: Remote UIが接続済み
- **操作手順**: エージェント一覧表示、ログ表示
- **関連 data-testid**: `agent-view`, `agent-log-panel-container`, `agent-empty-state`

### RUI-6: 再接続処理

- **前提条件**: WebSocket接続が切断された
- **期待結果**: ReconnectOverlayが表示され、自動再接続が試行される
- **関連 data-testid**: `reconnect-overlay`, `reconnect-spinner`

---

_updated_at: 2026-02-11_
