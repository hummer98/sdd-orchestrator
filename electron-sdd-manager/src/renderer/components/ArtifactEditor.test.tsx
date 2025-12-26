/**
 * ArtifactEditor Component Tests
 * TDD: Testing inspection tab dynamic generation
 * Requirements: 12.1, 12.2, 12.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtifactEditor } from './ArtifactEditor';
import { useSpecStore } from '../stores/specStore';
import { useEditorStore } from '../stores/editorStore';
import type { SpecDetail, SpecMetadata, SpecJson } from '../types';

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

// Create base mock data
const createMockSpecMetadata = (overrides?: Partial<SpecMetadata>): SpecMetadata => ({
  name: 'test-feature',
  path: '/project/.kiro/specs/test-feature',
  phase: 'implementation-complete',
  updatedAt: '2024-01-15T10:00:00Z',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: true, approved: true },
  },
  ...overrides,
});

const createMockSpecJson = (overrides?: Partial<SpecJson>): SpecJson => ({
  feature_name: 'test-feature',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  language: 'ja',
  phase: 'implementation-complete',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: true, approved: true },
  },
  ...overrides,
});

const createMockSpecDetail = (overrides?: Partial<SpecDetail>): SpecDetail => ({
  metadata: createMockSpecMetadata(),
  specJson: createMockSpecJson(),
  artifacts: {
    requirements: { exists: true, updatedAt: null, content: '# Requirements' },
    design: { exists: true, updatedAt: null, content: '# Design' },
    tasks: { exists: true, updatedAt: null, content: '# Tasks' },
    research: null,
    inspection: null,
  },
  taskProgress: null,
  ...overrides,
});

describe('ArtifactEditor Inspection Tab', () => {
  beforeEach(() => {
    // Reset stores
    useSpecStore.setState({
      selectedSpec: null,
      specDetail: null,
    });
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

  describe('Inspection tab dynamic generation (REQ-12.1, REQ-12.2)', () => {
    it('should display Inspection-1 tab when spec.json has inspection field', () => {
      const specDetail = createMockSpecDetail({
        specJson: createMockSpecJson({
          inspection: {
            passed: true,
            inspected_at: '2024-01-15T12:00:00Z',
            report_file: 'inspection-1.md',
          },
        }),
        artifacts: {
          requirements: { exists: true, updatedAt: null, content: '# Requirements' },
          design: { exists: true, updatedAt: null, content: '# Design' },
          tasks: { exists: true, updatedAt: null, content: '# Tasks' },
          research: null,
          inspection: { exists: true, updatedAt: null, content: '# Inspection Report #1' },
        },
      });

      useSpecStore.setState({
        selectedSpec: createMockSpecMetadata(),
        specDetail,
      });

      render(<ArtifactEditor />);

      // Verify Inspection-1 tab is rendered
      expect(screen.getByRole('button', { name: 'Inspection-1' })).toBeInTheDocument();
    });

    it('should display Inspection-2 tab for inspection-2.md report', () => {
      const specDetail = createMockSpecDetail({
        specJson: createMockSpecJson({
          inspection: {
            passed: true,
            inspected_at: '2024-01-15T12:00:00Z',
            report_file: 'inspection-2.md',
          },
        }),
        artifacts: {
          requirements: { exists: true, updatedAt: null, content: '# Requirements' },
          design: { exists: true, updatedAt: null, content: '# Design' },
          tasks: { exists: true, updatedAt: null, content: '# Tasks' },
          research: null,
          inspection: { exists: true, updatedAt: null, content: '# Inspection Report #2' },
        },
      });

      useSpecStore.setState({
        selectedSpec: createMockSpecMetadata(),
        specDetail,
      });

      render(<ArtifactEditor />);

      // Verify Inspection-2 tab is rendered
      expect(screen.getByRole('button', { name: 'Inspection-2' })).toBeInTheDocument();
    });

    it('should not display inspection tab when spec.json has no inspection field', () => {
      const specDetail = createMockSpecDetail();
      // specDetail.specJson has no inspection field

      useSpecStore.setState({
        selectedSpec: createMockSpecMetadata(),
        specDetail,
      });

      render(<ArtifactEditor />);

      // Verify no Inspection tab is rendered
      const buttons = screen.getAllByRole('button');
      const inspectionTab = buttons.find(btn =>
        btn.textContent?.includes('Inspection')
      );
      expect(inspectionTab).toBeUndefined();
    });

    it('should not display inspection tab when report_file format is invalid', () => {
      const specDetail = createMockSpecDetail({
        specJson: createMockSpecJson({
          inspection: {
            passed: true,
            inspected_at: '2024-01-15T12:00:00Z',
            report_file: 'invalid-report.md', // Invalid format
          },
        }),
      });

      useSpecStore.setState({
        selectedSpec: createMockSpecMetadata(),
        specDetail,
      });

      render(<ArtifactEditor />);

      // Verify no Inspection tab is rendered for invalid format
      const buttons = screen.getAllByRole('button');
      const inspectionTab = buttons.find(btn =>
        btn.textContent?.includes('Inspection')
      );
      expect(inspectionTab).toBeUndefined();
    });
  });

  describe('Inspection tab placement (REQ-12.4)', () => {
    it('should place inspection tab after tasks tab', () => {
      const specDetail = createMockSpecDetail({
        specJson: createMockSpecJson({
          inspection: {
            passed: true,
            inspected_at: '2024-01-15T12:00:00Z',
            report_file: 'inspection-1.md',
          },
        }),
        artifacts: {
          requirements: { exists: true, updatedAt: null, content: '# Requirements' },
          design: { exists: true, updatedAt: null, content: '# Design' },
          tasks: { exists: true, updatedAt: null, content: '# Tasks' },
          research: null,
          inspection: { exists: true, updatedAt: null, content: '# Inspection' },
        },
      });

      useSpecStore.setState({
        selectedSpec: createMockSpecMetadata(),
        specDetail,
      });

      render(<ArtifactEditor />);

      // Get all tab buttons
      const buttons = screen.getAllByRole('button');
      const tabLabels = buttons
        .filter(btn => !btn.className.includes('rounded'))
        .map(btn => btn.textContent?.trim())
        .filter(Boolean);

      // Verify order: requirements, design, tasks, (document-review tabs if any), inspection
      const tasksIndex = tabLabels.indexOf('tasks.md');
      const inspectionIndex = tabLabels.findIndex(label => label?.includes('Inspection'));

      expect(tasksIndex).toBeGreaterThan(-1);
      expect(inspectionIndex).toBeGreaterThan(-1);
      expect(inspectionIndex).toBeGreaterThan(tasksIndex);
    });

    it('should place inspection tab after document review tabs when both exist', () => {
      const specDetail = createMockSpecDetail({
        specJson: createMockSpecJson({
          documentReview: {
            rounds: 1,
            roundDetails: [
              { roundNumber: 1, status: 'reply_complete' },
            ],
          },
          inspection: {
            passed: true,
            inspected_at: '2024-01-15T12:00:00Z',
            report_file: 'inspection-1.md',
          },
        }),
        artifacts: {
          requirements: { exists: true, updatedAt: null, content: '# Requirements' },
          design: { exists: true, updatedAt: null, content: '# Design' },
          tasks: { exists: true, updatedAt: null, content: '# Tasks' },
          research: null,
          inspection: { exists: true, updatedAt: null, content: '# Inspection' },
        },
      });

      useSpecStore.setState({
        selectedSpec: createMockSpecMetadata(),
        specDetail,
      });

      render(<ArtifactEditor />);

      // Get all tab buttons
      const buttons = screen.getAllByRole('button');
      const tabLabels = buttons
        .filter(btn => !btn.className.includes('rounded'))
        .map(btn => btn.textContent?.trim())
        .filter(Boolean);

      // Find positions
      const review1Index = tabLabels.findIndex(label => label?.includes('Review-1'));
      const reply1Index = tabLabels.findIndex(label => label?.includes('Reply-1'));
      const inspectionIndex = tabLabels.findIndex(label => label?.includes('Inspection'));

      // Document review tabs should exist and inspection should be after them
      expect(review1Index).toBeGreaterThan(-1);
      expect(reply1Index).toBeGreaterThan(-1);
      expect(inspectionIndex).toBeGreaterThan(reply1Index);
    });
  });

  describe('No spec selected state', () => {
    it('should display placeholder message when no spec is selected', () => {
      useSpecStore.setState({
        selectedSpec: null,
        specDetail: null,
      });

      render(<ArtifactEditor />);

      expect(screen.getByText('仕様を選択してエディターを開始')).toBeInTheDocument();
    });
  });
});
