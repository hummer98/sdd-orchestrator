/**
 * Impl Start Worktree E2E Tests
 * Task 15.2: E2E tests for worktree mode in ImplPhasePanel
 *
 * Current implementation:
 * - Single impl-execute-button (data-testid="impl-execute-button")
 * - Worktree mode indicated by violet color and git-branch icon
 * - Normal mode indicated by blue color and play icon
 * - "Worktreeに変更" button in SpecWorkflowFooter (data-testid="convert-to-worktree-button")
 *
 * These tests verify:
 * - ImplPhasePanel表示とモード別スタイリング
 * - 非mainブランチでのconvert-to-worktreeボタン非表示
 *
 * Prerequisites:
 * - Run with: npm run test:e2e
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
 * - Test fixtures are in e2e-wdio/fixtures/test-project/
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { ensureProjectSelected, selectSpecViaUI } from './helpers/auto-execution.helpers';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PROJECT_PATH = path.resolve(__dirname, 'fixtures/test-project');
const WORKTREE_SPEC_NAME = 'worktree-test-feature';

/**
 * Helper: Create test spec with approved tasks phase
 */
function createTestSpec(specName: string): void {
  const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', specName);

  // Create spec directory
  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }

  // Create spec.json with tasks-generated phase (all approved + document review approved)
  const specJson = {
    feature_name: specName,
    name: specName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    language: 'ja',
    phase: 'tasks-generated',
    approvals: {
      requirements: { generated: true, approved: true },
      design: { generated: true, approved: true },
      tasks: { generated: true, approved: true },
    },
    documentReview: {
      status: 'approved',
      currentRound: 1,
      roundDetails: [
        {
          roundNumber: 1,
          status: 'reply_complete',
          fixRequired: 0,
          needsDiscussion: 0,
          fixStatus: 'not_required',
        },
      ],
    },
  };
  fs.writeFileSync(path.join(specDir, 'spec.json'), JSON.stringify(specJson, null, 2));

  // Create minimal artifacts
  fs.writeFileSync(path.join(specDir, 'requirements.md'), '# Requirements\n\nTest requirements.');
  fs.writeFileSync(path.join(specDir, 'design.md'), '# Design\n\nTest design.');
  fs.writeFileSync(path.join(specDir, 'tasks.md'), '# Tasks\n\n- [ ] 1.1 Test task 1\n- [ ] 1.2 Test task 2');
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

describe('Impl Start Worktree E2E', () => {
  // ============================================================
  // Test Setup
  // ============================================================
  before(async () => {
    // Ensure we're on main branch before tests
    checkoutBranch('main') || checkoutBranch('master');
  });

  after(async () => {
    // Clean up test spec and return to main branch
    cleanupTestSpec(WORKTREE_SPEC_NAME);
    checkoutBranch('main') || checkoutBranch('master');
  });

  beforeEach(async () => {
    // Clean up before each test
    cleanupTestSpec(WORKTREE_SPEC_NAME);
    checkoutBranch('main') || checkoutBranch('master');
  });

  // ============================================================
  // Task 15.2: ImplPhasePanel UI Tests
  // Current implementation: Single impl-execute-button with
  // worktree mode indicated by color (violet) and icon (git-branch)
  // ============================================================
  describe('ImplPhasePanel UI', () => {
    it('should display impl execute button with normal mode styling when no worktree exists', async () => {
      // Create test spec
      createTestSpec(WORKTREE_SPEC_NAME);

      // Select project and spec
      const projectSelected = await ensureProjectSelected(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      // Wait for specs to load
      await browser.pause(1000);

      // Select the test spec
      const specSelected = await selectSpecViaUI(WORKTREE_SPEC_NAME);
      expect(specSelected).toBe(true);

      // Wait for spec detail to load
      await browser.pause(500);

      // Check for impl phase panel and execute button
      const implPhasePanel = await $('[data-testid="impl-phase-panel"]');
      expect(await implPhasePanel.isExisting()).toBe(true);

      const executeButton = await $('[data-testid="impl-execute-button"]');
      expect(await executeButton.isExisting()).toBe(true);

      // Normal mode: should show play icon (not git-branch icon)
      const playIcon = await executeButton.$('[data-testid="icon-play"]');
      const gitBranchIcon = await executeButton.$('[data-testid="icon-git-branch"]');

      console.log(`[E2E] play icon exists: ${await playIcon.isExisting()}`);
      console.log(`[E2E] git-branch icon exists: ${await gitBranchIcon.isExisting()}`);

      expect(await playIcon.isExisting()).toBe(true);
      expect(await gitBranchIcon.isExisting()).toBe(false);
    });

    it('should display worktree mode styling when worktree exists in spec.json', async () => {
      // Create test spec with worktree field
      createTestSpec(WORKTREE_SPEC_NAME);

      // Add worktree field to spec.json
      const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', WORKTREE_SPEC_NAME);
      const specJsonPath = path.join(specDir, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      specJson.worktree = {
        path: `../worktrees/${WORKTREE_SPEC_NAME}`,
        branch: `feature/${WORKTREE_SPEC_NAME}`,
        created_at: new Date().toISOString(),
      };
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));

      // Select project and spec
      const projectSelected = await ensureProjectSelected(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      await browser.pause(1000);

      const specSelected = await selectSpecViaUI(WORKTREE_SPEC_NAME);
      expect(specSelected).toBe(true);

      await browser.pause(500);

      // Single execute button exists (no separate current-branch/worktree buttons)
      const executeButton = await $('[data-testid="impl-execute-button"]');
      expect(await executeButton.isExisting()).toBe(true);

      // Worktree mode: should show git-branch icon (not play icon)
      const gitBranchIcon = await executeButton.$('[data-testid="icon-git-branch"]');
      const playIcon = await executeButton.$('[data-testid="icon-play"]');

      console.log(`[E2E] git-branch icon exists: ${await gitBranchIcon.isExisting()}`);
      console.log(`[E2E] play icon exists: ${await playIcon.isExisting()}`);

      expect(await gitBranchIcon.isExisting()).toBe(true);
      expect(await playIcon.isExisting()).toBe(false);
    });
  });

  // ============================================================
  // Task 15.2: Convert to Worktree flow tests
  // Current implementation: "Worktreeに変更" button in SpecWorkflowFooter
  // ============================================================
  describe('Convert to Worktree Flow', () => {
    it('should hide convert-to-worktree button when not on main branch', async () => {
      // Create test spec
      createTestSpec(WORKTREE_SPEC_NAME);

      // Create and checkout a non-main branch
      const testBranch = 'test-branch-for-e2e';
      createAndCheckoutBranch(testBranch);

      try {
        // Select project and spec
        const projectSelected = await ensureProjectSelected(FIXTURE_PROJECT_PATH);
        expect(projectSelected).toBe(true);

        await browser.pause(1000);

        const specSelected = await selectSpecViaUI(WORKTREE_SPEC_NAME);
        expect(specSelected).toBe(true);

        await browser.pause(500);

        // Convert-to-worktree button should NOT be shown on non-main branch
        const convertButton = await $('[data-testid="convert-to-worktree-button"]');
        const convertExists = await convertButton.isExisting();
        console.log(`[E2E] convert-to-worktree-button exists on non-main: ${convertExists}`);
        expect(convertExists).toBe(false);

        // The current branch should still be the test branch
        const currentBranch = getCurrentBranch();
        expect(currentBranch).toBe(testBranch);
      } finally {
        // Clean up test branch
        deleteBranch(testBranch);
      }
    });

    // Note: Full worktree creation test would require:
    // 1. Being on main branch
    // 2. Having the worktree service actually create a worktree
    // 3. Verifying the spec.json is updated
    // This is a more complex integration test that may require additional setup
    it.skip('should convert to worktree when on main branch and convert button clicked', async () => {
      // This test is skipped as it requires full git worktree setup
      // and would modify the test repository state

      // Create test spec
      createTestSpec(WORKTREE_SPEC_NAME);

      // Ensure we're on main branch
      checkoutBranch('main') || checkoutBranch('master');

      // Select project and spec
      const projectSelected = await ensureProjectSelected(FIXTURE_PROJECT_PATH);
      expect(projectSelected).toBe(true);

      await browser.pause(1000);

      const specSelected = await selectSpecViaUI(WORKTREE_SPEC_NAME);
      expect(specSelected).toBe(true);

      await browser.pause(500);

      // Click convert-to-worktree button
      const convertButton = await $('[data-testid="convert-to-worktree-button"]');
      if (await convertButton.isExisting()) {
        await convertButton.click();

        // Wait for worktree creation
        await browser.pause(2000);

        // Verify worktree was created
        const worktreePath = path.join(FIXTURE_PROJECT_PATH, '..', 'worktrees', WORKTREE_SPEC_NAME);
        expect(fs.existsSync(worktreePath)).toBe(true);

        // Verify spec.json was updated
        const specDir = path.join(FIXTURE_PROJECT_PATH, '.kiro', 'specs', WORKTREE_SPEC_NAME);
        const specJson = JSON.parse(fs.readFileSync(path.join(specDir, 'spec.json'), 'utf-8'));
        expect(specJson.worktree).toBeDefined();
        expect(specJson.worktree.branch).toBe(`feature/${WORKTREE_SPEC_NAME}`);
      }
    });
  });
});
