/**
 * Auto Execution Phase SSOT E2E Tests
 *
 * auto-exec-phase-ssot: impl 完了済み状態からの自動実行再開テスト
 * Requirements: 5.1, 5.2
 *
 * Verifies:
 * 1. phase='implementation-complete' で自動実行を開始 -> inspection が実行される（impl は再実行されない）
 *
 * Follows existing E2E patterns from auto-execution-impl-flow.e2e.spec.ts:
 * - Mock Claude CLI for deterministic behavior
 * - Fixture-based spec.json with correct phase state
 * - waitForCondition pattern for async state changes
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  ensureProjectSelected,
  selectSpecViaUI,
  setAutoExecutionPermissions,
  getAutoExecutionStatus,
  waitForCondition,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  resetAutoExecutionCoordinator,
  configureMockClaude,
  getAgentsForPhase,
  waitForProjectUIReady,
  waitForSpecDetailReady,
} from './helpers/auto-execution.helpers';

// Fixture project path - reuse tasks-approved fixture directory
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/tasks-approved-project');
const SPEC_NAME = 'test-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

/**
 * spec.json with implementation-complete phase
 * This represents the state after impl has finished successfully.
 * auto-exec-phase-ssot: The key scenario - starting auto-execution from this state
 * should trigger inspection, NOT impl re-execution.
 */
const IMPL_COMPLETE_SPEC_JSON = {
  feature_name: 'test-feature',
  name: 'test-feature',
  description: 'E2E test: impl complete state for phase SSOT verification',
  phase: 'implementation-complete',
  language: 'ja',
  approvals: {
    requirements: { generated: true, approved: true },
    design: { generated: true, approved: true },
    tasks: { generated: true, approved: true },
  },
  documentReview: { status: 'approved' as const },
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
_E2E Test Fixture - All Tasks Complete (impl finished)_
`;

/**
 * Ensure all required fixture directories exist
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
 * Reset fixture to implementation-complete state
 * All phases up to impl are complete, tasks.md has all tasks checked
 */
function resetFixtureToImplComplete(): void {
  ensureFixtureDirectories();

  // Write spec.json with phase = 'implementation-complete'
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(IMPL_COMPLETE_SPEC_JSON, null, 2)
  );

  // Write completed phase documents
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), REQUIREMENTS_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'design.md'), DESIGN_MD_CONTENT);
  fs.writeFileSync(path.join(SPEC_DIR, 'tasks.md'), TASKS_MD_COMPLETE_CONTENT);

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

describe('Auto Execution Phase SSOT E2E', () => {
  before(async () => {
    ensureFixtureDirectories();
    resetFixtureToImplComplete();
  });

  beforeEach(async () => {
    // Reset fixture to impl-complete state
    resetFixtureToImplComplete();

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
      docReviewResult: 'approved',
      tasksComplete: true,
    });
  });

  afterEach(async () => {
    // Stop any running auto-execution
    await stopAutoExecution();
    await browser.pause(500);
  });

  after(async () => {
    resetFixtureToImplComplete();
  });

  // ============================================================
  // Scenario: impl complete -> auto-execution starts -> inspection executes
  // auto-exec-phase-ssot Requirements: 5.1, 5.2
  // ============================================================
  describe('Scenario: impl-complete state -> inspection executes (not impl)', () => {
    it('should start inspection (not impl) when phase is implementation-complete', async () => {
      // Select project and spec
      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);

      // Wait for project UI to be ready
      await waitForProjectUIReady(10000);

      const specSuccess = await selectSpecViaUI(SPEC_NAME);
      expect(specSuccess).toBe(true);

      // Wait for spec detail to be ready
      await waitForSpecDetailReady(SPEC_NAME, 15000);

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 10000 });

      // Set permissions: all phases GO including inspection
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true,
        deploy: false,
      });

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execution-button"]');
      await autoButton.click();

      // Wait for inspection to start
      // The key assertion: since phase='implementation-complete', the coordinator
      // should determine lastCompleted='impl' and start inspection directly
      const inspectionStarted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('inspection');
        return agents.some(a =>
          a.phase.includes('inspection') &&
          (a.status === 'running' || a.status === 'completed')
        );
      }, 90000, 1000, 'inspection-started');

      console.log(`[E2E] Inspection started: ${inspectionStarted}`);
      expect(inspectionStarted).toBe(true);

      // Verify impl was NOT re-executed
      // Check that no impl agent was started during this auto-execution session
      const implAgents = await getAgentsForPhase('impl');
      const implExecutedDuringThisRun = implAgents.some(a =>
        a.phase.includes('impl') &&
        !a.phase.includes('inspection') &&
        (a.status === 'running' || a.status === 'completed')
      );

      console.log(`[E2E] Impl agents found: ${JSON.stringify(implAgents)}`);
      // impl should NOT have been executed - the bug was that it would re-execute impl
      expect(implExecutedDuringThisRun).toBe(false);

      // Wait for auto-execution to complete
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting || s.autoExecutionStatus === 'completed';
      }, 120000, 2000, 'auto-execution-complete');
    });
  });
});
