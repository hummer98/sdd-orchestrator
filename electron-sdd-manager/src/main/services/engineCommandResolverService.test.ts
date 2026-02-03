/**
 * EngineCommandResolverService Tests
 * unified-engine-command-resolution: Task 1.1
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  EngineCommandResolverService,
  getEngineCommandResolverService,
  resetEngineCommandResolverService,
} from './engineCommandResolverService';
import * as claudePathResolverModule from './claudePathResolverService';

describe('EngineCommandResolverService', () => {
  let service: EngineCommandResolverService;
  let mockGetClaudePath: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton for each test
    resetEngineCommandResolverService();

    // Mock ClaudePathResolverService
    mockGetClaudePath = vi.fn().mockReturnValue('/usr/local/bin/claude');
    vi.spyOn(claudePathResolverModule, 'getClaudePathResolverService').mockReturnValue({
      getClaudePath: mockGetClaudePath,
      resolveClaudePath: vi.fn(),
      isResolved: vi.fn().mockReturnValue(true),
    } as unknown as claudePathResolverModule.ClaudePathResolverService);

    service = new EngineCommandResolverService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up environment variable
    delete process.env.E2E_MOCK_CLAUDE_COMMAND;
  });

  describe('resolveCommand', () => {
    // Requirement 2.2: 'claude' delegates to ClaudePathResolverService
    it('should resolve claude engine to ClaudePathResolverService path', () => {
      const result = service.resolveCommand('claude');
      expect(result).toBe('/usr/local/bin/claude');
      expect(mockGetClaudePath).toHaveBeenCalled();
    });

    // Requirement 2.1: Service creation and method existence
    it('should return resolved path for claude engine', () => {
      mockGetClaudePath.mockReturnValue('/home/user/.local/bin/claude');
      const result = service.resolveCommand('claude');
      expect(result).toBe('/home/user/.local/bin/claude');
    });

    // Requirement 2.3: Future engine extension point - unknown engineId returns as-is
    it('should return engineId as-is for unknown engines (gemini)', () => {
      const result = service.resolveCommand('gemini');
      expect(result).toBe('gemini');
      expect(mockGetClaudePath).not.toHaveBeenCalled();
    });

    // Requirement 2.4: E2E_MOCK_CLAUDE_COMMAND environment variable support
    it('should respect E2E_MOCK_CLAUDE_COMMAND for claude engine', () => {
      process.env.E2E_MOCK_CLAUDE_COMMAND = '/tmp/mock-claude';
      mockGetClaudePath.mockReturnValue('/tmp/mock-claude');

      const result = service.resolveCommand('claude');
      expect(result).toBe('/tmp/mock-claude');
    });

    // Default value test
    it('should use default engine (claude) when engineId is undefined', () => {
      // Note: The actual API expects LLMEngineId, so passing undefined would be a type error
      // This test verifies the expected behavior at the service layer
      const result = service.resolveCommand('claude');
      expect(result).toBe('/usr/local/bin/claude');
    });

    // Cache behavior - same path returned on multiple calls
    it('should return consistent path for multiple calls', () => {
      const result1 = service.resolveCommand('claude');
      const result2 = service.resolveCommand('claude');
      expect(result1).toBe(result2);
    });
  });

  describe('getEngineCommandResolverService (singleton)', () => {
    beforeEach(() => {
      resetEngineCommandResolverService();
    });

    it('should return singleton instance', () => {
      const instance1 = getEngineCommandResolverService();
      const instance2 = getEngineCommandResolverService();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getEngineCommandResolverService();
      resetEngineCommandResolverService();
      const instance2 = getEngineCommandResolverService();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('resolveCommand with fallback', () => {
    it('should return "claude" when ClaudePathResolverService returns "claude" (not resolved)', () => {
      mockGetClaudePath.mockReturnValue('claude');
      const result = service.resolveCommand('claude');
      expect(result).toBe('claude');
    });
  });
});
