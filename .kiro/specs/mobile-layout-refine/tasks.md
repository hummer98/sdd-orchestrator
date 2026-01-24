# Implementation Plan

## Task 1: BugWorkflowFooter共通化

- [x] 1.1 (P) BugWorkflowFooterをshared/components/bug/へ移動する
  - `renderer/components/BugWorkflowFooter.tsx`を`shared/components/bug/BugWorkflowFooter.tsx`へ移動
  - 自動実行ボタン、Worktree変換ボタンの機能を維持
  - platform-agnostic実装であることを確認
  - `shared/components/bug/index.ts`にエクスポートを追加
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 1.2 BugWorkflowFooterテストを移動し、Electronインポートパスを更新する
  - テストファイル`BugWorkflowFooter.test.tsx`を`shared/components/bug/`へ移動
  - `renderer/components/BugWorkflowView.tsx`のインポートパスを`shared/components/bug/`に変更
  - 他のElectron側でBugWorkflowFooterを使用している箇所を確認し更新
  - テストが通ることを確認
  - _Requirements: 7.4_

## Task 2: ナビゲーション基盤構築

- [x] 2.1 (P) useNavigationStack Hookを実装する
  - 一覧/DetailPage表示の状態管理を実装
  - activeTab状態（specs/bugs/agents）の管理
  - detailContext（Spec/Bug詳細情報）の管理
  - showTabBarフラグの自動制御
  - pushSpecDetail、pushBugDetail、popPage操作の実装
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Method: useNavigationStack_
  - _Verify: Grep "useNavigationStack" in remote-ui/hooks/_

- [x] 2.2 MobileTabBarを3タブ構成（Specs/Bugs/Agents）に拡張する
  - TAB_CONFIGにAgentsタブを追加
  - 各タブにアイコンとラベルを設定
  - アクティブタブの視覚的強調スタイルを維持
  - 44x44px以上のタッチターゲットサイズを確保
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 2.3 MobileLayoutにshowTabBar制御を追加する
  - showTabBar propを追加
  - DetailPage表示時にタブバーを非表示にする条件レンダリング
  - タブバー表示/非表示のトランジションアニメーション（200-300ms、ease-in-out、フェードまたはスライド）
  - _Requirements: 1.4, 2.5_

## Task 3: AgentDetailDrawer実装

- [x] 3.1 (P) AgentDetailDrawerコンポーネントを作成する
  - 下からスライドアップするオーバーレイDrawer
  - AgentLogPanelを内包したリアルタイムログ表示
  - Drawerヘッダー部分（Agent名、ステータス表示）
  - _Requirements: 6.1, 6.2, 6.8_
  - _Method: AgentDetailDrawer, AgentLogPanel_
  - _Verify: Grep "AgentDetailDrawer" in remote-ui/components/_

- [x] 3.2 AgentDetailDrawerのドラッグ高さ調整を実装する
  - タッチイベントハンドラでドラッグ検出
  - Drawer高さのvh単位での管理（最小25vh、最大90vh制約の実装）
  - ドラッグハンドルの視覚的表示
  - スクロールとドラッグの競合解決
  - _Requirements: 6.3_

- [x] 3.3 AgentDetailDrawerに追加指示入力とアクションボタンを実装する
  - 追加指示入力フィールド（AdditionalInstructionInput）
  - Sendボタンとその送信ロジック
  - Continueボタンと実行再開ロジック
  - Agent not running時のボタン無効化
  - _Requirements: 6.4, 6.5, 6.6_

- [x] 3.4 AgentDetailDrawerの閉じる操作を実装する
  - 外側タップ（backdrop）で閉じる
  - 下スワイプで閉じる
  - 閉じる時のトランジションアニメーション
  - _Requirements: 6.7_

## Task 4: SubTabBarコンポーネント実装

- [x] 4.1 (P) SubTabBarコンポーネントを作成する
  - DetailPage内下部のサブタブ表示
  - 2つのタブ（Spec/Artifact または Bug/Artifact）のレンダリング
  - アクティブタブの視覚的強調
  - タブ変更コールバック
  - _Requirements: 3.1, 4.1_
  - _Method: SubTabBar_
  - _Verify: Grep "SubTabBar" in remote-ui/components/_

## Task 5: SpecDetailPage実装

- [x] 5.1 SpecDetailPageのSpec/Artifactサブタブ構造を実装する
  - SubTabBarを使用したSpec/Artifact切り替え
  - activeSubTab状態管理
  - 戻るボタン付きヘッダー
  - onBackコールバックの接続
  - _Requirements: 3.1, 2.3_

- [x] 5.2 SpecタブにAgentList（固定3項目高さ）を実装する
  - 固定高さ（3項目分、h-36相当）のAgentListエリア
  - overflow-y-autoによる独立スクロール
  - AgentListItemのタップでAgentDetailDrawer表示
  - SpecのAgent一覧取得
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 5.3 SpecタブにWorkflowAreaとWorkflowFooterを実装する
  - SpecWorkflowArea（ワークフロー進捗表示、スクロール可能）
  - shared/components/workflow/SpecWorkflowFooterの使用
  - 自動実行ボタンの機能連携
  - _Requirements: 3.2, 3.7_

- [x] 5.4 SpecDetailPageのArtifactタブを実装する
  - アーティファクトファイルタブの表示
  - RemoteArtifactEditorを使用した編集/閲覧機能
  - Desktop Webと同一のコンポーネントを共有
  - _Requirements: 3.5, 3.6_

## Task 6: BugDetailPage実装

- [x] 6.1 BugDetailPageのBug/Artifactサブタブ構造を実装する
  - SubTabBarを使用したBug/Artifact切り替え
  - activeSubTab状態管理
  - 戻るボタン付きヘッダー
  - onBackコールバックの接続
  - _Requirements: 4.1, 2.3_

- [x] 6.2 BugタブにAgentList（固定3項目高さ）を実装する
  - 固定高さ（3項目分、h-36相当）のAgentListエリア
  - overflow-y-autoによる独立スクロール
  - AgentListItemのタップでAgentDetailDrawer表示
  - BugのAgent一覧取得
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 6.3 BugタブにWorkflowAreaとBugWorkflowFooterを実装する
  - BugWorkflowArea（ワークフロー進捗表示、スクロール可能）
  - shared/components/bug/BugWorkflowFooterの使用
  - 自動実行ボタン、Worktree変換ボタンの機能連携
  - _Requirements: 4.2, 4.6_

- [x] 6.4 BugDetailPageのArtifactタブを実装する
  - SpecArtifactTabと同等のアーティファクト表示
  - RemoteArtifactEditorを使用した編集/閲覧機能
  - _Requirements: 4.5_

## Task 7: AgentsTabView実装

- [x] 7.1 AgentsTabViewコンポーネントを作成する
  - プロジェクトレベルAgent一覧の表示（ProjectAgentPanelと同等機能）
  - AgentListコンポーネントの使用
  - AgentListItemタップでAgentDetailDrawer表示
  - _Requirements: 5.1, 5.2_
  - _Method: AgentsTabView_
  - _Verify: Grep "AgentsTabView" in remote-ui/components/_

- [x] 7.2 AgentsTabViewにrunning Agentカウントを表示する
  - ヘッダーまたはバッジでrunning Agent数を表示
  - Agent状態変更時の自動更新
  - _Requirements: 5.3_

- [x] 7.3 AgentsTabViewにAskボタンを実装する
  - Askボタンの配置
  - AskAgentDialogとの連携
  - プロジェクトレベルプロンプト実行機能
  - _Requirements: 5.4_

## Task 8: MobileAppContent統合

- [x] 8.1 MobileAppContentにuseNavigationStackを統合する
  - useNavigationStack Hookの導入
  - activeTab、detailContext、showTabBarの状態管理
  - タブ切替時のdetailContextクリア処理
  - _Requirements: 1.2, 2.6_

- [x] 8.2 SpecsタブでSpecDetailPageへのプッシュ遷移を実装する
  - SpecListのアイテムタップ時にpushSpecDetailを呼び出し
  - SpecDetailPageの表示
  - 戻るボタンでpopPageを呼び出し
  - _Requirements: 2.1, 2.4_

- [x] 8.3 BugsタブでBugDetailPageへのプッシュ遷移を実装する
  - BugListのアイテムタップ時にpushBugDetailを呼び出し
  - BugDetailPageの表示
  - 戻るボタンでpopPageを呼び出し
  - _Requirements: 2.2, 2.4_

- [x] 8.4 AgentsタブをMobileAppContentに統合する
  - AgentsTabViewの表示
  - タブ切替時のAgentsタブ選択処理
  - _Requirements: 1.2_

## Task 9: 一覧・フィルタの共用確認

- [x] 9.1 (P) Specs一覧とフィルタの共用を確認する
  - shared/SpecListContainer、useSpecListLogicの使用確認
  - フィルタエリアの固定ヘッダー表示
  - 既存Remote UI実装（SpecsView）の継続使用
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 9.2 (P) Bugs一覧とフィルタの共用を確認する
  - shared/BugListContainer、useBugListLogicの使用確認
  - フィルタエリアの固定ヘッダー表示
  - 既存Remote UI実装（BugsView）の継続使用
  - _Requirements: 8.2, 8.3, 8.4_

## Task 10: エクスポートとインデックス更新

- [x] 10.1 remote-ui/layouts/index.tsを更新する
  - 新規コンポーネント（MobileLayout変更分）のエクスポート追加
  - _Requirements: 1.4_

- [x] 10.2 remote-ui/views/index.tsを更新する
  - 新規コンポーネント（SpecDetailPage、BugDetailPage、AgentsTabView、AgentDetailDrawer、SubTabBar）のエクスポート追加
  - _Requirements: 3.1, 4.1, 5.1, 6.1_

## Task 11: テスト実装

- [x] 11.1 useNavigationStackのユニットテストを実装する
  - pushPage/popPage動作の検証
  - タブ切替時のdetailContextクリアの検証
  - showTabBarフラグの自動制御の検証
  - _Requirements: 2.1, 2.2, 2.4, 2.6_

- [x] 11.2 AgentDetailDrawerのユニットテストを実装する
  - 高さ調整ロジックの検証
  - Send/Continue状態管理の検証
  - Agent not running時のボタン無効化検証
  - _Requirements: 6.3, 6.5, 6.6_

- [x] 11.3 SubTabBarのユニットテストを実装する
  - タブ切替コールバックの検証
  - アクティブタブスタイルの検証
  - _Requirements: 3.1, 4.1_

- [x] 11.4 BugWorkflowFooter共通化後のテスト検証を行う
  - canShowConvertButton条件判定の検証
  - Electron版/Remote UI版両方での動作確認
  - _Requirements: 7.2, 7.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 3タブの底部タブバー表示 | 2.2 | Feature |
| 1.2 | タブタップでコンテンツ切替 | 8.1, 8.4 | Feature |
| 1.3 | アクティブタブの視覚的強調 | 2.2 | Feature |
| 1.4 | DetailPage時に底部タブ非表示 | 2.3, 10.1 | Feature |
| 1.5 | 44x44px以上のタッチターゲット | 2.2 | Feature |
| 2.1 | Specタップでプッシュ遷移 | 2.1, 8.2 | Feature |
| 2.2 | Bugタップでプッシュ遷移 | 2.1, 8.3 | Feature |
| 2.3 | DetailPageに戻るボタン | 5.1, 6.1 | Feature |
| 2.4 | 戻るボタンでpop | 2.1, 8.2, 8.3, 11.1 | Feature |
| 2.5 | DetailPage時に底部タブ非表示 | 2.1, 2.3 | Feature |
| 2.6 | React stateでナビ管理 | 2.1, 8.1, 11.1 | Feature |
| 3.1 | SpecDetailPage下部にサブタブ | 4.1, 5.1, 10.2, 11.3 | Feature |
| 3.2 | Specタブ構成 | 5.2, 5.3 | Feature |
| 3.3 | AgentList固定3項目高さ | 5.2 | Feature |
| 3.4 | AgentタップでDrawer表示 | 5.2 | Feature |
| 3.5 | Artifactタブ構成 | 5.4 | Feature |
| 3.6 | Artifact編集機能共有 | 5.4 | Feature |
| 3.7 | WorkflowFooter表示 | 5.3 | Feature |
| 4.1 | BugDetailPage下部にサブタブ | 4.1, 6.1, 10.2, 11.3 | Feature |
| 4.2 | Bugタブ構成 | 6.2, 6.3 | Feature |
| 4.3 | AgentList固定3項目高さ | 6.2 | Feature |
| 4.4 | AgentタップでDrawer表示 | 6.2 | Feature |
| 4.5 | Artifactタブ構成 | 6.4 | Feature |
| 4.6 | BugWorkflowFooter表示 | 6.3 | Feature |
| 5.1 | Agentsタブに一覧表示 | 7.1, 10.2 | Feature |
| 5.2 | AgentタップでDrawer表示 | 7.1 | Feature |
| 5.3 | running Agentカウント表示 | 7.2 | Feature |
| 5.4 | Askボタン表示 | 7.3 | Feature |
| 6.1 | Drawer下からスライドアップ | 3.1, 10.2 | Feature |
| 6.2 | リアルタイムログ表示 | 3.1 | Feature |
| 6.3 | ドラッグで高さ調整 | 3.2, 11.2 | Feature |
| 6.4 | 追加指示入力フィールド | 3.3 | Feature |
| 6.5 | Sendボタン | 3.3, 11.2 | Feature |
| 6.6 | Continueボタン | 3.3, 11.2 | Feature |
| 6.7 | 外側タップ/下スワイプで閉じる | 3.4 | Feature |
| 6.8 | Desktop Webと内部レンダリング共有 | 3.1 | Feature |
| 7.1 | BugWorkflowFooterをshared/へ移動 | 1.1 | Infrastructure |
| 7.2 | 既存機能維持 | 1.1, 11.4 | Feature |
| 7.3 | Electron/RemoteUIで使用可能 | 1.1, 11.4 | Feature |
| 7.4 | Electronインポートパス更新 | 1.2 | Infrastructure |
| 8.1 | Specs一覧共有 | 9.1 | Feature |
| 8.2 | Bugs一覧共有 | 9.2 | Feature |
| 8.3 | フィルタ共有 | 9.1, 9.2 | Feature |
| 8.4 | 既存実装使用 | 9.1, 9.2 | Feature |
