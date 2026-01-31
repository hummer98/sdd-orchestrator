/**
 * AgentLogPage Component
 *
 * mobile-agent-log-fullscreen: Task 3.1
 * Full-screen agent log page for mobile Remote UI.
 * Replaces the drawer-based AgentDetailDrawer with a dedicated page.
 *
 * Requirements:
 * - 1.1: Agentタップで全画面遷移
 * - 1.3: AgentLogPage配置 in remote-ui/components/
 * - 2.1: ナビバー表示（画面上部）
 * - 2.2: 戻るボタン表示（ArrowLeftアイコン）
 * - 2.3: 戻るボタンで遷移元に戻る
 * - 2.4: 2段構成ヘッダー（ナビバー + AgentLogPanelヘッダー）
 * - 3.1: ログエリアのみスクロール
 * - 3.2: ナビバー・アクション固定
 * - 3.3: AgentLogPanel再利用
 * - 3.4: 自動スクロール（AgentLogPanel既存機能）
 *
 * Design: AgentLogPage component in design.md
 */

import React, { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AgentLogPanel } from '@shared/components/agent';
import { AgentLogActionArea } from './AgentLogActionArea';
import { useSharedAgentStore, type ParsedLogEntry } from '@shared/stores/agentStore';
import type { AgentInfo, ApiClient } from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AgentLogPage component
 * Matches design.md AgentLogPageProps specification
 */
export interface AgentLogPageProps {
  /** Agent to display logs for */
  agent: AgentInfo;
  /** Source type indicating where navigation originated from */
  sourceType: 'spec' | 'bug' | 'agents';
  /** Source entity ID (spec name or bug name, undefined for agents tab) */
  sourceEntityId?: string;
  /** API Client for agent operations */
  apiClient: ApiClient;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AgentLogPage - Full-screen agent log page for mobile
 *
 * Layout:
 * - Fixed navigation bar at top (Req 3.2)
 * - AgentLogPanel with scrollable logs (Req 3.1, 3.3)
 * - Fixed action area at bottom (Req 3.2)
 *
 * The page uses a 2-tier header structure (Req 2.4):
 * - Top: Navigation bar with back button
 * - Second: AgentLogPanel's built-in header showing phase and engine info
 */
export function AgentLogPage({
  agent,
  sourceType: _sourceType,
  sourceEntityId: _sourceEntityId,
  apiClient,
  onBack,
  testId = 'agent-log-page',
}: AgentLogPageProps): React.ReactElement {
  // Note: _sourceType and _sourceEntityId are preserved for future navigation history display
  void _sourceType;
  void _sourceEntityId;
  // ---------------------------------------------------------------------------
  // Agent Store Integration
  // ---------------------------------------------------------------------------

  /** Get logs for this agent from the shared store */
  const logsMap = useSharedAgentStore((state) => state.logs);

  /** Get logs for this specific agent */
  const logs: ParsedLogEntry[] = useMemo(
    () => logsMap.get(agent.agentId) ?? [],
    [logsMap, agent.agentId]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid={testId}
      className="flex flex-col h-full bg-white dark:bg-gray-900"
    >
      {/* Navigation Bar - Fixed at top (Req 2.1, 3.2) */}
      <header
        data-testid={`${testId}-nav-bar`}
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        {/* Back Button (Req 2.2, 2.3) */}
        <button
          data-testid={`${testId}-back-button`}
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </header>

      {/* Log Panel Container - Scrollable (Req 3.1, 3.3) */}
      {/* Uses flex-1 and overflow-hidden to allow AgentLogPanel internal scroll */}
      <div
        data-testid={`${testId}-log-container`}
        className="flex-1 overflow-hidden flex flex-col min-h-0"
      >
        {/* AgentLogPanel - Shared component (Req 3.3, 3.4) */}
        {/* The panel has its own header showing "Agent Log - phase [Engine]" (Req 2.4) */}
        <AgentLogPanel
          agent={{
            agentId: agent.agentId,
            sessionId: agent.sessionId,
            phase: agent.phase,
            status: agent.status,
            command: agent.command,
            engineId: agent.engineId,
          }}
          logs={logs}
          showSessionId={false}
          noAgentMessage="Agentが選択されていません"
          emptyLogsMessage="ログがありません"
          testId={`${testId}-log-panel`}
        />
      </div>

      {/* Action Area - Fixed at bottom (Req 3.2) */}
      <AgentLogActionArea
        agent={agent}
        apiClient={apiClient}
        testId={`${testId}-action-area`}
      />
    </div>
  );
}

export default AgentLogPage;
