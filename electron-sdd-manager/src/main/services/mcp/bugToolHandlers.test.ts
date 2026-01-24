/**
 * BugToolHandlers Unit Tests
 * TDD: Testing bug_* scope MCP tools
 * Requirements: 4.1, 4.2 - bug_get
 * Requirements: 4.3, 4.4, 4.5 - bug_get_artifact
 *
 * @file bugToolHandlers.test.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { BugService } from '../bugService';
import type { BugWorkflowService } from '../bugWorkflowService';
import type { FileService } from '../fileService';
import type { BugDetail, BugMetadata, BugPhase, BugArtifactInfo } from '../../../renderer/types';

// Import after mocks are set up
import { BugToolHandlers, BUG_ARTIFACT_TYPES, BUG_PHASES } from './bugToolHandlers';

describe('BugToolHandlers', () => {
  let handlers: BugToolHandlers;
  let mockBugService: {
    readBugDetail: Mock;
    resolveBugPath: Mock;
    bugExists: Mock;
    createBug: Mock;
    updateBugJsonPhase: Mock;
  };
  let mockBugWorkflowService: {
    // No additional methods needed for phase update
  };
  let mockFileService: {
    readArtifact: Mock;
    resolveBugPath: Mock;
  };

  beforeEach(() => {
    handlers = new BugToolHandlers();
    mockBugService = {
      readBugDetail: vi.fn(),
      resolveBugPath: vi.fn(),
      bugExists: vi.fn(),
      createBug: vi.fn(),
      updateBugJsonPhase: vi.fn(),
    };
    mockBugWorkflowService = {};
    mockFileService = {
      readArtifact: vi.fn(),
      resolveBugPath: vi.fn(),
    };
    handlers.setBugService(mockBugService as unknown as BugService);
    handlers.setBugWorkflowService(mockBugWorkflowService as unknown as BugWorkflowService);
    handlers.setFileService(mockFileService as unknown as FileService);
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 5.1: BUG_ARTIFACT_TYPES constant
  // Requirements: 4.4 - artifact types support
  // ============================================================

  describe('BUG_ARTIFACT_TYPES', () => {
    it('should define all required bug artifact types', () => {
      expect(BUG_ARTIFACT_TYPES).toContain('bug');
      expect(BUG_ARTIFACT_TYPES).toContain('analysis');
      expect(BUG_ARTIFACT_TYPES).toContain('fix');
      expect(BUG_ARTIFACT_TYPES).toContain('verify');
    });

    it('should be a readonly array', () => {
      // Verify it's properly typed as const
      expect(Array.isArray(BUG_ARTIFACT_TYPES)).toBe(true);
      expect(BUG_ARTIFACT_TYPES.length).toBe(4);
    });
  });

  // ============================================================
  // Task 5.1: bug_get Tests
  // Requirements: 4.1 - bug_get
  // Requirements: 4.2 - error on not found
  // ============================================================

  describe('get', () => {
    const mockBugMetadata: BugMetadata = {
      name: 'test-bug',
      phase: 'analyzed' as BugPhase,
      updatedAt: '2024-01-02T00:00:00Z',
      reportedAt: '2024-01-01T00:00:00Z',
    };

    const mockBugDetail: BugDetail = {
      metadata: mockBugMetadata,
      artifacts: {
        report: {
          exists: true,
          path: '/path/to/project/.kiro/bugs/test-bug/report.md',
          updatedAt: '2024-01-01T00:00:00Z',
          content: '# Bug Report',
        },
        analysis: {
          exists: true,
          path: '/path/to/project/.kiro/bugs/test-bug/analysis.md',
          updatedAt: '2024-01-02T00:00:00Z',
          content: '# Analysis',
        },
        fix: null,
        verification: null,
      },
    };

    it('should return bug detail with bug.json content and artifacts', async () => {
      // Setup: bug exists
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: mockBugDetail,
      });

      const result = await handlers.get('/path/to/project', 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('test-bug');
        expect(result.value.metadata).toEqual(mockBugMetadata);
        expect(result.value.artifacts).toBeDefined();
        expect(result.value.artifacts.report).not.toBeNull();
        expect(result.value.artifacts.analysis).not.toBeNull();
      }
    });

    it('should include artifact existence info', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: mockBugDetail,
      });

      const result = await handlers.get('/path/to/project', 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.artifacts.report?.exists).toBe(true);
        expect(result.value.artifacts.analysis?.exists).toBe(true);
        expect(result.value.artifacts.fix).toBeNull();
        expect(result.value.artifacts.verification).toBeNull();
      }
    });

    it('should return NOT_FOUND error when bug does not exist', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/non-existent'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/bugs/non-existent' },
      });

      const result = await handlers.get('/path/to/project', 'non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return NOT_FOUND error when bugService is not set', async () => {
      handlers.setBugService(null as unknown as BugService);

      const result = await handlers.get('/path/to/project', 'test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // ============================================================
  // Task 5.1: getToolHandler Tests
  // Tests the MCP tool handler wrapper for bug_get
  // ============================================================

  describe('getToolHandler', () => {
    const mockBugMetadata: BugMetadata = {
      name: 'test-bug',
      phase: 'analyzed' as BugPhase,
      updatedAt: '2024-01-02T00:00:00Z',
      reportedAt: '2024-01-01T00:00:00Z',
    };

    const mockBugDetail: BugDetail = {
      metadata: mockBugMetadata,
      artifacts: {
        report: {
          exists: true,
          path: '/path/report.md',
          updatedAt: '2024-01-01T00:00:00Z',
          content: '# Bug Report',
        },
        analysis: null,
        fix: null,
        verification: null,
      },
    };

    it('should return success result with bug detail', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: mockBugDetail,
      });

      const result = await handlers.getToolHandler(
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        // Parse the JSON response
        const data = JSON.parse(result.content[0].text);
        expect(data.name).toBe('test-bug');
        expect(data.metadata).toBeDefined();
      }
    });

    it('should return error result when bug not found', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/non-existent'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/bugs/non-existent' },
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
      const result = await handlers.getToolHandler({ name: 'test-bug' }, undefined);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  // ============================================================
  // Task 5.1: bug_get_artifact Tests
  // Requirements: 4.3 - bug_get_artifact
  // Requirements: 4.4 - artifact type support
  // Requirements: 4.5 - error on artifact not found
  // ============================================================

  describe('getArtifact', () => {
    it('should return artifact content for bug (report.md)', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Bug Report\n\nThis is the bug report content.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'bug'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('# Bug Report\n\nThis is the bug report content.');
      }
    });

    it('should return artifact content for analysis', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Analysis\n\nThis is the analysis content.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'analysis'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('# Analysis\n\nThis is the analysis content.');
      }
    });

    it('should return artifact content for fix', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Fix\n\nThis is the fix content.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'fix'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('# Fix\n\nThis is the fix content.');
      }
    });

    it('should return artifact content for verify (verification.md)', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Verification\n\nThis is the verification content.',
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'verify'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('# Verification\n\nThis is the verification content.');
      }
    });

    it('should return NOT_FOUND when bug does not exist', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/non-existent'
      );
      // Simulate bug directory not existing by having readArtifact fail
      mockFileService.readArtifact.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/bugs/non-existent/report.md' },
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'non-existent',
        'bug'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ARTIFACT_NOT_FOUND');
      }
    });

    it('should return ARTIFACT_NOT_FOUND when artifact does not exist', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/bugs/test-bug/analysis.md' },
      });

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'analysis'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ARTIFACT_NOT_FOUND');
        expect(result.error.name).toBe('test-bug');
        expect(result.error.artifact).toBe('analysis');
      }
    });

    it('should return NOT_FOUND when bugService is not set', async () => {
      handlers.setBugService(null as unknown as BugService);

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'bug'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should return NOT_FOUND when fileService is not set', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      handlers.setFileService(null as unknown as FileService);

      const result = await handlers.getArtifact(
        '/path/to/project',
        'test-bug',
        'bug'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // ============================================================
  // Task 5.1: getArtifactToolHandler Tests
  // Tests the MCP tool handler wrapper for bug_get_artifact
  // ============================================================

  describe('getArtifactToolHandler', () => {
    it('should return success result with artifact content', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: true,
        value: '# Bug Report\n\nContent here.',
      });

      const result = await handlers.getArtifactToolHandler(
        { name: 'test-bug', artifact: 'bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Bug Report');
      }
    });

    it('should return error when artifact not found', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockFileService.readArtifact.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/report.md' },
      });

      const result = await handlers.getArtifactToolHandler(
        { name: 'test-bug', artifact: 'bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ARTIFACT_NOT_FOUND');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.getArtifactToolHandler(
        { name: 'test-bug', artifact: 'bug' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  // ============================================================
  // Task 5.1: Tool Registration Tests
  // ============================================================

  describe('getToolRegistration', () => {
    it('should return valid tool registration for bug_get', () => {
      const registration = handlers.getToolRegistration();

      expect(registration.name).toBe('bug_get');
      expect(registration.description).toContain('bug');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  describe('getArtifactToolRegistration', () => {
    it('should return valid tool registration for bug_get_artifact', () => {
      const registration = handlers.getArtifactToolRegistration();

      expect(registration.name).toBe('bug_get_artifact');
      expect(registration.description).toContain('artifact');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getArtifactToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  describe('getAllToolRegistrations', () => {
    it('should include bug_get and bug_get_artifact', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'bug_get')).toBe(true);
      expect(registrations.some((r) => r.name === 'bug_get_artifact')).toBe(true);
    });

    it('should include bug_create and bug_update_phase', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'bug_create')).toBe(true);
      expect(registrations.some((r) => r.name === 'bug_update_phase')).toBe(true);
    });
  });

  // ============================================================
  // Task 5.2: BUG_PHASES constant
  // Requirements: 4.8 - phase update support
  // ============================================================

  describe('BUG_PHASES', () => {
    it('should define all required bug phases', () => {
      expect(BUG_PHASES).toContain('reported');
      expect(BUG_PHASES).toContain('analyzed');
      expect(BUG_PHASES).toContain('fixed');
      expect(BUG_PHASES).toContain('verified');
      expect(BUG_PHASES).toContain('deployed');
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(BUG_PHASES)).toBe(true);
      expect(BUG_PHASES.length).toBe(5);
    });
  });

  // ============================================================
  // Task 5.2: bug_create Tests
  // Requirements: 4.6 - bug_create
  // Requirements: 4.7 - error on duplicate
  // ============================================================

  describe('create', () => {
    it('should create a new bug with name and description', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/new-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: false });
      mockBugService.createBug.mockResolvedValue({
        ok: true,
        value: {
          bug_name: 'new-bug',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      const result = await handlers.create(
        '/path/to/project',
        'new-bug',
        'This is the bug description'
      );

      expect(result.ok).toBe(true);
      expect(mockBugService.createBug).toHaveBeenCalledWith(
        '/path/to/project/.kiro/bugs/new-bug',
        'new-bug',
        'This is the bug description'
      );
    });

    it('should return ALREADY_EXISTS error when bug already exists', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/existing-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: true });

      const result = await handlers.create(
        '/path/to/project',
        'existing-bug',
        'This is the bug description'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('ALREADY_EXISTS');
        expect(result.error.name).toBe('existing-bug');
      }
    });

    it('should return NOT_FOUND error when bugService is not set', async () => {
      handlers.setBugService(null as unknown as BugService);

      const result = await handlers.create(
        '/path/to/project',
        'new-bug',
        'description'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  // ============================================================
  // Task 5.2: createToolHandler Tests
  // Tests the MCP tool handler wrapper for bug_create
  // ============================================================

  describe('createToolHandler', () => {
    it('should return success result when bug is created', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/new-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: false });
      mockBugService.createBug.mockResolvedValue({
        ok: true,
        value: {
          bug_name: 'new-bug',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      });

      const result = await handlers.createToolHandler(
        { name: 'new-bug', description: 'Bug description' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('new-bug');
        expect(result.content[0].text).toContain('created');
      }
    });

    it('should return error result when bug already exists', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/existing-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: true });

      const result = await handlers.createToolHandler(
        { name: 'existing-bug', description: 'Bug description' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('ALREADY_EXISTS');
        expect(result.error.message).toContain('existing-bug');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.createToolHandler(
        { name: 'new-bug', description: 'Bug description' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  // ============================================================
  // Task 5.2: createToolRegistration Tests
  // ============================================================

  describe('createToolRegistration', () => {
    it('should return valid tool registration for bug_create', () => {
      const registration = handlers.createToolRegistration();

      expect(registration.name).toBe('bug_create');
      expect(registration.description).toContain('bug');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.createToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.2: bug_update_phase Tests
  // Requirements: 4.8 - bug_update_phase
  // ============================================================

  describe('updatePhase', () => {
    it('should update bug phase successfully', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: true });
      mockBugService.updateBugJsonPhase.mockResolvedValue({ ok: true, value: undefined });

      const result = await handlers.updatePhase(
        '/path/to/project',
        'test-bug',
        'analyzed'
      );

      expect(result.ok).toBe(true);
      expect(mockBugService.updateBugJsonPhase).toHaveBeenCalledWith(
        '/path/to/project/.kiro/bugs/test-bug',
        'analyzed'
      );
    });

    it('should return NOT_FOUND error when bug does not exist', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/non-existent'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: false });

      const result = await handlers.updatePhase(
        '/path/to/project',
        'non-existent',
        'analyzed'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return NOT_FOUND error when bugService is not set', async () => {
      handlers.setBugService(null as unknown as BugService);

      const result = await handlers.updatePhase(
        '/path/to/project',
        'test-bug',
        'analyzed'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should support all valid bug phases', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: true });
      mockBugService.updateBugJsonPhase.mockResolvedValue({ ok: true, value: undefined });

      for (const phase of ['reported', 'analyzed', 'fixed', 'verified', 'deployed'] as const) {
        const result = await handlers.updatePhase(
          '/path/to/project',
          'test-bug',
          phase
        );
        expect(result.ok).toBe(true);
      }
    });
  });

  // ============================================================
  // Task 5.2: updatePhaseToolHandler Tests
  // Tests the MCP tool handler wrapper for bug_update_phase
  // ============================================================

  describe('updatePhaseToolHandler', () => {
    it('should return success result when phase is updated', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: true });
      mockBugService.updateBugJsonPhase.mockResolvedValue({ ok: true, value: undefined });

      const result = await handlers.updatePhaseToolHandler(
        { name: 'test-bug', phase: 'analyzed' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('analyzed');
        expect(result.content[0].text).toContain('test-bug');
      }
    });

    it('should return error result when bug not found', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/non-existent'
      );
      mockBugService.bugExists.mockResolvedValue({ ok: true, value: false });

      const result = await handlers.updatePhaseToolHandler(
        { name: 'non-existent', phase: 'analyzed' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.message).toContain('non-existent');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.updatePhaseToolHandler(
        { name: 'test-bug', phase: 'analyzed' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  // ============================================================
  // Task 5.2: updatePhaseToolRegistration Tests
  // ============================================================

  describe('updatePhaseToolRegistration', () => {
    it('should return valid tool registration for bug_update_phase', () => {
      const registration = handlers.updatePhaseToolRegistration();

      expect(registration.name).toBe('bug_update_phase');
      expect(registration.description).toContain('phase');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.updatePhaseToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.3: bug_start_execution Tests
  // Requirements: 4.9 - bug_start_execution
  // ============================================================

  describe('startExecution', () => {
    let mockBugAutoExecutionCoordinator: {
      start: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockBugAutoExecutionCoordinator = {
        start: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setBugAutoExecutionCoordinator(mockBugAutoExecutionCoordinator as any);
    });

    it('should start auto-execution for a bug successfully', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: {
          metadata: {
            name: 'test-bug',
            phase: 'analyzed',
            updatedAt: '2024-01-02T00:00:00Z',
            reportedAt: '2024-01-01T00:00:00Z',
            autoExecution: {
              enabled: true,
              permissions: {
                analyze: true,
                fix: true,
                verify: true,
                deploy: false,
              },
            },
          },
          artifacts: {
            report: { exists: true, path: '/path/report.md', updatedAt: '2024-01-01T00:00:00Z', content: '' },
            analysis: { exists: true, path: '/path/analysis.md', updatedAt: '2024-01-02T00:00:00Z', content: '' },
            fix: null,
            verification: null,
          },
        },
      });
      mockBugAutoExecutionCoordinator.start.mockResolvedValue({
        ok: true,
        value: {
          bugPath: '/path/to/project/.kiro/bugs/test-bug',
          bugName: 'test-bug',
          status: 'running',
        },
      });

      const result = await handlers.startExecution('/path/to/project', 'test-bug');

      expect(result.ok).toBe(true);
      expect(mockBugAutoExecutionCoordinator.start).toHaveBeenCalledWith(
        '/path/to/project/.kiro/bugs/test-bug',
        'test-bug',
        expect.objectContaining({
          permissions: expect.any(Object),
        }),
        'analyze' // lastCompletedPhase derived from current phase ('analyzed' -> 'analyze')
      );
    });

    it('should return NOT_FOUND error when bug does not exist', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/non-existent'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_FOUND', path: '/path/to/project/.kiro/bugs/non-existent' },
      });

      const result = await handlers.startExecution('/path/to/project', 'non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.name).toBe('non-existent');
      }
    });

    it('should return EXECUTION_NOT_ENABLED error when autoExecution is not enabled', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: {
          metadata: {
            name: 'test-bug',
            phase: 'analyzed',
            updatedAt: '2024-01-02T00:00:00Z',
            reportedAt: '2024-01-01T00:00:00Z',
            autoExecution: {
              enabled: false,
            },
          },
          artifacts: {
            report: { exists: true, path: '/path/report.md', updatedAt: '2024-01-01T00:00:00Z', content: '' },
            analysis: null,
            fix: null,
            verification: null,
          },
        },
      });

      const result = await handlers.startExecution('/path/to/project', 'test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EXECUTION_NOT_ENABLED');
      }
    });

    it('should return EXECUTION_NOT_ENABLED when autoExecution is not configured', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: {
          metadata: {
            name: 'test-bug',
            phase: 'reported',
            updatedAt: '2024-01-01T00:00:00Z',
            reportedAt: '2024-01-01T00:00:00Z',
            // No autoExecution property
          },
          artifacts: {
            report: { exists: true, path: '/path/report.md', updatedAt: '2024-01-01T00:00:00Z', content: '' },
            analysis: null,
            fix: null,
            verification: null,
          },
        },
      });

      const result = await handlers.startExecution('/path/to/project', 'test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EXECUTION_NOT_ENABLED');
      }
    });
  });

  describe('startExecutionToolHandler', () => {
    let mockBugAutoExecutionCoordinator: {
      start: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockBugAutoExecutionCoordinator = {
        start: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setBugAutoExecutionCoordinator(mockBugAutoExecutionCoordinator as any);
    });

    it('should return success result when execution started', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugService.readBugDetail.mockResolvedValue({
        ok: true,
        value: {
          metadata: {
            name: 'test-bug',
            phase: 'reported',
            updatedAt: '2024-01-01T00:00:00Z',
            reportedAt: '2024-01-01T00:00:00Z',
            autoExecution: {
              enabled: true,
              permissions: {
                analyze: true,
                fix: true,
                verify: true,
                deploy: false,
              },
            },
          },
          artifacts: {
            report: { exists: true, path: '/path/report.md', updatedAt: '2024-01-01T00:00:00Z', content: '' },
            analysis: null,
            fix: null,
            verification: null,
          },
        },
      });
      mockBugAutoExecutionCoordinator.start.mockResolvedValue({
        ok: true,
        value: {
          bugPath: '/path/to/project/.kiro/bugs/test-bug',
          bugName: 'test-bug',
          status: 'running',
        },
      });

      const result = await handlers.startExecutionToolHandler(
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-bug');
        expect(result.content[0].text).toContain('started');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.startExecutionToolHandler(
        { name: 'test-bug' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('startExecutionToolRegistration', () => {
    it('should return valid tool registration for bug_start_execution', () => {
      const registration = handlers.startExecutionToolRegistration();

      expect(registration.name).toBe('bug_start_execution');
      expect(registration.description.toLowerCase()).toContain('start');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.startExecutionToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.3: bug_stop_execution Tests
  // Requirements: 4.10 - bug_stop_execution
  // ============================================================

  describe('stopExecution', () => {
    let mockBugAutoExecutionCoordinator: {
      stop: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockBugAutoExecutionCoordinator = {
        stop: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setBugAutoExecutionCoordinator(mockBugAutoExecutionCoordinator as any);
    });

    it('should stop auto-execution for a bug successfully', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.stop.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopExecution('/path/to/project', 'test-bug');

      expect(result.ok).toBe(true);
      expect(mockBugAutoExecutionCoordinator.stop).toHaveBeenCalledWith(
        '/path/to/project/.kiro/bugs/test-bug'
      );
    });

    it('should return NOT_EXECUTING error when bug is not executing', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.stop.mockResolvedValue({
        ok: false,
        error: { type: 'NOT_EXECUTING', bugName: 'test-bug' },
      });

      const result = await handlers.stopExecution('/path/to/project', 'test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_EXECUTING');
      }
    });
  });

  describe('stopExecutionToolHandler', () => {
    let mockBugAutoExecutionCoordinator: {
      stop: Mock;
      getStatus: Mock;
    };

    beforeEach(() => {
      mockBugAutoExecutionCoordinator = {
        stop: vi.fn(),
        getStatus: vi.fn(),
      };
      handlers.setBugAutoExecutionCoordinator(mockBugAutoExecutionCoordinator as any);
    });

    it('should return success result when execution stopped', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.stop.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopExecutionToolHandler(
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-bug');
        expect(result.content[0].text).toContain('stopped');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.stopExecutionToolHandler(
        { name: 'test-bug' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('stopExecutionToolRegistration', () => {
    it('should return valid tool registration for bug_stop_execution', () => {
      const registration = handlers.stopExecutionToolRegistration();

      expect(registration.name).toBe('bug_stop_execution');
      expect(registration.description.toLowerCase()).toContain('stop');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.stopExecutionToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.3: bug_get_execution_status Tests
  // Requirements: 4.11 - bug_get_execution_status
  // ============================================================

  describe('getExecutionStatus', () => {
    let mockBugAutoExecutionCoordinator: {
      getStatus: Mock;
    };

    beforeEach(() => {
      mockBugAutoExecutionCoordinator = {
        getStatus: vi.fn(),
      };
      handlers.setBugAutoExecutionCoordinator(mockBugAutoExecutionCoordinator as any);
    });

    it('should return execution status for a running bug', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.getStatus.mockReturnValue({
        bugPath: '/path/to/project/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        status: 'running',
        currentPhase: 'fix',
        executedPhases: ['analyze'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      });

      const result = await handlers.getExecutionStatus('/path/to/project', 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value?.status).toBe('running');
        expect(result.value?.currentPhase).toBe('fix');
        expect(result.value?.executedPhases).toContain('analyze');
      }
    });

    it('should return null when bug is not executing', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.getStatus.mockReturnValue(null);

      const result = await handlers.getExecutionStatus('/path/to/project', 'test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeNull();
      }
    });
  });

  describe('getExecutionStatusToolHandler', () => {
    let mockBugAutoExecutionCoordinator: {
      getStatus: Mock;
    };

    beforeEach(() => {
      mockBugAutoExecutionCoordinator = {
        getStatus: vi.fn(),
      };
      handlers.setBugAutoExecutionCoordinator(mockBugAutoExecutionCoordinator as any);
    });

    it('should return success result with execution status', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.getStatus.mockReturnValue({
        bugPath: '/path/to/project/.kiro/bugs/test-bug',
        bugName: 'test-bug',
        status: 'running',
        currentPhase: 'fix',
        executedPhases: ['analyze'],
        errors: [],
        startTime: Date.now(),
        lastActivityTime: Date.now(),
      });

      const result = await handlers.getExecutionStatusToolHandler(
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const data = JSON.parse(result.content[0].text);
        expect(data.status).toBe('running');
        expect(data.currentPhase).toBe('fix');
      }
    });

    it('should return null status when not executing', async () => {
      mockBugService.resolveBugPath.mockResolvedValue(
        '/path/to/project/.kiro/bugs/test-bug'
      );
      mockBugAutoExecutionCoordinator.getStatus.mockReturnValue(null);

      const result = await handlers.getExecutionStatusToolHandler(
        { name: 'test-bug' },
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
        { name: 'test-bug' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('getExecutionStatusToolRegistration', () => {
    it('should return valid tool registration for bug_get_execution_status', () => {
      const registration = handlers.getExecutionStatusToolRegistration();

      expect(registration.name).toBe('bug_get_execution_status');
      expect(registration.description.toLowerCase()).toContain('status');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getExecutionStatusToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.3: getAllToolRegistrations should include execution tools
  // ============================================================

  describe('getAllToolRegistrations (Task 5.3)', () => {
    it('should include bug_start_execution, bug_stop_execution, and bug_get_execution_status tools', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'bug_start_execution')).toBe(true);
      expect(registrations.some((r) => r.name === 'bug_stop_execution')).toBe(true);
      expect(registrations.some((r) => r.name === 'bug_get_execution_status')).toBe(true);
    });
  });

  // ============================================================
  // Task 5.4: bug_agent_stop Tests
  // Requirements: 4.12 - bug_agent_stop
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

    it('should stop agent for a bug successfully', async () => {
      // Setup: bug exists and has running agent (using bug name as specId)
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
          ]],
        ])
      );
      mockSpecManagerService.stopAgent.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopAgent('test-bug');

      expect(result.ok).toBe(true);
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-1');
    });

    it('should stop all running agents for a bug', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
            { agentId: 'agent-2', specId: 'bug:test-bug', status: 'running', phase: 'analyze' },
            { agentId: 'agent-3', specId: 'bug:test-bug', status: 'completed', phase: 'fix' }, // not running
          ]],
        ])
      );
      mockSpecManagerService.stopAgent.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopAgent('test-bug');

      expect(result.ok).toBe(true);
      // Should have called stopAgent for each running agent
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledTimes(2);
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-1');
      expect(mockSpecManagerService.stopAgent).toHaveBeenCalledWith('agent-2');
    });

    it('should return AGENT_NOT_FOUND error when no running agents exist', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'completed', phase: 'fix' },
          ]],
        ])
      );

      const result = await handlers.stopAgent('test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return AGENT_NOT_FOUND error when bug has no agents', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.stopAgent('test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return AGENT_NOT_FOUND when specManagerService is not set', async () => {
      handlers.setSpecManagerService(null as any);

      const result = await handlers.stopAgent('test-bug');

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
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
          ]],
        ])
      );
      mockSpecManagerService.stopAgent.mockResolvedValue({
        ok: true,
        value: undefined,
      });

      const result = await handlers.stopAgentToolHandler(
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('test-bug');
        expect(result.content[0].text).toContain('stopped');
      }
    });

    it('should return error when no running agents found', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.stopAgentToolHandler(
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return error when project path is not provided', async () => {
      const result = await handlers.stopAgentToolHandler(
        { name: 'test-bug' },
        undefined
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NO_PROJECT_SELECTED');
      }
    });
  });

  describe('stopAgentToolRegistration', () => {
    it('should return valid tool registration for bug_agent_stop', () => {
      const registration = handlers.stopAgentToolRegistration();

      expect(registration.name).toBe('bug_agent_stop');
      expect(registration.description.toLowerCase()).toContain('stop');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.stopAgentToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.4: bug_agent_get_logs Tests
  // Requirements: 4.13 - bug_agent_get_logs
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

    it('should return logs for a bug agent successfully', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout', data: 'Log line 1' },
        { timestamp: '2024-01-01T00:00:01Z', stream: 'stdout', data: 'Log line 2' },
      ]);

      const result = await handlers.getAgentLogs('test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].data).toBe('Log line 1');
      }
    });

    it('should return limited logs when lines parameter is provided', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
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

      const result = await handlers.getAgentLogs('test-bug', 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should return only the last 3 entries
        expect(result.value).toHaveLength(3);
        expect(result.value[0].data).toBe('Log line 3');
        expect(result.value[2].data).toBe('Log line 5');
      }
    });

    it('should return AGENT_NOT_FOUND when bug has no agents', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.getAgentLogs('test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return empty logs when agent has no log entries', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([]);

      const result = await handlers.getAgentLogs('test-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should return AGENT_NOT_FOUND when specManagerService is not set', async () => {
      handlers.setSpecManagerService(null as any);

      const result = await handlers.getAgentLogs('test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
      }
    });

    it('should return AGENT_NOT_FOUND when logFileService is not set', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(
        new Map([
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
          ]],
        ])
      );
      handlers.setLogFileService(null as any);

      const result = await handlers.getAgentLogs('test-bug');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AGENT_NOT_FOUND');
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
          ['bug:test-bug', [
            { agentId: 'agent-1', specId: 'bug:test-bug', status: 'running', phase: 'fix' },
          ]],
        ])
      );
      mockLogFileService.readLog.mockResolvedValue([
        { timestamp: '2024-01-01T00:00:00Z', stream: 'stdout', data: 'Log line 1' },
      ]);

      const result = await handlers.getAgentLogsToolHandler(
        { name: 'test-bug' },
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
        { name: 'test-bug' },
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
        { name: 'test-bug' },
        '/path/to/project'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('AGENT_NOT_FOUND');
      }
    });
  });

  describe('getAgentLogsToolRegistration', () => {
    it('should return valid tool registration for bug_agent_get_logs', () => {
      const registration = handlers.getAgentLogsToolRegistration();

      expect(registration.name).toBe('bug_agent_get_logs');
      expect(registration.description.toLowerCase()).toContain('log');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getAgentLogsToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 5.4: getAllToolRegistrations should include agent tools
  // ============================================================

  describe('getAllToolRegistrations (Task 5.4)', () => {
    it('should include bug_agent_stop and bug_agent_get_logs tools', () => {
      const registrations = handlers.getAllToolRegistrations();

      expect(registrations.some((r) => r.name === 'bug_agent_stop')).toBe(true);
      expect(registrations.some((r) => r.name === 'bug_agent_get_logs')).toBe(true);
    });
  });
});
