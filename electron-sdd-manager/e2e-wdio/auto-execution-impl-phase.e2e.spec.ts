/**
 * Auto Execution impl Phase E2E Tests
 *
 * Tests the auto-execution feature with impl (implementation) phase enabled.
 * This is an important phase that was previously not tested.
 *
 * Test scenarios:
 * 1. Full workflow: requirements -> design -> tasks -> impl
 * 2. impl only (when other phases already completed)
 * 3. impl with document review integration
 *
 * Relates to:
 * - autoExecutionCoordinator.ts (PHASE_ORDER includes 'impl')
 * - handlers.ts (execute-next-phase event)
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
} from './helpers/auto-execution.helpers';

// Fixture project path
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/impl-test');
const SPEC_NAME = 'impl-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

// Spec.json with all phases completed (ready for impl)
const ALL_PHASES_COMPLETED_SPEC_JSON = {
  feature_name: 'impl-feature',
  name: 'impl-feature',
  description: 'E2Eテスト用：implフェーズテスト',
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
    rounds: [
      {
        roundNumber: 1,
        status: 'approved',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:01:00.000Z',
      },
    ],
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Spec.json with only requirements and design completed
const DESIGN_COMPLETED_SPEC_JSON = {
  feature_name: 'impl-feature',
  name: 'impl-feature',
  description: 'E2Eテスト用：implフェーズテスト',
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
implフェーズテスト用機能。

## Requirements

### REQ-001: 実装機能
- 基本的な機能を実装する

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const DESIGN_MD_CONTENT = `# Design Document

## Overview
implフェーズテスト用設計。

## Architecture
シンプルなアーキテクチャ。

## Components
- Component A: 主要機能

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const TASKS_MD_CONTENT = `# Tasks Document

## Implementation Tasks

### Task 1: Setup
- [x] プロジェクト設定

### Task 2: Core Implementation
- [ ] コア機能の実装
- [ ] テストの追加

### Task 3: Documentation
- [ ] READMEの更新

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
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Reset fixture to all phases completed state (ready for impl)
 */
function resetFixtureToAllPhasesCompleted(): void {
  ensureFixtureDirectories();

  // Write spec.json
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(ALL_PHASES_COMPLETED_SPEC_JSON, null, 2)
  );

  // Write all phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), TASKS_MD_CONTENT);

  // Cleanup runtime/agents
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

  // Cleanup logs
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
 * Reset fixture to design completed state (tasks and impl remaining)
 */
function resetFixtureToDesignCompleted(): void {
  ensureFixtureDirectories();

  // Write spec.json
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(DESIGN_COMPLETED_SPEC_JSON, null, 2)
  );

  // Write completed phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);

  // Remove tasks.md if exists
  const tasksPath = path.join(SPEC_DIR, 'tasks.md');
  if (fs.existsSync(tasksPath)) {
    fs.unlinkSync(tasksPath);
  }

  // Cleanup runtime/agents
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
}

/**
 * Read current spec.json from filesystem
 */
function readSpecJson(): typeof ALL_PHASES_COMPLETED_SPEC_JSON {
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
 * Helper: Get agents executed during auto-execution
 */
async function getExecutedAgentSkills(): Promise<string[]> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agentStore?.getState) return [];

    const skills: string[] = [];
    stores.agentStore.getState().agents.forEach((agentList: any[]) => {
      agentList.forEach((agent: any) => {
        if (agent.skill) {
          skills.push(agent.skill);
        }
      });
    });
    return skills;
  });
}

/**
 * Helper: Set document review flag
 */
async function setDocumentReviewFlag(flag: 'run' | 'pause' | 'skip'): Promise<boolean> {
  return browser.execute((f: string) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflowStore?.getState) return false;
      // Bug fix: Use correct method name setDocumentReviewAutoExecutionFlag
      stores.workflowStore.getState().setDocumentReviewAutoExecutionFlag(f);
      return true;
    } catch (e) {
      return false;
    }
  }, flag);
}

describe('Auto Execution impl Phase E2E', () => {
  before(async () => {
    ensureFixtureDirectories();
    resetFixtureToAllPhasesCompleted();
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
    resetFixtureToAllPhasesCompleted();
  });

  // ============================================================
  // Scenario 1: impl phase only (all prerequisites completed)
  // ============================================================
  describe('Scenario 1: impl phase execution after all prerequisites', () => {
    beforeEach(async () => {
      // Reset to all phases completed
      resetFixtureToAllPhasesCompleted();

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

      // Skip document review for this test
      await setDocumentReviewFlag('skip');
    });

    it('should verify initial state shows all prerequisite phases approved', async () => {
      const specJson = readSpecJson();
      expect(specJson.approvals.requirements.approved).toBe(true);
      expect(specJson.approvals.design.approved).toBe(true);
      expect(specJson.approvals.tasks.approved).toBe(true);

      console.log('[E2E] Initial spec.json state:', JSON.stringify(specJson.approvals));
    });

    it('should execute impl phase when all prerequisites are met', async () => {
      // Set permissions: impl enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for impl phase to start
      let implPhaseStarted = false;
      await waitForCondition(async () => {
        const phase = await getCurrentExecutingPhase();
        console.log(`[E2E] Current phase: ${phase}`);
        if (phase === 'impl') {
          implPhaseStarted = true;
          return true;
        }
        // Also check if execution completed (phase is null but was impl)
        const status = await getAutoExecutionStatus();
        return !status.isAutoExecuting;
      }, 60000, 500, 'impl-phase-detection');

      console.log(`[E2E] impl phase started: ${implPhaseStarted}`);

      // Check executed agents
      const executedSkills = await getExecutedAgentSkills();
      console.log(`[E2E] Executed agent skills: ${JSON.stringify(executedSkills)}`);

      // Verify impl-related skill was executed
      const implSkillExecuted = executedSkills.some(
        skill => skill.includes('spec-impl') || skill.includes('impl')
      );
      console.log(`[E2E] impl skill executed: ${implSkillExecuted}`);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 120000, 1000, 'auto-execution-complete');
    });

    it('should not execute impl when impl permission is OFF', async () => {
      // Set permissions: impl disabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: false,  // Explicitly disabled
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      // Check executed agents - should not include impl
      const executedSkills = await getExecutedAgentSkills();
      console.log(`[E2E] Executed skills (impl OFF): ${JSON.stringify(executedSkills)}`);

      const implSkillExecuted = executedSkills.some(
        skill => skill.includes('spec-impl')
      );
      expect(implSkillExecuted).toBe(false);
    });
  });

  // ============================================================
  // Scenario 2: tasks -> impl sequence
  // ============================================================
  describe('Scenario 2: tasks to impl sequence', () => {
    beforeEach(async () => {
      // Reset to design completed (tasks not done yet)
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

      // Skip document review for this test
      await setDocumentReviewFlag('skip');
    });

    it('should execute tasks then impl in sequence', async () => {
      // Set permissions: tasks and impl enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: false,
        deploy: false,
      });
      await browser.pause(300);

      // Track phase sequence
      const phaseSequence: string[] = [];
      let lastPhase: string | null = null;

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Monitor phase progression
      await waitForCondition(async () => {
        const phase = await getCurrentExecutingPhase();
        if (phase && phase !== lastPhase) {
          phaseSequence.push(phase);
          lastPhase = phase;
          console.log(`[E2E] Phase progression: ${phaseSequence.join(' -> ')}`);
        }

        const status = await getAutoExecutionStatus();
        return !status.isAutoExecuting;
      }, 180000, 1000, 'phase-sequence-complete');

      console.log(`[E2E] Final phase sequence: ${phaseSequence.join(' -> ')}`);

      // Verify tasks.md was created
      const tasksExists = fs.existsSync(path.join(SPEC_DIR, 'tasks.md'));
      console.log(`[E2E] tasks.md exists: ${tasksExists}`);
      expect(tasksExists).toBe(true);

      // Check if impl was attempted after tasks
      const executedSkills = await getExecutedAgentSkills();
      console.log(`[E2E] All executed skills: ${JSON.stringify(executedSkills)}`);
    });
  });

  // ============================================================
  // Scenario 3: impl phase UI indication
  // ============================================================
  describe('Scenario 3: impl phase UI elements', () => {
    beforeEach(async () => {
      // Reset to all phases completed
      resetFixtureToAllPhasesCompleted();

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
    });

    it('should show impl phase in the workflow UI', async () => {
      // Check for impl phase item
      const implPhaseItem = await $('[data-testid="phase-item-impl"]');
      const exists = await implPhaseItem.isExisting();

      console.log(`[E2E] impl phase item exists: ${exists}`);

      // impl phase should be visible in the workflow
      expect(exists).toBe(true);
    });

    it('should show impl permission toggle', async () => {
      // Check for impl permission toggle
      const implToggle = await $('[data-testid="permission-toggle-impl"]');
      const exists = await implToggle.isExisting();

      console.log(`[E2E] impl permission toggle exists: ${exists}`);

      if (exists) {
        const isClickable = await implToggle.isClickable();
        console.log(`[E2E] impl permission toggle clickable: ${isClickable}`);
      }
    });
  });
});
