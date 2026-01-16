# Implementation Plan

## Task Dependencies Overview

以下のタスク依存関係に従って実装を進める:

```
Task 1.1 → Task 2.1 → Task 3.1 → Task 4.1/4.2/4.3
                  ↓
            Task 5.1 → Task 5.2
                  ↓
            Task 6.1 → Task 6.2
                  ↓
            Task 7.1 → Task 7.2
                  ↓
            Task 8.1/8.2 → Task 9.1/9.2
```

- **Task 1**: 基盤となる型定義とユーティリティ関数（他タスクの前提）
- **Task 2-4**: UI関連タスク（Task 1完了後に並列実行可能）
- **Task 5-6**: IPC・統合タスク（Task 1, 2完了後）
- **Task 7-8**: deploy処理・表示条件（Task 1完了後）
- **Task 9**: 統合テスト（全実装完了後）

---

## Task 1. 型定義とユーティリティ関数の拡張

- [x] 1.1 (P) WorktreeConfig型の拡張とユーティリティ関数の追加
  - WorktreeConfigのpathフィールドをオプショナルに変更
  - isWorktreeConfig関数をbranch+created_atのみで判定するよう修正
  - isActualWorktreeMode関数を新規追加（worktree.path存在で判定）
  - isImplStarted関数を新規追加（worktree.branch存在で判定）
  - 各関数のユニットテスト作成
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

## Task 2. workflowStore拡張

- [x] 2.1 (P) worktreeモード選択状態の管理機能追加
  - isWorktreeModeSelected状態をworkflowStoreに追加
  - setWorktreeModeSelectedアクションを追加
  - 既存worktree存在時の初期値設定ロジック追加
  - _Requirements: 4.1, 4.2_

## Task 3. WorktreeModeCheckboxコンポーネントの実装

- [x] 3.1 WorktreeModeCheckboxコンポーネント作成
  - チェックボックスの基本表示を実装
  - ロック状態（disabled）の視覚的表示を実装
  - ロック理由のツールチップ表示を実装
  - ユニットテスト作成
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.4_

## Task 4. ImplFlowFrameコンポーネントの実装

- [x] 4.1 ImplFlowFrame基本構造の作成
  - impl, inspection, deployを囲む枠コンポーネントの作成
  - ヘッダー領域にWorktreeModeCheckboxを配置
  - 子コンポーネント（PhaseItem, InspectionPanel）のprops透過
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4.2 worktreeモード時のUI変更
  - worktreeモード選択時の背景色変更（紫系）を実装
  - 実装ボタンラベルを「worktreeで実装」に変更
  - コミットパネルラベルを「マージ」に変更
  - 通常モード時は従来通りのスタイルを維持
  - _Requirements: 6.1, 6.2, 6.4, 7.1, 7.2_

- [x] 4.3 チェックボックスのロックロジック実装
  - spec.json.worktree.branch存在時にチェックボックスをロック
  - 既存worktree（path存在）時は自動ONかつ変更不可
  - 自動実行中でも実装開始前は変更可能に
  - ユニットテスト作成
  - _Requirements: 4.3, 5.1, 5.2, 5.4_

## Task 5. 通常モード実装開始の永続化

- [x] 5.1 通常モード実装開始用IPCハンドラ追加
  - startImplNormalMode IPCハンドラを追加
  - カレントブランチ名を取得してspec.json.worktreeに保存
  - { branch, created_at }形式で永続化
  - _Requirements: 9.1, 9.2_

- [x] 5.2 WorkflowViewでの通常モード実装開始処理
  - worktreeモードOFF時のimpl実行時にstartImplNormalModeを呼び出し
  - ファイル監視による自動UI更新を確認
  - _Requirements: 9.3_

## Task 6. WorkflowViewへの統合

- [x] 6.1 ImplFlowFrameの統合とImplStartButtons廃止
  - WorkflowViewにImplFlowFrameを導入
  - 既存のimpl, inspection, deployをImplFlowFrame内に移動
  - ImplStartButtonsのインポート・使用を削除
  - DocumentReviewPanelは枠外に維持
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 6.2 worktreeモードに応じた実行処理の分岐
  - worktreeモードON時は既存のworktreeImplStart処理を使用
  - worktreeモードOFF時は新規startImplNormalModeを使用
  - PhaseItem実行ボタンでimpl実行が可能であることを確認
  - _Requirements: 2.3, 8.3_

## Task 7. deploy処理の分岐実装

- [x] 7.1 deploy処理でのworktreeモード判定
  - spec.json.worktree.path存在時はspec-mergeを実行
  - path不存在（通常モード）時は従来の/commitを実行
  - _Requirements: 10.1, 10.2_

- [x] 7.2 deploy完了後のworktreeフィールド削除
  - specsWatcherServiceでphase: deploy-complete検知時の処理追加
  - worktreeモード・通常モード両方でworktreeフィールドを削除
  - チェックボックスのリセット可能状態を確認
  - _Requirements: 5.3, 10.3_

## Task 8. worktree情報表示の条件付けとUI更新

- [x] 8.1 SpecDetailのworktree情報表示条件
  - isActualWorktreeModeを使用してworktree情報セクションの表示を制御
  - pathが存在する場合のみworktree情報を表示
  - 通常モード（pathなし）の場合は非表示
  - _Requirements: 11.1, 11.2_

- [x] 8.2 SpecListItemのworktreeバッジ表示条件
  - isActualWorktreeModeを使用してバッジ表示を制御
  - pathが存在する場合のみworktreeバッジを表示
  - _Requirements: 11.3_

## Task 9. 統合テストとE2Eテスト

- [x] 9.1 WorkflowView統合テスト
  - ImplFlowFrame統合後のUI表示テスト
  - チェックボックス連動テスト
  - ロック状態テスト
  - worktreeモード時もInspectionPanelが従来通りの表示であることを確認（6.3検証）
  - _Requirements: 3.1, 4.1, 4.2, 5.1, 6.3_

- [x] 9.2 E2Eテスト
  - worktreeモード選択から実装開始までのフロー
  - 通常モード実装開始からdeploy完了までのフロー
  - 既存worktree時のチェックボックス自動ON確認
  - _Requirements: 4.3, 9.1, 10.1, 10.2_

---

## Inspection Fix Tasks (Round 2)

以下のタスクはInspection Round 2で検出されたCritical/Major問題を修正するためのタスクです。

- [x] FIX-1 (Critical) WorkflowViewにImplFlowFrameを統合し、ImplStartButtonsを廃止する
  - WorkflowView.tsxでImplFlowFrameをimportする
  - impl, inspection, deployフェーズをImplFlowFrame内にラップする
  - ImplStartButtonsのインポートと使用を削除する
  - workflowStore.worktreeModeSelectionとチェックボックスを連携させる
  - DocumentReviewPanelはImplFlowFrame外に維持する
  - _Fixes: Task 6.1の未完了部分_
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3_

- [x] FIX-2 (Critical) worktreeモードに応じた実行処理分岐を実装する
  - ImplFlowFrame内のimpl実行時にworktreeModeSelectionをチェック
  - worktreeモードON時は既存のhandleImplStartWithWorktreeを使用
  - worktreeモードOFF時はnormalModeImplStart IPCを呼び出す
  - 実行後にチェックボックスがロックされることを確認
  - _Fixes: Task 5.2, 6.2の未完了部分_
  - _Requirements: 2.3, 8.3, 9.3_

- [x] FIX-3 (Major) deploy完了後のworktreeフィールド削除を実装する
  - specsWatcherServiceでphase: 'deploy-complete'を検知するロジックを追加
  - spec.json.worktreeフィールドを削除するロジックを追加（worktreeモード・通常モード両方）
  - fileService.removeWorktreeFieldメソッドを追加してworktreeフィールドを削除
  - _Fixes: Task 7.2の未完了部分_
  - _Requirements: 5.3, 10.3_

- [x] FIX-4 (Major) E2Eテストを更新してImplFlowFrame統合後のUIに対応する
  - ImplStartButtonsのテストIDをImplFlowFrame内のチェックボックスに変更
  - worktreeモードチェックボックスの操作テストを追加
  - 通常モード→worktreeモード切り替えのテストを追加
  - _Fixes: Task 9.2の一部更新_
  - _Requirements: 4.3, 9.1, 10.1, 10.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | WorktreeConfig.pathをオプショナルに | 1.1 | Infrastructure |
| 1.2 | worktreeモード時の保存形式 | 1.1 | Infrastructure |
| 1.3 | 通常モード時の保存形式 | 1.1 | Infrastructure |
| 1.4 | 実装未開始時はworktreeフィールドなし | 1.1 | Infrastructure |
| 2.1 | isWorktreeConfig関数の改修 | 1.1 | Infrastructure |
| 2.2 | isActualWorktreeMode関数の追加 | 1.1 | Infrastructure |
| 2.3 | 実装開始済み判定 | 1.1, 6.2, FIX-2 | Infrastructure, Feature |
| 3.1 | 実装フロー枠の表示 | 4.1, 9.1, FIX-1 | Feature |
| 3.2 | チェックボックスの配置 | 4.1, FIX-1 | Feature |
| 3.3 | DocumentReviewPanelは枠外 | 4.1, 6.1, FIX-1 | Feature |
| 4.1 | チェックボックスの連動 | 2.1, 3.1, 9.1 | Feature |
| 4.2 | 即座反映 | 2.1, 3.1, 9.1 | Feature |
| 4.3 | 既存worktree時の自動ON・変更不可 | 3.1, 4.3, 9.2, FIX-4 | Feature |
| 5.1 | 実装開始時のロック | 3.1, 4.3, 9.1 | Feature |
| 5.2 | branch存在時のロック | 3.1, 4.3 | Feature |
| 5.3 | deploy完了後のリセット | 7.2, FIX-3 | Feature |
| 5.4 | 自動実行中の変更可能 | 3.1, 4.3 | Feature |
| 6.1 | worktreeモード時の背景色変更 | 4.2 | Feature |
| 6.2 | 実装ボタンラベル変更 | 4.2 | Feature |
| 6.3 | 検査パネル従来表示 | 9.1 | Feature (テストで確認) |
| 6.4 | コミットパネルラベル変更 | 4.2 | Feature |
| 7.1 | 通常モード時の背景維持 | 4.2 | Feature |
| 7.2 | 通常モード時のパネル表示維持 | 4.2 | Feature |
| 8.1 | ImplStartButtons非使用 | 6.1, FIX-1 | Feature |
| 8.2 | 独立実装ボタン廃止 | 6.1, FIX-1 | Feature |
| 8.3 | PhaseItem実行ボタンでimpl実行 | 6.1, 6.2, FIX-1, FIX-2 | Feature |
| 9.1 | 通常モード実装開始時の永続化 | 5.1, 9.2, FIX-4 | Feature |
| 9.2 | branch保存 | 5.1 | Feature |
| 9.3 | ファイル監視による更新 | 5.2, FIX-2 | Feature |
| 10.1 | worktreeモード時のspec-merge実行 | 7.1, 9.2, FIX-4 | Feature |
| 10.2 | 通常モード時の/commit実行 | 7.1, 9.2, FIX-4 | Feature |
| 10.3 | deploy完了後のworktreeフィールド削除 | 7.2, FIX-3 | Feature |
| 11.1 | worktree情報表示の条件（path存在時のみ） | 8.1 | Feature |
| 11.2 | 通常モード時の非表示 | 8.1 | Feature |
| 11.3 | SpecListのworktreeバッジ条件 | 8.2 | Feature |
