# Research & Design Decisions: Markdown Mermaid Preview

## Summary
- **Feature**: `markdown-mermaid-preview`
- **Discovery Scope**: Extension
- **Key Findings**:
  - `@uiw/react-md-editor`はカスタムコードレンダラーをサポートしており、`previewOptions.components.code`で設定可能
  - Mermaid v11+は非同期render APIを提供、`mermaid.render()`は`Promise<{svg: string}>`を返却
  - ダークモードはMermaid初期化時の`theme`オプションで設定（レンダリング後の変更不可）

## Research Log

### @uiw/react-md-editorのMermaidサポート

- **Context**: 既存のMarkdownエディタライブラリがMermaidをどのようにサポートするか調査
- **Sources Consulted**:
  - [uiwjs/react-md-editor GitHub](https://github.com/uiwjs/react-md-editor)
  - [CodeSandbox: Markdown Editor mermaid for React](https://codesandbox.io/s/markdown-editor-mermaid-for-react-uvtsx)
  - [@uiw/react-md-editor npm](https://www.npmjs.com/package/@uiw/react-md-editor)
- **Findings**:
  - 公式にはMermaidプラグインは提供されていない
  - カスタムコードレンダラーを`previewOptions.components.code`に設定することで実装可能
  - `MDEditor.Markdown`コンポーネントも同様に`components.code`を受け付ける
  - コードブロックの言語は`className`として`language-{lang}`形式で渡される
- **Implications**:
  - 各MDEditor使用箇所で共通のカスタムコードレンダラーを設定する必要がある
  - 共有コンポーネント（MermaidCodeRenderer）を作成し、一元管理する

### Mermaid v11+ React統合パターン

- **Context**: ReactアプリでMermaidを使用するベストプラクティスを調査
- **Sources Consulted**:
  - [How I Rendered Mermaid Diagrams in React - DEV Community](https://dev.to/navdeepm20/how-i-rendered-mermaid-diagrams-in-react-and-built-a-library-for-it-c4d)
  - [Mermaid Usage Documentation](https://mermaid.ai/open-source/config/usage.html)
  - [Integrate MermaidJS with ReactJS - tuanhuy.dev](https://www.tuanhuy.dev/posts/integrate-mermaidjs-with-reactjs)
- **Findings**:
  - `mermaid.render(id, code)`は非同期APIで、`{svg: string, bindFunctions: Function}`を返す
  - 各レンダリングには一意のIDが必要（DOM要素識別用）
  - エラーハンドリングはtry-catchで行い、エラーオブジェクトからメッセージを取得
  - Reactでは`useEffect`内でレンダリングを行い、SVGを状態として保持するパターンが一般的
- **Implications**:
  - MermaidServiceは`async/await`で実装
  - コンポーネントごとに一意のIDを生成する仕組みが必要
  - エラー状態とSVG状態を区別して管理

### Mermaidダークモード設定

- **Context**: アプリのダークモードに合わせてMermaid図のテーマを切り替える方法を調査
- **Sources Consulted**:
  - [Mermaid Theme Configuration](https://mermaid.js.org/config/theming.html)
  - [Integrating Dark Mode with Mermaid Diagrams](https://herczegzsolt.hu/posts/integrating-dark-mode-with-mermaid-diagrams/)
- **Findings**:
  - 利用可能なテーマ: `default`, `neutral`, `dark`, `forest`, `base`
  - `dark`テーマはダークモード環境向けに最適化されている
  - `mermaid.initialize({ theme: 'dark' })`で設定
  - **重要な制約**: レンダリング後のテーマ変更は不可、再レンダリングが必要
  - カスタムテーマは`base`テーマをベースに`themeVariables`で調整可能
- **Implications**:
  - テーマ切り替え時はMermaidを再初期化するか、図を再レンダリングする必要がある
  - 現在のテーマを検知する仕組みが必要（`data-color-mode`属性を監視）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| カスタムコードレンダラー | MDEditorのcomponents.codeを使用 | 公式パターン、既存設定に追加するだけ | 各MDEditor使用箇所で設定が必要 | **採用** |
| 独自Markdownパーサー | Mermaidブロックを独自に検出・処理 | 完全な制御が可能 | 複雑、MDEditorとの統合が困難 | 却下 |
| mermaid-react-component | サードパーティライブラリ使用 | 実装簡単 | 依存追加、カスタマイズ制限 | 却下 |

## Design Decisions

### Decision: カスタムコードレンダラー方式

- **Context**: MDEditorでMermaidをレンダリングする方法を決定
- **Alternatives Considered**:
  1. カスタムコードレンダラー: MDEditorの公式パターン
  2. 独自Markdownパーサー: 複雑すぎる
  3. react-x-mermaidなどのライブラリ: 追加依存、MDEditorとの統合が必要
- **Selected Approach**: カスタムコードレンダラー
- **Rationale (Why)**:
  - MDEditorの公式ドキュメントで推奨されているパターン
  - 既存のMDEditor設定に最小限の変更で統合可能
  - 他の言語のコードブロックに影響を与えない
- **Trade-offs**: 各MDEditor使用箇所で設定が必要だが、共有コンポーネントで一元管理可能
- **Follow-up**: 共有コンポーネントのテストで動作確認

### Decision: 遅延初期化パターン

- **Context**: Mermaidライブラリの初期化タイミングを決定
- **Alternatives Considered**:
  1. アプリ起動時に初期化
  2. Mermaidブロック初回検出時に初期化（遅延初期化）
- **Selected Approach**: 遅延初期化
- **Rationale (Why)**:
  - Mermaidライブラリは約800KB（gzip圧縮後）と大きい
  - Mermaidを使用しないユーザーには読み込みが不要
  - 初回レンダリング時に自動的に初期化することで、使用時のみコストが発生
- **Trade-offs**: 初回レンダリングが若干遅くなる可能性
- **Follow-up**: 初期化状態をシングルトンで管理

### Decision: テーマ同期方式

- **Context**: アプリのダーク/ライトモードとMermaid図のテーマを同期する方法
- **Alternatives Considered**:
  1. `data-color-mode`属性を監視
  2. Zustandストアでテーマ状態を管理
  3. CSS変数で動的に変更
- **Selected Approach**: `data-color-mode`属性を監視
- **Rationale (Why)**:
  - MDEditorが既に`data-color-mode`を使用している
  - 追加のストア依存を避けられる
  - DOMベースで確実にテーマを検知可能
- **Trade-offs**: Mermaidはレンダリング後のテーマ変更不可のため、テーマ変更時は再レンダリングが必要
- **Follow-up**: MutationObserverまたはuseEffectでの属性監視を検討

## Risks & Mitigations

- **Risk 1**: Mermaidライブラリのバンドルサイズ増加（約800KB gzip）
  - **Mitigation**: 動的インポートと遅延初期化で必要時のみ読み込み
- **Risk 2**: 複雑なMermaid図のレンダリングパフォーマンス
  - **Mitigation**: 非同期レンダリングでUIブロックを回避、MDEditorのdebounceに依存
- **Risk 3**: Mermaid構文エラーによるレンダリング失敗
  - **Mitigation**: try-catchでエラーを捕捉し、エラーメッセージと生コードを表示

## References

- [Mermaid Theme Configuration](https://mermaid.js.org/config/theming.html) - 公式テーマ設定ドキュメント
- [@uiw/react-md-editor GitHub](https://github.com/uiwjs/react-md-editor) - MDEditorリポジトリ
- [How I Rendered Mermaid Diagrams in React](https://dev.to/navdeepm20/how-i-rendered-mermaid-diagrams-in-react-and-built-a-library-for-it-c4d) - React統合パターンの解説
- [mermaid npm](https://www.npmjs.com/package/mermaid) - Mermaidパッケージ
