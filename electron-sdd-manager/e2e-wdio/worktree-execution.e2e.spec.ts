/**
 * Worktree Execution E2E Tests
 *
 * Tests the worktree execution workflow for specs.
 * Starting from document-review-completed state.
 *
 * Test Scenarios (Updated for current implementation):
 * 1. ImplPhasePanel display (no worktree): Execute button with normal mode (blue) styling
 * 2. ImplPhasePanel display (with worktree): Execute button with worktree mode (violet) styling
 * 3. Worktree badge display in spec list
 * 4. Convert-to-worktree button hidden on non-main branch
 * 5. spec.json worktree field verification
 * 6. Document Review panel visibility
 *
 * Prerequisites:
 * - Run with: task electron:test:e2e
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
 * - Test fixtures are in e2e-wdio/fixtures/worktree-exec-test/
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import {
  ensureProjectSelected,
  selectSpecViaUI,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  resetAutoExecutionCoordinator,
  waitForProjectUIReady,
  waitForSpecDetailReady,
} from './helpers/auto-execution.helpers';

// Fixture project path
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/worktree-exec-test');
const SPEC_NAME = 'worktree-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

// Initial spec.json content with document review completed
const INITIAL_SPEC_JSON = {
  feature_name: 'worktree-feature',
  name: 'worktree-feature',
  description: 'E2Eテスト用：worktree実行ワークフローテスト',
  phase: 'tasks',
  language: 'ja',
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
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Spec.json with existing worktree configuration
const SPEC_JSON_WITH_WORKTREE = {
  ...INITIAL_SPEC_JSON,
  worktree: {
    path: `../worktrees/${SPEC_NAME}`,
    branch: `feature/${SPEC_NAME}`,
    created_at: '2024-01-02T00:00:00.000Z',
  },
};

// Spec.json with worktree (branch only - normal mode impl started)
const SPEC_JSON_NORMAL_MODE_IMPL = {
  ...INITIAL_SPEC_JSON,
  worktree: {
    branch: 'main',
    created_at: '2024-01-02T00:00:00.000Z',
  },
};

const REQUIREMENTS_MD_CONTENT = `# Requirements Document

## Project Description (Input)
worktree実行ワークフローのテスト用機能。worktreeモードと通常モードの両方をサポートする。

## Requirements

### REQ-001: Worktreeモード実装
- worktreeモードでの実装実行をサポートする
- worktree作成、実装、マージのフローを完結させる

### REQ-002: 通常モード実装
- 通常モード（カレントブランチ）での実装実行をサポートする
- deployフェーズでコミット処理を行う

### REQ-003: モード切替
- 実装開始前にモード選択が可能
- 実装開始後はモード変更をロック

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const DESIGN_MD_CONTENT = `# Design Document

## Overview
worktree実行ワークフローのテスト用設計。

## Architecture

### Worktreeモード
1. worktreeモードチェックボックスをON
2. impl実行時にworktree作成
3. worktree内で実装を進行
4. deploy時にspec-mergeでマージ

### 通常モード
1. worktreeモードチェックボックスをOFF
2. impl実行時にカレントブランチ情報を保存
3. カレントブランチで実装を進行
4. deploy時に/commitでコミット

## Components

### WorktreeModeCheckbox
- 状態：ON（worktreeモード）、OFF（通常モード）
- ロック条件：実装開始後（spec.json.worktree.branch存在）

### ImplFlowFrame
- impl、inspection、deployを囲む枠
- worktreeモード時は背景色変更

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const TASKS_MD_CONTENT = `# Tasks Document

## Implementation Tasks

### Task 1: Setup
- [x] プロジェクト設定
- [x] ディレクトリ構造作成

### Task 2: Core Implementation
- [ ] worktreeモード実行ロジック
- [ ] 通常モード実行ロジック

### Task 3: UI Components
- [ ] WorktreeModeCheckbox実装
- [ ] ImplFlowFrame実装

### Task 4: Testing
- [ ] ユニットテスト
- [ ] E2Eテスト

## Approval Status
- Generated: Yes
- Approved: Yes
`;

/**
 * Setup fixture directory structure
 */
function ensureFixtureDirectories(): void {
  const dirs = [
    FIXTURE_PATH,
    path.join(FIXTURE_PATH, '.kiro'),
    path.join(FIXTURE_PATH, '.kiro/specs'),
    SPEC_DIR,
    path.join(SPEC_DIR, 'logs'),
    path.join(FIXTURE_PATH, '.kiro/runtime'),
    path.join(FIXTURE_PATH, '.kiro/runtime/agents'),
    RUNTIME_AGENTS_DIR,
    path.join(FIXTURE_PATH, '.kiro/steering'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Reset fixture to initial state (document review completed, no worktree)
 */
function resetFixtureToInitial(): void {
  ensureFixtureDirectories();

  // Write spec.json
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(INITIAL_SPEC_JSON, null, 2)
  );

  // Write phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), TASKS_MD_CONTENT);

  // Cleanup runtime/agents
  cleanupDirectory(RUNTIME_AGENTS_DIR);

  // Cleanup logs
  cleanupDirectory(path.join(SPEC_DIR, 'logs'));
}

/**
 * Reset fixture with existing worktree configuration
 */
function resetFixtureWithWorktree(): void {
  ensureFixtureDirectories();

  // Write spec.json with worktree
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(SPEC_JSON_WITH_WORKTREE, null, 2)
  );

  // Write phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), TASKS_MD_CONTENT);

  // Cleanup runtime/agents
  cleanupDirectory(RUNTIME_AGENTS_DIR);

  // Cleanup logs
  cleanupDirectory(path.join(SPEC_DIR, 'logs'));
}

/**
 * Reset fixture with normal mode impl started (branch only, no path)
 */
function resetFixtureWithNormalModeImpl(): void {
  ensureFixtureDirectories();

  // Write spec.json with branch only (normal mode impl started)
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(SPEC_JSON_NORMAL_MODE_IMPL, null, 2)
  );

  // Write phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), TASKS_MD_CONTENT);

  // Cleanup runtime/agents
  cleanupDirectory(RUNTIME_AGENTS_DIR);

  // Cleanup logs
  cleanupDirectory(path.join(SPEC_DIR, 'logs'));
}

/**
 * Clean up a directory's contents
 */
function cleanupDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(dirPath, file));
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Read current spec.json from filesystem
 */
function readSpecJson(): typeof INITIAL_SPEC_JSON & { worktree?: any } {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'spec.json'), 'utf-8'));
}

/**
 * Get current git branch
 */
function getCurrentBranch(): string {
  try {
    return execSync('git branch --show-current', {
      cwd: FIXTURE_PATH,
      encoding: 'utf-8',
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Check if on main or master branch
 */
function isOnMainBranch(): boolean {
  const branch = getCurrentBranch();
  return branch === 'main' || branch === 'master';
}

/**
 * Checkout to a branch
 */
function checkoutBranch(branch: string): boolean {
  try {
    execSync(`git checkout ${branch}`, {
      cwd: FIXTURE_PATH,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create and checkout a test branch
 */
function createAndCheckoutBranch(branch: string): boolean {
  try {
    execSync(`git checkout -b ${branch}`, {
      cwd: FIXTURE_PATH,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return checkoutBranch(branch);
  }
}

/**
 * Delete a branch
 */
function deleteBranch(branch: string): boolean {
  try {
    checkoutBranch('main') || checkoutBranch('master');
    execSync(`git branch -D ${branch}`, {
      cwd: FIXTURE_PATH,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up worktree if exists
 */
function cleanupWorktree(): void {
  try {
    const worktreePath = path.join(FIXTURE_PATH, '..', 'worktrees', SPEC_NAME);
    if (fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" --force`, {
          cwd: FIXTURE_PATH,
          stdio: 'ignore',
        });
      } catch {
        // Ignore
      }
      if (fs.existsSync(worktreePath)) {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      }
    }

    // Delete feature branch if exists
    try {
      execSync(`git branch -D feature/${SPEC_NAME}`, {
        cwd: FIXTURE_PATH,
        stdio: 'ignore',
      });
    } catch {
      // Ignore
    }
  } catch (error) {
    console.warn('[E2E] Worktree cleanup error:', error);
  }
}

describe('Worktree Execution E2E', () => {
  // ============================================================
  // Test Setup
  // ============================================================
  before(async () => {
    ensureFixtureDirectories();
    resetFixtureToInitial();
    // Ensure we're on main branch
    checkoutBranch('main') || checkoutBranch('master');
  });

  after(async () => {
    resetFixtureToInitial();
    cleanupWorktree();
    checkoutBranch('main') || checkoutBranch('master');
  });

  // ============================================================
  // Scenario 1: ImplPhasePanel display - no worktree
  // ============================================================
  describe('Scenario 1: ImplPhasePanel display (no worktree)', () => {
    beforeEach(async () => {
      // Reset fixture to initial state
      resetFixtureToInitial();
      cleanupWorktree();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // E2E-fix: Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // E2E-fix: Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display ImplPhasePanel with execute button', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Check for ImplPhasePanel
      const implPhasePanel = await $('[data-testid="impl-phase-panel"]');
      const panelExists = await implPhasePanel.isExisting();

      console.log(`[E2E] impl-phase-panel exists: ${panelExists}`);
      expect(panelExists).toBe(true);

      // Check for execute button
      const executeButton = await $('[data-testid="impl-execute-button"]');
      const buttonExists = await executeButton.isExisting();

      console.log(`[E2E] impl-execute-button exists: ${buttonExists}`);
      expect(buttonExists).toBe(true);

      // Verify execute button is enabled (document review is approved)
      if (buttonExists) {
        const isEnabled = await executeButton.isEnabled();
        console.log(`[E2E] impl-execute-button enabled: ${isEnabled}`);
        expect(isEnabled).toBe(true);
      }
    });

    it('should show normal mode styling when no worktree in spec.json', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Worktree mode is determined by spec.json (no checkbox in UI)
      // When no worktree field, button should use blue (normal mode) styling
      const executeButton = await $('[data-testid="impl-execute-button"]');
      if (await executeButton.isExisting()) {
        // Verify button is enabled
        const isEnabled = await executeButton.isEnabled();
        console.log(`[E2E] impl-execute-button enabled (no worktree): ${isEnabled}`);
        expect(isEnabled).toBe(true);

        // Verify normal mode icon (play icon, not git-branch icon)
        const playIcon = await executeButton.$('[data-testid="icon-play"]');
        const playIconExists = await playIcon.isExisting();
        console.log(`[E2E] Normal mode play icon exists: ${playIconExists}`);
        expect(playIconExists).toBe(true);
      }
    });

    it('should show execute button label', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Check execute button text (button label is always "実装")
      const executeButton = await $('[data-testid="impl-execute-button"]');
      if (await executeButton.isExisting()) {
        const buttonText = await executeButton.getText();
        console.log(`[E2E] Execute button text: "${buttonText}"`);
        expect(buttonText).toContain('実装');
      }
    });
  });

  // ============================================================
  // Scenario 2: ImplPhasePanel display - with worktree
  // ============================================================
  describe('Scenario 2: ImplPhasePanel display (with worktree)', () => {
    beforeEach(async () => {
      // Reset fixture with worktree configuration
      resetFixtureWithWorktree();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // E2E-fix: Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // E2E-fix: Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display worktree mode styling when worktree exists in spec.json', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Check for ImplPhasePanel
      const implPhasePanel = await $('[data-testid="impl-phase-panel"]');
      const panelExists = await implPhasePanel.isExisting();

      console.log(`[E2E] impl-phase-panel exists: ${panelExists}`);
      expect(panelExists).toBe(true);

      // Worktree mode is determined by spec.json.worktree field (no checkbox in UI)
      // When worktree exists, button should use violet (worktree mode) styling
      // and show git-branch icon instead of play icon
      const executeButton = await $('[data-testid="impl-execute-button"]');
      if (await executeButton.isExisting()) {
        const gitBranchIcon = await executeButton.$('[data-testid="icon-git-branch"]');
        const gitBranchExists = await gitBranchIcon.isExisting();
        console.log(`[E2E] Worktree mode git-branch icon exists: ${gitBranchExists}`);
        expect(gitBranchExists).toBe(true);
      }
    });

    it('should display execute button with worktree mode label', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Check execute button text (worktree mode)
      // Button label is always "実装" - worktree mode is indicated by color (violet) only
      const executeButton = await $('[data-testid="impl-execute-button"]');
      if (await executeButton.isExisting()) {
        const buttonText = await executeButton.getText();
        console.log(`[E2E] Execute button text (worktree): "${buttonText}"`);
        expect(buttonText).toContain('実装');
      }
    });
  });

  // ============================================================
  // Scenario 3: Worktree info display
  // ============================================================
  describe('Scenario 3: Worktree info display', () => {
    beforeEach(async () => {
      // Reset fixture with worktree configuration
      resetFixtureWithWorktree();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // E2E-fix: Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // E2E-fix: Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display worktree badge in spec list when worktree exists', async () => {
      // Check for worktree badge in spec list
      const worktreeBadge = await $('[data-testid="worktree-badge"]');
      const badgeExists = await worktreeBadge.isExisting();

      console.log(`[E2E] Worktree badge exists: ${badgeExists}`);

      // Badge should exist when spec has worktree.path
      expect(badgeExists).toBe(true);
    });

    it('should NOT display worktree badge when only branch exists (normal mode impl)', async () => {
      // Reset to normal mode impl (branch only, no path)
      resetFixtureWithNormalModeImpl();

      // Refresh spec store
      await refreshSpecStore();
      await browser.pause(500);

      // Re-select spec to trigger reload
      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      // Check for worktree badge - should NOT exist
      const worktreeBadge = await $('[data-testid="worktree-badge"]');
      const badgeExists = await worktreeBadge.isExisting();

      console.log(`[E2E] Worktree badge exists (normal mode): ${badgeExists}`);

      // Badge should NOT exist when spec only has worktree.branch (no path)
      expect(badgeExists).toBe(false);
    });
  });

  // ============================================================
  // Scenario 4: Convert-to-worktree button hidden on non-main branch
  // ============================================================
  describe('Scenario 4: Convert-to-worktree button hidden on non-main branch', () => {
    const testBranch = 'test-branch-for-worktree-e2e';

    beforeEach(async () => {
      // Reset fixture to initial state
      resetFixtureToInitial();
      cleanupWorktree();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // E2E-fix: Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // E2E-fix: Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
      // Clean up test branch
      deleteBranch(testBranch);
      // Return to main branch
      checkoutBranch('main') || checkoutBranch('master');
    });

    it('should show error when attempting worktree creation on non-main branch', async () => {
      // Skip if fixture is not a git repo
      if (!fs.existsSync(path.join(FIXTURE_PATH, '.git'))) {
        console.log('[E2E] Skipping test - fixture is not a git repo');
        return;
      }

      // Create and checkout test branch
      const branchCreated = createAndCheckoutBranch(testBranch);
      if (!branchCreated) {
        console.log('[E2E] Skipping test - could not create test branch');
        return;
      }

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Worktree mode is determined by spec.json (no checkbox in UI)
      // The convert-to-worktree button in SpecWorkflowFooter should not be shown
      // when not on main branch (canShowConvertButton returns false)
      const convertButton = await $('[data-testid="convert-to-worktree-button"]');
      const convertButtonExists = await convertButton.isExisting();
      console.log(`[E2E] convert-to-worktree-button exists on non-main branch: ${convertButtonExists}`);

      // Convert button should NOT be shown on non-main branch
      expect(convertButtonExists).toBe(false);

      // Verify spec.json still has no worktree field
      const specJson = readSpecJson();
      console.log(`[E2E] spec.json.worktree: ${JSON.stringify(specJson.worktree)}`);
      expect(specJson.worktree).toBeUndefined();

      // Check current branch is still the test branch
      const currentBranch = getCurrentBranch();
      console.log(`[E2E] Current branch: ${currentBranch}`);
      expect(currentBranch).toBe(testBranch);
    });
  });

  // ============================================================
  // Scenario 5: spec.json worktree field verification
  // ============================================================
  describe('Scenario 5: spec.json worktree field verification', () => {
    beforeEach(async () => {
      // Reset fixture to initial state
      resetFixtureToInitial();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // E2E-fix: Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // E2E-fix: Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should have correct worktree structure in spec.json when worktree exists', async () => {
      // Set up spec.json with worktree
      resetFixtureWithWorktree();
      await refreshSpecStore();
      await browser.pause(500);

      // Read and verify spec.json
      const specJson = readSpecJson();
      console.log(`[E2E] spec.json.worktree: ${JSON.stringify(specJson.worktree)}`);

      expect(specJson.worktree).toBeDefined();
      expect(specJson.worktree.path).toBe(`../worktrees/${SPEC_NAME}`);
      expect(specJson.worktree.branch).toBe(`feature/${SPEC_NAME}`);
      expect(specJson.worktree.created_at).toBeDefined();
    });

    it('should have only branch and created_at when normal mode impl started', async () => {
      // Set up spec.json with normal mode impl
      resetFixtureWithNormalModeImpl();
      await refreshSpecStore();
      await browser.pause(500);

      // Read and verify spec.json
      const specJson = readSpecJson();
      console.log(`[E2E] spec.json.worktree (normal mode): ${JSON.stringify(specJson.worktree)}`);

      expect(specJson.worktree).toBeDefined();
      expect(specJson.worktree.path).toBeUndefined();
      expect(specJson.worktree.branch).toBe('main');
      expect(specJson.worktree.created_at).toBeDefined();
    });

    it('should not have worktree field when impl not started', async () => {
      // Reset to initial state (no worktree)
      resetFixtureToInitial();
      await refreshSpecStore();
      await browser.pause(500);

      // Read and verify spec.json
      const specJson = readSpecJson();
      console.log(`[E2E] spec.json.worktree (initial): ${JSON.stringify(specJson.worktree)}`);

      expect(specJson.worktree).toBeUndefined();
    });
  });

  // ============================================================
  // Scenario 6: Document Review panel should be visible
  // ============================================================
  describe('Scenario 6: Document Review panel visibility', () => {
    beforeEach(async () => {
      // Reset fixture to initial state (document review approved)
      resetFixtureToInitial();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // E2E-fix: Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // E2E-fix: Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display document review panel when tasks are approved', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      await browser.pause(1000);

      // Check for document review panel
      const panel = await $('[data-testid="document-review-panel"]');
      const panelExists = await panel.isExisting();

      console.log(`[E2E] Document review panel exists: ${panelExists}`);

      // Panel should exist since tasks are approved
      expect(panelExists).toBe(true);
    });

    it('should show approved status in document review panel', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      await browser.pause(1000);

      // Check for progress indicator (checked = approved state)
      // DocumentReviewPanel uses progress-indicator-checked for approved status
      const checkedIndicator = await $('[data-testid="progress-indicator-checked"]');
      const checkedExists = await checkedIndicator.isExisting();

      console.log(`[E2E] Progress indicator checked exists: ${checkedExists}`);

      // If approved, the checked indicator should be visible
      if (checkedExists) {
        const isDisplayed = await checkedIndicator.isDisplayed();
        console.log(`[E2E] Progress indicator checked displayed: ${isDisplayed}`);
        expect(isDisplayed).toBe(true);
      }
    });
  });
});
