/**
 * Test for ApiClientProvider implementation
 *
 * trpc-full-migration Task 11.4: Updated to reflect IpcApiClient removal.
 * Electron renderer now uses tRPC directly; ApiClientProvider is primarily for Remote UI.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const providerPath = resolve(__dirname, 'ApiClientProvider.tsx');

describe('ApiClientProvider', () => {
  it('should exist', () => {
    expect(existsSync(providerPath)).toBe(true);
  });

  it('should export ApiClientProvider component', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('export function ApiClientProvider');
  });

  it('should export useApi hook', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('export function useApi');
  });

  it('should use React Context', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('createContext');
    expect(content).toContain('useContext');
  });

  it('should use WebSocketApiClient for Remote UI', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('WebSocketApiClient');
  });

  it('should not reference IpcApiClient (removed in trpc-full-migration)', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).not.toContain('IpcApiClient');
  });

  it('should detect Electron via electronTRPC (not electronAPI)', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('electronTRPC');
    expect(content).not.toContain("'electronAPI' in window");
  });

  it('should allow custom client injection', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('client');
  });
});
