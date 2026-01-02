/**
 * PhaseExecutionPanel Component
 * Controls for executing SDD phases
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { useState } from 'react';
import { Play, Loader2, Lock, CheckCircle, Code, ClipboardList } from 'lucide-react';
import { useSpecStore, useExecutionStore, useAgentStore, notify } from '../stores';
import { clsx } from 'clsx';
import type { Phase } from '../types';

interface PhaseConfig {
  phase: Phase | 'impl';
  label: string;
  icon: React.ReactNode;
  prerequisite: Phase | null;
}

const PHASES: PhaseConfig[] = [
  {
    phase: 'requirements',
    label: '要件定義',
    icon: <Play className="w-4 h-4" />,
    prerequisite: null,
  },
  {
    phase: 'design',
    label: '設計',
    icon: <Play className="w-4 h-4" />,
    prerequisite: 'requirements',
  },
  {
    phase: 'tasks',
    label: 'タスク',
    icon: <Play className="w-4 h-4" />,
    prerequisite: 'design',
  },
  {
    phase: 'impl',
    label: '実装',
    icon: <Code className="w-4 h-4" />,
    prerequisite: 'tasks',
  },
];

export function PhaseExecutionPanel() {
  const { selectedSpec, specDetail, refreshSpecs } = useSpecStore();
  const { isExecuting, currentPhase, executePhase, executeImpl } = useExecutionStore();
  const { startAgent, loadAgents, selectAgent } = useAgentStore();
  const [autoApprove, setAutoApprove] = useState(false);
  const [isStatusRunning, setIsStatusRunning] = useState(false);

  if (!selectedSpec || !specDetail) {
    return null;
  }

  const { approvals } = specDetail.specJson;

  const isPhaseEnabled = (_phase: Phase | 'impl', prerequisite: Phase | null): boolean => {
    if (prerequisite === null) return true;
    return approvals[prerequisite].approved;
  };

  const isPhaseCompleted = (phase: Phase | 'impl'): boolean => {
    if (phase === 'impl') return false;
    return approvals[phase].approved;
  };

  const handleExecute = async (phaseConfig: PhaseConfig) => {
    if (!selectedSpec) return;

    try {
      if (phaseConfig.phase === 'impl') {
        await executeImpl(selectedSpec.path);
      } else {
        await executePhase(phaseConfig.phase, selectedSpec.path, autoApprove);
      }

      await refreshSpecs();
      notify.success(`${phaseConfig.label}フェーズを完了しました`);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : `${phaseConfig.label}フェーズの実行に失敗しました`
      );
    }
  };

  const handleSpecStatus = async () => {
    if (!selectedSpec) return;

    const specName = selectedSpec.name;
    setIsStatusRunning(true);

    try {
      // Use startAgent to run spec-status via claude agent
      // Base flags (-p, --output-format stream-json, --verbose) are added by specManagerService
      console.log('[PhaseExecutionPanel] Starting agent for spec:', specName);
      const agentId = await startAgent(
        specName,           // specId
        'status',           // phase
        'claude',           // command
        [`/kiro:spec-status ${specName}`],  // args (base flags added by service)
        'doc'               // group
      );
      console.log('[PhaseExecutionPanel] startAgent returned agentId:', agentId);
      // Refresh agent list to show the new agent
      await loadAgents();
      // Select the new agent to show its logs
      if (agentId) {
        console.log('[PhaseExecutionPanel] Selecting agent:', agentId);
        selectAgent(agentId);
      } else {
        console.warn('[PhaseExecutionPanel] No agentId returned from startAgent');
      }
      notify.success('spec-status Agentを開始しました');
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'spec-status実行に失敗しました'
      );
    } finally {
      setIsStatusRunning(false);
    }
  };

  return (
    <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        フェーズ実行
      </h3>

      {/* Auto-approve toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="auto-approve"
          checked={autoApprove}
          onChange={(e) => setAutoApprove(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label
          htmlFor="auto-approve"
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          自動承認 (-y)
        </label>
      </div>

      {/* Phase buttons */}
      <div className="grid grid-cols-2 gap-2">
        {PHASES.map((phaseConfig) => {
          const enabled = isPhaseEnabled(phaseConfig.phase, phaseConfig.prerequisite);
          const completed = isPhaseCompleted(phaseConfig.phase);
          const isCurrentPhase = currentPhase === phaseConfig.phase;

          return (
            <button
              key={phaseConfig.phase}
              onClick={() => handleExecute(phaseConfig)}
              disabled={!enabled || isExecuting}
              title={
                !enabled
                  ? `${phaseConfig.prerequisite ? `${phaseConfig.prerequisite}フェーズの承認が必要です` : ''}`
                  : ''
              }
              className={clsx(
                'flex items-center justify-center gap-2 px-4 py-2 rounded-md',
                'transition-colors text-sm font-medium',
                enabled
                  ? completed
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                isExecuting && !isCurrentPhase && 'opacity-50'
              )}
            >
              {isCurrentPhase && isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !enabled ? (
                <Lock className="w-4 h-4" />
              ) : completed ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                phaseConfig.icon
              )}
              {phaseConfig.label}
            </button>
          );
        })}
      </div>

      {/* Spec Status button */}
      <button
        onClick={handleSpecStatus}
        disabled={isStatusRunning}
        className={clsx(
          'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md',
          'transition-colors text-sm font-medium',
          'bg-purple-500 text-white hover:bg-purple-600',
          isStatusRunning && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isStatusRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ClipboardList className="w-4 h-4" />
        )}
        spec-status実行
      </button>
    </div>
  );
}
