/**
 * GitHubSettingsSection Component Tests
 * TDD: Testing GitHub connection settings UI in ProjectPane
 * github-issue-integration: Task 9.1
 * Requirements: 1.1, 1.3, 1.5, 1.6, 12.1, 12.2, 12.3, 12.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GitHubSettingsSection, type GitHubSettingsSectionProps } from '../GitHubSettingsSection';

// ============================================================
// Mock vanillaClient
// ============================================================

const mockSetGitHubToken = vi.fn();
const mockRemoveGitHubToken = vi.fn();
const mockSetEnterpriseUrl = vi.fn();
const mockTestConnection = vi.fn();
const mockDetectRepoInfo = vi.fn();
const mockGetConnectionStatus = vi.fn();

vi.mock('@shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    issue: {
      setGitHubToken: { mutate: mockSetGitHubToken },
      removeGitHubToken: { mutate: mockRemoveGitHubToken },
      setEnterpriseUrl: { mutate: mockSetEnterpriseUrl },
      testConnection: { query: mockTestConnection },
      detectRepoInfo: { query: mockDetectRepoInfo },
      getConnectionStatus: { query: mockGetConnectionStatus },
    },
  }),
}));

// ============================================================
// Test Setup
// ============================================================

const defaultProps: GitHubSettingsSectionProps = {
  projectPath: '/test/project',
};

const renderComponent = (props: Partial<GitHubSettingsSectionProps> = {}) => {
  return render(<GitHubSettingsSection {...defaultProps} {...props} />);
};

describe('GitHubSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnectionStatus.mockResolvedValue({
      configured: false,
      connected: false,
      user: null,
      repoInfo: null,
      error: null,
    });
    mockDetectRepoInfo.mockResolvedValue({
      owner: 'test-owner',
      repo: 'test-repo',
      baseUrl: 'https://api.github.com',
    });
  });

  // ============================================================
  // Req 12.1: ProjectPaneにGitHub連携設定セクションを追加
  // ============================================================

  describe('section rendering', () => {
    it('should render the GitHub settings section heading', async () => {
      renderComponent();

      expect(screen.getByText(/GitHub/i)).toBeInTheDocument();
    });

    it('should not render when projectPath is empty', () => {
      const { container } = renderComponent({ projectPath: '' });

      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================
  // Req 1.1, 12.2: PAT入力フィールド
  // ============================================================

  describe('PAT input', () => {
    it('should render a password input field for PAT', async () => {
      renderComponent();

      await waitFor(() => {
        const input = screen.getByLabelText(/Personal Access Token/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('type', 'password');
      });
    });

    it('should call setGitHubToken mutation when PAT is saved', async () => {
      mockSetGitHubToken.mockResolvedValue(undefined);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Personal Access Token/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Personal Access Token/i);
      fireEvent.change(input, { target: { value: 'ghp_test_token_123' } });

      const saveButton = screen.getByRole('button', { name: /^保存$/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSetGitHubToken).toHaveBeenCalledWith({
          projectPath: '/test/project',
          token: 'ghp_test_token_123',
        });
      });
    });

    it('should disable save button when PAT input is empty', async () => {
      renderComponent();

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /^保存$/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  // ============================================================
  // Req 1.3, 12.2: GitHub Enterprise URL入力フィールド
  // ============================================================

  describe('Enterprise URL input', () => {
    it('should render an Enterprise URL input field', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Enterprise URL/i)).toBeInTheDocument();
      });
    });

    it('should call setEnterpriseUrl mutation when URL is saved', async () => {
      mockSetEnterpriseUrl.mockResolvedValue(undefined);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Enterprise URL/i)).toBeInTheDocument();
      });

      const input = screen.getByLabelText(/Enterprise URL/i);
      fireEvent.change(input, { target: { value: 'https://github.example.com' } });

      const urlSaveButton = screen.getByRole('button', { name: /URL保存/i });
      fireEvent.click(urlSaveButton);

      await waitFor(() => {
        expect(mockSetEnterpriseUrl).toHaveBeenCalledWith({
          projectPath: '/test/project',
          url: 'https://github.example.com',
        });
      });
    });
  });

  // ============================================================
  // Req 12.3: git remoteからowner/repo自動検出結果の表示
  // ============================================================

  describe('repo detection', () => {
    it('should display detected owner/repo from git remote', async () => {
      mockDetectRepoInfo.mockResolvedValue({
        owner: 'my-org',
        repo: 'my-project',
        baseUrl: 'https://api.github.com',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/my-org\/my-project/)).toBeInTheDocument();
      });
    });

    it('should show error when repo detection fails', async () => {
      mockDetectRepoInfo.mockRejectedValue(new Error('git remote not configured'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/リポジトリ.*検出.*失敗|git remote/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Req 1.5, 1.6: 接続テストボタンと結果表示
  // ============================================================

  describe('connection test', () => {
    it('should render a connection test button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /接続テスト/i })).toBeInTheDocument();
      });
    });

    it('should display user login name on successful connection test', async () => {
      mockTestConnection.mockResolvedValue({
        login: 'test-user',
        avatar_url: 'https://github.com/test-user.png',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /接続テスト/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /接続テスト/i }));

      await waitFor(() => {
        expect(screen.getByText(/test-user/)).toBeInTheDocument();
      });
    });

    it('should display error message on failed connection test', async () => {
      mockTestConnection.mockRejectedValue(new Error('Bad credentials'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /接続テスト/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /接続テスト/i }));

      await waitFor(() => {
        expect(screen.getByText(/Bad credentials/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during connection test', async () => {
      let resolveTest: (value: any) => void;
      mockTestConnection.mockReturnValue(
        new Promise((resolve) => { resolveTest = resolve; })
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /接続テスト/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /接続テスト/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /接続テスト/i })).toBeDisabled();
      });

      // Resolve to clean up
      resolveTest!({ login: 'user', avatar_url: '' });
    });
  });

  // ============================================================
  // Req 12.4: 接続ステータス表示
  // ============================================================

  describe('connection status display', () => {
    it('should show "not configured" status when no PAT is set', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        configured: false,
        connected: false,
        user: null,
        repoInfo: null,
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/未設定/i)).toBeInTheDocument();
      });
    });

    it('should show "connected" status when connection is active', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        configured: true,
        connected: true,
        user: { login: 'active-user', avatar_url: '' },
        repoInfo: { owner: 'o', repo: 'r', baseUrl: 'https://api.github.com' },
        error: null,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/接続済み/i)).toBeInTheDocument();
      });
    });

    it('should show "error" status when connection failed', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        configured: true,
        connected: false,
        user: null,
        repoInfo: null,
        error: 'Token expired',
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/エラー/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Token removal
  // ============================================================

  describe('token removal', () => {
    it('should provide a button to remove stored token when configured', async () => {
      mockGetConnectionStatus.mockResolvedValue({
        configured: true,
        connected: true,
        user: { login: 'user', avatar_url: '' },
        repoInfo: null,
        error: null,
      });
      mockRemoveGitHubToken.mockResolvedValue(undefined);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /削除|トークン.*削除/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /削除|トークン.*削除/i }));

      await waitFor(() => {
        expect(mockRemoveGitHubToken).toHaveBeenCalledWith({
          projectPath: '/test/project',
        });
      });
    });
  });
});
