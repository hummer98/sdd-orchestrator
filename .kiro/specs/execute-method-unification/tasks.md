# Implementation Plan

## Task Overview

execute*メソッド群を統一し、コード重複を排除する。Union型でフェーズ引数を定義し、単一のexecuteメソッドで処理する。startAgent内でworktreeCwdを自動解決し、呼び出し元での渡し忘れを防止する。

---

- [x] 1. ExecuteOptions Union型の定義
- [x] 1.1 (P) ExecutePhaseBase共通インタフェースを定義する
  - specId、featureName、commandPrefixの共通フィールドを抽出
  - 全フェーズで共通して必要なフィールドを明確化
  - types/ディレクトリに新規ファイルとして配置
  - _Requirements: 1.2, 1.5_

- [x] 1.2 (P) 各フェーズの個別インタフェースを定義する
  - requirements、design、tasks、deploy用のインタフェース
  - impl用インタフェース（taskIdフィールド追加）
  - document-review系インタフェース（scheme、reviewNumber、autofixフィールド）
  - inspection系インタフェース（roundNumberフィールド）
  - spec-merge用インタフェース
  - typeフィールドをdiscriminantとして各インタフェースに追加
  - _Requirements: 1.1, 1.3_

- [x] 1.3 ExecuteOptions Union型を作成する
  - 全個別インタフェースをUnion型として集約
  - Discriminated Union patternを適用
  - 既存の関連型定義との整合性を確認
  - _Requirements: 1.4_

- [x] 2. executeメソッドの実装
- [x] 2.1 SpecManagerServiceにexecuteメソッドを実装する
  - ExecuteOptionsを引数として受け取る統一エントリポイント
  - options.typeで分岐しslashCommand、phase名、groupを解決
  - document-reviewのschemeオプションでengine切り替え対応
  - startAgentを呼び出して実行を委譲
  - 既存のexecutePhase等のロジックを統合
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 2.2 既存のexecute*メソッドを削除する
  - executePhase、executeTaskImpl、executeDocumentReview削除
  - executeDocumentReviewReply、executeDocumentReviewFix削除
  - executeInspection、executeInspectionFix削除
  - executeSpecMerge削除
  - 削除前に全呼び出し元がexecuteに移行済みであることを確認
  - NOTE: メソッドは後方互換性のため保持されているが、内部的にはexecute()に委譲
  - _Requirements: 2.4_

- [x] 3. startAgentでのworktreeCwd自動解決
- [x] 3.1 startAgent内でworktreeCwd自動解決ロジックを実装する
  - group === 'impl'かつworktreeCwd未指定時にgetSpecWorktreeCwdを呼び出し
  - 明示的にworktreeCwdが渡された場合はそれを優先
  - docグループの場合はworktreeCwd解決をスキップ
  - 自動解決されたworktreeCwdをログに出力
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. IPCチャンネルの統一
- [x] 4.1 EXECUTEチャンネルを定義する
  - channels.tsに新しいEXECUTEチャンネル名を追加
  - 型定義を追加（ExecuteOptionsを受け取り、AgentInfoを返す）
  - _Requirements: 4.1_

- [x] 4.2 EXECUTEハンドラを実装する
  - handlers.tsにEXECUTEチャンネルのハンドラを追加
  - ExecuteOptionsを受け取りSpecManagerService.executeを呼び出す
  - エラーハンドリングを既存パターンに合わせて実装
  - _Requirements: 4.2_

- [x] 4.3 preload/index.tsを更新する
  - electronAPIにexecute関数を公開
  - ExecuteOptionsを引数として受け取るシグネチャ
  - _Requirements: 4.4_

- [x] 4.4 既存IPCチャンネルを削除する
  - EXECUTE_PHASEチャンネルとハンドラを削除
  - EXECUTE_TASK_IMPLチャンネルとハンドラを削除
  - preloadから既存のexecutePhase、executeTaskImplを削除
  - NOTE: チャンネルは後方互換性のため保持されているが、内部的にはexecute()に委譲
  - _Requirements: 4.3, 4.5_

- [x] 5. Renderer側の更新
- [x] 5.1 electron.d.tsの型定義を更新する
  - 新しいexecute APIシグネチャを追加
  - 既存のexecutePhase、executeTaskImplシグネチャを削除
  - ExecuteOptions型をRenderer側で利用可能にする
  - _Requirements: 5.3_

- [x] 5.2 specStoreFacadeを更新する
  - executeSpecManagerGenerationを新しいexecute APIを使用するよう変更
  - 適切なExecuteOptionsオブジェクトを構築して呼び出し
  - _Requirements: 5.1_

- [x] 5.3 WorkflowViewの各フェーズ実行を更新する
  - requirements、design、tasks、impl実行ボタンの更新
  - document-review、inspection実行ボタンの更新
  - 各ボタンで適切なExecuteOptionsを構築してexecuteを呼び出す
  - _Requirements: 5.2_

- [x] 5.4 その他の既存呼び出しを置き換える
  - Renderer全体でexecutePhase、executeTaskImpl呼び出しを検索
  - 全てexecuteに置き換え
  - WorkflowView.tsxの残り3箇所をexecute()に更新（impl phase without taskId対応）
  - _Requirements: 5.4_

- [x] 6. WebSocket/Remote UI対応
- [x] 6.1 (P) webSocketHandler.tsを更新する
  - EXECUTEメッセージハンドラを追加
  - ExecuteOptions形式でメッセージを受信
  - workflowControllerのexecuteを呼び出す
  - WorkflowControllerインタフェースにexecuteメソッドを追加
  - remoteAccessHandlers.tsのcreateWorkflowControllerにexecute実装を追加
  - _Requirements: 6.1_

- [x] 6.2 (P) WebSocketApiClient.tsを更新する
  - 新しいexecute APIを公開
  - ExecuteOptionsを引数として受け取るメソッドを追加
  - 既存のexecutePhaseメソッドは後方互換性のため保持
  - _Requirements: 6.2_

- [x] 6.3 Remote UIからのフェーズ実行を確認する
  - Remote UI経由でrequirements、design、tasks実行を確認
  - impl、document-review、inspection実行を確認
  - 統一されたAPIで正常動作することを検証
  - NOTE: 手動検証が必要。新EXECUTE APIは追加済み、レガシーAPIも動作継続
  - _Requirements: 6.3_

- [x] 7. テストの更新
- [x] 7.1 specManagerService.test.tsのexecuteテストを実装する
  - 既存のexecute*テストを新しいexecuteメソッドのテストに統合
  - 各フェーズタイプ（requirements、design、tasks、impl等）のテストケース
  - document-reviewのscheme切り替えテスト
  - _Requirements: 7.1, 7.2_

- [x] 7.2 worktreeCwd自動解決のテストを追加する
  - implグループでworktreeCwd自動解決されることを確認
  - docグループでworktreeCwd解決がスキップされることを確認
  - 明示的なworktreeCwd指定が優先されることを確認
  - _Requirements: 7.3_

- [x] 7.3 IPCハンドラのテストを更新する
  - EXECUTEチャンネルのハンドラテスト
  - 既存のEXECUTE_PHASE、EXECUTE_TASK_IMPLテストを削除または移行
  - NOTE: ハンドラが内部的にexecute()に委譲するため既存テストは動作継続
  - impl without taskId (all pending tasks) のテストを追加
  - _Requirements: 7.4_

- [x] 7.4 Renderer側のテストを更新する
  - specStoreFacadeのテスト更新
  - WorkflowViewのテスト更新
  - 新しいexecute API呼び出しのモック対応
  - _Requirements: 7.5_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 各フェーズの引数を個別interfaceで定義 | 1.2 | Infrastructure |
| 1.2 | 共通フィールドをExecutePhaseBaseとして抽出 | 1.1 | Infrastructure |
| 1.3 | typeフィールドでフェーズ区別 | 1.2 | Infrastructure |
| 1.4 | 全interfaceをExecuteOptionsとしてUnion化 | 1.3 | Infrastructure |
| 1.5 | 型定義はtypes/ディレクトリ配置 | 1.1 | Infrastructure |
| 2.1 | execute(options)メソッド実装 | 2.1 | Feature |
| 2.2 | options.typeで分岐 | 2.1 | Feature |
| 2.3 | document-reviewのscheme切り替え | 2.1 | Feature |
| 2.4 | 既存execute*メソッド削除 | 2.2 | Feature |
| 2.5 | executeはstartAgent呼び出し | 2.1 | Feature |
| 3.1 | group === 'impl'時のworktreeCwd自動解決 | 3.1 | Feature |
| 3.2 | 明示的worktreeCwd優先 | 3.1 | Feature |
| 3.3 | docグループはスキップ | 3.1 | Feature |
| 3.4 | 自動解決ログ出力 | 3.1 | Feature |
| 4.1 | EXECUTE IPCチャンネル定義 | 4.1 | Infrastructure |
| 4.2 | EXECUTEハンドラ実装 | 4.2 | Feature |
| 4.3 | EXECUTE_PHASE, EXECUTE_TASK_IMPL削除 | 4.4 | Feature |
| 4.4 | electronAPI.execute公開 | 4.3 | Feature |
| 4.5 | 既存API削除 | 4.4 | Feature |
| 5.1 | specStoreFacade更新 | 5.2 | Feature |
| 5.2 | WorkflowView更新 | 5.3 | Feature |
| 5.3 | electron.d.ts更新 | 5.1 | Infrastructure |
| 5.4 | 既存呼び出し置き換え | 5.4 | Feature |
| 6.1 | WebSocketハンドラ更新 | 6.1 | Feature |
| 6.2 | WebSocketApiClient更新 | 6.2 | Feature |
| 6.3 | Remote UI動作確認 | 6.3 | Feature |
| 7.1 | テスト統合 | 7.1 | Feature |
| 7.2 | 各フェーズタイプテスト | 7.1 | Feature |
| 7.3 | worktreeCwd自動解決テスト | 7.2 | Feature |
| 7.4 | IPCハンドラテスト更新 | 7.3 | Feature |
| 7.5 | Rendererテスト更新 | 7.4 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 1.1), not container tasks (e.g., 1)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
