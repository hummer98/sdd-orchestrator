/**
 * AgentBehaviorEditor Component Tests
 *
 * Task 6.6: 他Agent動作中の挙動設定UIを作成
 * - 待機/スキップの選択
 *
 * Requirements: 2.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AgentBehaviorEditor } from './AgentBehaviorEditor';
import type { AgentBehavior } from '../../types/scheduleTask';

// =============================================================================
// Tests
// =============================================================================

describe('AgentBehaviorEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ===========================================================================
  // Requirement 2.2: 他Agent動作中の挙動設定
  // ===========================================================================

  describe('Agent Behavior Selection (Requirement 2.2)', () => {
    it('should render the component with test id', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('agent-behavior-editor')).toBeInTheDocument();
    });

    it('should render behavior selection options (wait/skip)', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      // Both behavior options should have radio buttons
      expect(screen.getByTestId('agent-behavior-wait')).toBeInTheDocument();
      expect(screen.getByTestId('agent-behavior-skip')).toBeInTheDocument();
    });

    it('should display behavior labels in Japanese', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('待機してから実行')).toBeInTheDocument();
      expect(screen.getByText('スキップ')).toBeInTheDocument();
    });

    it('should display section header label', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('他Agent動作中の挙動')).toBeInTheDocument();
    });

    it('should select "wait" behavior when value is "wait"', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('agent-behavior-wait');
      const skipRadio = screen.getByTestId('agent-behavior-skip');

      expect(waitRadio).toBeChecked();
      expect(skipRadio).not.toBeChecked();
    });

    it('should select "skip" behavior when value is "skip"', () => {
      render(
        <AgentBehaviorEditor
          value="skip"
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('agent-behavior-wait');
      const skipRadio = screen.getByTestId('agent-behavior-skip');

      expect(waitRadio).not.toBeChecked();
      expect(skipRadio).toBeChecked();
    });

    it('should call onChange with "wait" when "wait" is selected', () => {
      render(
        <AgentBehaviorEditor
          value="skip"
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('agent-behavior-wait');
      fireEvent.click(waitRadio);

      expect(mockOnChange).toHaveBeenCalledWith('wait');
    });

    it('should call onChange with "skip" when "skip" is selected', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      const skipRadio = screen.getByTestId('agent-behavior-skip');
      fireEvent.click(skipRadio);

      expect(mockOnChange).toHaveBeenCalledWith('skip');
    });

    it('should disable radios when disabled prop is true', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(screen.getByTestId('agent-behavior-wait')).toBeDisabled();
      expect(screen.getByTestId('agent-behavior-skip')).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const skipRadio = screen.getByTestId('agent-behavior-skip');
      fireEvent.click(skipRadio);

      // Should not call onChange when disabled
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should apply custom className', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      const editor = screen.getByTestId('agent-behavior-editor');
      expect(editor).toHaveClass('custom-class');
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have proper radio group name for mutual exclusivity', () => {
      render(
        <AgentBehaviorEditor
          value="wait"
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('agent-behavior-wait') as HTMLInputElement;
      const skipRadio = screen.getByTestId('agent-behavior-skip') as HTMLInputElement;

      // Both radios should have the same name for mutual exclusivity
      expect(waitRadio.name).toBe(skipRadio.name);
      expect(waitRadio.name).toBe('agent-behavior');
    });
  });
});
