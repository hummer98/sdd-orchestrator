/**
 * AgentCategory Module
 * Defines category types and path resolution utilities for runtime agents restructure
 *
 * Requirements: 1.1, 1.3, 1.5 (metadata paths), 1.2, 1.4, 1.6 (log paths)
 *
 * Directory structure:
 * .kiro/runtime/agents/
 * ├── specs/{specId}/
 * │   ├── agent-{id}.json
 * │   └── logs/agent-{id}.log
 * ├── bugs/{bugId}/
 * │   ├── agent-{id}.json
 * │   └── logs/agent-{id}.log
 * └── project/
 *     ├── agent-{id}.json
 *     └── logs/agent-{id}.log
 */

import * as path from 'path';

/**
 * Agent category type
 * - 'specs': Spec-bound agents
 * - 'bugs': Bug-bound agents
 * - 'project': Project-level agents (not tied to spec or bug)
 */
export type AgentCategory = 'specs' | 'bugs' | 'project';

/**
 * Determine category from specId
 * Business Rules:
 * - specId starting with 'bug:' -> 'bugs' category
 * - empty specId -> 'project' category
 * - otherwise -> 'specs' category
 *
 * @param specId - The spec ID (may include 'bug:' prefix for bugs, empty for project)
 * @returns The category type
 */
export function determineCategory(specId: string): AgentCategory {
  if (specId === '') {
    return 'project';
  }
  if (specId.startsWith('bug:')) {
    return 'bugs';
  }
  return 'specs';
}

/**
 * Extract the entity ID from specId
 * - For bugs: removes 'bug:' prefix
 * - For project: returns empty string
 * - For specs: returns as-is
 *
 * @param specId - The spec ID
 * @returns The entity ID (specId for specs, bugId for bugs, empty for project)
 */
export function getEntityIdFromSpecId(specId: string): string {
  if (specId === '') {
    return '';
  }
  if (specId.startsWith('bug:')) {
    return specId.substring(4); // Remove 'bug:' prefix
  }
  return specId;
}

/**
 * Get the base path for a category and entity
 * @param basePath - Base path (e.g., '.kiro/runtime/agents')
 * @param category - The category
 * @param entityId - The entity ID (specId for specs, bugId for bugs, empty for project)
 * @returns The base path for the category/entity
 */
export function getCategoryBasePath(
  basePath: string,
  category: AgentCategory,
  entityId: string
): string {
  if (category === 'project') {
    return path.join(basePath, 'project');
  }
  return path.join(basePath, category, entityId);
}

/**
 * Get the metadata file path for an agent
 * Requirements: 1.1 (spec), 1.3 (bug), 1.5 (project)
 *
 * @param basePath - Base path (e.g., '.kiro/runtime/agents')
 * @param category - The category
 * @param entityId - The entity ID
 * @param agentId - The agent ID
 * @returns The full path to the metadata JSON file
 */
export function getMetadataPath(
  basePath: string,
  category: AgentCategory,
  entityId: string,
  agentId: string
): string {
  const categoryPath = getCategoryBasePath(basePath, category, entityId);
  return path.join(categoryPath, `${agentId}.json`);
}

/**
 * Get the log file path for an agent
 * Requirements: 1.2 (spec), 1.4 (bug), 1.6 (project)
 *
 * @param basePath - Base path (e.g., '.kiro/runtime/agents')
 * @param category - The category
 * @param entityId - The entity ID
 * @param agentId - The agent ID
 * @returns The full path to the log file
 */
export function getLogPath(
  basePath: string,
  category: AgentCategory,
  entityId: string,
  agentId: string
): string {
  const categoryPath = getCategoryBasePath(basePath, category, entityId);
  return path.join(categoryPath, 'logs', `${agentId}.log`);
}
