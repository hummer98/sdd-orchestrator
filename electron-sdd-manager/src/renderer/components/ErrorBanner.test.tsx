/**
 * ErrorBanner Component Tests
 * TDD: Testing error banner for directory validation and spec-manager install
 * Task 2.1, 2.2, 2.3 (sidebar-refactor)
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from './ErrorBanner';
import { useProjectStore } from '../stores/projectStore';

describe('ErrorBanner', () => {
  beforeEach(() => {
    // Reset store state
    useProjectStore.setState({
      currentProject: '/test/project',
      kiroValidation: null,
      specManagerCheck: null,
      installLoading: false,
      installResult: null,
      installError: null,
    });
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 2.1: 条件付きエラーバナー表示機能
  // Requirements: 3.1, 3.2, 3.3
  // ============================================================
  describe('Task 2.1: Conditional error banner display', () => {
    it('should not render when all directories exist', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        },
      });

      const { container } = render(<ErrorBanner />);
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
    });

    it('should render when .kiro directory does not exist', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      render(<ErrorBanner />);
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('should render when specs directory does not exist', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: false,
          hasSteering: true,
        },
      });

      render(<ErrorBanner />);
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('should render when steering directory does not exist', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: true,
          hasSteering: false,
        },
      });

      render(<ErrorBanner />);
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
    });

    it('should display missing directory names when expanded', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      render(<ErrorBanner expanded={true} />);
      expect(screen.getByText('.kiro ディレクトリ')).toBeInTheDocument();
    });

    it('should show warning icon', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      render(<ErrorBanner />);
      expect(screen.getByTestId('error-banner-icon')).toBeInTheDocument();
    });
  });

  // ============================================================
  // Task 2.2: エラーバナーの展開・折りたたみ機能
  // Requirements: 3.4
  // ============================================================
  describe('Task 2.2: Expand/collapse functionality', () => {
    it('should expand details when banner is clicked', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      render(<ErrorBanner />);

      // Initially collapsed - no init button visible
      expect(screen.queryByRole('button', { name: /初期化/i })).not.toBeInTheDocument();

      // Click to expand
      const banner = screen.getByTestId('error-banner-header');
      fireEvent.click(banner);

      // Now expanded - init button visible
      expect(screen.getByRole('button', { name: /初期化/i })).toBeInTheDocument();
    });

    it('should show .kiro init button when expanded', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      render(<ErrorBanner expanded={true} />);
      expect(screen.getByRole('button', { name: /初期化/i })).toBeInTheDocument();
    });

    it('should call onExpandedChange when clicked', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      const onExpandedChange = vi.fn();
      render(<ErrorBanner expanded={false} onExpandedChange={onExpandedChange} />);

      const banner = screen.getByTestId('error-banner-header');
      fireEvent.click(banner);

      expect(onExpandedChange).toHaveBeenCalledWith(true);
    });
  });

  // ============================================================
  // Task 2.3: spec-managerファイルのインストールオプション
  // Requirements: 3.5
  // ============================================================
  describe('Task 2.3: spec-manager install options', () => {
    it('should show spec-manager install section when files are missing', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        },
        specManagerCheck: {
          commands: { allPresent: false, missing: ['spec-init.md'], present: [] },
          settings: { allPresent: true, missing: [], present: [] },
          allPresent: false,
        },
      });

      render(<ErrorBanner expanded={true} />);
      expect(screen.getByText(/spec-manager/i)).toBeInTheDocument();
    });

    it('should not show spec-manager section when all files present', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        },
        specManagerCheck: {
          commands: { allPresent: true, missing: [], present: ['spec-init.md'] },
          settings: { allPresent: true, missing: [], present: ['settings.json'] },
          allPresent: true,
        },
      });

      const { container } = render(<ErrorBanner expanded={true} />);
      // All good, no banner at all
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
    });

    it('should show install commands button when commands are missing', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        },
        specManagerCheck: {
          commands: { allPresent: false, missing: ['spec-init.md'], present: [] },
          settings: { allPresent: true, missing: [], present: [] },
          allPresent: false,
        },
      });

      render(<ErrorBanner expanded={true} />);
      expect(screen.getByRole('button', { name: /コマンドをインストール/i })).toBeInTheDocument();
    });

    it('should show loading state during install', () => {
      useProjectStore.setState({
        kiroValidation: {
          exists: true,
          hasSpecs: true,
          hasSteering: true,
        },
        specManagerCheck: {
          commands: { allPresent: false, missing: ['spec-init.md'], present: [] },
          settings: { allPresent: true, missing: [], present: [] },
          allPresent: false,
        },
        installLoading: true,
      });

      render(<ErrorBanner expanded={true} />);
      expect(screen.getByText(/インストール中/i)).toBeInTheDocument();
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('Edge cases', () => {
    it('should not render when kiroValidation is null', () => {
      useProjectStore.setState({
        kiroValidation: null,
      });

      const { container } = render(<ErrorBanner />);
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
    });

    it('should not render when no project is selected', () => {
      useProjectStore.setState({
        currentProject: null,
        kiroValidation: {
          exists: false,
          hasSpecs: false,
          hasSteering: false,
        },
      });

      const { container } = render(<ErrorBanner />);
      expect(container.querySelector('[data-testid="error-banner"]')).toBeNull();
    });
  });
});
