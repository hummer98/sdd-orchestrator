# Implementation Plan

## Task 1: 型定義とユーティリティの抽出

- [x] 1.1 (P) SpecStore共通型定義の整理
  - 既存specStore.tsから分割対象の型定義を特定
  - SpecListState、SpecDetailState、AutoExecutionState等の型を明確化
  - ArtifactType、TaskProgressなど共有型の確認
  - _Requirements: 1.1, 2.1, 2.2, 5.1, 6.1_

## Task 2: 独立ストアの実装

- [x] 2.1 (P) SpecListStore - Spec一覧状態管理の実装
  - specs配列の状態管理を実装
  - loadSpecsアクションでprojectPathを引数として受け取り一覧取得
  - setSpecsアクションで外部からのspec設定に対応
  - ソート状態（sortBy、sortOrder）とフィルタ状態（statusFilter）の管理
  - getSortedFilteredSpecsセレクタでソート・フィルタ済み一覧を返却
  - updateSpecMetadataアクションで単一specのメタデータ更新
  - isLoading、error状態の管理（loadSpecs中はisLoading=true）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 2.2 (P) SpecDetailStore - 選択Spec詳細状態管理の実装
  - selectedSpec、specDetail状態の管理
  - selectSpecアクションでspecパスから詳細読み込み
  - specJson、全アーティファクト、taskProgressの一括読み込み
  - silentオプション対応（ローディング表示なしで再読み込み）
  - clearSelectedSpecアクションで選択解除
  - refreshSpecDetailアクションで現在選択中specの再読み込み
  - SpecSyncService向け内部セッター（setSpecDetail、setSpecJson、setArtifact、setTaskProgress）
  - error状態の管理
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2.3 (P) AutoExecutionStore - 自動実行ランタイム状態の実装
  - autoExecutionRuntimeMap（Map<specId, AutoExecutionRuntimeState>）の管理
  - getAutoExecutionRuntimeセレクタで特定specの状態取得（未知specIdにはデフォルト状態）
  - setAutoExecutionRunning、setAutoExecutionPhase、setAutoExecutionStatusアクション
  - startAutoExecution、stopAutoExecutionアクションで実行状態の開始・終了
  - 他ストア非依存の純粋な状態管理
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 2.4 (P) SpecManagerExecutionStore - spec-manager実行状態の実装
  - specManagerExecution状態（isRunning、currentPhase、currentSpecId、error等）の管理
  - executeSpecManagerGenerationアクションでフェーズ実行
  - 実行中の重複防止（isRunning時は警告ログで早期リターン）
  - handleCheckImplResultアクションでimpl完了処理
  - updateImplTaskStatus、clearSpecManagerErrorアクション
  - エラー時のerror状態設定とisRunning=false
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

## Task 3: サービス層の実装

- [x] 3.1 SpecSyncService - ファイル同期サービスの実装
  - initメソッドでSpecDetailStore/SpecListStore/editorStoreのコールバック注入
  - updateSpecJsonでspec.jsonのみ再読み込み（アーティファクト再読み込みなし）
  - updateArtifactで単一アーティファクト再読み込み（spec.json再読み込みなし）
  - syncDocumentReviewStateでdocument-review-*.mdとspec.jsonの同期
  - syncInspectionStateでinspection-*.mdとspec.jsonの同期
  - syncTaskProgressでタスク完了率計算とフェーズ自動修正
  - 全タスク完了時にphaseをimplementation-completeに自動更新
  - tasks更新時はtaskProgress再計算
  - アクティブタブ一致時のeditorStore同期（コールバック経由）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 3.2 SpecWatcherService - ファイル監視サービスの実装
  - initメソッドでSpecSyncService/SpecDetailStore/SpecListStoreの参照注入
  - startWatchingでelectronAPI.onSpecsChangedリスナー登録
  - stopWatchingでリスナー解除とwatcher停止
  - ファイル変更タイプの判定（spec.json、artifact、document-review、inspection、tasks）
  - spec.json変更時はsyncService.updateSpecJson呼び出し
  - artifact変更時はsyncService.updateArtifact呼び出し
  - document-review-*.md変更時はsyncService.syncDocumentReviewState呼び出し
  - inspection-*.md変更時はsyncService.syncInspectionState呼び出し
  - tasks.md変更時はupdateArtifact + syncTaskProgress両方呼び出し
  - 非選択spec変更時はupdateSpecMetadataのみ呼び出し
  - isWatching状態の管理
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

## Task 4: Facadeストアと統合

- [x] 4.1 useSpecStore Facade - 既存インターフェース維持の統合ストア実装
  - 全子ストア（SpecListStore、SpecDetailStore、AutoExecutionStore、SpecManagerExecutionStore）の状態結合
  - 全サービス（SpecSyncService、SpecWatcherService）の初期化と接続
  - 既存の全state properties（specs、selectedSpec、specDetail等）を同一型でエクスポート
  - 既存の全actionメソッド（loadSpecs、selectSpec等）を同一シグネチャでエクスポート
  - アクション呼び出し時は適切な子ストア/サービスに委譲
  - Zustand subscribeWithSelectorで子ストア状態変更を監視しFacade更新
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4.2 循環依存の解消
  - projectStoreへの動的import削除、projectPathは引数として受け取る設計
  - editorStoreとの連携はSpecSyncServiceへのコールバック注入で実現
  - projectStoreからはsetSpecs/startWatchingを直接呼び出し
  - 明確な単方向依存グラフの実現
  - cross-store通信は明示的なevent/callbackパターンで実装
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## Task 5: ディレクトリ構成とエクスポート整備

- [x] 5.1 ファイル配置とbarrel exports
  - stores/spec/ディレクトリに分割ストア群を配置
  - services/ディレクトリに分割サービス群を配置
  - specStore.tsは既存パスを維持しFacadeとして再構成
  - stores/spec/index.tsでbarrel exports作成
  - services/index.tsでbarrel exports作成
  - 命名規約遵守（サービス: camelCase、ストア: camelCase）
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Task 6: テストと互換性検証

- [x] 6.1 (P) 分割ストアの単体テスト
  - specListStore.test.ts: loadSpecs、setSpecs、getSortedFilteredSpecs、updateSpecMetadata
  - specDetailStore.test.ts: selectSpec（通常/silent）、clearSelectedSpec、refreshSpecDetail
  - autoExecutionStore.test.ts: get/set runtime state、デフォルト状態返却
  - specManagerExecutionStore.test.ts: execute、concurrent prevention、error handling
  - _Requirements: 1.7, 1.8, 2.7, 2.8, 5.8, 6.6, 6.7_

- [x] 6.2 (P) 分割サービスの単体テスト
  - specSyncService.test.ts: updateSpecJson、updateArtifact、sync*メソッド、taskProgress計算
  - specWatcherService.test.ts: startWatching、stopWatching、ファイルタイプ別dispatch
  - callback injection patternのテスト
  - _Requirements: 3.6, 3.7, 3.8, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 6.3 Facade統合テスト
  - 既存specStore.test.tsの全テストがFacade経由でパスすることを確認
  - 子ストア間連携の動作検証
  - ファイル変更イベント伝播の検証
  - 既存コンポーネントとの互換性確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
