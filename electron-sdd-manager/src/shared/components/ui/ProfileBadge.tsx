/**
 * ProfileBadge Component
 * Displays the installed profile name (cc-sdd / cc-sdd-agent / spec-manager) or "not installed"
 * Requirements: 2.1, 2.2, 2.4, 2.5, 4.2, 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { clsx } from 'clsx';

// =============================================================================
// Types
// =============================================================================

/**
 * Profile name type
 * Matches ProfileName from layoutConfigService
 */
export type ProfileName = 'cc-sdd' | 'cc-sdd-agent' | 'spec-manager';

export interface ProfileBadgeProps {
  /**
   * Installed profile name
   * null displays "not installed"
   */
  profile: ProfileName | null;

  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProfileBadge - Displays profile name as an outline badge
 *
 * Usage:
 * ```tsx
 * <ProfileBadge profile="cc-sdd" />
 * <ProfileBadge profile={null} />  // Shows "not installed"
 * <ProfileBadge profile="spec-manager" className="ml-2" />
 * ```
 *
 * Requirements:
 * - 2.4: Outline style (border only, pill-shaped)
 * - 2.5: Dark mode support
 * - 5.1: ProfileBadge component in shared/components/ui/
 * - 5.2: Accept profile name (or null) as a prop
 * - 5.3: Render outline-style pill badge
 * - 5.4: Display "not installed" when profile is null
 */
export function ProfileBadge({
  profile,
  className,
}: ProfileBadgeProps): React.ReactElement {
  const displayText = profile ?? 'not installed';

  return (
    <span
      data-testid="profile-badge"
      className={clsx(
        // Base styles
        'inline-flex items-center',
        'px-2.5 py-0.5',
        'text-xs font-medium',
        // Outline pill style (Requirements: 2.4, 5.3)
        'border rounded-full',
        // Light mode colors
        'border-gray-400 text-gray-600',
        // Dark mode colors (Requirements: 2.5)
        'dark:border-gray-500 dark:text-gray-400',
        // Custom classes
        className
      )}
    >
      {displayText}
    </span>
  );
}
