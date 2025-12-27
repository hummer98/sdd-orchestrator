/**
 * BugActionButtons Component
 * Displays action buttons for bug workflow (Analyze, Fix, Verify)
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState } from 'react';
import { Search, Wrench, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { BugPhase, BugAction, BugMetadata } from '../types';
import { getNextAction, isActionAvailable } from '../types/bug';
import { useAgentStore } from '../stores/agentStore';
import { useNotificationStore } from '../stores/notificationStore';

interface BugActionButtonsProps {
  bug: BugMetadata;
  compact?: boolean;
  onActionStarted?: (action: BugAction) => void;
  onActionCompleted?: (action: BugAction) => void;
}

interface ActionConfig {
  action: BugAction;
  label: string;
  icon: typeof Search;
  command: string;
}

const ACTION_CONFIGS: ActionConfig[] = [
  { action: 'analyze', label: 'Analyze', icon: Search, command: '/kiro:bug-analyze' },
  { action: 'fix', label: 'Fix', icon: Wrench, command: '/kiro:bug-fix' },
  { action: 'verify', label: 'Verify', icon: CheckCircle2, command: '/kiro:bug-verify' },
];

/**
 * BugActionButtons displays action buttons for bug workflow
 * - Shows Analyze, Fix, Verify buttons
 * - Only enables the next available action based on current phase
 * - Shows loading spinner during execution
 * - Sends commands via agentStore
 */
export function BugActionButtons({
  bug,
  compact = false,
  onActionStarted,
  onActionCompleted,
}: BugActionButtonsProps): React.ReactElement {
  const [executingAction, setExecutingAction] = useState<BugAction | null>(null);
  const { startAgent } = useAgentStore();
  const { addNotification } = useNotificationStore();

  const handleAction = async (config: ActionConfig) => {
    if (executingAction) return; // Prevent multiple clicks

    setExecutingAction(config.action);
    onActionStarted?.(config.action);

    try {
      // Start agent with bug workflow command
      // Use bug:{name} format for specId to match BugPane's AgentListPanel filtering
      const agentId = await startAgent(
        `bug:${bug.name}`, // Bug-specific agent with consistent naming
        `bug-${config.action}`, // Phase name
        config.command, // Command to execute
        [bug.name], // Args: bug name
        undefined, // No group
        undefined // No session
      );

      if (agentId) {
        addNotification({
          type: 'info',
          message: `${bug.name}の${config.label}を開始しました`,
          duration: 3000,
        });
        onActionCompleted?.(config.action);
      } else {
        addNotification({
          type: 'error',
          message: `${config.label}エラー: アクションの開始に失敗しました`,
          duration: 5000,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `${config.label}エラー: ${error instanceof Error ? error.message : '不明なエラーが発生しました'}`,
        duration: 5000,
      });
    } finally {
      setExecutingAction(null);
    }
  };

  if (bug.phase === 'verified') {
    // No actions available for verified bugs
    return (
      <div className="text-xs text-green-600 font-medium" data-testid="bug-completed">
        完了
      </div>
    );
  }

  return (
    <div
      className={clsx('flex items-center', compact ? 'gap-1' : 'gap-2')}
      data-testid="bug-action-buttons"
    >
      {ACTION_CONFIGS.map((config) => {
        const isEnabled = isActionAvailable(bug.phase, config.action);
        const isExecuting = executingAction === config.action;
        const Icon = config.icon;

        return (
          <button
            key={config.action}
            onClick={() => handleAction(config)}
            disabled={!isEnabled || executingAction !== null}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
              isEnabled && !executingAction
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              compact && 'px-1.5 py-0.5'
            )}
            title={isEnabled ? `${config.label}を実行` : `${config.label}は現在実行できません`}
            data-testid={`action-${config.action}`}
          >
            {isExecuting ? (
              <Loader2
                className={clsx('animate-spin', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')}
                data-testid={`action-${config.action}-loading`}
              />
            ) : (
              <Icon className={clsx(compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
            )}
            {!compact && <span>{config.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Get the next action label for a given phase
 */
export function getNextActionLabel(phase: BugPhase): string | null {
  const nextAction = getNextAction(phase);
  if (!nextAction) return null;

  const config = ACTION_CONFIGS.find((c) => c.action === nextAction);
  return config?.label || null;
}

export default BugActionButtons;
