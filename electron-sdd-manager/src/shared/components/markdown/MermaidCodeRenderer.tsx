/**
 * MermaidCodeRenderer Component
 *
 * Task 2.2: MermaidCodeRendererコンポーネントを実装する
 * Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 4.1, 4.2
 *
 * Custom code renderer for MDEditor that handles mermaid code blocks.
 * - Detects 'language-mermaid' className
 * - Renders mermaid diagrams as SVG
 * - Shows error message and raw code on failure
 * - Passes through non-mermaid code unchanged
 */

import React, { useEffect, useState, useMemo } from 'react';
import { mermaidService, type MermaidResult } from '@shared/services/mermaidService';

// =============================================================================
// Types
// =============================================================================

export interface MermaidCodeRendererProps {
  /** className from MDEditor (e.g., "language-mermaid") */
  className?: string;
  /** Code content as React children */
  children?: React.ReactNode;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if className indicates mermaid language
 */
function isMermaidLanguage(className?: string): boolean {
  return className?.includes('language-mermaid') ?? false;
}

/**
 * Extract text content from React children
 */
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }
  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props.children) {
      return extractTextContent(props.children);
    }
  }
  return '';
}

/**
 * Detect dark mode from DOM
 */
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for data-color-mode attribute on document or parent elements
    const checkDarkMode = () => {
      const colorMode = document.documentElement.getAttribute('data-color-mode') ||
                       document.body.getAttribute('data-color-mode');
      setIsDark(colorMode === 'dark');
    };

    checkDarkMode();

    // Observe changes to data-color-mode attribute
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-color-mode'] });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// =============================================================================
// Component
// =============================================================================

// Counter for generating unique IDs
let mermaidIdCounter = 0;

/**
 * MermaidCodeRenderer - Custom code block renderer for MDEditor
 *
 * Usage with MDEditor:
 * ```tsx
 * <MDEditor
 *   previewOptions={{
 *     components: {
 *       code: MermaidCodeRenderer
 *     }
 *   }}
 * />
 * ```
 *
 * Or with MDEditor.Markdown:
 * ```tsx
 * <MDEditor.Markdown
 *   components={{
 *     code: MermaidCodeRenderer
 *   }}
 * />
 * ```
 */
export function MermaidCodeRenderer({
  className,
  children,
}: MermaidCodeRendererProps): React.ReactElement {
  // Detect dark mode
  const isDarkMode = useDarkMode();

  // Generate unique ID for this mermaid instance
  const uniqueId = useMemo(() => {
    mermaidIdCounter += 1;
    return `mermaid-${mermaidIdCounter}`;
  }, []);

  // State for mermaid rendering
  const [renderResult, setRenderResult] = useState<MermaidResult | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Check if this is mermaid code
  const isMermaid = isMermaidLanguage(className);
  const code = extractTextContent(children);

  // Render mermaid diagram
  useEffect(() => {
    if (!isMermaid) {
      return;
    }

    let cancelled = false;

    const renderMermaid = async () => {
      setIsRendering(true);
      setRenderResult(null);

      const result = await mermaidService.render(code, uniqueId, isDarkMode);

      if (!cancelled) {
        setRenderResult(result);
        setIsRendering(false);
      }
    };

    renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [isMermaid, code, uniqueId, isDarkMode]);

  // Non-mermaid code: pass through as regular code element
  if (!isMermaid) {
    return (
      <code className={className} data-testid="code-block">
        {children}
      </code>
    );
  }

  // Mermaid code: render diagram or show loading/error state

  // Loading state
  if (isRendering || renderResult === null) {
    return (
      <div
        className="mermaid-loading flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-md"
        data-testid="mermaid-loading"
      >
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading diagram...
        </div>
      </div>
    );
  }

  // Error state
  if (!renderResult.success) {
    return (
      <div
        className="mermaid-error border border-red-300 dark:border-red-700 rounded-md overflow-hidden"
        data-testid="mermaid-error"
      >
        {/* Error message */}
        <div
          className="bg-red-50 dark:bg-red-900/30 px-3 py-2 text-red-600 dark:text-red-400 text-sm"
          data-testid="mermaid-error-message"
        >
          <span className="font-medium">Mermaid Error: </span>
          {renderResult.error}
        </div>

        {/* Raw code */}
        <pre
          className="m-0 p-3 bg-gray-50 dark:bg-gray-900 overflow-x-auto"
          data-testid="mermaid-raw-code"
        >
          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
            {renderResult.rawCode}
          </code>
        </pre>
      </div>
    );
  }

  // Success state: render SVG
  return (
    <div
      className="mermaid-diagram overflow-x-auto p-4 bg-white dark:bg-gray-900 rounded-md"
      data-testid="mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: renderResult.svg }}
    />
  );
}

export default MermaidCodeRenderer;
