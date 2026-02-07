/**
 * Engine Config Types
 * Shared type definitions for LLM engine configuration
 *
 * Migrated from legacy Electron API type definitions (Task 11.3)
 * Canonical Zod schema definition exists in main/services/engineConfigService.ts
 * This shared version is used by Renderer-side components.
 *
 * Requirements: llm-engine-abstraction 4.2, 6.1
 */

import type { LLMEngineId } from '../registry/llmEngineRegistry';

/**
 * LLM Engine Config type
 */
export interface EngineConfig {
  default?: LLMEngineId;
  plan?: LLMEngineId;
  requirements?: LLMEngineId;
  design?: LLMEngineId;
  tasks?: LLMEngineId;
  'document-review'?: LLMEngineId;
  'document-review-reply'?: LLMEngineId;
  inspection?: LLMEngineId;
  impl?: LLMEngineId;
}
