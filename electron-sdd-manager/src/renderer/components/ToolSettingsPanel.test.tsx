/**
 * ToolSettingsPanel Component Tests
 * TDD: Testing Tool Path settings UI
 * well-known-tool-paths feature
 * Task 5.2: ToolSettingsPanelユニットテストを作成する
 * Requirements: 2.2, 2.3, 3.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ToolSettingsPanel } from './ToolSettingsPanel';
import type {
  ToolStatus,
  ToolResolutionResult,
} from '../../shared/types/toolPath';

// Mock toolPathStore
const mockFetchStatuses = vi.fn();
const mockSetToolPath = vi.fn();
const mockResolveTool = vi.fn();
const mockGetStatusByName = vi.fn();

const mockStatuses: ToolStatus[] = [
  {
    definition: {
      name: 'claude',
      required: true,
      versionCommand: '--version',
      installGuidance: 'Install Claude Code',
    },
    resolution: {
      resolved: true,
      path: '/opt/homebrew/bin/claude',
      source: 'well-known',
    },
  },
  {
    definition: {
      name: 'jj',
      required: false,
      versionCommand: '--version',
      installGuidance: 'brew install jj',
    },
    resolution: {
      resolved: false,
      source: 'not-found',
      error: 'jj not found in Well Known paths',
    },
  },
  {
    definition: {
      name: 'jq',
      required: false,
      versionCommand: '--version',
      installGuidance: 'brew install jq',
    },
    resolution: {
      resolved: true,
      path: '/usr/local/bin/jq',
      source: 'well-known',
    },
  },
];

vi.mock('../../shared/stores/toolPathStore', () => ({
  useToolPathStore: vi.fn(() => ({
    statuses: mockStatuses,
    isLoading: false,
    error: null,
    fetchStatuses: mockFetchStatuses,
    setToolPath: mockSetToolPath,
    resolveTool: mockResolveTool,
    getStatusByName: mockGetStatusByName,
  })),
}));

describe('ToolSettingsPanel', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockSetToolPath.mockResolvedValue(undefined);
    mockResolveTool.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================
  // Task 5.2.1: Panel header and basic rendering
  // Requirements: 2.2
  // ============================================================
  describe('Task 5.2.1: Panel header and basic rendering', () => {
    it('should render tool settings panel with proper heading', async () => {
      render(<ToolSettingsPanel />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/ツール|Tool/i);
    });

    it('should fetch statuses on mount', async () => {
      render(<ToolSettingsPanel />);

      expect(mockFetchStatuses).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 5.2.2: Tool status display
  // Requirements: 2.3
  // ============================================================
  describe('Task 5.2.2: Tool status display', () => {
    it('should display all tool names', async () => {
      render(<ToolSettingsPanel />);

      expect(screen.getByText('claude')).toBeInTheDocument();
      expect(screen.getByText('jj')).toBeInTheDocument();
      expect(screen.getByText('jq')).toBeInTheDocument();
    });

    it('should display resolved tool paths', async () => {
      render(<ToolSettingsPanel />);

      expect(screen.getByText(/\/opt\/homebrew\/bin\/claude/)).toBeInTheDocument();
      expect(screen.getByText(/\/usr\/local\/bin\/jq/)).toBeInTheDocument();
    });

    it('should display resolved status indicator for found tools', async () => {
      render(<ToolSettingsPanel />);

      // claude and jq should show resolved status
      const claudeRow = screen.getByTestId('tool-row-claude');
      expect(claudeRow).toHaveClass('resolved');
    });

    it('should display unresolved status indicator for not found tools', async () => {
      render(<ToolSettingsPanel />);

      // jj should show unresolved status
      const jjRow = screen.getByTestId('tool-row-jj');
      expect(jjRow).toHaveClass('unresolved');
    });
  });

  // ============================================================
  // Task 5.2.3: Warning style for unresolved tools
  // Requirements: 3.2
  // ============================================================
  describe('Task 5.2.3: Warning style for unresolved tools', () => {
    it('should highlight unresolved required tools with warning style', async () => {
      render(<ToolSettingsPanel />);

      const jjRow = screen.getByTestId('tool-row-jj');
      expect(jjRow).toHaveClass('warning');
    });

    it('should display error message for unresolved tools', async () => {
      render(<ToolSettingsPanel />);

      expect(screen.getByText(/jj not found/i)).toBeInTheDocument();
    });

    it('should display install guidance for unresolved tools', async () => {
      render(<ToolSettingsPanel />);

      expect(screen.getByText(/brew install jj/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.2.4: Manual path input
  // Requirements: 2.2
  // ============================================================
  describe('Task 5.2.4: Manual path input', () => {
    it('should display path input for each tool', async () => {
      render(<ToolSettingsPanel />);

      const claudeInput = screen.getByLabelText(/claude.*パス|claude.*path/i);
      expect(claudeInput).toBeInTheDocument();
    });

    it('should allow typing in path input', async () => {
      render(<ToolSettingsPanel />);

      const jjInput = screen.getByLabelText(/jj.*パス|jj.*path/i) as HTMLInputElement;
      fireEvent.change(jjInput, { target: { value: '/custom/path/to/jj' } });

      expect(jjInput.value).toBe('/custom/path/to/jj');
    });

    it('should call setToolPath when path is submitted', async () => {
      render(<ToolSettingsPanel />);

      const jjInput = screen.getByLabelText(/jj.*パス|jj.*path/i);
      fireEvent.change(jjInput, { target: { value: '/custom/path/to/jj' } });
      fireEvent.blur(jjInput);

      await waitFor(() => {
        expect(mockSetToolPath).toHaveBeenCalledWith('jj', '/custom/path/to/jj');
      });
    });

    it('should not call setToolPath if path is empty', async () => {
      render(<ToolSettingsPanel />);

      const jjInput = screen.getByLabelText(/jj.*パス|jj.*path/i);
      fireEvent.change(jjInput, { target: { value: '' } });
      fireEvent.blur(jjInput);

      expect(mockSetToolPath).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 5.2.5: Clear path functionality
  // Requirements: 2.2
  // ============================================================
  describe('Task 5.2.5: Clear path functionality', () => {
    it('should have a clear button for manually set paths', async () => {
      // Mock a status with manual source
      const { useToolPathStore } = await import('../../shared/stores/toolPathStore');
      (useToolPathStore as any).mockReturnValue({
        statuses: [
          {
            definition: {
              name: 'claude',
              required: true,
              versionCommand: '--version',
              installGuidance: 'Install Claude Code',
            },
            resolution: {
              resolved: true,
              path: '/custom/path/claude',
              source: 'manual',
            },
          },
        ],
        isLoading: false,
        error: null,
        fetchStatuses: mockFetchStatuses,
        setToolPath: mockSetToolPath,
        resolveTool: mockResolveTool,
        getStatusByName: mockGetStatusByName,
      });

      render(<ToolSettingsPanel />);

      const clearButton = screen.getByRole('button', { name: /クリア|clear/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should call setToolPath with null when clear button is clicked', async () => {
      const { useToolPathStore } = await import('../../shared/stores/toolPathStore');
      (useToolPathStore as any).mockReturnValue({
        statuses: [
          {
            definition: {
              name: 'claude',
              required: true,
              versionCommand: '--version',
              installGuidance: 'Install Claude Code',
            },
            resolution: {
              resolved: true,
              path: '/custom/path/claude',
              source: 'manual',
            },
          },
        ],
        isLoading: false,
        error: null,
        fetchStatuses: mockFetchStatuses,
        setToolPath: mockSetToolPath,
        resolveTool: mockResolveTool,
        getStatusByName: mockGetStatusByName,
      });

      render(<ToolSettingsPanel />);

      const clearButton = screen.getByRole('button', { name: /クリア|clear/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockSetToolPath).toHaveBeenCalledWith('claude', null);
      });
    });
  });

  // ============================================================
  // Task 5.2.6: Loading state
  // ============================================================
  describe('Task 5.2.6: Loading state', () => {
    it('should show loading indicator when loading', async () => {
      const { useToolPathStore } = await import('../../shared/stores/toolPathStore');
      (useToolPathStore as any).mockReturnValue({
        statuses: [],
        isLoading: true,
        error: null,
        fetchStatuses: mockFetchStatuses,
        setToolPath: mockSetToolPath,
        resolveTool: mockResolveTool,
        getStatusByName: mockGetStatusByName,
      });

      render(<ToolSettingsPanel />);

      expect(screen.getByTestId('tool-loading')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.2.7: Error state
  // ============================================================
  describe('Task 5.2.7: Error state', () => {
    it('should show error message when there is an error', async () => {
      const { useToolPathStore } = await import('../../shared/stores/toolPathStore');
      (useToolPathStore as any).mockReturnValue({
        statuses: [],
        isLoading: false,
        error: 'Failed to fetch tool statuses',
        fetchStatuses: mockFetchStatuses,
        setToolPath: mockSetToolPath,
        resolveTool: mockResolveTool,
        getStatusByName: mockGetStatusByName,
      });

      render(<ToolSettingsPanel />);

      expect(screen.getByText(/Failed to fetch tool statuses/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.2.8: Source indicator
  // ============================================================
  describe('Task 5.2.8: Source indicator', () => {
    it('should show source indicator for well-known paths', async () => {
      render(<ToolSettingsPanel />);

      // claude has source 'well-known'
      expect(screen.getByText(/well-known|自動検出/i)).toBeInTheDocument();
    });

    it('should show source indicator for manual paths', async () => {
      const { useToolPathStore } = await import('../../shared/stores/toolPathStore');
      (useToolPathStore as any).mockReturnValue({
        statuses: [
          {
            definition: {
              name: 'claude',
              required: true,
              versionCommand: '--version',
              installGuidance: 'Install Claude Code',
            },
            resolution: {
              resolved: true,
              path: '/custom/path/claude',
              source: 'manual',
            },
          },
        ],
        isLoading: false,
        error: null,
        fetchStatuses: mockFetchStatuses,
        setToolPath: mockSetToolPath,
        resolveTool: mockResolveTool,
        getStatusByName: mockGetStatusByName,
      });

      render(<ToolSettingsPanel />);

      expect(screen.getByText(/manual|手動設定/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 5.2.9: Accessibility
  // ============================================================
  describe('Task 5.2.9: Accessibility', () => {
    it('should have accessible labels for all form controls', async () => {
      // Reset mock to use original statuses with all tools
      const { useToolPathStore } = await import('../../shared/stores/toolPathStore');
      (useToolPathStore as any).mockReturnValue({
        statuses: mockStatuses,
        isLoading: false,
        error: null,
        fetchStatuses: mockFetchStatuses,
        setToolPath: mockSetToolPath,
        resolveTool: mockResolveTool,
        getStatusByName: mockGetStatusByName,
      });

      render(<ToolSettingsPanel />);

      const claudeInput = screen.getByLabelText(/claude.*パス|claude.*path/i);
      expect(claudeInput).toHaveAccessibleName();

      const jjInput = screen.getByLabelText(/jj.*パス|jj.*path/i);
      expect(jjInput).toHaveAccessibleName();
    });
  });
});
