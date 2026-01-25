/**
 * Shared Registry Exports
 */

export {
  REVIEW_ENGINES,
  getReviewEngine,
  getAvailableEngines,
  DEFAULT_REVIEWER_SCHEME,
  type ReviewerScheme,
  type ReviewEngineConfig,
} from './reviewEngineRegistry';

// LLM Engine Registry (llm-engine-abstraction feature)
// Requirements: 1.1, 1.2, 1.3, 1.4
export {
  LLM_ENGINES,
  getLLMEngine,
  getAvailableLLMEngines,
  DEFAULT_LLM_ENGINE,
  type LLMEngineId,
  type LLMEngine,
  type BuildArgsOptions,
  type ParsedOutput,
} from './llmEngineRegistry';
