/**
 * Preload Script Tests
 * trpc-full-migration Task 11.1: preload/index.tsからelectronAPI関連コードを削除
 * Requirements: 10.1, 10.5
 *
 * After full tRPC migration, preload/index.ts should only contain:
 * - import './trpc' (which calls exposeElectronTRPC from electron-trpc/preload)
 * - No contextBridge.exposeInMainWorld('electronAPI', ...)
 * - No ipcRenderer usage
 * - No IPC_CHANNELS import
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock electron (still needed because import './trpc' uses electron-trpc)
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
    removeListener: vi.fn(),
  },
}));

// Mock the trpc preload module
vi.mock('./trpc', () => ({}));

describe('Preload Script - Task 11.1: electronAPI完全削除', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should not expose electronAPI via contextBridge', async () => {
    const { contextBridge } = await import('electron');
    await import('./index');

    // contextBridge.exposeInMainWorld should NOT be called with 'electronAPI'
    const calls = (contextBridge.exposeInMainWorld as ReturnType<typeof vi.fn>).mock.calls;
    const electronAPICalls = calls.filter(
      (call: unknown[]) => call[0] === 'electronAPI'
    );
    expect(electronAPICalls).toHaveLength(0);
  });

  it('should not import ipcRenderer', async () => {
    // Read the actual source file to verify no ipcRenderer usage
    const sourceContent = readFileSync(
      join(__dirname, 'index.ts'),
      'utf-8'
    );
    expect(sourceContent).not.toContain('ipcRenderer');
  });

  it('should not import IPC_CHANNELS', async () => {
    const sourceContent = readFileSync(
      join(__dirname, 'index.ts'),
      'utf-8'
    );
    expect(sourceContent).not.toContain('IPC_CHANNELS');
  });

  it('should not contain contextBridge.exposeInMainWorld for electronAPI', async () => {
    const sourceContent = readFileSync(
      join(__dirname, 'index.ts'),
      'utf-8'
    );
    // exposeInMainWorld is still used for E2E mode flag (isE2E)
    // But should not expose 'electronAPI'
    expect(sourceContent).not.toContain("exposeInMainWorld('electronAPI'");
  });

  it('should import trpc preload module', async () => {
    const sourceContent = readFileSync(
      join(__dirname, 'index.ts'),
      'utf-8'
    );
    expect(sourceContent).toContain("import './trpc'");
  });

  it('should be minimal (under 25 lines)', async () => {
    const sourceContent = readFileSync(
      join(__dirname, 'index.ts'),
      'utf-8'
    );
    const lines = sourceContent.split('\n').filter(
      (line: string) => line.trim().length > 0
    );
    // E2E mode detection adds ~7 lines beyond the original tRPC-only preload
    expect(lines.length).toBeLessThanOrEqual(25);
  });
});
