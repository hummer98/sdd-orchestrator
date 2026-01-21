# Implementation Plan

## Task 1: WORKTREE_LIFECYCLE_PHASES定数の定義とcwd解決ロジック

- [x] 1.1 (P) WORKTREE_LIFECYCLE_PHASES定数を定義
  - SpecManagerServiceにworktreeライフサイクルを変更するフェーズを列挙する定数を追加
  - 現時点では`spec-merge`のみを含む
  - 定数に「なぜprojectPathが必要か」の理由をJSDocコメントで記載
  - _Requirements: 1.1, 1.4_

- [x] 1.2 startAgentのcwd解決ロジックを修正
  - `WORKTREE_LIFECYCLE_PHASES`に含まれるフェーズかどうかを判定
  - 含まれる場合は`projectPath`をcwdとして使用
  - 含まれない場合は従来通り`getSpecWorktreeCwd`でworktreeCwdを解決
  - cwd解決結果をログに出力（既存ログ出力を維持・拡張）
  - _Requirements: 1.2, 1.3, 1.5_

## Task 2: handleAgentExitのエラーハンドリング改善

- [x] 2.1 readRecord失敗時のフォールバック処理を実装
  - readRecordをtry-catchで囲み、エラー時は`code === 0 || isForcedSuccess`でstatusを決定
  - エラー時に`logger.error`でスタックトレースを含めてログ記録
  - statusCallbacksをエラー時も確実に呼び出す
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 クリーンアップ処理の保証
  - `processes.delete(agentId)`をエラー有無に関わらず確実に実行
  - `forcedKillSuccess.delete(agentId)`も同様
  - `sessionIdParseBuffers.delete(agentId)`も同様
  - try-finallyまたは同等の構造でクリーンアップを保証
  - _Requirements: 2.4_

## Task 3: Agent終了エラー通知機構の実装

- [x] 3.1 (P) onAgentExitErrorコールバック機構を追加
  - SpecManagerServiceに`onAgentExitError`メソッドを追加
  - `offAgentExitError`メソッドも追加
  - 内部にコールバック配列を保持
  - _Requirements: 3.1_
  - _Method: onAgentExitError, offAgentExitError, AgentExitErrorCallback_
  - _Verify: Grep "onAgentExitError" in specManagerService.ts_

- [x] 3.2 handleAgentExitからエラーコールバックを呼び出し
  - readRecord失敗時に登録済みのonAgentExitErrorCallbacksを全て呼び出す
  - agentIdとErrorオブジェクトを引数として渡す
  - _Requirements: 3.2_

## Task 4: IPCチャンネル定義とハンドラ登録

- [x] 4.1 (P) AGENT_EXIT_ERROR IPCチャンネルを定義
  - channels.tsにAGENT_EXIT_ERRORチャンネル名を追加
  - 型定義を追加（agentId: stringを含む）
  - _Requirements: 3.3_
  - _Method: IPC_CHANNELS.AGENT_EXIT_ERROR_
  - _Verify: Grep "AGENT_EXIT_ERROR" in channels.ts_

- [x] 4.2 handlers.tsでonAgentExitErrorコールバックを登録
  - SpecManagerService初期化後にonAgentExitErrorを登録
  - コールバック内でBrowserWindow.getAllWindows()を取得
  - window.isDestroyed()をチェックしてからIPC送信
  - _Requirements: 3.3_

## Task 5: Renderer側でのエラー通知表示

- [x] 5.1 (P) preloadでAGENT_EXIT_ERROR受信APIを公開
  - electronAPI.onAgentExitErrorメソッドを追加
  - 型定義を更新
  - _Requirements: 3.4_

- [x] 5.2 App.tsxでエラー通知リスナーを設定
  - useEffectでelectronAPI.onAgentExitErrorを登録
  - エラー受信時にnotify.errorを呼び出し
  - メッセージは「Agent終了処理でエラーが発生しました: {agentId}」
  - _Requirements: 3.4, 3.5_

## Task 6: テスト実装

- [x] 6.1 WORKTREE_LIFECYCLE_PHASES判定テスト
  - spec-mergeフェーズでprojectPathがcwdとして使用されることを確認
  - 通常フェーズでgetSpecWorktreeCwdが呼ばれることを確認
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6.2 handleAgentExitエラーハンドリングテスト
  - readRecord成功時の既存動作を確認
  - readRecord失敗時もstatusCallbacksが呼ばれることを確認
  - readRecord失敗時にonAgentExitErrorCallbacksが呼ばれることを確認
  - processes.delete/forcedKillSuccess.deleteが常に実行されることを確認
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6.3 onAgentExitErrorコールバック管理テスト
  - コールバック登録/解除が正しく動作することを確認
  - 複数コールバック登録時に全て呼ばれることを確認
  - _Requirements: 3.1, 3.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | WORKTREE_LIFECYCLE_PHASES定数定義 | 1.1 | Infrastructure |
| 1.2 | startAgentでのWORKTREE_LIFECYCLE_PHASES判定 | 1.2 | Feature |
| 1.3 | 非WORKTREE_LIFECYCLE_PHASESはgetSpecWorktreeCwd使用 | 1.2 | Feature |
| 1.4 | WORKTREE_LIFECYCLE_PHASESにコメント追加 | 1.1 | Infrastructure |
| 1.5 | cwd解決結果をログ出力 | 1.2 | Feature |
| 2.1 | readRecordエラー時もstatusCallbacks呼び出し | 2.1 | Feature |
| 2.2 | エラー時statusをcode/isForcedSuccessで決定 | 2.1 | Feature |
| 2.3 | エラー時logger.errorでログ記録 | 2.1 | Feature |
| 2.4 | エラー時もprocesses.delete確実実行 | 2.2 | Feature |
| 3.1 | onAgentExitErrorコールバック機構追加 | 3.1 | Infrastructure |
| 3.2 | handleAgentExitエラー時にコールバック呼び出し | 3.2 | Feature |
| 3.3 | handlers.tsでコールバック登録・IPC送信 | 4.1, 4.2 | Feature |
| 3.4 | Rendererでエラー受信しtoast表示 | 5.1, 5.2 | Feature |
| 3.5 | toast内容は簡潔なメッセージ | 5.2 | Feature |
