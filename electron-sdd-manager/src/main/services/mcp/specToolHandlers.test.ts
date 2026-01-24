/**
 * SpecToolHandlers Unit Tests
 * TDD: Testing spec_* scope MCP tools
 * Requirements: 3.1, 3.2 - spec_get
 * Requirements: 3.3, 3.4, 3.5 - spec_get_artifact
 *
 * @file specToolHandlers.test.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { FileService } from '../fileService';
import type { SpecManagerService } from '../specManagerService';
import type { AutoExecutionCoordinator } from '../autoExecutionCoordinator';
import type { SpecJson, SpecPhase, ArtifactInfo } from '../../../renderer/types';

// Create hoisted mocks before imports
const { mockFs } = vi.hoisted(() => {
  return {
    mockFs: {
      access: vi.fn(),
      readdir: vi.fn(),
    },
  };
});

// Apply mocks
vi.mock('fs/promises', () => ({
  ...mockFs,
  default: mockFs,
}));

// Import after mocks
import { SpecToolHandlers, SPEC_ARTIFACT_TYPES } from './specToolHandlers';

describe('SpecToolHandlers', () => {
  let handlers: SpecToolHandlers;
  let mockFileService: {
    resolveSpecPath: Mock;
    readSpecJson: Mock;
    readArtifact: Mock;
    getArtifactInfo: Mock;
  };

  beforeEach(() => {
    handlers = new SpecToolHandlers();
    mockFileService = {
      resolveSpecPath: vi.fn(),
      readSpecJson: vi.fn(),
      readArtifact: vi.fn(),
      getArtifactInfo: vi.fn(),
    };
    handlers.setFileService(mockFileService as unknown as FileService);
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 4.1: ARTIFACT_TYPES constant
  // Requirements: 3.4 - artifact types support
  // ============================================================

  describe('SPEC_ARTIFACT_TYPES', () => {
    it('should define all required artifact types', () => {
      expect(SPEC_ARTIFACT_TYPES).toContain('requirements');
      expect(SPEC_ARTIFACT_TYPES).toContain('design');
      expect(SPEC_ARTIFACT_TYPES).toContain('tasks');
      expect(SPEC_ARTIFACT_TYPES).toContain('inspection');
      expect(SPEC_ARTIFACT_TYPES).toContain('document-review');
      expect(SPEC_ARTIFACT_TYPES).toContain('reply');
    });

    it('should be a readonly array', () => {
      // Verify it's properly typed as const
      expect(Array.isArray(SPEC_ARTIFACT_TYPES)).toBe(true);
      expect(SPEC_ARTIFACT_TYPES.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Task 4.1: spec_get Tests
  // Requirements: 3.1 - spec_get
  // Requirements: 3.2 - error on not found
  // ============================================================

  describe('get', () => {
    const mockSpecJson: SpecJson = {
      feature_name: 'test-feature',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      language: 'ja',
      phase: 'tasks-generated' as SpecPhase,
      approvals: {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: false },
      },
    };

    it('should return spec detail with spec.json content', async () => {
      // Setup: spec exists
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: mockSpecJson,
      });
      mockFileService.getArtifactInfo
        .mockResolvedValueOnce({ exists: true, updatedAt: '2024-01-02T00:00:00Z' }) // requirements
        .mockResolvedValueOnce({ exists: true, updatedAt: '2024-01-02T00:00:00Z' }) // design
        .mockResolvedValueOnce({ exists: true, updatedAt: '2024-01-02T00:00:00Z' }) // tasks
        .mockResolvedValueOnce(null); // research

      const result = await handlers.get('/path/to/project', 'test-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.specJson).toEqual(mockSpecJson);
        expect(result.value.name).toBe('test-feature');
        expect(result.value.artifacts).toBeDefined();
      }
    });

    it('should include artifact existence info', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: mockSpecJson,
      });
      mockFileService.getArtifactInfo
        .mockResolvedValueOnce({ exists: true, updatedAt: '2024-01-02T00:00:00Z' }) // requirements
        .mockResolvedValueOnce({ exists: true, updatedAt: '2024-01-02T00:00:00Z' }) // design
        .mockResolvedValueOnce(null) // tasks - doesn't exist
        .mockResolvedValueOnce(null); // research

      const result = await handlers.get('/path/to/project', 'test-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.artifacts.requirements).not.toBeNull();
        expect(result.value.artifacts.design).not.toBeNull();
        expect(result.value.artifacts.tasks).toBeNull();
        expect(result.value.artifacts.research).toBeNull();
      }
    });

    it('should return NOT_FOUND error when spec does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.get('/path/to/project', 'non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return NOT_FOUND error when spec.json cannot be read', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/broken-spec',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/specs/broken-spec' },
      });

      const result = await handlers.get('/path/to/project', 'broken-spec');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // ============================================================
  // Task 4.1: getToolHandler Tests
  // Tests the MCP tool handler wrapper for spec_get
  // ============================================================

  describe('getToolHandler', () => {
    const mockSpecJson: SpecJson = {
      feature_name: 'test-feature',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      language: 'ja',
      phase: 'tasks-generated' as SpecPhase,
      approvals: {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: false },
      },
    };

    it('should return success result with spec detail', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: mockSpecJson,
      });
      mockFileService.getArtifactInfo.mockResolvedValue(null);

      const result = await handlers.getToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        // Parse the JSON response
        const data = JSON.parse(result.content[0].text);
        expect(data.name).toBe('test-feature');
        expect(data.specJson).toBeDefined();
      }
    });

    it('should return error result when spec not found', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.getToolHandler(
        { name: 'non-existent' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toContain('non-existent');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.getToolHandler({ name: 'test-feature' }, undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  // ============================================================
  // Task 4.1: spec_get_artifact Tests
  // Requirements: 3.3 - spec_get_artifact
  // Requirements: 3.4 - artifact type support
  // Requirements: 3.5 - error on artifact not found
  // ============================================================

  describe('getArtifact', () => {
    it('should return artifact content for requirements', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Requirements\n\nThis is the requirements content.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'requirements'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('# Requirements\n\nThis is the requirements content.');
      }
    });

    it('should return artifact content for design', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Design\n\nThis is the design content.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'design'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('# Design\n\nThis is the design content.');
      }
    });

    it('should return artifact content for tasks', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Tasks\n\n- [ ] Task 1\n- [x] Task 2',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'tasks'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Task 1');
      }
    });

    it('should return artifact content for inspection (latest)', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });

      // Mock readdir to return inspection files
      mockFs.readdir.mockResolvedValue([
        { name: 'inspection-1.md', isFile: () => true },
        { name: 'inspection-2.md', isFile: () => true },
        { name: 'spec.json', isFile: () => true },
      ]);

      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Inspection Report 2\n\nLatest inspection.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'inspection'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Inspection Report 2');
      }
    });

    it('should return artifact content for document-review (latest)', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });

      // Mock readdir to return document-review files
      mockFs.readdir.mockResolvedValue([
        { name: 'document-review-1.md', isFile: () => true },
        { name: 'document-review-2.md', isFile: () => true },
        { name: 'spec.json', isFile: () => true },
      ]);

      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Document Review 2\n\nLatest review.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'document-review'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Document Review 2');
      }
    });

    it('should return artifact content for reply (latest)', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });

      // Mock readdir to return reply files
      mockFs.readdir.mockResolvedValue([
        { name: 'document-review-1-reply.md', isFile: () => true },
        { name: 'document-review-2-reply.md', isFile: () => true },
        { name: 'spec.json', isFile: () => true },
      ]);

      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Reply 2\n\nLatest reply.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'reply'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toContain('Reply 2');
      }
    });

    it('should return NOT_FOUND when spec does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'non-existent',
        'requirements'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should return ARTIFACT_NOT_FOUND when artifact does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readArtifact.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/specs/test-feature/requirements.md' },
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'requirements'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ARTIFACT_NOT_FOUND');
        expect(result.error.name).toBe('test-feature');
        expect(result.error.artifact).toBe('requirements');
      }
    });

    it('should return ARTIFACT_NOT_FOUND when no inspection files exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });

      // Mock readdir to return no inspection files
      mockFs.readdir.mockResolvedValue([
        { name: 'spec.json', isFile: () => true },
        { name: 'requirements.md', isFile: () => true },
      ]);

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-feature',
        'inspection'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ARTIFACT_NOT_FOUND');
        expect(result.error.artifact).toBe('inspection');
      }
    });
  });

  // ============================================================
  // Task 4.1: getArtifactToolHandler Tests
  // Tests the MCP tool handler wrapper for spec_get_artifact
  // ============================================================

  describe('getArtifactToolHandler', () => {
    it('should return success result with artifact content', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Requirements\n\nContent here.',
      });

      const result = await handlers.getArtifactToolHandler(
        { name: 'test-feature', artifact: 'requirements' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Requirements');
      }
    });

    it('should return error when artifact not found', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readArtifact.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/requirements.md' },
      });

      const result = await handlers.getArtifactToolHandler(
        { name: 'test-feature', artifact: 'requirements' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ARTIFACT_NOT_FOUND');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.getArtifactToolHandler(
        { name: 'test-feature', artifact: 'requirements' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  // ============================================================
  // Task 4.1: Tool Registration Tests
  // ============================================================

  describe('getToolRegistration', () => {
    it('should return valid tool registration for spec_get', () => {
      const registration = handlers.getToolRegistration();

      expect(registration.name).toBe('spec_get');
      expect(registration.description).toContain('spec');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  describe('getArtifactToolRegistration', () => {
    it('should return valid tool registration for spec_get_artifact', () => {
      const registration = handlers.getArtifactToolRegistration();

      expect(registration.name).toBe('spec_get_artifact');
      expect(registration.description).toContain('artifact');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getArtifactToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  describe('getAllToolRegistrations', () => {
    it('should include both spec_get and spec_get_artifact', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'spec_get')).toBe(true);
      expect(registrations.some((r) => r.name === 'spec_get_artifact')).toBe(true);
    });
  });

  // ============================================================
  // Task 4.2: spec_create Tests
  // Requirements: 3.6 - spec_create
  // Requirements: 3.7 - spec_create duplicate error
  // ============================================================

  describe('create', () => {
    it('should create a new spec successfully', async () => {
      mockFileService.createSpec = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.create(
        '/path/to/project',
        'new-feature',
        'A description for the new feature'
      );

      expect(result.ok).toBe(true);
      expect(mockFileService.createSpec).toHaveBeenCalledWith(
        '/path/to/project',
        'new-feature',
        'A description for the new feature'
      );
    });

    it('should create spec with empty description when not provided', async () => {
      mockFileService.createSpec = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.create(
        '/path/to/project',
        'new-feature'
      );

      expect(result.ok).toBe(true);
      expect(mockFileService.createSpec).toHaveBeenCalledWith(
        '/path/to/project',
        'new-feature',
        ''
      );
    });

    it('should return ALREADY_EXISTS error when spec already exists', async () => {
      mockFileService.createSpec = vi.fn().mockResolvedValue({
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: '/path/to/project/.kiro/specs/existing-feature',
          message: 'EEXIST: file already exists',
        },
      });

      const result = await handlers.create(
        '/path/to/project',
        'existing-feature',
        'Description'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_EXISTS');
        expect(result.error.name).toBe('existing-feature');
      }
    });

    it('should return INVALID_NAME error for invalid spec name', async () => {
      mockFileService.createSpec = vi.fn().mockResolvedValue({
        ok: false,
        error: {
          type: 'INVALID_PATH',
          path: 'Invalid Name',
          reason: 'Spec name must contain only lowercase letters, numbers, and hyphens',
        },
      });

      const result = await handlers.create(
        '/path/to/project',
        'Invalid Name',
        'Description'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_NAME');
      }
    });
  });

  describe('createToolHandler', () => {
    it('should return success result when spec created', async () => {
      mockFileService.createSpec = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.createToolHandler(
        { name: 'new-feature', description: 'A new feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('new-feature');
        expect(result.content[0].text).toContain('created');
      }
    });

    it('should return error when spec already exists', async () => {
      mockFileService.createSpec = vi.fn().mockResolvedValue({
        ok: false,
        error: {
          type: 'WRITE_ERROR',
          path: '/path/to/project/.kiro/specs/existing-feature',
          message: 'EEXIST: file already exists',
        },
      });

      const result = await handlers.createToolHandler(
        { name: 'existing-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.createToolHandler(
        { name: 'new-feature' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('createToolRegistration', () => {
    it('should return valid tool registration for spec_create', () => {
      const registration = handlers.createToolRegistration();

      expect(registration.name).toBe('spec_create');
      expect(registration.description.toLowerCase()).toContain('create');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.createToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.2: spec_approve Tests
  // Requirements: 3.8 - spec_approve
  // Requirements: 3.9 - all phases approval support
  // ============================================================

  describe('approve', () => {
    it('should approve requirements phase successfully', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.updateApproval = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.approve(
        '/path/to/project',
        'test-feature',
        'requirements'
      );

      expect(result.ok).toBe(true);
      expect(mockFileService.updateApproval).toHaveBeenCalledWith(
        '/path/to/project/.kiro/specs/test-feature',
        'requirements',
        true
      );
    });

    it('should approve design phase successfully', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.updateApproval = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.approve(
        '/path/to/project',
        'test-feature',
        'design'
      );

      expect(result.ok).toBe(true);
      expect(mockFileService.updateApproval).toHaveBeenCalledWith(
        '/path/to/project/.kiro/specs/test-feature',
        'design',
        true
      );
    });

    it('should approve tasks phase successfully', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.updateApproval = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.approve(
        '/path/to/project',
        'test-feature',
        'tasks'
      );

      expect(result.ok).toBe(true);
      expect(mockFileService.updateApproval).toHaveBeenCalledWith(
        '/path/to/project/.kiro/specs/test-feature',
        'tasks',
        true
      );
    });

    it('should return NOT_FOUND error when spec does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.approve(
        '/path/to/project',
        'non-existent',
        'requirements'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return PHASE_NOT_GENERATED error when phase not generated', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.updateApproval = vi.fn().mockResolvedValue({
        ok: false,
        error: {
          type: 'INVALID_PATH',
          path: '/path/to/project/.kiro/specs/test-feature',
          reason: 'Cannot approve requirements: phase has not been generated yet',
        },
      });

      const result = await handlers.approve(
        '/path/to/project',
        'test-feature',
        'requirements'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('PHASE_NOT_GENERATED');
      }
    });
  });

  describe('approveToolHandler', () => {
    it('should return success result when phase approved', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.updateApproval = vi.fn().mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.approveToolHandler(
        { name: 'test-feature', phase: 'requirements' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-feature');
        expect(result.content[0].text).toContain('requirements');
        expect(result.content[0].text).toContain('approved');
      }
    });

    it('should return error when spec not found', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.approveToolHandler(
        { name: 'non-existent', phase: 'requirements' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.approveToolHandler(
        { name: 'test-feature', phase: 'requirements' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('approveToolRegistration', () => {
    it('should return valid tool registration for spec_approve', () => {
      const registration = handlers.approveToolRegistration();

      expect(registration.name).toBe('spec_approve');
      expect(registration.description.toLowerCase()).toContain('approve');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.approveToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.2: getAllToolRegistrations should include new tools
  // ============================================================

  describe('getAllToolRegistrations (Task 4.2)', () => {
    it('should include spec_create and spec_approve tools', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'spec_create')).toBe(true);
      expect(registrations.some((r) => r.name === 'spec_approve')).toBe(true);
    });
  });

  // ============================================================
  // Task 4.3: spec_start_execution Tests
  // Requirements: 3.10 - spec_start_execution
  // ============================================================

  describe('startExecution', () => {
    let mockAutoExecutionCoordinator: {
      start: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockAutoExecutionCoordinator = {
        start: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setAutoExecutionCoordinator(mockAutoExecutionCoordinator as unknown as AutoExecutionCoordinator);
    });

    it('should start auto-execution for a spec successfully', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: {
          feature_name: 'test-feature',
          autoExecution: {
            enabled: true,
            permissions: {
              requirements: true,
              design: true,
              tasks: true,
              impl: true,
              inspection: true,
              deploy: false,
            },
            documentReviewFlag: 'run',
          },
        },
      });
      mockAutoExecutionCoordinator.start.mockResolvedValue({
        ok: true,
        value: {
          specPath: '/path/to/project/.kiro/specs/test-feature',
          specId: 'test-feature',
          status: 'running',
        },
      });

      const result = await handlers.startExecution(
        '/path/to/project',
        'test-feature'
      );

      expect(result.ok).toBe(true);
      expect(mockAutoExecutionCoordinator.start).toHaveBeenCalledWith(
        '/path/to/project/.kiro/specs/test-feature',
        'test-feature',
        expect.objectContaining({
          permissions: expect.any(Object),
          documentReviewFlag: 'run',
        })
      );
    });

    it('should return NOT_FOUND error when spec does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.startExecution(
        '/path/to/project',
        'non-existent'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return EXECUTION_NOT_ENABLED error when autoExecution is not enabled', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: {
          feature_name: 'test-feature',
          autoExecution: {
            enabled: false,
          },
        },
      });

      const result = await handlers.startExecution(
        '/path/to/project',
        'test-feature'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EXECUTION_NOT_ENABLED');
      }
    });
  });

  describe('startExecutionToolHandler', () => {
    let mockAutoExecutionCoordinator: {
      start: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockAutoExecutionCoordinator = {
        start: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setAutoExecutionCoordinator(mockAutoExecutionCoordinator as unknown as AutoExecutionCoordinator);
    });

    it('should return success result when execution started', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: {
          feature_name: 'test-feature',
          autoExecution: {
            enabled: true,
            permissions: {
              requirements: true,
              design: true,
              tasks: true,
              impl: true,
              inspection: true,
              deploy: false,
            },
            documentReviewFlag: 'run',
          },
        },
      });
      mockAutoExecutionCoordinator.start.mockResolvedValue({
        ok: true,
        value: {
          specPath: '/path/to/project/.kiro/specs/test-feature',
          specId: 'test-feature',
          status: 'running',
        },
      });

      const result = await handlers.startExecutionToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-feature');
        expect(result.content[0].text).toContain('started');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.startExecutionToolHandler(
        { name: 'test-feature' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('startExecutionToolRegistration', () => {
    it('should return valid tool registration for spec_start_execution', () => {
      const registration = handlers.startExecutionToolRegistration();

      expect(registration.name).toBe('spec_start_execution');
      expect(registration.description.toLowerCase()).toContain('start');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.startExecutionToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.3: spec_stop_execution Tests
  // Requirements: 3.11 - spec_stop_execution
  // ============================================================

  describe('stopExecution', () => {
    let mockAutoExecutionCoordinator: {
      stop: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockAutoExecutionCoordinator = {
        stop: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setAutoExecutionCoordinator(mockAutoExecutionCoordinator as unknown as AutoExecutionCoordinator);
    });

    it('should stop auto-execution for a spec successfully', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.stop.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopExecution(
        '/path/to/project',
        'test-feature'
      );

      expect(result.ok).toBe(true);
      expect(mockAutoExecutionCoordinator.stop).toHaveBeenCalledWith(
        '/path/to/project/.kiro/specs/test-feature'
      );
    });

    it('should return NOT_FOUND error when spec does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.stopExecution(
        '/path/to/project',
        'non-existent'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return NOT_EXECUTING error when spec is not executing', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.stop.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_EXECUTING', specId: 'test-feature' },
      });

      const result = await handlers.stopExecution(
        '/path/to/project',
        'test-feature'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_EXECUTING');
      }
    });
  });

  describe('stopExecutionToolHandler', () => {
    let mockAutoExecutionCoordinator: {
      stop: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockAutoExecutionCoordinator = {
        stop: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setAutoExecutionCoordinator(mockAutoExecutionCoordinator as unknown as AutoExecutionCoordinator);
    });

    it('should return success result when execution stopped', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.stop.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopExecutionToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-feature');
        expect(result.content[0].text).toContain('stopped');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.stopExecutionToolHandler(
        { name: 'test-feature' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('stopExecutionToolRegistration', () => {
    it('should return valid tool registration for spec_stop_execution', () => {
      const registration = handlers.stopExecutionToolRegistration();

      expect(registration.name).toBe('spec_stop_execution');
      expect(registration.description.toLowerCase()).toContain('stop');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.stopExecutionToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.3: spec_get_execution_status Tests
  // Requirements: 3.12 - spec_get_execution_status
  // ============================================================

  describe('getExecutionStatus', () => {
    let mockAutoExecutionCoordinator: {
      getStatus: Mock;
    };

    beforeEach(() => {
      mockAutoExecutionCoordinator = {
        getStatus: vi.fn(),
      };
      handlers.setAutoExecutionCoordinator(mockAutoExecutionCoordinator as unknown as AutoExecutionCoordinator);
    });

    it('should return execution status for a running spec', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.getStatus.mockReturnValue({
        specPath: '/path/to/project/.kiro/specs/test-feature',
        specId: 'test-feature',
        status: 'running',
        currentPhase: 'design',
        executedPhases: ['requirements'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      });

      const result = await handlers.getExecutionStatus(
        '/path/to/project',
        'test-feature'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.status).toBe('running');
        expect(result.value?.currentPhase).toBe('design');
        expect(result.value?.executedPhases).toContain('requirements');
      }
    });

    it('should return null when spec is not executing', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.getStatus.mockReturnValue(null);

      const result = await handlers.getExecutionStatus(
        '/path/to/project',
        'test-feature'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });

    it('should return NOT_FOUND error when spec does not exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: 'specs/non-existent' },
      });

      const result = await handlers.getExecutionStatus(
        '/path/to/project',
        'non-existent'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  describe('getExecutionStatusToolHandler', () => {
    let mockAutoExecutionCoordinator: {
      getStatus: Mock;
    };

    beforeEach(() => {
      mockAutoExecutionCoordinator = {
        getStatus: vi.fn(),
      };
      handlers.setAutoExecutionCoordinator(mockAutoExecutionCoordinator as unknown as AutoExecutionCoordinator);
    });

    it('should return success result with execution status', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.getStatus.mockReturnValue({
        specPath: '/path/to/project/.kiro/specs/test-feature',
        specId: 'test-feature',
        status: 'running',
        currentPhase: 'design',
        executedPhases: ['requirements'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      });

      const result = await handlers.getExecutionStatusToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const data = JSON.parse(result.content[0].text);
        expect(data.status).toBe('running');
        expect(data.currentPhase).toBe('design');
      }
    });

    it('should return null status when not executing', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockAutoExecutionCoordinator.getStatus.mockReturnValue(null);

      const result = await handlers.getExecutionStatusToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        const data = JSON.parse(result.content[0].text);
        expect(data).toBeNull();
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.getExecutionStatusToolHandler(
        { name: 'test-feature' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('getExecutionStatusToolRegistration', () => {
    it('should return valid tool registration for spec_get_execution_status', () => {
      const registration = handlers.getExecutionStatusToolRegistration();

      expect(registration.name).toBe('spec_get_execution_status');
      expect(registration.description.toLowerCase()).toContain('status');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getExecutionStatusToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.3: getAllToolRegistrations should include execution tools
  // ============================================================

  describe('getAllToolRegistrations (Task 4.3)', () => {
    it('should include spec_start_execution, spec_stop_execution, and spec_get_execution_status tools', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'spec_start_execution')).toBe(true);
      expect(registrations.some((r) => r.name === 'spec_stop_execution')).toBe(true);
      expect(registrations.some((r) => r.name === 'spec_get_execution_status')).toBe(true);
    });
  });

  // ============================================================
  // Task 4.4: spec_agent_stop Tests
  // Requirements: 3.13 - spec_agent_stop
  // ============================================================

  describe('stopAgent', () => {
    let mockSpecManagerService: {
      stopAgent: Mock;
      getAllAgents: Mock;
    };

    beforeEach(() => {
      mockSpecManagerService = {
        stopAgent: vi.fn(),
        getAllAgents: vi.fn(),
      };
      handlers.setSpecManagerService(mockSpecManagerService as any);
    });

    it('should stop agent for a spec successfully', async () => {
      // Setup: spec exists and has running agent
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
          ]],
        ])
      );
      mockSpecManagerService.stopAgent.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopAgent('test-feature');

      expect(result.ok).toBe(true);
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should stop all running agents for a spec', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
            { agentId: 'agent-2', specId: 'test-feature', status: 'running', phase: 'design' },
            { agentId: 'agent-3', specId: 'test-feature', status: 'completed', phase: 'impl' }, // not running
          ]],
        ])
      );
      mockSpecManagerService.stopAgent.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopAgent('test-feature');

      expect(result.ok).toBe(true);
      // Should have called stopAgent for each running agent
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledTimes(2);
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-2');
    });

    it('should return AGENT_NOT_FOUND error when no running agents exist', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'completed', phase: 'impl' },
          ]],
        ])
      );

      const result = await handlers.stopAgent('test-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return AGENT_NOT_FOUND error when spec has no agents', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.stopAgent('test-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });
  });

  describe('stopAgentToolHandler', () => {
    let mockSpecManagerService: {
      stopAgent: Mock;
      getAllAgents: Mock;
    };

    beforeEach(() => {
      mockSpecManagerService = {
        stopAgent: vi.fn(),
        getAllAgents: vi.fn(),
      };
      handlers.setSpecManagerService(mockSpecManagerService as any);
    });

    it('should return success result when agent stopped', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
          ]],
        ])
      );
      mockSpecManagerService.stopAgent.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopAgentToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-feature');
        expect(result.content[0].text).toContain('stopped');
      }
    });

    it('should return error when no running agents found', async () => {
      mockFileService.resolveSpecPath.mockResolvedValue({
        ok: true,
        value: '/path/to/project/.kiro/specs/test-feature',
      });
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.stopAgentToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.stopAgentToolHandler(
        { name: 'test-feature' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('stopAgentToolRegistration', () => {
    it('should return valid tool registration for spec_agent_stop', () => {
      const registration = handlers.stopAgentToolRegistration();

      expect(registration.name).toBe('spec_agent_stop');
      expect(registration.description.toLowerCase()).toContain('stop');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.stopAgentToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.4: spec_agent_get_logs Tests
  // Requirements: 3.14 - spec_agent_get_logs
  // ============================================================

  describe('getAgentLogs', () => {
    let mockSpecManagerService: {
      getAllAgents: Mock;
    };
    let mockLogFileService: {
      readLog: Mock;
    };

    beforeEach(() => {
      mockSpecManagerService = {
        getAllAgents: vi.fn(),
      };
      mockLogFileService = {
        readLog: vi.fn(),
      };
      handlers.setSpecManagerService(mockSpecManagerService as any);
      handlers.setLogFileService(mockLogFileService as any);
    });

    it('should return logs for a spec agent successfully', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout', data: 'Log line 1' },
        { timestamp: '2024-01-01T00:00:01Z', stream: 'stdout', data: 'Log line 2' },
      ]);

      const result = await handlers.getAgentLogs('test-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].data).toBe('Log line 1');
      }
    });

    it('should return limited logs when lines parameter is provided', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout', data: 'Log line 1' },
        { timestamp: '2024-01-01T00:00:01Z', stream: 'stdout', data: 'Log line 2' },
        { timestamp: '2024-01-01T00:00:02Z', stream: 'stdout', data: 'Log line 3' },
        { timestamp: '2024-01-01T00:00:03Z', stream: 'stdout', data: 'Log line 4' },
        { timestamp: '2024-01-01T00:00:04Z', stream: 'stdout', data: 'Log line 5' },
      ]);

      const result = await handlers.getAgentLogs('test-feature', 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should return only the last 3 entries
        expect(result.value).toHaveLength(3);
        expect(result.value[0].data).toBe('Log line 3');
        expect(result.value[2].data).toBe('Log line 5');
      }
    });

    it('should return AGENT_NOT_FOUND when spec has no agents', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.getAgentLogs('test-feature');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return empty logs when agent has no log entries', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([]);

      const result = await handlers.getAgentLogs('test-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  describe('getAgentLogsToolHandler', () => {
    let mockSpecManagerService: {
      getAllAgents: Mock;
    };
    let mockLogFileService: {
      readLog: Mock;
    };

    beforeEach(() => {
      mockSpecManagerService = {
        getAllAgents: vi.fn(),
      };
      mockLogFileService = {
        readLog: vi.fn(),
      };
      handlers.setSpecManagerService(mockSpecManagerService as any);
      handlers.setLogFileService(mockLogFileService as any);
    });

    it('should return success result with logs', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['test-feature', [
            { agentId: 'agent-1', specId: 'test-feature', status: 'running', phase: 'impl' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout', data: 'Log line 1' },
      ]);

      const result = await handlers.getAgentLogsToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const data = JSON.parse(result.content[0].text);
        expect(data).toHaveLength(1);
        expect(data[0].data).toBe('Log line 1');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.getAgentLogsToolHandler(
        { name: 'test-feature' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });

    it('should return error when no agents found', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.getAgentLogsToolHandler(
        { name: 'test-feature' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('AGENT_NOT_FOUND');
      }
    });
  });

  describe('getAgentLogsToolRegistration', () => {
    it('should return valid tool registration for spec_agent_get_logs', () => {
      const registration = handlers.getAgentLogsToolRegistration();

      expect(registration.name).toBe('spec_agent_get_logs');
      expect(registration.description.toLowerCase()).toContain('log');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getAgentLogsToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 4.4: getAllToolRegistrations should include agent tools
  // ============================================================

  describe('getAllToolRegistrations (Task 4.4)', () => {
    it('should include spec_agent_stop and spec_agent_get_logs tools', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'spec_agent_stop')).toBe(true);
      expect(registrations.some((r) => r.name === 'spec_agent_get_logs')).toBe(true);
    });
  });
});
