# Research & Design Decisions: Git View Source Mode

## Summary

- **Feature**: `git-view-source-mode`
- **Discovery Scope**: Extension (既存GitViewシステムの拡張)
- **Key Findings**:
  - refractorは既にプロジェクトに導入済み（v4.8.1）でシンタックスハイライトに活用可能
  - @uiw/react-md-editorも既存依存としてMarkdownレンダリングに使用可能
  - react-zoom-pan-pinchは軽量（~12KB gzip）でタッチ対応の画像ズームライブラリ

## Research Log

### refractor Syntax Highlighting

- **Context**: Sourceモードでコードファイルをシンタックスハイライト表示する必要がある
- **Sources Consulted**:
  - [GitHub - wooorm/refractor](https://github.com/wooorm/refractor)
  - [npm - refractor](https://www.npmjs.com/package/refractor?activeTab=readme)
  - [GitHub - rexxars/react-refractor](https://github.com/rexxars/react-refractor)
- **Findings**:
  - refractorはPrism.jsベースの仮想シンタックスハイライトライブラリ
  - DOM操作ではなくAST生成のためReact Virtual DOMと親和性が高い
  - 290+言語をサポート
  - バンドルサイズ: core ~12.7KB, default ~40KB (gzip)
  - プロジェクトに既に導入済み（package.json: "refractor": "^4.8.1"）
- **Implications**:
  - 新規依存追加不要
  - react-refractorまたは直接refractor.highlight()使用でAST取得可能

### @uiw/react-md-editor Markdown Rendering

- **Context**: MarkdownファイルをSourceモードでレンダリング表示する
- **Sources Consulted**:
  - プロジェクト内ArtifactEditor.tsx実装
  - package.json依存確認
- **Findings**:
  - 既存で@uiw/react-md-editor v4.0.8を使用中
  - ArtifactEditorでは編集/プレビューモード切替に使用
  - MDEditor.Markdownコンポーネントでプレビューのみ表示可能
  - コードブロックのシンタックスハイライトは内蔵
- **Implications**:
  - 新規依存追加不要
  - 既存パターンを踏襲してMDEditor.Markdown使用
  - 変更行ハイライトはDOM構造上の制約あり

### react-zoom-pan-pinch Image Viewer

- **Context**: 画像ファイルの拡大縮小/パン操作を実装する
- **Sources Consulted**:
  - [npm - react-zoom-pan-pinch](https://www.npmjs.com/package/react-zoom-pan-pinch)
  - [GitHub - BetterTyped/react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch)
  - [LogRocket Blog - Adding zoom, pan, pinch](https://blog.logrocket.com/adding-zoom-pan-pinch-react-web-apps/)
- **Findings**:
  - 軽量でReactネイティブなズーム/パン/ピンチライブラリ
  - TransformWrapper/TransformComponentのシンプルなAPI
  - useControlsフックでズームコントロール制御可能
  - タッチ操作（ピンチ）、マウスホイール、ドラッグパンをサポート
  - TypeScript型定義同梱
- **Implications**:
  - 新規依存追加が必要（package.json更新）
  - シンプルなラッパーコンポーネントで実装可能

### IPC API Design

- **Context**: Renderer ProcessからMain Processのファイル内容を取得する方法
- **Sources Consulted**:
  - electron-sdd-manager/src/main/ipc/channels.ts
  - electron-sdd-manager/src/shared/api/types.ts
  - electron-sdd-manager/src/main/services/fileService.ts
- **Findings**:
  - 既存パターン: READ_ARTIFACT, WRITE_ARTIFACT, WRITE_FILEなどのチャンネル
  - ApiClient抽象化層でIPC/WebSocket透過
  - Result<T, ApiError>型で統一的エラーハンドリング
  - preload経由でセキュアにAPI公開
- **Implications**:
  - 新規チャンネルREAD_FILE_CONTENT追加
  - 既存パターンに従いResult型で返却
  - WebSocket対応はRemote UI統合時に検討

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| diffMode拡張 | 既存gitViewStore.diffModeに'source'追加 | 最小変更、既存パターン活用 | GitDiffViewer内の条件分岐増加 | 採用 |
| 別ストア追加 | sourceViewStore新規作成 | 関心の分離 | 状態同期の複雑化、冗長 | 不採用 |
| 別タブ追加 | GitViewとは別のSourceViewタブ | 完全な分離 | UI一貫性低下、ナビゲーション複雑化 | 不採用 |

## Design Decisions

### Decision: refractor直接使用 vs react-refractor

- **Context**: シンタックスハイライトの実装方法選択
- **Alternatives Considered**:
  1. refractor直接使用 - AST取得後に自前でReactコンポーネント変換
  2. react-refractor使用 - ラッパーライブラリで簡略化
- **Selected Approach**: refractor直接使用
- **Rationale (Why)**:
  - 変更行ハイライトとの統合に細かい制御が必要
  - react-refractorは追加依存となる
  - refractor自体は既に導入済み
- **Trade-offs**: 実装コード量は増えるが、カスタマイズ性確保
- **Follow-up**: 行単位のDOM構造設計でハイライト統合

### Decision: Markdown変更行ハイライト対応範囲

- **Context**: Markdownレンダリング後に変更行をハイライトする方法
- **Alternatives Considered**:
  1. 完全対応 - カスタムMarkdownパーサーで行追跡
  2. 部分対応 - ソース行とレンダリング行の近似マッピング
  3. 非対応 - 制限事項として明記
- **Selected Approach**: 非対応（制限事項）
- **Rationale (Why)**:
  - MDEditor.Markdownはレンダリング後のDOMを直接操作する設計ではない
  - ソース行とレンダリング後の行の1:1対応が困難（リスト、テーブル等）
  - 実装コストに対して得られる価値が限定的
- **Trade-offs**: Markdownファイルでは変更箇所が視覚的にわかりにくい
- **Follow-up**: 将来的な改善候補としてOpen Questionsに記載

### Decision: 画像ファイルのBase64転送

- **Context**: Renderer ProcessへのImage転送方法
- **Alternatives Considered**:
  1. Base64エンコード - 文字列としてIPC転送
  2. ファイルURL - file://プロトコルで直接参照
  3. Custom Protocol - electron://画像パス形式
- **Selected Approach**: Base64エンコード
- **Rationale (Why)**:
  - Electronセキュリティモデルに準拠（file://直接アクセス回避）
  - WebSocket転送でもそのまま使用可能（Remote UI対応）
  - データURLとしてimg srcに直接設定可能
- **Trade-offs**: 大きな画像でメモリ使用量増加、転送オーバーヘッド
- **Follow-up**: 10MB以上のファイルは警告表示

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 大きなファイルでのパフォーマンス低下 | ファイルサイズ上限（10MB）と警告表示 |
| refractor言語サポート不足 | 未知の拡張子はプレーンテキスト表示にフォールバック |
| react-zoom-pan-pinchのReact 19互換性 | ライブラリは積極的にメンテナンスされており問題なし |
| Markdown変更行ハイライト要望 | 制限事項として明記、将来改善候補 |

## References

- [react-zoom-pan-pinch - npm](https://www.npmjs.com/package/react-zoom-pan-pinch) - 画像ズームライブラリ
- [GitHub - wooorm/refractor](https://github.com/wooorm/refractor) - シンタックスハイライトAST生成
- [GitHub - react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) - refractor活用例の参考
- [Adding zoom, pan, pinch to React apps - LogRocket](https://blog.logrocket.com/adding-zoom-pan-pinch-react-web-apps/) - 実装パターン参考
