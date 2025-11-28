# Requirements Document

## Project Description (Input)
Tauri + Reactで構築するSDD Managerのデスクトップアプリケーション。`.kiro/specs/`内の仕様を視覚的に管理し、Spec-Driven Development (SDD)ワークフローを直感的に操作できるUIを提供する。仕様の作成・編集・進捗管理・実行制御をGUIで行える統合開発環境。

## 導入
このドキュメントは、SDD Manager UIデスクトップアプリケーションの要求事項を定義します。本システムは、Tauriフレームワーク（Rustバックエンド）とReact（フロントエンド）を使用して構築され、Spec-Driven Developmentプロセスを視覚的に管理するためのデスクトップアプリケーションです。開発者がSDDワークフローを効率的に操作し、仕様の状態を一目で把握できる環境を提供します。

## Requirements

### 1. 仕様一覧表示機能
**目的:** 開発者として、プロジェクト内のすべての仕様を一覧で確認したい。これにより、各仕様の状態と進捗を素早く把握できる。

#### 受け入れ条件
1. When アプリケーションが起動する, the SDD Manager UI shall `.kiro/specs/`ディレクトリをスキャンして仕様一覧を表示する
2. The SDD Manager UI shall 各仕様の名前、現在のフェーズ、ステータスをリスト形式で表示する
3. When 仕様アイテムをクリックする, the SDD Manager UI shall その仕様の詳細ビューに遷移する
4. The SDD Manager UI shall 仕様のステータス（進行中、完了、エラー、保留）を視覚的に区別するアイコンまたは色を表示する
5. When 新しい仕様が追加される, the SDD Manager UI shall リストを自動更新する
6. The SDD Manager UI shall 仕様を名前、更新日時、ステータスでソートできる機能を提供する

### 2. 仕様詳細表示機能
**目的:** 開発者として、選択した仕様の詳細情報を確認したい。これにより、仕様の内容と進捗状況を詳細に把握できる。

#### 受け入れ条件
1. When 仕様が選択される, the SDD Manager UI shall spec.jsonから仕様メタデータを読み取って表示する
2. The SDD Manager UI shall 仕様の各フェーズ（requirements、design、tasks、implementation）の承認状態を表示する
3. The SDD Manager UI shall requirements.md、design.md、tasks.mdの内容をMarkdownレンダリングして表示する
4. When タブを切り替える, the SDD Manager UI shall 対応するドキュメントの内容を表示する
5. The SDD Manager UI shall 仕様の作成日時と最終更新日時を表示する
6. If 成果物ファイルが存在しない, the SDD Manager UI shall 「未生成」プレースホルダーを表示する

### 3. 仕様作成機能
**目的:** 開発者として、新しい仕様をGUIから作成したい。これにより、コマンドラインを使用せずに仕様を初期化できる。

#### 受け入れ条件
1. When 「新規仕様」ボタンをクリックする, the SDD Manager UI shall 仕様作成フォームを表示する
2. The SDD Manager UI shall 仕様名（feature name）と説明（description）の入力フィールドを提供する
3. When 「作成」ボタンをクリックする, the SDD Manager UI shall `.kiro/specs/{feature_name}/`ディレクトリを作成する
4. The SDD Manager UI shall 初期spec.jsonファイルを適切なメタデータで生成する
5. If 同名の仕様が既に存在する, the SDD Manager UI shall エラーメッセージを表示して作成を中止する
6. When 仕様が正常に作成される, the SDD Manager UI shall 仕様一覧を更新して新しい仕様を表示する

### 4. フェーズ実行制御機能
**目的:** 開発者として、各SDDフェーズをGUIから実行したい。これにより、ワークフローを視覚的に制御できる。

#### 受け入れ条件
1. The SDD Manager UI shall 各フェーズ（requirements、design、tasks、implementation）の実行ボタンを提供する
2. When 「Requirements生成」ボタンをクリックする, the SDD Manager UI shall `/kiro:spec-requirements`コマンドを実行する
3. When 「Design生成」ボタンをクリックする, the SDD Manager UI shall `/kiro:spec-design`コマンドを実行する
4. When 「Tasks生成」ボタンをクリックする, the SDD Manager UI shall `/kiro:spec-tasks`コマンドを実行する
5. When 「Implementation実行」ボタンをクリックする, the SDD Manager UI shall `/kiro:spec-impl`コマンドを実行する
6. While フェーズが実行中, the SDD Manager UI shall 進行状況インジケーターを表示する
7. If 前提フェーズが未完了, the SDD Manager UI shall 該当ボタンを無効化する

### 5. 承認ワークフロー管理機能
**目的:** 開発者として、各フェーズの成果物を承認・却下したい。これにより、品質ゲートを確保できる。

#### 受け入れ条件
1. When フェーズの成果物が生成される, the SDD Manager UI shall 「承認」と「却下」ボタンを表示する
2. When 「承認」ボタンをクリックする, the SDD Manager UI shall spec.jsonの該当フェーズのapprovalをtrueに更新する
3. When 「却下」ボタンをクリックする, the SDD Manager UI shall 却下理由の入力ダイアログを表示する
4. The SDD Manager UI shall 各フェーズの承認履歴を表示する
5. If すべてのフェーズが承認される, the SDD Manager UI shall ready_for_implementationフラグをtrueに設定する
6. When 成果物が未生成, the SDD Manager UI shall 承認ボタンを無効化する

### 6. 実行ログ表示機能
**目的:** 開発者として、コマンド実行のログを確認したい。これにより、エラーの診断とデバッグができる。

#### 受け入れ条件
1. The SDD Manager UI shall コマンド実行の標準出力と標準エラー出力をリアルタイムで表示する
2. When コマンドが実行開始する, the SDD Manager UI shall ログパネルを自動的に開く
3. The SDD Manager UI shall ログをスクロール可能なテキストエリアに表示する
4. When コマンドが完了する, the SDD Manager UI shall 終了コードと実行時間を表示する
5. The SDD Manager UI shall ログ内容をクリップボードにコピーする機能を提供する
6. If エラーが発生する, the SDD Manager UI shall エラーログを赤色でハイライト表示する

### 7. プロジェクト設定機能
**目的:** 開発者として、SDDプロジェクトの設定を管理したい。これにより、プロジェクト固有のカスタマイズができる。

#### 受け入れ条件
1. The SDD Manager UI shall プロジェクトルートディレクトリの選択機能を提供する
2. When プロジェクトが選択される, the SDD Manager UI shall `.kiro/`ディレクトリの存在を検証する
3. If `.kiro/`ディレクトリが存在しない, the SDD Manager UI shall 初期化オプションを提示する
4. The SDD Manager UI shall 最近開いたプロジェクトの履歴を保存する
5. When アプリケーション起動時, the SDD Manager UI shall 最後に開いたプロジェクトを自動的に読み込む
6. The SDD Manager UI shall steeringファイル（product.md、tech.md、structure.md）の存在を表示する

### 8. ファイルシステム監視機能
**目的:** 開発者として、ファイル変更を自動検出したい。これにより、手動でリフレッシュせずに最新状態を確認できる。

#### 受け入れ条件
1. The SDD Manager UI shall `.kiro/specs/`ディレクトリをファイルシステム監視する
2. When spec.jsonファイルが変更される, the SDD Manager UI shall 仕様詳細を自動更新する
3. When 成果物ファイル（.md）が変更される, the SDD Manager UI shall ドキュメントビューを自動更新する
4. When 新しい仕様ディレクトリが作成される, the SDD Manager UI shall 仕様一覧に追加する
5. When 仕様ディレクトリが削除される, the SDD Manager UI shall 仕様一覧から削除する
6. The SDD Manager UI shall ファイル監視による更新時に通知を表示する

### 9. Markdownエディタ機能
**目的:** 開発者として、成果物ドキュメントをアプリ内で編集したい。これにより、外部エディタを使用せずに修正できる。

#### 受け入れ条件
1. The SDD Manager UI shall requirements.md、design.md、tasks.mdのMarkdownエディタを提供する
2. The SDD Manager UI shall プレビューモードと編集モードを切り替える機能を提供する
3. When 「保存」ボタンをクリックする, the SDD Manager UI shall ファイルに変更を保存する
4. If 未保存の変更がある, the SDD Manager UI shall エディタタブにインジケーターを表示する
5. When エディタを閉じる際に未保存の変更がある, the SDD Manager UI shall 保存確認ダイアログを表示する
6. The SDD Manager UI shall 基本的なMarkdown記法のツールバーを提供する

### 10. クロスプラットフォームサポート
**目的:** 開発者として、異なるOSでアプリケーションを使用したい。これにより、チーム全員が同じツールを使用できる。

#### 受け入れ条件
1. The SDD Manager UI shall macOS、Windows、Linuxで動作する
2. The SDD Manager UI shall 各プラットフォームのネイティブウィンドウ装飾を使用する
3. The SDD Manager UI shall 各プラットフォームの標準的なキーボードショートカットに対応する
4. The SDD Manager UI shall 各プラットフォームの標準的なファイルパス形式を処理する
5. When ダークモードが有効な場合, the SDD Manager UI shall OSのテーマ設定に従う
6. The SDD Manager UI shall 高DPIディスプレイに対応したUI表示を提供する

### 11. エラー処理とユーザー通知機能
**目的:** 開発者として、操作結果やエラーを明確に把握したい。これにより、問題を迅速に特定して対処できる。

#### 受け入れ条件
1. When 操作が成功する, the SDD Manager UI shall 成功通知をトースト形式で表示する
2. If 操作が失敗する, the SDD Manager UI shall エラー詳細をダイアログで表示する
3. When ファイルアクセスが拒否される, the SDD Manager UI shall 権限エラーメッセージを表示する
4. If ネットワークエラーが発生する, the SDD Manager UI shall リトライオプションを提示する
5. The SDD Manager UI shall すべてのエラーをアプリケーションログに記録する
6. When 回復可能なエラーが発生する, the SDD Manager UI shall 推奨される解決手順を表示する

### 12. Tauri IPC通信機能
**目的:** フロントエンドとバックエンドとして、安全で効率的な通信を行いたい。これにより、ネイティブ機能にアクセスできる。

#### 受け入れ条件
1. The SDD Manager UI shall TauriのIPCメカニズムを使用してRustバックエンドと通信する
2. The SDD Manager UI shall ファイルシステム操作をRust側で実行する
3. The SDD Manager UI shall コマンド実行（Claude Code呼び出し）をRust側で処理する
4. When IPC呼び出しが失敗する, the SDD Manager UI shall タイムアウトエラーを処理する
5. The SDD Manager UI shall 非同期IPC呼び出しを使用してUIブロッキングを防止する
6. The SDD Manager UI shall IPC通信のセキュリティ設定を適切に構成する
