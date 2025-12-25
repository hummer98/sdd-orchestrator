# Implementation Plan

## Tasks

- [x] 1. spec.jsonにautoExecutionフィールドを追加しデータモデルを拡張する
- [x] 1.1 (P) SpecAutoExecutionState型とデフォルト値を定義する
  - spec.jsonに追加するautoExecution構造体の型を定義
  - isRunning、status、currentPhase、permissions、updatedAtの各フィールドを含む
  - DEFAULT_AUTO_EXECUTION_STATEをデフォルト値として実装
  - 既存のSpecJson型との統合（オプショナルフィールドとして追加）
  - _Requirements: 2.5_

- [x] 1.2 (P) SpecManagerServiceにautoExecution正規化機能を追加する
  - spec.json読み込み時にautoExecutionフィールドが未定義の場合にデフォルト値を適用
  - normalizeAutoExecution関数を実装
  - 型検証を追加してフィールドの整合性を確保
  - _Requirements: 2.4, 5.5_

- [x] 1.3 SpecManagerServiceのマイグレーション機能を実装する
  - 古い形式のspec.jsonを読み込んだ際に自動でautoExecutionフィールドを追加
  - 既存のapprovals、phase、updated_atフィールドとの互換性を維持
  - migrateSpecJson関数を実装
  - _Requirements: 5.4, 5.5_

- [x] 2. IPC通信レイヤーにautoExecution状態の読み書きチャンネルを追加する
- [x] 2.1 (P) autoExecution状態の更新用IPCチャンネルを実装する
  - UPDATE_SPEC_JSONチャンネルを定義 (汎用的なspec.json更新用)
  - specPathとupdatesを受け取りspec.jsonに書き込むハンドラを実装
  - 書き込み成功・エラー時の適切なレスポンスを返す
  - _Requirements: 2.1, 2.3_

- [x] 2.2 (P) autoExecution状態の読み取り用IPCチャンネルを実装する
  - 既存のREAD_SPEC_JSONチャンネルを活用
  - specPathからautoExecution状態を読み取るハンドラを実装
  - 正規化処理を適用してデフォルト値を補完
  - _Requirements: 2.2, 2.4_

- [x] 2.3 preloadスクリプトにautoExecution関連APIを公開する
  - updateSpecJson APIを追加
  - electronAPIに関数を登録
  - _Requirements: 2.1, 2.3_

- [x] 3. AutoExecutionServiceをSpec単位の状態管理に移行する
- [x] 3.1 AutoExecutionServiceにSpec単位の状態管理構造を追加する
  - getSpecAutoExecutionState()で選択中Specの状態を取得
  - 状態変更時にspec.jsonへ即時永続化するupdateSpecAutoExecutionStateを実装
  - _Requirements: 1.4, 4.3, 4.4_

- [x] 3.2 AutoExecutionService.startWithSpecState()をSpec単位に対応させる
  - specのautoExecutionから設定を読み込み
  - workflowStoreと同期してから開始
  - _Requirements: 1.1, 2.3_

- [x] 3.3 syncFromSpecAutoExecution()を実装する
  - specのautoExecutionからworkflowStoreへ設定を同期
  - Spec選択時に自動呼び出し
  - _Requirements: 1.3, 1.5, 2.2_

- [x] 3.4 workflowStoreに一括設定メソッドを追加する
  - setAutoExecutionPermissions()
  - setDocumentReviewOptions()
  - setValidationOptions()
  - _Requirements: 2.4, 2.5_

- [x] 4. specStoreにautoExecution状態管理機能を追加する
- [x] 4.1 specStoreにautoExecution同期機能を追加する
  - Spec選択時にautoExecutionServiceのsyncFromSpecAutoExecutionを呼び出し
  - specDetail.specJsonからautoExecutionを読み取り
  - _Requirements: 3.1, 3.2_

- [x] 4.2 specStoreのselectSpecでautoExecution状態を読み込む
  - Spec選択時にautoExecution状態もロード
  - 未定義の場合はデフォルト値を適用
  - UIへの状態通知をトリガー
  - _Requirements: 1.5, 3.2_

- [x] 4.3 specStoreにrefreshSpecDetail機能を追加する
  - 外部変更検出時にspec.jsonを再読み込み
  - autoExecution状態を含む全情報を更新
  - subscriberに変更を通知
  - _Requirements: 6.3_

- [x] 5. workflowStoreからautoExecution状態を分離し簡素化する
- [x] 5.1 workflowStoreから移行対象フィールドを削除する
  - isAutoExecuting、currentAutoPhase、autoExecutionStatusをworkflowStoreから削除
  - autoExecutionPermissionsはグローバル設定として保持
  - LocalStorage永続化対象を更新
  - specStoreにautoExecutionRuntime状態を追加して代替
  - AutoExecutionServiceとWorkflowViewをspecStore経由に移行
  - _Requirements: 5.3_

- [x] 5.2 手動フェーズ実行時の状態反映を調整する
  - 手動フェーズ実行時にAutoExecutionService経由で状態更新
  - spec.jsonにも反映されるよう連携
  - _Requirements: 5.3_

- [x] 6. UIコンポーネントをspec.jsonベースの状態管理に移行する
- [x] 6.1 WorkflowViewの状態参照元をspecStoreに変更する
  - workflowStoreではなくspecStoreからautoExecution状態を読み取り
  - useSpecStoreのsubscriptionでautoExecution変更を検知
  - Spec切り替え時に自動的にUIが更新されるよう実装
  - **具体的な変更箇所**:
    - `autoExecutionPermissions` → `specDetail.specJson.autoExecution.permissions`から取得
    - `documentReviewFlag` → `specDetail.specJson.autoExecution.documentReviewFlag`から取得
    - `validationOptions` → `specDetail.specJson.autoExecution.validationOptions`から取得
    - 実行時状態（`isAutoExecuting`, `autoExecutionStatus`, `currentAutoPhase`）はworkflowStoreから継続取得
  - _Requirements: 3.1, 3.2_

- [x] 6.2 PhaseExecutionPanelの互換性を維持する
  - 既存のフェーズ実行ボタン機能が正常動作することを確認
  - 状態参照元の変更に対応
  - **具体的な確認箇所**: PhaseExecutionPanel.tsx内のuseSpecStore/useWorkflowStore呼び出し
  - _Requirements: 5.1_

- [x] 6.3 ApprovalPanelの互換性を維持する
  - 既存の承認・却下機能が正常動作することを確認
  - 状態参照元の変更に対応
  - **具体的な確認箇所**: ApprovalPanel.tsx内の承認アクション経路
  - _Requirements: 5.2_

- [x] 6.4 AutoExecutionStatusDisplayを選択中Spec状態のみ表示に変更する
  - 選択中Specのautoexecution状態のみを表示
  - Spec切り替え時に表示を更新
  - **具体的な変更箇所**:
    - specStoreのautoExecution設定を表示するセクションを追加
    - 現在のpermissions, documentReviewFlag, validationOptionsの表示
    - workflowStoreからの実行時状態（isAutoExecuting等）と統合表示
  - _Requirements: 3.5_

- [x] 6.5 実行中フェーズの視覚的表示を維持する
  - 進行中のフェーズを視覚的に識別可能に表示
  - 完了状態の反映と次アクションへの遷移を実装
  - **具体的な確認箇所**: WorkflowView.tsx内のフェーズ表示ロジック
  - _Requirements: 3.3, 3.4_

- [x] 7. FileWatcher連携でspec.json外部変更を検出しUIに反映する
- [x] 7.1 FileWatcherでspec.jsonのautoExecution変更を検出する
  - spec.json変更時にautoExecutionフィールドの変更を識別
  - 変更検出をAutoExecutionServiceに通知
  - _Requirements: 6.1, 6.4_

- [x] 7.2 外部変更検出時にAutoExecutionServiceで状態を再読み込みする
  - syncWithSpecを呼び出して状態を同期
  - specStoreのrefreshSpecDetailをトリガー
  - _Requirements: 6.2_

- [x] 7.3 状態再読み込み後にUIを最新状態で表示する
  - specStoreの変更通知をUIコンポーネントが受信
  - WorkflowView、AutoExecutionStatusDisplayを更新
  - _Requirements: 6.3_

- [x] 8. Spec間の独立性とエラーハンドリングを実装する
- [x] 8.1 Spec間の状態独立性を保証する
  - SpecAの自動実行がSpecBの状態に影響しないことを実装
  - Spec切り替え時に前Specの状態を保持
  - 各Specのspec.jsonが独立して状態を管理
  - _Requirements: 4.1, 4.2_

- [x] 8.2 spec.json書き込み失敗時のリトライとエラー通知を実装する
  - 書き込み失敗時に3回リトライ
  - 最終的な失敗時にUIにエラー通知
  - メモリ上の状態は維持してデータ損失を防止
  - _Requirements: 2.3_

- [x] 8.3 状態不整合時のデフォルト状態適用を実装する
  - spec.json読み込み失敗時にデフォルト状態を適用
  - 無効なフェーズ遷移はログ出力して無視
  - ファイル監視切断時は自動再接続を試行
  - _Requirements: 2.4_

- [x] 9. ユニットテストとE2Eテストを作成する
- [x] 9.1 (P) AutoExecutionServiceのユニットテストを作成する
  - getSpecAutoExecutionState/updateSpecAutoExecutionState/syncFromSpecAutoExecution/startWithSpecStateの動作検証
  - Spec単位の状態管理が正常に機能することを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 9.2 (P) 型定義のユニットテストを作成する
  - SpecAutoExecutionState型/DEFAULT_SPEC_AUTO_EXECUTION_STATE/createSpecAutoExecutionStateの動作検証
  - デフォルト値適用と型検証の確認
  - _Requirements: 2.4, 5.5_

- [x] 9.3 (P) specStoreのユニットテストを作成する
  - Spec選択時のautoExecution同期を確認
  - workflowStoreへの設定反映を確認
  - _Requirements: 3.1, 3.2_

- [x] 9.4 IPC通信の統合テストを作成する
  - IPC経由でのspec.json読み書きを検証
  - 正規化処理が正しく適用されることを確認
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 9.5 E2Eテストを作成する
  - 自動実行開始→Spec切り替え→戻り→状態維持の確認
  - 外部からのspec.json編集→UI反映の確認
  - _Requirements: 1.5, 3.1, 4.2, 6.3_
