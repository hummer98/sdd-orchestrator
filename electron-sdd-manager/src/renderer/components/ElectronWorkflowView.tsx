/**
 * ElectronWorkflowView Component
 *
 * Electron版向けワークフロービューのラッパー
 * useElectronWorkflowStateフックを使用して状態を取得し、
 * WorkflowViewCoreにpropsとして渡す
 *
 * workflow-view-unification: 統一されたワークフロービュー
 */

import { useMemo, useState, useCallback } from 'react';
import { WorkflowViewCore } from '@shared/components/workflow';
import { MetricsSummaryPanel } from '@shared/components/metrics';
import { EventLogViewerModal } from '@shared/components/eventLog';
import { TaskProgressView, type TaskItem } from './TaskProgressView';
import { useElectronWorkflowState } from '../hooks/useElectronWorkflowState';
import { useSpecStore } from '../stores/specStore';
import { useMetricsStore } from '../stores/metricsStore';
import type { EventLogEntry, EventLogError } from '@shared/types';

// =============================================================================
// Component
// =============================================================================

export function ElectronWorkflowView(): React.ReactElement {
  const { state, handlers } = useElectronWorkflowState();
  const specDetail = useSpecStore((s) => s.specDetail);
  const currentMetrics = useMetricsStore((s) => s.currentMetrics);

  // Event log modal state
  const [isEventLogModalOpen, setIsEventLogModalOpen] = useState(false);
  const [eventLogEntries, setEventLogEntries] = useState<EventLogEntry[]>([]);
  const [eventLogLoading, setEventLogLoading] = useState(false);
  const [eventLogError, setEventLogError] = useState<EventLogError | null>(null);

  // Handle show event log (override the handler to manage modal state)
  const handleShowEventLog = useCallback(async () => {
    if (!specDetail) return;

    setIsEventLogModalOpen(true);
    setEventLogLoading(true);
    setEventLogError(null);

    try {
      const result = await window.electronAPI.getEventLog(specDetail.metadata.name);
      if (result.ok) {
        setEventLogEntries(result.value);
      } else {
        setEventLogError(result.error);
      }
    } catch (error) {
      setEventLogError({
        type: 'IO_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setEventLogLoading(false);
    }
  }, [specDetail]);

  const handleCloseEventLog = useCallback(() => {
    setIsEventLogModalOpen(false);
  }, []);

  // Override handlers with our event log handler
  const overriddenHandlers = useMemo(() => ({
    ...handlers,
    handleShowEventLog,
  }), [handlers, handleShowEventLog]);

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
        const idMatch = title.match(/^(\d+\.?\d*|\(P\)|[A-Z]+-\d+)\s+(.+)$/);
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

  // Render slots
  const renderMetrics = useCallback(() => (
    <MetricsSummaryPanel metrics={currentMetrics} className="mb-4" />
  ), [currentMetrics]);

  const renderTaskProgress = useCallback(() => {
    if (!specDetail?.taskProgress) return null;
    return (
      <div className="mt-2">
        <TaskProgressView
          tasks={parsedTasks}
          progress={specDetail.taskProgress}
          onExecuteTask={handlers.handleExecuteTask}
          canExecute={state.runningPhases.size === 0}
        />
      </div>
    );
  }, [specDetail?.taskProgress, parsedTasks, handlers.handleExecuteTask, state.runningPhases.size]);

  const renderEventLogModal = useCallback(() => (
    <EventLogViewerModal
      isOpen={isEventLogModalOpen}
      onClose={handleCloseEventLog}
      events={eventLogEntries}
      isLoading={eventLogLoading}
      error={eventLogError}
    />
  ), [isEventLogModalOpen, handleCloseEventLog, eventLogEntries, eventLogLoading, eventLogError]);

  return (
    <WorkflowViewCore
      state={state}
      handlers={overriddenHandlers}
      renderMetrics={renderMetrics}
      renderTaskProgress={renderTaskProgress}
      renderEventLogModal={renderEventLogModal}
    />
  );
}

export default ElectronWorkflowView;
