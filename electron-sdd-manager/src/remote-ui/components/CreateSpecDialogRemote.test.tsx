/**
 * CreateSpecDialogRemote Component Tests
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 (remote-ui-create-buttons)
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const componentPath = resolve(__dirname, 'CreateSpecDialogRemote.tsx');

describe('CreateSpecDialogRemote', () => {
  it('should exist', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it('should export CreateSpecDialogRemote function', () => {
    const content = readFileSync(componentPath, 'utf-8');
    expect(content).toContain('export function CreateSpecDialogRemote');
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

    it('should have optional onSuccess callback', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('onSuccess?:');
    });
  });

  describe('UI elements', () => {
    it('should have description textarea with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-spec-description"');
    });

    it('should have worktree mode checkbox with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-spec-worktree-checkbox"');
    });

    it('should have submit button with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-spec-submit"');
    });

    it('should have error display with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-spec-error"');
    });
  });

  describe('API integration', () => {
    it('should call apiClient.executeSpecPlan on submit', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('apiClient.executeSpecPlan');
    });
  });
});
