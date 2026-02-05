# Research & Design Decisions: Project Docs Viewer

## Summary

- **Feature**: `project-docs-viewer`
- **Discovery Scope**: Extension（既存 ProjectPane への機能追加）
- **Key Findings**:
  - 既存 `GitFileTree` コンポーネントがツリー UI の実績あるパターンを提供
  - `projectEditorStore` が要件4.4で指定されており、そのまま再利用可能
  - PDF/HTML 表示は iframe で十分（追加ライブラリ不要）

## Research Log

### ツリー UI 実装パターン

- **Context**: docs/ フォルダのツリー表示をどのように実装するか
- **Sources Consulted**:
  - `electron-sdd-manager/src/shared/components/git/GitFileTree.tsx`
  - `electron-sdd-manager/src/renderer/components/ProjectFileList.tsx`
- **Findings**:
  - `GitFileTree` は `buildTree()` でフラットリストからツリー構造を構築
  - 展開状態は `Map<string, boolean>` で管理
  - 再帰的レンダリングと仮想化（100+ ファイル時）の両方に対応
  - アイコンは Lucide React を使用
- **Implications**: 同様のパターンを `DocsTreeSection` に適用可能

### 既存ストア構造

- **Context**: ファイル選択状態と展開状態をどのストアで管理するか
- **Sources Consulted**:
  - `electron-sdd-manager/src/shared/stores/projectEditorStore.ts`
  - `electron-sdd-manager/src/shared/stores/gitViewStore.ts`
- **Findings**:
  - `projectEditorStore` は `currentFilePath`, `currentFileName`, `loadFile` を提供
  - 要件4.4で明示的に `projectEditorStore` の活用を指定
  - `gitViewStore` は `expandedDirs: Map<string, boolean>` で展開状態を管理
- **Implications**:
  - ファイル選択: `projectEditorStore` を再利用
  - 展開状態: 新規 `docsTreeExpandedStore` を `gitViewStore` と同様のパターンで作成

### IPC ハンドラ拡張

- **Context**: docs/ ファイル一覧をどのように取得するか
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/ipc/projectFileHandlers.ts`
  - `electron-sdd-manager/src/shared/api/types.ts`
- **Findings**:
  - `listProjectFilesCore` が `claudeMd` と `steeringFiles` を返す既存実装
  - `ProjectFilesState` 型を拡張して `docsTree` を追加可能
  - 同一 IPC チャンネル（`PROJECT_FILE_LIST`）を使用可能
- **Implications**: 新規 IPC チャンネル不要、既存ハンドラの拡張で対応

### PDF 表示オプション

- **Context**: PDF ファイルをどのように表示するか
- **Sources Consulted**:
  - Electron ドキュメント
  - pdf.js ライブラリ調査
- **Findings**:
  - Electron（Chromium）は PDF 内蔵ビューアをサポート
  - `<iframe src="file://..." />` または `<webview>` で表示可能
  - pdf.js は高機能だがバンドルサイズ増加（約 500KB gzip）
  - 要件はプレビューのみ（注釈、検索等の高度機能は Out of Scope）
- **Implications**: iframe ベースの軽量実装を採用

### HTML 表示セキュリティ

- **Context**: HTML ファイル表示時のセキュリティ対策
- **Sources Consulted**:
  - MDN Web Docs: iframe sandbox attribute
  - Electron セキュリティガイドライン
- **Findings**:
  - `sandbox` 属性でスクリプト実行、フォーム送信を制限可能
  - `allow-same-origin` は DOM アクセスに必要だが、他の権限は不要
  - `srcdoc` 属性でコンテンツを直接埋め込み可能（外部リソース参照を制限）
- **Implications**:
  ```html
  <iframe sandbox="allow-same-origin" srcdoc={content} />
  ```

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| GitFileTree パターン踏襲 | 既存ツリーコンポーネントと同様の設計 | 実績あり、一貫性、メンテナンス性 | なし | 採用 |
| 外部ツリーライブラリ | react-treeview 等の OSS 使用 | 機能豊富 | 依存追加、学習コスト、カスタマイズ制限 | 不採用 |
| フラットリスト + インデント | ネストをスタイルのみで表現 | シンプル | 展開/折りたたみが困難、UX 劣化 | 不採用 |

## Design Decisions

### Decision: ツリー構造の構築場所

- **Context**: ツリー構造を Main Process で構築するか Renderer で構築するか
- **Alternatives Considered**:
  1. Main Process で構築 - IPC でツリー構造を返す
  2. Renderer で構築 - IPC でフラットリストを返し、Renderer で変換
- **Selected Approach**: Main Process で構築
- **Rationale (Why)**:
  - ファイルシステムアクセスは Main Process の責務（アーキテクチャ原則）
  - IPC 往復を1回に削減（フラットリスト取得 → ツリー構築の2段階を回避）
  - `GitFileTree` の `buildTree()` は Renderer 側だが、これは git status の結果（フラットリスト）を変換する用途
  - docs/ の場合、ファイルシステムから直接ツリー構造を構築する方が効率的
- **Trade-offs**: IPC ペイロードはネスト構造になるが、ファイル数に比例するため影響は軽微
- **Follow-up**: 大量ファイル（1000+）時のパフォーマンス検証

### Decision: PDF ビューア実装

- **Context**: PDF ファイルをどのコンポーネントで表示するか
- **Alternatives Considered**:
  1. iframe + file:// URL
  2. pdf.js ライブラリ
  3. Electron webview
- **Selected Approach**: iframe + file:// URL
- **Rationale (Why)**:
  - Chromium 内蔵 PDF ビューアで十分な機能
  - 追加依存なし、バンドルサイズ増加なし
  - 実装がシンプル
- **Trade-offs**: 高度な PDF 操作（注釈、テキスト選択等）は制限あり
- **Follow-up**: ユーザーフィードバックに応じて pdf.js 導入検討

### Decision: 展開状態ストアの配置

- **Context**: ツリー展開状態を管理するストアをどこに配置するか
- **Alternatives Considered**:
  1. `shared/stores/` に新規ストア作成
  2. `renderer/stores/` に新規ストア作成
  3. `projectEditorStore` に統合
- **Selected Approach**: `shared/stores/` に新規 `docsTreeExpandedStore` 作成
- **Rationale (Why)**:
  - Remote UI 対応を見据えて shared に配置
  - `projectEditorStore` は編集状態専用、展開状態とは関心が異なる
  - `gitViewStore` と同様のパターンで一貫性維持
- **Trade-offs**: ストア数が1つ増加
- **Follow-up**: Remote UI 実装時に同一ストアを使用可能か検証

## Implementation Guidance

### DocsTreeSection 実装パターン

```typescript
// GitFileTree と同様のパターン
interface DocsTreeNodeProps {
  node: DocsTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string, name: string) => void;
}

// 再帰的レンダリング
function renderNode(node: DocsTreeNode, depth: number): React.ReactElement {
  if (node.type === 'file') {
    return <FileNode node={node} depth={depth} />;
  }
  return (
    <DirectoryNode node={node} depth={depth}>
      {node.children?.map(child => renderNode(child, depth + 1))}
    </DirectoryNode>
  );
}
```

### PDF/HTML Viewer セキュリティ設定

```typescript
// PdfViewer
function PdfViewer({ filePath }: { filePath: string }) {
  return (
    <iframe
      src={`file://${filePath}`}
      className="w-full h-full border-0"
      title="PDF Viewer"
    />
  );
}

// HtmlViewer
function HtmlViewer({ content }: { content: string }) {
  return (
    <iframe
      sandbox="allow-same-origin"
      srcdoc={content}
      className="w-full h-full border-0"
      title="HTML Viewer"
    />
  );
}
```

### ファイル拡張子別アイコン

```typescript
import { FileText, FileType, Globe } from 'lucide-react';

function getFileIcon(extension: 'md' | 'pdf' | 'html') {
  switch (extension) {
    case 'md': return <FileText className="w-4 h-4" />;
    case 'pdf': return <FileType className="w-4 h-4" />;
    case 'html': return <Globe className="w-4 h-4" />;
  }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| 大量ファイル時のパフォーマンス | GitFileTree 同様の仮想化（@tanstack/react-virtual）を検討。初期実装は100ファイル以下を想定 |
| PDF 表示の互換性 | Chromium 内蔵ビューアに依存。問題発生時は pdf.js へフォールバック検討 |
| HTML セキュリティ | sandbox 属性で制限。追加のサニタイズが必要な場合は DOMPurify 導入 |

## References

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) - iframe 使用時のセキュリティガイドライン
- [MDN: iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox) - sandbox 属性の詳細
- [pdf.js](https://mozilla.github.io/pdf.js/) - 将来の拡張時の参考
