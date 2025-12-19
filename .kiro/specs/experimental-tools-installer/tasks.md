# Implementation Plan

## Tasks

- [x] 1. テンプレートファイルのバンドル設定
- [x] 1.1 (P) テンプレートファイルの作成
  - Planコマンド、Commitコマンド、Debugエージェント、CLAUDE.md用デバッグセクションの各テンプレートファイルを作成
  - `electron-sdd-manager/resources/templates/` 配下に `commands/plan.md`, `commands/commit.md`, `agents/debug.md`, `claude-md-snippets/debug-section.md` を配置
  - 各テンプレートはプロジェクトにインストールされる実際のコマンド/エージェント定義を含む
  - _Requirements: 5.1_

- [x] 1.2 リソースパス解決の実装
  - resourcePaths.tsにテンプレートディレクトリへのパス解決関数を追加
  - 開発時とビルド後の両方でテンプレートにアクセスできるよう考慮
  - 各ツールタイプに応じたテンプレートパスを返すヘルパーを実装
  - _Requirements: 5.2, 5.3_

- [x] 2. ExperimentalToolsInstallerServiceの実装
- [x] 2.1 サービスの基盤実装
  - インストールオプション、結果、エラー型の定義
  - ディレクトリ存在確認と自動作成機能の実装
  - ターゲットファイルの存在チェック機能の実装
  - _Requirements: 7.4_

- [x] 2.2 Planコマンドインストール機能の実装
  - テンプレートから`.claude/commands/plan.md`へのファイルコピー処理
  - 既存ファイル存在時の上書き確認用フラグのサポート
  - 成功/失敗の結果オブジェクトを返却
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.3 Commitコマンドインストール機能の実装
  - テンプレートから`.claude/commands/commit.md`へのファイルコピー処理
  - Planコマンドと同様の上書き確認・結果返却パターンを踏襲
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.4 エラーハンドリングの統一実装
  - テンプレート読み込み失敗、書き込み失敗、権限エラー、ディレクトリ作成失敗の各エラー型を処理
  - ユーザーに問題特定と対処方法を示すエラー詳細を提供
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 3. ClaudeCLIWrapperの実装
- [x] 3.1 Claude CLI存在確認機能の実装
  - claudeコマンドがPATHに存在するかを確認
  - CLI不在時のエラー型を定義
  - _Requirements: 7.3_

- [x] 3.2 セマンティックマージ機能の実装
  - デバッグセクションテンプレートをCLAUDE.mdにマージするプロンプトの構築
  - child_process.spawn経由でのClaude CLI呼び出し
  - タイムアウト設定（30秒）とエラーハンドリング
  - CLAUDE.md新規作成とマージ両方のケースを処理
  - _Requirements: 3.4, 3.5_

- [x] 4. Debugエージェントインストール機能の実装
  - テンプレートから`.claude/agents/debug.md`へのファイルコピー処理
  - コピー完了後にClaudeCLIWrapperを使用してCLAUDE.mdへのセマンティックマージを実行
  - Claude CLI不在時のフォールバック動作: debug-section.mdの内容をクリップボードにコピーし、手動でCLAUDE.mdに追加するよう案内するダイアログを表示する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.3_

- [x] 5. IPC層の実装
- [x] 5.1 (P) IPCチャンネルの定義
  - channels.tsに実験的ツールインストール用チャンネルを追加
  - メニューイベント用チャンネルを追加
  - _Requirements: 1.1_

- [x] 5.2 IPCハンドラの実装
  - 各インストールコマンドのハンドラをhandlers.tsに追加
  - ツール存在確認ハンドラを追加
  - サービス層への適切な委譲とエラー処理
  - _Requirements: 2.1, 3.1, 4.1, 7.1, 7.2, 7.3_

- [x] 5.3 Preload APIの公開
  - preload/index.tsにインストールAPI関数を追加
  - メニューイベントリスナー登録関数を追加
  - 型定義の更新
  - _Requirements: 1.1_

- [x] 6. メニュー拡張の実装
  - ツールメニューに「実験的ツール」サブメニューを追加
  - 3つのインストールメニュー項目（Plan、Debug、Commit）を追加
  - 各メニュー項目に「(実験的)」表記を含める
  - プロジェクト未選択時のメニュー無効化
  - メニュークリック時のIPCイベント送信
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Renderer側のインストールフロー実装
  - メニューイベント受信時のハンドラを実装
  - ターゲットファイル存在時の上書き確認ダイアログ表示
  - インストール成功/失敗時のメッセージ表示
  - ユーザーがキャンセル選択時のインストール中止処理
  - _Requirements: 2.2, 2.3, 2.4, 3.3, 3.6, 4.2, 4.3, 4.4_

- [x] 8. steering-debugスラッシュコマンドの作成
  - `.claude/commands/kiro/steering-debug.md`を作成
  - プロジェクト情報収集ロジック（起動方法、MCP設定、E2Eコマンド、ログ参照方法、トラブルシューティングノウハウ）を定義
  - `.kiro/steering/debugging.md`生成フォーマットを定義
  - 不明点がある場合のユーザーへの質問フローを定義
  - 既存ファイル上書き確認の指示を含める
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. 統合テストの実装
- [x] 9.1 (P) ExperimentalToolsInstallerServiceのユニットテスト
  - 各インストール機能のテスト（正常系、エラー系）
  - ファイル存在確認のテスト
  - ディレクトリ自動作成のテスト
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.4_

- [x] 9.2 (P) ClaudeCLIWrapperのユニットテスト
  - CLI存在確認のテスト
  - セマンティックマージのテスト（正常系、タイムアウト、エラー）
  - _Requirements: 3.4, 3.5, 7.3_

- [x] 9.3 E2Eテストの実装
  - メニュークリックから成功メッセージ表示までのフロー確認
  - 上書き確認ダイアログのキャンセル動作確認
  - プロジェクト未選択時のメニュー無効化確認
  - _Requirements: 1.3, 2.2, 2.3, 2.4, 3.3, 4.2, 4.3, 4.4_

- [x] 10. ドキュメント更新
  - electron-sdd-managerのREADME.mdまたはユーザーガイドに実験的ツールメニューの説明を追記
  - `/kiro:steering-debug`コマンドの使い方を文書化
  - 各実験的ツール（Plan、Debug、Commit）の概要と用途を記載
