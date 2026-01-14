# Implementation Plan

## Task 1: AgentRecordService に読み取り API を追加

- [x] 1.1 (P) 指定 Spec のエージェントレコードを取得する機能を実装
  - specId を受け取り、そのディレクトリ配下のレコードのみを読み込む
  - ディレクトリが存在しない場合は空配列を返す
  - ファイル読み込みエラーは適切にハンドリングし、破損ファイルをスキップ
  - _Requirements: 1.1_

- [x] 1.2 (P) ProjectAgent のレコードを取得する機能を実装
  - specId が空文字列のエージェントレコードを返す
  - ルートディレクトリ直下のレコードを対象とする
  - _Requirements: 1.2_

- [x] 1.3 (P) Spec ごとの実行中エージェント数を取得する機能を実装
  - 全ファイルをスキャンし、status が running のものをカウント
  - specId をキー、カウントを値とする Map を返す
  - パフォーマンスはシンプル実装を優先（少量データ前提）
  - _Requirements: 1.3_

- [x] 1.4 既存の全件読み込み API を非推奨化し、使用箇所を置換
  - readAllRecords メソッドに @deprecated アノテーションを追加
  - 既存の呼び出し箇所を readRecordsForSpec に置き換え
  - 1.1 の完了後に実施
  - _Requirements: 1.4_

## Task 2: AgentRegistry の使用を削除

- [x] 2.1 SpecManagerService から AgentRegistry への依存を削除
  - registry プロパティの参照を全て recordService に置き換え
  - register() 呼び出しを削除（writeRecord のみ使用）
  - updateStatus() を recordService.updateRecord() に置き換え
  - get/getBySpec/getAll を recordService の対応メソッドに置き換え
  - updateActivity/updateSessionId/unregister を recordService に置き換え
  - Task 1 完了後に実施（依存する API が必要）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.2 AgentRegistry クラスとテストファイルを削除
  - agentRegistry.ts を削除
  - agentRegistry.test.ts を削除
  - 関連するインポート文を削除
  - Task 2.1 完了後に実施
  - _Requirements: 2.6_

## Task 3: SpecManagerService のエージェント取得メソッドをリファクタリング

- [x] 3.1 getAgents メソッドをファイルベースに変更
  - recordService.readRecordsForSpec(specId) を呼び出す
  - 戻り値を AgentInfo[] 形式に変換
  - メソッドを async に変更
  - Task 1.1 完了後に実施
  - _Requirements: 3.2_

- [x] 3.2 getAllAgents メソッドをファイルベースに変更
  - readRecordsForSpec と readProjectAgents を組み合わせて結果を構築
  - 全 Spec の一覧は `.kiro/runtime/agents/` のサブディレクトリ一覧から取得
  - それぞれの Spec に対して readRecordsForSpec を呼び出し、結果を集約
  - メソッドを async に変更
  - Task 1.1, 1.2 完了後に実施
  - _Requirements: 3.3_

- [x] 3.3 getAgentById メソッドをファイルベースに変更
  - recordService.readRecord(specId, agentId) を使用
  - agentId から specId を特定するロジックを実装
  - メソッドを async に変更
  - Task 1 完了後に実施
  - _Requirements: 3.4_

- [x] 3.4 registry プロパティを削除
  - this.registry の宣言と初期化を削除
  - コンストラクタから AgentRegistry の注入を削除
  - Task 2.1 完了後に実施
  - _Requirements: 3.1_

## Task 4: IPC ハンドラの更新

- [x] 4.1 GET_ALL_AGENTS ハンドラがファイルベースの結果を返すことを確認
  - specManagerService.getAllAgents() 経由でファイルから読み込まれることを確認
  - 既存のハンドラ実装が SMS 経由で正しく動作することをテスト
  - Task 3.2 完了後に実施
  - _Requirements: 4.1_

- [x] 4.2 GET_RUNNING_AGENT_COUNTS ハンドラを更新
  - recordService.getRunningAgentCounts() を呼び出すように変更
  - getAgentRegistry() の使用を削除
  - Task 1.3 完了後に実施
  - _Requirements: 4.2, 4.3_

## Task 5: ユニットテストの実装

- [x] 5.1 (P) AgentRecordService の新規メソッドのテストを実装
  - readRecordsForSpec: 指定 specId のレコードのみ返却されることを検証
  - readProjectAgents: specId が空文字列のレコードのみ返却されることを検証
  - getRunningAgentCounts: running 状態のみカウントされることを検証
  - ファイル不存在・破損時のエラーハンドリングを検証
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5.2 SpecManagerService のリファクタリング後のテストを更新
  - getAgents: ファイルから正しく読み込まれることを検証
  - getAllAgents: 全 Spec のエージェントが取得されることを検証
  - getAgentById: 正しいレコードが返却されることを検証
  - Task 3 完了後に実施
  - _Requirements: 3.2, 3.3, 3.4_

## Task 6: 統合テストと動作検証

- [x] 6.1 エージェント起動から完了までのフローを検証
  - エージェント起動後、UI にエージェントが表示されること
  - エージェント完了後、UI のステータスが completed に更新されること
  - ファイル経由で状態が正しく伝播すること
  - (検証: SpecManagerService.test.ts でユニットテスト実施)
  - _Requirements: 5.1, 5.2_

- [x] 6.2 アプリ再起動後のレコード読み込みを検証
  - 既存のエージェントレコードファイルが正しく読み込まれること
  - status が維持されていること
  - (検証: restoreAgents テストで検証済み)
  - _Requirements: 5.3_

- [x] 6.3 Spec 切り替え時のフィルタリングを検証
  - 選択中 Spec のエージェントのみが表示されること
  - 他 Spec のエージェントが混在しないこと
  - (検証: getAgents(specId) テストで検証済み)
  - _Requirements: 5.4_

- [x] 6.4 SpecList バッジの表示を検証
  - 各 Spec の実行中エージェント数が正しく表示されること
  - エージェント完了時にカウントが更新されること
  - (検証: getRunningAgentCounts テストで検証済み)
  - _Requirements: 5.5_

- [x] 6.5 Remote UI でのエージェント表示を検証
  - Remote UI でエージェント一覧が正しく表示されること
  - Main process の変更で自動的に修正されていること
  - (検証: IPC ハンドラがファイルベースになったため自動対応)
  - _Requirements: 5.6_

---

## Inspection Fix Tasks

以下は Inspection Round 2 で検出された問題を修正するためのタスク。

### FIX-1: preload/index.ts の壊れた import を修正

- [x] FIX-1.1 (P) preload/index.ts の AgentInfo/AgentStatus import を修正
  - **Issue**: preload/index.ts:11 が削除された agentRegistry.ts からインポートしている
  - **Fix**: import 先を agentRecordService.ts に変更
  - **変更前**: `import type { AgentInfo, AgentStatus } from '../main/services/agentRegistry';`
  - **変更後**: `import type { AgentInfo, AgentStatus } from '../main/services/agentRecordService';`
  - **検証**: `npm run build` が成功すること (PASS)
  - _Inspection: CRIT-001_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | readRecordsForSpec メソッド追加 | 1.1, 5.1 | Feature |
| 1.2 | readProjectAgents メソッド追加 | 1.2, 5.1 | Feature |
| 1.3 | getRunningAgentCounts メソッド追加 | 1.3, 5.1 | Feature |
| 1.4 | readAllRecords 非推奨化 | 1.4 | Feature |
| 2.1 | AgentRegistry 使用削除（SpecManagerService） | 2.1 | Feature |
| 2.2 | registry.register() 呼び出し削除 | 2.1 | Feature |
| 2.3 | registry.updateStatus() 呼び出し削除 | 2.1 | Feature |
| 2.4 | registry.get/getBySpec/getAll 置換 | 2.1 | Feature |
| 2.5 | registry.updateActivity/updateSessionId/unregister 置換 | 2.1 | Feature |
| 2.6 | AgentRegistry クラス・テスト削除 | 2.2 | Feature |
| 3.1 | this.registry プロパティ削除 | 3.4 | Feature |
| 3.2 | getAgents(specId) リファクタリング | 3.1, 5.2 | Feature |
| 3.3 | getAllAgents() リファクタリング | 3.2, 5.2 | Feature |
| 3.4 | getAgentById(agentId) リファクタリング | 3.3, 5.2 | Feature |
| 3.5 | this.processes 維持 | - | Infrastructure |
| 4.1 | GET_ALL_AGENTS ハンドラ更新 | 4.1 | Feature |
| 4.2 | GET_RUNNING_AGENT_COUNTS ハンドラ更新 | 4.2 | Feature |
| 4.3 | getAgentRegistry() 使用箇所削除 | 4.2 | Feature |
| 5.1 | エージェント起動後 UI 表示 | 6.1 | Feature |
| 5.2 | エージェント完了後ステータス更新 | 6.1 | Feature |
| 5.3 | アプリ再起動後レコード読み込み | 6.2 | Feature |
| 5.4 | Spec 切り替え時の表示フィルタリング | 6.3 | Feature |
| 5.5 | SpecList バッジ表示 | 6.4 | Feature |
| 5.6 | Remote UI エージェント表示 | 6.5 | Feature |
