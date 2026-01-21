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
 * Get all specs from the store
 */
async function getAllSpecsFromStore(): Promise<
  Array<{ name: string; phase: string; worktree?: { path?: string; branch?: string } }>
> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.specStore?.getState) return [];
    return stores.specStore.getState().specs.map((s: any) => ({
      name: s.name,
      phase: s.phase,
      worktree: s.worktree,
    }));
  });
}

/**
 * Get currently selected spec from the store
 */
async function getSelectedSpecFromStore(): Promise<{
  name: string;
  phase: string;
  worktree?: { enabled?: boolean; path?: string; branch?: string };
} | null> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.specStore?.getState) return null;
    const spec = stores.specStore.getState().specDetail?.metadata;
    if (!spec) return null;
    return {
      name: spec.name,
      phase: spec.phase,
      worktree: spec.worktree,
    };
  });
}

/**
 * Get spec detail including specJson phase
 */
async function getSpecDetail(): Promise<{
  phase: string | null;
  description: string | null;
}> {
  return browser.execute(() => {
    try {
      const stores = (window as any).__STORES__;
      if (!stores?.specStore?.getState) {
        return { phase: null, description: null };
      }
      const specDetail = stores.specStore.getState().specDetail;
      if (!specDetail) {
        return { phase: null, description: null };
      }
      return {
        phase: specDetail.specJson?.phase || specDetail.metadata?.phase || null,
        description: specDetail.specJson?.description || specDetail.metadata?.description || null,
      };
    } catch (e) {
      return { phase: null, description: null };
    }
  });
}

/**
 * Wait for condition with debug logging
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
 * Get bugs list from bugStore
 */
async function getBugsFromStore(): Promise<Array<{ name: string; phase: string }>> {
  return browser.execute(() => {
    const stores = (window as any).__STORES__;
    if (!stores?.bugStore?.getState) return [];
    return stores.bugStore.getState().bugs.map((b: any) => ({
      name: b.name,
      phase: b.phase,
    }));
  });
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

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
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
      const specSuccess = await selectSpecViaStore(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // 2. Get initial phase
      const initialDetail = await getSpecDetail();
      console.log('[E2E] Initial worktree spec phase:', initialDetail.phase);

      // Save original for comparison
      const originalPhase = initialDetail.phase;
      const newPhase = originalPhase === 'implementation' ? 'tasks-generated' : 'implementation';

      // 3. Directly modify spec.json inside worktree
      const specJsonPath = path.join(WORKTREE_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      specJson.phase = newPhase;
      specJson.description = 'Updated by E2E test - worktree watcher verification';
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
      console.log('[E2E] spec.json updated directly, new phase:', newPhase);

      // 4. Wait for file watcher to update UI (without manual refresh)
      // Two-stage watcher: awaitWriteFinish + debounce ≈ 500-800ms
      const updated = await waitForCondition(
        async () => {
          const detail = await getSpecDetail();
          const hasNewPhase = detail.phase === newPhase;
          if (!hasNewPhase) {
            console.log('[E2E] Waiting for phase update... current:', detail.phase);
          }
          return hasNewPhase;
        },
        15000,
        500,
        'worktree-spec-json-phase-update'
      );

      // 5. Verify result
      const finalDetail = await getSpecDetail();
      console.log('[E2E] Final worktree spec phase:', finalDetail.phase);
      console.log('[E2E] Final description:', finalDetail.description);

      expect(updated).toBe(true);
      expect(finalDetail.phase).toBe(newPhase);
    });

    it('should update spec list when spec.json inside worktree is modified', async () => {
      // 1. Get initial specs list
      const initialSpecs = await getAllSpecsFromStore();
      const initialWorktreeSpec = initialSpecs.find((s) => s.name === WORKTREE_SPEC_NAME);
      console.log('[E2E] Initial worktree spec:', JSON.stringify(initialWorktreeSpec));

      const originalPhase = initialWorktreeSpec?.phase || 'implementation';
      const newPhase = originalPhase === 'implementation' ? 'design-generated' : 'implementation';

      // 2. Directly modify spec.json inside worktree
      const specJsonPath = path.join(WORKTREE_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));
      specJson.phase = newPhase;
      fs.writeFileSync(specJsonPath, JSON.stringify(specJson, null, 2));
      console.log('[E2E] spec.json updated directly, new phase:', newPhase);

      // 3. Wait for file watcher to update spec list
      const updated = await waitForCondition(
        async () => {
          const specs = await getAllSpecsFromStore();
          const worktreeSpec = specs.find((s) => s.name === WORKTREE_SPEC_NAME);
          return worktreeSpec?.phase === newPhase;
        },
        15000,
        500,
        'worktree-spec-list-phase-update'
      );

      // 4. Verify result
      const finalSpecs = await getAllSpecsFromStore();
      const finalWorktreeSpec = finalSpecs.find((s) => s.name === WORKTREE_SPEC_NAME);
      console.log('[E2E] Final worktree spec:', JSON.stringify(finalWorktreeSpec));

      expect(updated).toBe(true);
      expect(finalWorktreeSpec?.phase).toBe(newPhase);
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

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
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

    it('should reflect worktree field in UI (specStore)', async () => {
      // Select worktree spec
      const specSuccess = await selectSpecViaStore(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Get selected spec from store
      const selectedSpec = await getSelectedSpecFromStore();
      console.log('[E2E] Selected spec worktree info:', JSON.stringify(selectedSpec?.worktree));

      // Verify worktree info is reflected in store
      expect(selectedSpec?.worktree).toBeDefined();
      expect(selectedSpec?.worktree?.enabled).toBe(true);
    });

    it('should display main spec without worktree field correctly', async () => {
      // Read main spec.json directly
      const specJsonPath = path.join(MAIN_SPEC_DIR, 'spec.json');
      const specJson = JSON.parse(fs.readFileSync(specJsonPath, 'utf-8'));

      console.log('[E2E] Main spec.json worktree field:', specJson.worktree);

      // Verify no worktree field
      expect(specJson.worktree).toBeUndefined();

      // Select main spec
      const specSuccess = await selectSpecViaStore(MAIN_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Get selected spec from store
      const selectedSpec = await getSelectedSpecFromStore();
      console.log('[E2E] Selected main spec worktree info:', selectedSpec?.worktree);

      // Verify no worktree info in store
      expect(selectedSpec?.worktree).toBeUndefined();
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

      const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
      expect(projectSuccess).toBe(true);
      await browser.pause(1000);
    });

    afterEach(async () => {
      await stopAutoExecution();
      await browser.pause(300);
      resetFixtures();
    });

    it('should display worktree bug in bug list', async () => {
      // Get all bugs from store
      const bugs = await getBugsFromStore();
      console.log('[E2E] Bugs in store:', JSON.stringify(bugs, null, 2));

      // Verify worktree bug exists
      const bugNames = bugs.map((b) => b.name);
      expect(bugNames).toContain(WORKTREE_BUG_NAME);
    });

    it('should update bug list when bug.json inside worktree is modified', async () => {
      // Skip if worktree bug fixture doesn't exist
      if (!fs.existsSync(path.join(WORKTREE_BUG_DIR, 'bug.json'))) {
        console.log('[E2E] Skipping test - worktree bug fixture not found');
        return;
      }

      // 1. Get initial bugs list
      const initialBugs = await getBugsFromStore();
      const initialWorktreeBug = initialBugs.find((b) => b.name === WORKTREE_BUG_NAME);
      console.log('[E2E] Initial worktree bug:', JSON.stringify(initialWorktreeBug));

      const originalPhase = initialWorktreeBug?.phase || 'analyzed';
      const newPhase = originalPhase === 'analyzed' ? 'fixed' : 'analyzed';

      // 2. Directly modify bug.json inside worktree
      const bugJsonPath = path.join(WORKTREE_BUG_DIR, 'bug.json');
      const bugJson = JSON.parse(fs.readFileSync(bugJsonPath, 'utf-8'));
      bugJson.phase = newPhase;
      bugJson.description = 'Updated by E2E test - worktree bug watcher verification';
      fs.writeFileSync(bugJsonPath, JSON.stringify(bugJson, null, 2));
      console.log('[E2E] bug.json updated directly, new phase:', newPhase);

      // 3. Wait for file watcher to update bug list
      const updated = await waitForCondition(
        async () => {
          const bugs = await getBugsFromStore();
          const worktreeBug = bugs.find((b) => b.name === WORKTREE_BUG_NAME);
          const hasNewPhase = worktreeBug?.phase === newPhase;
          if (!hasNewPhase) {
            console.log('[E2E] Waiting for bug phase update... current:', worktreeBug?.phase);
          }
          return hasNewPhase;
        },
        15000,
        500,
        'worktree-bug-json-phase-update'
      );

      // 4. Verify result
      const finalBugs = await getBugsFromStore();
      const finalWorktreeBug = finalBugs.find((b) => b.name === WORKTREE_BUG_NAME);
      console.log('[E2E] Final worktree bug:', JSON.stringify(finalWorktreeBug));

      expect(updated).toBe(true);
      expect(finalWorktreeBug?.phase).toBe(newPhase);
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
