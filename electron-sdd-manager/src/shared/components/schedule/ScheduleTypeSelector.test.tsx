/**
 * ScheduleTypeSelector Component Tests
 *
 * Task 6.2: スケジュール種別選択UIを作成
 * - 固定/条件の切り替え
 * - 間隔ベース（n時間経過）の設定UI
 * - 曜日ベース（毎週n曜日のn時）の設定UI
 * - アイドルベース（n分経過）の設定UI
 * - 「アイドル後に実行」オプション
 *
 * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { ScheduleTypeSelector } from './ScheduleTypeSelector';
import type { ScheduleCondition } from '../../types/scheduleTask';

// =============================================================================
// Test Fixtures
// =============================================================================

const defaultIntervalSchedule: ScheduleCondition = {
  type: 'interval',
  hoursInterval: 24,
  waitForIdle: false,
};

const defaultWeeklySchedule: ScheduleCondition = {
  type: 'weekly',
  weekdays: [1, 3, 5], // Mon, Wed, Fri
  hourOfDay: 9,
  waitForIdle: false,
};

const defaultIdleSchedule: ScheduleCondition = {
  type: 'idle',
  idleMinutes: 30,
};

// =============================================================================
// Tests
// =============================================================================

describe('ScheduleTypeSelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('should render schedule type selector', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('schedule-type-selector')).toBeInTheDocument();
    });

    it('should render schedule category selector (fixed/conditional)', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('schedule-category-selector')).toBeInTheDocument();
      expect(screen.getByText('固定')).toBeInTheDocument();
      expect(screen.getByText('条件')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Schedule Category Selection (Fixed vs Conditional)
  // ===========================================================================

  describe('Schedule Category Selection', () => {
    it('should show "fixed" as selected when schedule type is interval', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const fixedTab = screen.getByTestId('category-fixed');
      expect(fixedTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show "fixed" as selected when schedule type is weekly', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      const fixedTab = screen.getByTestId('category-fixed');
      expect(fixedTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should show "conditional" as selected when schedule type is idle', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      const conditionalTab = screen.getByTestId('category-conditional');
      expect(conditionalTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to conditional schedule when conditional tab is clicked', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const conditionalTab = screen.getByTestId('category-conditional');
      fireEvent.click(conditionalTab);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'idle',
        idleMinutes: 30, // Default value
      });
    });

    it('should switch to fixed schedule when fixed tab is clicked from conditional', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      const fixedTab = screen.getByTestId('category-fixed');
      fireEvent.click(fixedTab);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'interval',
        hoursInterval: 24, // Default value
        waitForIdle: false,
      });
    });
  });

  // ===========================================================================
  // Requirement 3.1: Interval Schedule (hours since last execution)
  // ===========================================================================

  describe('Interval Schedule (Requirement 3.1)', () => {
    it('should render interval schedule settings when type is interval', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('interval-settings')).toBeInTheDocument();
    });

    it('should display hours interval input with current value', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultIntervalSchedule, hoursInterval: 48 }}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('hours-interval-input');
      expect(input).toHaveValue(48);
    });

    it('should call onChange when hours interval is changed', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('hours-interval-input');
      fireEvent.change(input, { target: { value: '72' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'interval',
        hoursInterval: 72,
        waitForIdle: false,
      });
    });

    it('should render shortcut button for monthly (720 hours)', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const monthlyButton = screen.getByTestId('shortcut-monthly');
      expect(monthlyButton).toBeInTheDocument();
      expect(monthlyButton).toHaveTextContent('月1回');
    });

    it('should render shortcut button for weekly (168 hours)', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const weeklyButton = screen.getByTestId('shortcut-weekly');
      expect(weeklyButton).toBeInTheDocument();
      expect(weeklyButton).toHaveTextContent('週1回');
    });

    it('should set 720 hours when monthly shortcut is clicked', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const monthlyButton = screen.getByTestId('shortcut-monthly');
      fireEvent.click(monthlyButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'interval',
        hoursInterval: 720,
        waitForIdle: false,
      });
    });

    it('should set 168 hours when weekly shortcut is clicked', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const weeklyButton = screen.getByTestId('shortcut-weekly');
      fireEvent.click(weeklyButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'interval',
        hoursInterval: 168,
        waitForIdle: false,
      });
    });

    it('should render fixed schedule type sub-selector', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('fixed-schedule-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('fixed-type-interval')).toBeInTheDocument();
      expect(screen.getByTestId('fixed-type-weekly')).toBeInTheDocument();
    });

    it('should switch from interval to weekly when weekly type is selected', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const weeklyType = screen.getByTestId('fixed-type-weekly');
      fireEvent.click(weeklyType);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'weekly',
        weekdays: [1], // Default: Monday
        hourOfDay: 9, // Default: 9:00
        waitForIdle: false,
      });
    });
  });

  // ===========================================================================
  // Requirement 3.2: Weekly Schedule (day + time)
  // ===========================================================================

  describe('Weekly Schedule (Requirement 3.2)', () => {
    it('should render weekly schedule settings when type is weekly', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('weekly-settings')).toBeInTheDocument();
    });

    it('should render weekday selection with all 7 days', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      const weekdaySelector = screen.getByTestId('weekday-selector');
      expect(weekdaySelector).toBeInTheDocument();

      // Check all 7 days are present
      ['日', '月', '火', '水', '木', '金', '土'].forEach((day) => {
        expect(within(weekdaySelector).getByText(day)).toBeInTheDocument();
      });
    });

    it('should show selected weekdays as checked', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule} // Mon(1), Wed(3), Fri(5) selected
          onChange={mockOnChange}
        />
      );

      // Mon, Wed, Fri should be selected
      expect(screen.getByTestId('weekday-1')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('weekday-3')).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('weekday-5')).toHaveAttribute('data-selected', 'true');

      // Others should not be selected
      expect(screen.getByTestId('weekday-0')).toHaveAttribute('data-selected', 'false');
      expect(screen.getByTestId('weekday-2')).toHaveAttribute('data-selected', 'false');
    });

    it('should allow selecting multiple weekdays', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultWeeklySchedule, weekdays: [1] }} // Only Monday
          onChange={mockOnChange}
        />
      );

      // Click on Tuesday to add it
      const tuesdayButton = screen.getByTestId('weekday-2');
      fireEvent.click(tuesdayButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'weekly',
        weekdays: [1, 2], // Mon + Tue
        hourOfDay: 9,
        waitForIdle: false,
      });
    });

    it('should allow deselecting weekdays', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultWeeklySchedule, weekdays: [1, 3] }} // Mon, Wed
          onChange={mockOnChange}
        />
      );

      // Click on Monday to deselect
      const mondayButton = screen.getByTestId('weekday-1');
      fireEvent.click(mondayButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'weekly',
        weekdays: [3], // Only Wed remains
        hourOfDay: 9,
        waitForIdle: false,
      });
    });

    it('should prevent deselecting the last weekday', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultWeeklySchedule, weekdays: [1] }} // Only Monday
          onChange={mockOnChange}
        />
      );

      // Click on Monday to try to deselect (should be prevented)
      const mondayButton = screen.getByTestId('weekday-1');
      fireEvent.click(mondayButton);

      // onChange should NOT be called because we can't deselect the last day
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should render hour of day selector', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      const hourSelector = screen.getByTestId('hour-of-day-selector');
      expect(hourSelector).toBeInTheDocument();
    });

    it('should display current hour of day', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultWeeklySchedule, hourOfDay: 15 }}
          onChange={mockOnChange}
        />
      );

      const hourSelector = screen.getByTestId('hour-of-day-selector');
      expect(hourSelector).toHaveValue(15);
    });

    it('should call onChange when hour of day is changed', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      const hourSelector = screen.getByTestId('hour-of-day-selector');
      fireEvent.change(hourSelector, { target: { value: '18' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'weekly',
        weekdays: [1, 3, 5],
        hourOfDay: 18,
        waitForIdle: false,
      });
    });
  });

  // ===========================================================================
  // Requirement 3.3: Wait for Idle Option (for fixed schedules)
  // ===========================================================================

  describe('Wait for Idle Option (Requirement 3.3)', () => {
    it('should render wait for idle toggle for interval schedule', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('wait-for-idle-toggle')).toBeInTheDocument();
    });

    it('should render wait for idle toggle for weekly schedule', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('wait-for-idle-toggle')).toBeInTheDocument();
    });

    it('should NOT render wait for idle toggle for idle schedule', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId('wait-for-idle-toggle')).not.toBeInTheDocument();
    });

    it('should show wait for idle as unchecked when waitForIdle is false', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultIntervalSchedule, waitForIdle: false }}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('wait-for-idle-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should show wait for idle as checked when waitForIdle is true', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultIntervalSchedule, waitForIdle: true }}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('wait-for-idle-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should call onChange when wait for idle is toggled on', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultIntervalSchedule, waitForIdle: false }}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('wait-for-idle-toggle');
      fireEvent.click(toggle);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'interval',
        hoursInterval: 24,
        waitForIdle: true,
      });
    });

    it('should call onChange when wait for idle is toggled off', () => {
      render(
        <ScheduleTypeSelector
          value={{ ...defaultIntervalSchedule, waitForIdle: true }}
          onChange={mockOnChange}
        />
      );

      const toggle = screen.getByTestId('wait-for-idle-toggle');
      fireEvent.click(toggle);

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'interval',
        hoursInterval: 24,
        waitForIdle: false,
      });
    });
  });

  // ===========================================================================
  // Requirement 4.1 & 4.2: Idle Schedule (minutes since idle)
  // ===========================================================================

  describe('Idle Schedule (Requirement 4.1, 4.2)', () => {
    it('should render idle schedule settings when type is idle', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('idle-settings')).toBeInTheDocument();
    });

    it('should display idle minutes input with current value', () => {
      render(
        <ScheduleTypeSelector
          value={{ type: 'idle', idleMinutes: 45 }}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('idle-minutes-input');
      expect(input).toHaveValue(45);
    });

    it('should call onChange when idle minutes is changed', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('idle-minutes-input');
      fireEvent.change(input, { target: { value: '60' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        type: 'idle',
        idleMinutes: 60,
      });
    });

    it('should specify that idle time is in minutes', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      // Should have "分" label
      expect(screen.getByText('分')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Disabled State
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      // Category selector should be disabled
      expect(screen.getByTestId('category-fixed')).toBeDisabled();
      expect(screen.getByTestId('category-conditional')).toBeDisabled();

      // Hours input should be disabled
      expect(screen.getByTestId('hours-interval-input')).toBeDisabled();

      // Shortcut buttons should be disabled
      expect(screen.getByTestId('shortcut-monthly')).toBeDisabled();
      expect(screen.getByTestId('shortcut-weekly')).toBeDisabled();

      // Wait for idle toggle should be disabled
      expect(screen.getByTestId('wait-for-idle-toggle')).toBeDisabled();
    });
  });

  // ===========================================================================
  // Validation Constraints
  // ===========================================================================

  describe('Validation Constraints', () => {
    it('should enforce minimum hours interval of 1', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIntervalSchedule}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('hours-interval-input');
      expect(input).toHaveAttribute('min', '1');
    });

    it('should enforce minimum idle minutes of 1', () => {
      render(
        <ScheduleTypeSelector
          value={defaultIdleSchedule}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('idle-minutes-input');
      expect(input).toHaveAttribute('min', '1');
    });

    it('should enforce hour of day range (0-23)', () => {
      render(
        <ScheduleTypeSelector
          value={defaultWeeklySchedule}
          onChange={mockOnChange}
        />
      );

      const hourSelector = screen.getByTestId('hour-of-day-selector');
      expect(hourSelector).toHaveAttribute('min', '0');
      expect(hourSelector).toHaveAttribute('max', '23');
    });
  });
});
