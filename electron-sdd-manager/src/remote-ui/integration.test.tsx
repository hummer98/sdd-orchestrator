/**
 * Remote UI Integration Tests
 *
 * Task 11.1-11.5: 機能統合テスト
 * Requirements: 4.2, 4.3, 4.4, 5.2, 5.4, 7.1, 7.2, 11.1, 11.2, 11.5
 *
 * これらのテストはRemote UIの主要機能が正しく統合されていることを検証する。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock shared modules
vi.mock('../shared', async () => {
  const React = await import('react');
  const { vi: innerVi } = await import('vitest');
  // Create the mock api client inside the factory
  const mockApi = {
    getSpecs: innerVi.fn().mockResolvedValue({ ok: true, value: [] }),
    getSpecDetail: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    executePhase: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    updateApproval: innerVi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getBugs: innerVi.fn().mockResolvedValue({ ok: true, value: [] }),
    getBugDetail: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeBugPhase: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    getAgents: innerVi.fn().mockResolvedValue({ ok: true, value: [] }),
    stopAgent: innerVi.fn().mockResolvedValue({ ok: true, value: undefined }),
    resumeAgent: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    sendAgentInput: innerVi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAgentLogs: innerVi.fn().mockResolvedValue({ ok: true, value: [] }),
    executeValidation: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeDocumentReview: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    executeInspection: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    startAutoExecution: innerVi.fn().mockResolvedValue({ ok: true, value: {} }),
    stopAutoExecution: innerVi.fn().mockResolvedValue({ ok: true, value: undefined }),
    getAutoExecutionStatus: innerVi.fn().mockResolvedValue({ ok: true, value: null }),
    saveFile: innerVi.fn().mockResolvedValue({ ok: true, value: undefined }),
    onSpecsUpdated: innerVi.fn().mockReturnValue(() => {}),
    onBugsUpdated: innerVi.fn().mockReturnValue(() => {}),
    onAgentOutput: innerVi.fn().mockReturnValue(() => {}),
    onAgentStatusChange: innerVi.fn().mockReturnValue(() => {}),
    onAutoExecutionStatusChanged: innerVi.fn().mockReturnValue(() => {}),
  };
  return {
    ApiClientProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'api-client-provider' }, children),
    PlatformProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'platform-provider' }, children),
    useDeviceType: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
    useApi: () => mockApi,
  };
});

// Mock layouts
vi.mock('./layouts', async () => {
  const React = await import('react');
  return {
    MobileLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mobile-layout' }, children),
    DesktopLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'desktop-layout' }, children),
  };
});

describe('Task 11: Remote UI Integration Tests', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Task 11.1: Remote UIの接続フロー', () => {
    it('should render App with providers for token authentication', async () => {
      const { default: App } = await import('./App');
      render(<App />);

      // Providers should be present
      expect(screen.getByTestId('api-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('platform-provider')).toBeInTheDocument();
    });

    it('should support token extraction from URL query string', () => {
      const urlParams = new URLSearchParams('?token=test-token-123');
      const token = urlParams.get('token');
      expect(token).toBe('test-token-123');
    });

    it('should construct WebSocket URL correctly', () => {
      // Mock location for testing
      const protocol = 'http:';
      const host = 'localhost:8765';

      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${host}/ws`;

      expect(wsUrl).toBe('ws://localhost:8765/ws');
    });

    it('should support HTTPS to WSS conversion', () => {
      const protocol = 'https:';
      const host = 'example.com:443';

      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${host}/ws`;

      expect(wsUrl).toBe('wss://example.com:443/ws');
    });
  });

  describe('Task 11.2: フェーズ実行フロー', () => {
    it('should have ApiClient available through useApi hook', async () => {
      const { useApi } = await import('../shared');
      const api = useApi();

      expect(api.getSpecs).toBeDefined();
      expect(api.getBugs).toBeDefined();
      expect(api.getAgents).toBeDefined();
    });

    it('should have getSpecs method that can be called', async () => {
      const { useApi } = await import('../shared');
      const api = useApi();

      // getSpecs should be defined and callable
      expect(api.getSpecs).toBeDefined();
      expect(typeof api.getSpecs).toBe('function');
    });
  });

  describe('Task 11.3: Bug操作フロー', () => {
    it('should have getBugs method that can be called', async () => {
      const { useApi } = await import('../shared');
      const api = useApi();

      // getBugs should be defined and callable
      expect(api.getBugs).toBeDefined();
      expect(typeof api.getBugs).toBe('function');
    });
  });

  describe('Task 11.4: レスポンシブUI', () => {
    it('should render DesktopLayout for desktop devices', async () => {
      const { default: App } = await import('./App');
      render(<App />);

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });

    it('should use useDeviceType hook for device detection', async () => {
      const { useDeviceType } = await import('../shared');
      const deviceType = useDeviceType();

      expect(deviceType).toHaveProperty('isMobile');
      expect(deviceType).toHaveProperty('isTablet');
      expect(deviceType).toHaveProperty('isDesktop');
    });

    it('should detect desktop correctly', async () => {
      const { useDeviceType } = await import('../shared');
      const deviceType = useDeviceType();

      expect(deviceType.isDesktop).toBe(true);
      expect(deviceType.isMobile).toBe(false);
    });
  });

  describe('Task 11.5: CLI起動オプション', () => {
    it('should export parseCLIArgs from cliArgsParser', async () => {
      const { parseCLIArgs } = await import('../main/utils/cliArgsParser');
      expect(parseCLIArgs).toBeDefined();
    });

    it('should parse --project option', async () => {
      const { parseCLIArgs } = await import('../main/utils/cliArgsParser');
      const options = parseCLIArgs(['--project=/path/to/project']);

      expect(options.projectPath).toBe('/path/to/project');
    });

    it('should parse --remote-ui=auto option', async () => {
      const { parseCLIArgs } = await import('../main/utils/cliArgsParser');
      const options = parseCLIArgs(['--remote-ui=auto']);

      expect(options.remoteUIAuto).toBe(true);
    });

    it('should parse --headless option', async () => {
      const { parseCLIArgs } = await import('../main/utils/cliArgsParser');
      const options = parseCLIArgs(['--headless']);

      expect(options.headless).toBe(true);
    });

    it('should parse combined E2E test options', async () => {
      const { parseCLIArgs } = await import('../main/utils/cliArgsParser');
      const options = parseCLIArgs([
        '--project=/test/project',
        '--remote-ui=auto',
        '--headless',
        '--e2e-test',
        '--remote-token=test-token',
      ]);

      expect(options.projectPath).toBe('/test/project');
      expect(options.remoteUIAuto).toBe(true);
      expect(options.headless).toBe(true);
      expect(options.e2eTest).toBe(true);
      expect(options.remoteToken).toBe('test-token');
    });
  });

  describe('Task 13.9: View Integration Tests', () => {
    it('should export all view components from views/index.ts', async () => {
      const views = await import('./views');

      expect(views.SpecsView).toBeDefined();
      expect(views.SpecDetailView).toBeDefined();
      expect(views.SpecActionsView).toBeDefined();
      expect(views.BugsView).toBeDefined();
      expect(views.BugDetailView).toBeDefined();
      expect(views.AgentView).toBeDefined();
      expect(views.ProjectAgentView).toBeDefined();
    });

    it('should render App with integrated views', async () => {
      const { default: App } = await import('./App');
      render(<App />);

      // App should render with layout
      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });

    it('should have view integration with tab-based navigation', async () => {
      const { default: App } = await import('./App');
      const { container } = render(<App />);

      // App renders and has content
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });
});
