/**
 * Remote UI Views barrel export
 *
 * Task 13.8: App.tsx統合
 */

export { SpecsView } from './SpecsView';
export type { SpecsViewProps } from './SpecsView';

// Mobile版専用のSpec詳細・Phase実行UI
export { MobileSpecWorkflowView } from './MobileSpecWorkflowView';
export type { MobileSpecWorkflowViewProps } from './MobileSpecWorkflowView';
// 後方互換性のためのエイリアス（非推奨）
export { MobileSpecWorkflowView as SpecDetailView } from './MobileSpecWorkflowView';
export type { MobileSpecWorkflowViewProps as SpecDetailViewProps } from './MobileSpecWorkflowView';

export { SpecActionsView } from './SpecActionsView';
export type { SpecActionsViewProps } from './SpecActionsView';

export { AgentView } from './AgentView';
export type { AgentViewProps } from './AgentView';

export { BugsView } from './BugsView';
export type { BugsViewProps } from './BugsView';

export { BugDetailView } from './BugDetailView';
export type { BugDetailViewProps } from './BugDetailView';

export { ProjectAgentView } from './ProjectAgentView';
export type { ProjectAgentViewProps } from './ProjectAgentView';

// workflow-view-unification: Remote UI版ワークフロービュー
export { RemoteWorkflowView } from './RemoteWorkflowView';
export type { RemoteWorkflowViewProps } from './RemoteWorkflowView';
