# Requirements Document

## Introduction

Remote UIにおけるワークフロー機能の改善仕様。現在Remote UIは6フェーズ表示に対応済みだが、生成済みフェーズの承認機能とDocument Review機能が欠落している。本仕様では、Remote UIをDesktop UIに近い操作性へ拡張し、リモートからでも効率的なSDD（Spec-Driven Development）ワークフロー運用を可能にする。

## Scope

**Remote UI対応**: 本仕様はRemote UI専用の機能追加である。

対象機能:
- Remote UI側のワークフロー承認機能
- Remote UI側のDocument Review機能
- WebSocketハンドラの追加
- remote-ui/components配下のUI追加

## Requirements

### Requirement 1: フェーズ承認機能（Remote UI）

**Objective:** リモートユーザーとして、Remote UIからrequirements/design/tasksの生成済みドキュメントを承認したい。これにより、デスクトップアプリを開かずにワークフローを進行できる。

#### Acceptance Criteria

1. When ユーザーがRemote UIでgeneratedステータスのフェーズを選択した時, Remote UI shall 承認ボタン（Approve）を表示する
2. When ユーザーが承認ボタンをクリックした時, Remote UI shall WebSocket経由でapprovePhaseリクエストを送信する
3. When WebSocketサーバーがapprovePhaseリクエストを受信した時, WebSocket Handler shall 対象フェーズのspec.jsonを更新し（approvals.{phase}.approved: true）、結果をクライアントに通知する
4. If フェーズがまだgeneratedステータスでない場合, Remote UI shall 承認ボタンを非活性（disabled）状態で表示する
5. While 承認処理が実行中の間, Remote UI shall ローディングインジケータを表示し、承認ボタンを非活性にする
6. When 承認が完了した時, Remote UI shall フェーズステータス表示を更新し、次フェーズボタンを有効化する

### Requirement 2: 次フェーズ実行ブロック機能

**Objective:** リモートユーザーとして、前フェーズが承認されていない状態では次フェーズを実行できないようにしたい。これにより、ワークフローの整合性を保つことができる。

#### Acceptance Criteria

1. When 前フェーズがgeneratedだが未承認（approved: false）の状態の時, Remote UI shall 次フェーズの実行ボタンを非活性にする
2. When getNextPhase関数が呼び出された時 and 現フェーズがgenerated未承認の場合, getNextPhase shall nullを返し次フェーズへの遷移をブロックする
3. If ユーザーが非活性の次フェーズボタンにホバーした場合, Remote UI shall 「前フェーズの承認が必要です」というツールチップを表示する
4. When 自動実行モードがONの時 and 現フェーズが未承認の場合, Remote UI shall 自動実行を一時停止し、承認待ち状態であることを表示する

### Requirement 3: Document Review状態表示

**Objective:** リモートユーザーとして、現在のDocument Reviewの状態（レビュー中、回答待ち、完了等）を確認したい。これにより、レビュープロセスの進行状況を把握できる。

#### Acceptance Criteria

1. Remote UI shall DocumentReviewStatusコンポーネントを表示し、現在のレビュー状態を示す
2. When specにreviewRoundsが存在する時, Remote UI shall 現在のラウンド番号と総ラウンド数を表示する
3. When 最新のレビューラウンドがin_progress状態の時, Remote UI shall 「レビュー中」ステータスをバッジ形式で表示する
4. When 最新のレビューラウンドがreview_complete状態の時, Remote UI shall 「回答待ち」ステータスを強調表示する
5. When 最新のレビューラウンドがreply_complete状態の時, Remote UI shall 「完了」ステータスを表示する

### Requirement 4: Document Reviewボタン

**Objective:** リモートユーザーとして、Remote UIからDocument Reviewを開始・操作したい。これにより、リモートからでもドキュメントレビューワークフローを実行できる。

#### Acceptance Criteria

1. Remote UI shall Document Reviewセクションに「Start Review」ボタンを表示する
2. When ユーザーが「Start Review」ボタンをクリックした時, Remote UI shall WebSocket経由でdocument-reviewリクエストを送信する
3. When WebSocketサーバーがdocument-reviewリクエストを受信した時, WebSocket Handler shall /kiro:document-reviewコマンドを実行し、結果をクライアントに通知する
4. While レビューが実行中の間, Remote UI shall ローディングインジケータを表示し、ボタンを非活性にする
5. If レビュー対象のドキュメントが存在しない場合, Remote UI shall 「Start Review」ボタンを非活性にし、理由を表示する

### Requirement 5: Document Review Reply/Fix機能

**Objective:** リモートユーザーとして、レビュー結果に対してReply（回答）またはFix（自動修正）を実行したい。これにより、レビュー指摘への対応をリモートから完結できる。

#### Acceptance Criteria

1. When レビューラウンドがreview_complete状態の時, Remote UI shall 「Reply」ボタンと「Fix」ボタンを表示する
2. When ユーザーが「Reply」ボタンをクリックした時, Remote UI shall WebSocket経由でdocument-review-replyリクエストを送信する
3. When ユーザーが「Fix」ボタンをクリックした時, Remote UI shall WebSocket経由でdocument-review-reply --autofixリクエストを送信する
4. When WebSocketサーバーがdocument-review-replyリクエストを受信した時, WebSocket Handler shall 対応するコマンドを実行し、結果をクライアントに通知する
5. While Reply/Fix処理が実行中の間, Remote UI shall ローディングインジケータを表示し、両ボタンを非活性にする
6. When Reply/Fix処理が完了した時, Remote UI shall レビュー状態表示を更新する

### Requirement 6: autoExecutionFlag制御（skip/run/pause）

**Objective:** リモートユーザーとして、Document Reviewの自動実行動作を制御（skip/run/pause）したい。これにより、レビューワークフローの自動化レベルを調整できる。

#### Acceptance Criteria

1. Remote UI shall autoExecutionFlagセレクタ（ドロップダウンまたはボタングループ）を表示する
2. The autoExecutionFlagセレクタ shall 「skip」「run」「pause」の3つのオプションを提供する
3. When ユーザーがautoExecutionFlagを変更した時, Remote UI shall WebSocket経由でupdateAutoExecutionFlagリクエストを送信する
4. When WebSocketサーバーがupdateAutoExecutionFlagリクエストを受信した時, WebSocket Handler shall spec.jsonのautoExecution.documentReviewFlagを更新し、結果をクライアントに通知する
5. When autoExecutionFlagが「skip」の時, Remote UI shall Document Reviewステップをスキップすることを示すラベルを表示する
6. When autoExecutionFlagが「run」の時, Remote UI shall Document Reviewを自動実行することを示すラベルを表示する
7. When autoExecutionFlagが「pause」の時, Remote UI shall Document Reviewで一時停止することを示すラベルを表示する

### Requirement 7: WebSocketハンドラ拡張

**Objective:** システムとして、Remote UIからの新しいリクエスト（承認、Document Review関連）を処理するWebSocketハンドラを提供したい。これにより、Remote UIの新機能がバックエンドと連携できる。

#### Acceptance Criteria

1. WebSocket Handler shall approvePhaseメッセージタイプを処理し、指定フェーズを承認する
2. WebSocket Handler shall documentReviewStartメッセージタイプを処理し、レビューを開始する
3. WebSocket Handler shall documentReviewReplyメッセージタイプを処理し、replyコマンドを実行する（autofixオプション付きの場合は--autofixフラグを付加）
4. WebSocket Handler shall updateAutoExecutionFlagメッセージタイプを処理し、設定を更新する
5. When 処理が完了した時, WebSocket Handler shall 成功/失敗のレスポンスをクライアントに送信する
6. If 処理中にエラーが発生した場合, WebSocket Handler shall エラー詳細をクライアントに送信する

### Requirement 8: リアルタイム状態同期

**Objective:** リモートユーザーとして、Desktop UIでの操作結果がRemote UIにリアルタイムで反映されてほしい。これにより、複数端末での協調作業が可能になる。

#### Acceptance Criteria

1. When Desktop UIでフェーズが承認された時, WebSocket Server shall 全接続クライアントにphaseApprovedイベントをブロードキャストする
2. When Desktop UIでDocument Reviewが更新された時, WebSocket Server shall 全接続クライアントにreviewUpdatedイベントをブロードキャストする
3. When Desktop UIでautoExecutionFlagが変更された時, WebSocket Server shall 全接続クライアントにflagUpdatedイベントをブロードキャストする
4. When Remote UIがブロードキャストイベントを受信した時, Remote UI shall 対応するUIコンポーネントを即座に更新する
5. While WebSocket接続が切断されている間, Remote UI shall 接続切断状態を表示し、自動再接続を試みる

