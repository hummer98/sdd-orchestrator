/**
 * ResizeHandle Component Tests
 * Requirements: 1.1 - リサイズ完了イベントの追加
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ResizeHandle } from './ResizeHandle';

describe('ResizeHandle', () => {
  it('リサイズ完了時にonResizeEndが呼ばれる', () => {
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();

    const { container } = render(
      <ResizeHandle direction="horizontal" onResize={onResize} onResizeEnd={onResizeEnd} />
    );

    const handle = container.firstChild as HTMLElement;

    // Start dragging
    fireEvent.mouseDown(handle);

    // Simulate mouse move
    fireEvent.mouseMove(document, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 150 });

    // End dragging
    fireEvent.mouseUp(document);

    // onResizeEnd should be called once when mouseup
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
  });

  it('onResizeEndがオプショナル（undefinedでも動作）', () => {
    const onResize = vi.fn();

    const { container } = render(
      <ResizeHandle direction="horizontal" onResize={onResize} />
    );

    const handle = container.firstChild as HTMLElement;

    // Start dragging
    fireEvent.mouseDown(handle);

    // End dragging - should not throw
    expect(() => {
      fireEvent.mouseUp(document);
    }).not.toThrow();
  });

  it('垂直方向でもonResizeEndが正しく呼ばれる', () => {
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();

    const { container } = render(
      <ResizeHandle direction="vertical" onResize={onResize} onResizeEnd={onResizeEnd} />
    );

    const handle = container.firstChild as HTMLElement;

    // Start dragging
    fireEvent.mouseDown(handle);

    // Simulate mouse move (vertical direction uses clientY)
    fireEvent.mouseMove(document, { clientY: 100 });
    fireEvent.mouseMove(document, { clientY: 150 });

    // End dragging
    fireEvent.mouseUp(document);

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
  });

  it('ドラッグ中でないときはonResizeEndが呼ばれない', () => {
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();

    render(
      <ResizeHandle direction="horizontal" onResize={onResize} onResizeEnd={onResizeEnd} />
    );

    // mouseup without prior mousedown on handle
    fireEvent.mouseUp(document);

    expect(onResizeEnd).not.toHaveBeenCalled();
  });

  it('既存のリサイズ機能が維持される', () => {
    const onResize = vi.fn();
    const onResizeEnd = vi.fn();

    const { container } = render(
      <ResizeHandle direction="horizontal" onResize={onResize} onResizeEnd={onResizeEnd} />
    );

    const handle = container.firstChild as HTMLElement;

    // Start dragging
    fireEvent.mouseDown(handle);

    // Simulate mouse move
    fireEvent.mouseMove(document, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 150 });

    // onResize should be called for each move
    expect(onResize).toHaveBeenCalled();

    // End dragging
    fireEvent.mouseUp(document);
  });
});
