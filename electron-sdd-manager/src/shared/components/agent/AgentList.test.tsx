/**
 * AgentList Component Tests
 *
 * Phase 2: Agent一覧表示ロジックの共通化
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentList } from './AgentList';
import type { AgentItemInfo } from './AgentListItem';

// =============================================================================
// Test Data
// =============================================================================

const mockAgents: AgentItemInfo[] = [
  {
    agentId: 'agent-1',
    sessionId: 'session-1',
    phase: 'requirements',
    status: 'running',
    startedAt: '2024-01-01T10:00:00Z',
    lastActivityAt: '2024-01-01T10:05:00Z',
  },
  {
    agentId: 'agent-2',
    sessionId: 'session-2',
    phase: 'design',
    status: 'completed',
    startedAt: '2024-01-01T09:00:00Z',
    lastActivityAt: '2024-01-01T09:30:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('AgentList', () => {
  describe('Empty state', () => {
    it('renders default empty message when no agents', () => {
      render(
        <AgentList
          agents={[]}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByTestId('agent-list-empty')).toHaveTextContent('Agentはありません');
    });

    it('renders custom empty message', () => {
      render(
        <AgentList
          agents={[]}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
          emptyMessage="実行中のAgentはありません"
        />
      );

      expect(screen.getByTestId('agent-list-empty')).toHaveTextContent('実行中のAgentはありません');
    });
  });

  describe('Agent list rendering', () => {
    it('renders all agents', () => {
      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByTestId('agent-list')).toBeInTheDocument();
      expect(screen.getByTestId('agent-item-agent-1')).toBeInTheDocument();
      expect(screen.getByTestId('agent-item-agent-2')).toBeInTheDocument();
    });

    it('shows selected agent', () => {
      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId="agent-1"
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      const selectedItem = screen.getByTestId('agent-item-agent-1');
      expect(selectedItem).toHaveClass('bg-blue-50');
    });
  });

  describe('Header', () => {
    it('does not show header by default', () => {
      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.queryByTestId('agent-list-header')).not.toBeInTheDocument();
    });

    it('shows header when showHeader is true', () => {
      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
          showHeader
        />
      );

      const header = screen.getByTestId('agent-list-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveTextContent('Agent (2)');
    });

    it('shows custom header title', () => {
      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
          showHeader
          headerTitle="エージェント一覧"
        />
      );

      expect(screen.getByTestId('agent-list-header')).toHaveTextContent('エージェント一覧 (2)');
    });
  });

  describe('Callbacks', () => {
    it('calls onSelect when agent is clicked', () => {
      const onSelect = vi.fn();

      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={onSelect}
          onStop={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('agent-item-agent-1'));
      expect(onSelect).toHaveBeenCalledWith('agent-1');
    });

    it('calls onStop when stop button is clicked', () => {
      const onStop = vi.fn();

      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={onStop}
          onRemove={vi.fn()}
        />
      );

      // Running agent has stop button
      const stopButton = screen.getByTestId('agent-item-agent-1').querySelector('[aria-label="停止"]');
      expect(stopButton).toBeInTheDocument();
      fireEvent.click(stopButton!);
      expect(onStop).toHaveBeenCalled();
    });

    it('calls onRemove when remove button is clicked', () => {
      const onRemove = vi.fn();

      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={onRemove}
        />
      );

      // Completed agent has remove button
      const removeButton = screen.getByTestId('agent-item-agent-2').querySelector('[aria-label="削除"]');
      expect(removeButton).toBeInTheDocument();
      fireEvent.click(removeButton!);
      expect(onRemove).toHaveBeenCalled();
    });
  });

  describe('Custom testId', () => {
    it('uses custom testId', () => {
      render(
        <AgentList
          agents={mockAgents}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
          testId="custom-agent-list"
        />
      );

      expect(screen.getByTestId('custom-agent-list')).toBeInTheDocument();
    });

    it('uses custom testId for empty state', () => {
      render(
        <AgentList
          agents={[]}
          selectedAgentId={null}
          onSelect={vi.fn()}
          onStop={vi.fn()}
          onRemove={vi.fn()}
          testId="custom-agent-list"
        />
      );

      expect(screen.getByTestId('custom-agent-list-empty')).toBeInTheDocument();
    });
  });
});
