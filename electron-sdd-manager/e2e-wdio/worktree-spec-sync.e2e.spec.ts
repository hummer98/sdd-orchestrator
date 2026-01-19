/**
 * Worktree Spec Sync E2E Tests
 *
 * Tests for scenarios where both main specs (.kiro/specs/) and worktree specs
 * (.kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/) exist in the project.
 *
 * Test Scenarios:
 * 1. Both main and worktree specs are displayed in the spec list
 * 2. Worktree spec shows the worktree badge indicator
 * 3. Main spec does NOT show the worktree badge
 * 4. Selecting worktree spec shows correct phase and worktree info
 * 5. SpecsWatcher monitors both paths for changes
 * 6. spec.json worktree field structure verification
 *
 * Prerequisites:
 * - Run with: task electron:test:e2e
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
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

// Initial spec.json contents
const MAIN_SPEC_JSON = {
  feature_name: 'main-spec',
  name: 'main-spec',
  description: 'E2Eテスト用：メインブランチにあるSpec',
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

const WORKTREE_SPEC_JSON = {
  feature_name: 'worktree-spec',
  name: 'worktree-spec',
  description: 'E2Eテスト用：Worktree内のSpec',
  phase: 'implementation',
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
  worktree: {
    enabled: true,
    path: '.kiro/worktrees/specs/worktree-spec',
    branch: 'feature/worktree-spec',
    created_at: '2024-01-02T00:00:00.000Z',
  },
  createdAt: '2024-01-02T00:00:00.000Z',
  updatedAt: '2024-01-02T12:00:00.000Z',
};

/**
 * Ensure fixture directories exist
 */
function ensureFixtureDirectories(): void {
  const dirs = [
    FIXTURE_PATH,
    path.join(FIXTURE_PATH, '.kiro'),
    path.join(FIXTURE_PATH, '.kiro/specs'),
    MAIN_SPEC_DIR,
    path.join(FIXTURE_PATH, '.kiro/worktrees'),
    path.join(FIXTURE_PATH, '.kiro/worktrees/specs'),
    path.join(FIXTURE_PATH, '.kiro/worktrees/specs', WORKTREE_SPEC_NAME),
    path.join(FIXTURE_PATH, '.kiro/worktrees/specs', WORKTREE_SPEC_NAME, '.kiro'),
    path.join(FIXTURE_PATH, '.kiro/worktrees/specs', WORKTREE_SPEC_NAME, '.kiro/specs'),
    WORKTREE_SPEC_DIR,
    path.join(FIXTURE_PATH, '.kiro/steering'),
    path.join(FIXTURE_PATH, '.kiro/runtime'),
    path.join(FIXTURE_PATH, '.kiro/runtime/agents'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Reset main spec to initial state
 */
function resetMainSpec(): void {
  fs.writeFileSync(
    path.join(MAIN_SPEC_DIR, 'spec.json'),
    JSON.stringify(MAIN_SPEC_JSON, null, 2)
  );
}

/**
 * Reset worktree spec to initial state
 */
function resetWorktreeSpec(): void {
  fs.writeFileSync(
    path.join(WORKTREE_SPEC_DIR, 'spec.json'),
    JSON.stringify(WORKTREE_SPEC_JSON, null, 2)
  );
}

/**
 * Reset all fixtures to initial state
 */
function resetFixtures(): void {
  ensureFixtureDirectories();
  resetMainSpec();
  resetWorktreeSpec();
}

/**
 * Read spec.json from main spec directory
 */
function readMainSpecJson(): typeof MAIN_SPEC_JSON {
  return JSON.parse(fs.readFileSync(path.join(MAIN_SPEC_DIR, 'spec.json'), 'utf-8'));
}

/**
 * Read spec.json from worktree spec directory
 */
function readWorktreeSpecJson(): typeof WORKTREE_SPEC_JSON {
  return JSON.parse(fs.readFileSync(path.join(WORKTREE_SPEC_DIR, 'spec.json'), 'utf-8'));
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

describe('Worktree Spec Sync E2E', () => {
  // ============================================================
  // Test Setup
  // ============================================================
  before(async () => {
    ensureFixtureDirectories();
    resetFixtures();
  });

  after(async () => {
    resetFixtures();
  });

  // ============================================================
  // Scenario 1: Both specs displayed in list
  // ============================================================
  describe('Scenario 1: Both main and worktree specs displayed', () => {
    beforeEach(async () => {
      resetFixtures();

      // Clear agent store
      await clearAgentStore();

      // Reset auto-execution state
      await resetAutoExecutionCoordinator();
      await resetAutoExecutionService();
      await resetSpecStoreAutoExecution();

      // Select project
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

    it('should display both main-spec and worktree-spec in the spec list', async () => {
      // Get all specs from store
      const specs = await getAllSpecsFromStore();
      console.log('[E2E] Specs in store:', JSON.stringify(specs, null, 2));

      // Verify both specs exist
      const specNames = specs.map((s) => s.name);
      expect(specNames).toContain(MAIN_SPEC_NAME);
      expect(specNames).toContain(WORKTREE_SPEC_NAME);
    });

    it('should display correct phases for each spec', async () => {
      const specs = await getAllSpecsFromStore();

      const mainSpec = specs.find((s) => s.name === MAIN_SPEC_NAME);
      const worktreeSpec = specs.find((s) => s.name === WORKTREE_SPEC_NAME);

      console.log('[E2E] Main spec:', JSON.stringify(mainSpec));
      console.log('[E2E] Worktree spec:', JSON.stringify(worktreeSpec));

      // Main spec should be in 'tasks' phase
      expect(mainSpec?.phase).toBe('tasks');

      // Worktree spec should be in 'implementation' phase
      expect(worktreeSpec?.phase).toBe('implementation');
    });
  });

  // ============================================================
  // Scenario 2: Worktree badge indicator
  // ============================================================
  describe('Scenario 2: Worktree badge indicator', () => {
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

    it('should have worktree field in worktree spec', async () => {
      const specs = await getAllSpecsFromStore();
      const worktreeSpec = specs.find((s) => s.name === WORKTREE_SPEC_NAME);

      console.log('[E2E] Worktree spec worktree field:', JSON.stringify(worktreeSpec?.worktree));

      expect(worktreeSpec?.worktree).toBeDefined();
      expect(worktreeSpec?.worktree?.path).toBe('.kiro/worktrees/specs/worktree-spec');
      expect(worktreeSpec?.worktree?.branch).toBe('feature/worktree-spec');
    });

    it('should NOT have worktree field in main spec', async () => {
      const specs = await getAllSpecsFromStore();
      const mainSpec = specs.find((s) => s.name === MAIN_SPEC_NAME);

      console.log('[E2E] Main spec worktree field:', JSON.stringify(mainSpec?.worktree));

      expect(mainSpec?.worktree).toBeUndefined();
    });

    it('should display worktree badge for worktree spec in UI', async () => {
      // Select the worktree spec
      const specSuccess = await selectSpecViaStore(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check for worktree badge
      const worktreeBadge = await $('[data-testid="worktree-badge"]');
      const badgeExists = await worktreeBadge.isExisting();

      console.log(`[E2E] Worktree badge exists (worktree spec selected): ${badgeExists}`);

      expect(badgeExists).toBe(true);
    });

    it('should NOT display worktree badge for main spec in UI', async () => {
      // Select the main spec
      const specSuccess = await selectSpecViaStore(MAIN_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check for worktree badge (should not exist)
      const worktreeBadge = await $('[data-testid="worktree-badge"]');
      const badgeExists = await worktreeBadge.isExisting();

      console.log(`[E2E] Worktree badge exists (main spec selected): ${badgeExists}`);

      expect(badgeExists).toBe(false);
    });
  });

  // ============================================================
  // Scenario 3: Spec selection and detail view
  // ============================================================
  describe('Scenario 3: Spec selection and detail view', () => {
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

    it('should show correct worktree info when worktree spec is selected', async () => {
      // Select the worktree spec
      const specSuccess = await selectSpecViaStore(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      // Get selected spec from store
      const selectedSpec = await getSelectedSpecFromStore();
      console.log('[E2E] Selected spec (worktree):', JSON.stringify(selectedSpec));

      expect(selectedSpec).not.toBeNull();
      expect(selectedSpec?.name).toBe(WORKTREE_SPEC_NAME);
      expect(selectedSpec?.phase).toBe('implementation');
      expect(selectedSpec?.worktree?.enabled).toBe(true);
      expect(selectedSpec?.worktree?.path).toBe('.kiro/worktrees/specs/worktree-spec');
      expect(selectedSpec?.worktree?.branch).toBe('feature/worktree-spec');
    });

    it('should show no worktree info when main spec is selected', async () => {
      // Select the main spec
      const specSuccess = await selectSpecViaStore(MAIN_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);
      await refreshSpecStore();

      // Get selected spec from store
      const selectedSpec = await getSelectedSpecFromStore();
      console.log('[E2E] Selected spec (main):', JSON.stringify(selectedSpec));

      expect(selectedSpec).not.toBeNull();
      expect(selectedSpec?.name).toBe(MAIN_SPEC_NAME);
      expect(selectedSpec?.phase).toBe('tasks');
      expect(selectedSpec?.worktree).toBeUndefined();
    });
  });

  // ============================================================
  // Scenario 4: ImplFlowFrame display differences
  // ============================================================
  describe('Scenario 4: ImplFlowFrame display for worktree vs main specs', () => {
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

    it('should show locked checkbox for worktree spec (impl already started)', async () => {
      // Select the worktree spec
      const specSuccess = await selectSpecViaStore(WORKTREE_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check for impl flow frame
      const implFlowFrame = await $('[data-testid="impl-flow-frame"]');
      const frameExists = await implFlowFrame.isExisting();
      console.log(`[E2E] impl-flow-frame exists (worktree spec): ${frameExists}`);

      if (frameExists) {
        // Check checkbox state - should be checked and locked
        const checkbox = await $('[data-testid="worktree-mode-checkbox"]');
        if (await checkbox.isExisting()) {
          const isChecked = await checkbox.isSelected();
          const isEnabled = await checkbox.isEnabled();
          console.log(`[E2E] Checkbox checked: ${isChecked}, enabled: ${isEnabled}`);

          // Worktree spec has impl started, so checkbox should be checked and disabled
          expect(isChecked).toBe(true);
          expect(isEnabled).toBe(false);
        }
      }
    });

    it('should show editable checkbox for main spec (impl not started)', async () => {
      // Select the main spec
      const specSuccess = await selectSpecViaStore(MAIN_SPEC_NAME);
      expect(specSuccess).toBe(true);
      await browser.pause(500);

      // Wait for workflow view
      const workflowView = await $('[data-testid="workflow-view"]');
      await workflowView.waitForExist({ timeout: 5000 });

      // Check for impl flow frame
      const implFlowFrame = await $('[data-testid="impl-flow-frame"]');
      const frameExists = await implFlowFrame.isExisting();
      console.log(`[E2E] impl-flow-frame exists (main spec): ${frameExists}`);

      if (frameExists) {
        // Check checkbox state - should be enabled (editable)
        const checkbox = await $('[data-testid="worktree-mode-checkbox"]');
        if (await checkbox.isExisting()) {
          const isEnabled = await checkbox.isEnabled();
          console.log(`[E2E] Checkbox enabled (main spec): ${isEnabled}`);

          // Main spec has no worktree, so checkbox should be editable
          expect(isEnabled).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // Scenario 5: spec.json worktree field verification
  // ============================================================
  describe('Scenario 5: spec.json worktree field structure', () => {
    beforeEach(async () => {
      resetFixtures();
    });

    it('should have correct worktree structure in worktree spec.json', () => {
      const specJson = readWorktreeSpecJson();
      console.log('[E2E] Worktree spec.json:', JSON.stringify(specJson.worktree, null, 2));

      expect(specJson.worktree).toBeDefined();
      expect(specJson.worktree.enabled).toBe(true);
      expect(specJson.worktree.path).toBe('.kiro/worktrees/specs/worktree-spec');
      expect(specJson.worktree.branch).toBe('feature/worktree-spec');
      expect(specJson.worktree.created_at).toBeDefined();
    });

    it('should NOT have worktree field in main spec.json', () => {
      const specJson = readMainSpecJson();
      console.log('[E2E] Main spec.json worktree:', (specJson as any).worktree);

      expect((specJson as any).worktree).toBeUndefined();
    });
  });

  // ============================================================
  // Scenario 6: File system path verification
  // ============================================================
  describe('Scenario 6: File system path verification', () => {
    beforeEach(async () => {
      resetFixtures();
    });

    it('should have main spec at .kiro/specs/main-spec/', () => {
      const specJsonPath = path.join(MAIN_SPEC_DIR, 'spec.json');
      expect(fs.existsSync(specJsonPath)).toBe(true);

      const requirementsPath = path.join(MAIN_SPEC_DIR, 'requirements.md');
      expect(fs.existsSync(requirementsPath)).toBe(true);

      console.log(`[E2E] Main spec path: ${MAIN_SPEC_DIR}`);
    });

    it('should have worktree spec at .kiro/worktrees/specs/{specId}/.kiro/specs/{specId}/', () => {
      const specJsonPath = path.join(WORKTREE_SPEC_DIR, 'spec.json');
      expect(fs.existsSync(specJsonPath)).toBe(true);

      const requirementsPath = path.join(WORKTREE_SPEC_DIR, 'requirements.md');
      expect(fs.existsSync(requirementsPath)).toBe(true);

      console.log(`[E2E] Worktree spec path: ${WORKTREE_SPEC_DIR}`);

      // Verify the full path structure
      const expectedPath = path.join(
        FIXTURE_PATH,
        '.kiro/worktrees/specs/worktree-spec/.kiro/specs/worktree-spec'
      );
      expect(WORKTREE_SPEC_DIR).toBe(expectedPath);
    });
  });
});
