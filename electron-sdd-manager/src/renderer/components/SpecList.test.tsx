/**
 * SpecList Component Tests
 * Task 33.1: SpecList update with running agent count
 * Requirements: 2.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecList } from './SpecList';
import { useSpecStore } from '../stores/specStore';
import { useAgentStore, type AgentInfo } from '../stores/agentStore';
import type { SpecMetadata, SpecPhase } from '../types';

// Mock the stores
vi.mock('../stores/specStore');
vi.mock('../stores/agentStore');

const mockUseSpecStore = useSpecStore as unknown as ReturnType<typeof vi.fn>;
const mockUseAgentStore = useAgentStore as unknown as ReturnType<typeof vi.fn>;

describe('SpecList - Task 33.1', () => {
  const mockSelectSpec = vi.fn();
  const mockSetSortBy = vi.fn();
  const mockSetSortOrder = vi.fn();
  const mockSetStatusFilter = vi.fn();
  const mockGetSortedFilteredSpecs = vi.fn();
  const mockGetAgentsForSpec = vi.fn();

  const baseSpec: SpecMetadata = {
    name: 'feature-1',
    path: '/path/to/feature-1',
    phase: 'tasks-generated' as SpecPhase,
    updatedAt: '2025-01-01T00:00:00Z',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
    readyForImplementation: true,
  };

  const runningAgent: AgentInfo = {
    agentId: 'agent-1',
    specId: 'feature-1',
    phase: 'requirements',
    pid: 12345,
    sessionId: 'session-1',
    status: 'running',
    startedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    command: 'claude -p "/kiro:spec-requirements"',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSpecStore.mockReturnValue({
      selectedSpec: null,
      sortBy: 'name',
      sortOrder: 'asc',
      statusFilter: 'all',
      isLoading: false,
      error: null,
      selectSpec: mockSelectSpec,
      setSortBy: mockSetSortBy,
      setSortOrder: mockSetSortOrder,
      setStatusFilter: mockSetStatusFilter,
      getSortedFilteredSpecs: mockGetSortedFilteredSpecs.mockReturnValue([baseSpec]),
    });

    mockUseAgentStore.mockReturnValue({
      getAgentsForSpec: mockGetAgentsForSpec.mockReturnValue([]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Running agent count display', () => {
    it('should display spec list without agent count when no agents', () => {
      render(<SpecList />);

      expect(screen.getByText('feature-1')).toBeInTheDocument();
      expect(screen.queryByTestId('agent-count-feature-1')).not.toBeInTheDocument();
    });

    it('should display running agent count badge when agents are running', () => {
      mockGetAgentsForSpec.mockReturnValue([runningAgent]);
      mockUseAgentStore.mockReturnValue({
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<SpecList />);

      const agentCountBadge = screen.getByTestId('agent-count-feature-1');
      expect(agentCountBadge).toBeInTheDocument();
      expect(agentCountBadge).toHaveTextContent('1');
    });

    it('should display correct count for multiple running agents', () => {
      const agent2 = { ...runningAgent, agentId: 'agent-2', phase: 'design' };
      mockGetAgentsForSpec.mockReturnValue([runningAgent, agent2]);
      mockUseAgentStore.mockReturnValue({
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<SpecList />);

      const agentCountBadge = screen.getByTestId('agent-count-feature-1');
      expect(agentCountBadge).toHaveTextContent('2');
    });

    it('should only count running agents', () => {
      const completedAgent = { ...runningAgent, agentId: 'agent-2', status: 'completed' as const };
      mockGetAgentsForSpec.mockReturnValue([runningAgent, completedAgent]);
      mockUseAgentStore.mockReturnValue({
        getAgentsForSpec: mockGetAgentsForSpec,
      });

      render(<SpecList />);

      const agentCountBadge = screen.getByTestId('agent-count-feature-1');
      expect(agentCountBadge).toHaveTextContent('1');
    });
  });
});
