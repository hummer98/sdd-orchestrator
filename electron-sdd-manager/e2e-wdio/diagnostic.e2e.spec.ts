/**
 * Diagnostic E2E Test - Understanding UI State
 */

import * as path from 'path';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');

describe('Diagnostic Test', () => {
  it('should diagnose UI state after project and spec selection', async () => {
    // Step 1: Check initial state
    console.log('[DIAG] Step 1: Initial state');
    const initialTestIds = await browser.execute(() => {
      const elements = document.querySelectorAll('[data-testid]');
      return Array.from(elements).map(el => el.getAttribute('data-testid')).slice(0, 20);
    });
    console.log('[DIAG] Initial testids:', JSON.stringify(initialTestIds));
    
    // Step 2: Select project
    console.log('[DIAG] Step 2: Selecting project');
    const projectResult = await browser.execute((projectPath: string) => {
      const stores = (window as any).__STORES__;
      if (!stores?.project?.getState) return { error: 'project store not available' };
      stores.project.getState().setCurrentProject(projectPath);
      return { success: true };
    }, FIXTURE_PATH);
    console.log('[DIAG] Project selection result:', JSON.stringify(projectResult));
    
    // Wait a bit
    await browser.pause(2000);
    
    // Step 3: Check state after project selection
    console.log('[DIAG] Step 3: State after project selection');
    const afterProjectState = await browser.execute(() => {
      const stores = (window as any).__STORES__;
      const result: any = {};
      
      if (stores?.project?.getState) {
        const ps = stores.project.getState();
        result.currentProject = ps.currentProject;
      }
      
      if (stores?.spec?.getState) {
        const ss = stores.spec.getState();
        result.specsCount = ss.specs?.length || 0;
        result.specNames = (ss.specs || []).map((s: any) => s.name);
        result.selectedSpec = ss.selectedSpec?.name || null;
        result.isLoading = ss.isLoading;
        result.isDetailLoading = ss.isDetailLoading;
        result.specDetail = ss.specDetail?.metadata?.name || null;
      }
      
      // Check DOM
      const testIds = document.querySelectorAll('[data-testid]');
      result.testIdCount = testIds.length;
      result.hasDocsTabs = !!document.querySelector('[data-testid="docs-tabs"]');
      result.hasSpecPane = !!document.querySelector('[data-testid="spec-pane"]');
      result.hasWorkflowView = !!document.querySelector('[data-testid="workflow-view"]');
      result.hasAutoButton = !!document.querySelector('[data-testid="auto-execution-button"]');
      
      return result;
    });
    console.log('[DIAG] After project state:', JSON.stringify(afterProjectState, null, 2));
    
    // Step 4: Select spec
    console.log('[DIAG] Step 4: Selecting spec');
    const specResult = await browser.execute(() => {
      const stores = (window as any).__STORES__;
      if (!stores?.spec?.getState) return { error: 'spec store not available' };
      
      const ss = stores.spec.getState();
      const spec = ss.specs.find((s: any) => s.name === 'simple-feature');
      if (!spec) return { error: 'spec not found', specs: ss.specs?.map((s: any) => s.name) };
      
      ss.selectSpec(spec);
      return { success: true, selectedName: spec.name };
    });
    console.log('[DIAG] Spec selection result:', JSON.stringify(specResult));
    
    // Wait for detail loading
    await browser.pause(3000);
    
    // Step 5: Check final state
    console.log('[DIAG] Step 5: Final state');
    const finalState = await browser.execute(() => {
      const stores = (window as any).__STORES__;
      const result: any = {};
      
      if (stores?.spec?.getState) {
        const ss = stores.spec.getState();
        result.selectedSpec = ss.selectedSpec?.name || null;
        result.isDetailLoading = ss.isDetailLoading;
        result.specDetail = ss.specDetail?.metadata?.name || null;
        result.specDetailKeys = ss.specDetail ? Object.keys(ss.specDetail) : [];
      }
      
      // Check DOM again
      result.hasDocsTabs = !!document.querySelector('[data-testid="docs-tabs"]');
      result.hasWorkflowView = !!document.querySelector('[data-testid="workflow-view"]');
      result.hasAutoButton = !!document.querySelector('[data-testid="auto-execution-button"]');
      result.hasAgentListPanel = !!document.querySelector('[data-testid="agent-list-panel"]');
      
      // Get all testids
      const testIds = document.querySelectorAll('[data-testid]');
      result.allTestIds = Array.from(testIds).map(el => el.getAttribute('data-testid'));
      
      return result;
    });
    console.log('[DIAG] Final state:', JSON.stringify(finalState, null, 2));
    
    // Assert something to show in results
    expect(true).toBe(true);
  });
});
