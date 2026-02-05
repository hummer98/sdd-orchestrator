# Implementation Plan

## Tasks

- [x] 1. 依存関係のセットアップ
- [x] 1.1 mermaidライブラリをインストールする
  - `electron-sdd-manager/package.json` に mermaid ^11.x を追加
  - `npm install mermaid` を実行して依存関係を解決
  - _Requirements: 1.1, 1.2_

- [x] 2. Mermaidレンダリング基盤の実装
- [x] 2.1 (P) MermaidServiceを実装する
  - Mermaidライブラリの遅延初期化（初回render呼び出し時）
  - ダークモード対応のテーマ設定（`theme: 'dark'` または `theme: 'default'`）
  - `render(code, id, darkMode)` メソッドでSVGまたはエラーを返却
  - 一意のIDでレンダリングを実行し、成功時はsvg文字列、失敗時はエラーメッセージと生コードを返却
  - `src/shared/services/mermaidService.ts` に配置
  - _Requirements: 1.1, 1.2, 2.1_
  - _Method: mermaid.initialize, mermaid.render_
  - _Verify: Grep "mermaid.initialize|mermaid.render" in mermaidService.ts_

- [x] 2.2 (P) MermaidCodeRendererコンポーネントを実装する
  - MDEditorのカスタムコードレンダラーとして `language-mermaid` クラスのコードブロックを検出
  - MermaidServiceを呼び出してSVGを取得
  - 成功時はSVGを`dangerouslySetInnerHTML`で表示
  - 失敗時はエラーメッセージと生コードの両方を表示
  - 非Mermaidコードは標準の`<code>`要素としてパススルー
  - 各ブロックに一意のIDを生成して複数Mermaidブロックに対応
  - ローディング状態とエラー状態のUI表示
  - `src/shared/components/markdown/MermaidCodeRenderer.tsx` に配置
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 4.1, 4.2_
  - _Method: MermaidService.render, useEffect, useState_
  - _Verify: Grep "MermaidService|language-mermaid" in MermaidCodeRenderer.tsx_

- [x] 2.3 共有コンポーネントのバレルエクスポートを設定する
  - `src/shared/components/markdown/index.ts` を作成
  - MermaidCodeRendererをエクスポート
  - _Requirements: 1.1_

- [x] 3. Electron版コンポーネントへの統合
- [x] 3.1 (P) ArtifactEditorにMermaidレンダリングを統合する
  - `previewOptions.components.code` に MermaidCodeRenderer を設定
  - Spec/Bugアーティファクト編集画面のプレビューでMermaidをレンダリング
  - _Requirements: 3.1_
  - _Method: previewOptions.components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in ArtifactEditor.tsx_

- [x] 3.2 (P) ArtifactPreviewにMermaidレンダリングを統合する
  - `MDEditor.Markdown` の `components.code` に MermaidCodeRenderer を設定
  - アーティファクト一覧の展開プレビューでMermaidをレンダリング
  - _Requirements: 3.2_
  - _Method: components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in ArtifactPreview.tsx_

- [x] 3.3 (P) ProjectFileEditorにMermaidレンダリングを統合する
  - `previewOptions.components.code` に MermaidCodeRenderer を設定
  - プロジェクトファイル編集画面のプレビューでMermaidをレンダリング
  - _Requirements: 3.3_
  - _Method: previewOptions.components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in ProjectFileEditor.tsx_

- [x] 3.4 (P) MarkdownViewerにMermaidレンダリングを統合する
  - `MDEditor.Markdown` の `components.code` に MermaidCodeRenderer を設定
  - Git差分ビューア等でMermaidをレンダリング
  - _Requirements: 3.4_
  - _Method: components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in MarkdownViewer.tsx_

- [x] 4. Remote UI版コンポーネントへの統合
- [x] 4.1 (P) RemoteArtifactEditorにMermaidレンダリングを統合する
  - `previewOptions.components.code` に MermaidCodeRenderer を設定
  - Remote UI版アーティファクト編集画面のプレビューでMermaidをレンダリング
  - _Requirements: 3.5_
  - _Method: previewOptions.components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in RemoteArtifactEditor.tsx_

- [x] 4.2 (P) RemoteBugArtifactEditorにMermaidレンダリングを統合する
  - `previewOptions.components.code` に MermaidCodeRenderer を設定
  - Remote UI版バグアーティファクト編集画面のプレビューでMermaidをレンダリング
  - _Requirements: 3.5_
  - _Method: previewOptions.components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in RemoteBugArtifactEditor.tsx_

- [x] 4.3 (P) RemoteProjectEditorにMermaidレンダリングを統合する
  - `previewOptions.components.code` に MermaidCodeRenderer を設定
  - Remote UI版プロジェクトファイル編集画面のプレビューでMermaidをレンダリング
  - _Requirements: 3.5_
  - _Method: previewOptions.components.code_
  - _Verify: Grep "MermaidCodeRenderer|components.*code" in RemoteProjectEditor.tsx_

- [x] 5. テストの実装
- [x] 5.1 MermaidServiceのユニットテストを実装する
  - 正常系テスト: フローチャート、シーケンス図、状態遷移図、ER図等の各図タイプでレンダリングが成功すること
  - エラー系テスト: 不正なシンタックスでエラーメッセージと生コードが返却されること
  - ダークモード切り替えテスト: darkModeフラグによりテーマが切り替わること
  - `src/shared/services/mermaidService.test.ts` に配置
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 5.2 MermaidCodeRendererの統合テストを実装する
  - MDEditor内でMermaid図がSVGとしてレンダリングされることを確認
  - 非Mermaidコードブロックが影響を受けないことを確認
  - エラー時にエラーメッセージと生コードが表示されることを確認
  - 複数のMermaidブロックが含まれるドキュメントで全て正しくレンダリングされることを確認
  - `waitFor`パターンでSVGレンダリング完了を待機
  - `src/shared/components/markdown/MermaidCodeRenderer.test.tsx` に配置
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 4.2_

- [x] 5.3 E2Eテストを実装する
  - UJ-001: ArtifactEditorでMermaid図を含むdesign.mdを開き、プレビューでSVGレンダリングを確認
  - UJ-002: 編集モードでMermaidコードを変更し、プレビューで反映を確認
  - UJ-003: 不正なMermaid構文入力時のエラー表示を確認
  - UJ-005: Remote UI版ArtifactEditorでのMermaidプレビュー動作確認
  - `electron-sdd-manager/e2e-wdio/mermaid-preview.e2e.spec.ts` に配置
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 3.1, 3.5_

- [x] 6. ビルドと検証
- [x] 6.1 ビルドと型チェックを実行する
  - `npm run build` でElectronアプリのビルドが成功すること
  - `npm run typecheck` で型エラーがないこと
  - Mermaidライブラリのバンドルサイズを確認（約800KB gzip圧縮後）
  - _Requirements: 4.1_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Mermaidコードブロックのレンダリング | 1.1, 2.1, 2.2, 2.3, 5.1, 5.3 | Infrastructure, Feature, E2E |
| 1.2 | 全種類の図サポート | 1.1, 2.1, 5.1 | Infrastructure, Feature |
| 1.3 | リアルタイムプレビュー更新 | 2.2, 5.2, 5.3 | Feature, E2E |
| 2.1 | シンタックスエラー時のエラーメッセージ表示 | 2.1, 2.2, 5.1, 5.2, 5.3 | Feature, E2E |
| 2.2 | エラー時の生コード表示 | 2.2, 5.2, 5.3 | Feature, E2E |
| 2.3 | 他コンテンツへの影響なし | 2.2, 5.2 | Feature |
| 3.1 | ArtifactEditorでのMermaidレンダリング | 3.1, 5.3 | Feature, Wiring, E2E |
| 3.2 | ArtifactPreviewでのMermaidレンダリング | 3.2 | Feature, Wiring |
| 3.3 | ProjectFileEditorでのMermaidレンダリング | 3.3 | Feature, Wiring |
| 3.4 | MarkdownViewerでのMermaidレンダリング | 3.4 | Feature, Wiring |
| 3.5 | Remote UI版コンポーネントでのMermaidレンダリング | 4.1, 4.2, 4.3, 5.3 | Feature, Wiring, E2E |
| 4.1 | エディタ入力操作のブロック回避 | 2.2, 6.1 | Feature |
| 4.2 | 複数Mermaidブロックの適切なレンダリング | 2.2, 5.2 | Feature |
