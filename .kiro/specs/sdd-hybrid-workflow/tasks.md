# Implementation Plan

## Task Summary
- **Total Major Tasks**: 8
- **Feature**: sdd-hybrid-workflow (SDDハイブリッドワークフローUI)
- **Estimated Effort**: 各サブタスク1-3時間

---

## Tasks

- [x] 1. 型定義とデータモデルの実装
- [x] 1.1 (P) ワークフロー型定義の作成
  - WorkflowPhase型（6フェーズ: requirements, design, tasks, impl, inspection, deploy）を定義
  - PhaseStatus型（pending, generated, approved）を定義
  - ValidationType型（gap, design, impl）を定義
  - フェーズ順序定義（WORKFLOW_PHASES配列）を作成
  - フェーズ表示名のマッピングを日本語で定義
  - _Requirements: 1.1, 1.3_

- [x] 1.2 (P) Extended SpecJsonの型定義
  - spec.jsonの拡張フィールド（inspection_completed, deploy_completed）をオプショナル型として定義
  - 後方互換性を考慮し、undefinedの場合はfalse扱いとする
  - _Requirements: 8.3, 8.6_

- [x] 2. workflowStoreの実装
- [x] 2.1 自動実行許可状態の管理
  - AutoExecutionPermissions型に基づく各フェーズの自動実行許可フラグを管理
  - デフォルト値: requirementsのみtrue、他はfalse
  - toggleAutoPermission関数でトグル操作を実装
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2.2 バリデーションオプション状態の管理
  - ValidationOptions型に基づくvalidate-gap, validate-design, validate-implの有効/無効を管理
  - toggleValidationOption関数でトグル操作を実装
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2.3 自動実行状態の管理
  - isAutoExecuting, currentAutoPhaseの状態管理
  - startAutoExecution, stopAutoExecution, setCurrentAutoPhase関数を実装
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2.4 LocalStorage永続化の実装
  - Zustand persistミドルウェアを使用してworkflowStoreの設定を永続化
  - ストレージキー: `sdd-manager-workflow-settings`
  - リセット機能（resetSettings）を実装
  - _Requirements: 5.4_

- [x] 3. PhaseItemコンポーネントの実装
- [x] 3.1 フェーズ状態に応じたUI表示
  - pending状態で「実行」ボタンを表示
  - generated状態で「生成完了」ラベルと「承認」ボタンを表示
  - approved状態でチェックマークアイコンと「承認済」ラベルを表示
  - 「生成完了」リンククリック時にAgentログを表示するハンドラを実装
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 3.2 承認して実行ボタンの実装
  - 前フェーズがgenerated、次フェーズがpendingの条件判定
  - 「承認して実行」ボタンの表示制御
  - クリック時に前フェーズ承認と次フェーズ実行を連続実行
  - _Requirements: 2.4, 3.5_

- [x] 3.3 自動実行許可アイコンの実装
  - フェーズ名左側に再生/禁止アイコンを表示
  - フェーズ名クリックでトグル操作を実行
  - workflowStoreのautoExecutionPermissionsと連携
  - Lucide Reactアイコン（PlayCircle, Ban）を使用
  - _Requirements: 5.1, 5.2_

- [x] 4. ValidateOptionコンポーネントの実装
- [x] 4.1 バリデーションオプションUI
  - チェックボックスによる自動実行時の有効/無効切替
  - 「実行」ボタンによる即時バリデーション実行
  - 実行中はローディング表示
  - コンパクトなインライン表示（高さ制限）
  - _Requirements: 4.4, 4.5_

- [x] 5. TaskProgressViewコンポーネントの実装
- [x] 5.1 タスク一覧の表示
  - tasks.mdからパースしたタスク一覧をサブアイテムとして表示
  - 各タスクの状態（未着手/実行中/完了）をアイコンとラベルで表示
  - `- [x]` / `- [ ]` パターンをパースしてタスク状態を判定
  - _Requirements: 7.1, 7.2_

- [x] 5.2 タスク進捗の更新
  - タスク実行開始時に「実行中」状態に更新
  - タスク完了時に「完了」状態とチェックマークを表示
  - 全タスク完了時に実装フェーズを「完了」状態に更新
  - プログレスバーによる全体進捗の可視化
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 6. ArtifactPreviewコンポーネントの実装
- [x] 6.1 成果物一覧の表示
  - requirements.md, design.md, tasks.mdの一覧表示
  - 折りたたみ可能なアコーディオン形式
  - クリック時にMarkdownプレビューを展開表示
  - @uiw/react-md-editorを使用したMarkdownレンダリング
  - 未作成ファイルには「未作成」ラベルを表示
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 7. WorkflowViewコンポーネントの実装
- [x] 7.1 6フェーズの縦一覧表示
  - 要件定義、設計、タスク、実装、検査、デプロイの6フェーズを縦に配置
  - 各フェーズ間を矢印（DownArrowアイコン）で接続
  - spec.jsonのapprovals状態に基づいてフェーズ状態を判定
  - PhaseItemコンポーネントを使用して各フェーズを表示
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 7.2 バリデーションオプションの配置
  - 要件定義と設計の間にvalidate-gapオプションを配置
  - 設計とタスクの間にvalidate-designオプションを配置
  - 実装と検査の間にvalidate-implオプションを配置
  - ValidateOptionコンポーネントを使用
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.3 手動フェーズ実行機能
  - 「実行」ボタンクリックでスラッシュコマンドをIPC経由で送信
  - 実行中はローディング表示と「実行中」ラベル、ボタンをdisable
  - 完了時にspec.jsonのapprovals.[phase].generatedをtrueに更新
  - 「承認」ボタンクリックでapprovals.[phase].approvedをtrueに更新
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7.4 自動実行モードの実装
  - 「自動実行」ボタンクリックで連続実行を開始
  - 自動実行中は「停止」ボタンに変更
  - 自動実行許可が停止のフェーズで自動実行を一時停止
  - 「停止」ボタンクリックで現在フェーズ完了後に停止
  - Agentエラー時に自動実行を停止しエラー状態を表示
  - 全フェーズ完了時に「全工程完了」メッセージを表示し「自動実行」ボタンをdisable
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7.5 検査・デプロイフェーズの実行
  - 実装フェーズ完了後に検査フェーズの「実行」ボタンを有効化
  - 検査フェーズ実行時にvalidate-implコマンドを送信
  - 検査完了時にspec.jsonにinspection_completed: trueを設定
  - 検査フェーズ完了後にデプロイフェーズの「実行」ボタンを有効化
  - デプロイ完了時にspec.jsonにdeploy_completed: trueを設定
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 7.6 フッターボタンの実装
  - 「自動実行」ボタンと「spec-status実行」ボタンを常時表示
  - 「spec-status実行」ボタンを常にenable状態で表示
  - クリック時にspec-statusコマンドを送信し結果をAgentログパネルに表示
  - _Requirements: 1.4, 9.1, 9.2, 9.3_

- [x] 8. IPC通信とエラーハンドリングの実装
- [x] 8.1 フェーズ実行コマンドのIPC送信
  - agentStore.startAgentを使用してスラッシュコマンドを送信
  - spec-requirements, spec-design, spec-tasks, spec-implの各コマンド対応
  - validate-gap, validate-design, validate-impl, deploymentコマンド対応
  - _Requirements: 3.1, 11.1_

- [x] 8.2 コマンド実行結果の受信と状態更新
  - IPC経由でコマンド実行結果（成功/失敗/出力）を受信
  - Agentプロセスの状態変化イベントでUIを更新
  - executingPhase状態の更新
  - _Requirements: 11.2, 11.3_

- [x] 8.3 エラーハンドリングとリトライ
  - IPC通信タイムアウト時にエラーメッセージとリトライオプションを表示
  - Agent起動失敗・異常終了時のエラー状態表示
  - notificationStoreを使用したユーザー向けエラー通知
  - _Requirements: 6.5, 11.4_

---

## Requirements Traceability Matrix

| Requirement | Coverage |
|-------------|----------|
| 1.1 | 1.1, 7.1 |
| 1.2 | 7.1 |
| 1.3 | 1.1, 7.1 |
| 1.4 | 7.6 |
| 2.1 | 3.1 |
| 2.2 | 3.1 |
| 2.3 | 3.1 |
| 2.4 | 3.2 |
| 2.5 | 3.1 |
| 3.1 | 7.3, 8.1 |
| 3.2 | 7.3 |
| 3.3 | 7.3 |
| 3.4 | 7.3 |
| 3.5 | 3.2 |
| 4.1 | 2.2, 7.2 |
| 4.2 | 2.2, 7.2 |
| 4.3 | 2.2, 7.2 |
| 4.4 | 4.1 |
| 4.5 | 4.1 |
| 5.1 | 2.1, 3.3 |
| 5.2 | 2.1, 3.3 |
| 5.3 | 2.1 |
| 5.4 | 2.4 |
| 6.1 | 2.3, 7.4 |
| 6.2 | 2.3, 7.4 |
| 6.3 | 2.3, 7.4 |
| 6.4 | 2.3, 7.4 |
| 6.5 | 7.4, 8.3 |
| 6.6 | 7.4 |
| 7.1 | 5.1 |
| 7.2 | 5.1 |
| 7.3 | 5.2 |
| 7.4 | 5.2 |
| 7.5 | 5.2 |
| 8.1 | 7.5 |
| 8.2 | 7.5 |
| 8.3 | 1.2, 7.5 |
| 8.4 | 7.5 |
| 8.5 | 7.5 |
| 8.6 | 1.2, 7.5 |
| 9.1 | 7.6 |
| 9.2 | 7.6 |
| 9.3 | 7.6 |
| 10.1 | 6.1 |
| 10.2 | 6.1 |
| 10.3 | 6.1 |
| 11.1 | 8.1 |
| 11.2 | 8.2 |
| 11.3 | 8.2 |
| 11.4 | 8.3 |
