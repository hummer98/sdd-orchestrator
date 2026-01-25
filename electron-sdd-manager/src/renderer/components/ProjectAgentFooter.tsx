/**
 * ProjectAgentFooter Component
 * Footer with release button for ProjectAgentPanel
 * project-agent-release-footer: Task 1.1, 1.2
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 *
 * schedule-task-execution: Task 8.1
 * - タイマーアイコンを追加し、クリックでScheduleTaskSettingViewを表示
 * - Requirements: 1.1 (タイマーアイコンクリックでダイアログ表示)
 */

import { Bot, Clock } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Props for ProjectAgentFooter
 * Requirements: 1.2, Task 1.2
 * Task 8.1: Added onScheduleTaskClick prop
 */
export interface ProjectAgentFooterProps {
  /** releaseボタンのクリックハンドラ */
  onRelease: () => void;
  /** release Agentが実行中かどうか */
  isReleaseRunning: boolean;
  /** 現在選択中のプロジェクトパス（null/undefinedの場合はボタンdisabled） */
  currentProject?: string | null;
  /** スケジュールタスクボタンのクリックハンドラ (Task 8.1) */
  onScheduleTaskClick?: () => void;
}

/**
 * Determine the tooltip text for disabled button
 * Requirements: 3.2
 * @param isReleaseRunning - Whether release Agent is running
 * @param currentProject - Current project path
 * @returns Tooltip text or null if enabled
 */
function getDisabledTooltip(
  isReleaseRunning: boolean,
  currentProject: string | null | undefined
): string | null {
  if (isReleaseRunning) {
    return 'release実行中';
  }
  if (!currentProject) {
    return 'プロジェクト未選択';
  }
  return null;
}

/**
 * ProjectAgentFooter Component
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 * Task 8.1: タイマーアイコン追加
 */
export function ProjectAgentFooter({
  onRelease,
  isReleaseRunning,
  currentProject,
  onScheduleTaskClick,
}: ProjectAgentFooterProps): React.ReactElement {
  // Task 1.2: Determine disabled state for release button
  // Requirements: 3.1 - Disabled when isReleaseRunning is true or currentProject is not set
  const isReleaseDisabled = isReleaseRunning || !currentProject;

  // Task 8.1: Schedule task button is disabled when no project is selected
  const isScheduleTaskDisabled = !currentProject;

  // Requirements: 3.2 - Tooltip showing the reason for disabled state
  const releaseTooltip = getDisabledTooltip(isReleaseRunning, currentProject);
  const scheduleTaskTooltip = !currentProject ? 'プロジェクト未選択' : undefined;

  return (
    <div
      data-testid="project-agent-footer"
      className={clsx(
        'p-4 border-t border-gray-200 dark:border-gray-700',
        'flex items-center gap-2',
        'shrink-0' // Task 2.1: Fixed position footer (doesn't shrink when content overflows)
      )}
    >
      {/* Task 8.1: Schedule Task Timer Icon Button */}
      {/* Requirement 1.1: タイマーアイコンクリックでScheduleTaskSettingViewダイアログを表示 */}
      <button
        data-testid="schedule-task-button"
        onClick={onScheduleTaskClick}
        disabled={isScheduleTaskDisabled}
        title={scheduleTaskTooltip}
        aria-label="スケジュールタスク設定"
        className={clsx(
          'p-2 rounded-md transition-colors',
          isScheduleTaskDisabled
            ? 'text-gray-400 cursor-not-allowed dark:text-gray-500'
            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-gray-800'
        )}
      >
        <Clock className="w-4 h-4" />
      </button>

      {/* Requirements 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3: Release Button */}
      <button
        data-testid="release-button"
        onClick={onRelease}
        disabled={isReleaseDisabled}
        title={releaseTooltip ?? undefined}
        className={clsx(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md',
          'text-sm font-medium transition-colors',
          // Requirements: 3.3 - Disabled visual styling
          isReleaseDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        )}
      >
        <Bot className="w-4 h-4" />
        <span>release</span>
      </button>
    </div>
  );
}
