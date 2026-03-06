/**
 * Component exports
 */

export { ProjectValidationPanel } from './ProjectValidationPanel';
// project-selection-view feature: プロジェクト選択画面
// Note: RecentProjects.tsx は削除され、ProjectSelectionView と RecentProjectList に置き換えられました
export { ProjectSelectionView } from './ProjectSelectionView';
export { RecentProjectList } from './RecentProjectList';
export { SpecList } from './SpecList';
export { SpecDetail } from './SpecDetail';
export { CreateSpecDialog } from './CreateSpecDialog';
export { ApprovalPanel } from './ApprovalPanel';
export { RejectDialog } from './RejectDialog';
export { ArtifactEditor } from './ArtifactEditor';
export type { TabInfo, ArtifactInfo, ArtifactEditorProps } from './ArtifactEditor';
// git-diff-viewer Task 9.1: CenterPaneContainer for ArtifactEditor/GitView switch
export { CenterPaneContainer } from './CenterPaneContainer';
export type { CenterPaneContainerProps } from './CenterPaneContainer';
export { UnsavedChangesDialog } from './UnsavedChangesDialog';
export { NotificationProvider } from './NotificationProvider';
export { ResizeHandle } from './ResizeHandle';
// Task 30-32: Agent管理コンポーネント
export { AgentListPanel } from './AgentListPanel';
export { AgentLogPanel } from './AgentLogPanel';
export { AgentInputPanel } from './AgentInputPanel';
// SDD Hybrid Workflow Components
// workflow-view-unification: ElectronWorkflowView is the unified workflow view
export { ElectronWorkflowView } from './ElectronWorkflowView';
// PhaseItem is now exported from @shared/components/workflow
export { PhaseItem, type PhaseItemProps, type WorkflowPhase, type PhaseStatus } from '@shared/components/workflow';
export { TaskProgressView } from './TaskProgressView';
export { ArtifactPreview } from './ArtifactPreview';
// CLI Install
export { CliInstallDialog } from './CliInstallDialog';
// Task 4.2, 4.3 (sidebar-refactor): プロジェクトAgent領域
export { ProjectAgentPanel } from './ProjectAgentPanel';
// Task 3.1, 3.2 (sidebar-refactor): 仕様一覧ヘッダー
export { SpecListHeader } from './SpecListHeader';
// Task 2.1, 2.2, 2.3 (sidebar-refactor): エラーバナー
export { ErrorBanner } from './ErrorBanner';
// Info Dialog
export { InfoDialog } from './InfoDialog';
// Task 5.1 (mobile-remote-access): Remote Access Control Panel
export { RemoteAccessPanel } from './RemoteAccessPanel';
export { RemoteAccessDialog } from './RemoteAccessDialog';
// Bug components removed (github-issue-integration)
// github-issue-integration: Task 16.2 - Issue components
export { CreateIssueDialog } from './CreateIssueDialog';
export type { CreateIssueDialogProps, CreateIssueFormData } from './CreateIssueDialog';
export { DocsTabs } from './DocsTabs';
export type { DocsTab } from './DocsTabs';
// SSH Remote Project Components
export { SSHStatusIndicator } from './SSHStatusIndicator';
export { SSHConnectDialog } from './SSHConnectDialog';
export { SSHAuthDialog } from './SSHAuthDialog';
export { RecentRemoteProjects } from './RecentRemoteProjects';
export { ProjectSwitchConfirmDialog } from './ProjectSwitchConfirmDialog';
// Unified Commandset Install Dialog
export { CommandsetInstallDialog } from './CommandsetInstallDialog';
export type { ProfileName } from './CommandsetInstallDialog';
// BugPhaseItem, BugWorkflowView, BugPane removed (github-issue-integration)
export { SpecPane } from './SpecPane';
// Cloudflare Tunnel Integration (Task 15.1.1, 15.1.2)
export { CloudflareSettingsPanel } from './CloudflareSettingsPanel';
export { InstallCloudflaredDialog } from './InstallCloudflaredDialog';
export type { InstallInstructions } from './InstallCloudflaredDialog';
// debatex-document-review Task 4.1: Project Settings Dialog
export { ProjectSettingsDialog } from './ProjectSettingsDialog';
// schedule-task-execution Task 8.2: Re-export ScheduleTask components from shared
export {
  ScheduleTaskSettingView,
  type ScheduleTaskSettingViewProps,
  ScheduleTaskListItem,
  type ScheduleTaskListItemProps,
  ImmediateExecutionWarningDialog,
  type ImmediateExecutionWarningDialogProps,
  ScheduleTaskEditPage,
  type ScheduleTaskEditPageProps,
  ScheduleTypeSelector,
  type ScheduleTypeSelectorProps,
  PromptListEditor,
  type PromptListEditorProps,
  AvoidanceRuleEditor,
  type AvoidanceRuleEditorProps,
  WorkflowModeEditor,
  type WorkflowModeEditorProps,
  AgentBehaviorEditor,
  type AgentBehaviorEditorProps,
} from '@shared/components/schedule';
// project-config-editor: Project configuration editing components
export { ProjectFileList } from './ProjectFileList';
export { ProjectFileEditor } from './ProjectFileEditor';
export { ExternalChangeDialog } from './ExternalChangeDialog';
export { ProjectPane } from './ProjectPane';

// git-diff-viewer Task 10.5: Git components (re-export from shared)
// git-view-source-mode Task 8.3: Extended with Source view components
export {
  GitView,
  GitFileTree,
  GitDiffViewer,
  // git-view-source-mode: Source view components
  ViewModeToggle,
  SourceCodeViewer,
  ImageViewer,
  MarkdownViewer,
  BinaryFileIndicator,
  SourceContentViewer,
} from '@shared/components/git';
export type {
  GitViewProps,
  ViewModeToggleProps,
  SourceCodeViewerProps,
  ImageViewerProps,
  MarkdownViewerProps,
  BinaryFileIndicatorProps,
  SourceContentViewerProps,
} from '@shared/components/git';
