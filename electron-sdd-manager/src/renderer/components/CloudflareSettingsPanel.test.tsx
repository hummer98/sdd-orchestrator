/**
 * CloudflareSettingsPanel Component Tests
 * TDD: Testing Cloudflare Tunnel Token settings UI
 * Requirements: 2.1, 2.4
 * Task 8.1: SettingsPanelにCloudflare Tunnel Token入力セクションを追加
 *
 * trpc-full-migration Task 11.4: Migrated from window.electronAPI to tRPC vanilla client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// trpc-full-migration Task 11.4: Mock tRPC vanilla client for cloudflare operations
const mockGetCloudflareSettings = vi.fn();
const mockSetTunnelToken = vi.fn();

vi.mock('../../shared/trpc/vanillaClient', () => ({
  getVanillaClient: () => ({
    cloudflare: {
      getSettings: { query: mockGetCloudflareSettings },
      setTunnelToken: { mutate: mockSetTunnelToken },
    },
  }),
}));

vi.mock('../../preload', () => ({}));

import { CloudflareSettingsPanel } from './CloudflareSettingsPanel';

describe('CloudflareSettingsPanel', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockGetCloudflareSettings.mockResolvedValue({
      hasTunnelToken: false,
      accessToken: null,
      publishToCloudflare: false,
      cloudflaredPath: null,
    });
  });
  // ============================================================
  // Task 8.1.1: Token input field with mask display
  // Requirements: 2.1
  // ============================================================
  describe('Task 8.1.1: Token input field', () => {
    it('should render token input field', () => {
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      expect(tokenInput).toBeInTheDocument();
    });

    it('should mask token input by default (password type)', () => {
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      expect(tokenInput).toHaveAttribute('type', 'password');
    });

    it('should allow toggling token visibility', async () => {
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      const toggleButton = screen.getByRole('button', { name: /show|表示/i });

      expect(tokenInput).toHaveAttribute('type', 'password');

      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(tokenInput).toHaveAttribute('type', 'text');
      });
    });

    it('should update input value when typing', () => {
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i) as HTMLInputElement;
      fireEvent.change(tokenInput, { target: { value: 'my-tunnel-token' } });

      expect(tokenInput.value).toBe('my-tunnel-token');
    });
  });

  // ============================================================
  // Task 8.1.2: Save button and feedback
  // Requirements: 2.1
  // ============================================================
  describe('Task 8.1.2: Save button and feedback', () => {
    it('should render save button', () => {
      render(<CloudflareSettingsPanel />);

      const saveButton = screen.getByRole('button', { name: /save|保存/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should call setTunnelToken via tRPC when save button clicked', async () => {
      mockSetTunnelToken.mockResolvedValue(undefined);
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      const saveButton = screen.getByRole('button', { name: /save|保存/i });

      fireEvent.change(tokenInput, { target: { value: 'my-test-token' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSetTunnelToken).toHaveBeenCalledWith({ token: 'my-test-token' });
      });
    });

    it('should show success feedback after saving', async () => {
      mockSetTunnelToken.mockResolvedValue(undefined);
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      const saveButton = screen.getByRole('button', { name: /save|保存/i });

      fireEvent.change(tokenInput, { target: { value: 'my-test-token' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saved|保存しました/i)).toBeInTheDocument();
      });
    });

    it('should disable save button while saving', async () => {
      let resolvePromise: () => void;
      mockSetTunnelToken.mockImplementation(
        () => new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
      );

      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      const saveButton = screen.getByRole('button', { name: /save|保存/i });

      fireEvent.change(tokenInput, { target: { value: 'my-test-token' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });

      resolvePromise!();
    });

    it('should disable save button when token is empty', () => {
      render(<CloudflareSettingsPanel />);

      const saveButton = screen.getByRole('button', { name: /save|保存/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // ============================================================
  // Task 8.1.3: Environment variable message
  // Requirements: 2.4
  // ============================================================
  describe('Task 8.1.3: Environment variable message', () => {
    it('should display environment variable hint text', () => {
      render(<CloudflareSettingsPanel />);

      // Check for code element with the environment variable name
      const helpText = document.querySelector('[id="token-help-text"]');
      expect(helpText).toBeInTheDocument();
      expect(helpText?.textContent).toMatch(/CLOUDFLARE_TUNNEL_TOKEN/);
    });

    it('should indicate when token is set via environment variable', async () => {
      mockGetCloudflareSettings.mockResolvedValue({
        hasTunnelToken: true,
        accessToken: 'token123',
        publishToCloudflare: false,
        cloudflaredPath: null,
      });

      render(<CloudflareSettingsPanel />);

      await waitFor(() => {
        // Should show that a token is configured
        expect(screen.getByText(/設定済み|Configured/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Task 8.1.4: Panel header and accessibility
  // ============================================================
  describe('Task 8.1.4: Panel header and accessibility', () => {
    it('should have proper heading', () => {
      render(<CloudflareSettingsPanel />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/Cloudflare|Tunnel/i);
    });

    it('should have accessible labels', () => {
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      expect(tokenInput).toHaveAccessibleName();
    });

    it('should have placeholder text in token input', () => {
      render(<CloudflareSettingsPanel />);

      const tokenInput = screen.getByLabelText(/Tunnel Token/i);
      expect(tokenInput).toHaveAttribute('placeholder');
    });
  });
});
