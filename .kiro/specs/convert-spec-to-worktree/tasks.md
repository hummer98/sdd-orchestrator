# Implementation Plan: 通常SpecからWorktreeへの変換機能

## タスク一覧

- [x] 1. ConvertWorktreeService実装
- [x] 1.1 (P) 事前検証ロジックの実装
  - mainブランチ確認、impl未開始確認、非Worktreeモード確認を実装
  - canConvert()メソッドで変換可否を事前チェック
  - 各検証エラーに対応するエラー型を返却
  - _Requirements: 2.2, 5.1, 5.2, 5.3, 5.4_
  - _Method: isOnMainBranch, getCurrentBranch, readSpecJson_
  - _Verify: Grep "isOnMainBranch|getCurrentBranch" in convertWorktreeService.ts_

- [x] 1.2 変換処理本体の実装
  - convertToWorktree()メソッドで変換処理を順次実行
  - Branch作成、Worktree作成、ファイル移動、Symlink作成、spec.json更新の順序を守る
  - 各ステップ完了後に次のステップへ進む前に成功を確認
  - _Requirements: 2.1_
  - _Method: createWorktree, createSymlinksForWorktree, moveSpecToWorktree_
  - _Verify: Grep "createWorktree|moveSpec|createSymlinks" in convertWorktreeService.ts_

- [x] 1.3 ロールバック処理の実装
  - 各ステップ失敗時に作成済みリソースを逆順で削除
  - Branch作成失敗時はロールバック不要
  - Worktree作成失敗時はBranch削除
  - ファイル移動失敗時はWorktreeとBranch削除
  - ロールバック実行をログ出力
  - _Requirements: 2.3, 2.4_
  - _Method: deleteWorktree, deleteBranch_
  - _Verify: Grep "rollback|deleteWorktree|deleteBranch" in convertWorktreeService.ts_

- [x] 1.4 (P) エラー型とメッセージの定義
  - ConvertError型を定義
  - 各エラータイプに対応する日本語メッセージを準備
  - NOT_ON_MAIN_BRANCH、SPEC_NOT_FOUND、ALREADY_WORKTREE_MODE、IMPL_ALREADY_STARTED、BRANCH_CREATE_FAILED、WORKTREE_CREATE_FAILED、FILE_MOVE_FAILED、SYMLINK_CREATE_FAILED、SPEC_JSON_UPDATE_FAILEDを網羅
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 2. IPCハンドラ実装
- [x] 2.1 IPCチャンネル定義の追加
  - channels.tsにCONVERT_SPEC_TO_WORKTREE定義を追加
  - チャンネル名は`spec:convert-to-worktree`
  - _Requirements: 2.1_

- [x] 2.2 IPCハンドラの実装
  - handlers.tsに変換処理のハンドラを追加
  - ConvertWorktreeServiceを呼び出して結果を返却
  - エラー時はConvertError型で返却
  - _Requirements: 2.1, 4.2_
  - _Method: ConvertWorktreeService.convertToWorktree_
  - _Verify: Grep "CONVERT_SPEC_TO_WORKTREE|convertToWorktree" in handlers.ts_

- [x] 2.3 preload APIの公開
  - preloadスクリプトにconvertSpecToWorktree関数を追加
  - Renderer ProcessからIPC呼び出しを可能にする
  - _Requirements: 2.1_

- [x] 3. SpecWorkflowFooter UI拡張
- [x] 3.1 ボタン表示条件ロジックの実装
  - isWorktreeMode、isImplStarted、hasRunningAgentsのpropsを追加
  - 表示条件：!isWorktreeMode && !isImplStarted
  - 無効化条件：hasRunningAgents
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.2 「Worktreeに変更」ボタンの実装
  - ボタンクリック時にonConvertToWorktreeコールバックを呼び出し
  - 変換処理中はisConvertingでローディング状態を表示
  - 適切なアイコンとラベルを設定
  - _Requirements: 1.1, 2.1_

- [x] 3.3 WorkflowViewからのprops受け渡し
  - spec.jsonのworktree設定からisWorktreeMode、isImplStartedを算出
  - runningPhases情報からhasRunningAgentsを算出
  - onConvertToWorktreeハンドラでIPC呼び出しを実装
  - 成功時・エラー時の通知表示
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5_

- [x] 4. Remote UI対応
- [x] 4.1 (P) WebSocketハンドラの拡張
  - webSocketHandler.tsにspec:convert-to-worktreeハンドラを追加
  - ConvertWorktreeServiceを呼び出して結果を返却
  - エラー時もWebSocket経由でクライアントに通知
  - _Requirements: 4.2_
  - _Method: ConvertWorktreeService.convertToWorktree_
  - _Verify: Grep "convert-to-worktree" in webSocketHandler.ts_

- [x] 4.2 (P) WebSocketApiClientの拡張
  - convertSpecToWorktreeメソッドを追加
  - WebSocket経由で変換リクエストを送信
  - レスポンスを適切な型で返却
  - _Requirements: 4.2_

- [x] 4.3 Remote UI SpecDetailViewの拡張
  - Electron版と同じ条件でボタン表示/非表示を制御
  - WebSocketApiClient経由で変換処理を呼び出し
  - 成功/エラーメッセージを表示
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. テスト実装
- [x] 5.1 (P) ConvertWorktreeServiceユニットテスト
  - canConvert()の各検証ケースをテスト
  - convertToWorktree()の正常系フローをテスト
  - 各ステップ失敗時のロールバック動作をテスト
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 5.2 (P) SpecWorkflowFooterコンポーネントテスト
  - ボタン表示/非表示条件のテスト
  - ボタン有効/無効条件のテスト
  - クリックイベントのハンドリングテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 5.3 E2Eテスト実装
  - 正常系：ボタンクリックから変換完了までのフロー
  - エラー系：mainブランチ以外での変換試行
  - 変換後のspec一覧での表示確認
  - _Requirements: 1.1, 2.1, 2.2, 2.5_

- [x] 6. 統合・検証
- [x] 6.1 ビルドと型チェック
  - npm run buildでビルドエラーがないことを確認
  - npm run typecheckで型エラーがないことを確認
  - _Requirements: 全体_

- [x] 6.2 動作確認
  - 通常モードSpecを作成してWorktree変換を実行
  - 変換後のディレクトリ構造を確認
  - spec.jsonのworktree設定を確認
  - ファイル監視で変換後のspecが表示されることを確認
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Worktreeモードでない、impl未開始、agent非実行時にボタン表示 | 3.1, 3.2, 3.3 | Feature |
| 1.2 | 既にWorktreeモードならボタン非表示 | 3.1, 3.3 | Feature |
| 1.3 | impl開始済みならボタン非表示 | 3.1, 3.3 | Feature |
| 1.4 | agent実行中はボタン無効化 | 3.1, 3.3 | Feature |
| 2.1 | ボタン押下で変換処理を順次実行 | 1.2, 2.1, 2.2, 2.3, 3.2 | Feature |
| 2.2 | mainブランチ以外でエラー | 1.1, 5.3 | Feature |
| 2.3 | Worktree作成失敗時にbranch削除 | 1.3 | Feature |
| 2.4 | ファイル移動失敗時にworktree/branch削除 | 1.3 | Feature |
| 2.5 | 処理完了後に成功メッセージ | 3.3 | Feature |
| 3.1 | プロジェクト選択時に両パス監視 | 6.2 | Feature |
| 3.2 | Worktree内spec追加検知 | 6.2 | Feature |
| 3.3 | Worktree内spec.json変更検知 | 6.2 | Feature |
| 3.4 | 元specディレクトリ削除後もworktree spec表示 | 6.2 | Feature |
| 4.1 | Remote UIでも同条件でボタン表示 | 4.3 | Feature |
| 4.2 | Remote UIからWebSocket経由で変換実行 | 4.1, 4.2, 4.3 | Feature |
| 4.3 | Remote UIで成功/エラーメッセージ表示 | 4.3 | Feature |
| 5.1 | mainブランチ以外エラーメッセージ | 1.1, 1.4 | Feature |
| 5.2 | spec未発見エラーメッセージ | 1.1, 1.4 | Feature |
| 5.3 | 既にWorktreeモードエラーメッセージ | 1.1, 1.4 | Feature |
| 5.4 | impl開始済みエラーメッセージ | 1.1, 1.4 | Feature |
| 5.5 | Worktree作成失敗エラーメッセージ | 1.4 | Feature |
| 5.6 | ファイル移動失敗エラーメッセージ | 1.4 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 3.1), not container tasks (e.g., 3)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
