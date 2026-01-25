/**
 * AvoidanceRuleEditor Component Tests
 *
 * Task 6.4: AvoidanceRuleEditorを作成
 * - 回避対象の選択（spec-merge, commit, bug-merge, schedule-task）
 * - 回避時挙動の選択（待機/スキップ）
 *
 * Requirements: 6.1, 6.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AvoidanceRuleEditor } from './AvoidanceRuleEditor';
import type { AvoidanceRule, AvoidanceTarget, AvoidanceBehavior } from '../../types/scheduleTask';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockAvoidanceRule = (overrides?: Partial<AvoidanceRule>): AvoidanceRule => ({
  targets: [],
  behavior: 'skip',
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('AvoidanceRuleEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ===========================================================================
  // Requirement 6.1: 回避対象の選択
  // ===========================================================================

  describe('Avoidance Target Selection (Requirement 6.1)', () => {
    it('should render all avoidance target checkboxes', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      // All four targets should have checkboxes
      expect(screen.getByTestId('avoidance-target-spec-merge')).toBeInTheDocument();
      expect(screen.getByTestId('avoidance-target-commit')).toBeInTheDocument();
      expect(screen.getByTestId('avoidance-target-bug-merge')).toBeInTheDocument();
      expect(screen.getByTestId('avoidance-target-schedule-task')).toBeInTheDocument();
    });

    it('should display target labels in Japanese', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      // Labels should be readable Japanese
      expect(screen.getByText('Specマージ')).toBeInTheDocument();
      expect(screen.getByText('コミット')).toBeInTheDocument();
      expect(screen.getByText('Bugマージ')).toBeInTheDocument();
      expect(screen.getByText('他のスケジュールタスク')).toBeInTheDocument();
    });

    it('should check targets that are in the value array', () => {
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge', 'commit'],
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const specMergeCheckbox = screen.getByTestId('avoidance-target-spec-merge');
      const commitCheckbox = screen.getByTestId('avoidance-target-commit');
      const bugMergeCheckbox = screen.getByTestId('avoidance-target-bug-merge');
      const scheduleTaskCheckbox = screen.getByTestId('avoidance-target-schedule-task');

      expect(specMergeCheckbox).toBeChecked();
      expect(commitCheckbox).toBeChecked();
      expect(bugMergeCheckbox).not.toBeChecked();
      expect(scheduleTaskCheckbox).not.toBeChecked();
    });

    it('should call onChange with added target when checkbox is checked', () => {
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge'],
        behavior: 'wait',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const commitCheckbox = screen.getByTestId('avoidance-target-commit');
      fireEvent.click(commitCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        targets: ['spec-merge', 'commit'],
        behavior: 'wait',
      });
    });

    it('should call onChange with removed target when checkbox is unchecked', () => {
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge', 'commit', 'bug-merge'],
        behavior: 'skip',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const commitCheckbox = screen.getByTestId('avoidance-target-commit');
      fireEvent.click(commitCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        targets: ['spec-merge', 'bug-merge'],
        behavior: 'skip',
      });
    });

    it('should disable checkboxes when disabled prop is true', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(screen.getByTestId('avoidance-target-spec-merge')).toBeDisabled();
      expect(screen.getByTestId('avoidance-target-commit')).toBeDisabled();
      expect(screen.getByTestId('avoidance-target-bug-merge')).toBeDisabled();
      expect(screen.getByTestId('avoidance-target-schedule-task')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Requirement 6.2: 回避時挙動の選択
  // ===========================================================================

  describe('Avoidance Behavior Selection (Requirement 6.2)', () => {
    it('should render behavior selection options', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      // Behavior selection UI should exist
      expect(screen.getByTestId('avoidance-behavior-wait')).toBeInTheDocument();
      expect(screen.getByTestId('avoidance-behavior-skip')).toBeInTheDocument();
    });

    it('should display behavior labels in Japanese', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('終了を待って実行')).toBeInTheDocument();
      expect(screen.getByText('スキップ')).toBeInTheDocument();
    });

    it('should select "wait" behavior when value.behavior is "wait"', () => {
      const rule = createMockAvoidanceRule({
        behavior: 'wait',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('avoidance-behavior-wait');
      const skipRadio = screen.getByTestId('avoidance-behavior-skip');

      expect(waitRadio).toBeChecked();
      expect(skipRadio).not.toBeChecked();
    });

    it('should select "skip" behavior when value.behavior is "skip"', () => {
      const rule = createMockAvoidanceRule({
        behavior: 'skip',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('avoidance-behavior-wait');
      const skipRadio = screen.getByTestId('avoidance-behavior-skip');

      expect(waitRadio).not.toBeChecked();
      expect(skipRadio).toBeChecked();
    });

    it('should call onChange with new behavior when "wait" is selected', () => {
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge'],
        behavior: 'skip',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('avoidance-behavior-wait');
      fireEvent.click(waitRadio);

      expect(mockOnChange).toHaveBeenCalledWith({
        targets: ['spec-merge'],
        behavior: 'wait',
      });
    });

    it('should call onChange with new behavior when "skip" is selected', () => {
      const rule = createMockAvoidanceRule({
        targets: ['commit', 'bug-merge'],
        behavior: 'wait',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const skipRadio = screen.getByTestId('avoidance-behavior-skip');
      fireEvent.click(skipRadio);

      expect(mockOnChange).toHaveBeenCalledWith({
        targets: ['commit', 'bug-merge'],
        behavior: 'skip',
      });
    });

    it('should disable behavior radios when disabled prop is true', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      expect(screen.getByTestId('avoidance-behavior-wait')).toBeDisabled();
      expect(screen.getByTestId('avoidance-behavior-skip')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Combined Functionality
  // ===========================================================================

  describe('Combined Functionality', () => {
    it('should preserve behavior when changing targets', () => {
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge'],
        behavior: 'wait',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const bugMergeCheckbox = screen.getByTestId('avoidance-target-bug-merge');
      fireEvent.click(bugMergeCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith({
        targets: ['spec-merge', 'bug-merge'],
        behavior: 'wait', // behavior preserved
      });
    });

    it('should preserve targets when changing behavior', () => {
      const rule = createMockAvoidanceRule({
        targets: ['commit', 'schedule-task'],
        behavior: 'skip',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const waitRadio = screen.getByTestId('avoidance-behavior-wait');
      fireEvent.click(waitRadio);

      expect(mockOnChange).toHaveBeenCalledWith({
        targets: ['commit', 'schedule-task'], // targets preserved
        behavior: 'wait',
      });
    });

    it('should render section header/label', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      // Should have a section header for clarity
      expect(screen.getByTestId('avoidance-rule-editor')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const rule = createMockAvoidanceRule();

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      const editor = screen.getByTestId('avoidance-rule-editor');
      expect(editor).toHaveClass('custom-class');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty targets array', () => {
      const rule = createMockAvoidanceRule({
        targets: [],
        behavior: 'skip',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      // All checkboxes should be unchecked
      expect(screen.getByTestId('avoidance-target-spec-merge')).not.toBeChecked();
      expect(screen.getByTestId('avoidance-target-commit')).not.toBeChecked();
      expect(screen.getByTestId('avoidance-target-bug-merge')).not.toBeChecked();
      expect(screen.getByTestId('avoidance-target-schedule-task')).not.toBeChecked();
    });

    it('should handle all targets selected', () => {
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge', 'commit', 'bug-merge', 'schedule-task'],
        behavior: 'wait',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      // All checkboxes should be checked
      expect(screen.getByTestId('avoidance-target-spec-merge')).toBeChecked();
      expect(screen.getByTestId('avoidance-target-commit')).toBeChecked();
      expect(screen.getByTestId('avoidance-target-bug-merge')).toBeChecked();
      expect(screen.getByTestId('avoidance-target-schedule-task')).toBeChecked();
    });

    it('should not call onChange when clicking already checked checkbox with same value', () => {
      // This test ensures toggling works correctly - clicking unchecks
      const rule = createMockAvoidanceRule({
        targets: ['spec-merge'],
        behavior: 'skip',
      });

      render(
        <AvoidanceRuleEditor
          value={rule}
          onChange={mockOnChange}
        />
      );

      const specMergeCheckbox = screen.getByTestId('avoidance-target-spec-merge');
      fireEvent.click(specMergeCheckbox);

      // Should remove spec-merge from targets
      expect(mockOnChange).toHaveBeenCalledWith({
        targets: [],
        behavior: 'skip',
      });
    });
  });
});
