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

  // =============================================================================
  // Task 9.2: agent-lifecycle-management - 再接続ステータス表示
  // Requirements: 6.2, 6.4
  // =============================================================================
  describe('再接続ステータス表示 (Task 9.2)', () => {
    it('再接続エージェントに「再接続」バッジを表示する', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'running',
        isReattached: true,
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.getByText('再接続')).toBeInTheDocument();
    });

    it('通常のエージェントには「再接続」バッジを表示しない', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'running',
        isReattached: false,
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.queryByText('再接続')).not.toBeInTheDocument();
    });

    it('isReattachedがundefinedの場合は「再接続」バッジを表示しない', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'running',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.queryByText('再接続')).not.toBeInTheDocument();
    });

    it('再接続エージェントの実行時間を「不明」と表示する (Requirement 6.4)', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'running',
        isReattached: true,
        startedAt: new Date().toISOString(),
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      // 再接続エージェントは実行時間が不明
      expect(screen.getByText(/不明/)).toBeInTheDocument();
    });
  });

  // =============================================================================
  // Task 9.3: agent-lifecycle-management - 終了理由表示
  // Requirements: 8.3, 8.4
  // =============================================================================
  describe('終了理由表示 (Task 9.3)', () => {
    it('正常完了の場合は終了理由を表示しない（デフォルト表示）', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'completed',
        exitReason: 'completed',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      // 正常完了は特別な表示なし
      expect(screen.queryByText(/アプリ停止中/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Watchdog/)).not.toBeInTheDocument();
    });

    it('アプリ停止中の終了の場合、警告アイコンと「アプリ停止中に終了」を表示する', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'interrupted',
        exitReason: 'exited_while_app_closed',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.getByText(/アプリ停止中に終了/)).toBeInTheDocument();
    });

    it('孤児検出の場合、「Watchdogにより検出」を表示する', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'interrupted',
        exitReason: 'orphaned',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.getByText(/Watchdogにより検出/)).toBeInTheDocument();
    });

    it('PID再利用の場合、「PID再利用を検出」を表示する', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'interrupted',
        exitReason: 'pid_reused',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.getByText(/PID再利用を検出/)).toBeInTheDocument();
    });

    it('ユーザー停止の場合は特別な表示なし', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'interrupted',
        exitReason: 'stopped_by_user',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      // ユーザー停止は通常の中断表示
      expect(screen.queryByText(/アプリ停止中/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Watchdog/)).not.toBeInTheDocument();
    });

    it('タイムアウトの場合、「タイムアウト」を表示する', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'interrupted',
        exitReason: 'timed_out',
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.getByText(/タイムアウト/)).toBeInTheDocument();
    });

    it('実行中エージェントには終了理由を表示しない', () => {
      const agent: AgentItemInfo = {
        ...mockAgent,
        status: 'running',
        exitReason: undefined,
      };

      render(<AgentListItem {...defaultProps} agent={agent} />);

      expect(screen.queryByText(/アプリ停止中/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Watchdog/)).not.toBeInTheDocument();
      expect(screen.queryByText(/タイムアウト/)).not.toBeInTheDocument();
    });
  });
});
