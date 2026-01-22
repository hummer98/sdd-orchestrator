# Implementation Plan

## Overview

CreateSpecDialogの簡素化を実装する。ダイアログ幅を拡大し、ボタンをspec-plan専用に統合、アイコンと色をWorktreeモード状態に応じて変化させる。

## Tasks

- [x] 1. CreateSpecDialogコンポーネントの修正
- [x] 1.1 (P) ダイアログ幅の拡大
  - ダイアログのクラスを`max-w-md`から`max-w-xl`に変更
  - ボタン群が横一列に収まることを確認
  - _Requirements: 1.1, 1.2_

- [x] 1.2 (P) 「作成」ボタンと関連コードの削除
  - `handleCreate`関数を削除
  - 「作成」ボタンのJSXを削除
  - `Plus`アイコンのインポートを削除
  - `MessageCircle`アイコンのインポートを削除
  - _Requirements: 2.1, 2.2_

- [x] 1.3 アイコンコンポーネントのインポート追加
  - `AgentIcon`と`AgentBranchIcon`を`@shared/components/ui/AgentIcon`からインポート
  - 既存のImplPhasePanelと同じパターンを使用
  - _Requirements: 3.1, 3.2, 3.3_
  - _Method: AgentIcon, AgentBranchIcon_
  - _Verify: Grep "AgentIcon|AgentBranchIcon" in CreateSpecDialog.tsx_

- [x] 1.4 統合ボタンの実装
  - ボタンラベルを「spec-planで作成」に設定
  - ボタンクリック時に`handlePlanStart`が呼ばれるように設定（既存関数を再利用）
  - Worktreeモード状態に応じたアイコン表示（標準:AgentIcon、Worktree:AgentBranchIcon）
  - Worktreeモード状態に応じた色（標準:`bg-blue-500 hover:bg-blue-600`、Worktree:`bg-violet-500 hover:bg-violet-600`）
  - clsxを使用した条件分岐でスタイルを切り替え
  - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2_

- [x] 2. テストの更新
- [x] 2.1 CreateSpecDialog.test.tsxの更新
  - 「作成」ボタンが存在しないことを確認するテストを追加
  - 「spec-planで作成」ボタンの存在を確認するテストを更新
  - 標準モード時にAgentIconが表示されることを確認
  - Worktreeモード時にAgentBranchIconが表示されることを確認
  - 標準モード時に青色ボタンであることを確認
  - Worktreeモード時に紫色ボタンであることを確認
  - ボタンクリック時にexecuteSpecPlanが呼ばれることを確認
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | ダイアログ最大幅`max-w-xl` | 1.1 | Feature |
| 1.2 | ボタン群が横一列 | 1.1 | Feature |
| 2.1 | 「作成」ボタン削除 | 1.2 | Feature |
| 2.2 | handleCreate関数削除 | 1.2 | Feature |
| 2.3 | ボタンは「spec-planで作成」のみ | 1.4, 2.1 | Feature |
| 2.4 | ボタンクリック時spec-plan実行 | 1.4, 2.1 | Feature |
| 3.1 | 標準モード時Botアイコン | 1.3, 1.4, 2.1 | Feature |
| 3.2 | Worktree時Bot+GitBranchアイコン | 1.3, 1.4, 2.1 | Feature |
| 3.3 | アイコン配置パターン | 1.3, 1.4 | Feature |
| 4.1 | 標準モード時青色 | 1.4, 2.1 | Feature |
| 4.2 | Worktree時紫色 | 1.4, 2.1 | Feature |
