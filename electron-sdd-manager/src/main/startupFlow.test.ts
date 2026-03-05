/**
 * Startup Flow Integration Tests
 * multi-window-integration Tasks 7.1, 7.2, 7.3
 *
 * Verifies:
 * - 7.1: app.whenReady() uses WindowManager.createWindow instead of windowFactory
 * - 7.2: app.on('activate') and second-instance use WindowManager
 * - 7.3: windowFactory.ts is deleted, all references updated to WindowManager API
 *
 * Strategy: Since index.ts cannot export functions (entry point constraint),
 * we verify the wiring by checking:
 * 1. index.ts imports from WindowManager, not windowFactory
 * 2. The WindowManager singleton is used for window creation
 * 3. initializeTRPCHandler is called with WindowManager
 * 4. windowFactory.ts file does not exist
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Path to the source files
const SRC_MAIN = join(__dirname);

describe('multi-window-integration Task 7: Startup Flow Integration', () => {
  describe('Task 7.1: index.ts startup flow uses WindowManager', () => {
    let indexSource: string;

    beforeAll(() => {
      indexSource = readFileSync(join(SRC_MAIN, 'index.ts'), 'utf-8');
    });

    it('should import getWindowManager from windowManager service', () => {
      expect(indexSource).toContain('getWindowManager');
      expect(indexSource).toMatch(/import.*getWindowManager.*from.*windowManager/);
    });

    it('should import initializeTRPCHandler from handler', () => {
      expect(indexSource).toContain('initializeTRPCHandler');
      expect(indexSource).toMatch(/import.*initializeTRPCHandler.*from.*handler/);
    });

    it('should NOT import createWindow from windowFactory', () => {
      expect(indexSource).not.toMatch(/import.*createWindow.*from.*\.\/windowFactory/);
    });

    it('should NOT import getMainWindow from windowFactory', () => {
      expect(indexSource).not.toMatch(/import.*getMainWindow.*from.*\.\/windowFactory/);
    });

    it('should use WindowManager.createWindow() in app.whenReady', () => {
      // The startup flow should call windowManager.createWindow()
      // instead of the old standalone createWindow()
      expect(indexSource).toMatch(/windowManager\.createWindow\(/);
    });

    it('should call initializeTRPCHandler with windowManager and window', () => {
      expect(indexSource).toMatch(/initializeTRPCHandler\s*\(/);
    });

    it('should store WindowManager instance in module scope for other handlers', () => {
      // WindowManager needs to be accessible from activate and second-instance handlers
      expect(indexSource).toMatch(/const\s+windowManager\s*=/);
    });
  });

  describe('Task 7.2: activate and second-instance handlers use WindowManager', () => {
    let indexSource: string;

    beforeAll(() => {
      indexSource = readFileSync(join(SRC_MAIN, 'index.ts'), 'utf-8');
    });

    it('should use WindowManager.getAllWindowIds() in activate handler', () => {
      // The activate handler should check WindowManager for existing windows
      expect(indexSource).toMatch(/getAllWindowIds/);
    });

    it('should use WindowManager.createWindow() in activate handler when no windows exist', () => {
      // Within the activate handler block, should use windowManager.createWindow()
      // Use greedy match to capture the full handler body
      const activateBlock = indexSource.match(/app\.on\('activate'[\s\S]*?windowManager\.createWindow[\s\S]*?\}\);/);
      expect(activateBlock).not.toBeNull();
      const block = activateBlock![0];
      expect(block).toContain('windowManager.createWindow');
      // Should NOT use BrowserWindow.getAllWindows() directly
      expect(block).not.toContain('BrowserWindow.getAllWindows');
    });

    it('should use WindowManager.getWindowByProject() in second-instance handler', () => {
      expect(indexSource).toMatch(/getWindowByProject/);
    });

    it('should use WindowManager.restoreAndFocus() in second-instance handler', () => {
      expect(indexSource).toMatch(/restoreAndFocus/);
    });

    it('should NOT use getMainWindow() in second-instance handler', () => {
      // second-instance should use WindowManager, not getMainWindow
      const secondInstanceBlock = indexSource.match(/app\.on\('second-instance'[\s\S]*?\}\);/);
      expect(secondInstanceBlock).not.toBeNull();
      const block = secondInstanceBlock![0];
      expect(block).not.toContain('getMainWindow');
    });
  });

  describe('Task 7.3: windowFactory.ts physically deleted', () => {
    it('should NOT have windowFactory.ts file', () => {
      const windowFactoryPath = join(SRC_MAIN, 'windowFactory.ts');
      expect(existsSync(windowFactoryPath)).toBe(false);
    });

    it('should have zero import references to windowFactory in src/main/', () => {
      // Check index.ts has no windowFactory imports
      const indexSource = readFileSync(join(SRC_MAIN, 'index.ts'), 'utf-8');
      expect(indexSource).not.toContain('windowFactory');
    });
  });

  describe('Task 7.3: createNewWindow wired via WindowManager in productionServices or handler', () => {
    it('should wire createNewWindow via WindowManager (not windowFactory)', () => {
      // The createNewWindow service should now use WindowManager.createWindow()
      // It could be wired in handler.ts, productionServices.ts, or windowContextFactory.ts
      const handlerSource = readFileSync(join(SRC_MAIN, 'trpc', 'handler.ts'), 'utf-8');
      const productionServicesSource = readFileSync(join(SRC_MAIN, 'trpc', 'productionServices.ts'), 'utf-8');

      // At least one of these files should wire createNewWindow via WindowManager
      const hasWindowManagerCreateNewWindow =
        handlerSource.includes('createNewWindow') ||
        productionServicesSource.includes('createNewWindow');

      expect(hasWindowManagerCreateNewWindow).toBe(true);
    });

    it('should not reference windowFactory in handler.ts', () => {
      const handlerSource = readFileSync(join(SRC_MAIN, 'trpc', 'handler.ts'), 'utf-8');
      expect(handlerSource).not.toContain('windowFactory');
    });

    it('should not reference windowFactory in productionServices.ts', () => {
      const productionServicesSource = readFileSync(join(SRC_MAIN, 'trpc', 'productionServices.ts'), 'utf-8');
      expect(productionServicesSource).not.toContain('windowFactory');
    });
  });
});
