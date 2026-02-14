# Implementation Plan

- [x] 1. useShallowインポートパターンの確立とRenderer主要コンポーネントのセレクター適用
- [x] 1.1 App.tsxのストア購読を全てセレクターパターンに変更する
  - useProjectStoreから使用するstateフィールド（currentProject, kiroValidation, installedProfile等）のみをuseShallowで購読し、アクション関数（loadRecentProjects, selectProject, checkSpecManagerFiles）は個別セレクターまたは直接参照で取得する
  - useSpecStore, useSharedBugStore, useAgentStore, useMcpStore, useNotificationStoreも同様にstateフィールドのみセレクター化する
  - 追加ストア: useEditorStore（isDirty: stateフィールド→セレクター化）、useRemoteAccessStore（isRunning等: state+actions→セレクター化）、useConnectionStore（authDialog, projectSwitchConfirm等: state+actions→セレクター化）のセレクター適用も行う
  - useWorkflowStore（setCommandPrefix: アクション専用）、useToolPathStore（fetchStatuses: アクション専用）、useProjectEditorStore（clearEditor: アクション専用）はReq 1.2によりセレクター化対象外
  - アクション関数のみを使用している箇所（setupEventListeners等）はセレクター化不要と判定し、個別セレクター `s => s.action` で取得する
  - useShallowは `import { useShallow } from 'zustand/react/shallow'` でインポートする
  - `applySelectProjectResult`のみ使用するサブコンポーネントも同様にセレクター化する
  - _Requirements: 1.1, 1.2, 3.1, 4.1, 4.2_

- [x] 1.2 (P) BugPane, BugWorkflowViewのセレクター適用
  - BugPaneのuseSharedBugStore購読を、使用するstateフィールド（bugs, selectedBugId, bugDetail）のみのuseShallowセレクターに変更する
  - BugWorkflowViewも同様に使用するstateフィールドのみを購読する
  - _Requirements: 1.1, 1.3_

- [x] 1.3 (P) SpecPane, SpecDetail, ApprovalPanelのセレクター適用
  - SpecPaneのuseSpecStore購読を、使用するstateフィールド（selectedSpec, specDetail, isDetailLoading）のみのuseShallowセレクターに変更する
  - SpecDetailのuseSpecStore購読とuseProjectStore購読を同様にセレクター化する
  - ApprovalPanelのuseSpecStore購読（selectedSpec, specDetail）をセレクター化する
  - _Requirements: 1.1_

- [x] 1.4 (P) BugList, SpecListのセレクター適用
  - BugListのuseSharedBugStore購読を、stateフィールド（bugs, selectedBugId, isLoading, error）はuseShallowで、アクション（selectBug）は個別セレクターで取得する
  - SpecListのuseSpecStore購読を、stateフィールド（selectedSpec, statusFilter, isLoading, error, specJsonMap等）はuseShallowで、アクション（selectSpec, setStatusFilter, getSortedFilteredSpecs）は個別セレクターで取得する
  - SpecListのuseAgentStore購読（getRunningAgentCount）はアクションのみのため個別セレクターとする
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.5 (P) useElectronWorkflowState フックのセレクター適用
  - useSpecStore購読（specDetail, isLoading, selectedSpec）をuseShallowセレクターに変更する
  - useWorkflowStore購読（セレクターなし全購読）を使用フィールドのみのセレクターに変更する
  - _Requirements: 1.1_

- [x] 2. Renderer補助コンポーネントのセレクター適用
- [x] 2.1 (P) DocsTabs, ErrorBanner, ProjectPaneのセレクター適用
  - DocsTabsのuseProjectStore購読（currentProject）を個別セレクターに変更する
  - DocsTabsのuseAgentStore購読（selectAgent）はアクションのみのため個別セレクターとする
  - ErrorBannerのuseProjectStore購読を使用するstateフィールドのみのセレクターに変更する
  - ProjectPaneのuseProjectStore購読（currentProject）を個別セレクターに変更する
  - ProjectPaneのuseProjectEditorStore購読（7フィールド: currentFilePath, currentFileName, externalChangeDetected等 + actions）をuseShallowセレクターに変更する
  - _Requirements: 1.1, 1.2_

- [x] 2.2 (P) CreateSpecDialog, CreateBugDialog のセレクター適用
  - CreateSpecDialogのuseProjectStore購読（currentProject）を個別セレクターに変更する
  - CreateSpecDialogのuseAgentStore購読（selectForProjectAgents, selectAgent, addAgent）はアクションのみのため変更不要と判定する
  - CreateBugDialogのuseProjectStore購読とuseAgentStore購読も同様に処理する
  - _Requirements: 1.1, 1.2_

- [x] 2.3 (P) ProjectSelectionView, RecentProjectList, ProjectValidationPanelのセレクター適用
  - ProjectSelectionViewのuseProjectStore購読（selectProject, isLoading, error）を、stateフィールド（isLoading, error）はuseShallowまたは個別セレクター、アクション（selectProject）は個別セレクターで取得する
  - RecentProjectListのuseProjectStore購読（recentProjects, isLoading）はuseShallowまたは個別セレクター、アクション（selectProject）は個別セレクターで取得する
  - ProjectValidationPanelのuseProjectStore購読を使用するstateフィールドのみのセレクターに変更する
  - _Requirements: 1.1_

- [x] 2.4 (P) McpSettingsPanel, RemoteAccessPanel, RemoteAccessDialog, ArtifactEditor, ToolSettingsPanelのセレクター適用
  - McpSettingsPanelのuseProjectStore購読（currentProject）を個別セレクターに変更する
  - McpSettingsPanelのuseMcpStore購読（isRunning, port）を個別セレクターまたはuseShallowに変更する
  - RemoteAccessPanelのuseProjectStore購読（currentProject）を個別セレクターに変更する
  - RemoteAccessPanelのuseRemoteAccessStore購読（20フィールド: isRunning, port, url等 + actions）をuseShallowセレクターに変更する
  - RemoteAccessDialogのuseRemoteAccessStore購読（showInstallCloudflaredDialog, dismissInstallDialog）をstateフィールドは個別セレクター、アクションは個別セレクターで取得する
  - ArtifactEditor.tsxのuseEditorStore購読（18フィールド: activeTab, content, isDirty等 + actions）をuseShallowセレクターに変更する
  - ToolSettingsPanel.tsxのuseToolPathStore購読（5フィールド: statuses, isLoading, error + actions）をuseShallowセレクターに変更する
  - _Requirements: 1.1_

- [x] 2.5 (P) BugActionButtons, AgentListPanel, ProjectAgentPanelのセレクター適用
  - BugActionButtonsのuseAgentStore購読（startAgent）はアクションのみのため個別セレクターで取得する
  - BugActionButtonsのuseNotificationStore購読（addNotification）も同様にアクション個別セレクターとする
  - AgentListPanelのuseAgentStore購読を、stateフィールド（selectedAgentId, agents, skipPermissions）はuseShallowで、アクション群は個別セレクターで取得する
  - ProjectAgentPanelのuseAgentStore購読とuseProjectStore購読を同様にセレクター化する
  - _Requirements: 1.1, 1.2_

- [x] 2.6 (P) NotificationProvider, ProjectFileEditorのセレクター適用
  - NotificationProviderのuseNotificationStore購読（notifications, removeNotification）を、stateフィールド（notifications）は個別セレクター、アクション（removeNotification）は個別セレクターで取得する
  - ProjectFileEditorのuseNotificationStore購読（showNotification）はアクションのみのため個別セレクターとする
  - ProjectFileEditorのuseProjectEditorStore購読（10フィールド: content, isDirty, isSaving, mode, error等 + actions）をuseShallowセレクターに変更する
  - _Requirements: 1.1, 1.2_

- [x] 3. Remote UIコンポーネントのセレクター適用
- [x] 3.1 remote-ui/App.tsxのストア購読をセレクターパターンに変更する
  - LeftSidebar内のuseSharedAgentStore購読（selectAgent, selectedAgentId, removeAgent）を、stateフィールド（selectedAgentId）は個別セレクター、アクション（selectAgent, removeAgent）は個別セレクターで取得する
  - RightSidebar内のuseSharedAgentStore購読（selectAgent, selectedAgentId）も同様に処理する
  - FooterContent内のuseSharedAgentStore購読はストア全体を使用しているため、必要なフィールドを特定しセレクター化する
  - _Requirements: 1.4, 3.2_

- [x] 3.2 (P) BugsView, BugDetailView, CreateBugDialogRemote, RemoteProjectEditorのセレクター適用
  - BugsViewのuseSharedBugStore購読を、stateフィールド（bugs, isLoading, error）はuseShallowで、アクション（loadBugs, selectBug, startWatching, stopWatching）は個別セレクターで取得する
  - BugDetailViewのuseSharedBugStore購読（useWorktree, setUseWorktree）を個別セレクターまたはuseShallowに変更する
  - CreateBugDialogRemoteのuseSharedBugStore購読（useWorktree, setUseWorktree, createBug）を処理する
  - RemoteProjectEditor.tsxのuseProjectEditorStore購読（9フィールド: content, isDirty, isSaving, error, mode + actions）をuseShallowセレクターに変更する
  - _Requirements: 1.4_

- [x] 4. Sharedコンポーネントのセレクター適用
- [x] 4.1 ScheduleTaskSettingViewのセレクター適用
  - useScheduleTaskStore購読（14フィールド全購読）を使用するstateフィールド（tasks, editingTask, isCreatingNew, isLoading）のみのuseShallowセレクターに変更し、アクション関数（startEditing, startNewTask, cancelEditing, loadTasks, createTask, updateTask, deleteTask, toggleTaskEnabled, executeImmediately）は個別セレクターで取得する
  - _Requirements: 1.1_

- [x] 4.2 (P) DocsTreeSectionのセレクター適用
  - DirectoryNode内のuseDocsTreeExpandedStore購読（isExpanded, toggleDir）をstateフィールド（isExpanded）は個別セレクター、アクション（toggleDir）は個別セレクターで取得する
  - _Requirements: 1.1_

- [x] 4.3 (P) GitView, GitDiffViewer, GitFileTreeのセレクター適用
  - GitView.tsxのuseSharedGitViewStore購読（11フィールド: isLoading, error, cachedStatus, fileTreeWidth, diffMode, selectedFilePath, cachedFileContent: state + setFileTreeWidth, refreshStatus, clearError, setDiffMode: action）をuseShallowセレクターでstateフィールドのみ購読し、アクションは個別セレクターで取得する
  - GitDiffViewer.tsxのuseSharedGitViewStore購読（6フィールド: selectedFilePath, cachedDiffContent, isLoading, error, diffMode: state + setDiffMode: action）をuseShallowセレクターでstateフィールドのみ購読し、アクションは個別セレクターで取得する
  - GitFileTree.tsxのuseSharedGitViewStore購読（5フィールド: cachedStatus, selectedFilePath, expandedDirs: state + selectFile, toggleDir: action）をuseShallowセレクターでstateフィールドのみ購読し、アクションは個別セレクターで取得する
  - _Requirements: 1.1_

- [x] 5. リストアイテムコンポーネントのメモ化とコールバック安定化
- [x] 5.1 BugListItem, SpecListItemをReact.memoでラップする
  - BugListItemの`export function`を`export const BugListItem = React.memo(function BugListItem(...) { ... })`に変更する
  - SpecListItemも同様にReact.memoでラップする
  - 各コンポーネントのdisplayNameが正しく設定されることを確認する（named function式により自動設定）
  - _Requirements: 2.1, 2.3_

- [x] 5.2 (P) AgentListItem, EventLogListItem, ScheduleTaskListItemをReact.memoでラップする
  - AgentListItemの`export function`を`export const AgentListItem = React.memo(function AgentListItem(...) { ... })`に変更する
  - EventLogListItem, ScheduleTaskListItemも同様にReact.memoでラップする
  - _Requirements: 2.1, 2.3_

- [x] 5.3 BugListContainer, SpecListContainerのインラインコールバックを安定化する
  - BugListContainerの`onSelect={() => onSelectBug(bug)}`インラインコールバックを排除し、useCallbackでメモ化されたコールバック、またはアイテム内部でのid呼び出しパターンに変更する
  - SpecListContainerの`onSelect={() => onSelectSpec(spec)}`も同様に安定化する
  - 親コンポーネント（BugList, SpecList）のハンドラ関数（handleSelectBug, handleSelectSpec）がuseCallbackでメモ化されていることを確認する
  - _Requirements: 2.2_

- [x] 5.4 (P) AgentListのインラインコールバックを安定化する
  - AgentListの`onSelect={() => onSelect(agent.agentId)}`、`onStop={(e) => onStop(e, agent.agentId)}`、`onRemove={(e) => onRemove(e, agent.agentId)}`のインラインコールバックを排除する
  - useCallbackでメモ化されたコールバック、またはアイテム内部でのid呼び出しパターンに変更する
  - _Requirements: 2.2_

- [x] 5.5 (P) ScheduleTaskList（ScheduleTaskSettingView内）のインラインコールバックを安定化する
  - ScheduleTaskList内の`onClick={() => onTaskClick(task)}`インラインコールバックを排除し、useCallbackでメモ化されたコールバック、またはアイテム内部でのid呼び出しパターンに変更する
  - _Requirements: 2.2_

- [x] 6. テストモック更新とリグレッション検証
- [x] 6.1 セレクター変更に伴うユニットテストのストアモック更新
  - セレクター付き`useStore(selector)`呼び出しに変更したコンポーネントのテストファイルで、ストアモックが`useStore.mockImplementation((selector) => selector ? selector(mockState) : mockState)`パターンに対応していることを確認・修正する
  - React.memoでラップしたコンポーネントの既存テストが正しく動作することを確認する
  - _Requirements: 5.1_

- [x] 6.2 TypeScriptコンパイルチェックの通過を確認する
  - `cd electron-sdd-manager && npm run typecheck` を実行し、全変更ファイルで型エラーがないことを確認する
  - _Requirements: 5.3_

- [x] 6.3 ユニットテスト全件パスを確認する
  - `task electron:test:run` を実行し、既存ユニットテストが全てパスすることを確認する
  - _Requirements: 5.1_

- [x] 6.4 ビルド成功を確認する
  - `cd electron-sdd-manager && npm run build` を実行し、本番ビルドが成功することを確認する
  - _Requirements: 5.3_

---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | セレクターなし全購読の解消 | 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3 | Feature |
| 1.2 | アクション関数のセレクター化対象外 | 1.1, 1.4, 2.1, 2.2, 2.5, 2.6 | Feature |
| 1.3 | useSharedBugStore全購読箇所の修正 | 1.1, 1.2, 1.4 | Feature |
| 1.4 | Remote UIコンポーネントの修正 | 3.1, 3.2 | Feature |
| 2.1 | 5コンポーネントのReact.memo適用 | 5.1, 5.2 | Feature |
| 2.2 | インラインコールバックの排除 | 5.3, 5.4, 5.5 | Feature |
| 2.3 | shallow equalでのprops比較 | 5.1, 5.2 | Feature |
| 3.1 | renderer/App.tsxのセレクター最適化 | 1.1 | Feature |
| 3.2 | remote-ui/App.tsxの最適化 | 3.1 | Feature |
| 4.1 | useShallowインポートパターンの確立 | 1.1 | Feature |
| 4.2 | useShallow使用基準の明確化 | 1.1 | Feature |
| 5.1 | 既存ユニットテストの通過 | 6.1, 6.3 | Validation |
| 5.2 | 既存E2Eテストの通過 | (E2Eテストは動作変更なしのため既存テストで担保) | Validation |
| 5.3 | TypeScript型チェックの通過 | 6.2, 6.4 | Validation |
