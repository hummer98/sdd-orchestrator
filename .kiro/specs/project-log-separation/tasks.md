# Implementation Plan

## Tasks

- [x] 1. ProjectLoggerコア実装
- [x] 1.1 (P) ログエントリ型と書式設定を実装する
  - LogEntry型にprojectIdフィールドを追加する
  - formatMessage関数でprojectIdを含むログフォーマットを生成する
  - プロジェクト未選択時は`global`、選択時はプロジェクトパスを識別子として使用する
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 1.2 プロジェクトログストリーム管理を実装する
  - プロジェクトパスをキーとして一意のログファイル名を生成する
  - `{projectPath}/.kiro/logs/main.log`にログファイルを作成する
  - ログディレクトリが存在しない場合は自動作成する
  - 本番環境と開発環境で同一のパス規則を適用する
  - _Requirements: 1.3, 2.1, 2.2, 2.3_

- [x] 1.3 ProjectLoggerServiceインターフェースを実装する
  - setCurrentProject(projectPath)でプロジェクト切り替えを処理する
  - プロジェクト切り替え時に既存ストリームをクローズし新規ストリームを作成する
  - info/debug/warn/errorメソッドで適切なストリームに書き込む
  - プロジェクト関連ログはプロジェクトログとグローバルログの両方に記録する
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 1.4 グローバルログストリームを維持する
  - プロジェクト未選択時は全ログをグローバルログに記録する
  - アプリケーション起動・終了ログをグローバルログに記録する
  - プロジェクトログストリームエラー時はグローバルログにフォールバックする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4_

- [x] 2. LogRotationManager実装
- [x] 2.1 (P) ログファイルサイズ監視とローテーションを実装する
  - ログファイルサイズが10MBを超えた場合に新規ファイルを作成する
  - ローテーション後のファイル名は`main.YYYY-MM-DD.N.log`形式とする
  - ローテーション失敗時はエラーログを記録し現行ファイルを継続する
  - _Requirements: 5.2_

- [x] 2.2 (P) 日付単位ローテーションを実装する
  - 日付変更を検出してログファイルをローテーションする
  - 新しい日付のログは新規ファイルに記録する
  - _Requirements: 5.1_

- [x] 2.3 古いログファイルの自動削除を実装する
  - 30日以上経過したログファイルを自動削除する
  - 削除失敗時は警告ログを記録し次回実行時に再試行する
  - _Requirements: 5.3_

- [x] 3. IPC/UIアクセス実装
- [x] 3.1 ログパス取得IPCハンドラを実装する
  - GET_PROJECT_LOG_PATHチャンネルでプロジェクトログパスを返す
  - プロジェクト未選択時はnullを返す
  - preload経由でレンダラープロセスに公開する
  - `preload/index.ts`に`getProjectLogPath`、`openLogInBrowser` APIを追加する
  - 型定義（`ElectronAPI`）を更新する
  - _Requirements: 6.1, 6.3_

- [x] 3.2 ファイルブラウザでログを開く機能を実装する
  - OPEN_LOG_IN_BROWSERチャンネルでシステムファイルブラウザを起動する
  - shell.openPathでログディレクトリを開く
  - ファイルが存在しない場合はエラーを返す
  - _Requirements: 6.2_

- [x] 4. 既存ロガーの移行と統合
- [x] 4.1 既存logger.tsをProjectLoggerに置き換える
  - 移行前に既存のlogger呼び出し箇所（handlers.ts, services/*.ts等）を洗い出す
  - API互換性が維持されることを確認する
  - 既存のloggerシングルトンエクスポートをProjectLoggerインスタンスに変更する
  - 既存のinfo/debug/warn/error API互換性を維持する
  - プロジェクト管理（handlers.ts）との連携でsetCurrentProjectを呼び出す
  - _Requirements: 1.1, 1.2_

- [x] 4.2 プロジェクト選択/切替時のログストリーム連携を実装する
  - selectProjectハンドラでProjectLogger.setCurrentProjectを呼び出す
  - プロジェクトクローズ時にログストリームをクローズする
  - _Requirements: 1.1, 1.2_

- [x] 5. テスト実装
- [x] 5.1 (P) ProjectLoggerのユニットテストを作成する
  - setCurrentProjectのストリーム切り替え動作をテストする
  - formatMessageのprojectId付きフォーマットをテストする
  - フォールバック処理をテストする
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3_

- [x] 5.2 (P) LogRotationManagerのユニットテストを作成する
  - サイズ閾値判定をテストする
  - 日付変更検出をテストする
  - 古いファイル削除対象の判定をテストする
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5.3 統合テストを作成する
  - プロジェクト選択からログ書き込み、ファイル確認までの一連フローをテストする
  - プロジェクト切り替え時の両ファイルへの書き込みをテストする
  - _Requirements: 1.1, 1.2, 1.4, 2.1_

- [x] 5.4 IPC経由でのログパス取得テストを作成する
  - GET_PROJECT_LOG_PATH IPCの動作をテストする
  - プロジェクト未選択時のnull応答をテストする
  - _Requirements: 6.1, 6.3_

- [x] 6. 不足仕様の実装
- [x] 6.1 (P) ElectronAPI型定義を更新する
  - `electron.d.ts`に`getProjectLogPath`メソッドの型定義を追加する
  - `electron.d.ts`に`openLogInBrowser`メソッドの型定義を追加する
  - preload/index.tsで公開されているAPIと1:1対応を確認する
  - _Requirements: 6.4_

- [x] 6.2 (P) LogRotationManagerをProjectLoggerに統合する
  - ProjectLoggerのコンストラクタでLogRotationManagerをインスタンス化する
  - writeメソッド内でcheckAndRotateを呼び出す
  - ローテーション必要時にストリームを再作成する
  - プロジェクト切り替え時に古いログファイルのクリーンアップを実行する
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6.3 LogRotationManager統合テストを更新する
  - ProjectLoggerからLogRotationManagerが呼び出されることをテストする
  - ローテーション発生時のストリーム再作成をテストする
  - _Requirements: 7.2, 7.3_
