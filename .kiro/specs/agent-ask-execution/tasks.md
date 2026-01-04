# Implementation Plan

## Tasks

- [x] 1. Skillコマンドの作成
- [x] 1.1 (P) project-ask.mdスラッシュコマンドを作成
  - Steering files（`.kiro/steering/*.md`）を読み込みコンテキストとして付与
  - ユーザープロンプトを引数として受け取り実行
  - 引数が空の場合はエラーメッセージを返す
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 1.2 (P) spec-ask.mdスラッシュコマンドを作成
  - Steering files（`.kiro/steering/*.md`）を読み込み
  - Spec files（`.kiro/specs/{feature}/*.md`）を読み込み
  - feature名とプロンプトを引数として受け取り実行
  - 指定されたspecディレクトリの存在を検証
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 1.3 skill-reference.mdへの追記
  - `.kiro/steering/skill-reference.md` に `/kiro:project-ask` と `/kiro:spec-ask` コマンドを追加
  - 用途、引数、生成ファイル、前提条件を記載
  - _Requirements: 3.1, 4.1_

- [x] 2. Desktop UI - AskAgentDialogコンポーネントの実装
- [x] 2.1 AskAgentDialogコンポーネントを作成
  - プロンプト入力用テキストエリアを実装
  - 「実行」「キャンセル」ボタンを配置
  - Project Agent/Spec Agent種別を視覚的に表示
  - プロンプト空文字時は実行ボタンを無効化
  - 実行コールバックとキャンセルコールバックを発火
  - 既存のダイアログパターン（CreateSpecDialog等）に準拠
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Desktop UI - Agent一覧ヘッダの拡張
- [x] 3.1 (P) ProjectAgentPanelヘッダに「新規実行」ボタンを追加
  - プロジェクト未選択時はボタンを無効化
  - ボタンクリックでAskAgentDialogを表示
  - ダイアログからのコールバックでIPC経由のAgent実行を呼び出し
  - _Requirements: 1.1, 1.3, 1.5_

- [x] 3.2 (P) AgentListPanelヘッダに「新規実行」ボタンを追加
  - Spec未選択時はボタンを非表示
  - specIdが存在する場合のみボタンをレンダリング
  - ボタンクリックでAskAgentDialogを表示
  - ダイアログからのコールバックでIPC経由のAgent実行を呼び出し
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 4. Main Process - Ask Agent実行機能の実装
- [x] 4.1 Ask Agent実行用のIPCハンドラを追加
  - `executeAskAgent` ハンドラをIPCハンドラに追加
  - type（project/spec）、specId（specの場合）、promptを受け取る
  - 既存の`executePhase`パターンを踏襲
  - _Requirements: 2.5_

- [x] 4.2 agentProcessにAsk Agent起動ロジックを追加
  - phase: "ask"でAgentRegistryに登録
  - `/kiro:project-ask`または`/kiro:spec-ask`コマンドを呼び出し
  - プロンプトを引数として渡す
  - 既存のAgent起動・監視フローを利用
  - _Requirements: 5.1, 5.4, 3.4, 4.5_

- [x] 4.3 Ask Agentログ保存を既存ルールに統合
  - Project askの場合は`.kiro/logs/`に保存
  - Spec askの場合は`.kiro/specs/{specId}/logs/`に保存
  - phase: "ask"のラベルでAgentリストに表示
  - _Requirements: 5.2, 5.6_

- [x] 5. Main Process - エラーハンドリングと通知
- [x] 5.1 Ask Agent実行時のエラーハンドリングを実装
  - プロセスクラッシュ時はAgentStatusを"failed"に更新
  - Claude Code起動失敗時はエラー通知を表示
  - 存在しないSpec指定時は「Spec not found」エラーを表示
  - _Requirements: 5.3, 5.5_

- [x] 6. Remote UI - WebSocketハンドラの拡張
- [x] 6.1 ASK_PROJECTメッセージハンドラを追加
  - `handleAskProject`メソッドをWebSocketHandlerに追加
  - promptを受け取り`/kiro:project-ask`を実行
  - prompt空文字チェックを実施
  - _Requirements: 6.1, 6.3_

- [x] 6.2 ASK_SPECメッセージハンドラを追加
  - `handleAskSpec`メソッドをWebSocketHandlerに追加
  - specIdとpromptを受け取り`/kiro:spec-ask`を実行
  - specId存在チェックとprompt空文字チェックを実施
  - _Requirements: 6.2, 6.4_

- [x] 6.3 Agent実行状態のブロードキャスト対応
  - ASK_STARTEDレスポンスメッセージを送信
  - 既存のAGENT_STATUSブロードキャストを活用
  - 接続中のRemote UIクライアントに状態更新を配信
  - _Requirements: 6.5_

- [x] 7. Remote UI - AskAgentDialogコンポーネントの実装
- [x] 7.1 (P) Remote UI用ProjectAgentエリアに「新規実行」ボタンを追加
  - 既存のSpecDetailパターンに準拠
  - ボタンクリックでAskAgentDialogを表示
  - _Requirements: 7.1_

- [x] 7.2 (P) Remote UI用SpecAgentエリアに「新規実行」ボタンを追加
  - Spec選択時のみボタンを表示
  - ボタンクリックでAskAgentDialogを表示
  - _Requirements: 7.2_

- [x] 7.3 Remote UI用AskAgentDialogを作成
  - Desktop版と同等のUI/UX（プロンプト入力、実行/キャンセルボタン）
  - 既存のRemote UI components.jsパターンに従う
  - Desktop版と同じバリデーションロジック（空文字チェック）
  - _Requirements: 7.3_

- [x] 7.4 WebSocket経由のAsk実行リクエスト送信
  - 「実行」クリックで`ASK_PROJECT`または`ASK_SPEC`メッセージを送信
  - wsManager経由でWebSocket通信
  - _Requirements: 7.4_

- [x] 7.5 Remote UIでのAsk Agent状態表示
  - Agent一覧にphase: "ask"のエージェントを表示
  - AgentLogPanelでリアルタイム出力をストリーム表示
  - WebSocket経由でAgent状態更新を受信
  - _Requirements: 7.5, 7.6_

- [x] 8. 統合テスト
- [x] 8.1 Desktop UI統合テスト
  - 「新規実行」→ ダイアログ → Agent実行 → ログ表示のE2Eフロー
  - Project Agent新規実行フロー
  - Spec Agent新規実行フロー（Spec選択状態から）
  - _Requirements: 1.1, 1.2, 2.1, 2.5, 5.2, 5.3_

- [x] 8.2 Remote UI統合テスト
  - WebSocket ASK_PROJECT → Agent起動 → ブロードキャスト受信
  - WebSocket ASK_SPEC → Agent起動 → ブロードキャスト受信
  - Remote UI経由のAsk実行フロー
  - _Requirements: 6.1, 6.2, 6.5, 7.4, 7.5, 7.6_
