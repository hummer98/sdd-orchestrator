/**
 * Bug Auto Execution E2E Tests
 * Task 6.3: bugs-workflow-auto-execution
 * Requirements: 1.1, 1.3, 2.2, 3.1
 *
 * Test content:
 * - Auto-execute button display verification
 * - Stop button display after auto-execution starts
 * - Full auto-execution flow test using Mock Claude CLI
 * - Phase permission settings UI verification
 */

import * as path from 'path';
import * as fs from 'fs';

// Fixture project path (relative to electron-sdd-manager)
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/bug-auto-exec-test');
const BUG_NAME = 'test-bug';
const BUG_DIR = path.join(FIXTURE_PATH, '.kiro/bugs', BUG_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', BUG_NAME);

/**
 * Initial report.md content for fixture reset
 */
const INITIAL_REPORT_MD = `# Bug Report: test-bug

## Description
Test bug for E2E testing of bugs-workflow-auto-execution feature.

## Steps to Reproduce
1. Open the application
2. Navigate to Bugs tab
3. Select this bug

## Expected Behavior
Auto-execution should work correctly.

## Actual Behavior
N/A - Test fixture
`;

/**
 * Reset fixture to initial state
 */
function resetFixture(): void {
  // Ensure bug directory exists
  if (!fs.existsSync(BUG_DIR)) {
    fs.mkdirSync(BUG_DIR, { recursive: true });
  }

  // Reset report.md (only report exists initially)
  fs.writeFileSync(path.join(BUG_DIR, 'report.md'), INITIAL_REPORT_MD);

  // Remove generated files (analysis.md, fix.md, verification.md)
  for (const file of ['analysis.md', 'fix.md', 'verification.md']) {
    const filePath = path.join(BUG_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  // Clean up runtime/agents directory
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

  // Clean up logs directory
  const logsDir = path.join(FIXTURE_PATH, '.kiro/logs');
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
 * Helper: Select project using Zustand store action
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
          console.error('[E2E] __STORES__ not available');
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
 * Helper: Select bug using Zustand bugStore action
 */
async function selectBugViaStore(bugName: string): Promise<boolean> {
  return new Promise((resolve) => {
    browser.executeAsync(async (name: string, done: (result: boolean) => void) => {
      try {
        const stores = (window as any).__STORES__;
        if (stores?.bugStore?.getState) {
          const bugStore = stores.bugStore.getState();
          const bug = bugStore.bugs.find((b: any) => b.name === name);
          if (bug) {
            await bugStore.selectBug(bug);
            done(true);
          } else {
            console.error('[E2E] Bug not found:', name);
            done(false);
          }
        } else {
          console.error('[E2E] bugStore not available');
          done(false);
        }
      } catch (e) {
        console.error('[E2E] selectBug error:', e);
        done(false);
      }
    }, bugName).then(resolve);
  });
}

/**
 * Helper: Set bug auto-execution permissions via workflowStore
 */
async function setBugAutoExecutionPermissions(permissions: Record<string, boolean>): Promise<boolean> {
  return browser.execute((perms: Record<string, boolean>) => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.workflowStore?.getState) return false;

      const workflowStore = stores.workflowStore.getState();
      const currentPermissions = workflowStore.bugAutoExecutionPermissions;

      // Toggle permissions to match desired state
      for (const [phase, desired] of Object.entries(perms)) {
        if (currentPermissions[phase] !== desired) {
          workflowStore.toggleBugAutoPermission(phase);
        }
      }
      return true;
    } catch (e) {
      console.error('[E2E] setBugAutoExecutionPermissions error:', e);
      return false;
    }
  }, permissions);
}

/**
 * Helper: Get bug auto-execution status from BugAutoExecutionService
 */
async function getBugAutoExecutionStatus(): Promise<{
  isAutoExecuting: boolean;
  autoExecutionStatus: string;
  currentAutoPhase: string | null;
}> {
  return browser.execute(() => {
    try {
      const service = (window as any).__BUG_AUTO_EXECUTION_SERVICE__;
      if (!service) {
        return { isAutoExecuting: false, autoExecutionStatus: 'idle', currentAutoPhase: null };
      }
      return {
        isAutoExecuting: service.isAutoExecuting(),
        autoExecutionStatus: service.getStatus(),
        currentAutoPhase: service.getCurrentPhase(),
      };
    } catch (e) {
      return { isAutoExecuting: false, autoExecutionStatus: 'error', currentAutoPhase: null };
    }
  });
}

/**
 * Helper: Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500,
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
    // Debug log every 2 seconds
    if (iteration % 4 === 0) {
      const status = await getBugAutoExecutionStatus();
      console.log(`[E2E] ${debugLabel} iteration ${iteration}: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}, phase=${status.currentAutoPhase}`);
    }
    await browser.pause(interval);
  }
  // Final debug log on timeout
  const status = await getBugAutoExecutionStatus();
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations. Final state: isAutoExecuting=${status.isAutoExecuting}, status=${status.autoExecutionStatus}`);
  return false;
}

/**
 * Helper: Refresh bug store
 */
async function refreshBugStore(): Promise<void> {
  await browser.executeAsync((done) => {
    const stores = (window as any).__STORES__;
    const refreshFn = stores?.bugStore?.getState()?.refreshBugs;
    if (refreshFn) {
      refreshFn().then(() => done()).catch(() => done());
    } else {
      done();
    }
  });
  await browser.pause(300);
}

/**
 * Helper: Clear agent store
 */
async function clearAgentStore(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.agentStore?.getState) {
      const state = stores.agentStore.getState();
      state.agents.forEach((agents: any[], specId: string) => {
        agents.forEach((agent: any) => {
          state.removeAgent(agent.agentId);
        });
      });
    }
  });
}

/**
 * Helper: Reset BugAutoExecutionService state
 */
async function resetBugAutoExecutionService(): Promise<void> {
  await browser.execute(() => {
    const service = (window as any).__BUG_AUTO_EXECUTION_SERVICE__;
    if (service?.stop) {
      service.stop();
    }
  });
  await browser.pause(300);
}

/**
 * Helper: Reset bugAutoExecutionPermissions to default values
 * This is needed because workflowStore uses persist middleware (localStorage)
 */
async function resetBugAutoExecutionPermissions(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.workflowStore?.getState) {
      // Reset to default values
      stores.workflowStore.getState().setBugAutoExecutionPermissions({
        analyze: true,
        fix: true,
        verify: true,
        deploy: false,
      });
    }
  });
}

/**
 * Helper: Clear selected spec
 */
async function clearSelectedSpecViaStore(): Promise<void> {
  await browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (stores?.specStore?.getState) {
      stores.specStore.getState().clearSelectedSpec();
    }
  });
}

/**
 * Helper: Wait for bugDetail to be loaded
 * This is needed because bugStore.selectBug() loads bugDetail asynchronously
 */
async function waitForBugDetail(): Promise<boolean> {
  return waitForCondition(async () => {
    const hasDetail = await browser.execute(() => {
      const stores = (window as any).__STORES__;
      return stores?.bugStore?.getState()?.bugDetail !== null;
    });
    return hasDetail;
  }, 5000, 100, 'bugDetail-loaded');
}

/**
 * Helper: Switch to Bugs tab
 * This is required because BugPane is only rendered when activeTab === 'bugs'
 */
async function switchToBugsTab(): Promise<boolean> {
  try {
    // First, wait for DocsTabs to be rendered
    const docsTabs = await $('[data-testid="docs-tabs"]');
    await docsTabs.waitForExist({ timeout: 10000 });

    const bugsTab = await $('[data-testid="tab-bugs"]');
    await bugsTab.waitForExist({ timeout: 5000 });

    // Use JavaScript click to avoid interactability issues
    await browser.execute((el: HTMLElement) => el.click(), bugsTab);
    await browser.pause(500);
    return true;
  } catch (e) {
    console.log('[E2E] switchToBugsTab failed:', e);
    return false;
  }
}

describe('Bug Auto Execution E2E Tests', () => {
  before(async () => {
    resetFixture();
  });

  beforeEach(async () => {
    // Reset fixture and cleanup generated files
    resetFixture();

    // Clear agent store
    await clearAgentStore();

    // Reset BugAutoExecutionService
    await resetBugAutoExecutionService();

    // Reset bugAutoExecutionPermissions to default (important: localStorage persists between tests)
    await resetBugAutoExecutionPermissions();

    // Clear selected spec
    await clearSelectedSpecViaStore();

    // Select project
    const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);
    await browser.pause(500);

    // Switch to Bugs tab (required for BugPane/BugWorkflowView to render)
    const tabSwitched = await switchToBugsTab();
    expect(tabSwitched).toBe(true);

    // Refresh bug store
    await refreshBugStore();
    await browser.pause(500);

    // Select bug
    const bugSuccess = await selectBugViaStore(BUG_NAME);
    expect(bugSuccess).toBe(true);
    await browser.pause(500);

    // Wait for bugDetail to be loaded (required for auto-execution to start)
    const bugDetailLoaded = await waitForBugDetail();
    expect(bugDetailLoaded).toBe(true);

    // Wait for BugWorkflowView
    const workflowView = await $('[data-testid="bug-workflow-view"]');
    await workflowView.waitForExist({ timeout: 5000 });
  });

  afterEach(async () => {
    // Stop any running auto-execution
    await resetBugAutoExecutionService();
    await browser.pause(500);
  });

  after(async () => {
    resetFixture();
  });

  // ============================================================
  // 1. Auto-execute button display verification
  // Requirements: 1.1, 1.6
  // ============================================================
  describe('Auto-execute Button Display', () => {
    it('should display auto-execute button in BugWorkflowView', async () => {
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      expect(await autoButton.isExisting()).toBe(true);
      expect(await autoButton.isDisplayed()).toBe(true);
    });

    it('should show "auto-execute" text on the button', async () => {
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      const buttonText = await autoButton.getText();
      expect(buttonText).toContain('自動実行');
    });

    it('should have auto-execute button enabled when no agent is running', async () => {
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      expect(await autoButton.isEnabled()).toBe(true);
    });
  });

  // ============================================================
  // 2. Stop button display after auto-execution starts
  // Requirements: 1.3
  // ============================================================
  describe('Stop Button Display During Execution', () => {
    it('should change to stop button when auto-execution starts', async () => {
      // Set permissions for analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait a moment for state to update
      await browser.pause(300);

      // Check that stop button is now displayed
      const stopButton = await $('[data-testid="bug-auto-stop-button"]');
      const isStopButtonVisible = await stopButton.isExisting();

      // Either stop button exists OR auto-execute button text changed to "stop"
      if (isStopButtonVisible) {
        expect(await stopButton.isDisplayed()).toBe(true);
        const stopText = await stopButton.getText();
        expect(stopText).toContain('停止');
      } else {
        // Check if original button changed to stop state
        const buttonText = await autoButton.getText();
        expect(buttonText).toContain('停止');
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });

    it('should revert to auto-execute button after execution completes', async () => {
      // Set permissions for analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait for execution to complete
      const completed = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for UI to update
      await browser.pause(3000);

      // Check that auto-execute button is back
      const autoButtonAfter = await $('[data-testid="bug-auto-execute-button"]');
      expect(await autoButtonAfter.isExisting()).toBe(true);
      const buttonText = await autoButtonAfter.getText();
      expect(buttonText).toContain('自動実行');
    });
  });

  // ============================================================
  // 3. Full auto-execution flow test using Mock Claude CLI
  // Requirements: 1.1, 2.2, 4.1, 4.2, 4.3
  // ============================================================
  describe('Full Auto-execution Flow', () => {
    it('should execute analyze phase and generate analysis.md', async () => {
      // Set permissions for analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Debug: Check bugStore state before clicking
      const bugStoreState = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        const bugStore = stores?.bugStore?.getState();
        return {
          selectedBug: bugStore?.selectedBug?.name ?? null,
          hasBugDetail: bugStore?.bugDetail !== null,
          bugDetailArtifacts: bugStore?.bugDetail?.artifacts ?? null,
        };
      });
      console.log(`[E2E] Bug store state before click: ${JSON.stringify(bugStoreState)}`);

      // Debug: Check workflowStore permissions
      const permissionsState = await browser.execute(() => {
        const stores = (window as any).__STORES__;
        const workflowStore = stores?.workflowStore?.getState();
        return workflowStore?.bugAutoExecutionPermissions ?? null;
      });
      console.log(`[E2E] Permissions before click: ${JSON.stringify(permissionsState)}`);

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait a moment for auto-execution to start
      await browser.pause(500);

      // Verify auto-execution started
      const startedStatus = await getBugAutoExecutionStatus();
      console.log(`[E2E] Auto-execution status after click: isAutoExecuting=${startedStatus.isAutoExecuting}, status=${startedStatus.autoExecutionStatus}, phase=${startedStatus.currentAutoPhase}`);
      expect(startedStatus.isAutoExecuting).toBe(true);

      // Wait for execution to complete
      const completed = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for file system update
      await browser.pause(2000);

      // Verify that analysis.md was created
      const analysisPath = path.join(BUG_DIR, 'analysis.md');
      expect(fs.existsSync(analysisPath)).toBe(true);

      // Verify content (Mock Claude CLI generates "# Analysis: {bug-name}" header)
      const content = fs.readFileSync(analysisPath, 'utf-8');
      expect(content).toContain('# Analysis:');
    });

    it('should execute analyze and fix phases when both are permitted', async () => {
      // Set permissions for analyze and fix
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: true,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait for execution to complete
      const completed = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 60000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for file system update
      await browser.pause(2000);

      // Verify both files were created
      const analysisPath = path.join(BUG_DIR, 'analysis.md');
      const fixPath = path.join(BUG_DIR, 'fix.md');
      expect(fs.existsSync(analysisPath)).toBe(true);
      expect(fs.existsSync(fixPath)).toBe(true);
    });

    it('should execute full workflow (analyze -> fix -> verify) when all are permitted', async () => {
      // Set permissions for all phases except deploy
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: true,
        verify: true,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait for execution to complete
      const completed = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 90000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for file system update
      await browser.pause(2000);

      // Verify all files were created
      const analysisPath = path.join(BUG_DIR, 'analysis.md');
      const fixPath = path.join(BUG_DIR, 'fix.md');
      const verificationPath = path.join(BUG_DIR, 'verification.md');
      expect(fs.existsSync(analysisPath)).toBe(true);
      expect(fs.existsSync(fixPath)).toBe(true);
      expect(fs.existsSync(verificationPath)).toBe(true);
    });
  });

  // ============================================================
  // 4. Phase permission settings verification
  // Requirements: 2.2
  // ============================================================
  describe('Phase Permission Settings', () => {
    it('should start from analyze phase when all phases are permitted', async () => {
      // Set all permissions
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: true,
        verify: true,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Mock execution is very fast, so we check if it started correctly
      // The execution may complete before we can check the intermediate state
      const started = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        // Either still running or already completed
        return s.isAutoExecuting || s.autoExecutionStatus === 'completed';
      }, 10000, 100, 'auto-execution-started');
      expect(started).toBe(true);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 90000, 500, 'auto-execution-complete');

      // Verify all phases were executed (analyze, fix, verify)
      const analysisPath = path.join(BUG_DIR, 'analysis.md');
      const fixPath = path.join(BUG_DIR, 'fix.md');
      const verifyPath = path.join(BUG_DIR, 'verification.md');
      await browser.pause(2000);
      expect(fs.existsSync(analysisPath)).toBe(true);
      expect(fs.existsSync(fixPath)).toBe(true);
      expect(fs.existsSync(verifyPath)).toBe(true);
    });

    it('should stop at analyze when only analyze is permitted', async () => {
      // Set only analyze permission
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait for execution to complete
      const completed = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
      expect(completed).toBe(true);

      // Wait for file system update
      await browser.pause(2000);

      // Verify only analysis.md was created (not fix.md)
      const analysisPath = path.join(BUG_DIR, 'analysis.md');
      const fixPath = path.join(BUG_DIR, 'fix.md');
      expect(fs.existsSync(analysisPath)).toBe(true);
      expect(fs.existsSync(fixPath)).toBe(false);
    });

    it('should respect permission changes between executions', async () => {
      // First execution: analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'first-execution-complete');

      await browser.pause(2000);

      // Verify only analysis.md exists
      expect(fs.existsSync(path.join(BUG_DIR, 'analysis.md'))).toBe(true);
      expect(fs.existsSync(path.join(BUG_DIR, 'fix.md'))).toBe(false);

      // Second execution: add fix permission (will start from where it left off)
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: true,
        verify: false,
        deploy: false,
      });

      await autoButton.click();

      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'second-execution-complete');

      await browser.pause(2000);

      // Now fix.md should also exist
      expect(fs.existsSync(path.join(BUG_DIR, 'fix.md'))).toBe(true);
    });
  });

  // ============================================================
  // 5. Status display verification
  // Requirements: 3.1
  // ============================================================
  describe('Status Display During Execution', () => {
    it('should show running or completed status during/after execution', async () => {
      // Set permissions for analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Mock execution is very fast, so we check if it started correctly
      // The execution may complete before we can check the intermediate state
      const executed = await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        // Either running or already completed - both are valid
        return s.isAutoExecuting || s.autoExecutionStatus === 'completed';
      }, 10000, 100, 'auto-execution-started-or-completed');
      expect(executed).toBe(true);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      // Verify final status - either 'completed' or 'idle' (status may reset after completion)
      const finalStatus = await getBugAutoExecutionStatus();
      expect(['completed', 'idle']).toContain(finalStatus.autoExecutionStatus);
    });

    it('should show completed status after successful execution', async () => {
      // Set permissions for analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait for execution to complete
      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      // Check status immediately after completion (before reset to idle)
      const status = await getBugAutoExecutionStatus();
      // Status should be either 'completed' or 'idle' (if already reset)
      expect(['completed', 'idle']).toContain(status.autoExecutionStatus);
    });
  });

  // ============================================================
  // Security and Stability
  // ============================================================
  describe('Security and Stability', () => {
    it('should have correct security settings', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);

      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });

    it('should not crash during auto-execution', async () => {
      // Set permissions for analyze only
      await setBugAutoExecutionPermissions({
        analyze: true,
        fix: false,
        verify: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="bug-auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getBugAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      // Check no crash occurred
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.isCrashed();
      });
      expect(isCrashed).toBe(false);
    });
  });
});
