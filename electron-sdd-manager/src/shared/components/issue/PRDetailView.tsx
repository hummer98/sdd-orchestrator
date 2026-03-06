/**
 * PRDetailView Component
 * Displays PR details: description, file changes, patch diff, CI status, merge UI.
 *
 * github-issue-integration: Task 8.2
 * Requirements: 8.3, 8.4, 8.5
 */

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Loader2,
  GitPullRequest,
  GitMerge,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import type { GitHubPullRequest, PRFile, CIStatus, MergeMethod } from '@shared/types/github';

// =============================================================================
// Types
// =============================================================================

export interface PRDetailViewProps {
  pr: GitHubPullRequest | null;
  files: PRFile[];
  ciStatus: CIStatus | null;
  isLoadingFiles: boolean;
  isLoadingCI: boolean;
  isMerging: boolean;
  onMerge: (prNumber: number, method: MergeMethod) => void;
  className?: string;
}

// =============================================================================
// File status badge styles
// =============================================================================

const FILE_STATUS_STYLES: Record<string, string> = {
  added: 'bg-green-100 text-green-800',
  removed: 'bg-red-100 text-red-800',
  modified: 'bg-yellow-100 text-yellow-800',
  renamed: 'bg-blue-100 text-blue-800',
  copied: 'bg-blue-100 text-blue-800',
  changed: 'bg-yellow-100 text-yellow-800',
  unchanged: 'bg-gray-100 text-gray-800',
};

// =============================================================================
// CI Status icon
// =============================================================================

function CIStatusIcon({ state }: { state: string }): React.ReactElement {
  switch (state) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'failure':
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
}

// =============================================================================
// Component
// =============================================================================

export function PRDetailView({
  pr,
  files,
  ciStatus,
  isLoadingFiles,
  isLoadingCI,
  isMerging,
  onMerge,
  className,
}: PRDetailViewProps): React.ReactElement {
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('merge');

  const handleMerge = useCallback(() => {
    if (!pr) return;
    onMerge(pr.number, mergeMethod);
  }, [pr, mergeMethod, onMerge]);

  // Placeholder
  if (!pr) {
    return (
      <div className={clsx('flex items-center justify-center h-full text-gray-400', className)}>
        PRを選択してください
      </div>
    );
  }

  const isMergeDisabled = isMerging || pr.merged || pr.mergeable === false;

  return (
    <div className={clsx('flex flex-col h-full overflow-y-auto', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2 mb-2">
          {pr.merged ? (
            <GitMerge className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
          ) : (
            <GitPullRequest className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
            #{pr.number}
          </span>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {pr.title}
          </h2>
        </div>

        {/* Branch info */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
            {pr.head.ref}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
            {pr.base.ref}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
          {pr.body}
        </pre>
      </div>

      {/* CI Status */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          CI Status
        </h3>
        {isLoadingCI ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : ciStatus ? (
          <div data-testid="ci-status-indicator" className="space-y-1">
            {ciStatus.statuses.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <CIStatusIcon state={s.state} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {s.context}
                </span>
                <span className="text-xs text-gray-400">
                  {s.description}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div data-testid="ci-status-indicator">
            <p className="text-sm text-gray-400">CIステータスなし</p>
          </div>
        )}
      </div>

      {/* File Changes */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <FileCode className="w-4 h-4" />
          変更ファイル ({files.length})
        </h3>
        {isLoadingFiles ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.filename}
                className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
              >
                {/* File header */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50">
                  <span className={clsx(
                    'px-1.5 py-0.5 text-xs rounded font-medium',
                    FILE_STATUS_STYLES[file.status] ?? 'bg-gray-100 text-gray-800'
                  )}>
                    {file.status}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
                    {file.filename}
                  </span>
                  <div className="flex-1" />
                  <span className="text-xs text-green-600">+{file.additions}</span>
                  <span className="text-xs text-red-600">-{file.deletions}</span>
                </div>

                {/* Patch diff */}
                {file.patch && (
                  <pre className="p-3 text-xs font-mono overflow-x-auto bg-gray-900 text-gray-300 whitespace-pre">
                    {file.patch}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merge Controls */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          マージ
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          マージ成功時、関連IssueのLabelが <span className="font-medium">status:done</span> に更新されます
        </p>

        <div className="flex items-center gap-2">
          <select
            data-testid="merge-method-select"
            value={mergeMethod}
            onChange={(e) => setMergeMethod(e.target.value as MergeMethod)}
            className={clsx(
              'px-2 py-1.5 text-sm rounded',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-700 dark:text-gray-300',
              'border border-gray-200 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          >
            <option value="merge">Merge commit</option>
            <option value="squash">Squash and merge</option>
            <option value="rebase">Rebase and merge</option>
          </select>

          <button
            data-testid="merge-button"
            onClick={handleMerge}
            disabled={isMergeDisabled}
            className={clsx(
              'flex items-center gap-2 px-4 py-1.5 text-sm rounded-md text-white',
              'bg-green-500 hover:bg-green-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          >
            {isMerging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4" />
            )}
            {pr.merged ? 'マージ済み' : 'マージ'}
          </button>
        </div>
      </div>
    </div>
  );
}
