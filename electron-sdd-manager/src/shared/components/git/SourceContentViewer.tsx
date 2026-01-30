/**
 * SourceContentViewer Component
 * git-view-source-mode Task 9.1, 9.2, 9.3: Content viewer router
 * Requirements: 2.1 (コード表示), 2.2 (Markdown表示), 3.1 (画像プレビュー), 4.1 (バイナリ表示)
 *
 * Routes to the appropriate viewer component based on file type:
 * - code: SourceCodeViewer
 * - markdown: MarkdownViewer
 * - image: ImageViewer
 * - binary: BinaryFileIndicator
 */

import type { FileContentResult } from '@shared/api/types';
import { SourceCodeViewer } from './SourceCodeViewer';
import { MarkdownViewer } from './MarkdownViewer';
import { ImageViewer } from './ImageViewer';
import { BinaryFileIndicator } from './BinaryFileIndicator';
import { Loader2, FileX } from 'lucide-react';

export interface SourceContentViewerProps {
  /** File content result from API */
  fileContent: FileContentResult | null;
  /** File path for display */
  filePath: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * SourceContentViewer - Routes to appropriate viewer based on file type
 *
 * Handles:
 * - Loading state
 * - Error state
 * - No file selected state
 * - File type routing
 */
export function SourceContentViewer({
  fileContent,
  filePath,
  isLoading,
  error,
}: SourceContentViewerProps): React.ReactElement {
  // Loading state
  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        data-testid="source-loading"
      >
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading file content...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400"
        data-testid="source-error"
      >
        <FileX className="w-12 h-12 mb-4 text-red-400" />
        <span className="text-red-500">{error}</span>
      </div>
    );
  }

  // No file selected
  if (!filePath || !fileContent) {
    return (
      <div
        className="h-full flex items-center justify-center text-gray-400"
        data-testid="source-no-file"
      >
        Select a file to view its content
      </div>
    );
  }

  // Route to appropriate viewer based on file type
  switch (fileContent.fileType) {
    case 'code':
      return (
        <SourceCodeViewer
          content={fileContent.content}
          language={fileContent.language}
          filePath={filePath}
        />
      );

    case 'markdown':
      return (
        <MarkdownViewer
          content={fileContent.content}
          filePath={filePath}
        />
      );

    case 'image':
      return (
        <ImageViewer
          base64Content={fileContent.content}
          mimeType=""
          filePath={filePath}
        />
      );

    case 'binary':
      return (
        <BinaryFileIndicator filePath={filePath} />
      );

    default:
      // Unknown type - treat as code
      return (
        <SourceCodeViewer
          content={fileContent.content}
          filePath={filePath}
        />
      );
  }
}

export default SourceContentViewer;
