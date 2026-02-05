# Implementation Plan

## 1. 型定義とデータモデル

- [x] 1.1 (P) DocsTreeNode 型と ProjectFilesState 拡張を追加
  - ツリーノードの型定義（name, relativePath, type, extension, children）
  - ProjectFilesState に docsTree フィールドを追加
  - file/directory の判別、拡張子情報（md/pdf/html）を含む
  - _Requirements: 1.1_

## 2. ツリー展開状態管理ストア

- [x] 2.1 (P) docsTreeExpandedStore を作成
  - フォルダパスをキーとした展開状態（Map<string, boolean>）の管理
  - toggleDir でフォルダの展開/折りたたみを切替
  - reset で初期状態（全折りたたみ）にリセット
  - shared/stores/ に配置し、エクスポートを追加
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

## 3. Main Process: docs/ ファイル一覧取得

- [x] 3.1 listDocsFilesCore 関数を実装
  - docs/ フォルダを再帰的に走査しツリー構造を構築
  - .md, .pdf, .html のみを対象としてフィルタリング
  - 隠しファイル/フォルダ（.で始まる）を除外
  - フォルダ内でアルファベット順にソート
  - docs/ 未存在時は空配列を返す（エラーなし）
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.2 PROJECT_FILE_LIST ハンドラを拡張
  - listProjectFilesCore から listDocsFilesCore を呼び出し
  - レスポンスに docsTree を追加
  - 既存の claudeMd, steeringFiles との整合性を維持
  - _Requirements: 1.1, 1.2_

## 4. ツリー表示コンポーネント

- [x] 4.1 DocsTreeSection コンポーネントを作成
  - ツリーノードの再帰的レンダリング
  - フォルダノード/ファイルノードを視覚的に区別
  - フォルダクリックで展開/折りたたみ（docsTreeExpandedStore 連携）
  - ファイルクリックで選択（onSelectFile コールバック）
  - インデント（paddingLeft）でネストレベルを表現
  - 拡張子ベースのアイコン表示（Lucide: FileText, FileCode, File）
  - フォルダアイコン（展開時: FolderOpen、折りたたみ時: Folder）
  - 空ツリー時は「ファイルなし」メッセージを表示
  - shared/components/project/ に配置
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.3, 6.4_

## 5. PDF/HTML ビューアコンポーネント

- [x] 5.1 (P) PdfViewer コンポーネントを作成
  - iframe を使用した PDF 表示
  - file:// プロトコルでローカルファイルを読み込み
  - shared/components/project/ に配置
  - _Requirements: 6.2_

- [x] 5.2 (P) HtmlViewer コンポーネントを作成
  - サンドボックス化した iframe で HTML をプレビュー
  - sandbox="allow-same-origin" でスクリプト実行を禁止
  - srcdoc 属性で HTML コンテンツを表示
  - shared/components/project/ に配置
  - _Requirements: 6.3_

## 6. 統合: ProjectFileList への Docs セクション追加

- [x] 6.1 ProjectFileList に Docs セクションを追加
  - セクション順序: CLAUDE.md → Steering Files → Docs
  - セクションヘッダー（タイトルとアイコン）を表示
  - DocsTreeSection を呼び出してツリーを表示
  - ファイル選択時に projectEditorStore.loadFile を呼び出し
  - _Requirements: 5.1, 5.2, 2.3_

## 7. 統合: ProjectFileEditor のファイル種別対応

- [x] 7.1 ProjectFileEditor に PDF/HTML ビューア切替を追加
  - ファイル拡張子で表示コンポーネントを切替
  - .md: 既存の MDEditor（プレビューモード）
  - .pdf: PdfViewer コンポーネント
  - .html: HtmlViewer コンポーネント
  - _Requirements: 6.1, 6.2, 6.3_

## 8. 統合: 選択ファイルの存在チェック

- [x] 8.1 projectEditorStore にファイル存在チェックを追加
  - ファイル読み込み前に存在チェックを実施
  - 存在しないファイルが選択されている場合は選択をクリア
  - _Requirements: 4.3_

## 9. テスト

- [x] 9.1 docsTreeExpandedStore のユニットテスト
  - toggleDir でフォルダ展開/折りたたみが切り替わること
  - reset で初期状態に戻ること
  - 初期状態は全フォルダ折りたたみであること
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 9.2 listDocsFilesCore のユニットテスト
  - 再帰的なツリー構造が正しく構築されること
  - .md, .pdf, .html のみがフィルタリングされること
  - 隠しファイルが除外されること
  - アルファベット順にソートされること
  - docs/ 未存在時に空配列が返ること
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 9.3 DocsTreeSection のレンダリングテスト
  - ツリー構造が正しく表示されること
  - フォルダ/ファイルアイコンが正しく表示されること
  - インデントが正しく適用されること
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 9.4 (P) PdfViewer/HtmlViewer のレンダリングテスト
  - iframe が正しくレンダリングされること
  - sandbox 属性が正しく設定されること
  - _Requirements: 6.2, 6.3_

- [x] 9.5 統合テスト
  - PROJECT_FILE_LIST IPC が docs/ を含む結果を返すこと
  - ProjectPane + DocsTreeSection のファイル選択フロー
  - docsTreeExpandedStore と DocsTreeSection の状態同期
  - _Requirements: 1.1, 2.3_

- [x] 9.6 E2Eテスト
  - UJ-001: Project選択 -> Projectタブ -> Docsセクション確認
  - UJ-002: Docsセクション -> フォルダクリック -> 展開/折りたたみ動作
  - UJ-003: Docsセクション -> .mdファイル選択 -> エディタ表示
  - UJ-004: Docsセクション -> .pdfファイル選択 -> iframe表示
  - UJ-005: タブ切替(Spec->Project) -> 選択・展開状態の復元
  - _Requirements: 2.1, 2.2, 2.3, 3.2, 4.2, 6.1, 6.2_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | docs/内のファイルを再帰取得、階層構造保持 | 1.1, 3.1, 3.2, 9.5 | Infrastructure, Feature, Integration |
| 1.2 | docs/未存在時は空配列 | 3.1, 3.2 | Feature |
| 1.3 | ファイル名アルファベット順ソート | 3.1 | Feature |
| 1.4 | 隠しファイル除外 | 3.1 | Feature |
| 2.1 | ツリー構造表示 | 4.1, 9.6 | Feature, E2E |
| 2.2 | フォルダ展開/折りたたみ | 4.1, 9.6 | Feature, E2E |
| 2.3 | ファイルクリックでエディタ表示 | 4.1, 6.1, 9.5, 9.6 | Feature, Integration, E2E |
| 2.4 | フォルダ/ファイルアイコン表示 | 4.1 | Feature |
| 2.5 | インデントによるネスト表示 | 4.1 | Feature |
| 3.1 | 展開状態オンメモリ保持 | 2.1 | Infrastructure |
| 3.2 | タブ切替時の展開状態復元 | 2.1, 9.6 | Feature, E2E |
| 3.3 | アプリ再起動時リセット | 2.1 | Feature |
| 3.4 | 初期状態は全折りたたみ | 2.1 | Feature |
| 4.1 | 選択ファイルパス保持 | 既存（projectEditorStore） | - |
| 4.2 | タブ移動後の選択復元 | 既存（projectEditorStore）, 9.6 | -, E2E |
| 4.3 | 存在しないファイル選択クリア | 8.1 | Feature |
| 4.4 | projectEditorStore活用 | 6.1 | Integration |
| 5.1 | セクション順序（CLAUDE.md, Steering, Docs） | 6.1 | Feature |
| 5.2 | セクションヘッダー表示 | 6.1 | Feature |
| 5.3 | 空/未存在時の表示 | 4.1 | Feature |
| 6.1 | .md ファイル表示 | 7.1, 9.6 | Feature, E2E |
| 6.2 | .pdf ファイル表示 | 5.1, 7.1, 9.6 | Feature, E2E |
| 6.3 | .html ファイル表示 | 5.2, 7.1 | Feature |
| 6.4 | ファイル形式別アイコン | 4.1 | Feature |
