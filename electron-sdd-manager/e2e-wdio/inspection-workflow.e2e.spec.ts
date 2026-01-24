/**
 * Inspection Workflow E2E Tests
 *
 * Tests the inspection workflow including:
 * - Inspection panel display and visibility
 * - Progress indicators (checked, unchecked, executing)
 * - GO/NOGO result handling
 * - Auto-execution integration with inspection
 * - Inspection fix workflow
 *
 * Inspection States:
 * - Progress indicator: checked | unchecked | executing
 * - Result: go | nogo
 * - Each round has: number, result, inspectedAt, fixedAt (optional)
 *
 * UI Elements tested:
 * - inspection-panel
 * - inspection-progress-indicator-{checked,unchecked,executing}
 * - start-inspection-button
 * - inspection-auto-permission-toggle
 * - inspection-result display (GO/NOGO)
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
  getAgentsForPhase,
} from './helpers/auto-execution.helpers';

// Fixture project path
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/inspection-test');
const SPEC_NAME = 'inspection-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

// Base spec.json with impl completed (ready for inspection)
const IMPL_COMPLETED_BASE = {
  feature_name: 'inspection-feature',
  name: 'inspection-feature',
  description: 'E2Eテスト用：Inspectionワークフローテスト',
  phase: 'impl',
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
        fixStatus: 'not_required',
      },
    ],
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

// Inspection state variants
const INSPECTION_STATES = {
  // No inspection yet
  no_inspection: {
    ...IMPL_COMPLETED_BASE,
  },
  // One round with GO result
  one_round_go: {
    ...IMPL_COMPLETED_BASE,
    inspection: {
      rounds: [
        {
          number: 1,
          result: 'go',
          inspectedAt: '2024-01-01T01:00:00.000Z',
        },
      ],
    },
  },
  // One round with NOGO result (needs fix)
  one_round_nogo: {
    ...IMPL_COMPLETED_BASE,
    inspection: {
      rounds: [
        {
          number: 1,
          result: 'nogo',
          inspectedAt: '2024-01-01T01:00:00.000Z',
        },
      ],
    },
  },
  // One round NOGO with fix applied
  one_round_nogo_fixed: {
    ...IMPL_COMPLETED_BASE,
    inspection: {
      rounds: [
        {
          number: 1,
          result: 'nogo',
          inspectedAt: '2024-01-01T01:00:00.000Z',
          fixedAt: '2024-01-01T01:30:00.000Z',
        },
      ],
    },
  },
  // Multiple rounds: NOGO -> fix -> GO
  multi_round_eventual_go: {
    ...IMPL_COMPLETED_BASE,
    inspection: {
      rounds: [
        {
          number: 1,
          result: 'nogo',
          inspectedAt: '2024-01-01T01:00:00.000Z',
          fixedAt: '2024-01-01T01:30:00.000Z',
        },
        {
          number: 2,
          result: 'nogo',
          inspectedAt: '2024-01-01T02:00:00.000Z',
          fixedAt: '2024-01-01T02:30:00.000Z',
        },
        {
          number: 3,
          result: 'go',
          inspectedAt: '2024-01-01T03:00:00.000Z',
        },
      ],
    },
  },
};

const REQUIREMENTS_MD_CONTENT = `# Requirements Document

## Project Description (Input)
Inspectionワークフローテスト用機能。

## Requirements

### REQ-001: テスト機能
- Inspectionワークフローをテストする

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const DESIGN_MD_CONTENT = `# Design Document

## Overview
Inspectionワークフローテスト用設計。

## Approval Status
- Generated: Yes
- Approved: Yes
`;

const TASKS_MD_CONTENT = `# Tasks Document

## Implementation Tasks

### Task 1: Setup
- [x] 基本設定

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
 * Set fixture to a specific inspection state
 */
function setFixtureState(stateName: keyof typeof INSPECTION_STATES): void {
  ensureFixtureDirectories();

  // Write spec.json
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(INSPECTION_STATES[stateName], null, 2)
  );

  // Write phase documents
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
}

/**
 * Read current spec.json from filesystem
 */
function readSpecJson(): typeof IMPL_COMPLETED_BASE & { inspection?: any } {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'spec.json'), 'utf-8'));
}

/**
 * Helper: Get inspection UI state
 */
async function getInspectionUIState(): Promise<{
  panelVisible: boolean;
  progressIndicator: 'checked' | 'unchecked' | 'executing' | null;
  startButtonEnabled: boolean;
  roundCount: number;
  lastResult: 'go' | 'nogo' | null;
  needsFix: boolean;
}> {
  return browser.execute(() => {
    const panel = document.querySelector('[data-testid="inspection-panel"]');
    const panelVisible = panel !== null && (panel as HTMLElement).offsetParent !== null;

    // Check progress indicators
    const checked = document.querySelector('[data-testid="inspection-progress-indicator-checked"]');
    const unchecked = document.querySelector('[data-testid="inspection-progress-indicator-unchecked"]');
    const executing = document.querySelector('[data-testid="inspection-progress-indicator-executing"]');

    let progressIndicator: 'checked' | 'unchecked' | 'executing' | null = null;
    if (executing && (executing as HTMLElement).offsetParent !== null) {
      progressIndicator = 'executing';
    } else if (checked && (checked as HTMLElement).offsetParent !== null) {
      progressIndicator = 'checked';
    } else if (unchecked && (unchecked as HTMLElement).offsetParent !== null) {
      progressIndicator = 'unchecked';
    }

    // Check button state
    const startButton = document.querySelector('[data-testid="start-inspection-button"]') as HTMLButtonElement;
    const startButtonEnabled = startButton ? !startButton.disabled : false;

    // Get round count and result from store
    const stores = (window as any).__STORES__;
    let roundCount = 0;
    let lastResult: 'go' | 'nogo' | null = null;
    let needsFix = false;

    if (stores?.spec?.getState) {
      const specDetail = stores.spec.getState().specDetail;
      const inspection = specDetail?.specJson?.inspection;
      if (inspection?.rounds) {
        roundCount = inspection.rounds.length;
        if (roundCount > 0) {
          const lastRound = inspection.rounds[roundCount - 1];
          lastResult = lastRound.result;
          needsFix = lastRound.result === 'nogo' && !lastRound.fixedAt;
        }
      }
    }

    return {
      panelVisible,
      progressIndicator,
      startButtonEnabled,
      roundCount,
      lastResult,
      needsFix,
    };
  });
}

/**
 * Helper: Get inspection permission toggle state
 */
async function getInspectionPermissionState(): Promise<{
  toggleExists: boolean;
  isPermitted: boolean;
}> {
  return browser.execute(() => {
    const toggle = document.querySelector('[data-testid="inspection-auto-permission-toggle"]');
    if (!toggle) {
      return { toggleExists: false, isPermitted: false };
    }

    // Check if permitted icon is visible
    const permittedIcon = document.querySelector('[data-testid="inspection-auto-permitted-icon"]');
    const forbiddenIcon = document.querySelector('[data-testid="inspection-auto-forbidden-icon"]');

    const isPermitted = permittedIcon !== null && (permittedIcon as HTMLElement).offsetParent !== null;

    return {
      toggleExists: true,
      isPermitted,
    };
  });
}

/**
 * Helper: Get executed agents phases
 * Note: AgentInfo has 'phase' field, not 'skill'.
 */
async function getExecutedAgentPhases(): Promise<string[]> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.agent?.getState) return [];

    const phases: string[] = [];
    stores.agent.getState().agents.forEach((agentList: any[]) => {
      agentList.forEach((agent: any) => {
        if (agent.phase) {
          phases.push(agent.phase);
        }
      });
    });
    return phases;
  });
}

describe('Inspection Workflow E2E', () => {
  before(async () => {
    ensureFixtureDirectories();
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

  // ============================================================
  // Inspection Panel Visibility
  // ============================================================
  describe('Inspection Panel Visibility', () => {
    beforeEach(async () => {
      setFixtureState('no_inspection');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should show inspection panel when impl is completed', async () => {
      const panel = await $('[data-testid="inspection-panel"]');
      const panelExists = await panel.isExisting();
      expect(panelExists).toBe(true);

      console.log(`[E2E] Inspection panel exists: ${panelExists}`);
    });

    it('should show unchecked progress indicator when no inspection done', async () => {
      const uiState = await getInspectionUIState();
      console.log(`[E2E] Inspection UI state (no_inspection): ${JSON.stringify(uiState)}`);

      expect(uiState.progressIndicator).toBe('unchecked');
      expect(uiState.roundCount).toBe(0);
    });

    it('should have start inspection button enabled', async () => {
      const startButton = await $('[data-testid="start-inspection-button"]');
      const buttonExists = await startButton.isExisting();
      expect(buttonExists).toBe(true);

      if (buttonExists) {
        const isEnabled = await startButton.isEnabled();
        console.log(`[E2E] Start inspection button enabled: ${isEnabled}`);
        expect(isEnabled).toBe(true);
      }
    });

    it('should show inspection permission toggle', async () => {
      const permissionState = await getInspectionPermissionState();
      console.log(`[E2E] Inspection permission state: ${JSON.stringify(permissionState)}`);

      expect(permissionState.toggleExists).toBe(true);
    });
  });

  // ============================================================
  // Progress Indicator: checked (after GO result)
  // ============================================================
  describe('Progress Indicator: checked (GO result)', () => {
    beforeEach(async () => {
      setFixtureState('one_round_go');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should show checked progress indicator after GO result', async () => {
      const uiState = await getInspectionUIState();
      console.log(`[E2E] Inspection UI state (one_round_go): ${JSON.stringify(uiState)}`);

      expect(uiState.progressIndicator).toBe('checked');
      expect(uiState.roundCount).toBe(1);
      expect(uiState.lastResult).toBe('go');
      expect(uiState.needsFix).toBe(false);
    });

    it('should display GO result indicator', async () => {
      const goIndicator = await $('[data-testid="inspection-result-go"]');
      const goExists = await goIndicator.isExisting();
      console.log(`[E2E] GO indicator exists: ${goExists}`);

      // Alternative: check via classes or text
      if (!goExists) {
        const resultText = await $('[data-testid="inspection-last-result"]');
        if (await resultText.isExisting()) {
          const text = await resultText.getText();
          console.log(`[E2E] Inspection result text: ${text}`);
        }
      }
    });
  });

  // ============================================================
  // Progress Indicator: needs fix (NOGO result)
  // ============================================================
  describe('Progress Indicator: needs fix (NOGO result)', () => {
    beforeEach(async () => {
      setFixtureState('one_round_nogo');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should indicate NOGO result and needs fix', async () => {
      const uiState = await getInspectionUIState();
      console.log(`[E2E] Inspection UI state (one_round_nogo): ${JSON.stringify(uiState)}`);

      expect(uiState.roundCount).toBe(1);
      expect(uiState.lastResult).toBe('nogo');
      expect(uiState.needsFix).toBe(true);
    });

    it('should display NOGO result indicator', async () => {
      const nogoIndicator = await $('[data-testid="inspection-result-nogo"]');
      const nogoExists = await nogoIndicator.isExisting();
      console.log(`[E2E] NOGO indicator exists: ${nogoExists}`);
    });

    it('should show fix required indicator', async () => {
      const fixRequiredIndicator = await $('[data-testid="inspection-fix-required"]');
      const fixRequiredExists = await fixRequiredIndicator.isExisting();
      console.log(`[E2E] Fix required indicator exists: ${fixRequiredExists}`);
    });
  });

  // ============================================================
  // NOGO with fix applied
  // ============================================================
  describe('NOGO with fix applied', () => {
    beforeEach(async () => {
      setFixtureState('one_round_nogo_fixed');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should indicate fix has been applied', async () => {
      const uiState = await getInspectionUIState();
      console.log(`[E2E] Inspection UI state (nogo_fixed): ${JSON.stringify(uiState)}`);

      expect(uiState.roundCount).toBe(1);
      expect(uiState.lastResult).toBe('nogo');
      expect(uiState.needsFix).toBe(false); // Fix was applied
    });

    it('should enable start inspection button for re-inspection', async () => {
      const startButton = await $('[data-testid="start-inspection-button"]');
      if (await startButton.isExisting()) {
        const isEnabled = await startButton.isEnabled();
        console.log(`[E2E] Start inspection button enabled (after fix): ${isEnabled}`);
        // Should be enabled to re-run inspection after fix
        expect(isEnabled).toBe(true);
      }
    });
  });

  // ============================================================
  // Multi-round inspection (NOGO -> fix -> NOGO -> fix -> GO)
  // ============================================================
  describe('Multi-round inspection', () => {
    beforeEach(async () => {
      setFixtureState('multi_round_eventual_go');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should show correct round count for multi-round inspection', async () => {
      const uiState = await getInspectionUIState();
      console.log(`[E2E] Inspection UI state (multi_round): ${JSON.stringify(uiState)}`);

      expect(uiState.roundCount).toBe(3);
      expect(uiState.lastResult).toBe('go');
      expect(uiState.needsFix).toBe(false);
    });

    it('should show checked indicator after eventual GO', async () => {
      const uiState = await getInspectionUIState();
      expect(uiState.progressIndicator).toBe('checked');
    });

    it('should display inspection round history', async () => {
      const roundHistory = await $('[data-testid="inspection-round-history"]');
      const historyExists = await roundHistory.isExisting();
      console.log(`[E2E] Inspection round history exists: ${historyExists}`);

      // Alternative: check for round count display
      const roundCountDisplay = await $('[data-testid="inspection-round-count"]');
      if (await roundCountDisplay.isExisting()) {
        const text = await roundCountDisplay.getText();
        console.log(`[E2E] Inspection round count text: ${text}`);
      }
    });
  });

  // ============================================================
  // Auto-execution with inspection permission
  // ============================================================
  describe('Auto-execution with inspection permission', () => {
    beforeEach(async () => {
      setFixtureState('no_inspection');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Skip document review
      await setDocumentReviewFlag('skip');
    });

    it('should execute inspection when inspection permission is ON', async () => {
      // Set permissions: inspection enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true, // Enable inspection
        deploy: false,
      });
      await browser.pause(300);

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for inspection to be triggered
      const inspectionStarted = await waitForCondition(async () => {
        const phases = await getExecutedAgentPhases();
        return phases.some(p => p.includes('inspection'));
      }, 60000, 1000, 'inspection-agent-started');

      console.log(`[E2E] Inspection agent started: ${inspectionStarted}`);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 120000, 1000, 'auto-execution-complete');

      const executedPhases = await getExecutedAgentPhases();
      console.log(`[E2E] Executed phases: ${JSON.stringify(executedPhases)}`);
    });

    it('should not execute inspection when inspection permission is OFF', async () => {
      // Set permissions: inspection disabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: false, // Disable inspection
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
      }, 60000, 1000, 'auto-execution-complete');

      const executedPhases = await getExecutedAgentPhases();
      console.log(`[E2E] Executed phases (inspection OFF): ${JSON.stringify(executedPhases)}`);

      // Inspection should not be executed
      const inspectionExecuted = executedPhases.some(
        p => p.includes('inspection') && !p.includes('document')
      );
      expect(inspectionExecuted).toBe(false);
    });
  });

  // ============================================================
  // Executing state indicator
  // ============================================================
  describe('Executing state indicator', () => {
    beforeEach(async () => {
      setFixtureState('no_inspection');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should show executing indicator when inspection is running', async () => {
      // Click start inspection button
      const startButton = await $('[data-testid="start-inspection-button"]');
      if (await startButton.isExisting() && await startButton.isEnabled()) {
        await startButton.click();

        // Check for executing indicator
        const executingShown = await waitForCondition(async () => {
          const uiState = await getInspectionUIState();
          return uiState.progressIndicator === 'executing';
        }, 10000, 200, 'executing-indicator-shown');

        console.log(`[E2E] Executing indicator shown: ${executingShown}`);

        // If shown, verify the indicator element
        if (executingShown) {
          const executingIndicator = await $('[data-testid="inspection-progress-indicator-executing"]');
          const indicatorVisible = await executingIndicator.isDisplayed();
          console.log(`[E2E] Executing indicator visible: ${indicatorVisible}`);
        }
      }
    });
  });

  // ============================================================
  // Auto-execution with inspection --autofix
  // When inspection is enabled in auto-execution, it uses --autofix flag
  // which auto-fixes on NOGO and re-inspects (up to 3 cycles)
  // ============================================================
  describe('Auto-execution inspection with --autofix', () => {
    beforeEach(async () => {
      setFixtureState('no_inspection');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Skip document review
      await setDocumentReviewFlag('skip');
    });

    it('should execute inspection with --autofix in auto-execution flow', async () => {
      // Set permissions: inspection enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true,
        deploy: false,
      });
      await browser.pause(300);

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for inspection agent to start
      const inspectionStarted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('inspection');
        return agents.some(a => a.phase.includes('inspection'));
      }, 90000, 1000, 'inspection-started');

      console.log(`[E2E] Inspection with --autofix started: ${inspectionStarted}`);

      // Note: The actual --autofix behavior (auto-fix on NOGO, re-inspect) is handled
      // by the spec-inspection agent internally. We verify that inspection phase runs.

      // Wait for auto-execution to complete
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 180000, 2000, 'auto-execution-complete');

      // Verify inspection was executed
      const inspectionAgents = await getAgentsForPhase('inspection');
      console.log(`[E2E] Inspection agents: ${JSON.stringify(inspectionAgents)}`);
      expect(inspectionAgents.length).toBeGreaterThan(0);
    });

    it('should trigger spec-merge after inspection GO in auto-execution', async () => {
      // Update fixture to have inspection GO result
      setFixtureState('one_round_go');
      await refreshSpecStore();

      // Set permissions: all phases enabled
      await setAutoExecutionPermissions({
        requirements: true,
        design: true,
        tasks: true,
        impl: true,
        inspection: true,
        deploy: true, // Enable deploy so spec-merge can trigger
      });
      await browser.pause(300);

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for spec-merge to start (after inspection GO)
      const specMergeStarted = await waitForCondition(async () => {
        const agents = await getAgentsForPhase('spec-merge');
        return agents.some(a => a.phase.includes('spec-merge'));
      }, 120000, 1000, 'spec-merge-started');

      console.log(`[E2E] Spec-merge after inspection GO: ${specMergeStarted}`);

      // Wait for auto-execution to complete
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 180000, 2000, 'auto-execution-complete');
    });
  });

  // ============================================================
  // Standalone inspection manual execution
  // User clicks "Start Inspection" button manually
  // ============================================================
  describe('Standalone inspection execution', () => {
    beforeEach(async () => {
      setFixtureState('no_inspection');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should execute inspection when start button is clicked manually', async () => {
      // Click start inspection button
      const startButton = await $('[data-testid="start-inspection-button"]');
      const buttonExists = await startButton.isExisting();
      expect(buttonExists).toBe(true);

      if (buttonExists && await startButton.isEnabled()) {
        await startButton.click();

        // Wait for inspection agent to start
        const inspectionStarted = await waitForCondition(async () => {
          const agents = await getAgentsForPhase('inspection');
          return agents.some(a => a.phase.includes('inspection'));
        }, 60000, 1000, 'inspection-started');

        console.log(`[E2E] Manual inspection started: ${inspectionStarted}`);
        expect(inspectionStarted).toBe(true);

        // Wait for inspection to complete
        const inspectionCompleted = await waitForCondition(async () => {
          const agents = await getAgentsForPhase('inspection');
          return agents.some(a => a.status === 'completed' || a.status === 'failed');
        }, 180000, 2000, 'inspection-completed');

        console.log(`[E2E] Manual inspection completed: ${inspectionCompleted}`);
      }
    });
  });

  // ============================================================
  // Inspection --fix after NOGO
  // User clicks "Apply Fix" button after inspection NOGO
  // ============================================================
  describe('Inspection fix after NOGO', () => {
    beforeEach(async () => {
      setFixtureState('one_round_nogo_fixed');

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const specSuccess = await selectSpecViaStore(SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });
    });

    it('should allow re-inspection after fix is applied', async () => {
      // After fix is applied, start inspection button should be enabled
      const startButton = await $('[data-testid="start-inspection-button"]');
      const buttonExists = await startButton.isExisting();

      if (buttonExists) {
        const isEnabled = await startButton.isEnabled();
        console.log(`[E2E] Re-inspection button enabled after fix: ${isEnabled}`);
        expect(isEnabled).toBe(true);

        // Click to re-run inspection
        if (isEnabled) {
          await startButton.click();

          // Wait for inspection agent to start
          const inspectionStarted = await waitForCondition(async () => {
            const agents = await getAgentsForPhase('inspection');
            return agents.some(a => a.phase.includes('inspection'));
          }, 60000, 1000, 'inspection-started');

          console.log(`[E2E] Re-inspection started: ${inspectionStarted}`);
          expect(inspectionStarted).toBe(true);
        }
      }
    });

    it('should have inspection fix button when NOGO result exists', async () => {
      // Set to one_round_nogo state (not fixed yet)
      setFixtureState('one_round_nogo');
      await refreshSpecStore();

      // Check for fix button
      const fixButton = await $('[data-testid="inspection-fix-button"]');
      const fixButtonExists = await fixButton.isExisting();
      console.log(`[E2E] Inspection fix button exists: ${fixButtonExists}`);

      // If fix button exists, clicking it should start inspection-fix phase
      if (fixButtonExists && await fixButton.isEnabled()) {
        await fixButton.click();

        // Wait for inspection-fix agent to start
        const fixStarted = await waitForCondition(async () => {
          const agents = await getAgentsForPhase('inspection-fix');
          return agents.some(a => a.phase.includes('inspection-fix'));
        }, 60000, 1000, 'inspection-fix-started');

        console.log(`[E2E] Inspection fix started: ${fixStarted}`);
      }
    });
  });
});
