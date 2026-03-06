/**
 * StatusLabelBadge Component
 * Displays a color-coded badge for `status:` prefixed GitHub Labels.
 *
 * github-issue-integration: Task 7.2
 * Requirements: 2.5
 */

import React from 'react';
import { clsx } from 'clsx';
import type { StatusLabel } from '@shared/types/github';

// =============================================================================
// Types
// =============================================================================

export interface StatusLabelBadgeProps {
  status: StatusLabel;
  className?: string;
}

// =============================================================================
// Color mapping for Tailwind (status label -> bg/text classes)
// =============================================================================

const STATUS_BADGE_STYLES: Record<StatusLabel, string> = {
  'triage': 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'in-review': 'bg-cyan-100 text-cyan-800',
  'changes-requested': 'bg-orange-100 text-orange-800',
  'done': 'bg-green-100 text-green-800',
};

// =============================================================================
// Component
// =============================================================================

export const StatusLabelBadge = React.memo(function StatusLabelBadge({
  status,
  className,
}: StatusLabelBadgeProps): React.ReactElement {
  return (
    <span
      data-testid="status-label-badge"
      className={clsx(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        STATUS_BADGE_STYLES[status] ?? 'bg-gray-100 text-gray-800',
        className
      )}
    >
      status:{status}
    </span>
  );
});
