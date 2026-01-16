# Implementation Plan

## Task Format Template

タスクは自然言語でケイパビリティ・成果を記述し、コード詳細（ファイルパス、関数名等）は含めない。

---

- [x] 1. Bug自動実行状態管理ストアの実装
- [x] 1.1 (P) Bug自動実行ランタイム状態の型定義
  - Bug毎の自動実行状態を表す型を定義する
  - 実行中フラグ、現在フェーズ、ステータス、失敗フェーズ、リトライ回数を含める
  - デフォルト状態（idle）を定義する
  - 既存のSpec用状態管理パターンと整合させる
  - _Requirements: 1.4_

- [x] 1.2 Bug毎状態管理のZustand store作成
  - Bug毎の状態をMap構造で管理するstoreを作成する
  - 特定バグの状態取得（存在しない場合はデフォルト返却）
  - 自動実行開始・停止時のMap更新
  - Main Processからのステータス更新受け入れ
  - エラー状態・完了状態の設定
  - Electron版とRemote UI版で共有可能な場所に配置する
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.4_

- [x] 2. IPCイベントリスナーによる状態同期（push）
- [x] 2.1 IPCイベントリスナーの初期化関数実装
  - アプリ初期化時に一度だけIPCリスナーを登録する仕組みを作成
  - 重複登録を防止するロジックを含める
  - クリーンアップ関数も提供する
  - _Requirements: 2.5_

- [x] 2.2 ステータス変更イベントのハンドリング
  - ステータス変更通知受信時に該当バグのstore状態を更新
  - 該当バグが存在しない場合は新規エントリを作成
  - _Requirements: 2.1_

- [x] 2.3 フェーズ完了・自動実行完了・エラーイベントのハンドリング
  - フェーズ完了通知受信時にログ出力を行う
  - 自動実行完了通知受信時に完了状態に更新
  - エラー通知受信時にエラー状態に更新（失敗フェーズ、リトライ回数含む）
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3. バグ選択時の状態取得（pull）
- [x] 3.1 Main Processからの状態取得アクション実装
  - バグ選択時にMain Processから最新状態を問い合わせる機能を実装
  - 既存のIPC API（bugAutoExecutionStatus）を使用する
  - 取得成功時はstoreを更新、失敗または状態なしの場合はデフォルト状態を設定
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. BugWorkflowViewのstore連携
- [x] 4.1 BugWorkflowViewでのstore参照への移行
  - 既存のサービス参照をstoreからの状態取得に置き換える
  - 選択中バグのパスを使用してstoreから対応する状態を取得
  - バグ未選択時はデフォルト状態を表示
  - _Requirements: 4.1_

- [x] 4.2 IPC直接呼び出しへの変更
  - 自動実行開始・停止・リトライの操作をelectronAPI経由で直接呼び出す
  - 既存サービスを経由しない形に変更
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 4.3 既存サービス参照の削除
  - BugWorkflowViewからBugAutoExecutionServiceへの参照を全て削除
  - サービス取得・破棄関連のimport文を削除
  - _Requirements: 4.5_

- [x] 5. BugAutoExecutionServiceの削除
- [x] 5.1 (P) サービスファイルの削除
  - BugAutoExecutionService実装ファイルを削除
  - 対応するテストファイルを削除
  - _Requirements: 5.1, 5.2_

- [x] 5.2 全ファイルからの参照削除
  - プロジェクト全体からサービスへの参照を検索して削除
  - サービス取得・破棄関数への参照も全て削除
  - export文からの削除も含める
  - _Requirements: 5.3, 5.4_

- [x] 6. Remote UI対応
- [x] 6.1 WebSocketハンドラでの状態変更通知対応
  - Bug自動実行状態変更イベントをRemote UIにも配信
  - 既存のWebSocketイベント配信パターンに従う
  - _Requirements: 6.2_

- [x] 6.2 Remote UIでのバグ選択時状態取得
  - Remote UIからバグ選択時にWebSocket経由で状態取得
  - 共有storeのApiClient抽象化を活用
  - _Requirements: 6.3_

- [x] 7. エントリーポイント接続
- [x] 7.1 アプリ初期化時のIPCリスナー登録
  - アプリ起動時にBug自動実行IPCリスナーを初期化
  - 既存の初期化処理に組み込む
  - _Requirements: 2.5_

- [x] 7.2 バグ選択フローでの状態取得トリガー
  - バグ選択時に状態取得を自動実行するフローを接続
  - UIから新機能にアクセス可能であることを確認
  - _Requirements: 3.1, 4.1_

- [x] 8. テスト実装
- [x] 8.1 (P) storeユニットテスト
  - 状態取得テスト（存在するbugPath、存在しないbugPath）
  - 状態更新テスト（開始、停止、エラー、完了）
  - Main Process状態でのstore更新テスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8.2 (P) IPCリスナーユニットテスト
  - 重複登録防止のテスト
  - 各イベントハンドラのstore更新テスト
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8.3 統合テスト
  - **前提**: 既存のBugWorkflowView.test.tsxを更新し、BugAutoExecutionServiceのmockをbugAutoExecutionStoreのmockに変更する
  - BugWorkflowViewとstore連携のテスト
  - バグ選択時の状態取得と表示テスト
  - 自動実行操作とstore状態の連動テスト
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8.4 E2Eテスト
  - バグ切り替え時の状態表示テスト
  - バグAでエラー発生後、バグBに切り替えてidle状態を確認
  - バグBからバグAに戻ってエラー状態を確認
  - _Requirements: 1.2, 1.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Map<bugPath, State>で状態管理 | 1.2 | Infrastructure |
| 1.2 | バグAのエラーがバグBに影響しない | 1.2, 8.1, 8.4 | Infrastructure, Validation |
| 1.3 | バグ選択時に対応する状態を表示 | 1.2, 7.2, 8.4 | Infrastructure, Feature |
| 1.4 | 状態保持（isAutoExecuting等） | 1.1, 8.1 | Infrastructure, Validation |
| 2.1 | onBugAutoExecutionStatusChangedでstore更新 | 2.2, 8.2 | Feature, Validation |
| 2.2 | onBugAutoExecutionPhaseCompletedでログ出力 | 2.3, 8.2 | Feature, Validation |
| 2.3 | onBugAutoExecutionCompletedで状態更新 | 2.3, 8.2 | Feature, Validation |
| 2.4 | onBugAutoExecutionErrorで状態更新 | 2.3, 8.2 | Feature, Validation |
| 2.5 | IPCリスナー一度だけ登録 | 2.1, 7.1, 8.2 | Infrastructure, Feature, Validation |
| 3.1 | バグ選択時にMain Processから状態取得 | 3.1, 7.2 | Feature |
| 3.2 | 取得成功時にstore更新 | 3.1 | Feature |
| 3.3 | 状態なしの場合はデフォルト設定 | 3.1 | Feature |
| 3.4 | bugAutoExecutionStatus API使用 | 3.1 | Feature |
| 4.1 | BugWorkflowViewがstoreから状態取得 | 4.1, 7.2, 8.3 | Feature, Validation |
| 4.2 | 自動実行開始時にelectronAPI直接呼び出し | 4.2, 8.3 | Feature, Validation |
| 4.3 | 自動実行停止時にelectronAPI直接呼び出し | 4.2, 8.3 | Feature, Validation |
| 4.4 | リトライ時にelectronAPI直接呼び出し | 4.2, 8.3 | Feature, Validation |
| 4.5 | BugAutoExecutionService参照削除 | 4.3, 8.3 | Infrastructure, Validation |
| 5.1 | BugAutoExecutionService.ts削除 | 5.1 | Infrastructure |
| 5.2 | BugAutoExecutionService.test.ts削除 | 5.1 | Infrastructure |
| 5.3 | BugAutoExecutionService参照削除（全ファイル） | 5.2 | Infrastructure |
| 5.4 | getBugAutoExecutionService参照削除 | 5.2 | Infrastructure |
| 6.1 | bugAutoExecutionStoreをshared/stores/に配置 | 1.2 | Infrastructure |
| 6.2 | Remote UIがWebSocket経由で状態受信 | 6.1 | Feature |
| 6.3 | Remote UIでバグ選択時にWebSocket経由で状態取得 | 6.2 | Feature |
| 6.4 | Electron版とRemote UI版で同一インターフェース | 1.2 | Infrastructure |
