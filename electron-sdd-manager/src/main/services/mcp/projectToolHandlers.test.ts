/**
 * ProjectToolHandlers Unit Tests
 * TDD: Testing project_* scope MCP tools
 * Requirements: 2.1 - project_get_info
 * Requirements: 2.2, 2.3, 2.4, 2.5 - project_list_specs, project_list_bugs
 * Requirements: 2.6 - project_list_agents
 *
 * @file projectToolHandlers.test.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { FileService } from '../fileService';
import type { BugService } from '../bugService';
import type { SpecManagerService } from '../specManagerService';
import type { AgentInfo as SpecManagerAgentInfo } from '../agentRecordService';
import type { SpecMetadata, SpecJson, SpecPhase } from '../../../renderer/types';
import type { BugMetadata, BugPhase } from '../../../renderer/types/bug';

// Create hoisted mocks before imports
const { mockFs } = vi.hoisted(() => {
  return {
    mockFs: {
      access: vi.fn(),
    },
  };
});

// Apply mocks
vi.mock('fs/promises', () => ({
  ...mockFs,
  default: mockFs,
}));

// Import after mocks
import { ProjectToolHandlers } from './projectToolHandlers';

describe('ProjectToolHandlers', () => {
  let handlers: ProjectToolHandlers;

  beforeEach(() => {
    handlers = new ProjectToolHandlers();
    vi.clearAllMocks();
  });

  // ============================================================
  // Task 3.1: project_get_info Tests
  // Requirements: 2.1 - project_get_info
  // ============================================================

  describe('getInfo', () => {
    it('should return project info with all directories existing', async () => {
      // Setup: All directories exist
      mockFs.access.mockResolvedValue(undefined);

      const result = await handlers.getInfo('/path/to/project');

      expect(result).toEqual({
        path: '/path/to/project',
        name: 'project',
        hasKiroDir: true,
        hasSteeringDir: true,
        hasSpecsDir: true,
        hasBugsDir: true,
      });
    });

    it('should return project info with no directories existing', async () => {
      // Setup: No directories exist
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await handlers.getInfo('/path/to/my-project');

      expect(result).toEqual({
        path: '/path/to/my-project',
        name: 'my-project',
        hasKiroDir: false,
        hasSteeringDir: false,
        hasSpecsDir: false,
        hasBugsDir: false,
      });
    });

    it('should return project info with partial directories existing', async () => {
      // Setup: Only .kiro and .kiro/specs exist
      mockFs.access.mockImplementation(async (path: string) => {
        const pathStr = String(path);
        if (pathStr.endsWith('.kiro')) {
          return undefined; // exists
        }
        if (pathStr.endsWith('.kiro/specs')) {
          return undefined; // exists
        }
        throw new Error('ENOENT');
      });

      const result = await handlers.getInfo('/path/to/partial-project');

      expect(result).toEqual({
        path: '/path/to/partial-project',
        name: 'partial-project',
        hasKiroDir: true,
        hasSteeringDir: false,
        hasSpecsDir: true,
        hasBugsDir: false,
      });
    });

    it('should extract project name from path', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result1 = await handlers.getInfo('/Users/dev/my-awesome-project');
      expect(result1.name).toBe('my-awesome-project');

      const result2 = await handlers.getInfo('/home/user/simple');
      expect(result2.name).toBe('simple');

      const result3 = await handlers.getInfo('/project');
      expect(result3.name).toBe('project');
    });

    it('should check correct directory paths', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      await handlers.getInfo('/path/to/project');

      // Verify access was called with correct paths
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/project/.kiro');
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/project/.kiro/steering');
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/project/.kiro/specs');
      expect(mockFs.access).toHaveBeenCalledWith('/path/to/project/.kiro/bugs');
    });
  });

  // ============================================================
  // Task 3.1: getInfoToolHandler Tests
  // Tests the MCP tool handler wrapper
  // ============================================================

  describe('getInfoToolHandler', () => {
    it('should return success result with project info', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await handlers.getInfoToolHandler({}, '/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        // Parse the JSON response
        const info = JSON.parse(result.content[0].text);
        expect(info.path).toBe('/path/to/project');
        expect(info.name).toBe('project');
        expect(info.hasKiroDir).toBe(true);
      }
    });

    it('should return formatted JSON text response', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      const result = await handlers.getInfoToolHandler({}, '/test/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Verify response is valid JSON
        expect(() => JSON.parse(result.content[0].text)).not.toThrow();
      }
    });
  });

  // ============================================================
  // Task 3.1: Tool Registration Tests
  // ============================================================

  describe('getToolRegistration', () => {
    it('should return valid tool registration for project_get_info', () => {
      const registration = handlers.getToolRegistration();

      expect(registration.name).toBe('project_get_info');
      expect(registration.description).toContain('project');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.getInfoToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 3.2: project_list_specs Tests
  // Requirements: 2.2 - list all specs
  // Requirements: 2.3 - filter parameter
  // ============================================================

  describe('listSpecs', () => {
    let mockFileService: {
      readSpecs: Mock;
      readSpecJson: Mock;
    };

    beforeEach(() => {
      mockFileService = {
        readSpecs: vi.fn(),
        readSpecJson: vi.fn(),
      };
      handlers.setFileService(mockFileService as unknown as FileService);
    });

    it('should return all specs with their metadata', async () => {
      // Setup: Mock readSpecs to return spec names
      const specMetadataList: SpecMetadata[] = [
        { name: 'feature-a' },
        { name: 'feature-b' },
      ];
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: specMetadataList });

      // Mock readSpecJson for each spec
      const specJsonA: SpecJson = {
        feature_name: 'feature-a',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        language: 'ja',
        phase: 'requirements-generated' as SpecPhase,
        approvals: {
          requirements: { generated: true, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      };
      const specJsonB: SpecJson = {
        feature_name: 'feature-b',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
        language: 'en',
        phase: 'tasks-generated' as SpecPhase,
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: true, approved: true },
          tasks: { generated: true, approved: false },
        },
        worktree: { path: '.kiro/worktrees/specs/feature-b', branch: 'feature/b', created_at: '2024-01-03T00:00:00Z', enabled: true },
      };
      mockFileService.readSpecJson.mockImplementation(async (specPath: string) => {
        if (specPath.includes('feature-a')) {
          return { ok: true, value: specJsonA };
        }
        if (specPath.includes('feature-b')) {
          return { ok: true, value: specJsonB };
        }
        return { ok: false, error: { type: 'NOT_FOUND', path: specPath } };
      });

      const result = await handlers.listSpecs('/path/to/project');

      expect(result.specs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.specs[0]).toEqual({
        name: 'feature-a',
        phase: 'requirements-generated',
        hasWorktree: false,
        updatedAt: '2024-01-02T00:00:00Z',
      });
      expect(result.specs[1]).toEqual({
        name: 'feature-b',
        phase: 'tasks-generated',
        hasWorktree: true,
        updatedAt: '2024-01-04T00:00:00Z',
      });
    });

    it('should return empty list when no specs exist', async () => {
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: [] });

      const result = await handlers.listSpecs('/path/to/project');

      expect(result.specs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter specs by phase', async () => {
      const specMetadataList: SpecMetadata[] = [
        { name: 'feature-a' },
        { name: 'feature-b' },
        { name: 'feature-c' },
      ];
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: specMetadataList });

      mockFileService.readSpecJson.mockImplementation(async (specPath: string) => {
        const baseJson = {
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          language: 'ja' as const,
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: false },
          },
        };
        if (specPath.includes('feature-a')) {
          return { ok: true, value: { ...baseJson, feature_name: 'feature-a', phase: 'requirements-generated' as SpecPhase } };
        }
        if (specPath.includes('feature-b')) {
          return { ok: true, value: { ...baseJson, feature_name: 'feature-b', phase: 'tasks-generated' as SpecPhase } };
        }
        if (specPath.includes('feature-c')) {
          return { ok: true, value: { ...baseJson, feature_name: 'feature-c', phase: 'tasks-generated' as SpecPhase } };
        }
        return { ok: false, error: { type: 'NOT_FOUND', path: specPath } };
      });

      const result = await handlers.listSpecs('/path/to/project', { phase: 'tasks-generated' });

      expect(result.specs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.specs.every(s => s.phase === 'tasks-generated')).toBe(true);
    });

    it('should filter specs by hasWorktree', async () => {
      const specMetadataList: SpecMetadata[] = [
        { name: 'feature-a' },
        { name: 'feature-b' },
      ];
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: specMetadataList });

      mockFileService.readSpecJson.mockImplementation(async (specPath: string) => {
        const baseJson = {
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          language: 'ja' as const,
          phase: 'tasks-generated' as SpecPhase,
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: false },
          },
        };
        if (specPath.includes('feature-a')) {
          return { ok: true, value: { ...baseJson, feature_name: 'feature-a' } };
        }
        if (specPath.includes('feature-b')) {
          return { ok: true, value: { ...baseJson, feature_name: 'feature-b', worktree: { path: '.kiro/worktrees/specs/feature-b', branch: 'feature/b', created_at: '2024-01-03T00:00:00Z', enabled: true } } };
        }
        return { ok: false, error: { type: 'NOT_FOUND', path: specPath } };
      });

      const resultWithWorktree = await handlers.listSpecs('/path/to/project', { hasWorktree: true });
      expect(resultWithWorktree.specs).toHaveLength(1);
      expect(resultWithWorktree.specs[0].name).toBe('feature-b');

      const resultWithoutWorktree = await handlers.listSpecs('/path/to/project', { hasWorktree: false });
      expect(resultWithoutWorktree.specs).toHaveLength(1);
      expect(resultWithoutWorktree.specs[0].name).toBe('feature-a');
    });

    it('should skip specs with unreadable spec.json', async () => {
      const specMetadataList: SpecMetadata[] = [
        { name: 'feature-a' },
        { name: 'broken-spec' },
      ];
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: specMetadataList });

      mockFileService.readSpecJson.mockImplementation(async (specPath: string) => {
        if (specPath.includes('feature-a')) {
          return {
            ok: true,
            value: {
              feature_name: 'feature-a',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-02T00:00:00Z',
              language: 'ja' as const,
              phase: 'tasks-generated' as SpecPhase,
              approvals: {
                requirements: { generated: true, approved: true },
                design: { generated: true, approved: true },
                tasks: { generated: true, approved: false },
              },
            },
          };
        }
        return { ok: false, error: { type: 'PARSE_ERROR', path: specPath, message: 'Invalid JSON' } };
      });

      const result = await handlers.listSpecs('/path/to/project');

      expect(result.specs).toHaveLength(1);
      expect(result.specs[0].name).toBe('feature-a');
    });
  });

  // ============================================================
  // Task 3.2: listSpecsToolHandler Tests
  // ============================================================

  describe('listSpecsToolHandler', () => {
    let mockFileService: {
      readSpecs: Mock;
      readSpecJson: Mock;
    };

    beforeEach(() => {
      mockFileService = {
        readSpecs: vi.fn(),
        readSpecJson: vi.fn(),
      };
      handlers.setFileService(mockFileService as unknown as FileService);
    });

    it('should return success result with spec list', async () => {
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: [{ name: 'test-spec' }] });
      mockFileService.readSpecJson.mockResolvedValue({
        ok: true,
        value: {
          feature_name: 'test-spec',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          language: 'ja',
          phase: 'tasks-generated',
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: false },
          },
        },
      });

      const result = await handlers.listSpecsToolHandler({}, '/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.specs).toHaveLength(1);
        expect(parsed.total).toBe(1);
      }
    });

    it('should pass filter to listSpecs when provided', async () => {
      mockFileService.readSpecs.mockResolvedValue({ ok: true, value: [] });

      await handlers.listSpecsToolHandler({ filter: { phase: 'tasks-generated' } }, '/path/to/project');

      // The filter is applied during result processing, not to readSpecs
      expect(mockFileService.readSpecs).toHaveBeenCalledWith('/path/to/project');
    });
  });

  // ============================================================
  // Task 3.2: project_list_bugs Tests
  // Requirements: 2.4 - list all bugs
  // Requirements: 2.5 - filter parameter
  // ============================================================

  describe('listBugs', () => {
    let mockBugService: {
      readBugs: Mock;
    };

    beforeEach(() => {
      mockBugService = {
        readBugs: vi.fn(),
      };
      handlers.setBugService(mockBugService as unknown as BugService);
    });

    it('should return all bugs with their metadata', async () => {
      const bugList: BugMetadata[] = [
        { name: 'bug-001', phase: 'reported' as BugPhase, updatedAt: '2024-01-02T00:00:00Z', reportedAt: '2024-01-01T00:00:00Z' },
        { name: 'bug-002', phase: 'fixed' as BugPhase, updatedAt: '2024-01-04T00:00:00Z', reportedAt: '2024-01-03T00:00:00Z' },
      ];
      mockBugService.readBugs.mockResolvedValue({ ok: true, value: { bugs: bugList, warnings: [] } });

      const result = await handlers.listBugs('/path/to/project');

      expect(result.bugs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.bugs[0]).toEqual({
        name: 'bug-001',
        phase: 'reported',
        updatedAt: '2024-01-02T00:00:00Z',
      });
      expect(result.bugs[1]).toEqual({
        name: 'bug-002',
        phase: 'fixed',
        updatedAt: '2024-01-04T00:00:00Z',
      });
    });

    it('should return empty list when no bugs exist', async () => {
      mockBugService.readBugs.mockResolvedValue({ ok: true, value: { bugs: [], warnings: [] } });

      const result = await handlers.listBugs('/path/to/project');

      expect(result.bugs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter bugs by phase', async () => {
      const bugList: BugMetadata[] = [
        { name: 'bug-001', phase: 'reported' as BugPhase, updatedAt: '2024-01-02T00:00:00Z', reportedAt: '2024-01-01T00:00:00Z' },
        { name: 'bug-002', phase: 'fixed' as BugPhase, updatedAt: '2024-01-04T00:00:00Z', reportedAt: '2024-01-03T00:00:00Z' },
        { name: 'bug-003', phase: 'fixed' as BugPhase, updatedAt: '2024-01-06T00:00:00Z', reportedAt: '2024-01-05T00:00:00Z' },
      ];
      mockBugService.readBugs.mockResolvedValue({ ok: true, value: { bugs: bugList, warnings: [] } });

      const result = await handlers.listBugs('/path/to/project', { phase: 'fixed' });

      expect(result.bugs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.bugs.every(b => b.phase === 'fixed')).toBe(true);
    });

    it('should handle readBugs error gracefully', async () => {
      mockBugService.readBugs.mockResolvedValue({ ok: false, error: { type: 'NOT_FOUND', path: '/path/to/project' } });

      const result = await handlers.listBugs('/path/to/project');

      expect(result.bugs).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ============================================================
  // Task 3.2: listBugsToolHandler Tests
  // ============================================================

  describe('listBugsToolHandler', () => {
    let mockBugService: {
      readBugs: Mock;
    };

    beforeEach(() => {
      mockBugService = {
        readBugs: vi.fn(),
      };
      handlers.setBugService(mockBugService as unknown as BugService);
    });

    it('should return success result with bug list', async () => {
      const bugList: BugMetadata[] = [
        { name: 'bug-001', phase: 'reported' as BugPhase, updatedAt: '2024-01-02T00:00:00Z', reportedAt: '2024-01-01T00:00:00Z' },
      ];
      mockBugService.readBugs.mockResolvedValue({ ok: true, value: { bugs: bugList, warnings: [] } });

      const result = await handlers.listBugsToolHandler({}, '/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.bugs).toHaveLength(1);
        expect(parsed.total).toBe(1);
      }
    });

    it('should pass filter to listBugs when provided', async () => {
      mockBugService.readBugs.mockResolvedValue({ ok: true, value: { bugs: [], warnings: [] } });

      await handlers.listBugsToolHandler({ filter: { phase: 'fixed' } }, '/path/to/project');

      expect(mockBugService.readBugs).toHaveBeenCalledWith('/path/to/project');
    });
  });

  // ============================================================
  // Task 3.2: Tool Registration Tests for list tools
  // ============================================================

  describe('getAllToolRegistrations', () => {
    it('should include project_list_specs registration', () => {
      const registrations = handlers.getAllToolRegistrations();
      const listSpecsReg = registrations.find(r => r.name === 'project_list_specs');

      expect(listSpecsReg).toBeDefined();
      expect(listSpecsReg?.description).toContain('spec');
      expect(listSpecsReg?.inputSchema).toBeDefined();
      expect(listSpecsReg?.requiresProject).toBe(true);
    });

    it('should include project_list_bugs registration', () => {
      const registrations = handlers.getAllToolRegistrations();
      const listBugsReg = registrations.find(r => r.name === 'project_list_bugs');

      expect(listBugsReg).toBeDefined();
      expect(listBugsReg?.description).toContain('bug');
      expect(listBugsReg?.inputSchema).toBeDefined();
      expect(listBugsReg?.requiresProject).toBe(true);
    });
  });

  // ============================================================
  // Task 3.3: project_list_agents Tests
  // Requirements: 2.6 - project_list_agents
  // ============================================================

  describe('listAgents', () => {
    let mockSpecManagerService: {
      getAllAgents: Mock;
    };

    beforeEach(() => {
      mockSpecManagerService = {
        getAllAgents: vi.fn(),
      };
    });

    it('should return all agents from all specs', async () => {
      // Setup: Mock specManagerService.getAllAgents returning agents from multiple specs
      const agentsMap = new Map<string, SpecManagerAgentInfo[]>([
        [
          'spec-a',
          [
            {
              agentId: 'agent-1',
              specId: 'spec-a',
              phase: 'impl',
              pid: 1234,
              sessionId: 'session-1',
              status: 'running',
              startedAt: '2026-01-25T10:00:00Z',
              lastActivityAt: '2026-01-25T10:05:00Z',
              command: 'claude -p ...',
            },
          ],
        ],
        [
          'spec-b',
          [
            {
              agentId: 'agent-2',
              specId: 'spec-b',
              phase: 'design',
              pid: 5678,
              sessionId: 'session-2',
              status: 'completed',
              startedAt: '2026-01-25T09:00:00Z',
              lastActivityAt: '2026-01-25T09:30:00Z',
              command: 'claude -p ...',
            },
          ],
        ],
      ]);
      mockSpecManagerService.getAllAgents.mockResolvedValue(agentsMap);

      const result = await handlers.listAgents(
        mockSpecManagerService as unknown as SpecManagerService
      );

      expect(result.agents).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.agents.map((a) => a.agentId)).toContain('agent-1');
      expect(result.agents.map((a) => a.agentId)).toContain('agent-2');
    });

    it('should return empty array when no agents exist', async () => {
      // Setup: Empty agents map
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());

      const result = await handlers.listAgents(
        mockSpecManagerService as unknown as SpecManagerService
      );

      expect(result.agents).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should include project-level agents (empty specId)', async () => {
      // Setup: Include agents with empty specId (project-level agents)
      const agentsMap = new Map<string, SpecManagerAgentInfo[]>([
        [
          '', // Empty specId = project agent
          [
            {
              agentId: 'project-agent-1',
              specId: '',
              phase: 'project-ask',
              pid: 9999,
              sessionId: 'session-p1',
              status: 'running',
              startedAt: '2026-01-25T11:00:00Z',
              lastActivityAt: '2026-01-25T11:05:00Z',
              command: 'claude -p ...',
            },
          ],
        ],
        [
          'spec-x',
          [
            {
              agentId: 'agent-x',
              specId: 'spec-x',
              phase: 'impl',
              pid: 4321,
              sessionId: 'session-x',
              status: 'running',
              startedAt: '2026-01-25T10:00:00Z',
              lastActivityAt: '2026-01-25T10:05:00Z',
              command: 'claude -p ...',
            },
          ],
        ],
      ]);
      mockSpecManagerService.getAllAgents.mockResolvedValue(agentsMap);

      const result = await handlers.listAgents(
        mockSpecManagerService as unknown as SpecManagerService
      );

      expect(result.agents).toHaveLength(2);
      expect(result.total).toBe(2);

      // Verify project-level agent is included
      const projectAgent = result.agents.find((a) => a.agentId === 'project-agent-1');
      expect(projectAgent).toBeDefined();
      expect(projectAgent?.specId).toBe('');
    });

    it('should return agents with all required fields', async () => {
      const agentsMap = new Map<string, SpecManagerAgentInfo[]>([
        [
          'spec-test',
          [
            {
              agentId: 'agent-full',
              specId: 'spec-test',
              phase: 'tasks',
              pid: 1111,
              sessionId: 'session-full',
              status: 'running',
              startedAt: '2026-01-25T12:00:00Z',
              lastActivityAt: '2026-01-25T12:10:00Z',
              command: 'claude -p "some prompt"',
              cwd: '/path/to/project',
            },
          ],
        ],
      ]);
      mockSpecManagerService.getAllAgents.mockResolvedValue(agentsMap);

      const result = await handlers.listAgents(
        mockSpecManagerService as unknown as SpecManagerService
      );

      expect(result.agents).toHaveLength(1);
      const agent = result.agents[0];
      expect(agent.agentId).toBe('agent-full');
      expect(agent.specId).toBe('spec-test');
      expect(agent.phase).toBe('tasks');
      expect(agent.pid).toBe(1111);
      expect(agent.status).toBe('running');
      expect(agent.startedAt).toBe('2026-01-25T12:00:00Z');
      expect(agent.lastActivityAt).toBe('2026-01-25T12:10:00Z');
    });
  });

  // ============================================================
  // Task 3.3: listAgentsToolHandler Tests
  // Tests the MCP tool handler wrapper
  // ============================================================

  describe('listAgentsToolHandler', () => {
    let mockSpecManagerService: {
      getAllAgents: Mock;
    };

    beforeEach(() => {
      mockSpecManagerService = {
        getAllAgents: vi.fn(),
      };
    });

    it('should return success result with agents list', async () => {
      const agentsMap = new Map<string, SpecManagerAgentInfo[]>([
        [
          'spec-a',
          [
            {
              agentId: 'agent-1',
              specId: 'spec-a',
              phase: 'impl',
              pid: 1234,
              sessionId: 'session-1',
              status: 'running',
              startedAt: '2026-01-25T10:00:00Z',
              lastActivityAt: '2026-01-25T10:05:00Z',
              command: 'claude -p ...',
            },
          ],
        ],
      ]);
      mockSpecManagerService.getAllAgents.mockResolvedValue(agentsMap);

      // Set specManagerService on handlers
      handlers.setSpecManagerService(mockSpecManagerService as unknown as SpecManagerService);

      const result = await handlers.listAgentsToolHandler({}, '/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');

        // Parse the JSON response
        const data = JSON.parse(result.content[0].text);
        expect(data.agents).toHaveLength(1);
        expect(data.total).toBe(1);
        expect(data.agents[0].agentId).toBe('agent-1');
      }
    });

    it('should return empty agents when none exist', async () => {
      mockSpecManagerService.getAllAgents.mockResolvedValue(new Map());
      handlers.setSpecManagerService(mockSpecManagerService as unknown as SpecManagerService);

      const result = await handlers.listAgentsToolHandler({}, '/path/to/project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        const data = JSON.parse(result.content[0].text);
        expect(data.agents).toHaveLength(0);
        expect(data.total).toBe(0);
      }
    });

    it('should return error if specManagerService is not set', async () => {
      // Create a new instance without specManagerService
      const newHandlers = new ProjectToolHandlers();

      const result = await newHandlers.listAgentsToolHandler({}, '/path/to/project');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('SERVICE_NOT_AVAILABLE');
        expect(result.error.message).toContain('SpecManagerService');
      }
    });
  });

  // ============================================================
  // Task 3.3: Tool Registration Tests for project_list_agents
  // ============================================================

  describe('getListAgentsToolRegistration', () => {
    it('should return valid tool registration for project_list_agents', () => {
      const registration = handlers.getListAgentsToolRegistration();

      expect(registration.name).toBe('project_list_agents');
      expect(registration.description).toContain('agent');
      expect(registration.inputSchema).toBeDefined();
      expect(registration.handler).toBe(handlers.listAgentsToolHandler);
      expect(registration.requiresProject).toBe(true);
    });
  });
});
