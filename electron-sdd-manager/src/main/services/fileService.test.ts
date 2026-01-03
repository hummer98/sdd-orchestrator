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
