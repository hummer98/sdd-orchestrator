/**
 * PdfViewer Component
 *
 * project-docs-viewer Task 5.1: PDF ファイル表示コンポーネント
 * Requirements: 6.2
 *
 * Features:
 * - iframe を使用した PDF 表示
 * - file:// プロトコルでローカルファイルを読み込み
 */

// =============================================================================
// Types
// =============================================================================

export interface PdfViewerProps {
  /** Full path to PDF file */
  filePath: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PdfViewer - Displays PDF files using browser's built-in PDF viewer
 */
export function PdfViewer({ filePath }: PdfViewerProps): React.ReactElement {
  // Convert local path to file:// URL
  const fileUrl = `file://${filePath}`;

  return (
    <div
      data-testid="pdf-viewer"
      className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-900"
    >
      <iframe
        data-testid="pdf-viewer-iframe"
        src={fileUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
      />
    </div>
  );
}

export default PdfViewer;
