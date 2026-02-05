/**
 * MarkdownViewer Component
 * git-view-source-mode Task 8.2, 8.3: Markdown file rendering
 * Requirements: 2.2 (Markdown表示), 2.3 (Markdownレンダリング)
 *
 * Uses @uiw/react-md-editor's preview mode for rendering markdown.
 * This is already a dependency used elsewhere in the project.
 */

import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Eye, Code } from 'lucide-react';
import { MermaidCodeRenderer } from '@shared/components/markdown';

export interface MarkdownViewerProps {
  /** Markdown content to display */
  content: string;
  /** File path for display */
  filePath?: string;
}

/**
 * MarkdownViewer - Display markdown with toggle between rendered and source
 *
 * Features:
 * - Rendered markdown view (default)
 * - Source view toggle
 * - Syntax highlighting in code blocks
 */
export function MarkdownViewer({
  content,
  filePath,
}: MarkdownViewerProps): React.ReactElement {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="h-full flex flex-col" data-testid="markdown-viewer">
      {/* Header with file path and toggle */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
          {filePath || 'Markdown'}
        </span>

        {/* Preview/Source toggle */}
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-md p-0.5">
          <button
            type="button"
            className={`p-1.5 rounded ${
              !showSource
                ? 'bg-white dark:bg-gray-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setShowSource(false)}
            title="Preview"
            aria-label="Preview"
            data-testid="markdown-preview-button"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`p-1.5 rounded ${
              showSource
                ? 'bg-white dark:bg-gray-600 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setShowSource(true)}
            title="Source"
            aria-label="Source"
            data-testid="markdown-source-button"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showSource ? (
          // Source view - plain text with line numbers
          <pre className="p-4 m-0">
            <code className="block font-mono text-sm leading-6">
              {content.split('\n').map((line, index) => (
                <div
                  key={index}
                  className="flex"
                  data-line={index + 1}
                >
                  <span
                    className="select-none pr-4 text-right text-gray-400 dark:text-gray-600"
                    style={{ minWidth: '3ch' }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="whitespace-pre">{line || ' '}</span>
                </div>
              ))}
            </code>
          </pre>
        ) : (
          // Rendered markdown view
          <div className="p-4" data-color-mode="light">
            <MDEditor.Markdown
              source={content}
              components={{
                code: MermaidCodeRenderer,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkdownViewer;
