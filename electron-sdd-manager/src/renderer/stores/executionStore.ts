/**
 * Execution Store
 * Manages command execution state and logs
 * Requirements: 5.1-5.8, 8.1-8.8
 */

import { create } from 'zustand';
import type { Phase, LogEntry, CommandOutputEvent } from '../types';

interface ExecutionState {
  isExecuting: boolean;
  currentPhase: Phase | null;
  logs: LogEntry[];
  exitCode: number | null;
  executionTimeMs: number | null;
  error: string | null;
}

interface ExecutionActions {
  executePhase: (phase: Phase, specPath: string, autoApprove: boolean) => Promise<void>;
  executeImpl: (specPath: string, tasks?: string) => Promise<void>;
  executeSpecStatus: (specPath: string) => Promise<void>;
  cancelExecution: () => Promise<void>;
  addLog: (stream: 'stdout' | 'stderr', data: string) => void;
  clearLogs: () => void;
  copyLogs: () => void;
}

type ExecutionStore = ExecutionState & ExecutionActions;

// Generate command for phase execution
function getPhaseCommand(phase: Phase, specName: string, autoApprove: boolean): string {
  const flag = autoApprove ? ' -y' : '';
  switch (phase) {
    case 'requirements':
      return `/kiro:spec-requirements ${specName}${flag}`;
    case 'design':
      return `/kiro:spec-design ${specName}${flag}`;
    case 'tasks':
      return `/kiro:spec-tasks ${specName}${flag}`;
  }
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  // Initial state
  isExecuting: false,
  currentPhase: null,
  logs: [],
  exitCode: null,
  executionTimeMs: null,
  error: null,

  // Actions
  executePhase: async (phase: Phase, specPath: string, autoApprove: boolean) => {
    // Extract spec name from path
    const specName = specPath.split('/').pop() || '';
    const projectPath = specPath.replace(`/.kiro/specs/${specName}`, '');

    set({
      isExecuting: true,
      currentPhase: phase,
      exitCode: null,
      executionTimeMs: null,
      error: null,
    });

    // Set up output listener
    const unsubscribe = window.electronAPI.onCommandOutput((event: CommandOutputEvent) => {
      get().addLog(event.stream, event.data);
    });

    try {
      const command = getPhaseCommand(phase, specName, autoApprove);
      const result = await window.electronAPI.executeCommand(command, projectPath);

      set({
        isExecuting: false,
        currentPhase: null,
        exitCode: result.exitCode,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (error) {
      set({
        isExecuting: false,
        currentPhase: null,
        error: error instanceof Error ? error.message : 'コマンド実行に失敗しました',
      });
    } finally {
      unsubscribe();
    }
  },

  executeImpl: async (specPath: string, tasks?: string) => {
    const specName = specPath.split('/').pop() || '';
    const projectPath = specPath.replace(`/.kiro/specs/${specName}`, '');

    set({
      isExecuting: true,
      currentPhase: null,
      exitCode: null,
      executionTimeMs: null,
      error: null,
    });

    const unsubscribe = window.electronAPI.onCommandOutput((event: CommandOutputEvent) => {
      get().addLog(event.stream, event.data);
    });

    try {
      const command = tasks
        ? `/kiro:spec-impl ${specName} ${tasks}`
        : `/kiro:spec-impl ${specName}`;
      const result = await window.electronAPI.executeCommand(command, projectPath);

      set({
        isExecuting: false,
        exitCode: result.exitCode,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (error) {
      set({
        isExecuting: false,
        error: error instanceof Error ? error.message : '実装実行に失敗しました',
      });
    } finally {
      unsubscribe();
    }
  },

  executeSpecStatus: async (specPath: string) => {
    const specName = specPath.split('/').pop() || '';
    const projectPath = specPath.replace(`/.kiro/specs/${specName}`, '');

    set({
      isExecuting: true,
      currentPhase: null,
      exitCode: null,
      executionTimeMs: null,
      error: null,
    });

    const unsubscribe = window.electronAPI.onCommandOutput((event: CommandOutputEvent) => {
      get().addLog(event.stream, event.data);
    });

    try {
      const command = `/kiro:spec-status ${specName}`;
      const result = await window.electronAPI.executeCommand(command, projectPath);

      set({
        isExecuting: false,
        exitCode: result.exitCode,
        executionTimeMs: result.executionTimeMs,
      });
    } catch (error) {
      set({
        isExecuting: false,
        error: error instanceof Error ? error.message : 'ステータス確認に失敗しました',
      });
    } finally {
      unsubscribe();
    }
  },

  cancelExecution: async () => {
    try {
      await window.electronAPI.cancelExecution();
      set({
        isExecuting: false,
        currentPhase: null,
      });
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
  },

  addLog: (stream: 'stdout' | 'stderr', data: string) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stream,
      data,
      timestamp: Date.now(),
    };

    set((state) => ({
      logs: [...state.logs, entry],
    }));
  },

  clearLogs: () => {
    set({ logs: [], exitCode: null, executionTimeMs: null });
  },

  copyLogs: () => {
    const { logs } = get();
    const text = logs.map((log) => `[${log.stream}] ${log.data}`).join('\n');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((error) => {
        console.error('Failed to copy logs:', error);
      });
    }
  },
}));
