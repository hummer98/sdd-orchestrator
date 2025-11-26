/**
 * Tests for main process configuration
 * TDD: Testing security settings and configuration
 */

import { describe, it, expect } from 'vitest';
import { getBrowserWindowConfig } from './config';

describe('BrowserWindowConfig', () => {
  it('should have context isolation enabled', () => {
    const config = getBrowserWindowConfig('/path/to/preload.js');
    expect(config.webPreferences.contextIsolation).toBe(true);
  });

  it('should have node integration disabled', () => {
    const config = getBrowserWindowConfig('/path/to/preload.js');
    expect(config.webPreferences.nodeIntegration).toBe(false);
  });

  it('should have sandbox enabled', () => {
    const config = getBrowserWindowConfig('/path/to/preload.js');
    expect(config.webPreferences.sandbox).toBe(true);
  });

  it('should set preload script path correctly', () => {
    const preloadPath = '/path/to/preload.js';
    const config = getBrowserWindowConfig(preloadPath);
    expect(config.webPreferences.preload).toBe(preloadPath);
  });

  it('should have reasonable default window dimensions', () => {
    const config = getBrowserWindowConfig('/path/to/preload.js');
    expect(config.width).toBeGreaterThanOrEqual(800);
    expect(config.height).toBeGreaterThanOrEqual(600);
    expect(config.minWidth).toBeGreaterThanOrEqual(800);
    expect(config.minHeight).toBeGreaterThanOrEqual(600);
  });
});
