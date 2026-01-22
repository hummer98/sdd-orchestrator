# Implementation Plan

## Task 1. メトリクスデータ永続化基盤

- [ ] 1.1 (P) メトリクスレコードのスキーマ定義と型を実装する
  - JSONL形式で保存されるメトリクスレコードの型定義を作成
  - AI実行時間、人間消費時間、ライフサイクルイベントの3種類のレコード型
  - ISO8601タイムスタンプとミリ秒単位の経過時間フィールド
  - Zodによるランタイムバリデーションスキーマを定義
  - 型定義ファイルの配置先: `electron-sdd-manager/src/main/types/metrics.ts`
  - _Requirements: 4.3, 4.4, 4.5, 4.6_

- [ ] 1.2 (P) メトリクスファイル書き込みサービスを実装する
  - `.kiro/metrics.jsonl`への追記専用書き込み機能
  - 1レコード1行のJSONL形式を保証
  - ファイルが存在しない場合は新規作成
  - Zodによるレコード検証後に書き込み
  - 配置先: `electron-sdd-manager/src/main/services/metricsFileWriter.ts`
  - _Requirements: 4.1, 4.2_
  - _Contracts: MetricsFileWriter API_

- [ ] 1.3 メトリクスファイル読み込みサービスを実装する
  - JSONL形式のメトリクスデータを読み込み
  - 不正なJSONエントリをスキップし、エラーをログ記録
  - Spec IDでのフィルタリング機能
  - ファイル不在時は空配列を返却
  - 配置先: `electron-sdd-manager/src/main/services/metricsFileReader.ts`
  - _Requirements: 7.4_
  - _Contracts: MetricsFileReader API_

## Task 2. AI実行時間計測機能

- [ ] 2.1 メトリクスサービスのコア実装
  - AIセッションの開始・終了を管理するコアロジック
  - タイムスタンプ記録と経過時間の算出
  - Spec ID とフェーズ名を含めた記録
  - MetricsFileWriterへの委譲による永続化
  - 配置先: `electron-sdd-manager/src/main/services/metricsService.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Contracts: MetricsService API_

- [ ] 2.2 agentRecordServiceへのメトリクス計測フックを統合する
  - agentRecordServiceのonAgentStarted/onAgentCompletedコールバックにフック追加
  - Agent完了時にAIセッション終了を呼び出し
  - 既存のAgent管理フローと統合
  - _Requirements: 1.1, 1.2_

## Task 3. 人間消費時間計測機能

- [ ] 3.1 (P) 人間活動追跡サービスをRenderer側に実装する
  - 操作イベント（Spec選択、タブ切替、スクロール等）の監視
  - 45秒アイドルタイムアウトによるセッション管理
  - Spec切替・フォーカス離脱時のセッション終了処理
  - debounce（100ms間隔）によるイベント最適化
  - 配置先: `electron-sdd-manager/src/renderer/services/humanActivityTracker.ts`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_
  - _Contracts: HumanActivityTracker API_

- [ ] 3.2 人間セッション記録用のIPCチャンネルを追加する
  - RECORD_HUMAN_SESSION チャンネルの定義（channels.ts に追加）
  - Renderer→Mainへのセッションデータ送信
  - MetricsServiceでの人間セッション記録処理
  - _Requirements: 2.12_

- [ ] 3.3 UIコンポーネントに操作イベントリスナーを追加する
  - WorkflowView、DocsTabs等のコンポーネントにイベントハンドラを追加
  - 各種操作イベントをHumanActivityTrackerに通知
  - ウィンドウフォーカスイベントの監視
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.11_

## Task 4. 総所要時間計測機能

- [ ] 4.1 Specライフサイクル計測機能を実装する
  - spec-init実行時の開始タイムスタンプ記録
  - implementation-complete到達時の完了タイムスタンプ記録
  - 総所要時間の算出とmetrics.jsonlへの保存
  - ライフサイクルイベント（start/complete）の記録
  - _Requirements: 3.1, 3.2, 3.3_

## Task 5. 未完了セッション復旧機能

- [ ] 5.1 (P) セッション状態の一時ファイル管理を実装する
  - `.kiro/.metrics-session.tmp`への進行中セッション状態の保存
  - AIセッション・人間セッションの両方を追跡
  - アプリ終了時の一時ファイル更新
  - _Requirements: 7.1_

- [ ] 5.2 セッション復旧サービスを実装する
  - アプリ起動時に未完了セッションを検出
  - AIセッション: アプリ終了時刻を終了タイムスタンプとして使用
  - 人間セッション: 最後の操作から45秒後を終了タイムスタンプとして使用
  - 復旧後に一時ファイルを削除
  - 配置先: `electron-sdd-manager/src/main/services/sessionRecoveryService.ts`
  - _Requirements: 7.1, 7.2, 7.3_
  - _Contracts: SessionRecoveryService API_

- [ ] 5.3 アプリ起動時の復旧処理を統合する
  - app.on('ready')でセッション復旧サービスを呼び出し
  - 復旧結果のログ記録
  - _Requirements: 7.1_

## Task 6. メトリクス状態管理

- [ ] 6.1 (P) metricsStore（Zustand）を実装する
  - 現在のSpecに対するメトリクスサマリー状態
  - フェーズ別メトリクスの計算ロジック
  - 読み込み状態とエラー状態の管理
  - specStoreFacade.selectedSpec変更時の自動リロード
  - 配置先: `electron-sdd-manager/src/renderer/stores/metricsStore.ts`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2_
  - _Contracts: MetricsState, SpecMetrics_

- [ ] 6.2 メトリクス取得用のIPCチャンネルを追加する
  - GET_SPEC_METRICS チャンネルの定義
  - GET_PROJECT_METRICS チャンネルの定義
  - METRICS_UPDATED イベント通知チャンネルの定義
  - channels.ts への追加
  - _Requirements: 5.1_

## Task 7. メトリクスUI表示

- [ ] 7.1 メトリクスサマリーパネルコンポーネントを実装する
  - AI実行時間合計、人間消費時間合計、総所要時間を表示
  - ユーザーフレンドリーな時間形式（"1h 23m", "45m 30s"等）への変換
  - 完了/進行中のステータス表示
  - WorkflowView内、フェーズリストの上部に配置
  - 配置先: `electron-sdd-manager/src/shared/components/metrics/MetricsSummaryPanel.tsx`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - _Contracts: MetricsSummaryPanel_

- [ ] 7.2 フェーズ別メトリクス表示を実装する
  - requirements, design, tasks, implの各フェーズを個別表示
  - フェーズ別AI時間・人間時間の表示
  - 進行状況アイコン（未開始/実行中/完了）の表示
  - PhaseItem内へのインライン表示
  - 配置先: `electron-sdd-manager/src/shared/components/metrics/PhaseMetricsView.tsx`
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Contracts: PhaseMetricsView_

- [ ] 7.3 時間フォーマットユーティリティを実装する
  - ミリ秒から人間可読形式への変換ロジック
  - 短時間（秒単位）、中時間（分単位）、長時間（時間単位）の適切なフォーマット
  - 配置先: `electron-sdd-manager/src/shared/utils/timeFormat.ts`
  - _Requirements: 5.6_

## Task 8. プロジェクト横断メトリクス（オプショナル）

- [ ]* 8.1 (P) プロジェクトメトリクス集計機能を実装する
  - 全Specの総AI実行時間の集計
  - 全Specの総人間消費時間の集計
  - Spec完了数と進行中Spec数のカウント
  - _Requirements: 8.1, 8.2, 8.3_
  - _Contracts: ProjectMetricsAggregator_

- [ ]* 8.2 (P) プロジェクトメトリクス表示UIを実装する
  - プロジェクト全体のメトリクスサマリー表示
  - metricsStoreのprojectMetrics状態を使用
  - _Requirements: 8.1, 8.2, 8.3_

## Task 9. 統合テスト

- [ ] 9.1 メトリクスサービスのユニットテストを作成する
  - MetricsService: セッション開始/終了、時間計算のテスト
  - MetricsFileWriter: JSONL形式書き込みのテスト
  - MetricsFileReader: 不正エントリスキップのテスト
  - SessionRecoveryService: 復旧ロジックのテスト
  - HumanActivityTracker: タイムアウト処理のテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.8, 2.9, 4.1, 4.2, 7.1, 7.2, 7.3, 7.4_

- [ ] 9.2 メトリクスUI表示のE2Eテストを作成する
  - メトリクスサマリー表示の確認
  - フェーズ実行後のメトリクス更新の確認
  - Spec切替時のメトリクスリロードの確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_
