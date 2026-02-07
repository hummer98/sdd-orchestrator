/**
 * Task 11.4: window.electronAPI参照の全削除とIpcApiClient.tsの物理削除
 *
 * Requirements: 10.6
 * Verify: Grep "window.electronAPI" should return 0 results in production code
 *
 * This test verifies:
 * 1. IpcApiClient.ts is physically deleted
 * 2. IpcApiClient.test.ts is physically deleted
 * 3. No production code references window.electronAPI (comments allowed)
 * 4. ApiClientProvider does not import IpcApiClient
 * 5. Environment detection uses electronTRPC instead of electronAPI
 * 6. ApiClient interface comment no longer mentions IpcApiClient as an implementation
 * 7. ScheduleTaskSettingView does not reference window.electronAPI
 * 8. SpecPane and BugPane do not reference window.electronAPI
 * 9. test/setup.ts does not expose window.electronAPI mock
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const srcDir = resolve(__dirname, '../../..');

/**
 * Recursively collect all .ts/.tsx files from a directory
 */
function collectFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (entry === 'node_modules' || entry === 'dist') continue;
      results.push(...collectFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Task 11.4: window.electronAPI全削除とIpcApiClient物理削除', () => {
  describe('IpcApiClient.ts物理削除', () => {
    it('IpcApiClient.tsが存在しないこと', () => {
      const path = join(srcDir, 'shared/api/IpcApiClient.ts');
      expect(existsSync(path)).toBe(false);
    });

    it('IpcApiClient.test.tsが存在しないこと', () => {
      const path = join(srcDir, 'shared/api/IpcApiClient.test.ts');
      expect(existsSync(path)).toBe(false);
    });
  });

  describe('プロダクションコードからwindow.electronAPI参照が削除されていること', () => {
    // Production source files (excluding test files and the test itself)
    const productionFiles = collectFiles(srcDir, ['.ts', '.tsx']).filter(
      (f) =>
        !f.includes('.test.') &&
        !f.includes('__tests__') &&
        !f.includes('/test/') &&
        !f.includes('node_modules')
    );

    it('プロダクションファイルが存在すること（テスト自体の検証）', () => {
      expect(productionFiles.length).toBeGreaterThan(0);
    });

    it('プロダクションコード中にwindow.electronAPIの実行参照がないこと', () => {
      const filesWithReference: string[] = [];

      for (const file of productionFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip comment-only lines (// or * or /*)
          const trimmed = line.trim();
          if (
            trimmed.startsWith('//') ||
            trimmed.startsWith('*') ||
            trimmed.startsWith('/*')
          ) {
            continue;
          }
          // Check for window.electronAPI in executable code
          if (line.includes('window.electronAPI')) {
            filesWithReference.push(
              `${file.replace(srcDir + '/', '')}:${i + 1}: ${trimmed}`
            );
          }
        }
      }

      expect(filesWithReference).toEqual([]);
    });
  });

  describe('ApiClientProvider.tsxの更新', () => {
    it('IpcApiClientをimportしていないこと', () => {
      const path = join(srcDir, 'shared/api/ApiClientProvider.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).not.toContain("from './IpcApiClient'");
      expect(content).not.toContain('IpcApiClient');
    });

    it('Electron環境検知にelectronTRPCを使用していること', () => {
      const path = join(srcDir, 'shared/api/ApiClientProvider.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('electronTRPC');
    });

    it('window.electronAPIを参照していないこと', () => {
      const path = join(srcDir, 'shared/api/ApiClientProvider.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).not.toContain('window.electronAPI');
    });
  });

  describe('PlatformProvider.tsxの更新', () => {
    it('Electron環境検知にelectronTRPCを使用していること', () => {
      const path = join(srcDir, 'shared/providers/PlatformProvider.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('electronTRPC');
    });

    it('window.electronAPIを参照していないこと', () => {
      const path = join(srcDir, 'shared/providers/PlatformProvider.tsx');
      const content = readFileSync(path, 'utf-8');
      // Check executable lines only
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('/*')
        ) {
          continue;
        }
        expect(line).not.toContain('window.electronAPI');
      }
    });
  });

  describe('SpecPane.tsxの更新', () => {
    it('window.electronAPIを参照していないこと', () => {
      const path = join(srcDir, 'renderer/components/SpecPane.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).not.toContain('window.electronAPI');
    });

    it('tRPCを使用してlayoutConfig操作を行っていること', () => {
      const path = join(srcDir, 'renderer/components/SpecPane.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('getVanillaClient');
    });
  });

  describe('BugPane.tsxの更新', () => {
    it('window.electronAPIを参照していないこと', () => {
      const path = join(srcDir, 'renderer/components/BugPane.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).not.toContain('window.electronAPI');
    });

    it('tRPCを使用してlayoutConfig操作を行っていること', () => {
      const path = join(srcDir, 'renderer/components/BugPane.tsx');
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('getVanillaClient');
    });
  });

  describe('ScheduleTaskSettingView.tsxの更新', () => {
    it('window.electronAPIを参照していないこと', () => {
      const path = join(
        srcDir,
        'shared/components/schedule/ScheduleTaskSettingView.tsx'
      );
      const content = readFileSync(path, 'utf-8');
      // Check only non-comment lines
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('/*')
        ) {
          continue;
        }
        expect(line).not.toContain('window.electronAPI');
        expect(line).not.toContain("'electronAPI' in window");
      }
    });

    it('tRPCを使用してscheduleTask操作を行っていること', () => {
      const path = join(
        srcDir,
        'shared/components/schedule/ScheduleTaskSettingView.tsx'
      );
      const content = readFileSync(path, 'utf-8');
      expect(content).toContain('getVanillaClient');
    });
  });

  describe('types.tsの更新', () => {
    it('ApiClientインターフェースのコメントにIpcApiClientを記載していないこと', () => {
      const path = join(srcDir, 'shared/api/types.ts');
      const content = readFileSync(path, 'utf-8');
      // The interface comment should not mention IpcApiClient as an implementation
      expect(content).not.toContain('IpcApiClient');
    });
  });

  describe('test/setup.tsの更新', () => {
    it('window.electronAPIモックが削除されていること', () => {
      const path = join(srcDir, 'test/setup.ts');
      const content = readFileSync(path, 'utf-8');
      // Should not define window.electronAPI mock
      expect(content).not.toContain("'electronAPI'");
      expect(content).not.toContain('"electronAPI"');
    });
  });
});
