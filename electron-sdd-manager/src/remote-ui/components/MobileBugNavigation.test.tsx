/**
 * Mobile Bug Navigation Test
 *
 * Task 8.3: BugsタブでBugDetailPageへのプッシュ遷移を実装する
 * - BugListのアイテムタップ時にpushBugDetailを呼び出し
 * - BugDetailPageの表示
 * - 戻るボタンでpopPageを呼び出し
 *
 * Requirements: 2.2, 2.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import type {
  BugMetadataWithPath,
  BugDetail,
  ApiClient,
} from '@shared/api/types';

// =============================================================================
// Mock Data
// =============================================================================

const mockBug: BugMetadataWithPath = {
  name: 'test-bug',
  path: '/project/.kiro/bugs/test-bug',
  reportedAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  phase: 'reported',
};

const mockBugDetail: BugDetail = {
  metadata: {
    name: 'test-bug',
    path: '/project/.kiro/bugs/test-bug',
    reportedAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    phase: 'reported',
  },
  artifacts: {},
};

// =============================================================================
// Mocks
// =============================================================================

// Track which component is rendered
let renderedComponents: string[] = [];

// Mock BugDetailPage
vi.mock('./BugDetailPage', () => {
  return {
    BugDetailPage: ({ bug, bugDetail, onBack, testId }: {
      bug: BugMetadataWithPath;
      bugDetail: BugDetail;
      onBack: () => void;
      testId?: string;
    }) => {
      renderedComponents.push('BugDetailPage');
      return (
        <div data-testid={testId ?? 'bug-detail-page'}>
          <div data-testid="bug-detail-name">{bug.name}</div>
          <button
            data-testid="bug-detail-back-button"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      );
    },
    default: ({ bug, onBack }: { bug: BugMetadataWithPath; onBack: () => void }) => (
      <div data-testid="bug-detail-page">
        <div data-testid="bug-detail-name">{bug.name}</div>
        <button data-testid="bug-detail-back-button" onClick={onBack}>Back</button>
      </div>
    ),
  };
});

// Mock BugDetailView (legacy component - should NOT be used)
vi.mock('../views/BugDetailView', () => {
  return {
    BugDetailView: ({ bug }: { bug: BugMetadataWithPath }) => {
      renderedComponents.push('BugDetailView');
      return <div data-testid="bug-detail-view-legacy">{bug.name}</div>;
    },
    default: ({ bug }: { bug: BugMetadataWithPath }) => (
      <div data-testid="bug-detail-view-legacy">{bug.name}</div>
    ),
  };
});

// Mock other views
vi.mock('../views', () => {
  return {
    SpecsView: () => <div data-testid="specs-view">Specs View</div>,
    BugsView: ({ onSelectBug }: { onSelectBug?: (bug: BugMetadataWithPath) => void }) => (
      <div data-testid="bugs-view">
        <button
          data-testid="select-bug-button"
          onClick={() => onSelectBug?.(mockBug)}
        >
          Select Bug
        </button>
      </div>
    ),
    BugDetailView: ({ bug }: { bug: BugMetadataWithPath }) => {
      renderedComponents.push('BugDetailView');
      return <div data-testid="bug-detail-view-legacy">{bug.name}</div>;
    },
    ProjectAgentView: () => <div data-testid="project-agent-view">Project Agent View</div>,
    RemoteWorkflowView: () => <div data-testid="remote-workflow-view">Workflow View</div>,
  };
});

// Mock useNavigationStack hook
const mockPushBugDetail = vi.fn();
const mockPopPage = vi.fn();
let mockDetailContext: { type: 'bug'; bug: BugMetadataWithPath; bugDetail: BugDetail } | null = null;

vi.mock('../hooks/useNavigationStack', () => {
  return {
    useNavigationStack: () => ({
      state: {
        activeTab: 'bugs',
        detailContext: mockDetailContext,
        showTabBar: mockDetailContext === null,
      },
      setActiveTab: vi.fn(),
      pushSpecDetail: vi.fn(),
      pushBugDetail: mockPushBugDetail,
      popPage: mockPopPage,
      isDetailPage: mockDetailContext !== null,
    }),
  };
});

// Mock shared providers and hooks
vi.mock('../../shared', () => {
  const mockApiClient: Partial<ApiClient> = {
    getSpecs: () => Promise.resolve({ ok: true, value: [] } as const),
    getBugs: () => Promise.resolve({ ok: true, value: [] } as const),
    getBugDetail: () => Promise.resolve({ ok: true, value: mockBugDetail } as const),
    getAgents: () => Promise.resolve({ ok: true, value: [] } as const),
    stopAgent: () => Promise.resolve({ ok: true, value: undefined } as const),
    onAgentStatusChange: () => () => {},
    onSpecsUpdated: () => () => {},
    onBugsUpdated: () => () => {},
  };

  return {
    ApiClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PlatformProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useDeviceType: () => ({ isMobile: true, isTablet: false, isDesktop: false }),
    useApi: () => mockApiClient,
  };
});

// Mock layouts
vi.mock('../layouts', () => {
  return {
    MobileLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="mobile-layout">{children}</div>
    ),
    DesktopLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="desktop-layout">{children}</div>
    ),
  };
});

// Mock other components
vi.mock('./SpecDetailPage', () => ({
  SpecDetailPage: () => <div data-testid="spec-detail-page">Spec Detail</div>,
}));

vi.mock('./RemoteArtifactEditor', () => ({
  RemoteArtifactEditor: () => <div data-testid="remote-artifact-editor">Artifact Editor</div>,
}));

vi.mock('./CreateSpecDialogRemote', () => ({
  CreateSpecDialogRemote: () => null,
}));

vi.mock('./CreateBugDialogRemote', () => ({
  CreateBugDialogRemote: () => null,
}));

vi.mock('../../shared/components/workflow', () => ({
  SpecWorkflowFooter: () => <div>Workflow Footer</div>,
}));

vi.mock('../../shared/components/agent', () => ({
  AgentList: () => <div>Agent List</div>,
}));

vi.mock('../../shared/components/project', () => ({
  AskAgentDialog: () => null,
}));

vi.mock('../../shared/components/ui', () => ({
  ResizeHandle: () => null,
}));

vi.mock('../../shared/stores/bugAutoExecutionStore', () => ({
  initBugAutoExecutionWebSocketListeners: () => () => {},
}));

// =============================================================================
// Tests
// =============================================================================

describe('Task 8.3: BugsタブでBugDetailPageへのプッシュ遷移', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderedComponents = [];
    mockDetailContext = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Requirement 2.2: Bug tap pushes BugDetailPage', () => {
    it('should call pushBugDetail when a bug item is tapped', async () => {
      // Import App dynamically to apply mocks
      vi.resetModules();

      // Re-apply the mock with the function that will verify the call
      const { default: App } = await import('../App');
      render(<App />);

      // Find and click the bug select button
      const selectButton = screen.getByTestId('select-bug-button');
      fireEvent.click(selectButton);

      // Wait for async operation
      await waitFor(() => {
        expect(mockPushBugDetail).toHaveBeenCalled();
      });
    });

    it('should render BugDetailPage (not BugDetailView) when detailContext.type is bug', async () => {
      vi.resetModules();

      // Set detail context to simulate bug selection
      mockDetailContext = {
        type: 'bug',
        bug: mockBug,
        bugDetail: mockBugDetail,
      };

      const { default: App } = await import('../App');
      render(<App />);

      // Should render BugDetailPage
      expect(screen.getByTestId('bug-detail-page')).toBeInTheDocument();

      // Should NOT render the legacy BugDetailView
      expect(screen.queryByTestId('bug-detail-view-legacy')).not.toBeInTheDocument();
    });

    it('should display the correct bug name in BugDetailPage', async () => {
      vi.resetModules();

      mockDetailContext = {
        type: 'bug',
        bug: mockBug,
        bugDetail: mockBugDetail,
      };

      const { default: App } = await import('../App');
      render(<App />);

      expect(screen.getByTestId('bug-detail-name')).toHaveTextContent('test-bug');
    });
  });

  describe('Requirement 2.4: Back button pops page', () => {
    it('should call popPage when back button is clicked in BugDetailPage', async () => {
      vi.resetModules();

      mockDetailContext = {
        type: 'bug',
        bug: mockBug,
        bugDetail: mockBugDetail,
      };

      const { default: App } = await import('../App');
      render(<App />);

      // Click back button
      const backButton = screen.getByTestId('bug-detail-back-button');
      fireEvent.click(backButton);

      expect(mockPopPage).toHaveBeenCalled();
    });

    it('should return to bugs list view after popPage', async () => {
      vi.resetModules();

      // Start with detail view
      mockDetailContext = {
        type: 'bug',
        bug: mockBug,
        bugDetail: mockBugDetail,
      };

      const { default: App, rerender } = await import('../App').then(mod => ({
        default: mod.default,
        rerender: mod.default,
      }));

      const { rerender: doRerender } = render(<App />);

      // Verify we're in detail view
      expect(screen.getByTestId('bug-detail-page')).toBeInTheDocument();

      // Simulate popPage by clearing detailContext
      mockDetailContext = null;

      // Re-render to see the change
      doRerender(<App />);

      // Should show bugs list view
      expect(screen.getByTestId('bugs-view')).toBeInTheDocument();
    });
  });

  describe('BugDetailPage Props', () => {
    it('should pass bug and bugDetail props to BugDetailPage', async () => {
      vi.resetModules();

      mockDetailContext = {
        type: 'bug',
        bug: mockBug,
        bugDetail: mockBugDetail,
      };

      const { default: App } = await import('../App');
      render(<App />);

      // BugDetailPage should receive the correct props
      // We verify this by checking the rendered content
      expect(screen.getByTestId('bug-detail-name')).toHaveTextContent(mockBug.name);
    });

    it('should pass onBack callback connected to popPage', async () => {
      vi.resetModules();

      mockDetailContext = {
        type: 'bug',
        bug: mockBug,
        bugDetail: mockBugDetail,
      };

      const { default: App } = await import('../App');
      render(<App />);

      // The back button should trigger popPage
      const backButton = screen.getByTestId('bug-detail-back-button');
      fireEvent.click(backButton);

      expect(mockPopPage).toHaveBeenCalledTimes(1);
    });
  });
});
