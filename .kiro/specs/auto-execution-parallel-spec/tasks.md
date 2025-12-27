# Implementation Plan


## Tasks

- [ ] 1. ExecutionContext型定義と基盤実装
- [ ] 1.1 (P) ExecutionContext型をTypeScriptで定義する
  - specId, specDetailSnapshot, specPath, currentPhase, executionStatus, trackedAgentIds, executedPhases, errors, startTime, timeoutIdの全フィールドを含む型を定義
  - specDetailSnapshotはReadonly型として型安全性を確保
  - trackedAgentIdsはSet<string>型で定義
  - AutoExecutionStatusとWorkflowPhaseの既存型を再利用
  - _Requirements: 1.6_

- [ ] 1.2 (P) ExecutionContext生成ファクトリ関数を実装する
  - specDetailのスナップショットを作成し、specPathを含めたコンテキストを生成
  - 初期状態の各フィールドを適切に設定（executionStatus: 'running', executedPhases: []など）
  - startTimeにDate.now()を設定
  - _Requirements: 1.2, 1.5_

- [ ] 2. AutoExecutionServiceの内部状態管理を再構築する
- [ ] 2.1 クラス変数をMap形式に置き換える
  - `executionContexts: Map<string, ExecutionContext>`を追加
  - `agentToSpecMap: Map<string, string>`を追加
  - `pendingEventsMap: Map<string, { specId: string; status: string }>`を追加
  - 既存の`currentExecutingSpecId`, `trackedAgentIds`, `executedPhases`, `errors`, `executionStartTime`を段階的に移行
  - 1.1で定義した型を使用（ファイル共有のため順序依存）
  - _Requirements: 1.1, 2.1_

- [ ] 2.2 並行実行上限チェック機能を実装する
  - MAX_CONCURRENT_SPECS定数を5で定義
  - `getActiveExecutionCount()`メソッドを実装
  - start()内で上限チェックを追加し、超過時はエラーメッセージを表示してfalseを返す
  - 同一specIdでの重複実行を防止
  - _Requirements: 3.4, 3.5_

- [ ] 3. start()メソッドを並行実行対応に改修する
- [ ] 3.1 ExecutionContext作成ロジックを統合する
  - specStore.specDetailからスナップショットを取得してExecutionContextを作成
  - `executionContexts.set(specId, context)`でコンテキストを登録
  - specStore.startAutoExecution(specId)を呼び出してruntime状態を更新
  - 並行実行上限チェックを実行
  - _Requirements: 1.2, 1.4, 1.5, 3.1_

- [ ] 3.2 executePhase呼び出し後のagentIdマッピング登録を実装する
  - executePhase()のレスポンスからagentIdを取得
  - `agentToSpecMap.set(agentId, specId)`でマッピングを登録
  - ExecutionContext.trackedAgentIds.add(agentId)で追跡を開始
  - _Requirements: 2.2_

- [ ] 4. Agent完了イベントハンドリングを改修する
- [ ] 4.1 handleDirectStatusChange()でagentToSpecMapからSpecIdを解決する
  - agentIdからspecIdを`agentToSpecMap.get(agentId)`で取得
  - specIdが見つからない場合は`pendingEventsMap`にバッファリング
  - specIdが見つかった場合は該当のExecutionContextを更新
  - _Requirements: 2.3, 2.4_

- [ ] 4.2 handleAgentCompleted()をExecutionContext単位で動作させる
  - 引数にspecIdを追加し、該当ExecutionContextのみを更新
  - specStore.specDetailを参照せず、IPC経由で最新のspec.jsonを取得
  - ExecutionContext.executedPhasesに完了フェーズを追加
  - _Requirements: 1.3, 4.3_

- [ ] 4.3 handleAgentFailed()をExecutionContext単位で動作させる
  - 引数にspecIdを追加し、該当ExecutionContextのみをエラー状態に更新
  - 他のSpecの実行を継続
  - ExecutionContext.errorsにエラーメッセージを追加
  - _Requirements: 3.2, 3.3_

- [ ] 5. specStore.specDetail依存を排除する
- [ ] 5.1 validatePreconditions()をExecutionContextのスナップショットで動作させる
  - specStore.specDetail参照を削除
  - 引数でExecutionContext.specDetailSnapshotを受け取る
  - フェーズ実行可能性チェックをスナップショットベースに変更
  - _Requirements: 4.1, 4.2_

- [ ] 5.2 autoApproveCompletedPhase()をspecPath指定で動作させる
  - specStore.specDetail.metadata.path参照を削除
  - 引数でExecutionContext.specPathを受け取る
  - IPC経由でspec.jsonを更新
  - _Requirements: 4.4, 4.5_

- [ ] 5.3 (P) executeDocumentReview系メソッドのagentIdマッピング対応
  - document-review Agent起動後にagentToSpecMapへ登録
  - document-review-reply Agent起動後にagentToSpecMapへ登録
  - _Requirements: 2.6_

- [ ] 6. ExecutionContext独立タイムアウト管理を実装する
- [ ] 6.1 Context毎のタイムアウト設定・クリア機能を実装する
  - ExecutionContext.timeoutIdにsetTimeoutの戻り値を格納
  - タイムアウト発生時は該当ExecutionContextのみをエラー状態に
  - Context破棄時にclearTimeoutを呼び出し
  - _Requirements: 3.6_

- [ ] 7. クリーンアップとライフサイクル管理を実装する
- [ ] 7.1 completeAutoExecution()を改修する
  - 完了後2秒遅延でExecutionContextを削除
  - agentToSpecMapから該当specIdのエントリを削除
  - specStore.stopAutoExecution(specId)を呼び出し
  - _Requirements: 6.1_

- [ ] 7.2 stop()メソッドをspecId指定対応に改修する
  - 引数specIdを受け取り、該当ExecutionContextを即座にクリーンアップ
  - specId未指定時は現在選択中のspecを停止（後方互換性）
  - agentToSpecMapから該当エントリを削除
  - _Requirements: 6.3, 7.1_

- [ ] 7.3 (P) dispose()メソッドで全Contextを破棄する
  - 全ExecutionContextを列挙してクリーンアップ
  - 全timeoutをclearTimeout
  - executionContexts, agentToSpecMap, pendingEventsMapをclear
  - _Requirements: 6.4_

- [ ] 7.4 (P) forceCleanupAll()テスト用メソッドを実装する
  - テストから呼び出し可能な強制クリーンアップ
  - dispose()と同様だが、アプリ終了せずに状態リセット
  - _Requirements: 6.5_

- [ ] 8. retryFrom()メソッドを並行実行対応に改修する
- [ ] 8.1 retryFrom()にspecId引数を追加する
  - 引数specIdを受け取り、該当ExecutionContextをリトライ
  - specId未指定時は現在選択中のspecをリトライ（後方互換性）
  - エラー状態のExecutionContextを'running'に戻す
  - _Requirements: 6.2, 7.1_

- [ ] 9. startWithSpecState()の後方互換性を維持する
- [ ] 9.1 startWithSpecState()を新アーキテクチャに対応させる
  - spec.jsonのautoExecutionフィールドを使用した実行開始
  - 内部的にstart()を呼び出すフローを維持
  - 既存の通知パターンを保持
  - _Requirements: 7.2, 7.4_

- [ ] 10. UI状態表示の検証と調整
- [ ] 10.1 WorkflowViewが選択中Specのruntime状態のみ表示することを検証する
  - specStore.getAutoExecutionRuntime(selectedSpec.name)の呼び出しを確認
  - Spec切り替え時のUI更新動作を確認
  - 既存実装が要件を満たしていれば変更不要
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 10.2 (P) specStore.getAutoExecutionRuntime()が正しく動作することを検証する
  - specId指定でruntime状態を取得できることを確認
  - デフォルト値（idle状態）を返す動作を確認
  - 既存実装が要件を満たしていれば変更不要
  - _Requirements: 5.4_

- [ ] 11. 単体テストを実装する
- [ ] 11.1 (P) ExecutionContext作成のテストを実装する
  - specDetailスナップショットが正しく保存される
  - specPathがコンテキストに含まれる
  - 初期状態が正しく設定される
  - _Requirements: 1.5, 1.6_

- [ ] 11.2 (P) agentToSpecMapマッピングのテストを実装する
  - AgentId登録が正しく動作する
  - AgentId削除が正しく動作する
  - AgentIdからSpecIdのlookupが正しく動作する
  - 不明agentIdでのバッファリングが動作する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 11.3 (P) 並行実行上限チェックのテストを実装する
  - 5件までの実行が許可される
  - 6件目の実行がfalseを返す
  - 同一specIdの重複実行が防止される
  - _Requirements: 3.4, 3.5_

- [ ] 11.4 (P) handleDirectStatusChange正確性のテストを実装する
  - 正しいExecutionContextが更新される
  - 他のContextに影響しない
  - バッファリングされたイベントが後で処理される
  - _Requirements: 1.3, 2.3, 3.2_

- [ ] 11.5 (P) Context独立性のテストを実装する
  - Spec Aのエラーが Spec Bに影響しない
  - Spec Aの完了が Spec Bに影響しない
  - 各Contextが独立したタイムアウトを持つ
  - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ] 11.6 (P) クリーンアップ動作のテストを実装する
  - 完了後2秒遅延でContextが削除される
  - 手動停止で即座にクリーンアップされる
  - dispose()で全Contextがクリアされる
  - _Requirements: 6.1, 6.3, 6.4_

- [ ] 11.7 (P) 後方互換性のテストを実装する
  - 単一Spec実行時の動作が既存と同一
  - 既存APIシグネチャが維持される
  - 通知パターンが保持される
  - _Requirements: 7.1, 7.3, 7.4, 7.5_

- [ ] 12. 統合テストとE2Eテストを実装する
- [ ] 12.1 並行実行フローの統合テストを実装する
  - 2つのSpecを同時に自動実行開始
  - 両方のAgent完了イベントが正しくルーティングされる
  - 両方のSpecが正常に完了する
  - _Requirements: 3.1, 3.2_

- [ ] 12.2 (P) UI状態表示の統合テストを実装する
  - Spec切り替え時にruntime状態が正しく切り替わる
  - 実行中Specと非実行Specの表示が区別される
  - _Requirements: 5.1, 5.2, 5.3_
