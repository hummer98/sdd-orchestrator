/**
 * AgentListItem Component Tests
 *
 * TDD Test: Task 4.5 - Agent関連コンポーネントを共有化する
 *
 * このテストはprops-drivenのAgentListItemコンポーネントをテストします。
 * ストア非依存の設計で、Electron版とRemote UI版で共有可能です。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AgentListItem, type AgentListItemProps, type AgentItemInfo, type AgentItemStatus } from './AgentListItem';

describe('AgentListItem', () => {
  const mockAgent: AgentItemInfo = {
    agentId: 'agent-123',
    sessionId: 'session-456',
    phase: 'requirements',
    status: 'running' as AgentItemStatus,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  const defaultProps: AgentListItemProps = {
    agent: mockAgent,
    isSelected: false,
    onSelect: vi.fn(),
    onStop: vi.fn(),
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('レンダリング', () => {
    it('エージェント情報を表示する', () => {
      render(<AgentListItem {...defaultProps} />);

      expect(screen.getByText('requirements')).toBeInTheDocument();
      expect(screen.getByTestId(`agent-item-${mockAgent.agentId}`)).toBeInTheDocument();
    });

    it('選択状態のスタイルを適用する', () => {
      render(<AgentListItem {...defaultProps} isSelected={true} />);

      const item = screen.getByTestId(`agent-item-${mockAgent.agentId}`);
      expect(item).toHaveClass('bg-blue-50');
    });

    it('非選択状態のスタイルを適用する', () => {
      render(<AgentListItem {...defaultProps} isSelected={false} />);

      const item = screen.getByTestId(`agent-item-${mockAgent.agentId}`);
      expect(item).not.toHaveClass('bg-blue-50');
    });
  });

  describe('ステータス表示', () => {
    it('実行中ステータスでスピナーアイコンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'running' }} />);

      expect(screen.getByTitle('実行中')).toBeInTheDocument();
    });

    it('完了ステータスでチェックアイコンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'completed' }} />);

      expect(screen.getByTitle('完了')).toBeInTheDocument();
    });

    it('失敗ステータスでエラーアイコンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'failed' }} />);

      expect(screen.getByTitle('失敗')).toBeInTheDocument();
    });

    it('中断ステータスで警告アイコンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'interrupted' }} />);

      expect(screen.getByTitle('中断')).toBeInTheDocument();
    });

    it('応答なしステータスで警告アイコンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'hang' }} />);

      expect(screen.getByTitle('応答なし')).toBeInTheDocument();
    });
  });

  describe('ボタン表示', () => {
    it('実行中の場合、停止ボタンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'running' }} />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    });

    it('完了の場合、削除ボタンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'completed' }} />);

      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '停止' })).not.toBeInTheDocument();
    });

    it('hangの場合、停止ボタンを表示する', () => {
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'hang' }} />);

      expect(screen.getByRole('button', { name: '停止' })).toBeInTheDocument();
    });
  });

  describe('インタラクション', () => {
    it('クリックでonSelectを呼び出す', () => {
      const onSelect = vi.fn();
      render(<AgentListItem {...defaultProps} onSelect={onSelect} />);

      fireEvent.click(screen.getByTestId(`agent-item-${mockAgent.agentId}`));

      expect(onSelect).toHaveBeenCalled();
    });

    it('停止ボタンでonStopを呼び出す', () => {
      const onStop = vi.fn();
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'running' }} onStop={onStop} />);

      fireEvent.click(screen.getByRole('button', { name: '停止' }));

      expect(onStop).toHaveBeenCalled();
    });

    it('削除ボタンでonRemoveを呼び出す', () => {
      const onRemove = vi.fn();
      render(<AgentListItem {...defaultProps} agent={{ ...mockAgent, status: 'completed' }} onRemove={onRemove} />);

      fireEvent.click(screen.getByRole('button', { name: '削除' }));

      expect(onRemove).toHaveBeenCalled();
    });

    it('停止ボタンクリック時にイベント伝播を止める', () => {
      const onSelect = vi.fn();
      const onStop = vi.fn();
      render(
        <AgentListItem
          {...defaultProps}
          agent={{ ...mockAgent, status: 'running' }}
          onSelect={onSelect}
          onStop={onStop}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '停止' }));

      expect(onStop).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('経過時間表示', () => {
    it('実行中エージェントの経過時間を動的に更新する', () => {
      const startTime = new Date('2026-01-10T10:00:00Z');
      vi.setSystemTime(startTime);

      const agent = {
        ...mockAgent,
        status: 'running' as AgentItemStatus,
        startedAt: startTime.toISOString(),
        lastActivityAt: startTime.toISOString(),
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      // 初期状態では0秒
      expect(screen.getByText(/0秒/)).toBeInTheDocument();

      // 65秒経過
      act(() => {
        vi.advanceTimersByTime(65000);
      });

      expect(screen.getByText(/1分5秒/)).toBeInTheDocument();
    });

    it('完了エージェントは固定の実行時間を表示する', () => {
      const startTime = new Date('2026-01-10T10:00:00Z');
      const endTime = new Date('2026-01-10T10:02:30Z');

      const agent = {
        ...mockAgent,
        status: 'completed' as AgentItemStatus,
        startedAt: startTime.toISOString(),
        lastActivityAt: endTime.toISOString(),
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.getByText(/2分30秒/)).toBeInTheDocument();
    });
  });

  describe('日時表示', () => {
    it('開始時刻を「MM/DD HH:mm」形式で表示する', () => {
      const startTime = new Date('2026-01-10T14:30:00Z');
      const agent = {
        ...mockAgent,
        startedAt: startTime.toISOString(),
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      // タイムゾーンに依存するため、部分一致でテスト
      expect(screen.getByText(/\d{2}\/\d{2} \d{2}:\d{2}/)).toBeInTheDocument();
    });
  });
});
