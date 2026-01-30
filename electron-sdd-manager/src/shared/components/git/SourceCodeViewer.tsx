/**
 * SourceCodeViewer Component
 * git-view-source-mode Task 6.1, 6.2, 6.3: Code file syntax highlighting
 * Requirements: 2.1 (コード表示), 2.4 (シンタックスハイライト), 2.5 (行番号表示)
 *
 * Uses refractor for syntax highlighting (already used by react-diff-view).
 */

import { useMemo } from 'react';
import { refractor } from 'refractor';

export interface SourceCodeViewerProps {
  /** File content to display */
  content: string;
  /** Programming language for syntax highlighting (optional) */
  language?: string;
  /** File path for display (optional) */
  filePath?: string;
}

// Refractor AST node types (manually typed for compatibility)
interface RefractorTextNode {
  type: 'text';
  value: string;
}

interface RefractorElementNode {
  type: 'element';
  tagName: string;
  properties?: { className?: string[] };
  children: RefractorNode[];
}

type RefractorNode = RefractorTextNode | RefractorElementNode;

/**
 * Convert refractor AST to React elements
 */
function astToReact(ast: RefractorNode[], key?: string): React.ReactNode {
  return ast.map((node, index) => {
    const nodeKey = key ? `${key}-${index}` : `${index}`;

    if (node.type === 'text') {
      return node.value;
    }

    if (node.type === 'element') {
      const className = node.properties?.className?.join(' ') || '';
      return (
        <span key={nodeKey} className={className}>
          {astToReact(node.children, nodeKey)}
        </span>
      );
    }

    return null;
  });
}

/**
 * SourceCodeViewer - Display code with syntax highlighting and line numbers
 *
 * Features:
 * - Syntax highlighting via refractor
 * - Line numbers
 * - Monospace font
 * - Horizontal scrolling for long lines
 */
export function SourceCodeViewer({
  content,
  language,
  filePath,
}: SourceCodeViewerProps): React.ReactElement {
  // Split content into lines
  const lines = useMemo(() => content.split('\n'), [content]);

  // Apply syntax highlighting if language is specified
  const highlightedLines = useMemo(() => {
    if (!language) {
      // No highlighting - return plain text
      return lines.map((line) => line);
    }

    try {
      // For line-by-line rendering, we'll highlight each line separately
      return lines.map((line) => {
        try {
          const lineAst = refractor.highlight(line, language);
          return astToReact(lineAst.children as RefractorNode[]);
        } catch {
          return line;
        }
      });
    } catch {
      // Language not supported - return plain text
      return lines.map((line) => line);
    }
  }, [language, lines]);

  // Calculate line number width
  const lineNumberWidth = lines.length.toString().length;

  return (
    <div className="h-full flex flex-col" data-testid="source-code-viewer">
      {/* Header with file path */}
      {filePath && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
            {filePath}
          </span>
          {language && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {language}
            </span>
          )}
        </div>
      )}

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-0 m-0">
          <code className="block font-mono text-sm leading-6">
            {highlightedLines.map((lineContent, index) => (
              <div
                key={index}
                className="flex hover:bg-gray-100 dark:hover:bg-gray-800"
                data-line={index + 1}
              >
                {/* Line number */}
                <span
                  className="select-none px-4 py-0 text-right text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
                  style={{ minWidth: `${lineNumberWidth + 2}ch` }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>

                {/* Line content */}
                <span className="px-4 py-0 whitespace-pre overflow-x-auto flex-1">
                  {lineContent || ' '}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default SourceCodeViewer;
