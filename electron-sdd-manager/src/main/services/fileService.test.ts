/**
 * FileService Unit Tests
 * TDD: Testing path validation, directory traversal prevention, spec operations
 * Requirements: 13.4, 13.5, 3.3-3.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FileService, validatePath, isPathSafe } from './fileService';
import type { SpecPhase } from '../../renderer/types';

describe('Path Validation', () => {
  describe('isPathSafe', () => {
    it('should allow paths within base directory', () => {
      expect(isPathSafe('/Users/test/project', '/Users/test/project/.kiro')).toBe(true);
      expect(isPathSafe('/Users/test/project', '/Users/test/project/src/file.ts')).toBe(true);
    });

    it('should reject paths outside base directory', () => {
      expect(isPathSafe('/Users/test/project', '/Users/test/other')).toBe(false);
      expect(isPathSafe('/Users/test/project', '/etc/passwd')).toBe(false);
    });

    it('should reject directory traversal attempts', () => {
      expect(isPathSafe('/Users/test/project', '/Users/test/project/../other')).toBe(false);
      expect(isPathSafe('/Users/test/project', '/Users/test/project/../../etc/passwd')).toBe(false);
    });

    it('should handle normalized paths correctly', () => {
      // Even though the path looks valid before normalization
      expect(isPathSafe('/Users/test/project', '/Users/test/project/./safe')).toBe(true);
    });
  });

  describe('validatePath', () => {
    it('should return ok for valid paths', () => {
      const result = validatePath('/Users/test/project', '/Users/test/project/.kiro');
      expect(result.ok).toBe(true);
    });

    it('should return error for invalid paths', () => {
      const result = validatePath('/Users/test/project', '/etc/passwd');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PATH');
      }
    });

    it('should return error for directory traversal', () => {
      const result = validatePath('/Users/test/project', '/Users/test/project/../../../etc/passwd');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PATH');
        if ('reason' in result.error) {
          expect(result.error.reason).toContain('traversal');
        }
      }
    });
  });
});

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    fileService = new FileService();
  });

  describe('validateKiroDirectory', () => {
    it('should return validation result with exists flag', async () => {
      // This test uses the actual file system
      // In real scenarios, mock fs/promises
      const result = await fileService.validateKiroDirectory('/nonexistent/path');
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('hasSpecs');
      expect(result).toHaveProperty('hasSteering');
    });
  });

  describe('spec name validation', () => {
    it('should validate spec names correctly', () => {
      // Valid names
      expect(fileService.isValidSpecName('my-feature')).toBe(true);
      expect(fileService.isValidSpecName('feature123')).toBe(true);
      expect(fileService.isValidSpecName('test-spec-name')).toBe(true);

      // Invalid names
      expect(fileService.isValidSpecName('MyFeature')).toBe(false); // uppercase
      expect(fileService.isValidSpecName('my_feature')).toBe(false); // underscore
      expect(fileService.isValidSpecName('my feature')).toBe(false); // space
      expect(fileService.isValidSpecName('../hack')).toBe(false); // directory traversal
      expect(fileService.isValidSpecName('')).toBe(false); // empty
    });
  });
});

describe('FileService - updateSpecJsonFromPhase', () => {
  let fileService: FileService;
  let tempDir: string;
  let specPath: string;

  beforeEach(async () => {
    fileService = new FileService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fileservice-test-'));
    specPath = path.join(tempDir, '.kiro', 'specs', 'test-feature');
    await fs.mkdir(specPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a spec.json
   */
  async function createSpecJson(phase: SpecPhase, approvals: { requirements: { generated: boolean; approved: boolean }; design: { generated: boolean; approved: boolean }; tasks: { generated: boolean; approved: boolean } }): Promise<void> {
    const specJson = {
      feature_name: 'test-feature',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      language: 'ja',
      phase,
      approvals,
    };
    await fs.writeFile(path.join(specPath, 'spec.json'), JSON.stringify(specJson, null, 2), 'utf-8');
  }

  /**
   * Helper to read spec.json
   */
  async function readSpecJson(): Promise<{ phase: SpecPhase; approvals: { requirements: { generated: boolean }; design: { generated: boolean }; tasks: { generated: boolean } }; updated_at: string }> {
    const content = await fs.readFile(path.join(specPath, 'spec.json'), 'utf-8');
    return JSON.parse(content);
  }

  describe('updateSpecJsonFromPhase', () => {
    it('should update phase from initialized to requirements-generated', async () => {
      await createSpecJson('initialized', {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'requirements');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('requirements-generated');
      expect(specJson.approvals.requirements.generated).toBe(true);
    });

    it('should update phase from requirements-generated to design-generated', async () => {
      await createSpecJson('requirements-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'design');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('design-generated');
      expect(specJson.approvals.design.generated).toBe(true);
    });

    it('should update phase from design-generated to tasks-generated', async () => {
      await createSpecJson('design-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: false, approved: false },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'tasks');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('tasks-generated');
      expect(specJson.approvals.tasks.generated).toBe(true);
    });

    it('should update updated_at timestamp', async () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      await createSpecJson('initialized', {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      });

      await fileService.updateSpecJsonFromPhase(specPath, 'requirements');

      const specJson = await readSpecJson();
      expect(specJson.updated_at).not.toBe(oldTimestamp);
    });

    it('should return error for non-existent spec', async () => {
      const result = await fileService.updateSpecJsonFromPhase('/nonexistent/path', 'requirements');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should keep phase unchanged for impl (no-op)', async () => {
      await createSpecJson('tasks-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'impl');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      // impl case is now a no-op, phase stays as tasks-generated
      expect(specJson.phase).toBe('tasks-generated');
    });

    it('should update phase to implementation-complete for impl-complete', async () => {
      await createSpecJson('tasks-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'impl-complete');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('implementation-complete');
    });

    it('should NOT update updated_at when skipTimestamp is true', async () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      await createSpecJson('tasks-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'impl-complete', { skipTimestamp: true });

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('implementation-complete');
      expect(specJson.updated_at).toBe(oldTimestamp);
    });

    it('should update updated_at when skipTimestamp is false', async () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      await createSpecJson('tasks-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'impl-complete', { skipTimestamp: false });

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('implementation-complete');
      expect(specJson.updated_at).not.toBe(oldTimestamp);
    });

    it('should update updated_at when options is undefined (default behavior)', async () => {
      const oldTimestamp = '2025-01-01T00:00:00.000Z';
      await createSpecJson('tasks-generated', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'impl-complete');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('implementation-complete');
      expect(specJson.updated_at).not.toBe(oldTimestamp);
    });

    // ============================================================
    // spec-phase-auto-update Task 1.2, Task 3: CompletedPhase型の拡張
    // Requirements: 1.3, 2.1, 3.1
    // ============================================================

    it('should update phase to inspection-complete', async () => {
      await createSpecJson('implementation-complete', {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'inspection-complete');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('inspection-complete');
    });

    it('should update phase to deploy-complete', async () => {
      await createSpecJson('inspection-complete' as SpecPhase, {
        requirements: { generated: true, approved: true },
        design: { generated: true, approved: true },
        tasks: { generated: true, approved: true },
      });

      const result = await fileService.updateSpecJsonFromPhase(specPath, 'deploy-complete');

      expect(result.ok).toBe(true);

      const specJson = await readSpecJson();
      expect(specJson.phase).toBe('deploy-complete');
    });
  });

  // ============================================================
  // spec-phase-auto-update Task 4: フェーズ遷移検証
  // Requirements: 3.2
  // ============================================================
  describe('validatePhaseTransition', () => {
    it('should allow transition from implementation-complete to inspection-complete', () => {
      const result = fileService.validatePhaseTransition('implementation-complete', 'inspection-complete');
      expect(result.ok).toBe(true);
    });

    it('should allow transition from inspection-complete to deploy-complete', () => {
      const result = fileService.validatePhaseTransition('inspection-complete', 'deploy-complete');
      expect(result.ok).toBe(true);
    });

    it('should NOT allow transition from tasks-generated to inspection-complete', () => {
      const result = fileService.validatePhaseTransition('tasks-generated', 'inspection-complete');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_TRANSITION');
      }
    });

    it('should NOT allow transition from implementation-complete to deploy-complete (skip inspection)', () => {
      const result = fileService.validatePhaseTransition('implementation-complete', 'deploy-complete');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_TRANSITION');
      }
    });

    it('should allow any transition to same phase (no-op)', () => {
      const result = fileService.validatePhaseTransition('inspection-complete', 'inspection-complete');
      expect(result.ok).toBe(true);
    });

    it('should allow backward transition (for reset scenarios)', () => {
      // Backward transitions should be allowed for reset/rollback scenarios
      const result = fileService.validatePhaseTransition('deploy-complete', 'inspection-complete');
      expect(result.ok).toBe(true);
    });
  });
});

// spec-worktree-early-creation: Tests for readSpecs with worktree support
describe('FileService - readSpecs (worktree support)', () => {
  let fileService: FileService;
  let tempDir: string;

  beforeEach(async () => {
    fileService = new FileService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'readspecs-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a spec
   */
  async function createSpec(specPath: string): Promise<void> {
    await fs.mkdir(specPath, { recursive: true });
    await fs.writeFile(
      path.join(specPath, 'spec.json'),
      JSON.stringify({ feature_name: path.basename(specPath), phase: 'initialized' }, null, 2),
      'utf-8'
    );
  }

  it('should read specs from main .kiro/specs directory', async () => {
    const mainSpecPath = path.join(tempDir, '.kiro', 'specs', 'main-feature');
    await createSpec(mainSpecPath);

    const result = await fileService.readSpecs(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe('main-feature');
      // spec-path-ssot-refactor: SpecMetadata no longer contains path
      // Path resolution is now done via resolveSpecPath when needed
    }
  });

  it('should read specs from worktree directory', async () => {
    const worktreeSpecPath = path.join(
      tempDir,
      '.kiro',
      'worktrees',
      'specs',
      'worktree-feature',
      '.kiro',
      'specs',
      'worktree-feature'
    );
    await createSpec(worktreeSpecPath);

    const result = await fileService.readSpecs(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe('worktree-feature');
      // spec-path-ssot-refactor: SpecMetadata no longer contains path
      // Path resolution is now done via resolveSpecPath when needed
    }
  });

  it('should read both main and worktree specs', async () => {
    // Create main spec
    const mainSpecPath = path.join(tempDir, '.kiro', 'specs', 'main-feature');
    await createSpec(mainSpecPath);

    // Create worktree spec
    const worktreeSpecPath = path.join(
      tempDir,
      '.kiro',
      'worktrees',
      'specs',
      'worktree-feature',
      '.kiro',
      'specs',
      'worktree-feature'
    );
    await createSpec(worktreeSpecPath);

    const result = await fileService.readSpecs(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      const names = result.value.map((s) => s.name);
      expect(names).toContain('main-feature');
      expect(names).toContain('worktree-feature');
    }
  });

  it('should prioritize main spec over worktree spec with same name', async () => {
    const specName = 'duplicate-feature';

    // Create main spec
    const mainSpecPath = path.join(tempDir, '.kiro', 'specs', specName);
    await createSpec(mainSpecPath);

    // Create worktree spec with same name
    const worktreeSpecPath = path.join(
      tempDir,
      '.kiro',
      'worktrees',
      'specs',
      specName,
      '.kiro',
      'specs',
      specName
    );
    await createSpec(worktreeSpecPath);

    const result = await fileService.readSpecs(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Should only have one spec (main takes priority)
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe(specName);
      // spec-path-ssot-refactor: Path field removed from SpecMetadata
      // Use resolveSpecPath to verify which location takes priority if needed
    }
  });

  it('should return empty array when no specs directory exists', async () => {
    const result = await fileService.readSpecs(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('should skip specs without spec.json', async () => {
    // Create directory without spec.json
    const invalidSpecPath = path.join(tempDir, '.kiro', 'specs', 'invalid-feature');
    await fs.mkdir(invalidSpecPath, { recursive: true });

    // Create valid spec
    const validSpecPath = path.join(tempDir, '.kiro', 'specs', 'valid-feature');
    await createSpec(validSpecPath);

    const result = await fileService.readSpecs(tempDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe('valid-feature');
    }
  });
});

// ============================================================
// spec-path-ssot-refactor Task 1.1, 1.2, 1.3: resolveEntityPath tests
// Requirements: 1.1, 1.2, 1.3, 1.4
// ============================================================
describe('FileService - resolveEntityPath', () => {
  let fileService: FileService;
  let tempDir: string;

  beforeEach(async () => {
    fileService = new FileService();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'resolve-entity-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a main entity directory with spec.json/bug.json
   */
  async function createMainEntity(
    entityType: 'specs' | 'bugs',
    entityName: string
  ): Promise<string> {
    const entityPath = path.join(tempDir, '.kiro', entityType, entityName);
    await fs.mkdir(entityPath, { recursive: true });
    const jsonFile = entityType === 'specs' ? 'spec.json' : 'bug.json';
    await fs.writeFile(
      path.join(entityPath, jsonFile),
      JSON.stringify({ feature_name: entityName }, null, 2),
      'utf-8'
    );
    return entityPath;
  }

  /**
   * Helper to create a worktree entity directory
   */
  async function createWorktreeEntity(
    entityType: 'specs' | 'bugs',
    entityName: string
  ): Promise<string> {
    // Worktree path: .kiro/worktrees/{entityType}/{entityName}/.kiro/{entityType}/{entityName}/
    const entityPath = path.join(
      tempDir,
      '.kiro',
      'worktrees',
      entityType,
      entityName,
      '.kiro',
      entityType,
      entityName
    );
    await fs.mkdir(entityPath, { recursive: true });
    const jsonFile = entityType === 'specs' ? 'spec.json' : 'bug.json';
    await fs.writeFile(
      path.join(entityPath, jsonFile),
      JSON.stringify({ feature_name: entityName }, null, 2),
      'utf-8'
    );
    return entityPath;
  }

  describe('resolveEntityPath', () => {
    it('should resolve main spec path when only main exists', async () => {
      const expectedPath = await createMainEntity('specs', 'my-feature');

      const result = await fileService.resolveEntityPath(tempDir, 'specs', 'my-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedPath);
      }
    });

    it('should resolve main bug path when only main exists', async () => {
      const expectedPath = await createMainEntity('bugs', 'my-bug');

      const result = await fileService.resolveEntityPath(tempDir, 'bugs', 'my-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedPath);
      }
    });

    it('should resolve worktree spec path when only worktree exists', async () => {
      const expectedPath = await createWorktreeEntity('specs', 'worktree-feature');

      const result = await fileService.resolveEntityPath(tempDir, 'specs', 'worktree-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedPath);
      }
    });

    it('should resolve worktree bug path when only worktree exists', async () => {
      const expectedPath = await createWorktreeEntity('bugs', 'worktree-bug');

      const result = await fileService.resolveEntityPath(tempDir, 'bugs', 'worktree-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedPath);
      }
    });

    it('should prioritize worktree over main when both exist (worktree > main)', async () => {
      // Create both main and worktree
      await createMainEntity('specs', 'dual-feature');
      const worktreePath = await createWorktreeEntity('specs', 'dual-feature');

      const result = await fileService.resolveEntityPath(tempDir, 'specs', 'dual-feature');

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should return worktree path (priority: worktree > main)
        expect(result.value).toBe(worktreePath);
      }
    });

    it('should return NOT_FOUND error when neither main nor worktree exists', async () => {
      const result = await fileService.resolveEntityPath(tempDir, 'specs', 'non-existent');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });

    it('should return INVALID_PATH error for invalid entity name', async () => {
      // Invalid name with uppercase
      const result = await fileService.resolveEntityPath(tempDir, 'specs', 'InvalidName');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PATH');
      }
    });

    it('should return INVALID_PATH error for empty entity name', async () => {
      const result = await fileService.resolveEntityPath(tempDir, 'specs', '');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_PATH');
      }
    });
  });

  describe('resolveSpecPath (convenience wrapper)', () => {
    it('should resolve spec path using resolveEntityPath internally', async () => {
      const expectedPath = await createMainEntity('specs', 'convenience-spec');

      const result = await fileService.resolveSpecPath(tempDir, 'convenience-spec');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedPath);
      }
    });
  });

  describe('resolveBugPath (convenience wrapper)', () => {
    it('should resolve bug path using resolveEntityPath internally', async () => {
      const expectedPath = await createMainEntity('bugs', 'convenience-bug');

      const result = await fileService.resolveBugPath(tempDir, 'convenience-bug');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(expectedPath);
      }
    });
  });
});
