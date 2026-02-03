/**
 * EngineCommandResolverService
 * Resolves engineId to LLM CLI command path
 * unified-engine-command-resolution: Task 1.1
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * This service centralizes LLM engine command resolution.
 * Currently supports 'claude' (delegating to ClaudePathResolverService).
 * Future engines (e.g., 'gemini') can be added via switch statement extension.
 */

import { getClaudePathResolverService } from './claudePathResolverService';
import type { LLMEngineId } from '../../shared/registry/llmEngineRegistry';

/**
 * EngineCommandResolverService
 * Resolves engineId to the actual command path for spawning LLM CLI processes
 *
 * @example
 * const service = getEngineCommandResolverService();
 * const command = service.resolveCommand('claude');
 * // Returns resolved path like '/usr/local/bin/claude' or 'claude' if not resolved
 */
export class EngineCommandResolverService {
  /**
   * Resolve engineId to command path
   *
   * @param engineId - LLM engine identifier ('claude' | 'gemini')
   * @returns Command path (resolved path for claude, engineId as-is for others)
   *
   * @precondition engineId is a valid LLMEngineId
   * @postcondition For 'claude', returns ClaudePathResolverService resolved path
   * @postcondition For unknown engines, returns engineId as-is (fallback)
   * @invariant E2E_MOCK_CLAUDE_COMMAND is respected via ClaudePathResolverService
   */
  resolveCommand(engineId: LLMEngineId): string {
    // Requirement 2.2, 2.3: Switch statement for extensibility
    switch (engineId) {
      case 'claude':
        // Requirement 2.2: Delegate to ClaudePathResolverService
        // Requirement 2.4: E2E_MOCK_CLAUDE_COMMAND support is handled by ClaudePathResolverService
        return getClaudePathResolverService().getClaudePath();

      case 'gemini':
        // Requirement 2.3: Future engine extension point
        // Gemini doesn't require path resolution currently - return as-is
        return engineId;

      default:
        // Fallback for unknown engines
        return engineId;
    }
  }
}

// ============================================================
// Singleton Instance Management
// ============================================================

let instance: EngineCommandResolverService | null = null;

/**
 * Get the singleton EngineCommandResolverService instance
 * Requirement 2.1: Singleton pattern for consistent behavior
 */
export function getEngineCommandResolverService(): EngineCommandResolverService {
  if (!instance) {
    instance = new EngineCommandResolverService();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing only)
 */
export function resetEngineCommandResolverService(): void {
  instance = null;
}
