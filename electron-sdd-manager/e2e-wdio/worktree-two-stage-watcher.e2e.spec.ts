/**
 * Worktree Two-Stage Watcher E2E Tests
 *
 * Task 10: E2E tests for spec-path-ssot-refactor
 *
 * Tests for the two-stage monitoring system:
 * 1. Stage 1: Monitor .kiro/worktrees/{type}/ for new worktree directory additions
 * 2. Stage 2: Dynamically add inner path monitoring when worktree detected
 *
 * Test Scenarios:
 * - 10.1: Worktree conversion triggers UI auto-update
 * - 10.2: spec.json update inside worktree triggers UI update
 * - 10.3: bug.json update inside worktree triggers UI update
 * - 10.4: Backward compatibility with existing worktree field
 *
 * Prerequisites:
 * - Run with: task electron:test:e2e
 * - Test fixtures are in e2e-wdio/fixtures/worktree-spec-sync-test/
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  ensureProjectSelected,
  selectSpecViaUI,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetSpecStoreAutoExecution,
  stopAutoExecution,
  resetAutoExecutionCoordinator,
} from './helpers/auto-execution.helpers';

// Fixture project path
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/worktree-spec-sync-test');
const MAIN_SPEC_NAME = 'main-spec';
const WORKTREE_SPEC_NAME = 'worktree-spec';

// Spec directories
const MAIN_SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', MAIN_SPEC_NAME);
const WORKTREE_SPEC_DIR = path.join(
  FIXTURE_PATH,
  '.kiro/worktrees/specs',
  WORKTREE_SPEC_NAME,
  '.kiro/specs',
  WORKTREE_SPEC_NAME
);

// Bug directories
const MAIN_BUG_NAME = 'main-bug';
const WORKTREE_BUG_NAME = 'worktree-bug';
const MAIN_BUG_DIR = path.join(FIXTURE_PATH, '.kiro/bugs', MAIN_BUG_NAME);
const WORKTREE_BUG_DIR = path.join(
  FIXTURE_PATH,
  '.kiro/worktrees/bugs',
  WORKTREE_BUG_NAME,
  '.kiro/bugs',
  WORKTREE_BUG_NAME
);

// Initial json contents (saved for reset)
let INITIAL_MAIN_SPEC_JSON: any = null;
let INITIAL_WORKTREE_SPEC_JSON: any = null;
let INITIAL_WORKTREE_BUG_JSON: any = null;

/**
 * Read and save initial state
 */
function saveInitialState(): void {
  try {
    INITIAL_MAIN_SPEC_JSON = JSON.parse(
      fs.readFileSync(path.join(MAIN_SPEC_DIR, 'spec.json'), 'utf-8')
    );
    INITIAL_WORKTREE_SPEC_JSON = JSON.parse(
      fs.readFileSync(path.join(WORKTREE_SPEC_DIR, 'spec.json'), 'utf-8')
    );
    if (fs.existsSync(path.join(WORKTREE_BUG_DIR, 'bug.json'))) {
      INITIAL_WORKTREE_BUG_JSON = JSON.parse(
        fs.readFileSync(path.join(WORKTREE_BUG_DIR, 'bug.json'), 'utf-8')
      );
    }
  } catch (e) {
    console.warn('[E2E] Could not read initial state:', e);
  }
}

/**
 * Reset spec.json to initial state
 */
function resetMainSpec(): void {
  if (INITIAL_MAIN_SPEC_JSON) {
    fs.writeFileSync(
      path.join(MAIN_SPEC_DIR, 'spec.json'),
      JSON.stringify(INITIAL_MAIN_SPEC_JSON, null, 2)
    );
  }
}

function resetWorktreeSpec(): void {
  if (INITIAL_WORKTREE_SPEC_JSON) {
    fs.writeFileSync(
      path.join(WORKTREE_SPEC_DIR, 'spec.json'),
      JSON.stringify(INITIAL_WORKTREE_SPEC_JSON, null, 2)
    );
  }
}

function resetWorktreeBug(): void {
  if (INITIAL_WORKTREE_BUG_JSON && fs.existsSync(WORKTREE_BUG_DIR)) {
    fs.writeFileSync(
      path.join(WORKTREE_BUG_DIR, 'bug.json'),
      JSON.stringify(INITIAL_WORKTREE_BUG_JSON, null, 2)
    );
  }
}

/**
 * Reset all fixtures
 */
function resetFixtures(): void {
  resetMainSpec();
  resetWorktreeSpec();
  resetWorktreeBug();
}

/**
 * Get the phase badge text for a specific spec item in the spec list UI
 */
async function getSpecPhaseBadgeText(specName: string): Promise<string> {
  return browser.execute((name: string) => {
    const specItem = document.querySelector(`[data-testid="spec-item-${name}"]`);
    if (!specItem) return '';
    const badge = specItem.querySelector('[data-testid="phase-badge"]');
    return badge?.textContent || '';
  }, specName);
}

/**
 * Check if a spec item has a worktree badge in the UI
 */
async function hasWorktreeBadgeInUI(specName: string): Promise<boolean> {
  return browser.execute((name: string) => {
    const specItem = document.querySelector(`[data-testid="spec-item-${name}"]`);
    if (!specItem) return false;
    const badge = specItem.querySelector('[data-testid="worktree-badge"]');
    return badge !== null;
  }, specName);
}

/**
 * Wait for condition with debug logging
 */
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 20000,
  interval: number = 500,
  debugLabel: string = 'condition'
): Promise<boolean> {
  const startTime = Date.now();
  let iteration = 0;
  while (Date.now() - startTime < timeout) {
    iteration++;
    const result = await condition();
    if (result) {
      console.log(
        `[E2E] ${debugLabel} met after ${iteration} iterations (${Date.now() - startTime}ms)`
      );
      return true;
    }
    if (iteration % 4 === 0) {
      console.log(`[E2E] ${debugLabel} iteration ${iteration}: waiting...`);
    }
    await browser.pause(interval);
  }
  console.log(`[E2E] ${debugLabel} TIMEOUT after ${iteration} iterations`);
  return false;
}

/**
 * Get bug names from UI (bug-list-items内のbug-item-*要素)
 */
async function getBugNamesFromUI(): Promise<string[]> {
  return browser.execute(() => {
    const items = document.querySelectorAll('[data-testid^="bug-item-"]');
    return Array.from(items).map(el => {
      const testId = el.getAttribute('data-testid') || '';
      return testId.replace('bug-item-', '');
    });
  });
}

/**
 * Get phase badge text for a specific bug item in the UI
 */
async function getBugPhaseBadgeText(bugName: string): Promise<string> {
  return browser.execute((name: string) => {
    const bugItem = document.querySelector(`[data-testid="bug-item-${name}"]`);
    if (!bugItem) return '';
    const badge = bugItem.querySelector('[data-testid="phase-badge"]');
    return badge?.textContent || '';
  }, bugName);
}

/**
 * Check if a bug item is visible in the UI
 */
async function isBugVisibleInUI(bugName: string): Promise<boolean> {
  const bugItem = await $(`[data-testid="bug-item-${bugName}"]`);
  return bugItem.isExisting();
}

describe('Worktree Two-Stage Watcher E2E', () => {
  // ============================================================
  // Test Setup
  // ============================================================
  before(async () => {
    saveInitialState();
  });

  after(async () => {
    resetFixtures();
  });

  // ============================================================
  // Scenario 10.2: spec.json update inside worktree triggers UI update
  // Requirements: 2.1, 2.5 (spec.json更新→UI更新)
  // ============================================================
  describe('Scenario 10.2: spec.json update inside worktree triggers UI update', () => {
    beforeEach(async () => {
      resetFixtures();

      await clearAgentStore();
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(300);
      resetFixtures();
    });

    it('should update UI when spec.json inside worktree is modified', async () => {
      // 1. Select worktree spec
      const specSuccess = await selectSpecViaUI(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // 2. Get initial phase from UI (phase-badge text in spec-list)
      const initialPhaseBadge = await getSpecPhaseBadgeText(WORKTREE_SPEC_NAME);
      console.log('[E2E] Initial worktree spec phase badge:', initialPhaseBadge);

      // Read spec.json to determine original phase for toggling
      const specJsonPath = path.join(WORKTREE_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      const originalPhase = specJson.phase;
      // Use 'design-generated' (設計済) as the new phase for clear UI detection
      const newPhase = originalPhase === 'design-generated' ? 'requirements-generated' : 'design-generated';
      // Expected label: 'design-generated' -> '設計済', 'requirements-generated' -> '要件定義済'
      const expectedLabel = newPhase === 'design-generated' ? '設計済' : '要件定義済';

      // 3. Directly modify spec.json inside worktree
      specJson.phase = newPhase;
      specJson.description = 'Updated by E2E test - worktree watcher verification';
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
      console.log('[E2E] spec.json updated directly, new phase:', newPhase);

      // 4. Wait for file watcher to update UI (without manual refresh)
      // Two-stage watcher: awaitWriteFinish + debounce + event propagation
      const updated = await waitForCondition(
        async () => {
          const badgeText = await getSpecPhaseBadgeText(WORKTREE_SPEC_NAME);
          const hasNewPhase = badgeText === expectedLabel;
          if (!hasNewPhase) {
            console.log('[E2E] Waiting for phase update... current badge:', badgeText);
          }
          return hasNewPhase;
        },
        20000,
        500,
        'worktree-spec-json-phase-update'
      );

      // 5. Verify result - UI要素で検証
      const finalPhaseBadge = await getSpecPhaseBadgeText(WORKTREE_SPEC_NAME);
      console.log('[E2E] Final worktree spec phase badge:', finalPhaseBadge);

      expect(updated).toBe(true);
      expect(finalPhaseBadge).toBe(expectedLabel);
    });

    it('should update spec list when spec.json inside worktree is modified', async () => {
      // 1. Get initial phase badge from spec list UI
      const initialPhaseBadge = await getSpecPhaseBadgeText(WORKTREE_SPEC_NAME);
      console.log('[E2E] Initial worktree spec phase badge:', initialPhaseBadge);

      // Read spec.json to determine phase for toggling
      const specJsonPath = path.join(WORKTREE_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      const originalPhase = specJson.phase;
      // Use 'requirements-generated' (要件定義済) for clear detection
      const newPhase = originalPhase === 'requirements-generated' ? 'design-generated' : 'requirements-generated';
      const expectedLabel = newPhase === 'requirements-generated' ? '要件定義済' : '設計済';

      // 2. Directly modify spec.json inside worktree
      specJson.phase = newPhase;
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
      console.log('[E2E] spec.json updated directly, new phase:', newPhase);

      // 3. Wait for file watcher to update spec list - UI要素で確認
      const updated = await waitForCondition(
        async () => {
          const badgeText = await getSpecPhaseBadgeText(WORKTREE_SPEC_NAME);
          return badgeText === expectedLabel;
        },
        20000,
        500,
        'worktree-spec-list-phase-update'
      );

      // 4. Verify result - UI要素で検証
      const finalPhaseBadge = await getSpecPhaseBadgeText(WORKTREE_SPEC_NAME);
      console.log('[E2E] Final worktree spec phase badge:', finalPhaseBadge);

      expect(updated).toBe(true);
      expect(finalPhaseBadge).toBe(expectedLabel);
    });
  });

  // ============================================================
  // Scenario 10.4: Backward compatibility - existing worktree field
  // Requirements: 9.1, 9.2 (spec.json/bug.json形式無変更, worktreeフィールド継続動作)
  // ============================================================
  describe('Scenario 10.4: Backward compatibility with existing worktree field', () => {
    beforeEach(async () => {
      resetFixtures();

      await clearAgentStore();
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();
      await browser.pause(500);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(300);
    });

    it('should correctly read worktree field from spec.json', async () => {
      // Read spec.json directly
      const specJsonPath = path.join(WORKTREE_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));

      console.log('[E2E] spec.json worktree field:', JSON.stringify(specJson.worktree, null, 2));

      // Verify worktree field structure
      expect(specJson.worktree).toBeDefined();
      expect(specJson.worktree.enabled).toBe(true);
      expect(specJson.worktree.path).toBeDefined();
      expect(specJson.worktree.branch).toBeDefined();
    });

    it('should reflect worktree field in UI (worktree badge visible)', async () => {
      // Select worktree spec
      const specSuccess = await selectSpecViaUI(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Verify worktree badge is visible in the spec list UI
      const hasWorktreeBadge = await hasWorktreeBadgeInUI(WORKTREE_SPEC_NAME);
      console.log('[E2E] Worktree spec has worktree badge in UI:', hasWorktreeBadge);
      expect(hasWorktreeBadge).toBe(true);
    });

    it('should display main spec without worktree badge', async () => {
      // Read main spec.json directly
      const specJsonPath = path.join(MAIN_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));

      console.log('[E2E] Main spec.json worktree field:', specJson.worktree);

      // Verify no worktree field in file (null or undefined)
      expect(specJson.worktree == null).toBe(true);

      // Select main spec
      const specSuccess = await selectSpecViaUI(MAIN_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Verify no worktree badge in the spec list UI for main spec
      const hasWorktreeBadge = await hasWorktreeBadgeInUI(MAIN_SPEC_NAME);
      console.log('[E2E] Main spec has worktree badge in UI:', hasWorktreeBadge);
      expect(hasWorktreeBadge).toBe(false);
    });
  });

  // ============================================================
  // Scenario 10.3: bug.json update inside worktree triggers UI update
  // Requirements: 3.1, 3.5 (bug.json更新→UI更新)
  // ============================================================
  describe('Scenario 10.3: bug.json update inside worktree triggers UI update', () => {
    beforeEach(async () => {
      resetFixtures();

      await clearAgentStore();
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);

      // Switch to Bugs tab (bug items are only visible when Bugs tab is active)
      const bugsTab = await $('[data-testid="tab-bugs"]');
      if (await bugsTab.isExisting()) {
        await bugsTab.click();
        await browser.pause(500);
      }
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(300);
      resetFixtures();
    });

    it('should display worktree bug in bug list', async () => {
      // Verify worktree bug exists in UI
      const bugNames = await getBugNamesFromUI();
      console.log('[E2E] Bug names from UI:', bugNames);

      const isVisible = await isBugVisibleInUI(WORKTREE_BUG_NAME);
      expect(isVisible).toBe(true);
    });

    it('should update bug list when bug.json inside worktree is modified', async () => {
      // Skip if worktree bug fixture doesn't exist
      if (!fs.existsSync(path.join(WORKTREE_BUG_DIR, 'bug.json'))) {
        console.log('[E2E] Skipping test - worktree bug fixture not found');
        return;
      }

      // 1. Get initial phase badge from UI
      const initialPhaseBadge = await getBugPhaseBadgeText(WORKTREE_BUG_NAME);
      console.log('[E2E] Initial worktree bug phase badge:', initialPhaseBadge);

      // Read bug.json to determine phase for toggling
      const bugJsonPath = path.join(WORKTREE_BUG_DIR, 'bug.json');
      const bugJson = JSON.parse(fs.readFileSync(bugJsonPath, 'utf-8'));
      const originalPhase = bugJson.phase || 'analyzed';
      const newPhase = originalPhase === 'analyzed' ? 'fixed' : 'analyzed';
      // Bug phase labels: 'analyzed' -> '分析済', 'fixed' -> '修正済'
      const expectedLabel = newPhase === 'fixed' ? '修正済' : '分析済';

      // 2. Directly modify bug.json inside worktree
      bugJson.phase = newPhase;
      bugJson.description = 'Updated by E2E test - worktree bug watcher verification';
      fs.writeFileSync(bugJsonPath, JSON.stringify(bugJson, null, 2));
      console.log('[E2E] bug.json updated directly, new phase:', newPhase);

      // 3. Wait for file watcher to update bug list - UI要素で確認
      const updated = await waitForCondition(
        async () => {
          const badgeText = await getBugPhaseBadgeText(WORKTREE_BUG_NAME);
          const hasNewPhase = badgeText === expectedLabel;
          if (!hasNewPhase) {
            console.log('[E2E] Waiting for bug phase update... current badge:', badgeText);
          }
          return hasNewPhase;
        },
        20000,
        500,
        'worktree-bug-json-phase-update'
      );

      // 4. Verify result - UI要素で検証
      const finalPhaseBadge = await getBugPhaseBadgeText(WORKTREE_BUG_NAME);
      console.log('[E2E] Final worktree bug phase badge:', finalPhaseBadge);

      expect(updated).toBe(true);
      expect(finalPhaseBadge).toBe(expectedLabel);
    });

    it('should detect worktree bug with worktree field', async () => {
      // Skip if worktree bug fixture doesn't exist
      if (!fs.existsSync(path.join(WORKTREE_BUG_DIR, 'bug.json'))) {
        console.log('[E2E] Skipping test - worktree bug fixture not found');
        return;
      }

      // Read bug.json directly
      const bugJsonPath = path.join(WORKTREE_BUG_DIR, 'bug.json');
      const bugJson = JSON.parse(fs.readFileSync(bugJsonPath, 'utf-8'));

      console.log('[E2E] bug.json worktree field:', JSON.stringify(bugJson.worktree, null, 2));

      // Verify worktree field structure
      expect(bugJson.worktree).toBeDefined();
      expect(bugJson.worktree.enabled).toBe(true);
      expect(bugJson.worktree.path).toBeDefined();
      expect(bugJson.worktree.branch).toBeDefined();
    });
  });

  // ============================================================
  // Security and Stability (standard checks)
  // ============================================================
  describe('Security and Stability', () => {
    it('should have contextIsolation enabled', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        return win?.webContents.getLastWebPreferences()?.contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('should have nodeIntegration disabled', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        return win?.webContents.getLastWebPreferences()?.nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });

    it('should not crash during file watcher operations', async () => {
      const crashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows.length > 0 ? windows[0].webContents.isCrashed() : true;
      });
      expect(crashed).toBe(false);
    });
  });
});
