/**
 * Main process configuration
 * Requirements: 11.1, 13.1, 13.2
 */

import { join } from 'path';
import { app } from 'electron';

export interface MainProcessConfig {
  readonly isDev: boolean;
  readonly preloadPath: string;
  readonly indexPath: string;
}

export interface BrowserWindowConfig {
  readonly width: number;
  readonly height: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly webPreferences: {
    readonly contextIsolation: true;
    readonly nodeIntegration: false;
    readonly sandbox: true;
    readonly preload: string;
  };
}

export function getMainProcessConfig(): MainProcessConfig {
  const isDev = !app.isPackaged;

  return {
    isDev,
    preloadPath: join(__dirname, '../preload/index.js'),
    indexPath: isDev
      ? 'http://localhost:5173'
      : join(__dirname, '../renderer/index.html'),
  };
}

export function getBrowserWindowConfig(preloadPath: string): BrowserWindowConfig {
  return {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath,
    },
  };
}
