/**
 * WorkflowView Component
 * Main workflow view showing 6 phases with controls
 * Requirements: 1.1-1.4, 3.1-3.5, 6.1-6.6, 7.1-7.6, 9.1-9.3
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { ArrowDown, Play, Square, RefreshCw } from 'lucide-react';
import { useSpecStore } from '../stores/specStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { PhaseItem } from './PhaseItem';
import { ValidateOption } from './ValidateOption';
import { TaskProgressView, type TaskItem } from './TaskProgressView';
import { ArtifactPreview } from './ArtifactPreview';
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

// ============================================================
// Task 7.1-7.6: WorkflowView Component
// Requirements: 1.1-1.4, 3.1-3.5, 6.1-6.6, 7.1-7.6, 9.1-9.3
// ============================================================

export function WorkflowView() {
  const { specDetail, isLoading, selectedSpec } = useSpecStore();
  const workflowStore = useWorkflowStore();
  const agentStore = useAgentStore();

  // Local state for executing phase
  const [executingPhase, setExecutingPhase] = useState<WorkflowPhase | null>(null);
  const [executingValidation, setExecutingValidation] = useState<ValidationType | null>(null);

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
    setExecutingPhase(phase);

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
    } finally {
      setExecutingPhase(null);
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
    setExecutingValidation(type);

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
    } finally {
      setExecutingValidation(null);
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
    // サービス層でコマンドを構築
    const newAgent = await window.electronAPI.executeSpecStatus(
      specDetail.metadata.name,
      specDetail.metadata.name
    );
    // ストアにAgentを追加して選択
    agentStore.addAgent(specDetail.metadata.name, newAgent);
    agentStore.selectAgent(newAgent.agentId);
  }, [agentStore, specDetail]);

  const handleShowAgentLog = useCallback((phase: WorkflowPhase) => {
    // TODO: Show agent log for this phase
    console.log('Show agent log for phase:', phase);
  }, []);

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
              isExecuting={executingPhase === phase}
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
                      isExecuting={executingValidation === type}
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
                <TaskProgressView tasks={parsedTasks} progress={specDetail.taskProgress} />
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

        {/* Artifacts Section */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            成果物
          </h3>
          <ArtifactPreview artifacts={specDetail.artifacts} />
        </div>
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
