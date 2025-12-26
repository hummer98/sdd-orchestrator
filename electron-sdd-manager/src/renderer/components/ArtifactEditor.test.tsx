/**
 * ArtifactEditor Component Tests
 * TDD: Testing inspection tab dynamic generation
 * Requirements: 12.1, 12.2, 12.3
 * Bug fix: bugs-tab-spec-editing-feature (shared ArtifactEditor)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtifactEditor } from './ArtifactEditor';
import { useEditorStore } from '../stores/editorStore';
import type { TabInfo, ArtifactInfo } from './ArtifactEditor';
import type { ArtifactType } from '../stores/editorStore';

// Mock MDEditor to avoid complex editor initialization
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="md-editor">{value}</div>
  ),
}));

// Mock window.electronAPI
const mockElectronAPI = {
  readArtifact: vi.fn().mockResolvedValue('# Test Content'),
  writeFile: vi.fn().mockResolvedValue(undefined),
};

// @ts-expect-error - Mock window.electronAPI
window.electronAPI = mockElectronAPI;

/** Spec artifact tabs */
const SPEC_TABS: TabInfo[] = [
  { key: 'requirements', label: 'requirements.md' },
  { key: 'design', label: 'design.md' },
  { key: 'tasks', label: 'tasks.md' },
  { key: 'research', label: 'research.md' },
];

/** Bug artifact tabs */
const BUG_TABS: TabInfo[] = [
  { key: 'report', label: 'report.md' },
  { key: 'analysis', label: 'analysis.md' },
  { key: 'fix', label: 'fix.md' },
  { key: 'verification', label: 'verification.md' },
];

describe('ArtifactEditor', () => {
  beforeEach(() => {
    useEditorStore.setState({
      activeTab: 'requirements',
      content: '',
      originalContent: '',
      isDirty: false,
      isSaving: false,
      mode: 'edit',
      currentPath: null,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('Shared component behavior', () => {
    it('should display placeholder when basePath is null', () => {
      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath={null}
          placeholder="仕様を選択してエディターを開始"
        />
      );

      expect(screen.getByText('仕様を選択してエディターを開始')).toBeInTheDocument();
    });

    it('should display bug placeholder when basePath is null', () => {
      render(
        <ArtifactEditor
          tabs={BUG_TABS}
          basePath={null}
          placeholder="バグを選択してエディターを開始"
        />
      );

      expect(screen.getByText('バグを選択してエディターを開始')).toBeInTheDocument();
    });

    it('should render spec tabs when artifacts exist', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
        research: null,
      };

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
        />
      );

      expect(screen.getByRole('tab', { name: 'requirements.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'design.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'tasks.md' })).toBeInTheDocument();
    });

    it('should render bug tabs when artifacts exist', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        report: { exists: true },
        analysis: { exists: true },
        fix: null,
        verification: null,
      };

      render(
        <ArtifactEditor
          tabs={BUG_TABS}
          basePath="/project/.kiro/bugs/test-bug"
          placeholder="バグを選択してエディターを開始"
          artifacts={artifacts}
          testId="bug-artifact-editor"
        />
      );

      expect(screen.getByRole('tab', { name: 'report.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'analysis.md' })).toBeInTheDocument();
    });
  });

  describe('Inspection tab dynamic generation (REQ-12.1, REQ-12.2)', () => {
    it('should display Inspection-1 tab when dynamicTabs include it', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
        research: null,
      };

      const dynamicTabs: TabInfo[] = [
        { key: 'inspection-1' as ArtifactType, label: 'Inspection-1' },
      ];

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
          dynamicTabs={dynamicTabs}
        />
      );

      expect(screen.getByRole('tab', { name: 'Inspection-1' })).toBeInTheDocument();
    });

    it('should display Inspection-2 tab for inspection-2.md report', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
        research: null,
      };

      const dynamicTabs: TabInfo[] = [
        { key: 'inspection-2' as ArtifactType, label: 'Inspection-2' },
      ];

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
          dynamicTabs={dynamicTabs}
        />
      );

      expect(screen.getByRole('tab', { name: 'Inspection-2' })).toBeInTheDocument();
    });

    it('should not display inspection tab when dynamicTabs is empty', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
        research: null,
      };

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
          dynamicTabs={[]}
        />
      );

      const tabs = screen.getAllByRole('tab');
      const inspectionTab = tabs.find(tab =>
        tab.textContent?.includes('Inspection')
      );
      expect(inspectionTab).toBeUndefined();
    });
  });

  describe('Inspection tab placement (REQ-12.4)', () => {
    it('should place inspection tab after tasks tab', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
        research: null,
      };

      const dynamicTabs: TabInfo[] = [
        { key: 'inspection-1' as ArtifactType, label: 'Inspection-1' },
      ];

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
          dynamicTabs={dynamicTabs}
        />
      );

      const tabs = screen.getAllByRole('tab');
      const tabLabels = tabs.map(tab => tab.textContent?.trim());

      const tasksIndex = tabLabels.indexOf('tasks.md');
      const inspectionIndex = tabLabels.findIndex(label => label?.includes('Inspection'));

      expect(tasksIndex).toBeGreaterThan(-1);
      expect(inspectionIndex).toBeGreaterThan(-1);
      expect(inspectionIndex).toBeGreaterThan(tasksIndex);
    });

    it('should place inspection tab after document review tabs when both exist', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: { exists: true },
        design: { exists: true },
        tasks: { exists: true },
        research: null,
      };

      const dynamicTabs: TabInfo[] = [
        { key: 'document-review-1' as ArtifactType, label: 'Review-1' },
        { key: 'document-review-1-reply' as ArtifactType, label: 'Reply-1' },
        { key: 'inspection-1' as ArtifactType, label: 'Inspection-1' },
      ];

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
          dynamicTabs={dynamicTabs}
        />
      );

      const tabs = screen.getAllByRole('tab');
      const tabLabels = tabs.map(tab => tab.textContent?.trim());

      const review1Index = tabLabels.findIndex(label => label?.includes('Review-1'));
      const reply1Index = tabLabels.findIndex(label => label?.includes('Reply-1'));
      const inspectionIndex = tabLabels.findIndex(label => label?.includes('Inspection'));

      expect(review1Index).toBeGreaterThan(-1);
      expect(reply1Index).toBeGreaterThan(-1);
      expect(inspectionIndex).toBeGreaterThan(reply1Index);
    });
  });

  describe('No artifacts available', () => {
    it('should display no artifacts message when all artifacts are null', () => {
      const artifacts: Record<string, ArtifactInfo | null> = {
        requirements: null,
        design: null,
        tasks: null,
        research: null,
      };

      render(
        <ArtifactEditor
          tabs={SPEC_TABS}
          basePath="/project/.kiro/specs/test-feature"
          placeholder="仕様を選択してエディターを開始"
          artifacts={artifacts}
        />
      );

      expect(screen.getByText('表示可能なアーティファクトがありません')).toBeInTheDocument();
    });
  });
});
