/**
 * ImageViewer Component
 * git-view-source-mode Task 7.1: Image preview with zoom/pan
 * Requirements: 3.1 (画像プレビュー), 3.2 (ズーム), 3.3 (パン)
 *
 * Uses react-zoom-pan-pinch for zoom/pan functionality.
 */

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface ImageViewerProps {
  /** Base64 encoded image content */
  base64Content: string;
  /** MIME type (e.g., 'image/png', 'image/jpeg') */
  mimeType: string;
  /** File path for display */
  filePath?: string;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath?: string): string {
  if (!filePath) return 'image/png';

  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'ico':
      return 'image/x-icon';
    default:
      return 'image/png';
  }
}

/**
 * ImageViewer - Display images with zoom/pan capabilities
 *
 * Features:
 * - Zoom in/out via mouse wheel or buttons
 * - Pan via drag
 * - Reset button to restore original view
 * - Checkerboard background for transparency
 */
export function ImageViewer({
  base64Content,
  mimeType,
  filePath,
}: ImageViewerProps): React.ReactElement {
  const actualMimeType = mimeType || getMimeType(filePath);
  const dataUrl = `data:${actualMimeType};base64,${base64Content}`;

  return (
    <div className="h-full flex flex-col" data-testid="image-viewer">
      {/* Header with file path */}
      {filePath && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
            {filePath}
          </span>
        </div>
      )}

      {/* Image content with zoom/pan */}
      <div className="flex-1 overflow-hidden">
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={10}
          wheel={{ step: 0.1 }}
          doubleClick={{ disabled: false, mode: 'toggle' }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Toolbar */}
              <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white dark:bg-gray-800 rounded-md shadow-md p-1">
                <button
                  type="button"
                  onClick={() => zoomIn()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Zoom in"
                  aria-label="Zoom in"
                  data-testid="zoom-in-button"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => zoomOut()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Zoom out"
                  aria-label="Zoom out"
                  data-testid="zoom-out-button"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => resetTransform()}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Reset zoom"
                  aria-label="Reset zoom"
                  data-testid="reset-zoom-button"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Image with checkerboard background */}
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                }}
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  className="flex items-center justify-center min-h-full"
                  style={{
                    // Checkerboard pattern for transparency
                    backgroundImage: `
                      linear-gradient(45deg, #ccc 25%, transparent 25%),
                      linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%),
                      linear-gradient(-45deg, transparent 75%, #ccc 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    backgroundColor: '#fff',
                    padding: '20px',
                  }}
                >
                  <img
                    src={dataUrl}
                    alt={filePath || 'Image preview'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                    data-testid="image-element"
                  />
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
}

export default ImageViewer;
