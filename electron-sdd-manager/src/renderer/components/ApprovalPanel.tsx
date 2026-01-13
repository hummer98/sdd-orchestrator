/**
 * ApprovalPanel Component
 * Manages approval status for each phase
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useState } from 'react';
import { CheckCircle, XCircle, Circle, Loader2 } from 'lucide-react';
import { useSpecStore, notify } from '../stores';
import { clsx } from 'clsx';
import type { Phase } from '../types';
import { RejectDialog } from './RejectDialog';

const PHASE_LABELS: Record<Phase, string> = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
};

export function ApprovalPanel() {
  const { selectedSpec, specDetail } = useSpecStore();
  // Note: refreshSpecs is no longer needed - File Watcher auto-updates spec state
  const [isLoading, setIsLoading] = useState<Phase | null>(null);
  const [rejectDialogPhase, setRejectDialogPhase] = useState<Phase | null>(null);

  if (!selectedSpec || !specDetail) {
    return null;
  }

  const { approvals } = specDetail.specJson;

  const handleApprove = async (phase: Phase) => {
    if (!selectedSpec) return;

    setIsLoading(phase);
    try {
      await window.electronAPI.updateApproval(selectedSpec.path, phase, true);
      // File Watcher will auto-update spec state
      notify.success(`${PHASE_LABELS[phase]}を承認しました`);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '承認に失敗しました'
      );
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = (phase: Phase) => {
    setRejectDialogPhase(phase);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectDialogPhase || !selectedSpec) return;

    setIsLoading(rejectDialogPhase);
    try {
      // In a real implementation, you might want to log the rejection reason
      console.log(`Rejected ${rejectDialogPhase}: ${reason}`);
      await window.electronAPI.updateApproval(selectedSpec.path, rejectDialogPhase, false);
      // File Watcher will auto-update spec state
      notify.warning(`${PHASE_LABELS[rejectDialogPhase]}を却下しました`);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '却下に失敗しました'
      );
    } finally {
      setIsLoading(null);
      setRejectDialogPhase(null);
    }
  };

  return (
    <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        承認管理
      </h3>

      <div className="space-y-3">
        {(['requirements', 'design', 'tasks'] as Phase[]).map((phase) => {
          const status = approvals[phase];
          const loading = isLoading === phase;

          return (
            <div
              key={phase}
              className={clsx(
                'flex items-center justify-between p-3 rounded-lg',
                'bg-gray-50 dark:bg-gray-800'
              )}
            >
              <div className="flex items-center gap-2">
                {status.approved ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : status.generated ? (
                  <Circle className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {PHASE_LABELS[phase]}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {status.approved ? (
                  <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
                    承認済
                  </span>
                ) : status.generated ? (
                  <>
                    <button
                      onClick={() => handleApprove(phase)}
                      disabled={loading}
                      className={clsx(
                        'flex items-center gap-1 px-3 py-1 rounded-md text-sm',
                        'bg-green-500 text-white hover:bg-green-600',
                        'disabled:opacity-50'
                      )}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      承認
                    </button>
                    <button
                      onClick={() => handleReject(phase)}
                      disabled={loading}
                      className={clsx(
                        'flex items-center gap-1 px-3 py-1 rounded-md text-sm',
                        'bg-red-500 text-white hover:bg-red-600',
                        'disabled:opacity-50'
                      )}
                    >
                      <XCircle className="w-4 h-4" />
                      却下
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-400 rounded-full">
                    未生成
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reject Dialog */}
      <RejectDialog
        isOpen={rejectDialogPhase !== null}
        phaseName={rejectDialogPhase ? PHASE_LABELS[rejectDialogPhase] : ''}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectDialogPhase(null)}
      />
    </div>
  );
}
