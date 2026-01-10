/**
 * Test for Remote UI Vite configuration structure
 * Validates that the configuration file exists and has correct structure
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const configPath = resolve(__dirname, '../../vite.config.remote.ts');

describe('vite.config.remote', () => {
  it('should exist at the correct location', () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it('should contain required configuration elements', () => {
    const content = readFileSync(configPath, 'utf-8');

    // Verify essential configuration elements are present
    expect(content).toContain("root: 'src/remote-ui'");
    expect(content).toContain("base: '/'");
    expect(content).toContain("outDir: resolve(__dirname, 'dist/remote-ui')");
  });

  it('should import react plugin', () => {
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain("import react from '@vitejs/plugin-react'");
    expect(content).toContain('plugins: [react()]');
  });

  it('should have path aliases for shared code', () => {
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain("'@shared': resolve(__dirname, 'src/shared')");
    expect(content).toContain("'@remote-ui': resolve(__dirname, 'src/remote-ui')");
  });

  it('should not include electron plugins', () => {
    const content = readFileSync(configPath, 'utf-8');

    // Should NOT have electron-related imports
    expect(content).not.toContain('vite-plugin-electron');
    expect(content).not.toContain('vite-plugin-electron-renderer');
  });

  it('should have environment variable prefix configured', () => {
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain("envPrefix: ['VITE_']");
  });

  it('should target modern browsers', () => {
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain("target: 'esnext'");
  });

  it('should have entry point set to src/remote-ui/index.html', () => {
    const content = readFileSync(configPath, 'utf-8');

    expect(content).toContain("main: resolve(__dirname, 'src/remote-ui/index.html')");
  });
});
