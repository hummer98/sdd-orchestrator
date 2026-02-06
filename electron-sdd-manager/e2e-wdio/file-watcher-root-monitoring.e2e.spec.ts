/**
 * File Watcher Root Monitoring E2E Tests
 * Requirements: 7.3
 *
 * テスト内容:
 * - ルート監視方式でのファイル変更検知
 * - Worktree内部ファイルの即座検知（500ms待機なし）
 * - spec.jsonのupdated_at更新確認
 * - 除外パターンの動作確認
 *
 * Note: このテストは新しいルート監視方式の動作を検証します
 */

import * as path from 'path';
import * as fs from 'fs';
import { ensureProjectSelected } from './helpers/auto-execution.helpers';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/test-project');
const SPECS_DIR = path.join(FIXTURE_PATH, '.kiro/specs');
const WORKTREES_SPECS_DIR = path.join(FIXTURE_PATH, '.kiro/worktrees/specs');

/**
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 200,
  debugLabel: string = 'condition'
): Promise<boolean> {
  const startTime = Date.now();
  let iteration = 0;
  while (Date.now() - startTime < timeout) {
    iteration++;
    const result = await condition();
    if (result) {
      console.log(`[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`);
      return true;
    }
    await browser.pause(interval);
  }
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations`);
  return false;
}

/**
 * Helper: Create Spec directory with spec.json
 */
function createSpecDirectory(specId: string, isWorktree: boolean = false): string {
  let specDir: string;
  if (isWorktree) {
    const worktreeDir = path.join(WORKTREES_SPECS_DIR, specId);
    specDir = path.join(worktreeDir, '.kiro/specs', specId);
  } else {
    specDir = path.join(SPECS_DIR, specId);
  }

  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }

  const specJsonPath = path.join(specDir, 'spec.json');
  const specJson = {
    feature_name: specId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    language: 'ja',
    phase: 'spec-init',
    approvals: {
      requirements: { generated: false, approved: false },
      design: { generated: false, approved: false },
      tasks: { generated: false, approved: false },
    },
  };

  if (isWorktree) {
    specJson['worktree'] = {
      path: `.kiro/worktrees/specs/${specId}`,
      branch: `feature/${specId}`,
      created_at: new Date().toISOString(),
      enabled: true,
    };
  }

  fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
  return specDir;
}

/**
 * Helper: Delete Spec directory
 */
function deleteSpecDirectory(specId: string, isWorktree: boolean = false): void {
  try {
    if (isWorktree) {
      const worktreeDir = path.join(WORKTREES_SPECS_DIR, specId);
      if (fs.existsSync(worktreeDir)) {
        fs.rmSync(worktreeDir, { recursive: true, force: true });
      }
    } else {
      const specDir = path.join(SPECS_DIR, specId);
      if (fs.existsSync(specDir)) {
        fs.rmSync(specDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.warn(`[E2E] Failed to delete spec directory for ${specId}:`, error);
  }
}

/**
 * Helper: Read spec.json and return updated_at
 */
function getSpecUpdatedAt(specDir: string): string | null {
  try {
    const specJsonPath = path.join(specDir, 'spec.json');
    const content = fs.readFileSync(specJsonPath, 'utf-8');
    const spec = JSON.parse(content);
    return spec.updated_at;
  } catch {
    return null;
  }
}

/**
 * Cleanup: Remove test spec directories
 */
function cleanupTestSpecs(): void {
  const testSpecIds = [
    'test-watcher-worktree',
    'test-watcher-normal',
    'test-watcher-exclude',
  ];
  for (const specId of testSpecIds) {
    deleteSpecDirectory(specId, true);
    deleteSpecDirectory(specId, false);
  }
}

describe('File Watcher Root Monitoring E2E', () => {
  before(async () => {
    // Cleanup any existing test specs
    cleanupTestSpecs();

    // Select project
    const success = await ensureProjectSelected(FIXTURE_PATH);
    if (!success) {
      console.warn('[E2E] Failed to select project, some tests may fail');
    }
    await browser.pause(500);
  });

  after(async () => {
    // Final cleanup
    cleanupTestSpecs();
  });

  // ============================================================
  // Worktree内部ファイルの即座検知
  // Requirements: 7.3
  // ============================================================
  describe('Worktree内部ファイルの即座検知', () => {
    const specId = 'test-watcher-worktree';
    let specDir: string;

    before(async () => {
      // Create Worktree spec directory
      specDir = createSpecDirectory(specId, true);
    });

    after(async () => {
      // Cleanup
      deleteSpecDirectory(specId, true);
    });

    it('Worktree内部にアーティファクトファイルを追加すると、3秒以内にspec.jsonが更新される', async () => {
      // Get initial updated_at
      const initialUpdatedAt = getSpecUpdatedAt(specDir);
      expect(initialUpdatedAt).not.toBeNull();

      // Create requirements.md (artifact file)
      const requirementsPath = path.join(specDir, 'requirements.md');
      fs.writeFileSync(requirementsPath, '# Requirements\n\n## Test Requirement\n');

      // Wait for spec.json updated_at to change (timeout: 3 seconds)
      const result = await waitForCondition(
        async () => {
          const currentUpdatedAt = getSpecUpdatedAt(specDir);
          return currentUpdatedAt !== null && currentUpdatedAt !== initialUpdatedAt;
        },
        3000,
        200,
        'Worktree spec.json updated_at change'
      );

      expect(result).toBe(true);
    });

    it('複数のアーティファクト（design.md, tasks.md）も検知される', async () => {
      // Get initial updated_at
      let initialUpdatedAt = getSpecUpdatedAt(specDir);
      expect(initialUpdatedAt).not.toBeNull();

      // Create design.md
      const designPath = path.join(specDir, 'design.md');
      fs.writeFileSync(designPath, '# Design\n\n## Architecture\n');

      // Wait for spec.json updated_at to change
      let result = await waitForCondition(
        async () => {
          const currentUpdatedAt = getSpecUpdatedAt(specDir);
          return currentUpdatedAt !== null && currentUpdatedAt !== initialUpdatedAt;
        },
        3000,
        200,
        'design.md detection'
      );

      expect(result).toBe(true);

      // Update initialUpdatedAt
      initialUpdatedAt = getSpecUpdatedAt(specDir);

      // Create tasks.md
      const tasksPath = path.join(specDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '# Tasks\n\n- [ ] Task 1\n');

      // Wait for spec.json updated_at to change
      result = await waitForCondition(
        async () => {
          const currentUpdatedAt = getSpecUpdatedAt(specDir);
          return currentUpdatedAt !== null && currentUpdatedAt !== initialUpdatedAt;
        },
        3000,
        200,
        'tasks.md detection'
      );

      expect(result).toBe(true);
    });
  });

  // ============================================================
  // 除外パターンの動作確認
  // Requirements: 7.3
  // ============================================================
  describe('除外パターンの動作確認', () => {
    const specId = 'test-watcher-exclude';
    let specDir: string;

    before(async () => {
      // Create Worktree spec directory
      specDir = createSpecDirectory(specId, true);
    });

    after(async () => {
      // Cleanup
      deleteSpecDirectory(specId, true);
    });

    it('除外パターン（.logファイル）は無視される', async () => {
      // Get initial updated_at
      const initialUpdatedAt = getSpecUpdatedAt(specDir);
      expect(initialUpdatedAt).not.toBeNull();

      // Create .log file (excluded pattern)
      const logFilePath = path.join(specDir, 'test.log');
      fs.writeFileSync(logFilePath, 'Log entry\n');

      // Wait 1 second
      await browser.pause(1000);

      // Verify spec.json updated_at has NOT changed
      const currentUpdatedAt = getSpecUpdatedAt(specDir);
      expect(currentUpdatedAt).toBe(initialUpdatedAt);
    });

    it('除外パターン（runtime/配下）は無視される', async () => {
      // Get initial updated_at
      const initialUpdatedAt = getSpecUpdatedAt(specDir);
      expect(initialUpdatedAt).not.toBeNull();

      // Create runtime/ directory and file
      const runtimeDir = path.join(specDir, 'runtime');
      fs.mkdirSync(runtimeDir, { recursive: true });
      const runtimeFilePath = path.join(runtimeDir, 'test.json');
      fs.writeFileSync(runtimeFilePath, '{"test": true}\n');

      // Wait 1 second
      await browser.pause(1000);

      // Verify spec.json updated_at has NOT changed
      const currentUpdatedAt = getSpecUpdatedAt(specDir);
      expect(currentUpdatedAt).toBe(initialUpdatedAt);
    });
  });

  // ============================================================
  // 通常パス（非Worktree）のファイル監視
  // Requirements: 7.3
  // ============================================================
  describe('通常パス（非Worktree）のファイル監視', () => {
    const specId = 'test-watcher-normal';
    let specDir: string;

    before(async () => {
      // Create normal spec directory
      specDir = createSpecDirectory(specId, false);
    });

    after(async () => {
      // Cleanup
      deleteSpecDirectory(specId, false);
    });

    it('.kiro/specs/配下のアーティファクトファイル変更も検知される', async () => {
      // Get initial updated_at
      const initialUpdatedAt = getSpecUpdatedAt(specDir);
      expect(initialUpdatedAt).not.toBeNull();

      // Create requirements.md (artifact file)
      const requirementsPath = path.join(specDir, 'requirements.md');
      fs.writeFileSync(requirementsPath, '# Requirements\n\n## Normal Path Test\n');

      // Wait for spec.json updated_at to change (timeout: 3 seconds)
      const result = await waitForCondition(
        async () => {
          const currentUpdatedAt = getSpecUpdatedAt(specDir);
          return currentUpdatedAt !== null && currentUpdatedAt !== initialUpdatedAt;
        },
        3000,
        200,
        'Normal path spec.json updated_at change'
      );

      expect(result).toBe(true);
    });
  });
});
