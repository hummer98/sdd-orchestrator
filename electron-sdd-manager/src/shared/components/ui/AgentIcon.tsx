/**
 * AgentIcon and AgentBranchIcon Components
 * Agent startup button icon components with unified color
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import React from 'react';
import { Bot, GitBranch } from 'lucide-react';
import { clsx } from 'clsx';

// =============================================================================
// Constants
// =============================================================================

/**
 * Unified color for Agent startup button icons
 * Requirement 3.3: Single source of truth for icon color
 */
export const AGENT_ICON_COLOR = 'text-white';

// =============================================================================
// Types
// =============================================================================

export interface AgentIconProps {
  /** Icon size (Tailwind class) */
  className?: string;
  /** data-testid attribute */
  'data-testid'?: string;
}

export interface AgentBranchIconProps {
  /** Icon size (Tailwind class) */
  className?: string;
  /** data-testid attribute */
  'data-testid'?: string;
}

// =============================================================================
// Components
// =============================================================================

/**
 * AgentIcon - Single Bot icon for Agent startup buttons
 * Requirement 3.1: AgentIcon component creation
 *
 * Usage:
 * ```tsx
 * <AgentIcon />
 * <AgentIcon className="w-5 h-5" />
 * ```
 */
export function AgentIcon({
  className,
  'data-testid': testId,
}: AgentIconProps): React.ReactElement {
  return (
    <Bot
      data-testid={testId}
      className={clsx('w-4 h-4', AGENT_ICON_COLOR, className)}
    />
  );
}

/**
 * AgentBranchIcon - Bot + GitBranch dual icon for Worktree mode
 * Requirement 3.2: AgentBranchIcon component creation
 * Requirement 2.3: gap-1 spacing between icons
 *
 * Usage:
 * ```tsx
 * <AgentBranchIcon />
 * <AgentBranchIcon className="w-5 h-5" />
 * ```
 */
export function AgentBranchIcon({
  className,
  'data-testid': testId,
}: AgentBranchIconProps): React.ReactElement {
  return (
    <span data-testid={testId} className="flex items-center gap-1">
      <Bot className={clsx('w-4 h-4', AGENT_ICON_COLOR, className)} />
      <GitBranch className={clsx('w-4 h-4', AGENT_ICON_COLOR, className)} />
    </span>
  );
}
