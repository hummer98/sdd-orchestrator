/**
 * Shared Workflow Components Barrel Export
 * Requirements: 3.1, 7.1, 7.2, 9.1-9.9 (git-worktree-support)
 * spec-worktree-early-creation: WorktreeModeCheckbox removed
 */

export { PhaseItem } from './PhaseItem';
export type { PhaseItemProps, WorkflowPhase, PhaseStatus } from './PhaseItem';

// spec-worktree-early-creation: WorktreeModeCheckbox REMOVED
// Worktree mode is now set at spec creation time via CreateSpecDialog

// worktree-execution-ui Task 4.1, 4.2, 4.3: Impl flow frame component
export { ImplFlowFrame } from './ImplFlowFrame';
export type { ImplFlowFrameProps } from './ImplFlowFrame';

// impl-flow-hierarchy-fix Task 2.1: Impl phase panel component
export { ImplPhasePanel } from './ImplPhasePanel';
export type { ImplPhasePanelProps } from './ImplPhasePanel';
