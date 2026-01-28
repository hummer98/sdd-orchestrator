# Implementation Plan

## Task 1. 型定義とイベントスキーマの拡張

- [x] 1.1 (P) AutoExecutionState型にimplRetryCountフィールドを追加する
  - `src/main/services/autoExecutionCoordinator.ts`内のAutoExecutionState interfaceにオプショナルフィールドを追加
  - JSDocコメントでフィールドの目的を明記（Electron再起動でリセット）
  - _Requirements: 2.2, 2.3_

## Task 2. Tasks完了度チェック機能の実装

- [x] 2.1 AutoExecutionCoordinatorにtasks.mdパース処理を追加する
  - handleAgentCompleted内でcurrentPhase === 'impl'かつstatus === 'completed'の場合に呼び出す
  - fs.readFileSyncでtasks.mdを同期的に読み取り
  - 既存のcheckbox正規表現パターンを使用（`/^\s*-\s*\[([ x])\]/`）
  - TaskCompletionResult型（total, completed, isComplete）を返却
  - 読み取りエラー・パースエラー時はisComplete = trueでフォールバック（次フェーズ許可）
  - _Requirements: 1.1_

- [x] 2.2 タスク完了判定ロジックを実装する
  - 全チェックボックスが`[x]`の場合のみisComplete = true
  - total === 0の場合もisComplete = true（タスクなし=完了）
  - 未完了チェックボックス`[ ]`が1つ以上存在する場合はisComplete = false
  - _Requirements: 1.2, 1.3_

## Task 3. Impl再実行（フォールバック）機能の実装

- [x] 3.1 AutoExecutionCoordinatorにリトライ制御ロジックを追加する
  - isComplete === falseの場合、implRetryCountをインクリメント
  - MAX_IMPL_RETRY_COUNT定数を7として定義
  - retryCount <= MAXの場合、execute-next-phase(impl)イベントを発火
  - 既存のexecutionStates Mapを活用してspecPath単位でカウント管理
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 3.2 リトライ上限到達時のエラー状態遷移を実装する
  - retryCount > MAX_IMPL_RETRY_COUNTの場合、status = 'error'に設定
  - エラー状態中は次フェーズへの遷移をブロック
  - updateStateでステータス変更をブロードキャスト
  - _Requirements: 3.2, 3.3_

## Task 4. リセット機能の実装

- [x] 4.1 AutoExecutionCoordinatorにresetImplRetryCountメソッドを追加する
  - specPathを引数に取り、該当specのimplRetryCountを0にリセット
  - status === 'error'の場合、status = 'idle'に変更
  - ステート変更をブロードキャスト
  - _Requirements: 3.4_

- [x] 4.2 (P) IPCハンドラとpreload APIを追加する
  - `src/main/ipc/autoExecutionHandlers.ts`にresetImplRetryCountハンドラを追加
  - `src/preload/index.ts`にresetImplRetryCount APIを公開
  - `src/renderer/types/electron.d.ts`に型定義を追加
  - _Requirements: 3.4_

## Task 5. ユーザー通知機能の実装

- [x] 5.1 リトライ発生時の通知を実装する
  - EventLogServiceにauto-execution:failイベントを記録（messageで「Impl retry」を識別）
  - NotificationStore.showNotificationでinfoトーストを表示
  - メッセージ: 「impl再実行中（{retryCount}/{maxRetries}回目）：未完了タスク{incompleteTasks}件」
  - _Requirements: 4.1, 4.2_

- [x] 5.2 上限到達時のエラー通知を実装する
  - EventLogServiceにauto-execution:failイベントを記録（messageで「Impl max retry exceeded」を識別）
  - NotificationStore.showNotificationでerrorトーストを表示
  - メッセージ: 「impl再実行上限に到達しました。リセットが必要です。」
  - _Requirements: 4.3, 4.4_

## Task 6. ユニットテストの実装

- [x] 6.1 (P) Tasks完了度パース処理のユニットテストを追加する
  - 全完了、一部未完了、空ファイル、パースエラーの各ケース
  - checkbox状態（`[x]`、`[ ]`、混在）の正確なパース検証
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6.2 (P) リトライ制御ロジックのユニットテストを追加する
  - 完了時は次フェーズ遷移、未完了時はリトライ発火の検証
  - implRetryCountのインクリメント検証
  - 上限到達後のエラー状態遷移検証
  - _Requirements: 2.1, 3.1, 3.2_

- [x] 6.3 (P) resetImplRetryCountメソッドのユニットテストを追加する
  - カウントリセット、エラー状態解除の検証
  - _Requirements: 3.4_

## Task 7. 統合テストの実装

- [x] 7.1 Impl再実行フロー全体の統合テストを追加する
  - Agent完了 → tasks.md検証 → 未完了検出 → リトライ発火の一連のフロー
  - EventLogにimpl:retryが記録されることを検証
  - execute-next-phase(impl)イベントが発火されることを検証
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 7.2 上限到達フローの統合テストを追加する
  - 7回リトライ後にstatus === 'error'になることを検証
  - EventLogにauto-execution:fail（Impl max retry exceeded）が記録されることを検証
  - エラー状態中はフェーズ遷移がブロックされることを検証
  - _Requirements: 3.1, 3.2, 3.3, 4.3_

---

## Design Decision: E2E Tests Out of Scope

design.mdにE2Eテストシナリオが記載されているが、本タスクリストではスコープ外とする。

**理由**:
- 本機能はMain Process内の内部ロジックであり、統合テスト（Task 7.1, 7.2）で十分にカバー可能
- E2Eテストでリトライ7回の待機時間が長く、CI効率を損なう
- Agent実行を伴うE2Eテストは外部依存（Claude API等）があり不安定

必要に応じて将来のイテレーションで追加を検討する。

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | impl完了時にtasks.md完了度を判定 | 2.1 | Feature |
| 1.2 | 全チェックボックス完了なら次フェーズ許可 | 2.2 | Feature |
| 1.3 | 未完了なら移行ブロック | 2.2 | Feature |
| 2.1 | 未完了時にimpl再実行 | 3.1 | Feature |
| 2.2 | 再実行回数をカウント | 1.1, 3.1 | Infrastructure, Feature |
| 2.3 | Electron再起動でカウントリセット | 1.1 | Infrastructure |
| 3.1 | 最大再実行回数7回 | 3.1 | Feature |
| 3.2 | 上限到達でエラー状態 | 3.2 | Feature |
| 3.3 | エラー状態中は継続しない | 3.2 | Feature |
| 3.4 | リセット操作でエラー解除 | 4.1, 4.2 | Feature |
| 4.1 | 再実行をイベントログに記録 | 5.1 | Feature |
| 4.2 | 再実行をUIトーストで通知 | 5.1 | Feature |
| 4.3 | 上限到達をイベントログに記録 | 5.2 | Feature |
| 4.4 | 上限到達をUIエラートーストで通知 | 5.2 | Feature |

### Coverage Validation Checklist

- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 2.1), not container tasks (e.g., 2)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
