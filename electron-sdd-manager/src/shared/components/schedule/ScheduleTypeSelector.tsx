/**
 * ScheduleTypeSelector Component
 * UI for selecting and configuring schedule types
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

import { useCallback } from 'react';
import { clsx } from 'clsx';
import type {
  ScheduleCondition,
  IntervalSchedule,
  WeeklySchedule,
  IdleSchedule,
} from '../../types/scheduleTask';

// =============================================================================
// Types
// =============================================================================

export interface ScheduleTypeSelectorProps {
  /** Current schedule condition value */
  value: ScheduleCondition;
  /** Called when schedule condition changes */
  onChange: (schedule: ScheduleCondition) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/** Schedule category: fixed (interval/weekly) or conditional (idle) */
type ScheduleCategory = 'fixed' | 'conditional';

/** Fixed schedule type: interval or weekly */
type FixedScheduleType = 'interval' | 'weekly';

// =============================================================================
// Constants
// =============================================================================

/** Day names in Japanese */
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/** Default values for new schedules */
const DEFAULT_INTERVAL_SCHEDULE: IntervalSchedule = {
  type: 'interval',
  hoursInterval: 24,
  waitForIdle: false,
};

const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  type: 'weekly',
  weekdays: [1], // Monday
  hourOfDay: 9,
  waitForIdle: false,
};

const DEFAULT_IDLE_SCHEDULE: IdleSchedule = {
  type: 'idle',
  idleMinutes: 30,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the schedule category from schedule type
 */
function getScheduleCategory(schedule: ScheduleCondition): ScheduleCategory {
  return schedule.type === 'idle' ? 'conditional' : 'fixed';
}

/**
 * Get the fixed schedule type
 */
function getFixedScheduleType(schedule: ScheduleCondition): FixedScheduleType {
  return schedule.type === 'weekly' ? 'weekly' : 'interval';
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
  testId?: string;
}

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  disabled,
  testId,
}: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        'relative inline-flex h-5 w-9 items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        checked
          ? 'bg-blue-500 dark:bg-blue-600'
          : 'bg-gray-300 dark:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// =============================================================================
// Interval Settings Component
// =============================================================================

interface IntervalSettingsProps {
  schedule: IntervalSchedule;
  onChange: (schedule: IntervalSchedule) => void;
  disabled?: boolean;
}

function IntervalSettings({ schedule, onChange, disabled }: IntervalSettingsProps) {
  const handleHoursChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hours = parseInt(e.target.value, 10);
      if (!isNaN(hours)) {
        onChange({
          ...schedule,
          hoursInterval: hours,
        });
      }
    },
    [schedule, onChange]
  );

  const handleShortcutClick = useCallback(
    (hours: number) => {
      onChange({
        ...schedule,
        hoursInterval: hours,
      });
    },
    [schedule, onChange]
  );

  return (
    <div data-testid="interval-settings" className="space-y-3">
      {/* Hours Input */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="hours-interval"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          前回実行から
        </label>
        <input
          id="hours-interval"
          type="number"
          data-testid="hours-interval-input"
          value={schedule.hoursInterval}
          onChange={handleHoursChange}
          disabled={disabled}
          min={1}
          className={clsx(
            'w-20 px-2 py-1 rounded-md text-center',
            'bg-gray-50 dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'border border-gray-200 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          時間経過
        </span>
      </div>

      {/* Shortcut Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="shortcut-monthly"
          onClick={() => handleShortcutClick(720)}
          disabled={disabled}
          className={clsx(
            'px-3 py-1 text-sm rounded-md',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'border border-gray-200 dark:border-gray-600',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            schedule.hoursInterval === 720 && 'ring-2 ring-blue-500'
          )}
        >
          月1回
        </button>
        <button
          type="button"
          data-testid="shortcut-weekly"
          onClick={() => handleShortcutClick(168)}
          disabled={disabled}
          className={clsx(
            'px-3 py-1 text-sm rounded-md',
            'bg-gray-100 dark:bg-gray-800',
            'text-gray-700 dark:text-gray-300',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'border border-gray-200 dark:border-gray-600',
            'transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            schedule.hoursInterval === 168 && 'ring-2 ring-blue-500'
          )}
        >
          週1回
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Weekly Settings Component
// =============================================================================

interface WeeklySettingsProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  disabled?: boolean;
}

function WeeklySettings({ schedule, onChange, disabled }: WeeklySettingsProps) {
  const handleWeekdayToggle = useCallback(
    (day: number) => {
      const isSelected = schedule.weekdays.includes(day);

      if (isSelected) {
        // Prevent deselecting the last day
        if (schedule.weekdays.length === 1) {
          return;
        }
        onChange({
          ...schedule,
          weekdays: schedule.weekdays.filter((d) => d !== day),
        });
      } else {
        const newWeekdays = [...schedule.weekdays, day].sort((a, b) => a - b);
        onChange({
          ...schedule,
          weekdays: newWeekdays,
        });
      }
    },
    [schedule, onChange]
  );

  const handleHourChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hour = parseInt(e.target.value, 10);
      if (!isNaN(hour) && hour >= 0 && hour <= 23) {
        onChange({
          ...schedule,
          hourOfDay: hour,
        });
      }
    },
    [schedule, onChange]
  );

  return (
    <div data-testid="weekly-settings" className="space-y-3">
      {/* Weekday Selector */}
      <div>
        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
          曜日
        </label>
        <div
          data-testid="weekday-selector"
          className="flex gap-1 flex-wrap"
        >
          {DAY_NAMES.map((name, index) => {
            const isSelected = schedule.weekdays.includes(index);
            return (
              <button
                key={index}
                type="button"
                data-testid={`weekday-${index}`}
                data-selected={isSelected}
                onClick={() => handleWeekdayToggle(index)}
                disabled={disabled}
                className={clsx(
                  'w-8 h-8 rounded-md text-sm font-medium',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hour of Day */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="hour-of-day"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          時刻
        </label>
        <input
          id="hour-of-day"
          type="number"
          data-testid="hour-of-day-selector"
          value={schedule.hourOfDay}
          onChange={handleHourChange}
          disabled={disabled}
          min={0}
          max={23}
          className={clsx(
            'w-16 px-2 py-1 rounded-md text-center',
            'bg-gray-50 dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'border border-gray-200 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">時</span>
      </div>
    </div>
  );
}

// =============================================================================
// Idle Settings Component
// =============================================================================

interface IdleSettingsProps {
  schedule: IdleSchedule;
  onChange: (schedule: IdleSchedule) => void;
  disabled?: boolean;
}

function IdleSettings({ schedule, onChange, disabled }: IdleSettingsProps) {
  const handleMinutesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const minutes = parseInt(e.target.value, 10);
      if (!isNaN(minutes)) {
        onChange({
          ...schedule,
          idleMinutes: minutes,
        });
      }
    },
    [schedule, onChange]
  );

  return (
    <div data-testid="idle-settings" className="space-y-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="idle-minutes"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          アイドル状態が
        </label>
        <input
          id="idle-minutes"
          type="number"
          data-testid="idle-minutes-input"
          value={schedule.idleMinutes}
          onChange={handleMinutesChange}
          disabled={disabled}
          min={1}
          className={clsx(
            'w-20 px-2 py-1 rounded-md text-center',
            'bg-gray-50 dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'border border-gray-200 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          分
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          経過したら実行
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ScheduleTypeSelector({
  value,
  onChange,
  disabled = false,
}: ScheduleTypeSelectorProps) {
  const category = getScheduleCategory(value);
  const fixedType = getFixedScheduleType(value);

  // Handle category change
  const handleCategoryChange = useCallback(
    (newCategory: ScheduleCategory) => {
      if (newCategory === category) return;

      if (newCategory === 'conditional') {
        onChange(DEFAULT_IDLE_SCHEDULE);
      } else {
        onChange(DEFAULT_INTERVAL_SCHEDULE);
      }
    },
    [category, onChange]
  );

  // Handle fixed schedule type change
  const handleFixedTypeChange = useCallback(
    (newType: FixedScheduleType) => {
      if (newType === value.type) return;

      if (newType === 'weekly') {
        const currentWaitForIdle = value.type !== 'idle' && value.waitForIdle;
        onChange({
          ...DEFAULT_WEEKLY_SCHEDULE,
          waitForIdle: currentWaitForIdle,
        });
      } else {
        const currentWaitForIdle = value.type !== 'idle' && value.waitForIdle;
        onChange({
          ...DEFAULT_INTERVAL_SCHEDULE,
          waitForIdle: currentWaitForIdle,
        });
      }
    },
    [value, onChange]
  );

  // Handle wait for idle toggle
  const handleWaitForIdleToggle = useCallback(() => {
    if (value.type === 'idle') return;

    onChange({
      ...value,
      waitForIdle: !value.waitForIdle,
    });
  }, [value, onChange]);

  // Handle interval schedule change
  const handleIntervalChange = useCallback(
    (schedule: IntervalSchedule) => {
      onChange(schedule);
    },
    [onChange]
  );

  // Handle weekly schedule change
  const handleWeeklyChange = useCallback(
    (schedule: WeeklySchedule) => {
      onChange(schedule);
    },
    [onChange]
  );

  // Handle idle schedule change
  const handleIdleChange = useCallback(
    (schedule: IdleSchedule) => {
      onChange(schedule);
    },
    [onChange]
  );

  return (
    <div data-testid="schedule-type-selector" className="space-y-4">
      {/* Category Selector (Fixed vs Conditional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          スケジュール種別
        </label>
        <div
          data-testid="schedule-category-selector"
          className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            data-testid="category-fixed"
            aria-selected={category === 'fixed'}
            onClick={() => handleCategoryChange('fixed')}
            disabled={disabled}
            className={clsx(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              category === 'fixed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            固定
          </button>
          <button
            type="button"
            role="tab"
            data-testid="category-conditional"
            aria-selected={category === 'conditional'}
            onClick={() => handleCategoryChange('conditional')}
            disabled={disabled}
            className={clsx(
              'flex-1 px-4 py-2 text-sm font-medium rounded-md',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              category === 'conditional'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            条件
          </button>
        </div>
      </div>

      {/* Fixed Schedule Type Selector (only shown when category is fixed) */}
      {category === 'fixed' && (
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
            タイプ
          </label>
          <div
            data-testid="fixed-schedule-type-selector"
            className="flex gap-2"
          >
            <button
              type="button"
              data-testid="fixed-type-interval"
              onClick={() => handleFixedTypeChange('interval')}
              disabled={disabled}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fixedType === 'interval'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              間隔ベース
            </button>
            <button
              type="button"
              data-testid="fixed-type-weekly"
              onClick={() => handleFixedTypeChange('weekly')}
              disabled={disabled}
              className={clsx(
                'px-3 py-1.5 text-sm rounded-md',
                'transition-colors duration-150',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                fixedType === 'weekly'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              曜日ベース
            </button>
          </div>
        </div>
      )}

      {/* Schedule-specific Settings */}
      <div className="pt-2">
        {value.type === 'interval' && (
          <IntervalSettings
            schedule={value}
            onChange={handleIntervalChange}
            disabled={disabled}
          />
        )}
        {value.type === 'weekly' && (
          <WeeklySettings
            schedule={value}
            onChange={handleWeeklyChange}
            disabled={disabled}
          />
        )}
        {value.type === 'idle' && (
          <IdleSettings
            schedule={value}
            onChange={handleIdleChange}
            disabled={disabled}
          />
        )}
      </div>

      {/* Wait for Idle Toggle (only for fixed schedules) */}
      {category === 'fixed' && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <label
            htmlFor="wait-for-idle"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            アイドル後に実行
          </label>
          <ToggleSwitch
            checked={value.type !== 'idle' && value.waitForIdle}
            onChange={handleWaitForIdleToggle}
            ariaLabel="アイドル後に実行"
            disabled={disabled}
            testId="wait-for-idle-toggle"
          />
        </div>
      )}
    </div>
  );
}

export default ScheduleTypeSelector;
