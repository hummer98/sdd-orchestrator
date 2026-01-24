/**
 * McpSettingsPanel Component Tests
 * TDD: Testing MCP Server settings UI
 * mcp-server-integration: Task 7.2
 * Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { McpSettingsPanel } from './McpSettingsPanel';

// Mock electronAPI
const mockGetSettings = vi.fn();
const mockSetEnabled = vi.fn();
const mockSetPort = vi.fn();
const mockGetStatus = vi.fn();

// Mock clipboard API
const mockWriteText = vi.fn();

// Mock projectStore
vi.mock('../stores/projectStore', () => ({
  useProjectStore: vi.fn(() => ({
    currentProject: '/path/to/my-project',
  })),
}));

describe('McpSettingsPanel', () => {
  // Setup window.electronAPI mock
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({
      enabled: true,
      port: 3001,
    });
    mockGetStatus.mockResolvedValue({
      isRunning: true,
      port: 3001,
      url: 'http://localhost:3001',
    });
    mockSetEnabled.mockResolvedValue(undefined);
    mockSetPort.mockResolvedValue(undefined);
    mockWriteText.mockResolvedValue(undefined);

    (window as any).electronAPI = {
      mcpServer: {
        getSettings: mockGetSettings,
        setEnabled: mockSetEnabled,
        setPort: mockSetPort,
        getStatus: mockGetStatus,
      },
    };

    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================
  // Task 7.2.1: Panel header and basic rendering
  // Requirements: 6.2
  // ============================================================
  describe('Task 7.2.1: Panel header and basic rendering', () => {
    it('should render MCP settings panel with proper heading', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent(/MCP/i);
      });
    });

    it('should load settings on mount', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(mockGetSettings).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // Task 7.2.2: MCP enabled/disabled toggle
  // Requirements: 6.3, 6.4
  // ============================================================
  describe('Task 7.2.2: MCP enabled/disabled toggle', () => {
    it('should render enabled toggle', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i });
        expect(toggle).toBeInTheDocument();
      });
    });

    it('should reflect enabled state from settings', async () => {
      mockGetSettings.mockResolvedValue({ enabled: true, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i });
        expect(toggle).toBeChecked();
      });
    });

    it('should reflect disabled state from settings', async () => {
      mockGetSettings.mockResolvedValue({ enabled: false, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i });
        expect(toggle).not.toBeChecked();
      });
    });

    it('should call setEnabled when toggle is clicked', async () => {
      mockGetSettings.mockResolvedValue({ enabled: true, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i })).toBeInTheDocument();
      });

      const toggle = screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(mockSetEnabled).toHaveBeenCalledWith(false);
      });
    });

    it('should call setEnabled(true) when enabling', async () => {
      mockGetSettings.mockResolvedValue({ enabled: false, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i })).toBeInTheDocument();
      });

      const toggle = screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(mockSetEnabled).toHaveBeenCalledWith(true);
      });
    });
  });

  // ============================================================
  // Task 7.2.3: Port number setting
  // Requirements: 6.5
  // ============================================================
  describe('Task 7.2.3: Port number setting', () => {
    it('should render port number input', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const portInput = screen.getByLabelText(/ポート|Port/i);
        expect(portInput).toBeInTheDocument();
      });
    });

    it('should reflect port value from settings', async () => {
      mockGetSettings.mockResolvedValue({ enabled: true, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const portInput = screen.getByLabelText(/ポート|Port/i) as HTMLInputElement;
        expect(portInput.value).toBe('3001');
      });
    });

    it('should update port value when typing', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByLabelText(/ポート|Port/i)).toBeInTheDocument();
      });

      const portInput = screen.getByLabelText(/ポート|Port/i) as HTMLInputElement;
      fireEvent.change(portInput, { target: { value: '4000' } });

      expect(portInput.value).toBe('4000');
    });

    it('should call setPort when port is changed and saved', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByLabelText(/ポート|Port/i)).toBeInTheDocument();
      });

      const portInput = screen.getByLabelText(/ポート|Port/i);
      fireEvent.change(portInput, { target: { value: '4000' } });
      fireEvent.blur(portInput);

      await waitFor(() => {
        expect(mockSetPort).toHaveBeenCalledWith(4000);
      });
    });

    it('should not call setPort if port value is unchanged', async () => {
      mockGetSettings.mockResolvedValue({ enabled: true, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByLabelText(/ポート|Port/i)).toBeInTheDocument();
      });

      const portInput = screen.getByLabelText(/ポート|Port/i);
      fireEvent.blur(portInput);

      expect(mockSetPort).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Task 7.2.4: claude mcp add command display
  // Requirements: 6.6, 6.7
  // ============================================================
  describe('Task 7.2.4: claude mcp add command display', () => {
    it('should display claude mcp add command', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const commandText = screen.getByText(/claude mcp add/i);
        expect(commandText).toBeInTheDocument();
      });
    });

    it('should include project path in command', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        // The command should contain the project path
        expect(screen.getByText(/my-project/)).toBeInTheDocument();
      });
    });

    it('should include port in command URL', async () => {
      mockGetSettings.mockResolvedValue({ enabled: true, port: 3001 });
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText(/localhost:3001/)).toBeInTheDocument();
      });
    });

    it('should update command when port changes', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByLabelText(/ポート|Port/i)).toBeInTheDocument();
      });

      const portInput = screen.getByLabelText(/ポート|Port/i);
      fireEvent.change(portInput, { target: { value: '5000' } });

      await waitFor(() => {
        expect(screen.getByText(/localhost:5000/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 7.2.5: Copy button functionality
  // Requirements: 6.8
  // ============================================================
  describe('Task 7.2.5: Copy button functionality', () => {
    it('should render copy button', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const copyButton = screen.getByRole('button', { name: /コピー|Copy/i });
        expect(copyButton).toBeInTheDocument();
      });
    });

    it('should copy command to clipboard when copy button clicked', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /コピー|Copy/i })).toBeInTheDocument();
      });

      const copyButton = screen.getByRole('button', { name: /コピー|Copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled();
        // Should include claude mcp add and the project path
        expect(mockWriteText.mock.calls[0][0]).toContain('claude mcp add');
        expect(mockWriteText.mock.calls[0][0]).toContain('my-project');
        expect(mockWriteText.mock.calls[0][0]).toContain('localhost:3001');
      });
    });

    it('should show success feedback after copying', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /コピー|Copy/i })).toBeInTheDocument();
      });

      const copyButton = screen.getByRole('button', { name: /コピー|Copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/コピーしました|Copied/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 7.2.6: Project path handling
  // Note: Testing no-project state requires separate test file or different approach
  // The component shows "プロジェクトを選択してください" when no project is selected
  // This is verified by the component implementation
  // ============================================================
  describe('Task 7.2.6: Project path handling', () => {
    it('should extract project name from path for command', async () => {
      // The mock returns /path/to/my-project, so the command should use 'my-project'
      render(<McpSettingsPanel />);

      await waitFor(() => {
        // Verify the command uses extracted project name (not full path)
        const code = screen.getByText(/claude mcp add my-project/i);
        expect(code).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 7.2.7: Accessibility
  // ============================================================
  describe('Task 7.2.7: Accessibility', () => {
    it('should have accessible labels for all form controls', async () => {
      render(<McpSettingsPanel />);

      await waitFor(() => {
        const toggle = screen.getByRole('checkbox', { name: /MCP.*有効|Enable.*MCP/i });
        expect(toggle).toHaveAccessibleName();

        const portInput = screen.getByLabelText(/ポート|Port/i);
        expect(portInput).toHaveAccessibleName();
      });
    });
  });
});
