/**
 * RemoteArtifactEditor Component Tests
 * TDD: Testing artifact existence filtering
 * Bug fix: Remote UIでまだ存在しないファイルがタブに表示される問題
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RemoteArtifactEditor } from './RemoteArtifactEditor';
import type { SpecMetadataWithPath, SpecDetail, ApiClient } from '@shared/api/types';

// Mock MDEditor to avoid complex editor initialization
vi.mock('@uiw/react-md-editor', () => ({
  default: ({ value }: { value: string }) => (
    <div data-testid="md-editor">{value}</div>
  ),
}));

// Mock inspection normalizer
vi.mock('@renderer/types/inspection', () => ({
  normalizeInspectionState: vi.fn(() => null),
}));

// Create mock API client
const createMockApiClient = (): ApiClient => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  onEvent: vi.fn(),
  offEvent: vi.fn(),
  listSpecs: vi.fn(),
  getSpecDetail: vi.fn(),
  listBugs: vi.fn(),
  getBugDetail: vi.fn(),
  saveFile: vi.fn().mockResolvedValue({ ok: true }),
  getArtifactContent: vi.fn().mockResolvedValue({ ok: true, value: '# Test Content' }),
  stopAgent: vi.fn(),
});

// Create mock spec metadata
const createMockSpec = (name: string): SpecMetadataWithPath => ({
  name,
  path: `/test/path/${name}`,
  phase: 'requirements',
});

// Create mock spec detail
const createMockSpecDetail = (artifacts: SpecDetail['artifacts']): SpecDetail => ({
  metadata: {
    name: 'test-spec',
    phase: 'requirements',
  },
  specJson: {},
  artifacts,
  taskProgress: null,
  parallelTaskInfo: null,
});

describe('RemoteArtifactEditor', () => {
  let mockApiClient: ApiClient;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    vi.clearAllMocks();
  });

  describe('Artifact existence filtering', () => {
    it('should only display tabs for artifacts that exist', () => {
      const spec = createMockSpec('test-feature');
      const specDetail = createMockSpecDetail({
        requirements: { exists: true, content: '', updatedAt: null },
        design: { exists: true, content: '', updatedAt: null },
        tasks: { exists: false, content: '', updatedAt: null },
        research: null,
        inspection: null,
      });

      render(
        <RemoteArtifactEditor
          spec={spec}
          specDetail={specDetail}
          apiClient={mockApiClient}
          testId="remote-artifact-editor"
        />
      );

      // requirements.md と design.md は存在するので表示される
      expect(screen.getByRole('tab', { name: 'requirements.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'design.md' })).toBeInTheDocument();

      // tasks.md は exists: false なので表示されない
      expect(screen.queryByRole('tab', { name: 'tasks.md' })).not.toBeInTheDocument();

      // research.md は null なので表示されない
      expect(screen.queryByRole('tab', { name: 'research.md' })).not.toBeInTheDocument();
    });

    it('should not display tabs when artifacts have exists: false', () => {
      const spec = createMockSpec('test-feature');
      const specDetail = createMockSpecDetail({
        requirements: { exists: true, content: '', updatedAt: null },
        design: { exists: false, content: '', updatedAt: null },
        tasks: { exists: false, content: '', updatedAt: null },
        research: { exists: false, content: '', updatedAt: null },
        inspection: null,
      });

      render(
        <RemoteArtifactEditor
          spec={spec}
          specDetail={specDetail}
          apiClient={mockApiClient}
          testId="remote-artifact-editor"
        />
      );

      // requirements.md のみ存在
      expect(screen.getByRole('tab', { name: 'requirements.md' })).toBeInTheDocument();

      // 他のタブは表示されない
      expect(screen.queryByRole('tab', { name: 'design.md' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'tasks.md' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: 'research.md' })).not.toBeInTheDocument();
    });

    it('should display no artifacts message when all artifacts are null or non-existent', () => {
      const spec = createMockSpec('test-feature');
      const specDetail = createMockSpecDetail({
        requirements: null,
        design: null,
        tasks: null,
        research: null,
        inspection: null,
      });

      render(
        <RemoteArtifactEditor
          spec={spec}
          specDetail={specDetail}
          apiClient={mockApiClient}
          testId="remote-artifact-editor"
        />
      );

      expect(screen.getByText('表示可能なアーティファクトがありません')).toBeInTheDocument();
    });

    it('should display all tabs when all artifacts exist', () => {
      const spec = createMockSpec('test-feature');
      const specDetail = createMockSpecDetail({
        requirements: { exists: true, content: '', updatedAt: null },
        design: { exists: true, content: '', updatedAt: null },
        tasks: { exists: true, content: '', updatedAt: null },
        research: { exists: true, content: '', updatedAt: null },
        inspection: null,
      });

      render(
        <RemoteArtifactEditor
          spec={spec}
          specDetail={specDetail}
          apiClient={mockApiClient}
          testId="remote-artifact-editor"
        />
      );

      expect(screen.getByRole('tab', { name: 'requirements.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'design.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'tasks.md' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'research.md' })).toBeInTheDocument();
    });
  });

  describe('Placeholder behavior', () => {
    it('should display placeholder when spec is null', () => {
      render(
        <RemoteArtifactEditor
          spec={null}
          specDetail={null}
          apiClient={mockApiClient}
          placeholder="Select a spec to view documents"
          testId="remote-artifact-editor"
        />
      );

      expect(screen.getByText('Select a spec to view documents')).toBeInTheDocument();
    });
  });
});
