# Implementation Plan

## Tasks

- [x] 1. Bugワークフロー用の型定義と状態管理の拡張
- [x] 1.1 (P) BugWorkflowPhase型、BugPhaseStatus型、BugDocumentTab型を定義する
  - BugWorkflowPhase型を`report`, `analyze`, `fix`, `verify`, `deploy`の5値で定義
  - BugPhaseStatus型を`pending`, `completed`, `executing`の3値で定義
  - BugDocumentTab型を`report`, `analysis`, `fix`, `verification`の4値で定義
  - 型定義を`types/bug.ts`または適切な型定義ファイルに配置
  - _Requirements: 2.2, 3.2_

- [x] 1.2 (P) bugStoreにBug削除時の選択状態整合性チェックを追加する
  - refreshBugs関数内でselectedBugの存在確認ロジックを追加
  - 選択中のBugが削除された場合はclearSelectedBugを呼び出す
  - 既存のrefreshBugs処理との整合性を維持
  - _Requirements: 5.4_

- [x] 2. BugPhaseItemコンポーネントの実装
  - フェーズラベル、進捗アイコン、実行ボタンを表示するコンポーネントを作成
  - 進捗状態（pending/completed/executing）に応じたアイコン切り替え
  - 実行中はLoaderアイコン表示とボタン無効化
  - showExecuteButtonプロパティでReportフェーズの実行ボタン非表示に対応
  - 既存PhaseItemのUIデザイン（色、アイコン、間隔）を踏襲
  - _Requirements: 3.3, 4.6, 4.7, 6.2_

- [x] 3. BugWorkflowViewコンポーネントの実装
- [x] 3.1 フェーズステータス算出ロジックを実装する
  - bugDetailのartifacts情報から各フェーズのステータスを算出
  - reportフェーズはartifacts.report.existsで判定
  - analyze/fix/verifyフェーズはartifacts情報と実行中状態で判定
  - deployフェーズは常にpending（ファイル判定なし）または実行中で判定
  - _Requirements: 3.3_

- [x] 3.2 5フェーズのワークフロー表示を実装する
  - Report, Analyze, Fix, Verify, Deployの5フェーズをBugPhaseItemで表示
  - フェーズ間のコネクタ表示（WorkflowViewパターン踏襲）
  - bugStoreからselectedBugとbugDetailを取得
  - _Requirements: 3.1, 3.2, 6.2_

- [x] 3.3 フェーズ実行機能を実装する
  - Reportフェーズには実行ボタンを表示しない
  - Analyzeフェーズは`/kiro:bug-analyze`コマンドを実行
  - Fixフェーズは`/kiro:bug-fix`コマンドを実行
  - Verifyフェーズは`/kiro:bug-verify`コマンドを実行
  - Deployフェーズは`/commit`コマンドを実行
  - agentStore経由でエージェント起動、IPC経由でコマンド実行
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.4_

- [x] 4. BugArtifactEditorコンポーネントの実装
- [x] 4.1 4つのドキュメントタブUIを実装する
  - report, analysis, fix, verificationの4タブを表示
  - タブ切り替えのローカル状態管理
  - 既存ArtifactEditorのUIパターンを踏襲
  - _Requirements: 2.1, 2.2_

- [x] 4.2 Markdownプレビュー表示を実装する
  - 選択タブに対応するドキュメント内容をMarkdownでプレビュー表示
  - bugDetailからartifactsのcontentを取得
  - ドキュメントが存在しない場合は「ドキュメント未生成」プレースホルダーを表示
  - _Requirements: 2.3, 2.4_

- [x] 5. App.tsxのペイン表示ロジック拡張
- [x] 5.1 Bug選択時のメインペイン表示を実装する
  - Bugsタブ選択かつselectedBug存在時にBugArtifactEditorを表示
  - Bugsタブ選択かつselectedBug未選択時は空ペイン表示
  - activeTab状態（Specs/Bugs）をApp.tsxで管理または参照
  - _Requirements: 1.1, 6.1_

- [x] 5.2 Bug選択時の右ペイン表示を実装する
  - Bugsタブ選択かつselectedBug存在時にBugWorkflowViewとAgentListPanelを表示
  - Bugsタブ選択かつselectedBug未選択時は空ペイン表示
  - AgentListPanelのBug対応拡張:
    - selectedBugも参照するように拡張
    - getAgentsForSpec関数をbugIdも受け付けるように拡張、または別途getAgentsForBugを用意
    - Bugコンテキストでも動作するようにnullチェックを調整
  - _Requirements: 1.2, 3.4, 3.5, 6.1, 6.3_

- [x] 5.3 タブ切り替え時の選択状態維持を実装する
  - SpecsタブとBugsタブの選択状態を個別に維持
  - タブ切り替え時に各タブの選択状態が保持される
  - selectedSpec状態とselectedBug状態の独立管理を確認
  - _Requirements: 1.3, 5.1, 5.2, 5.3_

- [x] 6. 統合テストとE2Eテスト
- [x] 6.1 ユニットテストを追加する
  - BugPhaseItem: Props反映、クリックハンドラ動作
  - BugWorkflowView: フェーズステータス算出、実行ボタン有効/無効
  - BugArtifactEditor: タブ切り替え、プレースホルダー表示
  - bugStore: refreshBugs時の選択状態クリア
  - _Requirements: 3.3, 4.6, 2.4, 5.4_

- [x] 6.2 E2Eテストを追加する (低優先度、後続タスクとして実施)
  - Bugsタブ選択 → Bug選択 → 3ペイン連動確認
  - フェーズ実行ボタンクリック → コマンド実行確認
  - タブ切り替え → 選択状態維持確認
  - 未選択状態での空ペイン表示確認
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 6.1_

- [x] 7. ドキュメント更新
- [x] 7.1 symbol-semantic-map.mdに新規コンポーネントを追加する
  - BugArtifactEditor: Bugドキュメントタブ表示コンポーネント
  - BugWorkflowView: Bugワークフロー表示・操作コンポーネント
  - BugPhaseItem: Bugフェーズアイテム表示コンポーネント
  - 実装完了後に適切なドメイン概念マッピングを追記
