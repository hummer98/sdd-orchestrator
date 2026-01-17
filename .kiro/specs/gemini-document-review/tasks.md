# Implementation Plan

## Task 1: 型定義とレビューエンジンレジストリ

- [x] 1.1 (P) ReviewerScheme型と定数を定義する
  - DocumentReviewStateインタフェースにschemeフィールドを追加
  - ReviewerScheme型（'claude-code' | 'gemini-cli' | 'debatex'）を定義
  - DEFAULT_REVIEWER_SCHEME定数を'claude-code'で定義
  - 型ガードまたはバリデーション関数を追加
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 1.2 (P) ReviewEngineRegistryを作成しエンジン設定を集約する
  - REVIEW_ENGINES定数にclaude-code、gemini-cli、debatexのエンジン設定を定義
  - 各エンジンのlabel、colorClass、command、buildArgs、outputFormatを設定
  - getReviewEngine()関数を実装（未知schemeはDEFAULT_REVIEWER_SCHEMEにフォールバック）
  - getAvailableEngines()関数を実装（ドロップダウンメニュー用）
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

## Task 2: TOMLテンプレートファイル

- [x] 2.1 (P) Gemini CLI用document-review.tomlテンプレートを作成する
  - resources/templates/experimental/gemini/kiro/ディレクトリを作成
  - document-review.tomlをGemini CLI Custom Commands形式で作成
  - description、promptフィールドを定義
  - {{args}}でフィーチャー名を受け取り、@{path}でファイル内容を展開
  - 既存のdocument-review.mdと同等のレビュー機能を実現するプロンプトを記述
  - _Requirements: 2.1, 2.3, 2.4, 2.6_

- [x] 2.2 (P) document-review-reply.tomlテンプレートを作成する
  - reply用のTOMLテンプレートをresources/templates/experimental/gemini/kiro/に作成
  - レビュー指摘への回答分類機能（Fix Required、Accepted、Deferred、Needs Discussion）を提供
  - _Requirements: 2.2, 2.5, 2.6_

## Task 3: インストーラーサービス拡張

- [x] 3.1 ExperimentalToolsInstallerServiceにGeminiインストール機能を追加する
  - installGeminiDocumentReview()メソッドを実装
  - .gemini/commands/kiro/ディレクトリの自動作成処理を追加
  - document-review.tomlとdocument-review-reply.tomlの両方をコピー
  - 既存ファイル存在時の上書き制御（forceオプション対応）
  - テンプレートパス取得にresourcePathsを使用
  - checkGeminiDocumentReviewExists()メソッドを実装
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3.2 IPCハンドラとチャンネルを追加する
  - INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEWチャンネルを定義
  - CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTSチャンネルを定義
  - ハンドラでExperimentalToolsInstallerServiceの対応メソッドを呼び出し
  - _Requirements: 1.5, 1.6_

- [x] 3.3 「実験的ツール」メニューにGemini項目を追加する
  - menu.tsの実験的ツールサブメニューに「Gemini document-review をインストール」項目を追加
  - メニュークリック時にIPC経由でインストールを実行
  - 成功・失敗時の通知表示をnotificationStore経由で実装
  - _Requirements: 1.1, 1.7, 1.8_

## Task 4: SpecManagerService CLIプロバイダ拡張

- [x] 4.1 ReviewEngineRegistryを使用してCLI引数を構築する
  - Gemini CLI固有の引数配列を構築（--yoloフラグ、--output-format stream-json）
  - debatex固有の引数配列を構築（npx debatex sdd-document-review）
  - 各エンジンのbuildArgs関数を活用
  - _Requirements: 6.4, 6.5_

- [x] 4.2 executeDocumentReview()をscheme対応に拡張する
  - spec.jsonからdocumentReview.schemeを読み取り
  - scheme未設定時はclaude-codeをデフォルトとして扱う
  - ReviewEngineRegistryからエンジン設定を取得してCLIを起動
  - Claude CLI、Gemini CLI、debatex CLIの分岐実行
  - 各CLI未検出時（ENOENT）のエラーハンドリングと適切なメッセージ表示
  - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8_

## Task 5: DocumentReviewPanelにschemeタグUIを追加

- [x] 5.1 SchemeSelectorコンポーネントを作成する
  - ReviewEngineRegistryからエンジン一覧を取得してドロップダウンメニュー項目を生成
  - 現在のschemeを選択状態で表示
  - 選択時にonChangeコールバックを呼び出し
  - _Requirements: 5.1, 9.4_

- [x] 5.2 DocumentReviewPanelにschemeタグとセレクタを統合する
  - ヘッダー領域のタイトル右隣にschemeタグを表示
  - Claude/Gemini/Debatexラベルをschemeに応じて切り替え
  - タグの色をscheme別に区別（Claude=青系、Gemini=紫系、Debatex=緑系）
  - scheme未設定時はClaudeタグをデフォルト表示
  - タグクリックでSchemeSelectorドロップダウンを表示
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5.3 scheme切り替えとspec.json更新を実装する
  - ドロップダウン選択時にschemeを切り替え
  - 楽観的更新でローカルstateを即座に更新
  - IPC（UPDATE_SPEC_JSON）経由でspec.jsonを更新
  - エラー時のUIロールバックとエラー通知表示
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

## Task 6: SpecsWatcherServiceとstore同期

- [x] 6. SpecsWatcherServiceでscheme変更を検出しUIに反映する
  - spec.json監視ロジックでdocumentReview.scheme変更を検出
  - workflowStoreまたはspecStore経由でUIにscheme値を通知
  - 複数クライアント間でのリアルタイム同期を維持
  - _Requirements: 3.4, 3.5_

## Task 7: Remote UIでのscheme表示・切り替え

- [x] 7.1 (P) SpecDetailViewにschemeタグとセレクタを追加する
  - Remote UIのヘッダー領域にschemeタグコンポーネントを追加
  - SchemeSelectorコンポーネントを再利用
  - Claude/Gemini/Debatexラベルと色分けをDocumentReviewPanelと同様に実装
  - _Requirements: 7.1_

- [x] 7.2 (P) Remote UIでのscheme切り替えを実装する
  - タグクリック時にWebSocketApiClient経由でupdateSpecJsonを呼び出し
  - 切り替え結果をリアルタイムで他クライアントに同期
  - _Requirements: 7.2, 7.3, 7.4_

## Task 8: 自動実行時のscheme対応

- [x] 8. AutoExecutionCoordinatorでscheme設定を尊重する
  - 自動実行時にspec.jsonのscheme設定を読み取り
  - executeDocumentReviewにscheme値を渡す
  - 並列実行時に各specの個別scheme設定が尊重されることを確認
  - scheme変更が他specに影響しないことを検証
  - _Requirements: 8.1, 8.2, 8.3_

## Task 9: テスト

- [x] 9.1 (P) ReviewEngineRegistryのユニットテストを作成する
  - getReviewEngine()の各schemeに対する正しいconfig取得をテスト
  - 未知schemeのフォールバック動作をテスト
  - getAvailableEngines()の全エンジン一覧取得をテスト
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 9.2 (P) SchemeSelectorコンポーネントのテストを作成する
  - ドロップダウン表示・選択・色分岐をテスト
  - scheme切り替え→onChangeコールバック呼び出しをテスト
  - _Requirements: 5.1, 9.4_

- [x] 9.3 (P) ExperimentalToolsInstallerServiceのテストを追加する
  - installGeminiDocumentReview()のテンプレートコピー、ディレクトリ作成、上書き制御をテスト
  - checkGeminiDocumentReviewExists()の動作確認
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 9.4 (P) schemeタグUIと切り替えの統合テストを作成する
  - schemeタグコンポーネントの表示・クリック・色分岐をテスト
  - scheme切り替え→spec.json更新→UI反映の一連のフローをテスト
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.2, 5.3_

- [x] 9.5 E2Eテストでメニューインストールとscheme切り替えを検証する
  - 「実験的ツール」メニューからのGeminiコマンドインストールをテスト
  - DocumentReviewPanelでのschemeドロップダウン選択をテスト
  - scheme: gemini-cli、scheme: debatexでのドキュメントレビュー実行をテスト
  - 受け入れ基準: 1.1, 1.7, 1.8, 5.1, 5.3, 6.1, 6.2, 6.3
  - _Requirements: 1.1, 1.7, 1.8, 5.1, 5.3, 6.1, 6.2, 6.3_

---

## Inspection Fixes

### Round 1 (2026-01-17)

- [x] 10.1 SpecDetailViewにSchemeSelector UIを実装する
  - 関連: Task 7.1, Requirements 7.1
  - Remote UI SpecDetailView.tsxのヘッダー領域にSchemeSelectorコンポーネントを追加
  - specDetailからdocumentReview.schemeを取得して表示
  - 既存のDocumentReviewPanel (shared) と同様のUI/UXを実現

- [x] 10.2 Remote UIでのscheme切り替え機能を実装する
  - 関連: Task 7.2, Requirements 7.2, 7.3, 7.4
  - SchemeSelector選択時にapiClient.saveFile()経由でspec.jsonを更新
  - 楽観的更新パターンを適用
  - エラー時のロールバック処理を実装
  - SpecsWatcherService経由で他クライアントへ同期

- [x] 10.3 SpecDetailViewのテストを更新する
  - 関連: Task 10.1, 10.2
  - scheme表示のテストケースを追加
  - scheme切り替え→saveFile呼び出しのテストを追加

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | 実験的ツールメニューにGemini項目追加 | 3.3 | Feature |
| 1.2 | document-review.tomlインストール | 3.1 | Feature |
| 1.3 | document-review-reply.tomlインストール | 3.1 | Feature |
| 1.4 | .gemini/commands/kiro/ディレクトリ自動作成 | 3.1 | Infrastructure |
| 1.5 | 既存ファイル上書き確認ダイアログ | 3.1, 3.2 | Feature |
| 1.6 | Forceオプション | 3.1, 3.2 | Feature |
| 1.7 | インストール成功通知 | 3.3 | Feature |
| 1.8 | インストール失敗通知 | 3.3 | Feature |
| 2.1 | document-review.tomlテンプレート存在 | 2.1 | Infrastructure |
| 2.2 | document-review-reply.tomlテンプレート存在 | 2.2 | Infrastructure |
| 2.3 | TOML形式準拠 | 2.1, 2.2 | Infrastructure |
| 2.4 | {{args}}でフィーチャー名受け取り | 2.1 | Infrastructure |
| 2.5 | document-review-reply.toml形式 | 2.2 | Infrastructure |
| 2.6 | 既存document-review.mdと同等機能 | 2.1, 2.2 | Infrastructure |
| 3.1 | spec.jsonにschemeフィールド追加 | 1.1 | Infrastructure |
| 3.2 | scheme値は'claude-code'、'gemini-cli'、'debatex' | 1.1 | Infrastructure |
| 3.3 | schemeデフォルト値'claude-code' | 1.1 | Infrastructure |
| 3.4 | SpecsWatcherServiceでscheme読み込み | 6 | Feature |
| 3.5 | scheme変更のUI反映 | 6 | Feature |
| 4.1 | schemeタグ表示 | 5.2 | Feature |
| 4.2 | Claude/Gemini/Debatexラベル表示 | 5.2 | Feature |
| 4.3 | タグ色のscheme別区別 | 5.2 | Feature |
| 4.4 | デフォルトClaudeタグ表示 | 5.2 | Feature |
| 5.1 | タグクリックでドロップダウン表示・エンジン選択 | 5.1, 5.2 | Feature |
| 5.2 | 切り替え後spec.json即時更新 | 5.3 | Feature |
| 5.3 | 切り替え後タグ表示即時更新 | 5.3 | Feature |
| 5.4 | エラー時通知とUI復元 | 5.3 | Feature |
| 5.5 | IPC経由でmainプロセスに依頼 | 5.3 | Feature |
| 6.1 | scheme: claude-codeでClaude CLI実行 | 4.2 | Feature |
| 6.2 | scheme: gemini-cliでGemini CLI実行 | 4.2 | Feature |
| 6.3 | scheme: debatexでdebatex CLI実行 | 4.2 | Feature |
| 6.4 | Gemini CLI --yoloフラグ付与 | 4.1 | Feature |
| 6.5 | Gemini CLI --output-format stream-json | 4.1 | Feature |
| 6.6 | Gemini CLI JSONL出力パース | 4.2 | Feature |
| 6.7 | 各CLI未検出時エラー表示 | 4.2 | Feature |
| 6.8 | scheme未設定時Claude Codeデフォルト | 4.2 | Feature |
| 7.1 | Remote UIでschemeタグ表示 | 7.1, 10.1 | Feature |
| 7.2 | Remote UIでタグクリック切り替え | 7.2, 10.2 | Feature |
| 7.3 | API経由でメインプロセスに送信 | 7.2, 10.2 | Feature |
| 7.4 | 他クライアントへのリアルタイム同期 | 7.2, 10.2 | Feature |
| 8.1 | 自動実行時scheme設定尊重 | 8 | Feature |
| 8.2 | 並列実行時各spec個別scheme尊重 | 8 | Feature |
| 8.3 | scheme変更は他specに影響しない | 8 | Feature |
| 9.1 | 3エンジン定義 | 1.2 | Infrastructure |
| 9.2 | エンジン設定の集約 | 1.2 | Infrastructure |
| 9.3 | 新規エンジン追加の最小変更 | 1.2 | Infrastructure |
| 9.4 | 動的メニュー生成 | 5.1 | Feature |
| 9.5 | 未知scheme時のフォールバック | 1.2 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 5.1), not container tasks (e.g., 5)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
