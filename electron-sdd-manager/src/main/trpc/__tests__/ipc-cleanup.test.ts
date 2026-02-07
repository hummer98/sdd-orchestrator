/**
 * IPC Legacy Cleanup Verification Tests
 * Task 11.2: channels.ts, handlers.ts, ipcUtils.ts, sshChannels.ts,
 *            and utility files physical deletion verification
 *
 * Requirements: 10.2, 10.3
 * Verify: src/main/ipc/ directory should not exist or should contain 0 target files
 *
 * These tests verify that the legacy IPC infrastructure has been completely
 * removed and utility files have been properly relocated to trpc/helpers/.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

// Resolve the src/main directory from the test file location
const srcMainDir = resolve(__dirname, '../..');
const ipcDir = join(srcMainDir, 'ipc');
const trpcHelpersDir = join(srcMainDir, 'trpc', 'helpers');

describe('Task 11.2: Legacy IPC Infrastructure Cleanup', () => {
  describe('ipc/ directory removal', () => {
    it('should have completely removed the src/main/ipc/ directory', () => {
      // The entire ipc/ directory should no longer exist
      expect(existsSync(ipcDir)).toBe(false);
    });

    it('should not have channels.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'channels.ts'))).toBe(false);
    });

    it('should not have handlers.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'handlers.ts'))).toBe(false);
    });

    it('should not have ipcUtils.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'ipcUtils.ts'))).toBe(false);
    });

    it('should not have sshChannels.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'sshChannels.ts'))).toBe(false);
    });

    it('should not have projectFileUtils.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'projectFileUtils.ts'))).toBe(false);
    });

    it('should not have projectUtils.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'projectUtils.ts'))).toBe(false);
    });

    it('should not have watcherUtils.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'watcherUtils.ts'))).toBe(false);
    });

    it('should not have worktreeUtils.ts in ipc/', () => {
      expect(existsSync(join(ipcDir, 'worktreeUtils.ts'))).toBe(false);
    });
  });

  describe('utility files relocated to trpc/helpers/', () => {
    it('should have projectFileUtils.ts in trpc/helpers/', () => {
      expect(existsSync(join(trpcHelpersDir, 'projectFileUtils.ts'))).toBe(true);
    });

    it('should have projectUtils.ts in trpc/helpers/', () => {
      expect(existsSync(join(trpcHelpersDir, 'projectUtils.ts'))).toBe(true);
    });

    it('should have watcherUtils.ts in trpc/helpers/', () => {
      expect(existsSync(join(trpcHelpersDir, 'watcherUtils.ts'))).toBe(true);
    });

    it('should have worktreeUtils.ts in trpc/helpers/', () => {
      expect(existsSync(join(trpcHelpersDir, 'worktreeUtils.ts'))).toBe(true);
    });

    it('should have projectSetup.ts in trpc/helpers/ (handlers.ts business logic)', () => {
      expect(existsSync(join(trpcHelpersDir, 'projectSetup.ts'))).toBe(true);
    });
  });

  describe('main/index.ts has no ipc/ imports', () => {
    it('should not import from ipc/ directory', async () => {
      // Read the main/index.ts source to verify no ipc/ imports
      const fs = await import('fs');
      const indexPath = join(srcMainDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // Verify no import statements reference the ipc/ directory
      const ipcImportPattern = /import\s+.*from\s+['"].*\/ipc\//;
      expect(content).not.toMatch(ipcImportPattern);
    });

    it('should not import handlers.ts directly', async () => {
      const fs = await import('fs');
      const indexPath = join(srcMainDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // No direct import of handlers
      const handlersImportPattern = /import\s+.*from\s+['"]\.\/ipc\/handlers/;
      expect(content).not.toMatch(handlersImportPattern);
    });

    it('should not import channels.ts directly', async () => {
      const fs = await import('fs');
      const indexPath = join(srcMainDir, 'index.ts');
      const content = fs.readFileSync(indexPath, 'utf-8');

      // No direct import of channels
      const channelsImportPattern = /import\s+.*from\s+['"]\.\/ipc\/channels/;
      expect(content).not.toMatch(channelsImportPattern);
    });
  });
});
