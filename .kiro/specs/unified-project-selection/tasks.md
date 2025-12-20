# Implementation Plan

## Tasks

- [x] 1. selectProject IPCハンドラーの実装

- [x] 1.1 (P) IPCチャンネルとハンドラーの基盤を作成
  - SELECT_PROJECT チャンネルを定義
  - selectProject ハンドラーのスケルトンを作成
  - 戻り値の型定義（SelectProjectResult, SelectProjectError）を追加
  - _Requirements: 1.1_

- [x] 1.2 プロジェクトパス検証機能を実装
  - ディレクトリの存在確認を行う
  - 指定パスがディレクトリかどうかを検証する
  - アクセス権限（読み取り）を確認する
  - .kiro ディレクトリの有無を確認し、警告情報を含める（エラーにはしない）
  - 各検証失敗時に適切なエラー型を返却する
  - _Requirements: 1.2, 1.6, 5.1, 5.2, 5.3, 5.4_

- [x] 1.3 プロジェクト初期化処理を実装
  - configStore の projectPath を更新する
  - specs データを読み込む
  - bugs データを読み込む
  - ウィンドウタイトルにプロジェクトパスを反映する
  - _Requirements: 1.3, 1.5_

- [x] 1.4 ファイルウォッチャーの初期化を実装
  - 既存のウォッチャーがあれば停止する
  - specs 用ウォッチャーを開始する
  - bugs 用ウォッチャーを開始する
  - エージェント記録用ウォッチャーを開始する
  - _Requirements: 1.4, 6.1_

- [x] 1.5 排他制御と状態一貫性を実装
  - 選択操作のロック機構を導入する
  - 同時に複数の選択操作が実行されないようにする
  - ロック取得失敗時は SELECTION_IN_PROGRESS エラーを返す
  - 既存プロジェクトデータのクリア処理を追加
  - エラー発生時に前の状態を維持するロールバック処理を追加
  - 操作完了後にロックを確実に解放する
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 2. preload API と renderer 側ストアの拡張

- [x] 2.1 (P) preload に selectProject API を追加
  - contextBridge 経由で selectProject を公開する
  - 型定義（ElectronAPI 拡張）を追加する
  - setProjectPath を deprecated としてマークし、selectProject のラッパーに変更する
  - _Requirements: 4.1, 4.3, 4.4_

- [x] 2.2 projectStore に統一された selectProject メソッドを実装
  - 新しい selectProject IPC を呼び出すメソッドを作成する
  - 選択中状態を isLoading で管理する
  - IPC からの結果で currentProject と kiroValidation を更新する
  - エラー発生時に error 状態を設定する
  - recentProjects への追加を行う
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.3 specStore と bugStore に外部設定メソッドを追加
  - specStore に setSpecs メソッドを追加（IPC 結果から直接設定）
  - bugStore に setBugs メソッドを追加（IPC 結果から直接設定）
  - specStore.loadSpecs から setProjectPath 呼び出しを削除する
  - _Requirements: 3.1, 3.2_

- [x] 3. 既存経路の統合

- [x] 3.1 メニューからのプロジェクト選択を統合
  - App.tsx のメニューイベントハンドラーを更新する
  - 統一された projectStore.selectProject を呼び出す
  - _Requirements: 2.2_

- [x] 3.2 コマンドライン引数からの起動を統合
  - main/index.ts の loadInitialProject を更新する
  - 統一された selectProject ハンドラーを使用する
  - _Requirements: 2.1_

- [x] 3.3 既存 IPC 経由の選択を統合
  - setProjectPath を selectProject へのエイリアスまたはラッパーに変更する
  - 後方互換性を維持する
  - _Requirements: 2.3, 2.4_

- [x] 4. UI 更新の実装

- [x] 4.1 サイドバーの自動更新を実装
  - projectStore.selectProject の成功時に specStore.setSpecs を呼び出す
  - projectStore.selectProject の成功時に bugStore.setBugs を呼び出す
  - Spec 一覧と Bug 一覧が自動的に再レンダリングされることを確認する
  - _Requirements: 3.1, 3.2_

- [x] 4.2 ウィンドウタイトルとステータスバーの更新を実装
  - ウィンドウタイトルにプロジェクトパスを表示する
  - ステータスバーにプロジェクト情報（パス、.kiro 有無）を表示する
  - _Requirements: 3.3, 3.4_

- [x] 5. テストの実装

- [x] 5.1 (P) selectProject ハンドラーのユニットテストを作成
  - パス検証（存在、ディレクトリ、権限）のテストケース
  - 正常系（全初期化完了）のテストケース
  - 各エラータイプのテストケース
  - 排他制御（同時選択ブロック、ロック解放）のテストケース
  - _Requirements: 1.1, 1.2, 1.6, 5.1, 5.2, 5.3, 6.4_

- [x] 5.2 (P) projectStore.selectProject のユニットテストを作成
  - IPC 呼び出しのテストケース
  - 状態更新のテストケース
  - エラーハンドリングのテストケース
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5.3 統合テストを作成
  - handlers.ts と FileService の連携テスト
  - handlers.ts と WatcherServices の連携テスト
  - projectStore と specStore/bugStore の連携テスト
  - _Requirements: 1.4, 1.5, 3.1, 3.2_

- [x] 5.4 E2E テストを作成
  - window.electronAPI.selectProject 経由でのプログラム的選択をテストする
  - MCP 経由での操作が通常操作と同様に動作することを確認する
  - 無効なパス選択時のエラー表示を確認する
  - UI 更新（サイドバー、ウィンドウタイトル、ステータス）を確認する
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. クリーンアップと最終検証

- [x] 6.1 不要コードの削除と整理
  - 重複していた古いプロジェクト選択ロジックを削除する
  - 使用されなくなった関数や変数を削除する
  - コードの整理とリファクタリングを行う
  - _Requirements: 2.4_

- [x] 6.2 全経路からのプロジェクト選択を検証
  - コマンドライン引数での起動を手動で確認する
  - メニューからのプロジェクト選択を手動で確認する
  - IPC 経由（E2E テスト）でのプロジェクト選択を確認する
  - すべての経路で一貫した動作をすることを確認する
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

- [x] 6.3 ドキュメント更新
  - API 変更（setProjectPath → selectProject）の記録
  - 開発者向けノートの更新（preload API の使用方法）
  - setProjectPath の deprecated 情報を明記
  - _Requirements: 2.4_
