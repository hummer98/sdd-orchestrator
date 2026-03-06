/**
 * Agent-Issue Integration Service
 *
 * github-issue-integration: Tasks 11.1, 11.2
 * Requirements:
 * - 9.1: Issue context auto-injection into Agent
 * - 9.2: Agent result posted as Issue comment
 * - 9.3: Existing Agent UI usage (no new UI)
 * - 9.4: Label maintained as status:in-progress during Agent execution
 *
 * Provides functions to integrate Agent lifecycle with GitHub Issues:
 * - isIssueAgent / extractIssueNumberFromSpecId: Detect issue-bound agents
 * - buildIssueContext: Build context string from Issue body + comments
 * - handleAgentStartForIssue: Set status:in-progress label on agent start
 * - handleAgentCompletionForIssue: Post summary comment and update label on agent exit
 */

import { projectLogger as logger } from './projectLogger';
import type { GitHubApiService } from './gitHubApiService';

// =============================================================================
// Issue Agent Detection
// =============================================================================

/**
 * Check if a specId represents an issue-bound agent.
 * Issue agents use the `issue:{number}` pattern for specId.
 *
 * @param specId - The spec ID to check
 * @returns true if the specId represents an issue agent
 */
export function isIssueAgent(specId: string): boolean {
  return specId.startsWith('issue:');
}

/**
 * Extract the GitHub Issue number from an issue-bound specId.
 *
 * @param specId - The spec ID (expected format: `issue:{number}`)
 * @returns The issue number, or null if not an issue agent or invalid number
 */
export function extractIssueNumberFromSpecId(specId: string): number | null {
  if (!isIssueAgent(specId)) {
    return null;
  }

  const numberStr = specId.substring('issue:'.length);
  const num = parseInt(numberStr, 10);

  if (isNaN(num) || num <= 0) {
    return null;
  }

  return num;
}

// =============================================================================
// Issue Context Building (Task 11.1 - Requirement 9.1)
// =============================================================================

/**
 * Build a context string from a GitHub Issue's body and comments.
 * This context is injected into the Agent's execution context so that
 * the Agent has full awareness of the Issue being worked on.
 *
 * @param gitHubApiService - GitHub API service for fetching issue data
 * @param projectPath - Project path for API authentication
 * @param issueNumber - The GitHub Issue number
 * @returns Context string, or null if issue cannot be fetched
 */
export async function buildIssueContext(
  gitHubApiService: GitHubApiService,
  projectPath: string,
  issueNumber: number,
): Promise<string | null> {
  // Fetch issue details
  const issueResult = await gitHubApiService.getIssue(projectPath, issueNumber);
  if (!issueResult.ok) {
    logger.warn('[AgentIssueIntegration] Failed to fetch issue for context', {
      issueNumber,
      error: issueResult.error,
    });
    return null;
  }

  const issue = issueResult.data;

  // Fetch comments (graceful degradation if fetch fails)
  let commentsText = '';
  const commentsResult = await gitHubApiService.getIssueComments(projectPath, issueNumber);
  if (commentsResult.ok && commentsResult.data.length > 0) {
    commentsText = commentsResult.data
      .map((c) => `### Comment by @${c.user.login} (${c.created_at})\n${c.body}`)
      .join('\n\n');
  }

  // Build labels string
  const labelsText = issue.labels.length > 0
    ? issue.labels.map((l) => l.name).join(', ')
    : 'none';

  // Compose the context
  const parts = [
    `## GitHub Issue #${issueNumber}: ${issue.title}`,
    '',
    `**State**: ${issue.state}`,
    `**Labels**: ${labelsText}`,
    `**Author**: @${issue.user.login}`,
    '',
    '### Issue Body',
    issue.body || '(empty)',
  ];

  if (commentsText) {
    parts.push('', '### Comments', '', commentsText);
  }

  return parts.join('\n');
}

// =============================================================================
// Agent Start Hook (Task 11.2 - Requirement 9.4)
// =============================================================================

/**
 * Handle agent start for an issue-bound agent.
 * Sets the Issue label to `status:in-progress`.
 *
 * @param gitHubApiService - GitHub API service
 * @param projectPath - Project path for API authentication
 * @param issueNumber - The GitHub Issue number
 */
export async function handleAgentStartForIssue(
  gitHubApiService: GitHubApiService,
  projectPath: string,
  issueNumber: number,
): Promise<void> {
  try {
    const result = await gitHubApiService.updateStatusLabel(projectPath, issueNumber, 'in-progress');
    if (!result.ok) {
      logger.warn('[AgentIssueIntegration] Failed to set in-progress label on agent start', {
        issueNumber,
        error: result.error,
      });
    } else {
      logger.info('[AgentIssueIntegration] Set status:in-progress label for issue', { issueNumber });
    }
  } catch (error) {
    logger.warn('[AgentIssueIntegration] Error setting in-progress label', {
      issueNumber,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// =============================================================================
// Agent Completion Hook (Task 11.2 - Requirement 9.2)
// =============================================================================

export interface AgentCompletionInfo {
  agentId: string;
  phase: string;
  exitCode: number;
}

/**
 * Handle agent completion for an issue-bound agent.
 * Posts a summary comment to the GitHub Issue with the execution result.
 *
 * @param gitHubApiService - GitHub API service
 * @param projectPath - Project path for API authentication
 * @param issueNumber - The GitHub Issue number
 * @param info - Agent completion details
 */
export async function handleAgentCompletionForIssue(
  gitHubApiService: GitHubApiService,
  projectPath: string,
  issueNumber: number,
  info: AgentCompletionInfo,
): Promise<void> {
  const { agentId, phase, exitCode } = info;
  const isSuccess = exitCode === 0;

  // Build the comment body
  const statusEmoji = isSuccess ? ':white_check_mark:' : ':x:';
  const statusText = isSuccess ? 'completed successfully' : 'failed';
  const body = [
    `### SDD Agent Execution Summary`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Phase** | \`${phase}\` |`,
    `| **Agent** | \`${agentId}\` |`,
    `| **Status** | ${statusEmoji} ${statusText} |`,
    `| **Exit Code** | \`${exitCode}\` |`,
    '',
    `_Automatically posted by SDD Orchestrator_`,
  ].join('\n');

  try {
    const result = await gitHubApiService.addIssueComment(projectPath, issueNumber, body);
    if (!result.ok) {
      logger.warn('[AgentIssueIntegration] Failed to post agent completion comment', {
        issueNumber,
        agentId,
        error: result.error,
      });
    } else {
      logger.info('[AgentIssueIntegration] Posted agent completion comment', {
        issueNumber,
        agentId,
        phase,
        exitCode,
      });
    }
  } catch (error) {
    logger.warn('[AgentIssueIntegration] Error posting agent completion comment', {
      issueNumber,
      agentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
