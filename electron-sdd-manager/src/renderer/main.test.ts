/**
 * Test for main.tsx renderer entry point
 * agent-error-notification Task 7.2
 * Requirements: 3.3, 3.5, 5.3
 *
 * trpc-full-migration Task 11.4: Updated to reflect tRPC Subscription migration.
 * Agent start error listener now uses tRPC Subscription instead of window.electronAPI.
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
  // trpc-full-migration Task 9.2/11.4: Migrated to tRPC Subscription
  // ===========================================================================

  describe('Agent start error notification', () => {
    it('should import getAgentStartErrorMessage', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Should import getAgentStartErrorMessage from agentStartErrorMessages
      expect(content).toMatch(/import.*getAgentStartErrorMessage.*from/);
    });

    it('should use tRPC Subscription for onAgentStartError', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Task 9.2: Uses tRPC subscription instead of window.electronAPI
      expect(content).toContain('events.onAgentStartError.subscribe');
    });

    it('should not use window.electronAPI for agent start error', () => {
      const content = readFileSync(mainPath, 'utf-8');
      // Ensure no executable window.electronAPI references
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
          continue;
        }
        expect(line).not.toContain('window.electronAPI');
      }
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
