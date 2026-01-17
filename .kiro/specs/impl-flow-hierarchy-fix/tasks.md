# Implementation Plan

## Tasks

- [x] 1. ImplFlowFrameの責務簡素化
- [x] 1.1 (P) ImplFlowFrameのProps型から実行関連propsを削除
  - `canExecute`, `isExecuting`, `onExecute` propsをインタフェースから削除
  - 型定義を更新し、children、worktreeモード関連propsのみ残す
  - _Requirements: 1.5_

- [x] 1.2 ImplFlowFrameのUIから実装開始ボタンを削除
  - ヘッダー領域から「実装開始」ボタンのJSXとクリックハンドラを削除
  - worktreeモードチェックボックスとchildren描画は維持
  - 紫系背景色のスタイリングは維持
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. ImplPhasePanelコンポーネントの新規作成
- [x] 2.1 (P) ImplPhasePanelのProps型定義とコンポーネント骨格を作成
  - worktreeModeSelected、isImplStarted、hasExistingWorktree、status、canExecute、isExecuting、onExecute等のpropsを定義
  - PhaseItemと同等のステータス表示（pending/executing/approved）を実装
  - _Requirements: 2.1, 2.2, 2.9_

- [x] 2.2 ラベル切り替えロジックを実装
  - worktreeモード + 未作成時: 「Worktreeで実装開始」
  - worktreeモード + 作成済み時: 「Worktreeで実装継続」
  - 通常モード + 未開始時: 「実装開始」
  - 通常モード + 開始済み時: 「実装継続」
  - 2.1で作成したコンポーネントに組み込む
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 2.3 worktreeモード対応の実行ハンドラとエラー表示を実装
  - 実行ボタンクリック時にworktreeモードに応じた処理（worktree作成 or 通常モード開始）を分岐
  - mainブランチでない場合のエラー表示（notify.error）を実装
  - _Requirements: 2.7, 2.8_

- [x] 2.4 worktreeモード時の紫系アクセントカラーを適用
  - 条件付きスタイリングでworktreeモード選択時に紫系の視覚的差異を表現
  - GitBranchアイコン（worktreeモード）とPlayアイコン（通常モード）の切り替え
  - _Requirements: 2.10_

- [x] 3. WorkflowViewの階層構造修正
- [x] 3.1 DISPLAY_PHASES定数を導入しimpl/deployをmapループから除外
  - `DISPLAY_PHASES = ['requirements', 'design', 'tasks']` を定義
  - WORKFLOW_PHASESのmapループをDISPLAY_PHASESに置き換え
  - 既存のWORKFLOW_PHASES定義は状態判定用に維持
  - _Requirements: 3.2_

- [x] 3.2 ImplFlowFrame内にImplPhasePanel、TaskProgressView、InspectionPanel、deploy PhaseItemを配置
  - DocumentReviewPanelはImplFlowFrame外（tasks後）に維持
  - deploy PhaseItemをImplFlowFrame内の最後に配置
  - 各コンポーネント間に適切なArrowDownコネクタを配置
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 3.3 deployラベルの動的変更ロジックを実装
  - worktreeモード時（spec.json.worktree.path存在）は「マージ」
  - 通常モード時は「コミット」
  - PhaseItemの既存label propsを活用
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. 既存機能の統合と動作確認
- [x] 4.1 ImplFlowFrameの呼び出し元を更新
  - WorkflowViewでImplFlowFrameに渡すpropsを新しいインタフェースに合わせて変更
  - 不要になった実行関連のprops渡しを削除
  - _Requirements: 1.5_

- [x] 4.2 worktreeモードフローの動作確認
  - worktreeモード選択 → 実装開始 → チェックボックスロックのフローが正常動作することを確認
  - 自動実行機能（impl, inspection, deployの順序実行）が正常動作することを確認
  - _Requirements: 5.1, 5.3_

- [x] 4.3 通常モードフローとInspectionPanel/TaskProgressViewの動作確認
  - 通常モード選択 → 実装開始 → deploy完了のフローが正常動作することを確認
  - InspectionPanel（検査実行、Fix実行、自動実行フラグ）の機能維持を確認
  - TaskProgressView（タスク一覧、個別実行）の機能維持を確認
  - _Requirements: 5.2, 5.4, 5.5_

- [x] 4.4 E2Eテスト更新
  - worktree-execution.e2e.spec.tsのセレクタをImplPhasePanel追加に対応して更新
  - ImplFlowFrame内のボタン配置変更に対応したテストシナリオ更新
  - _Requirements: 5.1, 5.2_

- [x] 5. テスト実装
- [x] 5.1 ImplFlowFrame.test.tsx更新
  - Props型変更後のレンダリング確認（実行ボタン削除）
  - children正常レンダリング確認
  - worktreeモードチェックボックス動作確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5.2 ImplPhasePanel.test.tsx新規作成
  - 各条件でのラベル切り替え確認（4パターン）
  - worktreeモード時の紫系スタイル確認
  - ステータス表示確認（pending/executing/approved）
  - 実行ボタンハンドラ呼び出し確認
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 2.10_

- [x] 5.3 WorkflowView.test.tsx更新
  - DISPLAY_PHASES除外確認（impl/deployがmapループに含まれない）
  - ImplFlowFrame内のコンポーネント配置確認
  - deployラベル動的変更確認（worktreeモード時「マージ」、通常モード時「コミット」）
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ImplFlowFrameから実装開始ボタン削除 | 1.2 | Feature |
| 1.2 | worktreeモードチェックボックスをヘッダーに表示 | 1.2 | Feature |
| 1.3 | worktreeモード選択時に紫系背景色 | 1.2 | Feature |
| 1.4 | children propsを受け取る | 1.2 | Feature |
| 1.5 | 実行関連propsを削除 | 1.1, 4.1 | Infrastructure |
| 2.1 | ImplPhasePanelを新規作成 | 2.1 | Feature |
| 2.2 | worktreeモード状態を受け取る | 2.1 | Feature |
| 2.3 | worktree未作成時「Worktreeで実装開始」ラベル | 2.2 | Feature |
| 2.4 | worktree作成済み時「Worktreeで実装継続」ラベル | 2.2 | Feature |
| 2.5 | 通常モード未開始時「実装開始」ラベル | 2.2 | Feature |
| 2.6 | 通常モード開始済み時「実装継続」ラベル | 2.2 | Feature |
| 2.7 | worktreeモードに応じた処理実行 | 2.3 | Feature |
| 2.8 | mainブランチでない場合エラー表示 | 2.3 | Feature |
| 2.9 | ステータス表示（pending/executing/approved） | 2.1 | Feature |
| 2.10 | worktreeモード時に紫系アクセントカラー | 2.4 | Feature |
| 3.1 | ImplFlowFrame内にImplPhasePanel等を配置 | 3.2 | Feature |
| 3.2 | WORKFLOW_PHASESからimpl/deploy除外 | 3.1 | Infrastructure |
| 3.3 | DocumentReviewPanelはImplFlowFrame外維持 | 3.2 | Feature |
| 3.4 | 矢印コネクタ表示 | 3.2 | Feature |
| 4.1 | worktreeモード時deployラベル「マージ」 | 3.3 | Feature |
| 4.2 | 通常モード時deployラベル「コミット」 | 3.3 | Feature |
| 4.3 | PhaseItemがlabel propsを動的に受け取る | 3.3 | Feature |
| 5.1 | worktreeモード選択→実装開始→ロック | 4.2, 4.4 | Feature |
| 5.2 | 通常モード選択→実装開始→deploy完了 | 4.3, 4.4 | Feature |
| 5.3 | 自動実行機能が正常動作 | 4.2 | Feature |
| 5.4 | InspectionPanel機能維持 | 4.3 | Feature |
| 5.5 | TaskProgressView機能維持 | 4.3 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
