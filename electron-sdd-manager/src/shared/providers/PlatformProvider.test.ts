/**
 * Test for PlatformProvider implementation
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const providerPath = resolve(__dirname, 'PlatformProvider.tsx');

describe('PlatformProvider', () => {
  it('should exist', () => {
    expect(existsSync(providerPath)).toBe(true);
  });

  it('should export PlatformProvider component', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('export function PlatformProvider');
  });

  it('should export usePlatform hook', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('export function usePlatform');
  });

  it('should define PlatformCapabilities type', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('PlatformCapabilities');
  });

  it('should include canOpenFileDialog capability', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('canOpenFileDialog');
  });

  it('should include canConfigureSSH capability', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('canConfigureSSH');
  });

  it('should include canSelectProject capability', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('canSelectProject');
  });

  it('should include canSaveFileLocally capability', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('canSaveFileLocally');
  });

  it('should include platform identifier', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain("platform: 'electron'");
    expect(content).toContain("platform: 'web'");
  });

  it('should detect Electron environment', () => {
    const content = readFileSync(providerPath, 'utf-8');
    expect(content).toContain('electronAPI');
  });
});
