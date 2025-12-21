# Requirements Document

## Introduction

SDD Orchestratorの内部Webサーバー（remote-ui）が、現行のElectron版UIとの間で機能的な差分が生じている。本仕様は、remote-ui（モバイルリモートアクセス用Web UI）をElectron版の機能に追従させるための調査結果と修正計画を定義する。

### 調査結果サマリー

調査の結果、以下の主要な機能差分が確認された：

1. **バグ管理ワークフロー**: Electron版には完全なバグ管理機能（BugList, BugActionButtons, BugProgressIndicator）が存在するが、remote-uiにはSpec管理のみ
2. **ドキュメントレビュー機能**: Electron版にはDocumentReviewPanelが存在し、レビューラウンド管理が可能だが、remote-uiには非対応
3. **バリデーション機能**: Electron版にはvalidate-gap, validate-designが実行可能だが、remote-uiには非対応
4. **タスク進捗表示**: Electron版にはTaskProgressViewがあるが、remote-uiでは進捗表示が限定的
5. **WebSocket API**: WebSocketHandlerにバグ関連・バリデーション関連のメッセージハンドラが未実装

## Requirements

### Requirement 1: バグ管理機能の同期

**Objective:** リモートユーザーとして、Electron版と同様にバグ一覧の閲覧とバグワークフロー（analyze/fix/verify）を実行したい。モバイル端末からでもバグ修正の進捗を確認・操作できるようにするため。

#### Acceptance Criteria

1. When ユーザーがremote-uiにアクセスしたとき, the WebSocketHandler shall INITメッセージにバグ一覧を含めて送信する
2. When ユーザーがBugsタブを選択したとき, the remote-ui shall バグ一覧をフェーズ別フィルター付きで表示する
3. When ユーザーがバグを選択したとき, the remote-ui shall バグ詳細（名前、説明、フェーズ）を表示する
4. When ユーザーがAnalyzeボタンをタップしたとき, the remote-ui shall EXECUTE_BUG_PHASEメッセージをWebSocketで送信する
5. When ユーザーがFixボタンをタップしたとき, the remote-ui shall EXECUTE_BUG_PHASEメッセージをWebSocketで送信する
6. When ユーザーがVerifyボタンをタップしたとき, the remote-ui shall EXECUTE_BUG_PHASEメッセージをWebSocketで送信する
7. When サーバーからBUGS_UPDATEDメッセージを受信したとき, the remote-ui shall バグ一覧を最新状態に更新する
8. The WebSocketHandler shall バグ関連メッセージ（GET_BUGS, EXECUTE_BUG_PHASE, BUGS_UPDATED）を処理するハンドラを提供する

### Requirement 2: ドキュメントレビュー機能の同期

**Objective:** リモートユーザーとして、Electron版と同様にドキュメントレビューの状態確認とレビュー操作を行いたい。外出先からでもレビューの進捗を確認し、必要に応じてレビュー実行を指示できるようにするため。

#### Acceptance Criteria

1. When Spec詳細画面でtasksフェーズが完了しているとき, the remote-ui shall ドキュメントレビューセクションを表示する
2. When ドキュメントレビューセクションが表示されるとき, the remote-ui shall 現在のレビュー状態（ラウンド数、ステータス）を表示する
3. When ユーザーがレビュー開始ボタンをタップしたとき, the remote-ui shall EXECUTE_DOCUMENT_REVIEWメッセージをWebSocketで送信する
4. When サーバーからDOCUMENT_REVIEW_STATUSメッセージを受信したとき, the remote-ui shall レビュー状態表示を更新する
5. While レビューが実行中のとき, the remote-ui shall 実行中インジケーターを表示しボタンを無効化する
6. The WebSocketHandler shall ドキュメントレビュー関連メッセージ（EXECUTE_DOCUMENT_REVIEW, DOCUMENT_REVIEW_STATUS）を処理するハンドラを提供する

### Requirement 3: バリデーション機能の同期

**Objective:** リモートユーザーとして、Electron版と同様にvalidate-gapとvalidate-designを実行したい。リモートからでも仕様の整合性チェックを行えるようにするため。

#### Acceptance Criteria

1. When Spec詳細画面でrequirementsフェーズが完了しているとき, the remote-ui shall validate-gapオプションを表示する
2. When Spec詳細画面でdesignフェーズが完了しているとき, the remote-ui shall validate-designオプションを表示する
3. When ユーザーがvalidate-gapボタンをタップしたとき, the remote-ui shall EXECUTE_VALIDATIONメッセージ（type: gap）をWebSocketで送信する
4. When ユーザーがvalidate-designボタンをタップしたとき, the remote-ui shall EXECUTE_VALIDATIONメッセージ（type: design）をWebSocketで送信する
5. When サーバーからVALIDATION_STARTEDメッセージを受信したとき, the remote-ui shall バリデーション実行中インジケーターを表示する
6. When サーバーからVALIDATION_COMPLETEDメッセージを受信したとき, the remote-ui shall バリデーション完了通知を表示する
7. The WebSocketHandler shall バリデーション関連メッセージ（EXECUTE_VALIDATION, VALIDATION_STARTED, VALIDATION_COMPLETED）を処理するハンドラを提供する

### Requirement 4: タスク進捗表示の強化

**Objective:** リモートユーザーとして、Electron版と同様にimplフェーズのタスク進捗を詳細に確認したい。実装の進捗状況を正確に把握できるようにするため。

#### Acceptance Criteria

1. When Spec詳細画面でimplフェーズを表示するとき, the remote-ui shall タスク一覧（チェックリスト形式）を表示する
2. When タスク一覧を表示するとき, the remote-ui shall 各タスクの完了/未完了状態を視覚的に区別して表示する
3. When タスク一覧を表示するとき, the remote-ui shall 全体の進捗率（完了タスク数/全タスク数）をプログレスバーで表示する
4. When サーバーからTASK_PROGRESS_UPDATEDメッセージを受信したとき, the remote-ui shall タスク進捗表示を更新する
5. The WebSocketHandler shall タスク進捗関連メッセージ（TASK_PROGRESS_UPDATED）をブロードキャストする機能を提供する

### Requirement 5: Spec詳細情報の拡充

**Objective:** リモートユーザーとして、Electron版と同等のSpec詳細情報（approvalsオブジェクト、documentReview状態）を確認したい。正確なフェーズ状態とレビュー状況を把握できるようにするため。

#### Acceptance Criteria

1. When サーバーからINITメッセージを受信したとき, the remote-ui shall Specのapprovalsオブジェクト（各フェーズのgenerated/approved状態）を受け取る
2. When サーバーからSPEC_CHANGEDメッセージを受信したとき, the remote-ui shall 更新されたapprovalsオブジェクトを反映する
3. When Spec詳細画面を表示するとき, the remote-ui shall 各フェーズの状態（pending/generated/approved）を正確に表示する
4. When Specにdocument_review情報が存在するとき, the remote-ui shall レビューラウンド数とステータスを表示する
5. The StateProvider shall getSpecs()でapprovalsとdocumentReview情報を含むSpec情報を返す

### Requirement 6: WebSocket APIの拡張

**Objective:** システム管理者として、remote-uiに必要な全ての操作をWebSocket経由で実行可能にしたい。Electron版とremote-uiの機能パリティを維持するため。

#### Acceptance Criteria

1. The WebSocketHandler shall GET_BUGSメッセージを受信し、BUGS_UPDATEDメッセージでバグ一覧を返す
2. The WebSocketHandler shall EXECUTE_BUG_PHASEメッセージを受信し、バグフェーズ（analyze/fix/verify）を実行する
3. The WebSocketHandler shall EXECUTE_VALIDATIONメッセージを受信し、バリデーション（gap/design）を実行する
4. The WebSocketHandler shall EXECUTE_DOCUMENT_REVIEWメッセージを受信し、ドキュメントレビューを実行する
5. When バグの状態が変更されたとき, the WebSocketHandler shall BUGS_UPDATEDメッセージを全クライアントにブロードキャストする
6. When バリデーションが完了したとき, the WebSocketHandler shall VALIDATION_COMPLETEDメッセージを全クライアントにブロードキャストする
7. The WorkflowController interface shall バグ操作（executeBugPhase）とバリデーション操作（executeValidation）のメソッドを追加する

### Requirement 7: UIコンポーネントの追加

**Objective:** フロントエンド開発者として、Electron版に追従するためのremote-ui用コンポーネントを追加したい。モバイルファーストのレスポンシブUIを維持しながら機能を拡張するため。

#### Acceptance Criteria

1. The remote-ui shall BugListコンポーネント（バグ一覧表示、フェーズフィルター）を実装する
2. The remote-ui shall BugDetailコンポーネント（バグ詳細表示、アクションボタン）を実装する
3. The remote-ui shall DocumentReviewSectionコンポーネント（レビュー状態表示、開始ボタン）を実装する
4. The remote-ui shall ValidateOptionコンポーネント（validate-gap/designボタン）を実装する
5. The remote-ui shall TaskProgressコンポーネント（タスク一覧、プログレスバー）を実装する
6. While モバイルデバイスで表示するとき, the remote-ui shall すべての新規コンポーネントでタッチフレンドリーなUIを提供する
7. The remote-ui shall Specs/Bugsを切り替えるタブUIをDocsTabs相当で実装する

### Requirement 8: データ同期の整合性

**Objective:** システム全体として、Electron版とremote-uiの間でデータ状態を常に同期させたい。ユーザーがどちらのUIを使用しても一貫した情報を得られるようにするため。

#### Acceptance Criteria

1. When Electron版でSpecが更新されたとき, the WebSocketHandler shall SPEC_CHANGEDメッセージをリアルタイムでブロードキャストする
2. When Electron版でバグが更新されたとき, the WebSocketHandler shall BUGS_UPDATEDメッセージをリアルタイムでブロードキャストする
3. When remote-uiからフェーズを実行したとき, the Electron版 shall 実行状態を即座に反映する
4. When エージェントの出力が発生したとき, the WebSocketHandler shall AGENT_OUTPUTメッセージをリアルタイムでブロードキャストする（既存機能）
5. The LogBuffer shall Electron版とremote-ui間で共有される単一のログバッファを維持する（既存機能）
