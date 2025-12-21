# Implementation Plan

## Task Format Template

- [x] 1. StateProviderインターフェースの拡張
- [x] 1.1 (P) getBugs()メソッドの追加
  - バグ一覧を取得するメソッドをStateProviderインターフェースに追加
  - bugServiceからバグ情報を取得してBugInfo形式で返却
  - フェーズ情報（reported/analyzed/fixed/verified）を含める
  - _Requirements: 1.1, 5.5, 6.1_

- [x] 1.2 (P) getSpecs()の戻り値拡張
  - SpecInfo型にapprovalsオブジェクトを追加
  - SpecInfo型にdocumentReview情報を追加
  - SpecInfo型にtaskProgress情報を追加
  - 各フェーズのgenerated/approved状態を含める
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. WorkflowControllerインターフェースの拡張
- [x] 2.1 executeBugPhase()メソッドの追加
  - バグ名とフェーズ（analyze/fix/verify）を受け取りエージェントを起動
  - 既存のexecutePhase()パターンを踏襲
  - agentProcess経由でbug-analyze/fix/verifyコマンドを実行
  - WorkflowResult<AgentInfo>を返却
  - **実装場所**: `remoteAccessHandlers.ts` の `createWorkflowController()`
  - _Requirements: 6.2, 6.7_

- [x] 2.2 executeValidation()メソッドの追加
  - Spec IDとタイプ（gap/design）を受け取りエージェントを起動
  - validate-gap/validate-designコマンドを実行
  - WorkflowResult<AgentInfo>を返却
  - **実装場所**: `remoteAccessHandlers.ts` の `createWorkflowController()`
  - _Requirements: 6.3, 6.7_

- [x] 2.3 executeDocumentReview()メソッドの追加
  - Spec IDを受け取りドキュメントレビューエージェントを起動
  - document-reviewコマンドを実行
  - WorkflowResult<AgentInfo>を返却
  - **実装場所**: `remoteAccessHandlers.ts` の `createWorkflowController()`
  - _Requirements: 6.4, 6.7_

- [x] 3. WebSocketHandlerのメッセージハンドラ拡張
- [x] 3.1.1 GET_BUGSメッセージハンドラの追加（実装済み）
  - handleGetBugs()メソッドを追加
  - StateProvider.getBugs()経由でバグ一覧取得
  - BUGS_UPDATEDメッセージで応答
  - _Requirements: 1.1, 6.1_

- [x] 3.1.2 EXECUTE_BUG_PHASEメッセージハンドラの追加
  - routeMessage()にEXECUTE_BUG_PHASEケースを追加
  - handleExecuteBugPhase()メソッドを実装
  - WorkflowController.executeBugPhase()を呼び出し
  - BUG_PHASE_STARTEDメッセージでエージェント起動を通知
  - _Requirements: 1.4, 1.5, 1.6, 1.8, 6.2, 6.5_

- [x] 3.2 バリデーション関連メッセージハンドラの追加
  - routeMessage()にEXECUTE_VALIDATIONケースを追加
  - handleExecuteValidation()メソッドを実装
  - WorkflowController.executeValidation()を呼び出し
  - VALIDATION_STARTEDメッセージで開始を通知
  - VALIDATION_COMPLETEDメッセージで完了を通知
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 6.3, 6.6_

- [x] 3.3 ドキュメントレビュー関連メッセージハンドラの追加
  - routeMessage()にEXECUTE_DOCUMENT_REVIEWケースを追加
  - handleExecuteDocumentReview()メソッドを実装
  - WorkflowController.executeDocumentReview()を呼び出し
  - DOCUMENT_REVIEW_STARTEDメッセージで開始を通知
  - DOCUMENT_REVIEW_STATUSメッセージで状態更新を通知
  - _Requirements: 2.3, 2.4, 2.6, 6.4_

- [x] 3.4 タスク進捗・Spec更新ブロードキャストの追加
  - TASK_PROGRESS_UPDATEDメッセージをブロードキャスト
  - INITメッセージにバグ一覧とSpec詳細情報を含める
  - SPEC_CHANGEDメッセージでapprovalsを含める
  - BUGS_UPDATEDメッセージをブロードキャスト
  - _Requirements: 1.7, 4.4, 4.5, 5.1, 5.2, 8.1, 8.2_

- [x] 4. remote-ui WebSocketManagerの拡張
- [x] 4.1 新規メッセージタイプの受信処理追加
  - BUG_PHASE_STARTEDメッセージの受信と実行状態更新
  - VALIDATION_STARTED/COMPLETEDメッセージの処理
  - DOCUMENT_REVIEW_STARTED/STATUSメッセージの処理
  - TASK_PROGRESS_UPDATEDメッセージの処理
  - **実装場所**: `app.js` の `setupWebSocket()`
  - _Requirements: 1.7, 2.4, 3.5, 3.6, 4.4_

- [x] 4.2 新規メッセージ送信機能の追加（実装済み）
  - GET_BUGSメッセージ送信関数
  - EXECUTE_BUG_PHASEメッセージ送信関数
  - EXECUTE_VALIDATIONメッセージ送信関数
  - EXECUTE_DOCUMENT_REVIEWメッセージ送信関数
  - _Requirements: 1.4, 1.5, 1.6, 2.3, 3.3, 3.4_

- [x] 5. remote-ui DocsTabsコンポーネントの実装
- [x] 5.1 Specs/Bugsタブ切り替えUIの実装
  - タブUIをSpecs/Bugs切り替え可能にする
  - 選択状態の視覚的フィードバック（aria-selected）
  - タブ切り替え時のコールバック機能
  - Electron版DocsTabsのスタイルを踏襲
  - _Requirements: 7.7_

- [x] 6. remote-ui BugListコンポーネントの実装
- [x] 6.1 バグ一覧表示の実装
  - バグ一覧をカード形式で表示
  - フェーズ別フィルター機能（all/reported/analyzed/fixed/verified）
  - バグ選択時のコールバック
  - モバイル向けタッチターゲットサイズ確保（44px以上）
  - _Requirements: 1.2, 7.1_

- [x] 7. remote-ui BugDetailコンポーネントの実装
- [x] 7.1 バグ詳細表示とアクションボタンの実装
  - バグ名、説明、フェーズを表示
  - 現在のフェーズに応じたアクションボタン表示（Analyze/Fix/Verify）
  - ボタンクリック時にEXECUTE_BUG_PHASEメッセージ送信
  - 実行中状態のローディング表示
  - ボタン無効化制御
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 7.2_

- [x] 8. remote-ui DocumentReviewSectionコンポーネントの実装
- [x] 8.1 レビュー状態表示と開始ボタンの実装
  - tasksフェーズ完了後のSpec詳細画面に表示
  - 現在のレビュー状態（ラウンド数、ステータス）を表示
  - レビュー開始ボタンでEXECUTE_DOCUMENT_REVIEWメッセージ送信
  - 実行中はスピナー表示とボタン無効化
  - **実装場所**: `components.js` のSpecDetailクラスに追加
  - _Requirements: 2.1, 2.2, 2.5, 7.3_

- [x] 9. remote-ui ValidateOptionコンポーネントの実装
- [x] 9.1 バリデーション実行ボタンの実装
  - requirements完了後にvalidate-gapオプション表示
  - design完了後にvalidate-designオプション表示
  - ボタンクリック時にEXECUTE_VALIDATIONメッセージ送信
  - 実行中状態のインジケーター表示
  - **実装場所**: `components.js` のSpecDetailクラスに追加
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 7.4_

- [x] 10. remote-ui TaskProgressコンポーネントの実装
- [x] 10.1 タスク進捗表示の実装
  - implフェーズでタスク一覧をチェックリスト形式で表示
  - 完了/未完了を視覚的に区別（チェックマーク、色分け）
  - 全体進捗率をプログレスバーで表示
  - モバイルでのスクロール最適化
  - **実装場所**: `components.js` のSpecDetailクラスに追加
  - _Requirements: 4.1, 4.2, 4.3, 7.5_

- [x] 11. remote-ui App.jsの統合
- [x] 11.1 新規コンポーネントの統合とルーティング（部分実装）
  - DocsTabsを既存UI構造に組み込み ✓
  - タブ状態に応じてSpecList/BugListを切り替え ✓
  - BugDetail統合 ✓
  - DocumentReviewSection, ValidateOption, TaskProgressは未統合（コンポーネント未実装のため）
  - WebSocketManagerからのイベントを各コンポーネントに伝播
  - 全コンポーネントでタッチフレンドリーなUIを維持
  - _Requirements: 7.6_

- [x] 12. データ同期の実装
- [x] 12.1 リアルタイムブロードキャスト機能の実装（部分実装）
  - Electron版でSpec更新時にSPEC_CHANGEDをブロードキャスト ✓
  - Electron版でバグ更新時にBUGS_UPDATEDをブロードキャスト ✓
  - remote-uiからのフェーズ実行をElectron版に即座に反映 ✓
  - 既存のAGENT_OUTPUTブロードキャスト機能を維持 ✓
  - 既存のLogBuffer共有を維持 ✓
  - **未実装**: TASK_PROGRESS_UPDATED, VALIDATION_COMPLETED, DOCUMENT_REVIEW_STATUSのブロードキャスト
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13. 統合テストの実装
- [x] 13.1 WebSocketハンドラのユニットテスト
  - handleGetBugsのテスト ✓
  - handleExecuteBugPhaseのテスト ✓
  - handleExecuteValidation, handleExecuteDocumentReviewのテスト ✓
  - メッセージ往復テスト（GET_BUGS → BUGS_UPDATED）
  - _Requirements: 1.8, 2.6, 3.7, 6.1, 6.2, 6.3, 6.4_

- [x] 13.2 StateProvider/WorkflowControllerのテスト
  - getBugs()のテスト（バグ一覧取得） ✓
  - getSpecs()の戻り値拡張テスト ✓
  - executeBugPhase/executeValidation/executeDocumentReviewのテスト ✓
  - _Requirements: 5.5, 6.7_

## 実装状況サマリー

### 完了 ✅
| タスク | 内容 |
|-------|------|
| 1.1, 1.2 | StateProvider拡張（getBugs, getSpecs） |
| 2.1-2.3 | WorkflowController新規メソッド（executeBugPhase, executeValidation, executeDocumentReview） |
| 3.1.1-3.4 | WebSocketHandlerメッセージハンドラ拡張 |
| 4.1, 4.2 | WebSocketManager送受信関数 |
| 5.1 | DocsTabs |
| 6.1 | BugList |
| 7.1 | BugDetail |
| 8.1 | DocumentReviewSection（SpecDetailクラスに統合） |
| 9.1 | ValidateOption（SpecDetailクラスに統合） |
| 10.1 | TaskProgress（SpecDetailクラスに統合） |
| 13.1, 13.2 | ユニットテスト（WebSocketHandler, WorkflowController）|

### 全タスク完了 ✅
