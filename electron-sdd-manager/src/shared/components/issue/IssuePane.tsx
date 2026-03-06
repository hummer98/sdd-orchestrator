/**
 * IssuePane Component
 * Container component integrating IssueListPanel + IssueDetailView + PRListView + PRDetailView.
 * Provides Issue/PR sub-tab switching.
 * Connects to issueStore to pass data to presentational children.
 *
 * github-issue-integration: Task 7.1
 * Requirements: 2.1
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { useStore } from 'zustand';
import { issueStore } from '@shared/stores/issueStore';
import { IssueListPanel } from './IssueListPanel';
import { IssueDetailView } from './IssueDetailView';
import { PRListView } from './PRListView';
import { PRDetailView } from './PRDetailView';
import type { IssueFilters, PRFilters, MergeMethod } from '@shared/types/github';
import { getVanillaClient } from '@shared/trpc/vanillaClient';

// =============================================================================
// Types
// =============================================================================

type IssuePaneTab = 'issues' | 'prs';

export interface IssuePaneProps {
  projectPath: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function IssuePane({
  projectPath,
  className,
}: IssuePaneProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<IssuePaneTab>('issues');

  // Store state
  const issues = useStore(issueStore, (s) => s.issues);
  const pullRequests = useStore(issueStore, (s) => s.pullRequests);
  const selectedIssueNumber = useStore(issueStore, (s) => s.selectedIssueNumber);
  const selectedPRNumber = useStore(issueStore, (s) => s.selectedPRNumber);
  const issueDetail = useStore(issueStore, (s) => s.issueDetail);
  const issueComments = useStore(issueStore, (s) => s.issueComments);
  const prDetail = useStore(issueStore, (s) => s.prDetail);
  const isLoading = useStore(issueStore, (s) => s.isLoading);
  const hasMore = useStore(issueStore, (s) => s.hasMore);
  const filters = useStore(issueStore, (s) => s.filters);
  const error = useStore(issueStore, (s) => s.error);

  // Store actions
  const selectIssue = useStore(issueStore, (s) => s.selectIssue);
  const selectPR = useStore(issueStore, (s) => s.selectPR);
  const setFilters = useStore(issueStore, (s) => s.setFilters);
  const refresh = useStore(issueStore, (s) => s.refresh);
  const loadMoreIssues = useStore(issueStore, (s) => s.loadMoreIssues);
  const loadIssues = useStore(issueStore, (s) => s.loadIssues);
  const loadPullRequests = useStore(issueStore, (s) => s.loadPullRequests);

  // Initial load
  useEffect(() => {
    if (projectPath) {
      loadIssues(projectPath);
      loadPullRequests(projectPath);
    }
  }, [projectPath, loadIssues, loadPullRequests]);

  // Callbacks
  const handleSelectIssue = useCallback((num: number) => {
    selectIssue(num);
  }, [selectIssue]);

  const handleRefresh = useCallback(() => {
    refresh(projectPath);
  }, [refresh, projectPath]);

  const handleLoadMore = useCallback(() => {
    loadMoreIssues(projectPath);
  }, [loadMoreIssues, projectPath]);

  const handleFilterChange = useCallback((newFilters: Partial<IssueFilters>) => {
    setFilters(newFilters);
    loadIssues(projectPath);
  }, [setFilters, loadIssues, projectPath]);

  const handleSelectPR = useCallback((num: number) => {
    selectPR(num);
  }, [selectPR]);

  const handlePRFilterChange = useCallback((_newFilters: Partial<PRFilters>) => {
    // PRFilters change: reload PRs
    loadPullRequests(projectPath);
  }, [loadPullRequests, projectPath]);

  // github-issue-integration: Task 16.10 - Implement TODO placeholders
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);

  const handleStartImplementation = useCallback(async (issueNumber: number, mode: 'worktree' | 'direct') => {
    try {
      await getVanillaClient().issue.startImplementation.mutate({
        projectPath,
        issueNumber,
        mode,
      });
    } catch (error) {
      console.error('[IssuePane] startImplementation failed:', error);
    }
  }, [projectPath]);

  const handleCreatePR = useCallback(async (issueNumber: number) => {
    try {
      await getVanillaClient().issue.createPullRequest.mutate({
        projectPath,
        issueNumber,
        title: `Fix #${issueNumber}`,
        body: `Closes #${issueNumber}`,
        head: `issue/${issueNumber}`,
        base: 'main',
      });
    } catch (error) {
      console.error('[IssuePane] createPullRequest failed:', error);
    }
  }, [projectPath]);

  const handleMerge = useCallback(async (prNumber: number, method: MergeMethod) => {
    try {
      await getVanillaClient().issue.mergePullRequest.mutate({
        projectPath,
        number: prNumber,
        method,
      });
    } catch (error) {
      console.error('[IssuePane] mergePullRequest failed:', error);
    }
  }, [projectPath]);

  const handleCreateIssue = useCallback(() => {
    setIsCreateIssueOpen(true);
  }, []);

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Sub-tab bar */}
      <div
        className="flex border-b border-gray-200 dark:border-gray-700"
        role="tablist"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'issues'}
          onClick={() => setActiveTab('issues')}
          className={clsx(
            'flex-1 px-4 py-2 text-sm font-medium text-center',
            'transition-colors',
            activeTab === 'issues'
              ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          )}
        >
          Issues
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'prs'}
          onClick={() => setActiveTab('prs')}
          className={clsx(
            'flex-1 px-4 py-2 text-sm font-medium text-center',
            'transition-colors',
            activeTab === 'prs'
              ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          )}
        >
          Pull Requests
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'issues' ? (
          <div className="flex h-full">
            <IssueListPanel
              issues={issues}
              selectedIssueNumber={selectedIssueNumber}
              isLoading={isLoading}
              hasMore={hasMore}
              filters={filters}
              error={error}
              onSelectIssue={handleSelectIssue}
              onRefresh={handleRefresh}
              onLoadMore={handleLoadMore}
              onFilterChange={handleFilterChange}
              onCreateIssue={handleCreateIssue}
            />
            <IssueDetailView
              issue={issueDetail}
              comments={issueComments}
              onStartImplementation={handleStartImplementation}
              onCreatePR={handleCreatePR}
            />
          </div>
        ) : (
          <div className="flex h-full">
            <PRListView
              pullRequests={pullRequests}
              selectedPRNumber={selectedPRNumber}
              isLoading={isLoading}
              error={error}
              onSelectPR={handleSelectPR}
              onFilterChange={handlePRFilterChange}
            />
            <PRDetailView
              pr={prDetail}
              files={[]}
              ciStatus={null}
              isLoadingFiles={false}
              isLoadingCI={false}
              isMerging={false}
              onMerge={handleMerge}
            />
          </div>
        )}
      </div>
    </div>
  );
}
