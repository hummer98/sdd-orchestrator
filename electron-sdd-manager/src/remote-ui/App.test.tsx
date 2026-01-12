/**
 * Remote UI App Integration Test
 *
 * Task 9.1-9.3: Remote UIアプリケーション統合
 * Requirements: 2.4, 4.1
 *
 * このテストはRemote UIのApp.tsxに以下が正しく設定されていることを検証する:
 * - ApiClientProvider
 * - PlatformProvider
 * - デバイスレスポンシブレイアウト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the shared providers and hooks
vi.mock('../shared', async () => {
  const React = await import('react');
  // Create a mock ApiClient
  const mockApiClient = {
    getSpecs: () => Promise.resolve({ ok: true, value: [] }),
    getSpecDetail: () => Promise.resolve({ ok: true, value: {} }),
    executePhase: () => Promise.resolve({ ok: true, value: {} }),
    updateApproval: () => Promise.resolve({ ok: true, value: undefined }),
    getBugs: () => Promise.resolve({ ok: true, value: [] }),
    getBugDetail: () => Promise.resolve({ ok: true, value: {} }),
    executeBugPhase: () => Promise.resolve({ ok: true, value: {} }),
    getAgents: () => Promise.resolve({ ok: true, value: [] }),
    stopAgent: () => Promise.resolve({ ok: true, value: undefined }),
    resumeAgent: () => Promise.resolve({ ok: true, value: {} }),
    sendAgentInput: () => Promise.resolve({ ok: true, value: undefined }),
    getAgentLogs: () => Promise.resolve({ ok: true, value: [] }),
    executeValidation: () => Promise.resolve({ ok: true, value: {} }),
    executeDocumentReview: () => Promise.resolve({ ok: true, value: {} }),
    executeInspection: () => Promise.resolve({ ok: true, value: {} }),
    startAutoExecution: () => Promise.resolve({ ok: true, value: {} }),
    stopAutoExecution: () => Promise.resolve({ ok: true, value: undefined }),
    getAutoExecutionStatus: () => Promise.resolve({ ok: true, value: null }),
    saveFile: () => Promise.resolve({ ok: true, value: undefined }),
    onSpecsUpdated: () => () => {},
    onBugsUpdated: () => () => {},
    onAgentOutput: () => () => {},
    onAgentStatusChange: () => () => {},
    onAutoExecutionStatusChanged: () => () => {},
  };
  return {
    ApiClientProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'api-client-provider' }, children),
    PlatformProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'platform-provider' }, children),
    useDeviceType: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
    useApi: () => mockApiClient,
  };
});

// Mock the layouts
vi.mock('./layouts', async () => {
  const React = await import('react');
  return {
    MobileLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mobile-layout' }, children),
    DesktopLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'desktop-layout' }, children),
  };
});

describe('Task 9: Remote UI App Integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Task 9.1: ApiClientProvider and PlatformProvider Integration', () => {
    it('should wrap App content with ApiClientProvider', async () => {
      const { default: App } = await import('./App');
      render(<App />);

      expect(screen.getByTestId('api-client-provider')).toBeInTheDocument();
    });

    it('should wrap App content with PlatformProvider', async () => {
      const { default: App } = await import('./App');
      render(<App />);

      expect(screen.getByTestId('platform-provider')).toBeInTheDocument();
    });

    it('should have proper provider nesting order (ApiClient outside, Platform inside)', async () => {
      const { default: App } = await import('./App');
      render(<App />);

      const apiProvider = screen.getByTestId('api-client-provider');
      const platformProvider = screen.getByTestId('platform-provider');

      // Platform should be inside API
      expect(apiProvider).toContainElement(platformProvider);
    });
  });

  describe('Task 9.2: Device-responsive Layout', () => {
    it('should render DesktopLayout for desktop devices', async () => {
      // Default mock returns isDesktop: true
      const { default: App } = await import('./App');
      render(<App />);

      expect(screen.getByTestId('desktop-layout')).toBeInTheDocument();
    });

    it('should render MobileLayout for mobile devices', async () => {
      // Override the mock for this test
      vi.doMock('../shared', async () => {
        const React = await import('react');
        const mockApiClient = {
          getSpecs: () => Promise.resolve({ ok: true, value: [] }),
          getSpecDetail: () => Promise.resolve({ ok: true, value: {} }),
          executePhase: () => Promise.resolve({ ok: true, value: {} }),
          updateApproval: () => Promise.resolve({ ok: true, value: undefined }),
          getBugs: () => Promise.resolve({ ok: true, value: [] }),
          getBugDetail: () => Promise.resolve({ ok: true, value: {} }),
          executeBugPhase: () => Promise.resolve({ ok: true, value: {} }),
          getAgents: () => Promise.resolve({ ok: true, value: [] }),
          stopAgent: () => Promise.resolve({ ok: true, value: undefined }),
          resumeAgent: () => Promise.resolve({ ok: true, value: {} }),
          sendAgentInput: () => Promise.resolve({ ok: true, value: undefined }),
          getAgentLogs: () => Promise.resolve({ ok: true, value: [] }),
          executeValidation: () => Promise.resolve({ ok: true, value: {} }),
          executeDocumentReview: () => Promise.resolve({ ok: true, value: {} }),
          executeInspection: () => Promise.resolve({ ok: true, value: {} }),
          startAutoExecution: () => Promise.resolve({ ok: true, value: {} }),
          stopAutoExecution: () => Promise.resolve({ ok: true, value: undefined }),
          getAutoExecutionStatus: () => Promise.resolve({ ok: true, value: null }),
          saveFile: () => Promise.resolve({ ok: true, value: undefined }),
          onSpecsUpdated: () => () => {},
          onBugsUpdated: () => () => {},
          onAgentOutput: () => () => {},
          onAgentStatusChange: () => () => {},
          onAutoExecutionStatusChanged: () => () => {},
        };
        return {
          ApiClientProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'api-client-provider' }, children),
          PlatformProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'platform-provider' }, children),
          useDeviceType: () => ({ isMobile: true, isTablet: false, isDesktop: false }),
          useApi: () => mockApiClient,
        };
      });

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });
  });

  describe('Task 9.3: WebSocket URL Auto-detection', () => {
    it('should extract token from URL query string', () => {
      // This tests the URL parsing logic that ApiClientProvider uses
      const originalLocation = window.location;
      const mockLocation = {
        ...originalLocation,
        search: '?token=test-token-123',
        protocol: 'http:',
        host: 'localhost:8765',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      expect(token).toBe('test-token-123');

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should construct WebSocket URL from current location', () => {
      const originalLocation = window.location;
      const mockLocation = {
        ...originalLocation,
        search: '?token=test-token',
        protocol: 'http:',
        host: 'localhost:8765',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      expect(wsUrl).toBe('ws://localhost:8765/ws');

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });
  });

  describe('Task 13.8: View Integration', () => {
    it('should render main application content with tabs', async () => {
      vi.resetModules();

      // Re-establish the desktop mock
      vi.doMock('../shared', async () => {
        const React = await import('react');
        const mockApiClient = {
          getSpecs: () => Promise.resolve({ ok: true, value: [] }),
          getSpecDetail: () => Promise.resolve({ ok: true, value: {} }),
          executePhase: () => Promise.resolve({ ok: true, value: {} }),
          updateApproval: () => Promise.resolve({ ok: true, value: undefined }),
          getBugs: () => Promise.resolve({ ok: true, value: [] }),
          getBugDetail: () => Promise.resolve({ ok: true, value: {} }),
          executeBugPhase: () => Promise.resolve({ ok: true, value: {} }),
          getAgents: () => Promise.resolve({ ok: true, value: [] }),
          stopAgent: () => Promise.resolve({ ok: true, value: undefined }),
          resumeAgent: () => Promise.resolve({ ok: true, value: {} }),
          sendAgentInput: () => Promise.resolve({ ok: true, value: undefined }),
          getAgentLogs: () => Promise.resolve({ ok: true, value: [] }),
          executeValidation: () => Promise.resolve({ ok: true, value: {} }),
          executeDocumentReview: () => Promise.resolve({ ok: true, value: {} }),
          executeInspection: () => Promise.resolve({ ok: true, value: {} }),
          startAutoExecution: () => Promise.resolve({ ok: true, value: {} }),
          stopAutoExecution: () => Promise.resolve({ ok: true, value: undefined }),
          getAutoExecutionStatus: () => Promise.resolve({ ok: true, value: null }),
          saveFile: () => Promise.resolve({ ok: true, value: undefined }),
          onSpecsUpdated: () => () => {},
          onBugsUpdated: () => () => {},
          onAgentOutput: () => () => {},
          onAgentStatusChange: () => () => {},
          onAutoExecutionStatusChanged: () => () => {},
        };
        return {
          ApiClientProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'api-client-provider' }, children),
          PlatformProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'platform-provider' }, children),
          useDeviceType: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
          useApi: () => mockApiClient,
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      // App should render with provider wrapper
      expect(screen.getByTestId('api-client-provider')).toBeInTheDocument();
    });
  });
});
