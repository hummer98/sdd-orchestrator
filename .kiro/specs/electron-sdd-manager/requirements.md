# Requirements Document

## Project Description (Input)
SDD Orchestratorは、Spec-Driven Development (SDD) ワークフローを管理するElectronベースのデスクトップアプリケーションである。複数のSpec Managerプロセスを管理し、各Spec ManagerはClaude Code（SDD Agent）を起動してワークフローを実行する。

## Introduction
本要件ドキュメントは、SDD Orchestratorアプリケーションの機能要件を定義する。このアプリケーションは3層構造（Orchestrator → Spec Manager → SDD Agent）で動作し、仕様書の作成・編集・承認フローを視覚的に管理できる。

### システム構造

```
SDD Orchestrator (Electron App)
    │
    ├── Spec Manager (spec-A)
    │       ├── SDD Agent 1 (requirement)
    │       ├── SDD Agent 2 (design)
    │       └── SDD Agent N (impl-task-N)
    │
    ├── Spec Manager (spec-B)
    │       └── SDD Agent ...
    │
    └── Spec Manager (spec-C)
            └── SDD Agent ...
```

### 実行グループ

| グループ名 | 含まれるフェーズ | 実行モデル |
|-----------|-----------------|-----------|
| doc | requirement, design, tasks | 逐次実行 |
| validate | validate-gap, validate-design, validate-impl | グループ内並列可能 |
| impl | impl task-1, task-2, ... | グループ内並列可能 |

- グループ間は排他（同時に1グループのみ実行）
- validateとimplは同時実行されない

## Requirements

### Requirement 1: プロジェクト管理
**Objective:** As a 開発者, I want プロジェクトディレクトリを選択・管理できること, so that SDDワークフローを対象プロジェクトに対して実行できる

#### Acceptance Criteria
1. When ユーザーがプロジェクト選択ボタンをクリックした時, the SDD Orchestrator shall OSのファイルダイアログを表示し、ディレクトリを選択できるようにする
2. When プロジェクトが選択された時, the SDD Orchestrator shall .kiroディレクトリの存在を検証し、結果を表示する
3. If .kiroディレクトリが存在しない場合, then the SDD Orchestrator shall 初期化オプションを提供する
4. The SDD Orchestrator shall 最近使用したプロジェクトの一覧を保存・表示する（メニューバーからアクセス）
5. When 最近使用したプロジェクトがクリックされた時, the SDD Orchestrator shall そのプロジェクトを現在のプロジェクトとして設定する
6. The SDD Orchestrator shall 1プロジェクトのみを管理対象とする（複数プロジェクト同時管理は対象外）

### Requirement 2: 仕様一覧表示
**Objective:** As a 開発者, I want プロジェクト内の全仕様を一覧表示できること, so that 作業対象の仕様を素早く見つけ選択できる

#### Acceptance Criteria
1. When プロジェクトが選択された時, the SDD Orchestrator shall .kiro/specsディレクトリから全仕様を読み込み一覧表示する
2. The SDD Orchestrator shall 各仕様の名前、フェーズ、ステータス、更新日時、実行中Agent数を表示する
3. When ユーザーがソートボタンをクリックした時, the SDD Orchestrator shall 名前・更新日時・ステータスで仕様一覧をソートする
4. When ユーザーがステータスフィルターを変更した時, the SDD Orchestrator shall 選択されたステータスの仕様のみを表示する
5. When 仕様の読み込みに失敗した場合, then the SDD Orchestrator shall エラーメッセージを表示する
6. While 仕様を読み込み中, the SDD Orchestrator shall ローディングインジケーターを表示する

### Requirement 3: 仕様詳細表示
**Objective:** As a 開発者, I want 選択した仕様の詳細情報を確認できること, so that 仕様の現在の状態を把握できる

#### Acceptance Criteria
1. When 仕様がリストから選択された時, the SDD Orchestrator shall 仕様の詳細パネルを表示する
2. The SDD Orchestrator shall 仕様のメタデータ（機能名、フェーズ、言語、作成日時、更新日時）を表示する
3. The SDD Orchestrator shall 各フェーズ（requirements、design、tasks）の承認状態を表示する
4. The SDD Orchestrator shall 各成果物（requirements.md、design.md、tasks.md）の存在状態と更新日時を表示する
5. Where 仕様が実装可能状態（ready_for_implementation: true）の場合, the SDD Orchestrator shall 実装可能バッジを表示する

### Requirement 4: 新規仕様作成
**Objective:** As a 開発者, I want 新しい仕様を作成できること, so that 新機能の開発をSDDワークフローで管理できる

#### Acceptance Criteria
1. When ユーザーが新規仕様作成ボタンをクリックした時, the SDD Orchestrator shall 仕様作成ダイアログを表示する
2. The SDD Orchestrator shall 仕様名の入力フィールドを提供し、小文字・数字・ハイフンのみを許可する
3. The SDD Orchestrator shall 説明の入力フィールドを提供し、10文字以上の入力を必須とする
4. If 入力バリデーションに失敗した場合, then the SDD Orchestrator shall 具体的なエラーメッセージを表示する
5. When 有効な入力で作成ボタンがクリックされた時, the SDD Orchestrator shall .kiro/specs/{仕様名}ディレクトリを作成し、初期ファイルを生成する
6. When 仕様作成が成功した時, the SDD Orchestrator shall ダイアログを閉じ、仕様一覧を更新する

### Requirement 5: Spec Manager - SDD Agent管理
**Objective:** As a 開発者, I want 各仕様のSDD Agentを管理できること, so that ワークフローの実行状態を把握・制御できる

#### Acceptance Criteria
1. The SDD Orchestrator shall 各Spec Manager配下のSDD Agent一覧を表示する
2. The SDD Orchestrator shall 各SDD Agentの状態（running/completed/interrupted/hang）を表示する
3. When SDD Agentが一定時間（デフォルト5分）応答しない場合, the SDD Orchestrator shall "hang"状態を表示する
4. The SDD Orchestrator shall hang検出の閾値を設定で変更可能にする（設定は永続化）
5. The SDD Orchestrator shall SDD AgentのsessionIdをPIDファイルに保存する
6. When アプリ再起動時, the SDD Orchestrator shall PIDファイルからSDD Agent状態を復元する
7. If プロセスが死亡している場合, then the SDD Orchestrator shall 「中断されています」と表示し「続けて」ボタンを提供する
8. When 「続けて」ボタンがクリックされた時, the SDD Orchestrator shall `claude -p --resume {sessionId} "続けて"` を実行する

### Requirement 6: フェーズ実行制御
**Objective:** As a 開発者, I want SDDの各フェーズを実行できること, so that 仕様書の生成・設計・タスク分解・実装を進められる

#### Acceptance Criteria
1. The SDD Orchestrator shall doc/validate/implの3グループのフェーズ実行を提供する
2. When docグループ実行時, the SDD Orchestrator shall requirement → design → tasks を逐次実行する
3. When validateグループ実行時, the SDD Orchestrator shall validate-gap, validate-design, validate-impl を並列実行可能にする
4. When implグループ実行時, the SDD Orchestrator shall 複数のimplタスクを並列実行可能にする
5. The SDD Orchestrator shall validateグループとimplグループを排他制御する（同時実行不可）
6. If 前提フェーズが承認されていない場合, then the SDD Orchestrator shall 該当フェーズボタンを無効化する
7. While フェーズ実行中, the SDD Orchestrator shall 実行中インジケーターを表示する
8. Where auto-approveオプションが有効の場合, the SDD Orchestrator shall フェーズ実行後に自動承認を行う

### Requirement 7: フェーズ承認管理
**Objective:** As a 開発者, I want 各フェーズの成果物を承認・却下できること, so that ワークフローを次のフェーズに進められる

#### Acceptance Criteria
1. The SDD Orchestrator shall requirements、design、tasksの3フェーズの承認状態を表示する
2. When 成果物が生成済みの場合, the SDD Orchestrator shall 承認ボタンと却下ボタンを有効化する
3. When 承認ボタンがクリックされた時, the SDD Orchestrator shall spec.jsonのapprovals.{phase}.approvedをtrueに更新する
4. When 却下ボタンがクリックされた時, the SDD Orchestrator shall 却下理由入力ダイアログを表示する
5. If 却下理由が空の場合, then the SDD Orchestrator shall 却下処理を実行しない
6. When 却下理由が入力されて送信された時, the SDD Orchestrator shall 却下処理を実行し、理由を記録する
7. If フェーズが既に承認済みの場合, then the SDD Orchestrator shall 承認済みバッジを表示し、承認ボタンを非表示にする

### Requirement 8: 成果物編集
**Objective:** As a 開発者, I want 仕様書の成果物（Markdownファイル）を編集できること, so that 生成された内容を修正・改善できる

#### Acceptance Criteria
1. The SDD Orchestrator shall requirements.md、design.md、tasks.mdをタブで切り替えて表示する
2. The SDD Orchestrator shall Markdownエディターを提供し、編集モードとプレビューモードを切り替え可能にする
3. When 編集モードでコンテンツが変更された時, the SDD Orchestrator shall 未保存状態（dirty）を追跡する
4. When 保存ボタンがクリックされた時 and 未保存の変更がある場合, the SDD Orchestrator shall 変更をファイルに書き込む
5. While 保存処理中, the SDD Orchestrator shall 保存中インジケーターを表示する
6. If 保存処理が失敗した場合, then the SDD Orchestrator shall エラーメッセージを表示する
7. When 保存が成功した時, the SDD Orchestrator shall 未保存状態をクリアする

### Requirement 9: 実行ログ表示（Agent単位）
**Objective:** As a 開発者, I want SDD Agent毎のログをリアルタイムで確認できること, so that 実行状況を監視しエラーを特定できる

#### Acceptance Criteria
1. The SDD Orchestrator shall SDD Agent単位でログを管理・表示する
2. When SDD Agentが選択された時, the SDD Orchestrator shall そのAgentのログを表示する
3. The SDD Orchestrator shall ログをファイルに永続化する（.kiro/runtime/logs/{specId}/{agentId}.log）
4. The SDD Orchestrator shall stdout（標準出力）とstderr（標準エラー）を視覚的に区別して表示する
5. While 実行中, the SDD Orchestrator shall 実行中インジケーターを表示する
6. When 実行が完了した時, the SDD Orchestrator shall 終了コードと実行時間を表示する
7. The SDD Orchestrator shall ログのコピー機能を提供する
8. The SDD Orchestrator shall ログのクリア機能を提供する
9. Where ログが大量の場合, the SDD Orchestrator shall 仮想スクロールを使用してパフォーマンスを維持する
10. While 新しいログが追加された時, the SDD Orchestrator shall ログパネルを最新のログにスクロールする

### Requirement 10: SDD Agentへのユーザー入力
**Objective:** As a 開発者, I want 実行中のSDD Agentにユーザー入力を送信できること, so that エスカレーション時に対応できる

#### Acceptance Criteria
1. The SDD Orchestrator shall 各SDD Agentに対してstdin入力フィールドを提供する
2. When ユーザーが入力を送信した時, the SDD Orchestrator shall 該当SDD Agentのstdinに入力を転送する
3. The SDD Orchestrator shall 入力履歴を表示する

### Requirement 11: 未保存変更ガード
**Objective:** As a 開発者, I want 未保存の変更がある状態で画面遷移しようとした時に警告されること, so that 誤ってデータを失わない

#### Acceptance Criteria
1. When 未保存の変更がある状態で別の仕様を選択しようとした時, the SDD Orchestrator shall 確認ダイアログを表示する
2. When 未保存の変更がある状態でアプリケーションを閉じようとした時, the SDD Orchestrator shall 確認ダイアログを表示する
3. If ユーザーが続行を選択した場合, then the SDD Orchestrator shall 変更を破棄してアクションを実行する
4. If ユーザーがキャンセルを選択した場合, then the SDD Orchestrator shall アクションをキャンセルし、現在の画面を維持する

### Requirement 12: 通知システム
**Objective:** As a 開発者, I want 操作結果の通知を受け取れること, so that 成功・失敗を即座に把握できる

#### Acceptance Criteria
1. The SDD Orchestrator shall 成功・エラー・警告・情報の4種類の通知を表示する
2. When 操作が成功した時, the SDD Orchestrator shall 成功通知を表示する
3. If 操作が失敗した場合, then the SDD Orchestrator shall エラー通知を表示し、エラー内容を含める
4. The SDD Orchestrator shall 通知を一定時間後に自動的に非表示にする
5. Where 通知にアクションが設定されている場合, the SDD Orchestrator shall アクションボタンを表示する

### Requirement 13: 設定管理
**Objective:** As a 開発者, I want アプリケーション設定を管理できること, so that 好みに合わせてカスタマイズできる

#### Acceptance Criteria
1. The SDD Orchestrator shall hang検出閾値（デフォルト5分）を設定可能にする
2. The SDD Orchestrator shall 設定をapp.getPath('userData')配下に永続化する
3. The SDD Orchestrator shall ウィンドウサイズ・位置を保存・復元する

### Requirement 14: Electron固有機能
**Objective:** As a 開発者, I want Electronの機能を活用したネイティブ体験を得られること, so that デスクトップアプリケーションとして快適に利用できる

#### Acceptance Criteria
1. The SDD Orchestrator shall Electronのメインプロセスとレンダラープロセスを分離したアーキテクチャで構築する
2. The SDD Orchestrator shall IPC（Inter-Process Communication）を使用してプロセス間通信を行う
3. The SDD Orchestrator shall ファイルシステムアクセスをメインプロセスで安全に処理する
4. The SDD Orchestrator shall OSネイティブのダイアログ（ファイル選択、確認）を使用する
5. The SDD Orchestrator shall シェルコマンド実行をメインプロセスで安全に処理する
6. The SDD Orchestrator shall アプリケーションメニューを提供する
7. Where macOSの場合, the SDD Orchestrator shall macOS標準のUI規約に従う

### Requirement 15: クロスプラットフォーム対応
**Objective:** As a 開発者, I want Windows、macOS、Linuxで同様に動作すること, so that 使用するOSに依存せず開発作業ができる

#### Acceptance Criteria
1. The SDD Orchestrator shall macOS、Windows、Linuxでビルド可能な設定を持つ
2. The SDD Orchestrator shall 各プラットフォームのパス区切り文字を適切に処理する
3. The SDD Orchestrator shall 各プラットフォームの改行コードを適切に処理する
4. When コマンド実行時, the SDD Orchestrator shall プラットフォーム固有のシェル（cmd/sh）を使用する

### Requirement 16: セキュリティ
**Objective:** As a セキュリティ意識のある開発者, I want アプリケーションが安全に動作すること, so that 悪意のある操作から保護される

#### Acceptance Criteria
1. The SDD Orchestrator shall Context Isolationを有効にしてレンダラープロセスを分離する
2. The SDD Orchestrator shall Node Integrationを無効にしてレンダラープロセスでのNode.js APIへの直接アクセスを防ぐ
3. The SDD Orchestrator shall preloadスクリプトを使用して安全なAPIのみを公開する
4. The SDD Orchestrator shall パス入力に対してディレクトリトラバーサル攻撃を防ぐバリデーションを行う
5. If 不正なパスが検出された場合, then the SDD Orchestrator shall 操作を拒否しエラーを返す
