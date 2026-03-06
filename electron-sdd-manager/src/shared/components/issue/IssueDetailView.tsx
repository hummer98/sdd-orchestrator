/**
 * IssueDetailView Component
 * Displays Issue details: body, comments, labels, assignees, implementation mode.
 *
 * github-issue-integration: Task 7.3
 * Requirements: 2.4, 2.5, 5.3
 */

import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { GitBranch, GitPullRequest, User, Tag, Milestone, MessageSquare } from 'lucide-react';
import { StatusLabelBadge } from './StatusLabelBadge';
import type { GitHubIssue, GitHubComment, StatusLabel } from '@shared/types/github';

// =============================================================================
// Types
// =============================================================================

export interface IssueDetailViewProps {
  issue: GitHubIssue | null;
  comments: GitHubComment[];
  projectPath?: string;
  onStartImplementation: (issueNumber: number, mode: 'worktree' | 'direct') => void;
  onCreatePR: (issueNumber: number) => void;
  className?: string;
}

type ImplementationMode = 'worktree' | 'direct';

// =============================================================================
// Component
// =============================================================================

export function IssueDetailView({
  issue,
  comments,
  projectPath: _projectPath,
  onStartImplementation,
  onCreatePR,
  className,
}: IssueDetailViewProps): React.ReactElement {
  const [implMode, setImplMode] = useState<ImplementationMode>('worktree');

  const handleStartImplementation = useCallback(() => {
    if (!issue) return;
    onStartImplementation(issue.number, implMode);
  }, [issue, implMode, onStartImplementation]);

  const handleCreatePR = useCallback(() => {
    if (!issue) return;
    onCreatePR(issue.number);
  }, [issue, onCreatePR]);

  // Placeholder
  if (!issue) {
    return (
      <div className={clsx('flex items-center justify-center h-full text-gray-400', className)}>
        Issueを選択してください
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col h-full overflow-y-auto', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
            #{issue.number}
          </span>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {issue.title}
          </h2>
        </div>

        {/* Meta: state, author */}
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            issue.state === 'open'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          )}>
            {issue.state}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {issue.user.login}
          </span>
        </div>
      </div>

      {/* Sidebar info: Labels, Assignees, Milestone */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* Labels */}
        <div className="flex items-start gap-2">
          <Tag className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {issue.labels.map((label) => {
              if (label.name.startsWith('status:')) {
                const status = label.name.slice('status:'.length) as StatusLabel;
                return <StatusLabelBadge key={label.name} status={status} />;
              }
              return (
                <span
                  key={label.name}
                  className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                  }}
                >
                  {label.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Assignees */}
        {issue.assignees.length > 0 && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {issue.assignees.map((a) => (
                <span
                  key={a.login}
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  {a.login}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Milestone */}
        {issue.milestone && (
          <div className="flex items-center gap-2">
            <Milestone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {issue.milestone.title}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
          {issue.body}
        </pre>
      </div>

      {/* Implementation Mode */}
      <div
        data-testid="implementation-mode"
        className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3"
      >
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          実装モード
        </h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="impl-mode"
              value="worktree"
              checked={implMode === 'worktree'}
              onChange={() => setImplMode('worktree')}
              aria-label="Worktree"
            />
            <GitBranch className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Worktree</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="impl-mode"
              value="direct"
              checked={implMode === 'direct'}
              onChange={() => setImplMode('direct')}
              aria-label="Direct"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Direct</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            data-testid="start-implementation-button"
            onClick={handleStartImplementation}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-white',
              'bg-blue-500 hover:bg-blue-600',
              'transition-colors'
            )}
          >
            <GitBranch className="w-4 h-4" />
            実装開始
          </button>

          <button
            data-testid="create-pr-button"
            onClick={handleCreatePR}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md',
              'bg-green-500 hover:bg-green-600 text-white',
              'transition-colors'
            )}
          >
            <GitPullRequest className="w-4 h-4" />
            PR作成
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          <MessageSquare className="w-4 h-4" />
          コメント ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <p className="text-sm text-gray-400">コメントはありません</p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {comment.user.login}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleString('ja-JP')}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400 font-sans">
                  {comment.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
