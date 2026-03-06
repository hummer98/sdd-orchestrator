/**
 * CreateIssueDialogRemote Component Tests
 *
 * github-issue-integration: Task 12.3
 * Requirements: 11.3
 *
 * Verifies that:
 * - Component exists and exports correctly
 * - Props interface matches spec (isOpen, onClose, apiClient, deviceType, onSuccess)
 * - UI elements have proper data-testid attributes
 * - Uses WebSocketApiClient.createIssue for API integration
 * - Supports keyboard shortcut via useSubmitShortcut
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const componentPath = resolve(__dirname, 'CreateIssueDialogRemote.tsx');

describe('CreateIssueDialogRemote (Task 12.3)', () => {
  it('should exist', () => {
    expect(existsSync(componentPath)).toBe(true);
  });

  it('should export CreateIssueDialogRemote function', () => {
    const content = readFileSync(componentPath, 'utf-8');
    expect(content).toContain('export function CreateIssueDialogRemote');
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
    it('should have title input with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-title"');
    });

    it('should have body textarea with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-body"');
    });

    it('should have labels input with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-labels"');
    });

    it('should have assignees input with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-assignees"');
    });

    it('should have submit button with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-submit"');
    });

    it('should have error display with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-error"');
    });

    it('should have close button with data-testid', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('data-testid="create-issue-dialog-close"');
    });
  });

  describe('API integration', () => {
    it('should use WebSocketApiClient.createIssue for submission', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('createIssue');
      // Should cast apiClient to WebSocketApiClient
      expect(content).toMatch(/apiClient\s+as\s+WebSocketApiClient/);
    });
  });

  describe('Keyboard shortcut', () => {
    it('should import useSubmitShortcut hook', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toContain('useSubmitShortcut');
    });

    it('should set onKeyDown handler on inputs', () => {
      const content = readFileSync(componentPath, 'utf-8');
      expect(content).toMatch(/onKeyDown=\{.*handleKeyDown.*\}/s);
    });
  });
});
