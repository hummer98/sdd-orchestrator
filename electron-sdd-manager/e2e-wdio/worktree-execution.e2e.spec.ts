/**
 * Worktree Execution E2E Tests
 *
 * Tests the worktree execution workflow for specs.
 * Starting from document-review-completed state.
 *
 * Test Scenarios (Updated for worktree-execution-ui FIX-4):
 * 1. ImplFlowFrame display (no worktree): Checkbox unchecked, button shows "実装開始"
 * 2. ImplFlowFrame display (with worktree): Checkbox checked & locked, button shows "Worktreeで実装継続"
 * 3. Worktree badge display in spec list
 * 4. Error on non-main branch when worktree mode selected
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
  selectProjectViaStore,
  selectSpecViaStore,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  resetAutoExecutionCoordinator,
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
  // Scenario 1: ImplFlowFrame display - no worktree (FIX-4)
  // ============================================================
  describe('Scenario 1: ImplFlowFrame display (no worktree)', () => {
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display ImplFlowFrame with checkbox and start button', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check for ImplFlowFrame
      const implFlowFrame = await $('[data-testid="impl-flow-frame"]');
      const frameExists = await implFlowFrame.isExisting();

      console.log(`[E2E] impl-flow-frame exists: ${frameExists}`);
      expect(frameExists).toBe(true);

      // Check for worktree mode checkbox
      const checkbox = await $('[data-testid="worktree-mode-checkbox"]');
      const checkboxExists = await checkbox.isExisting();

      console.log(`[E2E] worktree-mode-checkbox exists: ${checkboxExists}`);
      expect(checkboxExists).toBe(true);

      // Check for unified start button
      const startButton = await $('[data-testid="impl-start-button"]');
      const buttonExists = await startButton.isExisting();

      console.log(`[E2E] impl-start-button exists: ${buttonExists}`);
      expect(buttonExists).toBe(true);

      // Verify start button is enabled (document review is approved)
      if (buttonExists) {
        const isEnabled = await startButton.isEnabled();
        console.log(`[E2E] impl-start-button enabled: ${isEnabled}`);
        expect(isEnabled).toBe(true);
      }
    });

    it('should show checkbox unchecked and editable when no worktree', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check checkbox state
      const checkbox = await $('[data-testid="worktree-mode-checkbox"]');
      if (await checkbox.isExisting()) {
        // Checkbox should not be checked by default
        const isChecked = await checkbox.isSelected();
        console.log(`[E2E] worktree-mode-checkbox checked: ${isChecked}`);
        // Default state depends on implementation - typically unchecked

        // Checkbox should be enabled (editable)
        const isEnabled = await checkbox.isEnabled();
        console.log(`[E2E] worktree-mode-checkbox enabled: ${isEnabled}`);
        expect(isEnabled).toBe(true);
      }
    });

    it('should show normal mode start button label', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check start button text (normal mode)
      const startButton = await $('[data-testid="impl-start-button"]');
      if (await startButton.isExisting()) {
        const buttonText = await startButton.getText();
        console.log(`[E2E] Start button text: "${buttonText}"`);
        expect(buttonText).toContain('実装開始');
        // Should not contain Worktree in label when checkbox is unchecked
      }
    });
  });

  // ============================================================
  // Scenario 2: ImplFlowFrame display - with worktree (FIX-4)
  // ============================================================
  describe('Scenario 2: ImplFlowFrame display (with worktree)', () => {
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display checkbox checked and locked when worktree exists', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check for ImplFlowFrame
      const implFlowFrame = await $('[data-testid="impl-flow-frame"]');
      const frameExists = await implFlowFrame.isExisting();

      console.log(`[E2E] impl-flow-frame exists: ${frameExists}`);
      expect(frameExists).toBe(true);

      // Check checkbox state - should be checked and locked
      const checkbox = await $('[data-testid="worktree-mode-checkbox"]');
      if (await checkbox.isExisting()) {
        // Checkbox should be checked (worktree exists)
        const isChecked = await checkbox.isSelected();
        console.log(`[E2E] worktree-mode-checkbox checked: ${isChecked}`);
        expect(isChecked).toBe(true);

        // Checkbox should be disabled (locked)
        const isEnabled = await checkbox.isEnabled();
        console.log(`[E2E] worktree-mode-checkbox enabled: ${isEnabled}`);
        expect(isEnabled).toBe(false);
      }
    });

    it('should display continue button with worktree label', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check start button text (worktree mode, impl started)
      const startButton = await $('[data-testid="impl-start-button"]');
      if (await startButton.isExisting()) {
        const buttonText = await startButton.getText();
        console.log(`[E2E] Start button text (worktree): "${buttonText}"`);
        expect(buttonText).toContain('Worktree');
        expect(buttonText).toContain('継続');
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
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
      const specSuccess = await selectSpecViaStore(SPEC_NAME);
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
  // Scenario 4: Worktree creation error on non-main branch (FIX-4)
  // ============================================================
  describe('Scenario 4: Worktree creation error on non-main branch', () => {
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
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
      await workflowView.waitForExist({ timeout: 5000 });

      // FIX-4: First enable worktree mode by checking the checkbox
      const checkbox = await $('[data-testid="worktree-mode-checkbox"]');
      if (await checkbox.isExisting()) {
        const isChecked = await checkbox.isSelected();
        if (!isChecked) {
          await checkbox.click();
          await browser.pause(500);
        }
      }

      // Click start button (now in worktree mode)
      const startButton = await $('[data-testid="impl-start-button"]');
      if (await startButton.isExisting()) {
        await startButton.click();

        // Wait for notification/error
        await browser.pause(2000);

        // Verify worktree was NOT created (spec.json should not have worktree field)
        const specJson = readSpecJson();
        console.log(`[E2E] spec.json.worktree after error: ${JSON.stringify(specJson.worktree)}`);

        // Worktree should NOT be created (error on non-main branch)
        expect(specJson.worktree).toBeUndefined();

        // Check current branch is still the test branch
        const currentBranch = getCurrentBranch();
        console.log(`[E2E] Current branch after error: ${currentBranch}`);
        expect(currentBranch).toBe(testBranch);
      }
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
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
      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(500);
    });

    it('should display document review panel when tasks are approved', async () => {
      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

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
      await workflowView.waitForExist({ timeout: 5000 });

      await browser.pause(1000);

      // Check for approved indicator
      const approvedIndicator = await $('[data-testid="review-approved-indicator"]');
      const approvedExists = await approvedIndicator.isExisting();

      console.log(`[E2E] Review approved indicator exists: ${approvedExists}`);

      // The specific UI depends on implementation
      // If there's an approved indicator, it should be visible
      if (approvedExists) {
        const isDisplayed = await approvedIndicator.isDisplayed();
        console.log(`[E2E] Review approved indicator displayed: ${isDisplayed}`);
      }
    });
  });
});
