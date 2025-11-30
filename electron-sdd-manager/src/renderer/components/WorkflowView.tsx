/**
 * WorkflowView Component
 * Main workflow view showing 6 phases with controls
 * Requirements: 1.1-1.4, 3.1-3.5, 5.2-5.8, 6.1-6.6, 7.1-7.6, 9.1-9.3
 */

import { useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowDown, Play, Square, RefreshCw, AlertCircle, RefreshCcw, Loader2, CheckCircle } from 'lucide-react';
import { useSpecStore, type ImplTaskStatus } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { notify } from '../stores';
import { PhaseItem } from './PhaseItem';
import { ValidateOption } from './ValidateOption';
import { TaskProgressView, type TaskItem } from './TaskProgressView';
import {
  WORKFLOW_PHASES,
  PHASE_LABELS,
  VALIDATION_LABELS,
  getPhaseStatus,
  type WorkflowPhase,
  type PhaseStatus,
  type ValidationType,
  type ExtendedSpecJson,
} from '../types/workflow';

/** Maximum continue retries - should match MAX_CONTINUE_RETRIES in specManagerService */
const MAX_CONTINUE_RETRIES = 2;

// ============================================================
// Task 7.1-7.6: WorkflowView Component
// Requirements: 1.1-1.4, 3.1-3.5, 6.1-6.6, 7.1-7.6, 9.1-9.3
// ============================================================

export function WorkflowView() {
  const { specDetail, isLoading, selectedSpec, specManagerExecution, clearSpecManagerError } = useSpecStore();
  const workflowStore = useWorkflowStore();
  const agentStore = useAgentStore();


  // All hooks must be called before any conditional returns
  const specJson = specDetail?.specJson as ExtendedSpecJson | undefined;

  // Calculate phase statuses
  const phaseStatuses = useMemo(() => {
    if (!specJson) return {} as Record<WorkflowPhase, PhaseStatus>;
    const statuses: Record<WorkflowPhase, PhaseStatus> = {} as Record<WorkflowPhase, PhaseStatus>;
    for (const phase of WORKFLOW_PHASES) {
      statuses[phase] = getPhaseStatus(phase, specJson);
    }
    // タスク進捗100%の場合、implフェーズをapprovedにする
    if (specDetail?.taskProgress?.percentage === 100) {
      statuses.impl = 'approved';
    }
    return statuses;
  }, [specJson, specDetail?.taskProgress?.percentage]);

  // 現在のspecで実行中のフェーズ/バリデーションを取得
  const runningPhases = useMemo(() => {
    if (!specDetail) return new Set<string>();
    const agents = agentStore.getAgentsForSpec(specDetail.metadata.name);
    const running = agents
      .filter((a) => a.status === 'running')
      .map((a) => a.phase);
    return new Set(running);
  }, [agentStore.agents, specDetail]);

  // 現在のspec内で実行中のグループを取得（validate/implのコンフリクト判定用）
  type ExecutionGroup = 'doc' | 'validate' | 'impl';
  const runningGroupInSpec = useMemo((): ExecutionGroup | null => {
    if (!specDetail) return null;
    const agents = agentStore.getAgentsForSpec(specDetail.metadata.name);
    const runningAgents = agents.filter((a) => a.status === 'running');

    // フェーズからグループを判定
    for (const agent of runningAgents) {
      if (agent.phase.startsWith('validate-')) return 'validate';
      if (agent.phase.startsWith('impl') || agent.phase === 'impl') return 'impl';
      if (['requirements', 'design', 'tasks', 'status'].includes(agent.phase)) return 'doc';
    }
    return null;
  }, [agentStore.agents, specDetail]);

  // バリデーションが実行可能かどうかを判定
  const canExecuteValidation = useCallback(
    (_type: ValidationType): boolean => {
      // 同じspec内で既にAgentが実行中なら不可
      if (runningPhases.size > 0) return false;
      // 同じspec内でimplグループが実行中なら不可（グループコンフリクト）
      if (runningGroupInSpec === 'impl') return false;
      return true;
    },
    [runningPhases, runningGroupInSpec]
  );

  // フェーズが実行可能かどうかを判定
  const canExecutePhase = useCallback(
    (phase: WorkflowPhase): boolean => {
      // 同じspec内で既にAgentが実行中なら不可
      if (runningPhases.size > 0) return false;

      // implフェーズの場合、同じspec内でvalidateグループが実行中なら不可
      if (phase === 'impl' && runningGroupInSpec === 'validate') return false;

      const index = WORKFLOW_PHASES.indexOf(phase);
      if (index === 0) return true; // requirements は常に実行可能

      // 前のフェーズが approved でなければ不可
      const prevPhase = WORKFLOW_PHASES[index - 1];
      return phaseStatuses[prevPhase] === 'approved';
    },
    [runningPhases, runningGroupInSpec, phaseStatuses]
  );

  // Parse tasks from tasks.md
  const parsedTasks: TaskItem[] = useMemo(() => {
    const content = specDetail?.artifacts.tasks?.content;
    if (!content) return [];

    const tasks: TaskItem[] = [];
    const lines = content.split('\n');
    const taskRegex = /^-\s*\[([ xX])\]\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(taskRegex);
      if (match) {
        const isCompleted = match[1].toLowerCase() === 'x';
        const title = match[2].trim();
        // Extract task ID if present (e.g., "1.1 Task name" or "(P) Task name")
        const idMatch = title.match(/^(\d+\.?\d*|\(P\))\s+(.+)$/);
        const id = idMatch ? idMatch[1] : `task-${tasks.length + 1}`;
        const taskTitle = idMatch ? idMatch[2] : title;

        tasks.push({
          id,
          title: taskTitle,
          status: isCompleted ? 'completed' : 'pending',
        });
      }
    }
    return tasks;
  }, [specDetail?.artifacts.tasks?.content]);

  // Get previous phase status
  const getPreviousStatus = (phase: WorkflowPhase): PhaseStatus | null => {
    const index = WORKFLOW_PHASES.indexOf(phase);
    if (index <= 0) return null;
    return phaseStatuses[WORKFLOW_PHASES[index - 1]];
  };

  // Handlers
  const handleExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;

    try {
      // サービス層でコマンドを構築
      const newAgent = await window.electronAPI.executePhase(
        specDetail.metadata.name,
        phase,
        specDetail.metadata.name
      );
      // ストアにAgentを追加して選択
      agentStore.addAgent(specDetail.metadata.name, newAgent);
      agentStore.selectAgent(newAgent.agentId);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'フェーズの実行に失敗しました');
    }
  }, [agentStore, specDetail]);

  const handleApprovePhase = useCallback(async (phase: WorkflowPhase) => {
    if (!specDetail) return;
    // Update approval in spec.json via IPC
    try {
      await window.electronAPI.updateApproval(
        specDetail.metadata.path,
        phase as 'requirements' | 'design' | 'tasks',
        true
      );
      // Refresh spec detail
      useSpecStore.getState().selectSpec(specDetail.metadata);
    } catch (error) {
      console.error('Failed to approve phase:', error);
    }
  }, [specDetail]);

  const handleApproveAndExecutePhase = useCallback(async (phase: WorkflowPhase) => {
    const previousPhase = WORKFLOW_PHASES[WORKFLOW_PHASES.indexOf(phase) - 1];
    if (previousPhase) {
      await handleApprovePhase(previousPhase);
    }
    await handleExecutePhase(phase);
  }, [handleApprovePhase, handleExecutePhase]);

  const handleExecuteValidation = useCallback(async (type: ValidationType) => {
    if (!specDetail) return;

    try {
      // サービス層でコマンドを構築
      const newAgent = await window.electronAPI.executeValidation(
        specDetail.metadata.name,
        type,
        specDetail.metadata.name
      );
      // ストアにAgentを追加して選択
      agentStore.addAgent(specDetail.metadata.name, newAgent);
      agentStore.selectAgent(newAgent.agentId);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'バリデーションの実行に失敗しました');
    }
  }, [agentStore, specDetail]);

  const handleAutoExecution = useCallback(() => {
    if (workflowStore.isAutoExecuting) {
      workflowStore.stopAutoExecution();
    } else {
      workflowStore.startAutoExecution();
      // TODO: Implement auto execution loop
    }
  }, [workflowStore]);

  const handleSpecStatus = useCallback(async () => {
    if (!specDetail) return;

    try {
      // サービス層でコマンドを構築
      const newAgent = await window.electronAPI.executeSpecStatus(
        specDetail.metadata.name,
        specDetail.metadata.name
      );
      // ストアにAgentを追加して選択
      agentStore.addAgent(specDetail.metadata.name, newAgent);
      agentStore.selectAgent(newAgent.agentId);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'spec-statusの実行に失敗しました');
    }
  }, [agentStore, specDetail]);

  const handleShowAgentLog = useCallback((phase: WorkflowPhase) => {
    // TODO: Show agent log for this phase
    console.log('Show agent log for phase:', phase);
  }, []);

  const handleExecuteTask = useCallback(async (taskId: string) => {
    if (!specDetail) return;

    try {
      // サービス層でコマンドを構築: /kiro:spec-impl {featureName} {taskId}
      const newAgent = await window.electronAPI.executeTaskImpl(
        specDetail.metadata.name,
        specDetail.metadata.name,
        taskId
      );
      // ストアにAgentを追加して選択
      agentStore.addAgent(specDetail.metadata.name, newAgent);
      agentStore.selectAgent(newAgent.agentId);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'タスク実装の実行に失敗しました');
    }
  }, [agentStore, specDetail]);

  // Validation options positions
  const validationPositions: Record<ValidationType, { after: WorkflowPhase }> = {
    gap: { after: 'requirements' },
    design: { after: 'design' },
    impl: { after: 'impl' },
  };

  // Handle empty and loading states (after all hooks)
  if (!selectedSpec) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        仕様を選択してください
      </div>
    );
  }

  if (isLoading || !specDetail || !specJson) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workflow Phases */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {WORKFLOW_PHASES.map((phase, index) => (
          <div key={phase}>
            {/* Phase Item */}
            <PhaseItem
              phase={phase}
              label={PHASE_LABELS[phase]}
              status={phaseStatuses[phase]}
              previousStatus={getPreviousStatus(phase)}
              autoExecutionPermitted={workflowStore.autoExecutionPermissions[phase]}
              isExecuting={runningPhases.has(phase)}
              canExecute={canExecutePhase(phase)}
              onExecute={() => handleExecutePhase(phase)}
              onApprove={() => handleApprovePhase(phase)}
              onApproveAndExecute={() => handleApproveAndExecutePhase(phase)}
              onToggleAutoPermission={() => workflowStore.toggleAutoPermission(phase)}
              onShowAgentLog={() => handleShowAgentLog(phase)}
            />

            {/* Validation Option (between phases) */}
            {Object.entries(validationPositions).map(([type, pos]) => {
              if (pos.after === phase) {
                return (
                  <div key={type} className="my-2">
                    <ValidateOption
                      type={type as ValidationType}
                      label={VALIDATION_LABELS[type as ValidationType]}
                      enabled={workflowStore.validationOptions[type as ValidationType]}
                      isExecuting={runningPhases.has(`validate-${type}`)}
                      canExecute={canExecuteValidation(type as ValidationType)}
                      onToggle={() => workflowStore.toggleValidationOption(type as ValidationType)}
                      onExecute={() => handleExecuteValidation(type as ValidationType)}
                    />
                  </div>
                );
              }
              return null;
            })}

            {/* Task Progress (for impl phase) */}
            {phase === 'impl' && specDetail.taskProgress && (
              <div className="mt-2 ml-4">
                <TaskProgressView
                  tasks={parsedTasks}
                  progress={specDetail.taskProgress}
                  onExecuteTask={handleExecuteTask}
                  canExecute={runningPhases.size === 0 && runningGroupInSpec !== 'validate'}
                />
              </div>
            )}

            {/* Connector Arrow */}
            {index < WORKFLOW_PHASES.length - 1 && (
              <div
                data-testid="phase-connector"
                className="flex justify-center py-1"
              >
                <ArrowDown className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {/* spec-manager Execution Status Display */}
        {/* Requirements: 5.2-5.8 */}
        <SpecManagerStatusDisplay
          execution={specManagerExecution}
          onClearError={clearSpecManagerError}
        />

      </div>

      {/* Footer Buttons */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          onClick={handleAutoExecution}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded',
            'font-medium transition-colors',
            workflowStore.isAutoExecuting
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          )}
        >
          {workflowStore.isAutoExecuting ? (
            <>
              <Square className="w-4 h-4" />
              停止
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              自動実行
            </>
          )}
        </button>

        <button
          onClick={handleSpecStatus}
          className={clsx(
            'flex items-center justify-center gap-2 px-4 py-2 rounded',
            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
            'hover:bg-gray-300 dark:hover:bg-gray-600',
            'font-medium transition-colors'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          spec-status
        </button>
      </div>
    </div>
  );
}

// ============================================================
// spec-manager Status Display Component
// Requirements: 5.2, 5.3, 5.4, 5.5, 5.7, 5.8
// ============================================================

interface SpecManagerStatusDisplayProps {
  execution: {
    isRunning: boolean;
    currentPhase: string | null;
    currentSpecId: string | null;
    lastCheckResult: { completedTasks: readonly string[] } | null;
    error: string | null;
    implTaskStatus: ImplTaskStatus | null;
    retryCount: number;
    executionMode: 'auto' | 'manual' | null;
  };
  onClearError: () => void;
}

function SpecManagerStatusDisplay({ execution, onClearError }: SpecManagerStatusDisplayProps) {
  const { isRunning, implTaskStatus, error, retryCount, lastCheckResult } = execution;

  // No status to display
  if (!isRunning && !implTaskStatus && !error) {
    return null;
  }

  return (
    <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      {/* Running State */}
      {isRunning && implTaskStatus === 'running' && (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>実行中...</span>
        </div>
      )}

      {/* Continuing State (Retry) */}
      {/* Requirements: 5.7 */}
      {implTaskStatus === 'continuing' && (
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <RefreshCcw className="w-4 h-4 animate-spin" />
          <span>継続処理中...(リトライ {retryCount}/{MAX_CONTINUE_RETRIES})</span>
        </div>
      )}

      {/* Success State */}
      {/* Requirements: 5.4 */}
      {implTaskStatus === 'success' && lastCheckResult && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span>完了</span>
          </div>
          {lastCheckResult.completedTasks.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              完了したタスク: {lastCheckResult.completedTasks.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Stalled State */}
      {/* Requirements: 5.8 */}
      {implTaskStatus === 'stalled' && (
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <AlertCircle className="w-4 h-4" />
          <span>完了確認できず - 手動確認が必要</span>
        </div>
      )}

      {/* Error State */}
      {/* Requirements: 5.5 */}
      {(implTaskStatus === 'error' || error) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>エラー</span>
          </div>
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
          <button
            onClick={onClearError}
            className={clsx(
              'flex items-center gap-2 px-3 py-1 text-sm rounded',
              'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50',
              'text-red-700 dark:text-red-400',
              'transition-colors'
            )}
          >
            <RefreshCcw className="w-3 h-3" />
            再実行
          </button>
        </div>
      )}
    </div>
  );
}
