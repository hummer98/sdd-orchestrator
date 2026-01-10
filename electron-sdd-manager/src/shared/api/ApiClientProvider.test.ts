/**
 * Test for ApiClientProvider implementation
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

  it('should support environment-based auto selection', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('IpcApiClient');
    expect(content).toContain('WebSocketApiClient');
  });

  it('should allow custom client injection', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('client');
  });
});
