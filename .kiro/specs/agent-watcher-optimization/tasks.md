# Implementation Plan

## Task 1. AgentRecordWatcherServiceのSpec単位監視対応

- [x] 1.1 (P) 2つのWatcherインスタンス構成を実装する
  - ProjectAgent用watcher（projectAgentWatcher）とSpec用watcher（specWatcher）を管理するフィールドを追加
  - 現在の監視スコープを保持するcurrentSpecIdフィールドを追加
  - ProjectAgent監視パス（`.kiro/runtime/agents/`直下）とSpec監視パス（`.kiro/runtime/agents/{specId}/`）を分離
  - _Requirements: 1.3_

- [x] 1.2 switchWatchScopeメソッドを実装する
  - specWatcherが存在する場合は停止してから新しいSpec用watcherを開始
  - 新しいwatcher開始時は`ignoreInitial: true`を設定してイベント抑制
  - specIdがnullの場合はSpec監視を停止しProjectAgent監視のみ継続
  - 高速なSpec切り替え時の競合を防ぐためasync/awaitで順序を保証
  - Task 1.1で作成したwatcherインスタンス管理構造を使用
  - _Requirements: 1.1, 1.2, 1.4, 4.2_

- [x] 1.3 startメソッドを改修する
  - 起動時はProjectAgent用watcherのみ開始
  - ProjectAgent用watcherは`ignoreInitial: false`で既存ファイルのイベントを発火
  - Spec用watcherの開始はswitchWatchScopeに委譲
  - _Requirements: 1.3_

- [x] 1.4 stopメソッドを改修する
  - projectAgentWatcherとspecWatcherの両方を停止
  - 両watcherのクリーンアップを非同期で実行
  - _Requirements: 4.2_

## Task 2. 軽量なAgent一覧初期ロード

- [x] 2.1 (P) agentRegistryにgetRunningAgentCountsメソッドを追加する
  - `.kiro/runtime/agents/`配下のディレクトリ構造をスキャン
  - 各Spec（ディレクトリ）ごとにJSONファイルのstatusフィールドのみを読み取り
  - 実行中（running）のAgent数をカウントしてMap<specId, number>で返却
  - JSONパースエラーは警告ログを出力して0としてカウント
  - _Requirements: 2.1_

- [x] 2.2 GET_RUNNING_AGENT_COUNTS IPCハンドラを追加する
  - agentRegistry.getRunningAgentCountsを呼び出して結果を返却
  - 戻り値はRecord<string, number>形式（MapをObjectに変換）
  - Task 2.1のgetRunningAgentCountsを使用
  - _Requirements: 2.1_

## Task 3. Agent自動選択ロジックの改善

- [x] 3.1 (P) agentStoreにSpec単位選択状態管理を追加する
  - selectedAgentIdBySpec: Map<string, string | null>フィールドを追加
  - setSelectedAgentForSpec(specId, agentId)アクションを追加
  - getSelectedAgentForSpec(specId)セレクタを追加
  - _Requirements: 3.3, 3.5_

- [x] 3.2 autoSelectAgentForSpecメソッドを実装する
  - 保存された選択状態があり、そのAgentがまだ存在する場合は復元
  - 保存状態がない場合は実行中Agentの有無を判定
  - 実行中Agentがある場合は最新（一覧の一番上）のAgentを選択
  - 実行中Agentがない場合は何もしない（null状態を維持）
  - Task 3.1で作成した選択状態管理を使用
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 3.3 Agent選択時にsetSelectedAgentForSpecを呼び出すよう改修する
  - 既存のselectAgentアクションを改修してSpec単位で保存
  - 選択状態の保存はオンメモリのみ（永続化しない）
  - _Requirements: 3.3, 3.5_

## Task 4. Spec選択時の監視スコープ切り替え統合

- [x] 4.1 SWITCH_AGENT_WATCH_SCOPE IPCハンドラを追加する
  - AgentRecordWatcherService.switchWatchScopeを呼び出し
  - specIdはstring | nullを受け付け
  - Task 1.2のswitchWatchScopeを使用
  - _Requirements: 1.2_

- [x] 4.2 specDetailStoreのSpec選択処理を改修する
  - Spec選択時にSWITCH_AGENT_WATCH_SCOPE IPCを呼び出し
  - agentStore.autoSelectAgentForSpecを呼び出してAgent自動選択
  - 監視スコープ切り替えは非同期で実行しUIをブロックしない
  - Task 4.1のIPCハンドラ、Task 3.2のautoSelectAgentForSpecを使用
  - _Requirements: 1.2, 3.4, 4.2_

- [x] 4.3 Spec選択解除時の監視スコープクリアを実装する
  - Spec選択がnullになった場合はspecId=nullでswitchWatchScopeを呼び出し
  - ProjectAgent監視のみ継続する状態に遷移
  - _Requirements: 1.2_

## Task 5. SpecListのAgent数バッジ表示統合

- [x] 5.1 起動時にgetRunningAgentCountsを呼び出すよう改修する
  - プロジェクト選択後にGET_RUNNING_AGENT_COUNTS IPCを呼び出し
  - 取得したAgent数マップをSpecList表示に反映
  - Task 2.2のIPCハンドラを使用
  - _Requirements: 2.1, 2.2_

- [x] 5.2 SpecListItemのバッジ表示を維持する
  - 既存の実行中Agent数バッジ表示機能が正常に動作することを確認
  - 軽量版Agent数取得からの値が正しく表示されることをテスト
  - _Requirements: 2.2_

## Task 6. テストとパフォーマンス検証

- [x] 6.1 AgentRecordWatcherServiceのユニットテストを作成する
  - switchWatchScope: スコープ切り替えが正しく動作すること
  - start: ProjectAgent監視のみ開始されること
  - 2つのwatcherインスタンスが独立して動作すること
  - ignoreInitial設定が正しく適用されること
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6.2 agentRegistryのgetRunningAgentCountsテストを作成する
  - 複数Specにまたがる実行中Agent数が正確にカウントされること
  - JSONパースエラー時に警告ログを出力して0をカウントすること
  - 空ディレクトリや存在しないディレクトリでエラーにならないこと
  - _Requirements: 2.1_

- [x] 6.3 agentStoreのSpec単位選択状態テストを作成する
  - autoSelectAgentForSpec: 実行中Agentがある場合のみ選択されること
  - selectedAgentIdBySpec: Spec単位の選択状態が正しく保存・復元されること
  - 実行中Agentがない場合は選択状態がnullになること
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6.4 統合テストでパフォーマンス要件を検証する
  - Spec選択からコンテンツ表示までの時間が500ms以内であること
  - 監視スコープ切り替えがSpec選択操作をブロックしないこと
  - _Requirements: 4.1, 4.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Spec選択時に該当ディレクトリのみ監視 | 1.2 | Feature |
| 1.2 | Spec切り替え時に監視対象を変更 | 1.2, 4.1, 4.2, 4.3 | Feature |
| 1.3 | ProjectAgentは常時監視 | 1.1, 1.3 | Feature |
| 1.4 | ignoreInitial: true設定 | 1.2 | Feature |
| 2.1 | 起動時に実行中Agent数のみ取得 | 2.1, 2.2, 5.1 | Feature |
| 2.2 | SpecListItemでバッジ表示 | 5.1, 5.2 | Feature |
| 2.3 | Spec選択時にAgent詳細ロード | (既存実装維持) | - |
| 3.1 | 実行中Agentがない場合は自動選択しない | 3.2 | Feature |
| 3.2 | 実行中Agentがある場合は最新を選択 | 3.2 | Feature |
| 3.3 | Spec単位でAgent選択状態を管理 | 3.1, 3.3 | Feature |
| 3.4 | Spec切り替え時に選択状態を復元 | 3.2, 4.2 | Feature |
| 3.5 | 選択状態の永続化は行わない | 3.1, 3.3 | Feature |
| 4.1 | Spec選択から表示まで500ms以内 | 6.4 | Test |
| 4.2 | 監視切り替えは非同期処理 | 1.2, 1.4, 4.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
