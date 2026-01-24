/**
 * MobileAppContent Tests
 *
 * Task 8.1: MobileAppContentにuseNavigationStackを統合する
 *
 * Requirements:
 * - 1.2: Tab tap switches content
 * - 2.6: Navigation state managed via React state (useNavigationStack)
 *
 * Tests verify:
 * - useNavigationStack hook is used for state management
 * - activeTab state is managed by the hook
 * - detailContext state is managed by the hook
 * - showTabBar state is passed to MobileLayout
 * - Tab switch clears detailContext
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock useNavigationStack hook
const mockSetActiveTab = vi.fn();
const mockPushSpecDetail = vi.fn();
const mockPushBugDetail = vi.fn();
const mockPopPage = vi.fn();

let mockNavigationState = {
  activeTab: 'specs' as const,
  detailContext: null as null | { type: 'spec' | 'bug'; spec?: unknown; bug?: unknown },
  showTabBar: true,
};

let mockIsDetailPage = false;

vi.mock('./hooks/useNavigationStack', () => ({
  useNavigationStack: () => ({
    state: mockNavigationState,
    setActiveTab: mockSetActiveTab,
    pushSpecDetail: mockPushSpecDetail,
    pushBugDetail: mockPushBugDetail,
    popPage: mockPopPage,
    isDetailPage: mockIsDetailPage,
  }),
}));

// Mock shared module
const mockApiClient = {
  getSpecs: () => Promise.resolve({ ok: true, value: [] }),
  getSpecDetail: () => Promise.resolve({ ok: true, value: { metadata: {}, specJson: {} } }),
  getBugs: () => Promise.resolve({ ok: true, value: [] }),
  getBugDetail: () => Promise.resolve({ ok: true, value: { metadata: {}, bugJson: {} } }),
  getAgents: () => Promise.resolve({ ok: true, value: [] }),
  stopAgent: () => Promise.resolve({ ok: true, value: undefined }),
  onSpecsUpdated: () => () => {},
  onBugsUpdated: () => () => {},
  onAgentOutput: () => () => {},
  onAgentStatusChange: () => () => {},
  onAutoExecutionStatusChanged: () => () => {},
  startAutoExecution: () => Promise.resolve({ ok: true, value: {} }),
  stopAutoExecution: () => Promise.resolve({ ok: true, value: undefined }),
  executeAskProject: () => Promise.resolve({ ok: true, value: {} }),
  getProfile: () => Promise.resolve({ ok: true, value: { name: 'cc-sdd' } }),
};

vi.mock('../shared', async () => {
  const React = await import('react');
  return {
    ApiClientProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'api-client-provider' }, children),
    PlatformProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'platform-provider' }, children),
    useDeviceType: () => ({ isMobile: true, isTablet: false, isDesktop: false }),
    useApi: () => mockApiClient,
  };
});

// Track MobileLayout props
let capturedMobileLayoutProps: {
  activeTab?: string;
  showTabBar?: boolean;
  onTabChange?: (tab: string) => void;
} = {};

vi.mock('./layouts', async () => {
  const React = await import('react');
  return {
    MobileLayout: ({ children, activeTab, showTabBar, onTabChange }: {
      children: React.ReactNode;
      activeTab?: string;
      showTabBar?: boolean;
      onTabChange?: (tab: string) => void;
    }) => {
      // Capture props for assertions
      capturedMobileLayoutProps = { activeTab, showTabBar, onTabChange };
      return React.createElement('div', {
        'data-testid': 'mobile-layout',
        'data-active-tab': activeTab,
        'data-show-tab-bar': showTabBar?.toString(),
      }, [
        children,
        // Render tab buttons for testing tab change
        React.createElement('button', {
          key: 'specs-tab',
          'data-testid': 'tab-specs',
          onClick: () => onTabChange?.('specs'),
        }, 'Specs'),
        React.createElement('button', {
          key: 'bugs-tab',
          'data-testid': 'tab-bugs',
          onClick: () => onTabChange?.('bugs'),
        }, 'Bugs'),
        React.createElement('button', {
          key: 'agents-tab',
          'data-testid': 'tab-agents',
          onClick: () => onTabChange?.('agents'),
        }, 'Agents'),
      ]);
    },
    DesktopLayout: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'desktop-layout' }, children),
    MobileTab: {},
  };
});

// Mock views
vi.mock('./views', () => ({
  SpecsView: () => null,
  SpecDetailView: () => null,
  BugsView: () => null,
  BugDetailView: () => null,
  AgentView: () => null,
  ProjectAgentView: () => null,
  RemoteWorkflowView: () => null,
}));

// Mock bugAutoExecutionStore
vi.mock('../shared/stores/bugAutoExecutionStore', () => ({
  initBugAutoExecutionWebSocketListeners: () => () => {},
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('Task 8.1: MobileAppContent useNavigationStack Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMobileLayoutProps = {};

    // Reset mock state to default
    mockNavigationState = {
      activeTab: 'specs',
      detailContext: null,
      showTabBar: true,
    };
    mockIsDetailPage = false;
  });

  afterEach(() => {
    cleanup();
  });

  describe('useNavigationStack Hook Integration', () => {
    it('should use useNavigationStack hook for state management (Req 2.6)', async () => {
      // Import the App component which renders MobileAppContent for mobile
      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      // Verify MobileLayout receives state from useNavigationStack
      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Check that activeTab from hook is passed to MobileLayout
      expect(capturedMobileLayoutProps.activeTab).toBe('specs');
    });

    it('should pass showTabBar from navigation state to MobileLayout (Req 2.6)', async () => {
      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // showTabBar should be true initially (no detail page)
      expect(capturedMobileLayoutProps.showTabBar).toBe(true);
    });

    it('should pass showTabBar=false when on detail page', async () => {
      // Update mock state to simulate detail page
      // Task 8.2: detailContext must include specDetail for SpecDetailPage
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec', path: '.kiro/specs/test-spec' },
          specDetail: {
            metadata: { name: 'test-spec' },
            specJson: { feature_name: 'test-spec', phase: 'design-approved' },
            artifacts: {},
          },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // showTabBar should be false when showing detail page
      expect(capturedMobileLayoutProps.showTabBar).toBe(false);
    });
  });

  describe('Tab Change Handler (Req 1.2)', () => {
    it('should call setActiveTab from hook when tab changes', async () => {
      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Verify onTabChange callback is provided
      expect(capturedMobileLayoutProps.onTabChange).toBeDefined();

      // Simulate tab change
      const bugsTab = screen.getByTestId('tab-bugs');
      await userEvent.click(bugsTab);

      // Verify setActiveTab from useNavigationStack was called
      expect(mockSetActiveTab).toHaveBeenCalledWith('bugs');
    });

    it('should call setActiveTab when switching to agents tab', async () => {
      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      const agentsTab = screen.getByTestId('tab-agents');
      await userEvent.click(agentsTab);

      expect(mockSetActiveTab).toHaveBeenCalledWith('agents');
    });
  });

  describe('Detail Context Clear on Tab Switch (Req 2.6)', () => {
    it('should use setActiveTab which automatically clears detailContext', async () => {
      // Start with a spec detail being shown
      // Task 8.2: detailContext must include specDetail for SpecDetailPage
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec', path: '.kiro/specs/test-spec' },
          specDetail: {
            metadata: { name: 'test-spec' },
            specJson: { feature_name: 'test-spec', phase: 'design-approved' },
            artifacts: {},
          },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Switch to bugs tab
      const bugsTab = screen.getByTestId('tab-bugs');
      await userEvent.click(bugsTab);

      // setActiveTab from useNavigationStack handles clearing detailContext
      // The hook's setActiveTab implementation clears detailContext automatically
      expect(mockSetActiveTab).toHaveBeenCalledWith('bugs');
    });
  });

  describe('activeTab State from Hook', () => {
    it('should display correct activeTab from hook state', async () => {
      // Set bugs as active tab
      mockNavigationState = {
        activeTab: 'bugs',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      expect(capturedMobileLayoutProps.activeTab).toBe('bugs');
    });

    it('should display agents tab when set in hook state', async () => {
      mockNavigationState = {
        activeTab: 'agents',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      expect(capturedMobileLayoutProps.activeTab).toBe('agents');
    });
  });

  describe('detailContext State from Hook', () => {
    it('should render list view when detailContext is null', async () => {
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: null,
        showTabBar: true,
      };
      mockIsDetailPage = false;

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Tab bar should be visible (list view)
      expect(capturedMobileLayoutProps.showTabBar).toBe(true);
    });

    it('should render detail view when detailContext is set', async () => {
      // Task 8.2: detailContext must include specDetail for SpecDetailPage
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec', path: '/test/path' },
          specDetail: {
            metadata: { name: 'test-spec' },
            specJson: { feature_name: 'test-spec', phase: 'design-approved' },
            artifacts: {},
          },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();
      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Tab bar should be hidden (detail view)
      expect(capturedMobileLayoutProps.showTabBar).toBe(false);
    });
  });
});

// =============================================================================
// Task 8.2: SpecsタブでSpecDetailPageへのプッシュ遷移を実装する
// Requirements: 2.1 (Spec tap pushes SpecDetailPage), 2.4 (Back button pops page)
// =============================================================================

describe('Task 8.2: Specs Tab SpecDetailPage Push Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMobileLayoutProps = {};

    // Reset mock state to default
    mockNavigationState = {
      activeTab: 'specs',
      detailContext: null,
      showTabBar: true,
    };
    mockIsDetailPage = false;
  });

  afterEach(() => {
    cleanup();
  });

  describe('SpecList item tap triggers pushSpecDetail (Req 2.1)', () => {
    it('should call pushSpecDetail when spec item is tapped in SpecsView', async () => {
      vi.resetModules();

      // Mock SpecsView to capture onSelectSpec callback
      let capturedOnSelectSpec: ((spec: unknown) => void) | undefined;
      vi.doMock('./views', () => ({
        SpecsView: ({ onSelectSpec }: { onSelectSpec?: (spec: unknown) => void }) => {
          capturedOnSelectSpec = onSelectSpec;
          const React = require('react');
          return React.createElement('div', {
            'data-testid': 'specs-view',
            onClick: () => onSelectSpec?.({
              name: 'test-spec',
              path: '.kiro/specs/test-spec',
              phase: 'design-approved',
              updatedAt: '2024-01-01T00:00:00Z',
            }),
          }, 'Mock SpecsView');
        },
        SpecDetailView: () => null,
        BugsView: () => null,
        BugDetailView: () => null,
        AgentView: () => null,
        ProjectAgentView: () => null,
        RemoteWorkflowView: () => null,
      }));

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Simulate spec selection by clicking the mocked SpecsView
      const specsView = screen.getByTestId('specs-view');
      await userEvent.click(specsView);

      // Verify pushSpecDetail was called
      await waitFor(() => {
        expect(mockPushSpecDetail).toHaveBeenCalled();
      });
    });

    it('should fetch spec detail before calling pushSpecDetail', async () => {
      vi.resetModules();

      const mockGetSpecDetail = vi.fn().mockResolvedValue({
        ok: true,
        value: {
          metadata: { name: 'test-spec', path: '.kiro/specs/test-spec' },
          specJson: { feature_name: 'test-spec', phase: 'design-approved' },
        },
      });

      // Update mock API client
      vi.doMock('../shared', async () => {
        const React = await import('react');
        return {
          ApiClientProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'api-client-provider' }, children),
          PlatformProvider: ({ children }: { children: React.ReactNode }) =>
            React.createElement('div', { 'data-testid': 'platform-provider' }, children),
          useDeviceType: () => ({ isMobile: true, isTablet: false, isDesktop: false }),
          useApi: () => ({
            ...mockApiClient,
            getSpecDetail: mockGetSpecDetail,
          }),
        };
      });

      vi.doMock('./views', () => {
        const React = require('react');
        return {
          SpecsView: ({ onSelectSpec }: { onSelectSpec?: (spec: unknown) => void }) => {
            return React.createElement('div', {
              'data-testid': 'specs-view',
              onClick: () => onSelectSpec?.({
                name: 'test-spec',
                path: '.kiro/specs/test-spec',
              }),
            }, 'Mock SpecsView');
          },
          SpecDetailView: () => null,
          BugsView: () => null,
          BugDetailView: () => null,
          AgentView: () => null,
          ProjectAgentView: () => null,
          RemoteWorkflowView: () => null,
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('specs-view')).toBeInTheDocument();
      });

      // Click to select spec
      const specsView = screen.getByTestId('specs-view');
      await userEvent.click(specsView);

      // Verify getSpecDetail was called with spec name
      await waitFor(() => {
        expect(mockGetSpecDetail).toHaveBeenCalledWith('test-spec');
      });
    });
  });

  describe('SpecDetailPage display (Req 2.1)', () => {
    it('should render SpecDetailPage when detailContext is spec type', async () => {
      // Set detailContext to show spec detail
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec', path: '.kiro/specs/test-spec' },
          specDetail: {
            metadata: { name: 'test-spec' },
            specJson: { feature_name: 'test-spec', phase: 'design-approved' },
          },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();

      // Mock SpecDetailPage to verify it gets rendered
      vi.doMock('./components/SpecDetailPage', () => {
        const React = require('react');
        return {
          SpecDetailPage: ({ spec, onBack }: { spec: unknown; onBack: () => void }) => {
            return React.createElement('div', {
              'data-testid': 'spec-detail-page',
              'data-spec-name': (spec as { name: string }).name,
            }, [
              React.createElement('button', {
                key: 'back',
                'data-testid': 'spec-detail-back-button',
                onClick: onBack,
              }, 'Back'),
            ]);
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-page')).toBeInTheDocument();
      });
    });

    it('should pass spec and specDetail to SpecDetailPage', async () => {
      const mockSpec = { name: 'feature-xyz', path: '.kiro/specs/feature-xyz' };
      const mockSpecDetail = {
        metadata: { name: 'feature-xyz' },
        specJson: { feature_name: 'feature-xyz', phase: 'tasks-generated' },
      };

      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: mockSpec,
          specDetail: mockSpecDetail,
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();

      let receivedProps: { spec?: unknown; specDetail?: unknown } = {};
      vi.doMock('./components/SpecDetailPage', () => {
        const React = require('react');
        return {
          SpecDetailPage: (props: { spec: unknown; specDetail: unknown; onBack: () => void }) => {
            receivedProps = { spec: props.spec, specDetail: props.specDetail };
            return React.createElement('div', { 'data-testid': 'spec-detail-page' }, 'SpecDetailPage');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-page')).toBeInTheDocument();
      });

      expect(receivedProps.spec).toEqual(mockSpec);
      expect(receivedProps.specDetail).toEqual(mockSpecDetail);
    });
  });

  describe('Back button calls popPage (Req 2.4)', () => {
    it('should call popPage when back button is clicked in SpecDetailPage', async () => {
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec', path: '.kiro/specs/test-spec' },
          specDetail: {
            metadata: { name: 'test-spec' },
            specJson: { feature_name: 'test-spec' },
          },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();

      // Mock SpecDetailPage with back button
      vi.doMock('./components/SpecDetailPage', () => {
        const React = require('react');
        return {
          SpecDetailPage: ({ onBack }: { onBack: () => void }) => {
            return React.createElement('div', { 'data-testid': 'spec-detail-page' }, [
              React.createElement('button', {
                key: 'back',
                'data-testid': 'spec-detail-back-button',
                onClick: onBack,
              }, 'Back'),
            ]);
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-page')).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByTestId('spec-detail-back-button');
      await userEvent.click(backButton);

      // Verify popPage was called
      expect(mockPopPage).toHaveBeenCalledTimes(1);
    });

    it('should pass popPage as onBack prop to SpecDetailPage', async () => {
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec' },
          specDetail: { metadata: {}, specJson: {} },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();

      let capturedOnBack: (() => void) | undefined;
      vi.doMock('./components/SpecDetailPage', () => {
        const React = require('react');
        return {
          SpecDetailPage: ({ onBack }: { onBack: () => void }) => {
            capturedOnBack = onBack;
            return React.createElement('div', { 'data-testid': 'spec-detail-page' }, 'SpecDetailPage');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('spec-detail-page')).toBeInTheDocument();
      });

      // Verify onBack callback is provided
      expect(capturedOnBack).toBeDefined();

      // Calling onBack should trigger popPage
      act(() => {
        capturedOnBack?.();
      });

      expect(mockPopPage).toHaveBeenCalled();
    });
  });

  describe('Navigation state consistency', () => {
    it('should hide tab bar when showing SpecDetailPage', async () => {
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec' },
          specDetail: { metadata: {}, specJson: {} },
        },
        showTabBar: false, // Tab bar hidden on detail page
      };
      mockIsDetailPage = true;

      vi.resetModules();

      vi.doMock('./components/SpecDetailPage', () => {
        const React = require('react');
        return {
          SpecDetailPage: () => React.createElement('div', { 'data-testid': 'spec-detail-page' }),
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Verify showTabBar is false when on detail page
      expect(capturedMobileLayoutProps.showTabBar).toBe(false);
    });

    it('should maintain specs as activeTab when viewing SpecDetailPage', async () => {
      mockNavigationState = {
        activeTab: 'specs', // Should remain specs
        detailContext: {
          type: 'spec',
          spec: { name: 'test-spec' },
          specDetail: { metadata: {}, specJson: {} },
        },
        showTabBar: false,
      };
      mockIsDetailPage = true;

      vi.resetModules();

      vi.doMock('./components/SpecDetailPage', () => {
        const React = require('react');
        return {
          SpecDetailPage: () => React.createElement('div', { 'data-testid': 'spec-detail-page' }),
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // activeTab should still be 'specs' even on detail page
      expect(capturedMobileLayoutProps.activeTab).toBe('specs');
    });
  });
});

// =============================================================================
// Task 8.4: AgentsタブをMobileAppContentに統合する
// Requirements: 1.2 (Tab tap switches content)
// =============================================================================

describe('Task 8.4: Agents Tab Integration with AgentsTabView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMobileLayoutProps = {};

    // Reset mock state to default
    mockNavigationState = {
      activeTab: 'specs',
      detailContext: null,
      showTabBar: true,
    };
    mockIsDetailPage = false;
  });

  afterEach(() => {
    cleanup();
  });

  describe('AgentsTabView display when agents tab is active (Req 1.2)', () => {
    it('should render AgentsTabView when activeTab is agents', async () => {
      // Set activeTab to agents
      mockNavigationState = {
        activeTab: 'agents',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();

      // Mock AgentsTabView to verify it gets rendered
      vi.doMock('./components/AgentsTabView', () => {
        const React = require('react');
        return {
          AgentsTabView: ({ apiClient, testId }: { apiClient: unknown; testId?: string }) => {
            return React.createElement('div', {
              'data-testid': testId || 'agents-tab-view',
            }, 'AgentsTabView Mock');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('agents-tab-view')).toBeInTheDocument();
      });
    });

    it('should pass apiClient to AgentsTabView', async () => {
      mockNavigationState = {
        activeTab: 'agents',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();

      let receivedApiClient: unknown;
      vi.doMock('./components/AgentsTabView', () => {
        const React = require('react');
        return {
          AgentsTabView: ({ apiClient }: { apiClient: unknown }) => {
            receivedApiClient = apiClient;
            return React.createElement('div', { 'data-testid': 'agents-tab-view' }, 'AgentsTabView');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('agents-tab-view')).toBeInTheDocument();
      });

      // Verify apiClient was passed
      expect(receivedApiClient).toBeDefined();
      expect(typeof receivedApiClient).toBe('object');
    });

    it('should not render AgentsTabView when activeTab is specs', async () => {
      mockNavigationState = {
        activeTab: 'specs',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();

      vi.doMock('./components/AgentsTabView', () => {
        const React = require('react');
        return {
          AgentsTabView: () => {
            return React.createElement('div', { 'data-testid': 'agents-tab-view' }, 'AgentsTabView');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // AgentsTabView should not be rendered when on specs tab
      expect(screen.queryByTestId('agents-tab-view')).not.toBeInTheDocument();
    });

    it('should not render AgentsTabView when activeTab is bugs', async () => {
      mockNavigationState = {
        activeTab: 'bugs',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();

      vi.doMock('./components/AgentsTabView', () => {
        const React = require('react');
        return {
          AgentsTabView: () => {
            return React.createElement('div', { 'data-testid': 'agents-tab-view' }, 'AgentsTabView');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // AgentsTabView should not be rendered when on bugs tab
      expect(screen.queryByTestId('agents-tab-view')).not.toBeInTheDocument();
    });
  });

  describe('Tab switch to agents tab (Req 1.2)', () => {
    it('should switch to AgentsTabView when agents tab is tapped', async () => {
      vi.resetModules();

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Click agents tab
      const agentsTab = screen.getByTestId('tab-agents');
      await userEvent.click(agentsTab);

      // Verify setActiveTab was called with 'agents'
      expect(mockSetActiveTab).toHaveBeenCalledWith('agents');
    });
  });

  describe('Agents tab shows bottom tab bar', () => {
    it('should show tab bar when on agents tab (no detail page)', async () => {
      mockNavigationState = {
        activeTab: 'agents',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();

      vi.doMock('./components/AgentsTabView', () => {
        const React = require('react');
        return {
          AgentsTabView: () => {
            return React.createElement('div', { 'data-testid': 'agents-tab-view' }, 'AgentsTabView');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // Tab bar should be visible on agents tab (list view)
      expect(capturedMobileLayoutProps.showTabBar).toBe(true);
    });

    it('should maintain agents as activeTab when AgentsTabView is displayed', async () => {
      mockNavigationState = {
        activeTab: 'agents',
        detailContext: null,
        showTabBar: true,
      };

      vi.resetModules();

      vi.doMock('./components/AgentsTabView', () => {
        const React = require('react');
        return {
          AgentsTabView: () => {
            return React.createElement('div', { 'data-testid': 'agents-tab-view' }, 'AgentsTabView');
          },
        };
      });

      const { default: App } = await import('./App');
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
      });

      // activeTab should be 'agents'
      expect(capturedMobileLayoutProps.activeTab).toBe('agents');
    });
  });
});
