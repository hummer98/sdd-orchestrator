# Implementation Plan

## Task 1. WebSocket API拡張（executeSpecPlan）
- [x] 1.1 (P) ApiClientインターフェースにexecuteSpecPlanメソッドを追加
  - `shared/api/types.ts`のApiClientインターフェースにオプショナルメソッドを定義
  - 引数: `description: string`, `worktreeMode: boolean`
  - 戻り値: `Promise<Result<AgentInfo, ApiError>>`
  - _Requirements: 3.1_
  - _Contracts: ApiClient.executeSpecPlan API_

- [x] 1.2 (P) WebSocketApiClientにexecuteSpecPlan実装を追加
  - 既存の`sendRequest`パターンを使用
  - メッセージタイプ: `EXECUTE_SPEC_PLAN`
  - ペイロード: `{ description, worktreeMode }`
  - _Requirements: 3.2_
  - _Method: sendRequest_

- [x] 1.3 webSocketHandlerにEXECUTE_SPEC_PLANハンドラを追加
  - メッセージペイロードのバリデーション（description必須、非空）
  - WorkflowController経由でspec-plan実行
  - AgentInfoをレスポンスとして返却
  - 既存のCREATE_SPEC/CREATE_BUGハンドラパターンを参考に実装
  - _Requirements: 3.3, 3.4_
  - _Method: WorkflowController.executeSpecPlan_
  - _Verify: Grep "EXECUTE_SPEC_PLAN" in webSocketHandler.ts_

## Task 2. CreateSpecDialogRemoteの実装
- [x] 2.1 CreateSpecDialogRemoteコンポーネントを作成
  - `src/remote-ui/components/CreateSpecDialogRemote.tsx`に新規作成
  - CreateBugDialogRemoteと同じUI構造を踏襲
  - Props: `isOpen`, `onClose`, `apiClient`, `deviceType`, `onSuccess`
  - Desktop版: 中央モーダル、Smartphone版: フルスクリーンモーダル
  - _Requirements: 2.1, 2.2, 2.3_
  - _Contracts: CreateSpecDialogRemoteProps_

- [x] 2.2 ダイアログ内のフォーム機能を実装
  - 説明入力用のテキストエリア
  - Worktreeモードスイッチ（オプション、デフォルトfalse）
  - 「spec-planで作成」ボタン
  - descriptionが空の場合は送信ボタンを無効化
  - _Requirements: 2.1, 2.2, 2.3, 2.6_

- [x] 2.3 spec-plan実行とエラーハンドリングを実装
  - ApiClient.executeSpecPlanを呼び出し
  - 成功時: ダイアログを閉じてonSuccessコールバック実行
  - エラー時: ダイアログ内にエラーメッセージを表示
  - ローディング状態の管理
  - _Requirements: 2.4, 2.5_

## Task 3. LeftSidebarの拡張
- [x] 3.1 LeftSidebarにダイアログ状態管理を追加
  - `App.tsx`内のLeftSidebarコンポーネントを拡張
  - `createDialogType: 'spec' | 'bug' | null`状態を追加
  - ダイアログ開閉制御ロジックを実装
  - _Requirements: 4.2_
  - _Contracts: LeftSidebarState_

- [x] 3.2 タブヘッダーに新規作成ボタンを追加
  - Specs/Bugsタブボタンの横に+アイコンボタンを配置
  - アクティブタブに応じてボタンのラベル/動作を切り替え
  - Electron版DocsTabs.tsxのタブヘッダー構造を参考に実装
  - _Requirements: 1.1, 1.2, 1.3, 4.1_

- [x] 3.3 CreateSpecDialogRemoteをLeftSidebarに統合
  - CreateSpecDialogRemoteのインポートと配置
  - Specタブ選択時に+ボタンでダイアログを開く
  - onSuccess時のAgentView遷移処理
  - _Requirements: 1.1, 1.3_

- [x] 3.4 CreateBugDialogRemoteをLeftSidebarに統合
  - 既存のCreateBugDialogRemoteをLeftSidebarから参照
  - Bugタブ選択時に+ボタンでダイアログを開く
  - 既存のBug作成機能との整合性を維持
  - _Requirements: 1.2, 1.3, 4.3, 5.2_

## Task 4. スマートフォンFAB対応
- [x] 4.1 LeftSidebarにdeviceType判定ロジックを追加
  - useDeviceTypeフックを使用してデバイスタイプを判定
  - Desktop/Smartphoneで表示を切り替え
  - _Requirements: 5.3_

- [x] 4.2 スマートフォン時のFAB表示を実装
  - アクティブタブに応じて1つのFABを表示（Spec/Bug切り替え）
  - FABの位置: 画面右下に固定
  - タブ切り替え時にFABのラベル/動作を切り替え
  - _Requirements: 5.3_

## Task 5. BugsViewからのBug作成ボタン削除
- [x] 5.1 BugsViewから既存のCreateBugButtonRemote/CreateBugDialogRemoteを削除
  - `src/remote-ui/views/BugsView.tsx`から該当コンポーネントを削除
  - LeftSidebarでの実装により重複を解消
  - _Requirements: 5.1_

## Task 6. 統合テスト
- [x] 6.1 タブ切り替えと作成ボタン連動の動作確認
  - Specsタブ選択時に+ボタンでSpec作成ダイアログが開くことを確認
  - Bugsタブ選択時に+ボタンでBug作成ダイアログが開くことを確認
  - _Requirements: 1.1, 1.2, 1.3, 4.2_

- [x] 6.2 Spec作成フロー全体の動作確認
  - ダイアログ表示 → 説明入力 → spec-plan実行 → ダイアログ閉じる
  - WebSocket経由でのspec-plan実行が成功することを確認
  - AgentInfoが正しく返却されることを確認
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 3.4_

- [x] 6.3 エラーハンドリングの動作確認
  - APIエラー時にダイアログ内にエラーメッセージが表示されることを確認
  - 空の説明入力時に送信ボタンが無効化されることを確認
  - _Requirements: 2.5, 2.6_

- [x] 6.4 スマートフォンレイアウトでのFAB操作確認
  - FABがアクティブタブに応じて切り替わることを確認
  - FABタップでダイアログが開くことを確認
  - _Requirements: 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | SpecsタブアクティブでSpec新規作成ボタン表示 | 3.2, 3.3, 6.1 | Feature |
| 1.2 | BugsタブアクティブでBug新規作成ボタン表示 | 3.2, 3.4, 6.1 | Feature |
| 1.3 | ボタンクリックで対応ダイアログ表示 | 3.2, 3.3, 3.4, 6.1 | Feature |
| 2.1 | 説明入力テキストエリア | 2.1, 2.2, 6.2 | Feature |
| 2.2 | Worktreeモードスイッチ | 2.1, 2.2, 6.2 | Feature |
| 2.3 | spec-planで作成ボタン | 2.1, 2.2, 6.2 | Feature |
| 2.4 | 実行成功時ダイアログ閉じ | 2.3, 6.2 | Feature |
| 2.5 | エラーメッセージ表示 | 2.3, 6.3 | Feature |
| 2.6 | 空説明時ボタン無効化 | 2.2, 6.3 | Feature |
| 3.1 | ApiClientにexecuteSpecPlanメソッド追加 | 1.1 | Infrastructure |
| 3.2 | WebSocketApiClientにexecuteSpecPlan実装 | 1.2 | Infrastructure |
| 3.3 | EXECUTE_SPEC_PLANハンドラ追加 | 1.3, 6.2 | Infrastructure |
| 3.4 | AgentInfo返却 | 1.3, 6.2 | Infrastructure |
| 4.1 | タブヘッダーにボタン横並び配置 | 3.2 | Feature |
| 4.2 | タブ切り替えでボタン動作切り替え | 3.1, 3.2, 6.1 | Feature |
| 4.3 | Bug作成機能との整合性 | 3.4 | Feature |
| 5.1 | BugsViewから既存ボタン削除 | 5.1 | Cleanup |
| 5.2 | LeftSidebarでBugタブ時ダイアログ表示 | 3.4 | Feature |
| 5.3 | FABのスマートフォン対応維持 | 4.1, 4.2, 6.4 | Feature |
