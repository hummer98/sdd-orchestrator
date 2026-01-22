/**
 * AgentList Component (Shared)
 *
 * Phase 2: Agent一覧表示ロジックの共通化
 *
 * Agent一覧のレンダリングを担当するprops-drivenコンポーネント。
 * AgentListItemを使用した一覧表示、空状態表示、オプションのヘッダー表示を提供。
 * Electron版とRemote UI版で共有可能。
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { AgentListItem, type AgentItemInfo } from './AgentListItem';

// =============================================================================
// Types
// =============================================================================

/**
 * AgentListのprops
 */
export interface AgentListProps {
  /** Agent一覧（AgentItemInfo形式） */
  agents: AgentItemInfo[];

  /** 選択中のAgentID */
  selectedAgentId: string | null;

  /** Agent選択時のコールバック */
  onSelect: (agentId: string) => void;

  /** Agent停止時のコールバック */
  onStop: (e: React.MouseEvent, agentId: string) => void;

  /** Agent削除時のコールバック */
  onRemove: (e: React.MouseEvent, agentId: string) => void;

  /** 空状態のメッセージ（デフォルト: "Agentはありません"） */
  emptyMessage?: string;

  /** ヘッダーを表示するかどうか（デフォルト: false） */
  showHeader?: boolean;

  /** ヘッダーのタイトル（デフォルト: "Agent"） */
  headerTitle?: string;

  /** data-testid属性 */
  testId?: string;

  /** 追加のクラス名 */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AgentList - Agent一覧表示コンポーネント
 *
 * 使用例:
 * ```tsx
 * <AgentList
 *   agents={agents.map(mapAgentInfoToItemInfo)}
 *   selectedAgentId={selectedId}
 *   onSelect={(id) => setSelectedId(id)}
 *   onStop={(e, id) => handleStop(id)}
 *   onRemove={(e, id) => handleRemove(id)}
 *   showHeader
 *   emptyMessage="実行中のAgentはありません"
 * />
 * ```
 */
export function AgentList({
  agents,
  selectedAgentId,
  onSelect,
  onStop,
  onRemove,
  emptyMessage = 'Agentはありません',
  showHeader = false,
  headerTitle = 'Agent',
  testId = 'agent-list',
  className = '',
}: AgentListProps): React.ReactElement {
  // Empty state
  if (agents.length === 0) {
    return (
      <div
        data-testid={`${testId}-empty`}
        className={`text-sm text-gray-500 dark:text-gray-400 text-center py-2 ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Optional header */}
      {showHeader && (
        <h3
          data-testid={`${testId}-header`}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
        >
          <Bot className="w-4 h-4" />
          {headerTitle} ({agents.length})
        </h3>
      )}

      {/* Agent list */}
      <ul data-testid={testId} className="space-y-2">
        {agents.map((agent) => (
          <AgentListItem
            key={agent.agentId}
            agent={agent}
            isSelected={selectedAgentId === agent.agentId}
            onSelect={() => onSelect(agent.agentId)}
            onStop={(e) => onStop(e, agent.agentId)}
            onRemove={(e) => onRemove(e, agent.agentId)}
          />
        ))}
      </ul>
    </div>
  );
}

export default AgentList;
