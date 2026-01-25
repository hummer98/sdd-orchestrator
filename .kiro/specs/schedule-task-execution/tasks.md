# Implementation Plan

## 1. 型定義とデータモデル

- [x] 1.1 (P) スケジュールタスクの型定義を作成
  - スケジュールタスクのドメインモデル型を定義する
  - スケジュール条件（間隔ベース、曜日ベース、アイドルベース）のUnion型を定義
  - 回避ルール、ワークフロー設定、プロンプトの型を定義
  - 入力用型（ScheduleTaskInput）を定義
  - Zodバリデーションスキーマを作成
  - _Requirements: 2.4, 3.1, 3.2, 4.1, 5.1, 6.1, 6.2, 8.1_

## 2. Main Processサービス層

- [x] 2.1 (P) ファイル永続化サービスを実装
  - `.kiro/schedule-tasks.json`の読み書き機能を実装
  - ファイルが存在しない場合のデフォルト値生成
  - アトミックな書き込み処理（一時ファイル経由）
  - 最終実行開始時間の更新機能
  - _Requirements: 9.1, 9.4_
  - _Method: scheduleTaskFileService_
  - _Verify: Grep "scheduleTaskFileService" in services/_

- [x] 2.2 (P) タスクCRUDサービスを実装
  - タスクの作成・読取・更新・削除機能
  - Zodスキーマによるバリデーション
  - タスク名の一意性チェック
  - プロジェクト開始時の整合性チェック
  - _Requirements: 2.4, 9.3_
  - _Method: scheduleTaskService_
  - _Verify: Grep "scheduleTaskService" in services/_

- [x] 2.3 スケジュール管理コーディネーターを実装
  - スケジュール条件の定期チェック（1分間隔）
  - タスクキューの管理（キューイング条件と実行条件の分離）
  - humanActivityTrackerとの統合によるアイドル時間取得
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 10.1, 10.2, 10.3_
  - _Method: ScheduleTaskCoordinator, humanActivityTracker_
  - _Verify: Grep "ScheduleTaskCoordinator" in services/_

- [x] 2.4 回避ルールと実行制御を実装
  - AgentRegistryと連携した回避対象チェック
  - 待機/スキップの挙動制御
  - 即時実行機能（回避ルール非適用）
  - 最終実行時間の記録
  - _Requirements: 6.3, 7.2, 7.5, 10.4, 10.5_
  - _Method: ScheduleTaskCoordinator, AgentRegistry_

- [x] 2.5 workflowモードとAgent起動を実装
  - worktree自動作成（WorktreeService利用）
  - 命名規則: `schedule/{task-name}/{suffix}`
  - 各プロンプトごとのAgent起動
  - 並列実行フラグ対応
  - _Requirements: 5.4, 5.5, 8.2, 8.3, 8.4, 8.5, 8.6_
  - _Method: WorktreeService, AgentProcess_

## 3. IPC層

- [x] 3.1 IPCチャンネル定義を追加
  - `schedule-task:*` チャンネルを定義
  - タスクCRUD、即時実行、キュー取得、実行中タスク取得
  - ステータス変更イベント
  - _Requirements: 全IPC_
  - _Verify: Grep "schedule-task:" in channels.ts_

- [x] 3.2 IPCハンドラを実装
  - scheduleTaskHandlersの作成
  - リクエスト検証と転送
  - handlers.tsへの登録
  - _Requirements: 全IPC_
  - _Method: executeProjectAgent, startAgent_
  - _Verify: Grep "scheduleTaskHandlers" in handlers.ts_

- [x] 3.3 preload APIを公開
  - scheduleTask関連APIをcontextBridge経由で公開
  - 型定義の追加
  - _Requirements: 全IPC_

## 4. Renderer状態管理

- [x] 4.1 scheduleTaskStoreを作成
  - タスク一覧のキャッシュ管理
  - 編集画面の状態管理
  - IPC経由でのデータ取得・更新
  - **electron-store同期**:
    - 保存時: ファイル書き込み成功後にelectron-storeキャッシュ更新
    - 読み込み時: プロジェクトファイルをマスターとし、キャッシュに反映
    - 競合時: プロジェクトファイル優先（electron-storeはフォールバック）
  - _Requirements: 全UI, 9.2_
  - _Method: scheduleTaskStore_
  - _Verify: Grep "scheduleTaskStore" in stores/_

## 5. UIコンポーネント - 一覧画面

- [x] 5.1 ScheduleTaskSettingViewを作成
  - ダイアログ全体のレイアウト
  - ヘッダー（タスク追加ボタン）、リスト、フッターの構成
  - スライドナビゲーションの管理
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 5.2 ScheduleTaskListItemを作成
  - タスク名、スケジュール種別、次回実行予定、最終実行日時の表示
  - 有効/無効トグル（インライン）
  - 削除アイコン
  - 即時実行ボタン
  - クリックで編集画面へ遷移
  - _Requirements: 1.3, 1.5, 1.6, 7.1_

- [x] 5.3 ImmediateExecutionWarningDialogを作成
  - 回避対象動作中の警告表示
  - 「それでも実行」「キャンセル」の選択肢
  - _Requirements: 7.3, 7.4, 7.5_

## 6. UIコンポーネント - 編集画面

- [x] 6.1 ScheduleTaskEditPageの基本構造を作成
  - Spec/Bug新規作成と同様のレイアウト
  - タスク名入力
  - 新規作成モードと編集モードの切り替え
  - 保存・キャンセル操作
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 6.2 (P) スケジュール種別選択UIを作成
  - 固定/条件の切り替え
  - 間隔ベース（n時間経過）の設定UI
  - 曜日ベース（毎週n曜日のn時）の設定UI
  - アイドルベース（n分経過）の設定UI
  - 「アイドル後に実行」オプション
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

- [x] 6.3 (P) PromptListEditorを作成
  - 複数プロンプトの登録UI
  - プロンプトの追加・編集・削除
  - 順序変更（ドラッグ&ドロップまたは上下ボタン）
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.4 (P) AvoidanceRuleEditorを作成
  - 回避対象の選択（spec-merge, commit, bug-merge, schedule-task）
  - 回避時挙動の選択（待機/スキップ）
  - _Requirements: 6.1, 6.2_

- [x] 6.5 (P) workflowモード設定UIを作成
  - 有効/無効トグル
  - suffixモード選択（自動/カスタム）
  - カスタムsuffix入力
  - _Requirements: 8.1, 8.4_

- [x] 6.6 他Agent動作中の挙動設定UIを作成
  - 待機/スキップの選択
  - _Requirements: 2.2_

## 7. humanActivityTracker連携

- [x] 7.1 アイドル時間のMain Process同期を実装
  - useHumanActivityフックの拡張
  - 定期的なアイドル時間のMain Processへの報告
  - Main側でのアイドル時間計算
  - _Requirements: 4.3_

## 8. 結合・配線

- [x] 8.1 ProjectAgentFooterにタイマーアイコンを追加
  - クリックでScheduleTaskSettingViewダイアログを表示
  - _Requirements: 1.1_

- [x] 8.2 コンポーネントのexport追加
  - renderer/components/index.tsにScheduleTask関連コンポーネントをexport
  - renderer/stores/index.tsにscheduleTaskStoreをexport
  - _Requirements: 全UI_

- [x] 8.3 Main Processの初期化処理に統合
  - プロジェクト選択時にScheduleTaskCoordinatorを初期化
  - プロジェクト変更時のリソース解放
  - _Requirements: 9.3, 10.1_

## 9. テスト

- [x] 9.1 (P) ユニットテスト作成
  - ScheduleTaskCoordinator: スケジュール条件判定、回避ルール判定、キュー管理
  - scheduleTaskService: バリデーション、CRUD操作
  - scheduleTaskFileService: ファイル読み書き
  - _Requirements: 全体_

- [x] 9.2 統合テスト作成
  - ScheduleTaskCoordinator + humanActivityTracker: アイドル検出連携
  - ScheduleTaskCoordinator + AgentProcess: Agent起動フロー
  - _Requirements: 4.3, 5.4_

- [x] 9.3 E2Eテスト作成
  - タスク作成 → 保存 → 一覧表示 → 編集 → 削除
  - 即時実行 → Agent起動確認
  - 有効/無効トグル
  - _Requirements: 1.1-1.6, 2.1-2.4, 7.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | タイマーアイコンクリックでダイアログ表示 | 5.1, 8.1 | Feature |
| 1.2 | ScheduleTaskSettingView構成 | 5.1 | Feature |
| 1.3 | ScheduleTaskListItem情報表示 | 5.2 | Feature |
| 1.4 | リストアイテムクリックで編集画面へ遷移 | 5.1 | Feature |
| 1.5 | 削除確認ダイアログ | 5.2 | Feature |
| 1.6 | 有効/無効トグル即時更新 | 5.2 | Feature |
| 2.1 | Spec/Bug新規作成と同様のレイアウト | 6.1 | Feature |
| 2.2 | 編集項目一覧 | 6.1, 6.6 | Feature |
| 2.3 | 新規作成時の空フォーム表示 | 6.1 | Feature |
| 2.4 | バリデーションと保存 | 1.1, 2.2, 6.1 | Feature |
| 3.1 | 前回実行からn時間経過パターン | 2.3, 6.2 | Feature |
| 3.2 | 毎週n曜日のn時パターン | 2.3, 6.2 | Feature |
| 3.3 | アイドル後に実行オプション | 2.3, 6.2 | Feature |
| 4.1 | アイドルn分経過パターン | 2.3, 6.2 | Feature |
| 4.2 | アイドル時間分単位指定 | 6.2 | Feature |
| 4.3 | アイドル検出時キュー追加 | 2.3, 7.1 | Feature |
| 5.1 | 複数プロンプト登録 | 1.1, 6.3 | Feature |
| 5.2 | プロンプト個別編集・削除 | 6.3 | Feature |
| 5.3 | プロンプト順序変更 | 6.3 | Feature |
| 5.4 | プロンプトごとにAgent起動 | 2.5, 9.2 | Feature |
| 5.5 | 並列実行可能 | 2.5 | Feature |
| 6.1 | 回避対象指定 | 1.1, 6.4 | Feature |
| 6.2 | 回避時挙動指定 | 1.1, 6.4 | Feature |
| 6.3 | 回避対象動作中の挙動 | 2.4 | Feature |
| 7.1 | 即時実行ボタン | 5.2 | Feature |
| 7.2 | 即時実行時回避ルール非適用 | 2.4 | Feature |
| 7.3 | 警告ダイアログ表示 | 5.3 | Feature |
| 7.4 | 選択肢提供 | 5.3 | Feature |
| 7.5 | 強制実行 | 2.4, 5.3 | Feature |
| 8.1 | workflowモード切替 | 1.1, 6.5 | Feature |
| 8.2 | worktree自動作成 | 2.5 | Feature |
| 8.3 | 命名規則 | 2.5 | Feature |
| 8.4 | ユーザー指定suffix | 2.5, 6.5 | Feature |
| 8.5 | 複数プロンプト別worktree | 2.5 | Feature |
| 8.6 | 実行後worktree放置 | 2.5 | Feature |
| 9.1 | プロジェクト内ファイル保存 | 2.1 | Feature |
| 9.2 | Electronローカルストレージ同期 | 4.1 | Feature |
| 9.3 | プロジェクト開始時整合性確認 | 2.2, 8.3 | Feature |
| 9.4 | 最終実行開始時間記録 | 2.1 | Feature |
| 10.1 | キューイング条件と実行条件分離 | 2.3, 8.3 | Feature |
| 10.2 | 固定スケジュール時刻でキュー追加 | 2.3 | Feature |
| 10.3 | アイドル条件でキュー追加 | 2.3 | Feature |
| 10.4 | 実行条件満たしたら実行 | 2.4 | Feature |
| 10.5 | アイドル後に実行オプション待機 | 2.4 | Feature |
