/**
 * Engine Config Service
 * Manages LLM engine configuration resolution and persistence
 * Requirements: 4.1-4.4, 5.1-5.3, 7.1-7.4
 */

import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getLLMEngine, type LLMEngine, type LLMEngineId } from '../../shared/registry/llmEngineRegistry';
import { logger } from './logger';

// ============================================================
// Type Definitions
// Requirements: 4.2, 5.1
// ============================================================

/**
 * Workflow phase for engine configuration
 */
export type EngineConfigPhase =
  | 'plan'
  | 'requirements'
  | 'design'
  | 'tasks'
  | 'document-review'
  | 'document-review-reply'
  | 'inspection'
  | 'impl';

/**
 * Engine ID schema for validation
 */
const LLMEngineIdSchema = z.enum(['claude', 'gemini']);

/**
 * Engine configuration schema stored in sdd-orchestrator.json
 * Requirement: 4.2
 */
export const EngineConfigSchema = z.object({
  default: LLMEngineIdSchema.optional(),
  plan: LLMEngineIdSchema.optional(),
  requirements: LLMEngineIdSchema.optional(),
  design: LLMEngineIdSchema.optional(),
  tasks: LLMEngineIdSchema.optional(),
  'document-review': LLMEngineIdSchema.optional(),
  'document-review-reply': LLMEngineIdSchema.optional(),
  inspection: LLMEngineIdSchema.optional(),
  impl: LLMEngineIdSchema.optional(),
});

export type EngineConfig = z.infer<typeof EngineConfigSchema>;

/**
 * Engine override in spec.json
 * Requirement: 5.1
 */
export interface SpecJsonEngineOverride {
  plan?: LLMEngineId;
  requirements?: LLMEngineId;
  design?: LLMEngineId;
  tasks?: LLMEngineId;
  'document-review'?: LLMEngineId;
  'document-review-reply'?: LLMEngineId;
  inspection?: LLMEngineId;
  impl?: LLMEngineId;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get the path to sdd-orchestrator.json
 */
function getConfigFilePath(projectPath: string): string {
  return path.join(projectPath, '.kiro', 'sdd-orchestrator.json');
}

/**
 * Get the path to spec.json for a spec
 */
function getSpecJsonPath(projectPath: string, specId: string): string {
  return path.join(projectPath, '.kiro', 'specs', specId, 'spec.json');
}

/**
 * Read and parse the project config file
 */
async function readProjectConfig(projectPath: string): Promise<Record<string, unknown> | null> {
  try {
    const configFilePath = getConfigFilePath(projectPath);
    const content = await fs.readFile(configFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    logger.warn('[engineConfigService] Failed to read config:', error);
    return null;
  }
}

/**
 * Read spec.json and extract engineOverride
 */
async function readSpecJsonEngineOverride(
  projectPath: string,
  specId: string
): Promise<SpecJsonEngineOverride | null> {
  try {
    const specJsonPath = getSpecJsonPath(projectPath, specId);
    const content = await fs.readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(content);
    return specJson.engineOverride ?? null;
  } catch (error) {
    logger.debug('[engineConfigService] Failed to read spec.json engineOverride:', error);
    return null;
  }
}

// ============================================================
// Engine Config Service
// Requirements: 4.1-4.4, 5.1-5.3, 7.1-7.4
// ============================================================

export const engineConfigService = {
  /**
   * Resolve engine for a specific phase
   * Priority: spec.json.engineOverride > engineConfig.{phase} > default > 'claude'
   * Requirement: 7.1
   *
   * @param projectPath - Project root path
   * @param specId - Spec ID
   * @param phase - Workflow phase
   * @returns LLMEngine instance
   */
  async resolveEngine(
    projectPath: string,
    specId: string,
    phase: EngineConfigPhase
  ): Promise<LLMEngine> {
    // 1. Check spec.json engineOverride (highest priority)
    const specOverride = await readSpecJsonEngineOverride(projectPath, specId);
    if (specOverride && specOverride[phase]) {
      const engineId = specOverride[phase];
      logger.debug('[engineConfigService] Using spec.json engineOverride', {
        specId,
        phase,
        engine: engineId,
      });
      return getLLMEngine(engineId);
    }

    // 2. Load project engine config
    const engineConfig = await this.loadEngineConfig(projectPath);

    // 3. Check phase-specific config
    if (engineConfig[phase]) {
      logger.debug('[engineConfigService] Using project engineConfig for phase', {
        phase,
        engine: engineConfig[phase],
      });
      return getLLMEngine(engineConfig[phase]);
    }

    // 4. Check default config
    if (engineConfig.default) {
      logger.debug('[engineConfigService] Using project default engine', {
        engine: engineConfig.default,
      });
      return getLLMEngine(engineConfig.default);
    }

    // 5. Fallback to claude
    logger.debug('[engineConfigService] Falling back to claude');
    return getLLMEngine('claude');
  },

  /**
   * Load engine configuration from project
   * Requirement: 4.1
   *
   * @param projectPath - Project root path
   * @returns Engine configuration
   */
  async loadEngineConfig(projectPath: string): Promise<EngineConfig> {
    const config = await readProjectConfig(projectPath);

    if (!config) {
      return {};
    }

    // Extract settings.engineConfig
    const settings = config.settings as Record<string, unknown> | undefined;
    if (!settings || !settings.engineConfig) {
      return {};
    }

    // Validate and return
    const result = EngineConfigSchema.safeParse(settings.engineConfig);
    if (result.success) {
      return result.data;
    }

    logger.warn('[engineConfigService] Invalid engineConfig, returning empty', {
      error: result.error,
    });
    return {};
  },

  /**
   * Save engine configuration to project
   * Requirement: 4.1
   *
   * @param projectPath - Project root path
   * @param config - Engine configuration to save
   */
  async saveEngineConfig(projectPath: string, config: EngineConfig): Promise<void> {
    const configFilePath = getConfigFilePath(projectPath);

    // Read existing config
    let existing: Record<string, unknown> = { version: 3 };
    const currentConfig = await readProjectConfig(projectPath);
    if (currentConfig) {
      existing = currentConfig;
    }

    // Ensure version 3
    existing.version = 3;

    // Merge engine config into settings
    const settings = (existing.settings as Record<string, unknown>) ?? {};
    settings.engineConfig = config;
    existing.settings = settings;

    // Write back
    try {
      await fs.writeFile(configFilePath, JSON.stringify(existing, null, 2), 'utf-8');
      logger.info('[engineConfigService] Engine config saved', { projectPath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Create .kiro directory if it doesn't exist
        await fs.mkdir(path.join(projectPath, '.kiro'), { recursive: true });
        await fs.writeFile(configFilePath, JSON.stringify(existing, null, 2), 'utf-8');
      } else {
        throw error;
      }
    }
  },
};
