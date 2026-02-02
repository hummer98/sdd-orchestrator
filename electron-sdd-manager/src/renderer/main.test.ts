/**
 * Test for main.tsx renderer entry point
 * agent-error-notification Task 7.2
 * Requirements: 3.3, 3.5, 5.3
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const mainPath = resolve(__dirname, 'main.tsx');

describe('main.tsx', () => {
  it('should exist', () => {
    expect(existsSync(mainPath)).toBe(true);
  });

  // ===========================================================================
  // agent-error-notification Task 7.2: Error notification listener
  // Requirements: 3.3, 3.5, 5.3
  // ===========================================================================

  describe('Agent start error notification', () => {
    it('should import getAgentStartErrorMessage', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Should import getAgentStartErrorMessage from agentStartErrorMessages
      expect(content).toMatch(/import.*getAgentStartErrorMessage.*from/);
    });

    it('should register onAgentStartError listener via window.electronAPI', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Should call window.electronAPI.onAgentStartError
      expect(content).toContain('window.electronAPI.onAgentStartError');
    });

    it('should call notify.error to display Toast', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Should use notify.error for Toast display
      expect(content).toMatch(/onAgentStartError[\s\S]*?notify\.error/);
    });

    it('should use getAgentStartErrorMessage to get localized message', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Should call getAgentStartErrorMessage within the error handler
      expect(content).toMatch(/onAgentStartError[\s\S]*?getAgentStartErrorMessage/);
    });
  });
});
