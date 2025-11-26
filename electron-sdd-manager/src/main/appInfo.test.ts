/**
 * App Info Tests
 * Task 19.1: Package name and title change
 * Requirements: 14.1
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('App Info - Task 19.1', () => {
  describe('package.json', () => {
    it('should have name "sdd-orchestrator"', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.name).toBe('sdd-orchestrator');
    });

    it('should have productName "SDD Orchestrator"', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.build.productName).toBe('SDD Orchestrator');
    });

    it('should have updated appId', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.build.appId).toBe('com.sdd-orchestrator.app');
    });
  });

  describe('Window Title', () => {
    it('should export correct app name constant', async () => {
      const { APP_NAME } = await import('./appInfo');
      expect(APP_NAME).toBe('SDD Orchestrator');
    });
  });
});
