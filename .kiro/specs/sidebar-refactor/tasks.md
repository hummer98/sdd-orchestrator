# Implementation Plan

## Tasks

- [x] 1. メニューバーによるプロジェクト選択機能の実装
- [x] 1.1 (P) MenuBuilderサービスの作成
  - アプリケーションメニュー構築ロジックの実装
  - 「ファイル」メニューに「プロジェクトを開く」オプションを追加
  - 最近のプロジェクト一覧をサブメニューとして表示
  - メニュー項目クリック時のダイアログ表示処理
  - _Requirements: 1.1, 1.2_

- [x] 1.2 ウィンドウタイトルへのプロジェクト名表示
  - 現在選択中のプロジェクト名をウィンドウタイトルに反映
  - プロジェクト未選択時はデフォルトタイトルを表示
  - プロジェクト切り替え時のタイトル自動更新
  - 1.1のMenuBuilderと連携してタイトル更新を実行
  - _Requirements: 1.3_

- [x] 1.3 サイドバーからProjectSelectorコンポーネントを削除
  - App.tsxからProjectSelectorの参照を削除
  - 関連する状態管理コードのクリーンアップ
  - 既存のディレクトリ検証・インストール機能はErrorBannerに移行予定
  - _Requirements: 1.4_

- [x] 2. ErrorBannerコンポーネントの実装
- [x] 2.1 (P) 条件付きエラーバナー表示機能
  - .kiro、specs、steeringディレクトリがすべて存在する場合は非表示
  - いずれかの必須ディレクトリが不足している場合にバナー表示
  - 不足しているディレクトリ名を一覧で表示
  - ProjectStoreのkiroValidation状態を参照
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2.2 エラーバナーの展開・折りたたみ機能
  - バナークリックで詳細オプションを展開表示
  - .kiro初期化ボタンを展開領域に配置
  - 展開/折りたたみ状態の管理
  - _Requirements: 3.4_

- [x] 2.3 spec-managerファイルのインストールオプション
  - spec-managerファイル不足時にインストールボタンを表示
  - 既存のSpecManagerFilesSectionの機能を移植
  - インストール実行中のローディング表示
  - _Requirements: 3.5_

- [x] 3. SpecListHeaderコンポーネントの実装
- [x] 3.1 (P) ヘッダー部分の基本構造
  - 仕様一覧のヘッダーコンポーネントを新規作成
  - 仕様件数の表示
  - 既存SpecListのヘッダー部分を分離して実装
  - _Requirements: 6.5_

- [x] 3.2 新規仕様作成ボタンのアイコン化
  - +アイコンボタンをヘッダーに配置
  - ホバー時に「新規仕様を作成」ツールチップを表示
  - クリック時にCreateSpecDialogを表示
  - プロジェクト未選択時はボタンを無効化（disabled状態）
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. GlobalAgentPanelコンポーネントの実装
- [x] 4.1 (P) AgentStoreへのグローバルエージェント取得機能追加
  - getGlobalAgents()ヘルパーメソッドを追加
  - specIdが空文字列、null、undefinedのエージェントをフィルタリング
  - 既存のAgentStoreの構造を維持しつつ拡張
  - _Requirements: 4.2_

- [x] 4.2 グローバルエージェント一覧表示
  - サイドバー下部にグローバルAgent領域を配置
  - グローバルエージェント0件時は折りたたみまたは非表示
  - 各エージェントの実行状態をアイコンで表示（running/stopped/error）
  - 既存のAgentListPanelのSTATUS_CONFIGを再利用
  - _Requirements: 4.1, 4.3, 4.5_

- [x] 4.3 グローバルエージェントの操作機能
  - エージェントクリック時にログパネルを表示
  - リアルタイムでUI表示を更新（状態変化時）
  - AgentStore.selectAgentと連携
  - _Requirements: 4.4, 4.6_

- [x] 5. CreateSpecDialogの改修
- [x] 5.1 (P) ダイアログUIの簡略化
  - 仕様名（name）入力フィールドを削除
  - 説明（description）入力フィールドのみ表示
  - バリデーション（10文字以上）の維持
  - _Requirements: 5.1, 5.2_

- [x] 5.2 spec-manager:init連携の実装
  - [x] 5.2.1 IPC_CHANNELSにEXECUTE_SPEC_INITを追加 (`src/main/ipc/channels.ts`)
  - [x] 5.2.2 preload/index.tsにexecuteSpecInit関数を追加
  - [x] 5.2.3 handlers.tsにハンドラを実装
    - specId=''でグローバルエージェントとして起動
    - コマンド: `claude -p /spec-manager:init "{description}"`
    - 完了を待たずにagentIdを返す（非同期実行）
  - [x] 5.2.4 CreateSpecDialogの修正
    - executeSpecInit呼び出し後、ダイアログを閉じてグローバルエージェントパネルに遷移
    - 完了待ちではなく、起動確認のみでダイアログを閉じる
  - [x] 5.2.5 CreateSpecDialogのUI修正
    - プレースホルダの色を修正（黒色→グレー）`placeholder:text-gray-400`
    - 10文字バリデーションを削除（説明が空でなければOK）
    - バリデーションメッセージを削除
  - _Requirements: 5.3_
  - **テストファイル**: `src/renderer/components/CreateSpecDialog.test.tsx` (17件パス)

- [x] 5.3 ダイアログの状態管理とフィードバック
  - 実行中のローディング状態表示
  - 完了時に仕様一覧を更新しダイアログを閉じる
  - エラー発生時にダイアログ内にエラーメッセージ表示
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 6. サイドバーレイアウトの統合
- [x] 6.1 App.tsxのサイドバー構成変更
  - サイドバーを「エラーバナー（存在時のみ）」「SpecListHeader」「仕様一覧」「GlobalAgentPanel」の順に構成
  - 各コンポーネントを正しい順序で配置
  - _Requirements: 6.1_

- [x] 6.2 スクロール領域の設定
  - 仕様一覧をスクロール可能な領域として実装
  - GlobalAgentPanelをサイドバー下部に固定
  - 高さ不足時は仕様一覧のみスクロール、GlobalAgentPanelは常時表示
  - flexboxまたはgridレイアウトで領域を分割
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 7. 統合テスト
- [x] 7.1 メニューバーからのプロジェクト選択フローのテスト
  - メニュー操作からプロジェクト選択、仕様一覧更新までの一連の動作確認
  - ウィンドウタイトル更新の確認
  - _Requirements: 1.1, 1.2, 1.3_
  - **テストファイル**: `src/main/menu.test.ts` (8件パス)

- [x] 7.2 新規仕様作成フローのテスト
  - +ボタンクリックからCreateSpecDialog表示、spec-manager:init実行、仕様一覧更新までの動作確認
  - エラーハンドリングの確認
  - _Requirements: 2.1, 2.2, 5.3, 5.5, 5.6_
  - **テストファイル**: `src/renderer/components/CreateSpecDialog.test.tsx` (13件パス), `src/renderer/components/SpecListHeader.test.tsx` (12件パス)

- [x] 7.3 ErrorBannerとGlobalAgentPanelの動作テスト
  - ディレクトリ不足時のエラーバナー表示確認
  - グローバルエージェントの一覧表示とログパネル連携の確認
  - _Requirements: 3.1, 3.2, 4.1, 4.4_
  - **テストファイル**: `src/renderer/components/ErrorBanner.test.tsx` (15件パス), `src/renderer/components/GlobalAgentPanel.test.tsx` (14件パス), `src/renderer/stores/agentStore.test.ts` (getGlobalAgents: 4件パス)
