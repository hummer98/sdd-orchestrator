# Implementation Plan

## Task 1: 依存関係とインフラストラクチャ

- [x] 1.1 (P) react-zoom-pan-pinch依存関係の追加
  - package.jsonにreact-zoom-pan-pinch（画像ズーム/パン/ピンチ用）を追加
  - npm installを実行してdependenciesを更新
  - _Requirements: 4.5_

- [x] 1.2 (P) IPC_CHANNELSにREAD_FILE_CONTENTチャンネル定義を追加
  - channels.tsにファイル内容取得用チャンネルを追加
  - 型安全なチャンネル名定義
  - _Requirements: 5.1_

## Task 2: Main Process - FileService拡張

- [x] 2.1 FileServiceにreadFileContent関数を実装
  - プロジェクトパスとファイルパスから絶対パスを構築
  - ファイル存在チェックとエラーハンドリング
  - 画像拡張子（SVG, PNG, JPG, JPEG, GIF, WebP, ICO）はBase64エンコード
  - バイナリ判定とファイル種別（code/markdown/image/binary）の決定
  - 言語検出（拡張子からの自動判定）
  - _Requirements: 5.2, 5.3, 5.4_
  - _Method: fs.readFile, path.join, path.extname_

## Task 3: Main Process - IPCハンドラ実装

- [x] 3.1 readFileContent IPCハンドラの実装
  - handlers.tsにREAD_FILE_CONTENTハンドラを追加
  - FileService.readFileContentを呼び出し
  - セキュリティ検証（プロジェクトパス外へのアクセス禁止）
  - Result型でのエラー返却
  - _Requirements: 5.1, 5.2, 5.3_
  - _Method: ipcMain.handle, FileService.readFileContent_
  - _Verify: Grep "READ_FILE_CONTENT" in handlers.ts_

## Task 4: Preload・ApiClient層の拡張

- [x] 4.1 (P) preload/index.tsにreadFileContent API公開
  - contextBridge経由でrendererに公開
  - 型定義の追加
  - _Requirements: 5.1_

- [x] 4.2 (P) ApiClient型定義の追加
  - shared/api/types.tsにReadFileContentRequest, FileContentResult型を追加
  - fileType: 'code' | 'markdown' | 'image' | 'binary'の型定義
  - _Requirements: 5.1_

- [x] 4.3 IpcApiClientにreadFileContent実装
  - preload API経由でのファイル内容取得
  - Result型でのレスポンスラッピング
  - _Requirements: 5.1_

## Task 5: gitViewStore拡張

- [x] 5.1 diffMode型の拡張
  - 'unified' | 'split' を 'unified' | 'split' | 'source' に拡張
  - 既存のsetDiffModeアクションは変更不要（型拡張のみ）
  - _Requirements: 2.4_

## Task 6: UI - コアコンポーネント実装

- [x] 6.1 (P) CodeViewerコンポーネントの実装
  - refractorによるシンタックスハイライト
  - CSS Gridでの行番号表示
  - 変更行の背景色ハイライト（追加行：緑系）
  - 変更行のガターマーク表示
  - 拡張子から言語を自動検出
  - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - _Method: refractor.highlight, CSS Grid_

- [x] 6.2 (P) MarkdownRendererコンポーネントの実装
  - @uiw/react-md-editorのMDEditor.Markdownコンポーネントを使用
  - コードブロック（```言語名）のシンタックスハイライト
  - 変更行ハイライトはDOM構造上の制約あり（制限事項として許容）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Method: MDEditor.Markdown_

- [x] 6.3 (P) ImageViewerコンポーネントの実装
  - react-zoom-pan-pinchのTransformWrapper/TransformComponent使用
  - Base64データをdata URLとして表示
  - ピンチ/パン/ホイールズーム対応
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Method: TransformWrapper, TransformComponent_

## Task 7: UI - SourceView統合コンポーネント

- [x] 7.1 SourceViewコンポーネントの実装
  - ファイルパスからApiClient.readFileContentで内容取得
  - 拡張子ベースのファイル種別判定
  - CodeViewer/MarkdownRenderer/ImageViewerへの分岐
  - バイナリファイル（画像以外）は「バイナリファイルは表示できません」メッセージ
  - 差分情報（diffContent）から変更行を解析し子コンポーネントに伝播
  - ローディング状態とエラー表示
  - _Requirements: 1.1, 3.1, 4.1, 6.1, 6.2_
  - _Method: useEffect, ApiClient.readFileContent_

## Task 8: UI - GitDiffViewer拡張と結合

- [x] 8.1 GitDiffViewerに3ボタンUIを追加
  - Unified | Split | Source の3ボタン並列表示
  - 現在選択中のモードをアクティブ状態で視覚的に区別
  - setDiffMode呼び出しによるモード切替
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 8.2 GitDiffViewerにSourceモード分岐を追加
  - diffMode === 'source'の場合にSourceViewをレンダリング
  - selectedFilePath、projectPath、diffContentをSourceViewに渡す
  - _Requirements: 1.1_

- [x] 8.3 renderer/components/index.tsへの新規コンポーネントre-export追加
  - SourceView, CodeViewer, MarkdownRenderer, ImageViewerをre-export
  - @shared/components/gitからの再エクスポート
  - structure.mdのRe-export Pattern準拠

## Task 9: テスト

- [x] 9.1 FileService.readFileContent ユニットテスト
  - 正常系：テキストファイル内容の取得
  - 正常系：画像ファイルのBase64エンコード
  - エラー系：ファイル不存在時のエラー返却
  - バイナリ判定の正確性
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 9.2 gitViewStore diffMode拡張テスト
  - setDiffMode('source')の動作確認
  - 型チェックの検証
  - _Requirements: 2.4_

- [x] 9.3 readFileContent IPC往復通信の統合テスト
  - SourceView → IpcApiClient → IPC Handler → FileService の往復通信テスト
  - 正常系：ファイル内容が正しく返却される
  - エラー系：ファイル不存在時にApiError返却
  - Base64：画像ファイルがisBase64: trueで返却
  - waitForパターンでIPC応答待機
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - _Method: handlers.test.ts既存パターン参照_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Sourceボタンクリック時にファイル全内容表示 | 7.1, 8.2 | Feature |
| 1.2 | 拡張子ベースのシンタックスハイライト | 6.1 | Feature |
| 1.3 | 行番号表示 | 6.1 | Feature |
| 1.4 | 変更行の背景色ハイライト | 6.1 | Feature |
| 1.5 | 変更行のガターマーク | 6.1 | Feature |
| 2.1 | 3ボタン並列表示 | 8.1 | Feature |
| 2.2 | モード切替動作 | 8.1 | Feature |
| 2.3 | アクティブ状態の視覚表示 | 8.1 | Feature |
| 2.4 | diffMode状態管理 | 5.1, 9.2 | Feature |
| 3.1 | Markdown拡張子判定とレンダリング | 6.2, 7.1 | Feature |
| 3.2 | コードブロックのシンタックスハイライト | 6.2 | Feature |
| 3.3 | 既存ライブラリ活用 | 6.2 | Feature |
| 3.4 | Markdown内変更行ハイライト（制限あり） | 6.2 | Feature |
| 4.1 | 画像形式判定とプレビュー表示 | 6.3, 7.1 | Feature |
| 4.2 | ピンチ操作による拡大縮小 | 6.3 | Feature |
| 4.3 | パン操作 | 6.3 | Feature |
| 4.4 | ホイールズーム | 6.3 | Feature |
| 4.5 | react-zoom-pan-pinch使用 | 1.1, 6.3 | Infrastructure, Feature |
| 5.1 | readFileContent IPC API | 1.2, 3.1, 4.1, 4.2, 4.3, 9.3 | Infrastructure |
| 5.2 | 絶対パス受け取りと内容返却 | 2.1, 9.1, 9.3 | Feature |
| 5.3 | ファイル不存在時エラー | 2.1, 3.1, 9.1, 9.3 | Feature |
| 5.4 | 画像ファイルBase64エンコード | 2.1, 9.1, 9.3 | Feature |
| 6.1 | バイナリファイルメッセージ表示 | 7.1 | Feature |
| 6.2 | 画像バイナリは画像ビューアー表示 | 7.1 | Feature |

### Coverage Validation Checklist
- [x] Every criterion ID from requirements.md appears above
- [x] Tasks are leaf tasks (e.g., 6.1), not container tasks (e.g., 6)
- [x] User-facing criteria have at least one Feature task
- [x] No criterion is covered only by Infrastructure tasks
