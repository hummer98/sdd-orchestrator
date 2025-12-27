# Implementation Plan

## Tasks

- [x] 1. editorStoreに検索状態を追加
  - 検索バー表示状態、検索クエリ、マッチ結果、アクティブマッチインデックスの状態を追加
  - 大文字・小文字区別フラグを追加
  - ナビゲーションアクション（次へ、前へ、クリア）を実装
  - 状態の一貫性保持（activeMatchIndexはmatches.length内）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3_

- [x] 2. 検索ロジックのカスタムフック実装
- [x] 2.1 (P) useTextSearchフックの実装
  - コンテンツと検索クエリからマッチ位置を計算するロジックを実装
  - 大文字・小文字区別オプションに応じた検索処理
  - 空クエリ時は空配列を返す処理
  - useMemoによるマッチ計算のメモ化でパフォーマンス最適化
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3_

- [x] 2.2 (P) useSearchKeyboardフックの実装
  - Ctrl+F/Cmd+Fで検索バー表示をトグルする処理
  - Escapeキーで検索バーを非表示にする処理
  - Enter/Shift+Enterでマッチ間を移動する処理
  - プラットフォーム判定（macOS/Windows）によるキー処理
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 3. 検索バーUIコンポーネントの実装
  - 検索入力フィールドとリアルタイム反映
  - 次へ/前へナビゲーションボタン
  - 閉じるボタン（×アイコン）
  - マッチ件数表示（「N件中M件目」形式）
  - 大文字・小文字区別オプションのトグルボタン
  - 表示時に検索入力フィールドへ自動フォーカス
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 3.1, 3.2, 5.1_

- [x] 4. ハイライト表示の実装
- [x] 4.1 編集モード用SearchHighlightLayerの実装
  - textareaの上にオーバーレイを配置してハイライト表示
  - マッチ箇所を背景色で強調表示
  - アクティブマッチを他と異なる色で表示
  - スクロール同期によるオーバーレイ位置調整
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 4.2 プレビューモード用PreviewHighlightLayerの実装
  - CSS Custom Highlight APIを使用したDOMハイライト
  - レンダリング後のテキストノードに対するRange設定
  - アクティブマッチの色分け
  - ブラウザ非サポート時のフォールバック処理
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. ArtifactEditorへの検索機能統合
  - SearchBarコンポーネントをタブバー下に配置
  - useSearchKeyboardフックをArtifactEditorにバインド
  - 検索ハイライトレイヤーをMDEditorに統合
  - 編集モード/プレビューモードに応じたハイライトレイヤー切り替え
  - マッチ箇所へのスクロール処理
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.3, 4.4_

- [x] 6. 検索機能のテスト実装
- [x] 6.1 (P) ユニットテストの実装
  - useTextSearchのマッチ計算ロジックをテスト
  - useSearchKeyboardのキーボードイベント処理をテスト
  - editorStore検索拡張の状態更新とナビゲーションをテスト
  - 境界値テスト（空クエリ、マッチなし、大量マッチ）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3, 3.4_

- [x] 6.2 統合テストの実装
  - SearchBar + useTextSearchの入力からマッチ表示までのフロー
  - SearchHighlightLayer + editorStoreのハイライト表示・更新
  - PreviewHighlightLayerのCSS.highlightsによるハイライト
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3_

- [x] 6.3 E2Eテストの実装
  - Ctrl+F/Cmd+Fによる検索バー表示・非表示のテスト
  - 検索語句入力とリアルタイムマッチ表示のテスト
  - 次へ/前へナビゲーションとスクロール動作のテスト
  - 編集モード・プレビューモードでのハイライト確認テスト
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.5, 4.1, 4.3_

- [x] 6.4 パフォーマンステストの実装
  - 大規模ドキュメント（10,000行）での検索レスポンス測定
  - 大量マッチ（1,000件以上）時のUI応答性確認
  - 連続入力時のデバウンス動作確認
  - _Requirements: 5.2, 5.3_

## 検証後の修正タスク

- [x] 7. ハイライトレイヤーのArtifactEditor統合
  - ArtifactEditor.tsxにSearchHighlightLayerをインポート
  - 編集モード時にSearchHighlightLayerを描画（textareaのオーバーレイとして配置）
  - ArtifactEditor.tsxにPreviewHighlightLayerをインポート
  - プレビューモード時にPreviewHighlightLayerを描画
  - editorStoreからmatches, activeMatchIndexを取得してハイライトレイヤーに渡す
  - 編集/プレビューモード切替時のハイライトレイヤー切り替え
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Note: 検証(validate-impl)により発見された未統合コンポーネントの統合_
