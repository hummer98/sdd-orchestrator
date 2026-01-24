/**
 * Shared Bug Components Barrel Export
 * Requirements: 3.1, 7.2
 * bugs-view-unification: Added BugListContainer export
 * mobile-layout-refine: Task 1.1 - Added BugWorkflowFooter export
 */

export { BugListItem } from './BugListItem';
export type { BugListItemProps } from './BugListItem';

export { BugListContainer, BUG_PHASE_FILTER_OPTIONS } from './BugListContainer';
export type { BugListContainerProps, BugPhaseFilter } from './BugListContainer';

// mobile-layout-refine: Task 1.1
// Requirements: 7.1, 7.2, 7.3 - BugWorkflowFooter shared component
export { BugWorkflowFooter, canShowBugConvertButton } from './BugWorkflowFooter';
export type { BugWorkflowFooterProps, BugJson } from './BugWorkflowFooter';
