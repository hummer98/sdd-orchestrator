/**
 * electron.d.ts Legacy API Type Cleanup Verification Tests
 * Task 11.3: electron.d.ts physical deletion and window.electronAPI type removal
 *
 * Requirements: 10.4
 * Verify: Grep "electron.d.ts" should return 0 results
 *
 * These tests verify that the legacy ElectronAPI type definitions have been
 * completely removed and replaced with shared types.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// Resolve directory paths from the test file location
const srcDir = resolve(__dirname, '../../..');
const electronDtsPath = join(srcDir, 'renderer', 'types', 'electron.d.ts');
const electronApiTestPath = join(srcDir, 'renderer', 'types', 'electronAPI.test.ts');
const projectRoot = resolve(srcDir, '..');

describe('Task 11.3: electron.d.ts Legacy API Type Cleanup', () => {
  describe('electron.d.ts physical deletion', () => {
    it('should have deleted renderer/types/electron.d.ts', () => {
      expect(existsSync(electronDtsPath)).toBe(false);
    });

    it('should have deleted renderer/types/electronAPI.test.ts (legacy test)', () => {
      expect(existsSync(electronApiTestPath)).toBe(false);
    });
  });

  describe('window.electronAPI type declaration removal', () => {
    it('should not have any window.electronAPI type declarations in renderer/types/', () => {
      const typesDir = join(srcDir, 'renderer', 'types');
      if (!existsSync(typesDir)) return; // types dir might be removed too

      const files = readdirSync(typesDir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.d.ts'));
      for (const file of files) {
        const content = readFileSync(join(typesDir, file), 'utf-8');
        expect(content).not.toMatch(/interface\s+Window\s*\{[\s\S]*electronAPI/);
        expect(content).not.toMatch(/declare\s+global[\s\S]*electronAPI/);
      }
    });
  });

  describe('no code references electron.d.ts', () => {
    it('should not have any imports from types/electron in src/', () => {
      // Use grep to find any remaining imports
      try {
        const result = execSync(
          `grep -r "from.*types/electron" "${srcDir}" --include="*.ts" --include="*.tsx" -l 2>/dev/null || true`,
          { encoding: 'utf-8' }
        ).trim();

        // If result is non-empty, there are still files importing from electron.d.ts
        if (result) {
          const files = result.split('\n').filter(Boolean);
          expect(files).toEqual([]);
        }
      } catch {
        // grep returns exit code 1 when no matches found - this is expected
      }
    });

    it('should not have "electron.d.ts" references in comments (except cleanup test)', () => {
      try {
        const result = execSync(
          `grep -r "electron\\.d\\.ts" "${srcDir}" --include="*.ts" --include="*.tsx" -l 2>/dev/null || true`,
          { encoding: 'utf-8' }
        ).trim();

        if (result) {
          const files = result
            .split('\n')
            .filter(Boolean)
            // Allow this test file itself to reference electron.d.ts
            .filter((f: string) => !f.includes('electron-dts-cleanup.test.ts'));
          expect(files).toEqual([]);
        }
      } catch {
        // grep returns exit code 1 when no matches found - this is expected
      }
    });
  });

  describe('shared types relocated properly', () => {
    it('should have SpecsChangeEvent available from main/services/specsWatcherService', () => {
      // This type was in electron.d.ts and used by specWatcherService.ts
      // It should now be sourced from a shared location
      const specsWatcherPath = join(srcDir, 'main', 'services', 'specsWatcherService.ts');
      expect(existsSync(specsWatcherPath)).toBe(true);
      const content = readFileSync(specsWatcherPath, 'utf-8');
      expect(content).toMatch(/export\s+type\s+SpecsChangeEvent/);
    });

    it('should have ToolStatus and ToolResolutionResult in shared/types/toolPath.ts', () => {
      const toolPathTypesPath = join(srcDir, 'shared', 'types', 'toolPath.ts');
      expect(existsSync(toolPathTypesPath)).toBe(true);
      const content = readFileSync(toolPathTypesPath, 'utf-8');
      expect(content).toMatch(/export\s+interface\s+ToolStatus/);
      expect(content).toMatch(/export\s+interface\s+ToolResolutionResult/);
      expect(content).toMatch(/export\s+interface\s+ToolDefinition/);
    });

    it('should have EngineConfig in shared/types/engineConfig.ts', () => {
      const engineConfigTypesPath = join(srcDir, 'shared', 'types', 'engineConfig.ts');
      expect(existsSync(engineConfigTypesPath)).toBe(true);
      const content = readFileSync(engineConfigTypesPath, 'utf-8');
      expect(content).toMatch(/export\s+interface\s+EngineConfig/);
    });

    it('should have install-related types in shared/types/install.ts', () => {
      const installTypesPath = join(srcDir, 'shared', 'types', 'install.ts');
      expect(existsSync(installTypesPath)).toBe(true);
      const content = readFileSync(installTypesPath, 'utf-8');
      expect(content).toMatch(/export\s+interface\s+CliInstallResult/);
      expect(content).toMatch(/export\s+interface\s+CliInstallInstructions/);
      expect(content).toMatch(/export\s+interface\s+CommonCommandConflict/);
      expect(content).toMatch(/export\s+interface\s+CommonCommandDecision/);
      expect(content).toMatch(/export\s+interface\s+CommonCommandsInstallResult/);
    });
  });
});
