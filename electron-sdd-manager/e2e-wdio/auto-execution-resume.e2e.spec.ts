/**
 * Auto Execution Resume E2E Tests
 *
 * Tests the auto-execution feature when starting from an intermediate phase.
 * Specifically tests scenarios where:
 * 1. Requirements phase is already completed, auto-execution should start from design
 * 2. Requirements + Design are completed, auto-execution should start from tasks
 *
 * This tests the bug where auto-execution restarts from requirements even when
 * requirements is already completed.
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  selectProjectViaStore,
  selectSpecViaStore,
  setAutoExecutionPermissions,
  getAutoExecutionStatus,
  waitForCondition,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  resetAutoExecutionCoordinator,
  setDocumentReviewFlag,
} from './helpers/auto-execution.helpers';

// Fixture project path
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/resume-test');
const SPEC_NAME = 'resume-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

// Initial spec.json content with requirements COMPLETED
const REQUIREMENTS_COMPLETED_SPEC_JSON = {
  feature_name: 'resume-feature',
  name: 'resume-feature',
  description: 'E2Eテスト用：途中から再開するテスト機能',
  phase: 'requirements',
  language: 'ja',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: false, approved: false },
    tasks: { generated: false, approved: false },
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Initial spec.json content with requirements + design COMPLETED
const DESIGN_COMPLETED_SPEC_JSON = {
  feature_name: 'resume-feature',
  name: 'resume-feature',
  description: 'E2Eテスト用：途中から再開するテスト機能',
  phase: 'design',
  language: 'ja',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: false, approved: false },
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const REQUIREMENTS_MD_CONTENT = `# Requirements Document

## Project Description (Input)
E2Eテスト用：途中から再開するテスト機能を実装します。

## Requirements

### 1. 機能概要
本機能は、E2Eテストで自動実行の途中再開をテストするための機能です。

### 2. 要件

#### REQ-001: テスト用の基本機能
- 自動実行が途中から再開できることをテストする
- requirements が完了した状態から design フェーズを開始できること

### 3. 制約事項
- E2Eテスト用のフィクスチャとして使用

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const DESIGN_MD_CONTENT = `# Design Document

## Overview
E2Eテスト用の設計ドキュメント。

## Architecture
テスト用の簡易的なアーキテクチャ。

## Components
- Component A
- Component B

## Approval Status
- Generated: Yes
- Approved: Yes
`;

/**
 * Fixtureを requirements 完了状態にリセット
 */
function resetFixtureToRequirementsCompleted(): void {
  // spec.jsonを requirements 完了状態に設定
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(REQUIREMENTS_COMPLETED_SPEC_JSON, null, 2)
  );

  // requirements.mdを既存のコンテンツで設定
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);

  // design.md, tasks.mdを削除（存在する場合）
  for (const file of ['design.md', 'tasks.md']) {
    const filePath = path.join(SPEC_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // runtime/agents ディレクトリをクリーンアップ
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const files = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(RUNTIME_AGENTS_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // logs ディレクトリをクリーンアップ
  const logsDir = path.join(SPEC_DIR, 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Fixtureを design 完了状態にリセット
 */
function resetFixtureToDesignCompleted(): void {
  // spec.jsonを design 完了状態に設定
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(DESIGN_COMPLETED_SPEC_JSON, null, 2)
  );

  // requirements.md と design.md を設定
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);

  // tasks.mdを削除（存在する場合）
  const tasksPath = path.join(SPEC_DIR, 'tasks.md');
  if (fs.existsSync(tasksPath)) {
    fs.unlinkSync(tasksPath);
  }

  // runtime/agents ディレクトリをクリーンアップ
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const files = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(RUNTIME_AGENTS_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // logs ディレクトリをクリーンアップ
  const logsDir = path.join(SPEC_DIR, 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Read current spec.json from filesystem
 */
function readSpecJson(): typeof REQUIREMENTS_COMPLETED_SPEC_JSON {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'spec.json'), 'utf-8'));
}

/**
 * Helper: Get the current auto-execution phase being executed
 */
async function getCurrentExecutingPhase(): Promise<string | null> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.specStore?.getState) return null;
    const storeState = stores.specStore.getState();
    const specId = storeState.specDetail?.metadata?.name || '';
    const state = storeState.getAutoExecutionRuntime(specId);
    return state.currentAutoPhase;
  });
}

/**
 * Helper: Get executed phases from agent store (for verification)
 */
async function getExecutedPhases(): Promise<string[]> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agentStore?.getState) return [];
    const agents = stores.agentStore.getState().agents;
    const phases: string[] = [];
    agents.forEach((agentList: any[]) => {
      agentList.forEach((agent: any) => {
        if (agent.skill) {
          // Extract phase from skill name (e.g., "/kiro:spec-requirements" -> "requirements")
          const match = agent.skill.match(/spec-(\w+)/);
          if (match) {
            phases.push(match[1]);
          }
        }
      });
    });
    return phases;
  });
}

describe('Auto Execution Resume E2E Tests', () => {
  before(async () => {
    // Ensure directories exist
    if (!fs.existsSync(SPEC_DIR)) {
      fs.mkdirSync(SPEC_DIR, { recursive: true });
    }
    resetFixtureToRequirementsCompleted();
  });

  beforeEach(async () => {
    // Clear agent store
    await clearAgentStore();

    // Reset Main Process AutoExecutionCoordinator
    await resetAutoExecutionCoordinator();

    // Reset AutoExecutionService
    await resetAutoExecutionService();

    // Reset specStore autoExecution state
    await resetSpecStoreAutoExecution();
  });

  afterEach(async () => {
    // Stop any running auto-execution
    await stopAutoExecution();
    await browser.pause(500);
  });

  after(async () => {
    resetFixtureToRequirementsCompleted();
  });

  // ============================================================
  // Scenario 1: Requirements completed, should start from design
  // ============================================================
  describe('Scenario 1: Requirements already completed', () => {
    beforeEach(async () => {
      // Reset to requirements completed state
      resetFixtureToRequirementsCompleted();

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

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Skip document review to avoid paused state after tasks completion
      await setDocumentReviewFlag('skip');
    });

    it('should verify initial state shows requirements as approved', async () => {
      // Verify spec.json shows requirements as completed
      const specJson = readSpecJson();
      expect(specJson.approvals.requirements.generated).toBe(true);
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.generated).toBe(false);
      expect(specJson.approvals.design.approved).toBe(false);

      console.log('[E2E] Initial spec.json state:', JSON.stringify(specJson.approvals));

      // Verify UI shows requirements as approved
      const reqPhaseItem = await $('[data-testid="phase-item-requirements"]');
      expect(await reqPhaseItem.isExisting()).toBe(true);

      // Should show approved icon
      const approvedIcon = await reqPhaseItem.$('[data-testid="progress-icon-approved"]');
      const isApproved = await approvedIcon.isExisting();
      console.log('[E2E] Requirements approved icon visible:', isApproved);
      expect(isApproved).toBe(true);
    });

    it('should start auto-execution from design phase, NOT requirements', async () => {
      // Set permissions: design and tasks enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Record initial requirements.md modification time
      const reqMdPath = path.join(SPEC_DIR, 'requirements.md');
      const initialReqMTime = fs.statSync(reqMdPath).mtimeMs;

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.waitForClickable({ timeout: 5000 });
      await autoButton.click();

      // Wait for auto-execution to start
      await browser.pause(500);

      // Check which phase is being executed first
      // Note: In mock environment, phases complete very quickly (< 500ms each)
      // So we may detect 'design' or 'tasks' depending on timing
      let firstPhase: string | null = null;
      const phaseDetected = await waitForCondition(async () => {
        const phase = await getCurrentExecutingPhase();
        if (phase) {
          firstPhase = phase;
          console.log(`[E2E] First executing phase: ${phase}`);
          return true;
        }
        return false;
      }, 10000, 200, 'first-phase-detection');

      console.log(`[E2E] Phase detected: ${phaseDetected}, first phase: ${firstPhase}`);

      // BUG CHECK: If first phase is 'requirements', the bug is confirmed
      if (firstPhase === 'requirements') {
        console.error('[E2E] BUG DETECTED: Auto-execution started from requirements instead of design!');
      }

      // Wait for completion
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 120000, 1000, 'auto-execution-complete');

      console.log(`[E2E] Auto-execution completed: ${completed}`);

      // Check if requirements.md was modified (it shouldn't be!)
      const finalReqMTime = fs.statSync(reqMdPath).mtimeMs;
      const reqWasModified = finalReqMTime !== initialReqMTime;
      console.log(`[E2E] requirements.md was modified: ${reqWasModified}`);
      console.log(`[E2E]   Initial mtime: ${initialReqMTime}`);
      console.log(`[E2E]   Final mtime: ${finalReqMTime}`);

      if (reqWasModified) {
        console.error('[E2E] BUG DETECTED: requirements.md was modified even though it was already approved!');
      }

      // EXPECTED: First detected phase should NOT be 'requirements'
      // In mock environment, 'design' may complete so fast that we detect 'tasks' instead
      // The key assertion is that requirements is skipped
      expect(firstPhase).not.toBe('requirements');

      // EXPECTED: requirements.md should NOT be modified
      expect(reqWasModified).toBe(false);

      // design.md should be created (verifies design phase was executed)
      expect(fs.existsSync(path.join(SPEC_DIR, 'design.md'))).toBe(true);
    });

    it('should not re-execute requirements when only design is permitted', async () => {
      // Set permissions: only design enabled
      await setAutoExecutionPermissions({
        requirements: false,  // Explicitly disabled
        design: true,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Record initial requirements.md content
      const reqMdPath = path.join(SPEC_DIR, 'requirements.md');
      const initialReqContent = fs.readFileSync(reqMdPath, 'utf-8');

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 60000, 500, 'auto-execution-complete');

      console.log(`[E2E] Auto-execution completed: ${completed}`);

      // Check requirements.md content (should be unchanged)
      const finalReqContent = fs.readFileSync(reqMdPath, 'utf-8');
      const reqWasModified = finalReqContent !== initialReqContent;

      console.log(`[E2E] requirements.md content changed: ${reqWasModified}`);

      if (reqWasModified) {
        console.error('[E2E] BUG: requirements.md was modified!');
        console.log('[E2E] Content diff:');
        console.log('[E2E]   Initial length:', initialReqContent.length);
        console.log('[E2E]   Final length:', finalReqContent.length);
      }

      // EXPECTED: requirements.md should NOT be modified
      expect(reqWasModified).toBe(false);

      // design.md should be created
      expect(fs.existsSync(path.join(SPEC_DIR, 'design.md'))).toBe(true);
    });
  });

  // ============================================================
  // Scenario 2: Requirements + Design completed, should start from tasks
  // ============================================================
  describe('Scenario 2: Requirements and Design already completed', () => {
    beforeEach(async () => {
      // Reset to design completed state
      resetFixtureToDesignCompleted();

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

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Skip document review to avoid paused state after tasks completion
      await setDocumentReviewFlag('skip');
    });

    it('should verify initial state shows requirements and design as approved', async () => {
      const specJson = readSpecJson();
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.approved).toBe(true);
      expect(specJson.approvals.tasks.approved).toBe(false);

      console.log('[E2E] Initial spec.json state:', JSON.stringify(specJson.approvals));
    });

    it('should start auto-execution from tasks phase, NOT requirements or design', async () => {
      // Set permissions: tasks enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Record initial file modification times
      const reqMdPath = path.join(SPEC_DIR, 'requirements.md');
      const designMdPath = path.join(SPEC_DIR, 'design.md');
      const initialReqMTime = fs.statSync(reqMdPath).mtimeMs;
      const initialDesignMTime = fs.statSync(designMdPath).mtimeMs;

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for auto-execution to start and detect first phase
      let firstPhase: string | null = null;
      await waitForCondition(async () => {
        const phase = await getCurrentExecutingPhase();
        if (phase) {
          firstPhase = phase;
          console.log(`[E2E] First executing phase: ${phase}`);
          return true;
        }
        return false;
      }, 10000, 200, 'first-phase-detection');

      // BUG CHECK
      if (firstPhase === 'requirements' || firstPhase === 'design') {
        console.error(`[E2E] BUG DETECTED: Auto-execution started from ${firstPhase} instead of tasks!`);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 60000, 500, 'auto-execution-complete');

      // Check if files were modified
      const finalReqMTime = fs.statSync(reqMdPath).mtimeMs;
      const finalDesignMTime = fs.statSync(designMdPath).mtimeMs;

      const reqWasModified = finalReqMTime !== initialReqMTime;
      const designWasModified = finalDesignMTime !== initialDesignMTime;

      console.log(`[E2E] requirements.md modified: ${reqWasModified}`);
      console.log(`[E2E] design.md modified: ${designWasModified}`);

      if (reqWasModified || designWasModified) {
        console.error('[E2E] BUG: Completed phase files were modified!');
      }

      // EXPECTED: First phase should be 'tasks'
      expect(firstPhase).toBe('tasks');

      // EXPECTED: Neither requirements.md nor design.md should be modified
      expect(reqWasModified).toBe(false);
      expect(designWasModified).toBe(false);

      // tasks.md should be created
      expect(fs.existsSync(path.join(SPEC_DIR, 'tasks.md'))).toBe(true);
    });
  });
});
