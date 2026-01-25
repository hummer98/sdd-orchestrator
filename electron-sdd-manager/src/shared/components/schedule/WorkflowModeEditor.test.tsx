/**
 * WorkflowModeEditor Component Tests
 *
 * Task 6.5: workflowモード設定UIを作成
 * - 有効/無効トグル
 * - suffixモード選択（自動/カスタム）
 * - カスタムsuffix入力
 *
 * Requirements: 8.1, 8.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WorkflowModeEditor } from './WorkflowModeEditor';
import type { ScheduleWorkflowConfig } from '../../types/scheduleTask';

// =============================================================================
// Test Fixtures
// =============================================================================

const createDefaultConfig = (overrides?: Partial<ScheduleWorkflowConfig>): ScheduleWorkflowConfig => ({
  enabled: false,
  suffixMode: 'auto',
  customSuffix: undefined,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('WorkflowModeEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ===========================================================================
  // Requirement 8.1: workflowモード切替
  // ===========================================================================

  describe('Workflow Mode Toggle (Requirement 8.1)', () => {
    it('should render workflow mode toggle', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig()}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      expect(toggle).toBeInTheDocument();
    });

    it('should display toggle in unchecked state when disabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: false })}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should display toggle in checked state when enabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true })}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should call onChange with enabled true when toggling on', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: false })}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      fireEvent.click(toggle);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      );
    });

    it('should call onChange with enabled false when toggling off', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true })}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      fireEvent.click(toggle);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it('should display label for workflow mode', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig()}
          onChange={mockOnChange}
        />
      );

      // Should have a label indicating this is for workflow mode
      expect(screen.getByText('Worktreeモード')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Suffix Mode Selection
  // ===========================================================================

  describe('Suffix Mode Selection', () => {
    it('should hide suffix settings when workflow mode is disabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: false })}
          onChange={mockOnChange}
        />
      );

      // Suffix mode selector should not be visible when workflow mode is disabled
      expect(screen.queryByTestId('suffix-mode-selector')).not.toBeInTheDocument();
    });

    it('should show suffix settings when workflow mode is enabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true })}
          onChange={mockOnChange}
        />
      );

      const suffixSelector = screen.getByTestId('suffix-mode-selector');
      expect(suffixSelector).toBeInTheDocument();
    });

    it('should have auto and custom options', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true })}
          onChange={mockOnChange}
        />
      );

      // Should have both options available
      const autoOption = screen.getByTestId('suffix-mode-auto');
      const customOption = screen.getByTestId('suffix-mode-custom');

      expect(autoOption).toBeInTheDocument();
      expect(customOption).toBeInTheDocument();
    });

    it('should have auto mode selected by default', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'auto' })}
          onChange={mockOnChange}
        />
      );

      const autoOption = screen.getByTestId('suffix-mode-auto');
      expect(autoOption).toBeChecked();
    });

    it('should have custom mode selected when configured', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
        />
      );

      const customOption = screen.getByTestId('suffix-mode-custom');
      expect(customOption).toBeChecked();
    });

    it('should call onChange with suffixMode auto when selecting auto', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
        />
      );

      const autoOption = screen.getByTestId('suffix-mode-auto');
      fireEvent.click(autoOption);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          suffixMode: 'auto',
        })
      );
    });

    it('should call onChange with suffixMode custom when selecting custom', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'auto' })}
          onChange={mockOnChange}
        />
      );

      const customOption = screen.getByTestId('suffix-mode-custom');
      fireEvent.click(customOption);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          suffixMode: 'custom',
        })
      );
    });
  });

  // ===========================================================================
  // Requirement 8.4: カスタムsuffix入力
  // ===========================================================================

  describe('Custom Suffix Input (Requirement 8.4)', () => {
    it('should hide custom suffix input when suffix mode is auto', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'auto' })}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId('custom-suffix-input')).not.toBeInTheDocument();
    });

    it('should show custom suffix input when suffix mode is custom', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('custom-suffix-input');
      expect(input).toBeInTheDocument();
    });

    it('should display existing custom suffix value', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom', customSuffix: 'my-suffix' })}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('custom-suffix-input');
      expect(input).toHaveValue('my-suffix');
    });

    it('should call onChange with customSuffix when input changes', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('custom-suffix-input');
      fireEvent.change(input, { target: { value: 'new-suffix' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          customSuffix: 'new-suffix',
        })
      );
    });

    it('should display hint about date suffix being added', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
        />
      );

      // Should show a hint that date suffix will be added automatically
      expect(screen.getByText(/日時サフィックス/)).toBeInTheDocument();
    });

    it('should show placeholder text in custom suffix input', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('custom-suffix-input');
      expect(input).toHaveAttribute('placeholder');
    });
  });

  // ===========================================================================
  // Disabled State
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable toggle when disabled prop is true', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig()}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      expect(toggle).toBeDisabled();
    });

    it('should disable suffix mode radios when disabled prop is true', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true })}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const autoOption = screen.getByTestId('suffix-mode-auto');
      const customOption = screen.getByTestId('suffix-mode-custom');

      expect(autoOption).toBeDisabled();
      expect(customOption).toBeDisabled();
    });

    it('should disable custom suffix input when disabled prop is true', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom' })}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const input = screen.getByTestId('custom-suffix-input');
      expect(input).toBeDisabled();
    });
  });

  // ===========================================================================
  // Help Text
  // ===========================================================================

  describe('Help Text', () => {
    it('should display description when workflow mode is disabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: false })}
          onChange={mockOnChange}
        />
      );

      // Should show a description explaining what workflow mode does
      expect(screen.getByText(/worktreeとブランチを作成/)).toBeInTheDocument();
    });

    it('should display naming convention info when workflow mode is enabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true })}
          onChange={mockOnChange}
        />
      );

      // Should show information about the naming convention
      // Naming convention is: schedule/{task-name}/{suffix}
      expect(screen.getByText(/schedule\//)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Preserve Other Values
  // ===========================================================================

  describe('Preserve Other Values', () => {
    it('should preserve suffixMode and customSuffix when toggling enabled', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom', customSuffix: 'my-suffix' })}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('workflow-mode-toggle');
      fireEvent.click(toggle);

      expect(mockOnChange).toHaveBeenCalledWith({
        enabled: false,
        suffixMode: 'custom',
        customSuffix: 'my-suffix',
      });
    });

    it('should preserve enabled and customSuffix when changing suffixMode', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'auto', customSuffix: 'my-suffix' })}
          onChange={mockOnChange}
        />
      );

      const customOption = screen.getByTestId('suffix-mode-custom');
      fireEvent.click(customOption);

      expect(mockOnChange).toHaveBeenCalledWith({
        enabled: true,
        suffixMode: 'custom',
        customSuffix: 'my-suffix',
      });
    });

    it('should preserve enabled and suffixMode when changing customSuffix', () => {
      render(
        <WorkflowModeEditor
          value={createDefaultConfig({ enabled: true, suffixMode: 'custom', customSuffix: 'old-suffix' })}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('custom-suffix-input');
      fireEvent.change(input, { target: { value: 'new-suffix' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        enabled: true,
        suffixMode: 'custom',
        customSuffix: 'new-suffix',
      });
    });
  });
});
