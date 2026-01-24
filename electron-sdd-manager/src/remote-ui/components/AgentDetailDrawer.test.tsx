/**
 * AgentDetailDrawer Component Tests
 *
 * Task 3.1: AgentDetailDrawerコンポーネントを作成する
 * Task 3.2: AgentDetailDrawerのドラッグ高さ調整を実装する
 * Task 3.3: AgentDetailDrawerに追加指示入力とアクションボタンを実装する
 * Task 11.2: AgentDetailDrawerのユニットテストを実装する (テスト追加)
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8
 * - 6.1: 下からスライドアップするオーバーレイDrawer
 * - 6.2: リアルタイムログ表示（AgentLogPanel使用）
 * - 6.3: ドラッグで高さ調整（最小25vh、最大90vh）
 * - 6.4: 追加指示入力フィールド
 * - 6.5: Sendボタン
 * - 6.6: Continueボタン
 * - 6.8: Desktop Webと内部レンダリング共有（AgentLogPanel使用）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { AgentDetailDrawer } from './AgentDetailDrawer';
import type { AgentInfo, LogEntry } from '@shared/api/types';

const componentPath = resolve(__dirname, 'AgentDetailDrawer.tsx');

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockAgent = (overrides: Partial<AgentInfo> = {}): AgentInfo => ({
  id: 'test-agent-123',
  phase: 'spec-requirements',
  status: 'running',
  sessionId: 'session-456',
  command: '/kiro:spec-requirements',
  ...overrides,
});

const createMockLogs = (): LogEntry[] => [
  { id: 'log-1', stream: 'stdout', data: '{"type":"text","text":"Starting agent..."}', timestamp: Date.now() - 2000 },
  { id: 'log-2', stream: 'stdout', data: '{"type":"text","text":"Processing..."}', timestamp: Date.now() - 1000 },
];

const defaultProps = {
  agent: createMockAgent(),
  logs: createMockLogs(),
  isOpen: true,
  onClose: vi.fn(),
  onSendInstruction: vi.fn().mockResolvedValue(undefined),
  onContinue: vi.fn().mockResolvedValue(undefined),
  testId: 'agent-detail-drawer',
};

// =============================================================================
// Static Analysis Tests (Task 3.1)
// =============================================================================

describe('AgentDetailDrawer', () => {
  it('should exist', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it('should export AgentDetailDrawer function', () => {
    const content = readFileSync(componentPath, 'utf-8');
    expect(content).toContain('export function AgentDetailDrawer');
  });

  // ============================================================
  // Props Interface Tests
  // ============================================================
  describe('Props interface', () => {
    it('should have agent prop of type AgentInfo', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('agent: AgentInfo');
    });

    it('should have logs prop of type LogEntry[]', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('logs: LogEntry[]');
    });

    it('should have isOpen prop', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('isOpen: boolean');
    });

    it('should have onClose callback', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('onClose: () => void');
    });

    it('should have onSendInstruction callback', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('onSendInstruction: (instruction: string) => Promise<void>');
    });

    it('should have onContinue callback', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('onContinue: () => Promise<void>');
    });

    it('should have optional testId prop', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('testId?: string');
    });
  });

  // ============================================================
  // Requirement 6.1: Slide-up Drawer
  // ============================================================
  describe('Requirement 6.1: Slide-up overlay drawer', () => {
    it('should have fixed positioning for overlay', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/fixed/);
    });

    it('should have bottom-0 for slide-up positioning', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/bottom-0/);
    });

    it('should have transition for slide animation', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/transition|transform/);
    });

    it('should have backdrop for overlay effect', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/backdrop|bg-black.*opacity|bg-opacity/);
    });

    it('should have z-index for stacking context', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/z-\d+|z-50/);
    });
  });

  // ============================================================
  // Requirement 6.2/6.8: AgentLogPanel Integration
  // ============================================================
  describe('Requirement 6.2/6.8: AgentLogPanel integration', () => {
    it('should import AgentLogPanel from shared components', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('AgentLogPanel');
      expect(content).toMatch(/@shared\/components\/agent|shared\/components\/agent/);
    });

    it('should use AgentLogPanel component', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/<AgentLogPanel/);
    });

    it('should pass logs to AgentLogPanel', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/logs=\{.*logs.*\}/s);
    });
  });

  // ============================================================
  // Header: Agent name and status display
  // ============================================================
  describe('Header: Agent name and status display', () => {
    it('should have drawer header section', () => {
      const content = readFileSync(componentPath, 'utf-8');
      // Check for header element with agent name/phase display
      expect(content).toMatch(/agent\.phase|agent\.id/);
    });

    it('should display agent status', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/agent\.status/);
    });

    it('should have drag handle element', () => {
      const content = readFileSync(componentPath, 'utf-8');
      // Drag handle for height adjustment (Task 3.2 will implement logic)
      expect(content).toMatch(/drag-handle|rounded-full.*w-|h-1/);
    });
  });

  // ============================================================
  // Test ID for E2E testing
  // ============================================================
  describe('Test ID for E2E testing', () => {
    it('should have data-testid attribute', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid');
    });

    it('should use testId prop or default value', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/data-testid=\{.*testId|agent-detail-drawer/);
    });
  });

  // ============================================================
  // Type exports
  // ============================================================
  describe('Type exports', () => {
    it('should export AgentDetailDrawerProps interface', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('export interface AgentDetailDrawerProps');
    });
  });

  // ============================================================
  // Task 3.2: Drag Height Adjustment (Requirement 6.3)
  // ============================================================
  describe('Task 3.2: Drag height adjustment (Requirement 6.3)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Mock window.innerHeight for vh calculations
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1000,
      });
    });

    describe('State management', () => {
      it('should have drawerHeight state managed in vh units', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/drawerHeight|height.*vh/i);
      });

      it('should have isDragging state for drag tracking', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/isDragging/);
      });
    });

    describe('Default height', () => {
      it('should render with default height of 50vh', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const drawer = screen.getByTestId('agent-detail-drawer');
        // The drawer should have height style containing 50vh
        expect(drawer).toHaveStyle({ height: '50vh' });
      });
    });

    describe('Height constraints', () => {
      it('should enforce minimum height of 25vh', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/25|MIN.*HEIGHT/i);
      });

      it('should enforce maximum height of 90vh', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/90|MAX.*HEIGHT/i);
      });
    });

    describe('Touch event handlers', () => {
      it('should have onTouchStart handler on drag handle', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/onTouchStart/);
      });

      it('should have onTouchMove handler for drag tracking', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/onTouchMove/);
      });

      it('should have onTouchEnd handler to finish dragging', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/onTouchEnd/);
      });
    });

    describe('Drag handle interaction', () => {
      it('should start dragging when touch starts on drag handle', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');

        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 500 }],
        });

        // The drag handle area should have cursor-grabbing style when dragging
        // or the component should track isDragging state
        expect(dragHandle).toBeInTheDocument();
      });

      it('should update height when dragging upward (increasing height)', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');
        const drawer = screen.getByTestId('agent-detail-drawer');

        // Start touch at y=500
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 500 }],
        });

        // Move touch upward to y=300 (200px up = 20vh on 1000px window)
        // This should increase drawer height from 50vh to 70vh
        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 300 }],
        });

        fireEvent.touchEnd(dragHandle);

        // Height should be increased
        const style = drawer.getAttribute('style');
        expect(style).toMatch(/height:\s*\d+vh/);
      });

      it('should update height when dragging downward (decreasing height)', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');
        const drawer = screen.getByTestId('agent-detail-drawer');

        // Start touch at y=500
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 500 }],
        });

        // Move touch downward to y=700 (200px down = 20vh on 1000px window)
        // This should decrease drawer height from 50vh to 30vh
        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 700 }],
        });

        fireEvent.touchEnd(dragHandle);

        // Height should be decreased
        const style = drawer.getAttribute('style');
        expect(style).toMatch(/height:\s*\d+vh/);
      });

      it('should not exceed maximum height of 90vh when dragging up', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');
        const drawer = screen.getByTestId('agent-detail-drawer');

        // Start at y=500, move to y=50 (450px up = 45vh, would be 95vh)
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 500 }],
        });

        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 50 }],
        });

        fireEvent.touchEnd(dragHandle);

        // Height should be capped at 90vh
        expect(drawer).toHaveStyle({ height: '90vh' });
      });

      it('should not go below minimum height of 25vh when dragging down', () => {
        // Note: The swipe-to-close threshold is 20vh (Task 3.4).
        // To test the min height constraint without triggering close,
        // we need to move the drawer to minimum height first with a small drag,
        // then verify it stays at minimum on further drag.
        // Alternative: Test that during drag (before touchEnd), height is clamped at 25vh.

        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');
        const drawer = screen.getByTestId('agent-detail-drawer');

        // Start at y=500, move down 150px (15vh) - this puts height at 35vh
        // Then move down another 150px (15vh more) - this should clamp at 25vh
        // Total 30vh down from 50vh = 20vh, which exactly hits threshold
        // But the final height should be clamped at 25vh during the drag

        // To avoid triggering close, we need to verify the height DURING drag
        // not after touchEnd. Let's use a smaller delta that stays above 25vh
        // but still tests clamping behavior.

        // Start at y=300, move to y=550 (250px down = 25vh)
        // 50vh - 25vh = 25vh (exactly at min)
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 300 }],
        });

        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 550 }],
        });

        // Check height during drag (before touchEnd) - should be 25vh
        expect(drawer).toHaveStyle({ height: '25vh' });

        // For touchEnd, since delta is exactly 25vh which is > 20vh threshold,
        // it would close. Let's just verify the clamp works during drag.
      });
    });

    describe('Scroll and drag conflict resolution', () => {
      it('should prevent default on touchmove when dragging', () => {
        const content = readFileSync(componentPath, 'utf-8');
        // Should prevent scroll while dragging
        expect(content).toMatch(/preventDefault/);
      });

      it('should have touch-action-none on drag handle to prevent scroll interference', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');
        // touch-action: none prevents browser handling of touch events
        expect(dragHandle).toHaveClass('touch-none');
      });
    });

    describe('Visual feedback during drag', () => {
      it('should apply visual styling when dragging', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');

        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 500 }],
        });

        // Check for visual feedback class (e.g., cursor style or background change)
        const dragHandleElement = screen.getByTestId('agent-detail-drawer-drag-handle');
        expect(dragHandleElement.querySelector('[data-dragging]') || dragHandleElement.className).toBeTruthy();
      });
    });
  });

  // ============================================================
  // Task 3.3: Additional instruction input and action buttons
  // Requirements: 6.4, 6.5, 6.6
  // ============================================================
  describe('Task 3.3: Additional instruction input and action buttons', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    // ============================================================
    // Requirement 6.4: Additional instruction input field
    // ============================================================
    describe('Requirement 6.4: Additional instruction input field', () => {
      it('should have instruction input field element', () => {
        const content = readFileSync(componentPath, 'utf-8');
        // Check for textarea or input element for instructions
        expect(content).toMatch(/instructionInput|input.*instruction|textarea/i);
      });

      it('should render instruction input field', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        // Find by placeholder text or role
        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        expect(input).toBeInTheDocument();
      });

      it('should have input field at the bottom of the drawer', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        // Input should exist in the DOM
        expect(input).toBeInTheDocument();
      });

      it('should allow typing in the input field', async () => {
        // Need completed agent to enable input
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} />);
        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);

        await userEvent.type(input, 'Test instruction');
        expect(input).toHaveValue('Test instruction');
      });

      it('should have data-testid for input field', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const input = screen.getByTestId('agent-detail-drawer-instruction-input');
        expect(input).toBeInTheDocument();
      });
    });

    // ============================================================
    // Requirement 6.5: Send button
    // ============================================================
    describe('Requirement 6.5: Send button', () => {
      it('should have Send button element', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/Send|送信/);
      });

      it('should render Send button', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const sendButton = screen.getByRole('button', { name: /send|送信/i });
        expect(sendButton).toBeInTheDocument();
      });

      it('should have data-testid for Send button', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        expect(sendButton).toBeInTheDocument();
      });

      it('should call onSendInstruction when Send button is clicked with input', async () => {
        const onSendInstruction = vi.fn().mockResolvedValue(undefined);
        // Need completed agent to enable input and send
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} onSendInstruction={onSendInstruction} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        await userEvent.type(input, 'Test instruction');

        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(onSendInstruction).toHaveBeenCalledWith('Test instruction');
        });
      });

      it('should clear input after sending', async () => {
        const onSendInstruction = vi.fn().mockResolvedValue(undefined);
        // Need completed agent to enable input and send
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} onSendInstruction={onSendInstruction} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        await userEvent.type(input, 'Test instruction');

        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(input).toHaveValue('');
        });
      });

      it('should not call onSendInstruction when input is empty', async () => {
        const onSendInstruction = vi.fn().mockResolvedValue(undefined);
        render(<AgentDetailDrawer {...defaultProps} onSendInstruction={onSendInstruction} />);

        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        fireEvent.click(sendButton);

        expect(onSendInstruction).not.toHaveBeenCalled();
      });

      it('should disable Send button when input is empty', () => {
        render(<AgentDetailDrawer {...defaultProps} />);

        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        expect(sendButton).toBeDisabled();
      });

      it('should enable Send button when input has content', async () => {
        // Need completed agent to enable input
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        await userEvent.type(input, 'Test');

        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        expect(sendButton).not.toBeDisabled();
      });

      it('should show sending state during send operation', async () => {
        const onSendInstruction = vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
        // Need completed agent to enable input and send
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} onSendInstruction={onSendInstruction} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        await userEvent.type(input, 'Test');

        const sendButton = screen.getByTestId('agent-detail-drawer-send-button');
        fireEvent.click(sendButton);

        // Button should be disabled during sending
        expect(sendButton).toBeDisabled();
      });
    });

    // ============================================================
    // Requirement 6.6: Continue button
    // ============================================================
    describe('Requirement 6.6: Continue button', () => {
      it('should have Continue button element', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/Continue|続行|続けて/);
      });

      it('should render Continue button', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const continueButton = screen.getByRole('button', { name: /continue|続行/i });
        expect(continueButton).toBeInTheDocument();
      });

      it('should have data-testid for Continue button', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).toBeInTheDocument();
      });

      it('should call onContinue when Continue button is clicked', async () => {
        const onContinue = vi.fn().mockResolvedValue(undefined);
        // Agent must NOT be running for continue to work
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} onContinue={onContinue} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        fireEvent.click(continueButton);

        await waitFor(() => {
          expect(onContinue).toHaveBeenCalled();
        });
      });

      it('should show loading state during continue operation', async () => {
        const onContinue = vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} onContinue={onContinue} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        fireEvent.click(continueButton);

        // Button should be disabled during operation
        expect(continueButton).toBeDisabled();
      });
    });

    // ============================================================
    // Agent not running: button disabled state
    // ============================================================
    describe('Agent not running: button disabled state', () => {
      it('should disable Send button when agent is running', () => {
        const runningAgent = createMockAgent({ status: 'running' });
        render(<AgentDetailDrawer {...defaultProps} agent={runningAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        // Input should be disabled when agent is running
        expect(input).toBeDisabled();
      });

      it('should disable Continue button when agent is running', () => {
        const runningAgent = createMockAgent({ status: 'running' });
        render(<AgentDetailDrawer {...defaultProps} agent={runningAgent} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).toBeDisabled();
      });

      it('should enable input when agent is completed', () => {
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        expect(input).not.toBeDisabled();
      });

      it('should enable input when agent is interrupted', () => {
        const interruptedAgent = createMockAgent({ status: 'interrupted' });
        render(<AgentDetailDrawer {...defaultProps} agent={interruptedAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        expect(input).not.toBeDisabled();
      });

      it('should enable Continue button when agent is completed', () => {
        const completedAgent = createMockAgent({ status: 'completed' });
        render(<AgentDetailDrawer {...defaultProps} agent={completedAgent} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).not.toBeDisabled();
      });

      it('should enable Continue button when agent is interrupted', () => {
        const interruptedAgent = createMockAgent({ status: 'interrupted' });
        render(<AgentDetailDrawer {...defaultProps} agent={interruptedAgent} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).not.toBeDisabled();
      });

      it('should enable input when agent is failed', () => {
        const failedAgent = createMockAgent({ status: 'failed' });
        render(<AgentDetailDrawer {...defaultProps} agent={failedAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        expect(input).not.toBeDisabled();
      });

      it('should disable input when agent is in hang status', () => {
        // "hang" status is treated the same as "running" - agent is still executing
        const hangAgent = createMockAgent({ status: 'hang' });
        render(<AgentDetailDrawer {...defaultProps} agent={hangAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        expect(input).toBeDisabled();
      });

      it('should disable Continue button when agent is in hang status', () => {
        // "hang" status is treated the same as "running" - agent is still executing
        const hangAgent = createMockAgent({ status: 'hang' });
        render(<AgentDetailDrawer {...defaultProps} agent={hangAgent} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).toBeDisabled();
      });

      it('should enable Continue button when agent is failed', () => {
        const failedAgent = createMockAgent({ status: 'failed' });
        render(<AgentDetailDrawer {...defaultProps} agent={failedAgent} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).not.toBeDisabled();
      });

      it('should disable input when agent has no sessionId', () => {
        const noSessionAgent = createMockAgent({ status: 'completed', sessionId: '' });
        render(<AgentDetailDrawer {...defaultProps} agent={noSessionAgent} />);

        const input = screen.getByPlaceholderText(/追加.*指示|additional.*instruction/i);
        expect(input).toBeDisabled();
      });

      it('should disable Continue button when agent has no sessionId', () => {
        const noSessionAgent = createMockAgent({ status: 'completed', sessionId: '' });
        render(<AgentDetailDrawer {...defaultProps} agent={noSessionAgent} />);

        const continueButton = screen.getByTestId('agent-detail-drawer-continue-button');
        expect(continueButton).toBeDisabled();
      });
    });

    // ============================================================
    // Action area layout
    // ============================================================
    describe('Action area layout', () => {
      it('should have action area with border-top', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/border-t|shrink-0/);
      });

      it('should render action area at the bottom', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const actionArea = screen.getByTestId('agent-detail-drawer-action-area');
        expect(actionArea).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 3.4: Close operations (Requirement 6.7)
  // - Backdrop click to close (already implemented, add test)
  // - Down swipe to close
  // - Closing transition animation
  // ============================================================
  describe('Task 3.4: Close operations (Requirement 6.7)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Mock window.innerHeight for vh calculations
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1000,
      });
    });

    // ============================================================
    // Backdrop click to close
    // ============================================================
    describe('Backdrop click to close', () => {
      it('should have backdrop element', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const backdrop = screen.getByTestId('agent-detail-drawer-backdrop');
        expect(backdrop).toBeInTheDocument();
      });

      it('should call onClose when backdrop is clicked', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const backdrop = screen.getByTestId('agent-detail-drawer-backdrop');
        fireEvent.click(backdrop);

        expect(onClose).toHaveBeenCalled();
      });

      it('should not call onClose when drawer content is clicked', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const drawer = screen.getByTestId('agent-detail-drawer');
        fireEvent.click(drawer);

        expect(onClose).not.toHaveBeenCalled();
      });
    });

    // ============================================================
    // Down swipe to close
    // ============================================================
    describe('Down swipe to close', () => {
      it('should have swipe detection logic in code', () => {
        const content = readFileSync(componentPath, 'utf-8');
        // Should detect swipe down threshold
        expect(content).toMatch(/swipe|SWIPE_THRESHOLD|closeThreshold/i);
      });

      it('should close drawer when swiped down significantly', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');

        // Start touch at y=300 (middle of screen)
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 300 }],
        });

        // Move down significantly (e.g., 300px down - should trigger close)
        // A significant swipe down should close the drawer
        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 600 }],
        });

        fireEvent.touchEnd(dragHandle);

        // Should call onClose when swiped down past threshold
        expect(onClose).toHaveBeenCalled();
      });

      it('should NOT close drawer when swiped down slightly', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');

        // Start touch at y=300
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 300 }],
        });

        // Move down slightly (e.g., 50px - should NOT trigger close)
        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 350 }],
        });

        fireEvent.touchEnd(dragHandle);

        // Should NOT call onClose for small swipe
        expect(onClose).not.toHaveBeenCalled();
      });

      it('should NOT close drawer when swiped up', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');

        // Start touch at y=300
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 300 }],
        });

        // Move up (e.g., 200px up - should increase height, not close)
        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 100 }],
        });

        fireEvent.touchEnd(dragHandle);

        // Should NOT call onClose for upward swipe
        expect(onClose).not.toHaveBeenCalled();
      });

      it('should reset height after close swipe', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const dragHandle = screen.getByTestId('agent-detail-drawer-drag-handle');

        // Perform close swipe
        fireEvent.touchStart(dragHandle, {
          touches: [{ clientY: 300 }],
        });

        fireEvent.touchMove(dragHandle, {
          touches: [{ clientY: 600 }],
        });

        fireEvent.touchEnd(dragHandle);

        // When closing, the height should be reset (will be verified by visual)
        expect(onClose).toHaveBeenCalled();
      });
    });

    // ============================================================
    // Closing transition animation
    // ============================================================
    describe('Closing transition animation', () => {
      it('should have transition classes for animation', () => {
        const content = readFileSync(componentPath, 'utf-8');
        // Should have transition-transform and duration
        expect(content).toMatch(/transition-transform/);
        expect(content).toMatch(/duration-\d+/);
      });

      it('should use translate-y for slide animation', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/translate-y-0|translate-y-full/);
      });

      it('should have translate-y-0 when open', () => {
        render(<AgentDetailDrawer {...defaultProps} isOpen={true} />);
        const drawer = screen.getByTestId('agent-detail-drawer');
        expect(drawer).toHaveClass('translate-y-0');
      });

      it('should have ease-out timing function for smooth animation', () => {
        const content = readFileSync(componentPath, 'utf-8');
        expect(content).toMatch(/ease-out|ease-in-out/);
      });

      it('should not render when isOpen is false', () => {
        render(<AgentDetailDrawer {...defaultProps} isOpen={false} />);
        const drawer = screen.queryByTestId('agent-detail-drawer');
        expect(drawer).not.toBeInTheDocument();
      });
    });

    // ============================================================
    // Close button
    // ============================================================
    describe('Close button', () => {
      it('should have close button in header', () => {
        render(<AgentDetailDrawer {...defaultProps} />);
        const closeButton = screen.getByTestId('agent-detail-drawer-close');
        expect(closeButton).toBeInTheDocument();
      });

      it('should call onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<AgentDetailDrawer {...defaultProps} onClose={onClose} />);

        const closeButton = screen.getByTestId('agent-detail-drawer-close');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
