/**
 * Resize Handle Component
 * ペイン間のリサイズハンドル
 */

import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    let lastPosition = direction === 'horizontal' ? 0 : 0;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPosition = direction === 'horizontal' ? e.clientX : e.clientY;
      if (lastPosition !== 0) {
        const delta = currentPosition - lastPosition;
        onResize(delta);
      }
      lastPosition = currentPosition;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={clsx(
        'flex-shrink-0 bg-gray-200 dark:bg-gray-800 hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors',
        direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        isDragging && 'bg-blue-500 dark:bg-blue-500'
      )}
    />
  );
}
