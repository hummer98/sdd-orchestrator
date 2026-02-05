/**
 * HtmlViewer Component
 *
 * project-docs-viewer Task 5.2: HTML ファイル表示コンポーネント
 * Requirements: 6.3
 *
 * Features:
 * - サンドボックス化した iframe で HTML をプレビュー
 * - sandbox="allow-same-origin" でスクリプト実行を禁止
 * - srcdoc 属性で HTML コンテンツを表示
 *
 * Security:
 * - allow-scripts 禁止: JavaScript 実行を防止
 * - allow-forms 禁止: フォーム送信を防止
 * - allow-popups 禁止: ポップアップウィンドウを防止
 */

// =============================================================================
// Types
// =============================================================================

export interface HtmlViewerProps {
  /** HTML content to display */
  content: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * HtmlViewer - Displays HTML content in a sandboxed iframe
 */
export function HtmlViewer({ content }: HtmlViewerProps): React.ReactElement {
  return (
    <div
      data-testid="html-viewer"
      className="w-full h-full flex flex-col bg-white dark:bg-gray-900"
    >
      <iframe
        data-testid="html-viewer-iframe"
        srcDoc={content}
        sandbox="allow-same-origin"
        className="w-full h-full border-0"
        title="HTML Viewer"
      />
    </div>
  );
}

export default HtmlViewer;
