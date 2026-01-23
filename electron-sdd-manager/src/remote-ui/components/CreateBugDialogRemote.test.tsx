/**
 * CreateBugDialogRemote Component Tests
 *
 * Requirements: 1.2, 1.3, 1.4, 3.1 (remote-ui-bug-advanced-features)
 * submit-shortcut-key feature: Task 2.5
 * Requirement 2.5: CreateBugDialogRemoteでショートカット有効
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const componentPath = resolve(__dirname, 'CreateBugDialogRemote.tsx');

describe('CreateBugDialogRemote', () => {
  it('should exist', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it('should export CreateBugDialogRemote function', () => {
    const content = readFileSync(componentPath, 'utf-8');
    expect(content).toContain('export function CreateBugDialogRemote');
  });

  describe('Props interface', () => {
    it('should have isOpen prop', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('isOpen: boolean');
    });

    it('should have onClose prop', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('onClose: () => void');
    });

    it('should have apiClient prop', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('apiClient: ApiClient');
    });

    it('should have deviceType prop', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain("deviceType: 'desktop' | 'smartphone'");
    });
  });

  describe('UI elements', () => {
    it('should have description textarea with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-bug-description"');
    });

    it('should have worktree mode checkbox with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-bug-worktree-checkbox"');
    });

    it('should have submit button with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-bug-submit"');
    });

    it('should have error display with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-bug-error"');
    });
  });

  // ============================================================
  // submit-shortcut-key feature: Task 2.5
  // Requirement 2.5: CreateBugDialogRemoteでショートカット有効
  // ============================================================
  describe('submit-shortcut-key: Keyboard shortcut implementation', () => {
    it('should import useSubmitShortcut hook', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('useSubmitShortcut');
    });

    it('should set onKeyDown handler on textarea', () => {
      const content = readFileSync(componentPath, 'utf-8');
      // Check that onKeyDown is set on the textarea
      expect(content).toMatch(/onKeyDown=\{.*handleKeyDown.*\}/s);
    });
  });
});
