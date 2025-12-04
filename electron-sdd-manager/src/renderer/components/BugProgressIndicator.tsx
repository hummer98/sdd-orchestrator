/**
 * BugProgressIndicator Component
 * 4-phase bug workflow progress indicator
 * Requirements: 3.2, 3.3, 3.4
 */

import React from 'react';
import {
  FileText,
  Search,
  Wrench,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import type { BugPhase } from '../types';
import { BUG_PHASES } from '../types';

interface BugProgressIndicatorProps {
  phase: BugPhase;
  compact?: boolean;
}

interface PhaseConfig {
  key: BugPhase;
  label: string;
  icon: typeof FileText;
}

const PHASE_CONFIGS: PhaseConfig[] = [
  { key: 'reported', label: 'Report', icon: FileText },
  { key: 'analyzed', label: 'Analyze', icon: Search },
  { key: 'fixed', label: 'Fix', icon: Wrench },
  { key: 'verified', label: 'Verify', icon: CheckCircle2 },
];

function getPhaseIndex(phase: BugPhase): number {
  return BUG_PHASES.indexOf(phase);
}

/**
 * BugProgressIndicator displays the current phase of a bug in the workflow
 * - Report → Analyze → Fix → Verify
 * - Completed phases are shown with filled icons
 * - Current phase is highlighted
 * - Future phases are shown with outline icons
 */
export function BugProgressIndicator({ phase, compact = false }: BugProgressIndicatorProps): React.ReactElement {
  const currentIndex = getPhaseIndex(phase);

  return (
    <div
      className={`flex items-center ${compact ? 'gap-0.5' : 'gap-1'}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={3}
      aria-valuenow={currentIndex}
      aria-valuetext={`${phase} (${currentIndex + 1}/4)`}
    >
      {PHASE_CONFIGS.map((config, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = config.icon;

        // Determine styling based on phase status
        let iconClass = 'text-gray-400'; // Future phase
        if (isCompleted) {
          iconClass = 'text-green-600'; // Completed phase
        } else if (isCurrent) {
          iconClass = 'text-blue-600'; // Current phase
        }

        const size = compact ? 14 : 16;

        return (
          <div
            key={config.key}
            className={`flex items-center ${index > 0 ? (compact ? 'ml-0.5' : 'ml-1') : ''}`}
            title={config.label}
          >
            {/* Connector line between phases */}
            {index > 0 && (
              <div
                className={`${compact ? 'w-1' : 'w-2'} h-0.5 ${
                  index <= currentIndex ? 'bg-green-400' : 'bg-gray-300'
                } mr-0.5`}
              />
            )}

            {/* Phase icon */}
            {isCompleted ? (
              <Icon
                size={size}
                className={`${iconClass} fill-current`}
                data-testid={`phase-${config.key}-completed`}
              />
            ) : isCurrent ? (
              <Icon
                size={size}
                className={iconClass}
                data-testid={`phase-${config.key}-current`}
              />
            ) : (
              <Circle
                size={size}
                className={iconClass}
                data-testid={`phase-${config.key}-pending`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * BugPhaseLabel displays the phase label text
 */
export function BugPhaseLabel({ phase }: { phase: BugPhase }): React.ReactElement {
  const config = PHASE_CONFIGS.find((c) => c.key === phase);
  const currentIndex = getPhaseIndex(phase);
  const isCompleted = currentIndex === BUG_PHASES.length - 1;

  let labelClass = 'text-gray-600';
  if (isCompleted) {
    labelClass = 'text-green-600';
  } else if (currentIndex > 0) {
    labelClass = 'text-blue-600';
  }

  return (
    <span className={`text-xs font-medium ${labelClass}`}>
      {config?.label || phase}
    </span>
  );
}

export default BugProgressIndicator;
