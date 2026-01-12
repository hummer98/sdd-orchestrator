/**
 * ProjectAgentView Component
 *
 * Task 13.7: Project Agent機能UIを実装する
 *
 * Project AgentのAsk機能を提供するコンポーネント。
 * AskAgentDialogを使用してプロンプト入力と実行を行う。
 *
 * Requirements: 7.1
 */

import React, { useState, useCallback } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { AskAgentDialog } from '@shared/components/project/AskAgentDialog';
import type { ApiClient } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

export interface ProjectAgentViewProps {
  /** API client instance */
  apiClient: ApiClient;
  /** Called when a prompt is executed */
  onExecute?: (prompt: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function ProjectAgentView({
  apiClient: _apiClient,
  onExecute,
}: ProjectAgentViewProps): React.ReactElement {
  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handle dialog open
  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  // Handle prompt execution
  const handleExecute = useCallback(
    (prompt: string) => {
      onExecute?.(prompt);
      setIsDialogOpen(false);
    },
    [onExecute]
  );

  return (
    <div data-testid="project-agent-view" className="flex flex-col h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <MessageSquare className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Project Agent
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            プロジェクト全体のコンテキストでAIに質問
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Steering files (`.kiro/steering/*.md`) をコンテキストとして使用し、
          プロジェクト全体に関する質問や作業を依頼できます。
        </p>
        <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>プロジェクトの構成や方針についての質問</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>新しいSpecの作成サポート</span>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>プロジェクト全体のレビューや改善提案</span>
          </li>
        </ul>
      </div>

      {/* Ask Button */}
      <button
        data-testid="project-agent-ask-button"
        onClick={handleOpenDialog}
        className={clsx(
          'flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg',
          'bg-blue-500 text-white hover:bg-blue-600',
          'font-medium text-sm',
          'transition-colors'
        )}
      >
        <MessageSquare className="w-5 h-5" />
        Project Agentに質問する
      </button>

      {/* Ask Dialog */}
      <AskAgentDialog
        isOpen={isDialogOpen}
        agentType="project"
        onExecute={handleExecute}
        onCancel={handleCloseDialog}
      />
    </div>
  );
}

export default ProjectAgentView;
