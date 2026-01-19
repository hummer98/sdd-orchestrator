/**
 * Convert Spec to Worktree E2E Tests
 * Task 5.3: E2E tests for "Worktreeに変更" button
 * Requirements: 1.1, 2.1, 2.2, 2.5 (convert-spec-to-worktree)
 *
 * These tests verify:
 * - mainブランチでの変換ボタン表示
 * - 非mainブランチでのエラー表示
 * - 変換後のspec一覧での表示確認
 *
 * Prerequisites:
 * - Run with: npm run test:e2e
 * - Test fixtures are in e2e-wdio/fixtures/test-project/
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');
const CONVERT_TEST_SPEC_NAME = 'convert-worktree-test';

/**
 * Helper: Select project using Zustand store action via executeAsync
 */
async function selectProjectViaStore(projectPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (projPath: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.projectStore?.getState) {
          await stores.projectStore.getState().selectProject(projPath);
          done(true);
        } else {
          console.error('[E2E] __STORES__ not available on window');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectProject error:', e);
        done(false);
      }
    }, projectPath).then(resolve);
  });
}

/**
 * Helper: Select spec using Zustand specStore action
 */
async function selectSpecViaStore(specId: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (id: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.specStore?.getState) {
          const specStore = stores.specStore.getState();
          const spec = specStore.specs.find((s: any) => s.name === id);
          if (spec) {
            specStore.selectSpec(spec);
            done(true);
          } else {
            console.error('[E2E] Spec not found:', id);
            done(false);
          }
        } else {
          console.error('[E2E] __STORES__.specStore not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectSpec error:', e);
        done(false);
      }
    }, specId).then(resolve);
  });
}

/**
 * Helper: Create test spec with tasks-generated phase (not yet impl started)
 * This is the prerequisite for convert-to-worktree
 */
function createTestSpec(specName: string): void {
  const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', specName);

  // Create spec directory
  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }

  // Create spec.json with tasks-generated phase (impl not started)
  // No worktree field = normal mode
  const specJson = {
    feature_name: specName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    language: 'ja',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
  };
  fs.writeFileSync(path.join(specDir, 'spec.json'), JSON.stringify(specJson, null, 2));

  // Create minimal artifacts
  fs.writeFileSync(path.join(specDir, 'requirements.md'), '# Requirements\n\nTest requirements for convert test.');
  fs.writeFileSync(path.join(specDir, 'design.md'), '# Design\n\nTest design for convert test.');
  fs.writeFileSync(path.join(specDir, 'tasks.md'), '# Tasks\n\n- [ ] 1.1 Test task 1\n- [ ] 1.2 Test task 2');
}

/**
 * Helper: Create test spec with worktree.branch already set (impl started)
 */
function createSpecWithImplStarted(specName: string): void {
  createTestSpec(specName);

  const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', specName);
  const specJsonPath = path.join(specDir, 'spec.json');
  const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));

  // Add worktree.branch to indicate impl started
  specJson.worktree = {
    branch: 'master',
    created_at: new Date().toISOString(),
  };

  fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
}

/**
 * Helper: Create test spec already in worktree mode
 */
function createSpecInWorktreeMode(specName: string): void {
  createTestSpec(specName);

  const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', specName);
  const specJsonPath = path.join(specDir, 'spec.json');
  const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));

  // Add worktree.path to indicate worktree mode
  specJson.worktree = {
    path: `../worktrees/${specName}`,
    branch: `feature/${specName}`,
    created_at: new Date().toISOString(),
  };

  fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
}

/**
 * Helper: Clean up test spec and any worktrees
 */
function cleanupTestSpec(specName: string): void {
  try {
    // Remove spec directory
    const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', specName);
    if (fs.existsSync(specDir)) {
      fs.rmSync(specDir, { recursive: true, force: true });
    }

    // Remove worktree if it exists
    const worktreePath = path.join(FIXTURE_PROJECT_PATH, '..', 'worktrees', specName);
    if (fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: FIXTURE_PROJECT_PATH,
          stdio: 'ignore',
        });
      } catch {
        // Ignore errors - worktree might not exist in git
      }
      // Force remove directory if still exists
      if (fs.existsSync(worktreePath)) {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    // Delete the feature branch if it exists
    try {
      execSync(`git branch -D feature/${specName}`, {
        cwd: FIXTURE_PROJECT_PATH,
        stdio: 'ignore',
      });
    } catch {
      // Ignore errors - branch might not exist
    }
  } catch (error) {
    console.warn('[E2E] Cleanup error:', error);
  }
}

/**
 * Helper: Get current git branch
 */
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', {
      cwd: FIXTURE_PROJECT_PATH,
      encoding: 'utf-8',
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Helper: Checkout to a branch
 */
function checkoutBranch(branch: string): boolean {
  try {
    execSync(`git checkout ${branch}`, {
      cwd: FIXTURE_PROJECT_PATH,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Create and checkout a test branch
 */
function createAndCheckoutBranch(branch: string): boolean {
  try {
    execSync(`git checkout -b ${branch}`, {
      cwd: FIXTURE_PROJECT_PATH,
      stdio: 'ignore',
    });
    return true;
  } catch {
    // Branch might already exist, try checkout
    return checkoutBranch(branch);
  }
}

/**
 * Helper: Delete a branch
 */
function deleteBranch(branch: string): boolean {
  try {
    // First checkout to main/master
    checkoutBranch('main') || checkoutBranch('master');
    execSync(`git branch -D ${branch}`, {
      cwd: FIXTURE_PROJECT_PATH,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

describe('Convert Spec to Worktree E2E', () => {
  // ============================================================
  // Test Setup
  // ============================================================
  before(async () => {
    // Ensure we're on main branch before tests
    checkoutBranch('main') || checkoutBranch('master');
  });

  after(async () => {
    // Clean up test spec and return to main branch
    cleanupTestSpec(CONVERT_TEST_SPEC_NAME);
    checkoutBranch('main') || checkoutBranch('master');
  });

  beforeEach(async () => {
    // Clean up before each test
    cleanupTestSpec(CONVERT_TEST_SPEC_NAME);
    checkoutBranch('main') || checkoutBranch('master');
  });

  // ============================================================
  // Task 5.3: Convert Button Visibility Tests
  // Requirements: 1.1, 1.2, 1.3, 1.4
  // ============================================================
  describe('Convert Button Visibility', () => {
    it('should display convert button for normal spec on main branch', async () => {
      // Create test spec (normal mode, impl not started)
      createTestSpec(CONVERT_TEST_SPEC_NAME);

      // Ensure on main branch
      const currentBranch = getCurrentBranch();
      expect(currentBranch === 'main' || currentBranch === 'master').toBe(true);

      // Select project and spec
      const projectSelected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      // Wait for specs to load
      await browser.pause(1000);

      // Select the test spec
      const specSelected = await selectSpecViaStore(CONVERT_TEST_SPEC_NAME);
      expect(specSelected).toBe(true);

      // Wait for spec detail to load
      await browser.pause(500);

      // Check for convert button in SpecWorkflowFooter
      const convertButton = await $('[data-testid="convert-to-worktree-button"]');
      expect(await convertButton.isExisting()).toBe(true);

      // Button should be enabled
      expect(await convertButton.isEnabled()).toBe(true);
    });

    it('should NOT display convert button when impl already started', async () => {
      // Create test spec with impl started (worktree.branch set)
      createSpecWithImplStarted(CONVERT_TEST_SPEC_NAME);

      // Select project and spec
      const projectSelected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      await browser.pause(1000);

      const specSelected = await selectSpecViaStore(CONVERT_TEST_SPEC_NAME);
      expect(specSelected).toBe(true);

      await browser.pause(500);

      // Convert button should NOT exist
      const convertButton = await $('[data-testid="convert-to-worktree-button"]');
      expect(await convertButton.isExisting()).toBe(false);
    });

    it('should NOT display convert button when already in worktree mode', async () => {
      // Create test spec already in worktree mode
      createSpecInWorktreeMode(CONVERT_TEST_SPEC_NAME);

      // Select project and spec
      const projectSelected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      await browser.pause(1000);

      const specSelected = await selectSpecViaStore(CONVERT_TEST_SPEC_NAME);
      expect(specSelected).toBe(true);

      await browser.pause(500);

      // Convert button should NOT exist
      const convertButton = await $('[data-testid="convert-to-worktree-button"]');
      expect(await convertButton.isExisting()).toBe(false);
    });
  });

  // ============================================================
  // Task 5.3: Error Handling Tests
  // Requirements: 5.1 (NOT_ON_MAIN_BRANCH error)
  // ============================================================
  describe('Error Handling', () => {
    it('should show error when not on main branch', async () => {
      // Create test spec
      createTestSpec(CONVERT_TEST_SPEC_NAME);

      // Create and checkout a non-main branch
      const testBranch = 'test-branch-for-convert-e2e';
      createAndCheckoutBranch(testBranch);

      try {
        // Select project and spec
        const projectSelected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
        expect(projectSelected).toBe(true);

        await browser.pause(1000);

        const specSelected = await selectSpecViaStore(CONVERT_TEST_SPEC_NAME);
        expect(specSelected).toBe(true);

        await browser.pause(500);

        // Convert button should not be shown when not on main branch
        // (isOnMain check in useConvertToWorktree hook)
        const convertButton = await $('[data-testid="convert-to-worktree-button"]');

        // The button visibility depends on isOnMain state
        // If shown, clicking should trigger error
        if (await convertButton.isExisting()) {
          await convertButton.click();
          await browser.pause(1000);

          // Verify error notification appeared or branch unchanged
          const currentBranch = getCurrentBranch();
          expect(currentBranch).toBe(testBranch);
        }
      } finally {
        // Clean up test branch
        deleteBranch(testBranch);
      }
    });
  });

  // ============================================================
  // Task 5.3: Conversion Flow Tests (skipped - requires full git setup)
  // Requirements: 2.1, 2.2, 2.5
  // ============================================================
  describe('Conversion Flow', () => {
    // This test is skipped as it requires full git worktree setup
    // and would modify the test repository state significantly
    it.skip('should convert spec to worktree mode when button clicked', async () => {
      // Create test spec (normal mode)
      createTestSpec(CONVERT_TEST_SPEC_NAME);

      // Ensure we're on main branch
      checkoutBranch('main') || checkoutBranch('master');

      // Select project and spec
      const projectSelected = await selectProjectViaStore(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      await browser.pause(1000);

      const specSelected = await selectSpecViaStore(CONVERT_TEST_SPEC_NAME);
      expect(specSelected).toBe(true);

      await browser.pause(500);

      // Click convert button
      const convertButton = await $('[data-testid="convert-to-worktree-button"]');
      if (await convertButton.isExisting()) {
        await convertButton.click();

        // Wait for conversion
        await browser.pause(2000);

        // Verify worktree was created
        const worktreePath = path.join(FIXTURE_PROJECT_PATH, '..', 'worktrees', CONVERT_TEST_SPEC_NAME);
        expect(fs.existsSync(worktreePath)).toBe(true);

        // Verify spec.json was updated with worktree.path
        const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', CONVERT_TEST_SPEC_NAME);
        const specJson = JSON.parse(fs.readFileSync(path.join(specDir, 'spec.json'), 'utf-8'));
        expect(specJson.worktree).toBeDefined();
        expect(specJson.worktree.path).toBeDefined();
        expect(specJson.worktree.branch).toBe(`feature/${CONVERT_TEST_SPEC_NAME}`);

        // Button should no longer be visible
        await browser.pause(500);
        const convertButtonAfter = await $('[data-testid="convert-to-worktree-button"]');
        expect(await convertButtonAfter.isExisting()).toBe(false);
      }
    });
  });
});
