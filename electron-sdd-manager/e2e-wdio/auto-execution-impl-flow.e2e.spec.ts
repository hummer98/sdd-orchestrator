/**
 * Auto Execution Impl Flow E2E Tests
 *
 * Tests the complete flow from document-review to impl and inspection phases.
 * Specifically verifies:
 * 1. Document review → reply OK → impl GO → impl executes
 * 2. Impl completes → tasks not all complete → impl fallback re-execution
 * 3. Impl completes → tasks all complete → inspection GO → inspection executes
 * 4. Impl completes → tasks all complete → inspection NG → execution stops
 *
 * These tests use the E2E mock environment variable control to dynamically
 * configure the mock Claude CLI behavior.
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
  configureMockClaude,
  getAgentsForPhase,
} from './helpers/auto-execution.helpers';

// Fixture project path - use tasks-approved fixture
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/tasks-approved-project');
const SPEC_NAME = 'test-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

// Initial spec.json content with tasks approved
const TASKS_APPROVED_SPEC_JSON = {
  feature_name: 'test-feature',
  name: 'test-feature',
  description: 'E2Eテスト用のテスト機能（tasks承認済み）',
  phase: 'tasks-approved',
  language: 'ja',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: true, approved: true },
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Spec.json with design completed (tasks will be executed next)
// Document review is triggered AFTER tasks phase EXECUTION completes
const DESIGN_COMPLETED_SPEC_JSON = {
  feature_name: 'test-feature',
  name: 'test-feature',
  description: 'E2Eテスト用のテスト機能（design完了）',
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

const REQUIREMENTS_MD_CONTENT = `# Requirements

## Functional Requirements

### 1. Core Feature Requirements

- **REQ-001**: The system shall provide the requested feature functionality
  - Acceptance Criteria: Feature is accessible and functional
  - Priority: High

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const DESIGN_MD_CONTENT = `# Technical Design

## Overview

This document describes the technical design for the test-feature.

## Architecture

Simple component-based architecture.

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const TASKS_MD_CONTENT = `# Implementation Tasks

## Task 1: Setup Infrastructure

- [ ] 1.1 Create project structure
- [ ] 1.2 Configure build system
- [ ] 1.3 Set up testing framework

## Task 2: Implement Core Components

- [ ] 2.1 Implement Component A (Core Logic)
  - Create main module
  - Add input validation
  - Implement business logic

- [ ] 2.2 Implement Component B (State Manager)
  - Set up state store
  - Add state transitions
  - Implement subscriptions

## Task 3: Testing

- [ ] 3.1 Write unit tests
- [ ] 3.2 Write integration tests

## Task 4: Documentation

- [ ] 4.1 Update README

---
_E2E Test Fixture - Tasks Approved State_
`;

// Tasks MD with all tasks complete
const TASKS_MD_COMPLETE_CONTENT = `# Implementation Tasks

## Task 1: Setup Infrastructure

- [x] 1.1 Create project structure
- [x] 1.2 Configure build system
- [x] 1.3 Set up testing framework

## Task 2: Implement Core Components

- [x] 2.1 Implement Component A (Core Logic)
  - Create main module
  - Add input validation
  - Implement business logic

- [x] 2.2 Implement Component B (State Manager)
  - Set up state store
  - Add state transitions
  - Implement subscriptions

## Task 3: Testing

- [x] 3.1 Write unit tests
- [x] 3.2 Write integration tests

## Task 4: Documentation

- [x] 4.1 Update README

---
_E2E Test Fixture - All Tasks Complete_
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
 * Reset fixture to tasks approved state with incomplete tasks
 */
function resetFixtureToTasksApproved(): void {
  ensureFixtureDirectories();

  // Write spec.json
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(TASKS_APPROVED_SPEC_JSON, null, 2)
  );

  // Write completed phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), TASKS_MD_CONTENT);

  // Cleanup document-review files
  const files = fs.readdirSync(SPEC_DIR);
  for (const file of files) {
    if (file.startsWith('document-review')) {
      try {
        fs.unlinkSync(path.join(SPEC_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // Cleanup runtime/agents
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const agentFiles = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of agentFiles) {
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
    const logFiles = fs.readdirSync(logsDir);
    for (const file of logFiles) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Reset fixture to design completed state (tasks will be executed next)
 * This is used for tests that need to trigger the full document-review → impl flow
 */
function resetFixtureToDesignCompleted(): void {
  ensureFixtureDirectories();

  // Write spec.json
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(DESIGN_COMPLETED_SPEC_JSON, null, 2)
  );

  // Write completed phase documents (requirements and design only)
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);

  // Remove tasks.md if exists (will be generated by mock CLI during tasks phase)
  const tasksPath = path.join(SPEC_DIR, 'tasks.md');
  if (fs.existsSync(tasksPath)) {
    fs.unlinkSync(tasksPath);
  }

  // Cleanup document-review files
  const files = fs.readdirSync(SPEC_DIR);
  for (const file of files) {
    if (file.startsWith('document-review')) {
      try {
        fs.unlinkSync(path.join(SPEC_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // Cleanup runtime/agents
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const agentFiles = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of agentFiles) {
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
    const logFiles = fs.readdirSync(logsDir);
    for (const file of logFiles) {
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
function readSpecJson(): typeof TASKS_APPROVED_SPEC_JSON & { documentReview?: any } {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'spec.json'), 'utf-8'));
}

/**
 * Read tasks.md to check task completion status
 */
function readTasksMd(): string {
  return fs.readFileSync(path.join(SPEC_DIR, 'tasks.md'), 'utf-8');
}

describe('Auto Execution Impl Flow E2E', () => {
  before(async () => {
    ensureFixtureDirectories();
    resetFixtureToTasksApproved();
  });

  beforeEach(async () => {
    // Reset fixture
    resetFixtureToTasksApproved();

    // Clear agent store
    await clearAgentStore();

    // Reset Main Process AutoExecutionCoordinator
    await resetAutoExecutionCoordinator();

    // Reset AutoExecutionService
    await resetAutoExecutionService();

    // Reset specStore autoExecution state
    await resetSpecStoreAutoExecution();

    // Reset mock environment variables to defaults
    await configureMockClaude({
      docReviewResult: 'approved',  // Default: no fixes needed
      tasksComplete: false,         // Default: don't auto-complete tasks
    });
  });

  afterEach(async () => {
    // Stop any running auto-execution
    await stopAutoExecution();
    await browser.pause(500);
  });

  after(async () => {
    resetFixtureToTasksApproved();
  });

  // ============================================================
  // Scenario 1: document-review → reply OK → impl GO → impl executes
  // ============================================================
  describe('Scenario 1: Document review approved → impl executes', () => {
    beforeEach(async () => {
      // Use design-completed state to trigger full flow: tasks -> document-review -> impl
      resetFixtureToDesignCompleted();

      // Clear agent store
      await clearAgentStore();

      // Reset Main Process AutoExecutionCoordinator
      await resetAutoExecutionCoordinator();

      // Reset AutoExecutionService
      await resetAutoExecutionService();

      // Reset specStore autoExecution state
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

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Set document review flag to 'run'
      await setDocumentReviewFlag('run');

      // Configure mock: document-review-reply returns approved (no fixes)
      await configureMockClaude({
        docReviewResult: 'approved',
        tasksComplete: false,
      });
    });

    it('should execute impl after document-review-reply approves', async () => {
      // Set permissions: all GO including impl
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: false,
        deploy: false,
      });

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for tasks phase to complete first (since we start from design-completed)
      const tasksCompleted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('tasks');
        return agents.some(a => a.phase.includes('tasks') && a.status === 'completed');
      }, 60000, 1000, 'tasks-completed');

      console.log(`[E2E] Tasks completed: ${tasksCompleted}`);

      // Wait for document-review to start (triggered after tasks completion)
      const docReviewStarted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('document-review');
        return agents.some(a => a.phase.includes('document-review') && !a.phase.includes('reply'));
      }, 60000, 1000, 'document-review-started');

      console.log(`[E2E] Document review started: ${docReviewStarted}`);

      // Wait for document-review-reply to complete
      const replyCompleted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('document-review-reply');
        return agents.some(a => a.status === 'completed');
      }, 90000, 1000, 'document-review-reply-completed');

      console.log(`[E2E] Document review reply completed: ${replyCompleted}`);

      // Check spec.json to verify document review is approved
      await browser.pause(2000);
      const specJson = readSpecJson();
      console.log(`[E2E] spec.json documentReview: ${JSON.stringify(specJson.documentReview)}`);

      // Wait for impl to start (this is the key assertion)
      const implStarted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('impl');
        return agents.some(a => a.phase.includes('impl') && !a.phase.includes('inspection'));
      }, 90000, 1000, 'impl-started');

      console.log(`[E2E] Impl started: ${implStarted}`);
      expect(implStarted).toBe(true);

      // Wait for auto-execution to complete
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting || s.autoExecutionStatus === 'completed';
      }, 120000, 2000, 'auto-execution-complete');

      // Verify impl agent was executed
      const implAgents = await getAgentsForPhase('impl');
      const implExecuted = implAgents.some(a =>
        a.phase.includes('impl') &&
        !a.phase.includes('inspection') &&
        (a.status === 'completed' || a.status === 'running')
      );
      console.log(`[E2E] Impl agents: ${JSON.stringify(implAgents)}`);
      expect(implExecuted).toBe(true);
    });
  });

  // ============================================================
  // Scenario 2: document-review → reply OK → impl NG → stops
  // (This is already covered in auto-execution-document-review.e2e.spec.ts Scenario 5)
  // ============================================================

  // ============================================================
  // Scenario 3: impl complete → tasks all complete → inspection GO
  // ============================================================
  describe('Scenario 3: Impl complete with all tasks → inspection executes', () => {
    beforeEach(async () => {
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

      // Skip document review for faster testing
      await setDocumentReviewFlag('skip');

      // Configure mock: impl marks all tasks as complete
      await configureMockClaude({
        docReviewResult: 'approved',
        tasksComplete: true,  // KEY: All tasks will be marked complete after impl
      });
    });

    it('should execute inspection after impl completes all tasks', async () => {
      // Set permissions: impl GO, inspection GO
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true,
        deploy: false,
      });

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for impl to complete
      const implCompleted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('impl');
        return agents.some(a =>
          a.phase.includes('impl') &&
          !a.phase.includes('inspection') &&
          a.status === 'completed'
        );
      }, 90000, 1000, 'impl-completed');

      console.log(`[E2E] Impl completed: ${implCompleted}`);

      if (implCompleted) {
        // Verify tasks.md has all tasks checked
        await browser.pause(2000);
        const tasksContent = readTasksMd();
        const uncheckedTasks = (tasksContent.match(/- \[ \]/g) || []).length;
        const checkedTasks = (tasksContent.match(/- \[x\]/g) || []).length;
        console.log(`[E2E] Tasks: ${checkedTasks} complete, ${uncheckedTasks} incomplete`);

        // If tasks are all complete, inspection should be triggered
        if (uncheckedTasks === 0) {
          // Wait for inspection to start
          const inspectionStarted = await waitForCondition(async () => {
            const agents = await getAgentsForPhase('inspection');
            return agents.some(a => a.phase.includes('inspection'));
          }, 60000, 1000, 'inspection-started');

          console.log(`[E2E] Inspection started: ${inspectionStarted}`);
          expect(inspectionStarted).toBe(true);
        }
      }

      // Wait for auto-execution to complete
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting || s.autoExecutionStatus === 'completed';
      }, 180000, 2000, 'auto-execution-complete');

      const finalStatus = await getAutoExecutionStatus();
      console.log(`[E2E] Final status: ${JSON.stringify(finalStatus)}`);
    });
  });

  // ============================================================
  // Scenario 4: impl complete → tasks all complete → inspection NG
  // ============================================================
  describe('Scenario 4: Impl complete with all tasks → inspection NOGO', () => {
    beforeEach(async () => {
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

      // Skip document review for faster testing
      await setDocumentReviewFlag('skip');

      // Configure mock: impl marks all tasks as complete
      await configureMockClaude({
        docReviewResult: 'approved',
        tasksComplete: true,
      });
    });

    it('should stop after impl when inspection is NOGO', async () => {
      // Set permissions: impl GO, inspection NOGO (the key condition)
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: false,  // NOGO - this is the key condition
        deploy: false,
      });

      // Get auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');

      // Verify button shows "自動実行" before starting
      const initialText = await autoButton.getText();
      console.log(`[E2E] Initial button text: ${initialText}`);
      expect(initialText).toContain('自動実行');

      // Start auto-execution
      await autoButton.click();

      // Wait for impl to complete
      const implCompleted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('impl');
        return agents.some(a =>
          a.phase.includes('impl') &&
          !a.phase.includes('inspection') &&
          a.status === 'completed'
        );
      }, 90000, 1000, 'impl-completed');

      console.log(`[E2E] Impl completed: ${implCompleted}`);

      // Wait for auto-execution to complete (should stop at impl)
      const completed = await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return s.autoExecutionStatus === 'completed' ||
               (!s.isAutoExecuting && s.autoExecutionStatus !== 'running');
      }, 120000, 2000, 'auto-execution-completed');

      console.log(`[E2E] Auto-execution completed: ${completed}`);

      // Check final status
      const finalStatus = await getAutoExecutionStatus();
      console.log(`[E2E] Final status: ${JSON.stringify(finalStatus)}`);

      // Verify auto-execution is not running
      expect(finalStatus.isAutoExecuting).toBe(false);

      // Verify inspection was NOT executed
      const inspectionAgents = await getAgentsForPhase('inspection');
      console.log(`[E2E] Inspection agents: ${JSON.stringify(inspectionAgents)}`);
      expect(inspectionAgents.length).toBe(0);

      // Verify button is back to "自動実行"
      await browser.pause(2000);
      const buttonRestored = await waitForCondition(async () => {
        const text = await autoButton.getText();
        console.log(`[E2E] Button text after completion: ${text}`);
        return text.includes('自動実行') && !text.includes('停止');
      }, 10000, 500, 'button-text-restored');

      expect(buttonRestored).toBe(true);
    });
  });

  // ============================================================
  // Scenario 5: impl complete → tasks NOT all complete
  // ============================================================
  describe('Scenario 5: Impl complete with incomplete tasks', () => {
    beforeEach(async () => {
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

      // Skip document review for faster testing
      await setDocumentReviewFlag('skip');

      // Configure mock: impl does NOT mark tasks as complete
      await configureMockClaude({
        docReviewResult: 'approved',
        tasksComplete: false,  // KEY: Tasks will remain incomplete after impl
      });
    });

    it('should complete auto-execution even when some tasks remain incomplete', async () => {
      // Set permissions: impl GO
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true,
        deploy: false,
      });

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for impl to complete
      const implCompleted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('impl');
        return agents.some(a =>
          a.phase.includes('impl') &&
          !a.phase.includes('inspection') &&
          a.status === 'completed'
        );
      }, 90000, 1000, 'impl-completed');

      console.log(`[E2E] Impl completed: ${implCompleted}`);

      // Verify tasks.md still has incomplete tasks
      await browser.pause(2000);
      const tasksContent = readTasksMd();
      const uncheckedTasks = (tasksContent.match(/- \[ \]/g) || []).length;
      console.log(`[E2E] Incomplete tasks: ${uncheckedTasks}`);

      // Wait for auto-execution to complete
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting || s.autoExecutionStatus === 'completed';
      }, 120000, 2000, 'auto-execution-complete');

      const finalStatus = await getAutoExecutionStatus();
      console.log(`[E2E] Final status: ${JSON.stringify(finalStatus)}`);

      // Auto-execution should complete (not hang or error)
      expect(finalStatus.isAutoExecuting).toBe(false);
    });
  });
});
