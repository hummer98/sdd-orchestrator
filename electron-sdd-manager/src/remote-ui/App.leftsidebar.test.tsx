/**
 * LeftSidebar Tests for remote-ui-create-buttons feature
 *
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 5.2, 5.3 (remote-ui-create-buttons)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const appPath = resolve(__dirname, 'App.tsx');

describe('LeftSidebar - Create Buttons Feature', () => {
  describe('Dialog state management (Task 3.1)', () => {
    it('should have createDialogType state for dialog management', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('createDialogType');
    });
  });

  describe('Create button in tab header (Task 3.2)', () => {
    it('should have create button with Plus icon', () => {
      const content = readFileSync(appPath, 'utf-8');
      // Check for Plus icon import
      expect(content).toContain('Plus');
      // Check for conditional create button (shows spec or bug based on active tab)
      expect(content).toContain("'create-spec-button'");
      expect(content).toContain("'create-bug-button'");
    });
  });

  describe('CreateSpecDialogRemote integration (Task 3.3)', () => {
    it('should import CreateSpecDialogRemote', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('CreateSpecDialogRemote');
    });
  });

  describe('CreateBugDialogRemote integration (Task 3.4)', () => {
    it('should import CreateBugDialogRemote', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('CreateBugDialogRemote');
    });
  });

  describe('Device type detection (Task 4.1)', () => {
    it('should use deviceType in LeftSidebar', () => {
      const content = readFileSync(appPath, 'utf-8');
      // Check deviceType is used in LeftSidebar
      expect(content).toContain('deviceType:');
    });
  });

  describe('Smartphone FAB support (Task 4.2)', () => {
    it('should have FAB with data-testid for smartphone', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('data-testid="create-fab"');
    });
  });
});
