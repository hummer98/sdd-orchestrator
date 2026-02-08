import * as path from 'path';

describe('Diagnostic: Main process state', () => {
  it('should check SDD_PROJECT_PATH in Main process', async () => {
    const envState = await browser.electron.execute((electron) => {
      return {
        sddProjectPath: process.env.SDD_PROJECT_PATH || null,
        e2eTest: process.env.E2E_TEST || null,
      };
    });
    console.log('[DIAG] Main process env:', JSON.stringify(envState));
    expect(envState.sddProjectPath).not.toBeNull();
  });

  it('should check Renderer store currentProject', async () => {
    const storeState = await browser.execute(() => {
      const stores = (window as any).__STORES__;
      if (!stores?.project?.getState) return { error: 'no project store' };
      const state = stores.project.getState();
      return {
        currentProject: state.currentProject,
        lastSelectResult: state.lastSelectResult ? {
          success: state.lastSelectResult.success,
          projectPath: state.lastSelectResult.projectPath,
        } : null,
      };
    });
    console.log('[DIAG] Renderer store:', JSON.stringify(storeState));
  });

  it('should try a simple tRPC query from Renderer', async () => {
    const result = await browser.executeAsync(async (done: (r: any) => void) => {
      try {
        const stores = (window as any).__STORES__;
        const specState = stores.spec.getState();
        // Try calling selectSpec and capture the exact error
        const spec = specState.specs?.find((s: any) => s.name === 'test-feature');
        if (!spec) { done({ error: 'no spec found', specs: specState.specs?.map((s: any) => s.name) }); return; }

        // Set up error capture
        const prevError = specState.error;
        await specState.selectSpec(spec);

        // Check state after
        const afterState = stores.spec.getState();
        done({
          prevError,
          afterError: afterState.error,
          specDetail: afterState.specDetail?.metadata?.name || null,
          isLoading: afterState.isLoading,
          isDetailLoading: afterState.isDetailLoading,
        });
      } catch (e: any) {
        done({ caughtError: e.message || String(e) });
      }
    });
    console.log('[DIAG] selectSpec result:', JSON.stringify(result));
  });

  it('should try readSpecJson via tRPC directly', async () => {
    // This tests if the tRPC query itself works
    const result = await browser.executeAsync(async (done: (r: any) => void) => {
      try {
        // Access the vanilla client module
        const mod = await import('/src/shared/trpc/vanillaClient');
        done({ error: 'should not reach here - dynamic import not available in browser' });
      } catch {
        // Expected - can't do dynamic import in browser context
        // Try via store instead
        try {
          const stores = (window as any).__STORES__;
          const projectState = stores.project.getState();
          done({
            currentProject: projectState.currentProject,
            hasSelectProject: typeof projectState.selectProject === 'function',
          });
        } catch (e: any) {
          done({ error: e.message });
        }
      }
    });
    console.log('[DIAG] Direct query result:', JSON.stringify(result));
  });
});
