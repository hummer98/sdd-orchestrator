/**
 * IPC Channel Constants
 * Requirements: 11.2
 */

export const IPC_CHANNELS = {
  // File System
  SHOW_OPEN_DIALOG: 'ipc:show-open-dialog',
  VALIDATE_KIRO_DIRECTORY: 'ipc:validate-kiro-directory',
  READ_SPECS: 'ipc:read-specs',
  READ_SPEC_JSON: 'ipc:read-spec-json',
  READ_ARTIFACT: 'ipc:read-artifact',
  // Bug fix: worktree-artifact-save - writeArtifact uses path resolution like readArtifact
  WRITE_ARTIFACT: 'ipc:write-artifact',
  CREATE_SPEC: 'ipc:create-spec',
  WRITE_FILE: 'ipc:write-file',
  UPDATE_APPROVAL: 'ipc:update-approval',
  // spec-scoped-auto-execution-state: Update spec.json
  UPDATE_SPEC_JSON: 'ipc:update-spec-json',

  // Agent Management (Task 27.1)
  START_AGENT: 'ipc:start-agent',
  STOP_AGENT: 'ipc:stop-agent',
  RESUME_AGENT: 'ipc:resume-agent',
  DELETE_AGENT: 'ipc:delete-agent',
  GET_AGENTS: 'ipc:get-agents',
  GET_ALL_AGENTS: 'ipc:get-all-agents',
  SEND_AGENT_INPUT: 'ipc:send-agent-input',
  GET_AGENT_LOGS: 'ipc:get-agent-logs',

  // Phase Execution (high-level commands)
  // execute-method-unification: Unified execute channel
  EXECUTE: 'ipc:execute',
  EXECUTE_SPEC_INIT: 'ipc:execute-spec-init',
  EXECUTE_SPEC_PLAN: 'ipc:execute-spec-plan', // spec-plan-ui-integration feature
  EXECUTE_BUG_CREATE: 'ipc:execute-bug-create',

  // Agent Events (Task 27.2)
  AGENT_OUTPUT: 'ipc:agent-output',
  AGENT_STATUS_CHANGE: 'ipc:agent-status-change',

  // Project
  SET_PROJECT_PATH: 'ipc:set-project-path',

  // Config
  GET_RECENT_PROJECTS: 'ipc:get-recent-projects',
  ADD_RECENT_PROJECT: 'ipc:add-recent-project',
  GET_HANG_THRESHOLD: 'ipc:get-hang-threshold',
  SET_HANG_THRESHOLD: 'ipc:set-hang-threshold',

  // App
  GET_APP_VERSION: 'ipc:get-app-version',
  GET_PLATFORM: 'ipc:get-platform',
  GET_INITIAL_PROJECT_PATH: 'ipc:get-initial-project-path',

  // Specs Watcher
  START_SPECS_WATCHER: 'ipc:start-specs-watcher',
  STOP_SPECS_WATCHER: 'ipc:stop-specs-watcher',
  SPECS_CHANGED: 'ipc:specs-changed',

  // Agent Record Watcher
  AGENT_RECORD_CHANGED: 'ipc:agent-record-changed',
  // agent-watcher-optimization Task 4.1: Switch watch scope for specific spec/bug
  SWITCH_AGENT_WATCH_SCOPE: 'ipc:switch-agent-watch-scope',
  // agent-watcher-optimization Task 2.2: Get running agent counts per spec
  GET_RUNNING_AGENT_COUNTS: 'ipc:get-running-agent-counts',

  // spec-manager Install (Requirements: 4.1-4.6)
  CHECK_SPEC_MANAGER_FILES: 'ipc:check-spec-manager-files',
  INSTALL_SPEC_MANAGER_COMMANDS: 'ipc:install-spec-manager-commands',
  INSTALL_SPEC_MANAGER_SETTINGS: 'ipc:install-spec-manager-settings',
  INSTALL_SPEC_MANAGER_ALL: 'ipc:install-spec-manager-all',
  FORCE_REINSTALL_SPEC_MANAGER_ALL: 'ipc:force-reinstall-spec-manager-all',

  // CLAUDE.md Install
  CHECK_CLAUDE_MD_EXISTS: 'ipc:check-claude-md-exists',
  INSTALL_CLAUDE_MD: 'ipc:install-claude-md',

  // Menu Events
  MENU_OPEN_PROJECT: 'menu:open-project',

  // Phase Sync
  SYNC_SPEC_PHASE: 'ipc:sync-spec-phase',

  // Permissions
  ADD_SHELL_PERMISSIONS: 'ipc:add-shell-permissions',
  ADD_MISSING_PERMISSIONS: 'ipc:add-missing-permissions',
  CHECK_REQUIRED_PERMISSIONS: 'ipc:check-required-permissions',

  // CLI Install
  INSTALL_CLI_COMMAND: 'ipc:install-cli-command',
  GET_CLI_INSTALL_STATUS: 'ipc:get-cli-install-status',

  // Menu Events - CLI Install
  MENU_INSTALL_CLI_COMMAND: 'menu:install-cli-command',

  // Menu Events - Command Prefix
  MENU_SET_COMMAND_PREFIX: 'menu:set-command-prefix',

  // Menu Events - Remote Access
  MENU_TOGGLE_REMOTE_SERVER: 'menu:toggle-remote-server',

  // Remote Access Server (Requirements: 1.1, 1.2, 1.6)
  START_REMOTE_SERVER: 'remote-access:start',
  STOP_REMOTE_SERVER: 'remote-access:stop',
  GET_REMOTE_SERVER_STATUS: 'remote-access:get-status',
  REMOTE_SERVER_STATUS_CHANGED: 'remote-access:status-changed',
  REMOTE_CLIENT_COUNT_CHANGED: 'remote-access:client-count-changed',
  REFRESH_ACCESS_TOKEN: 'remote-access:refresh-access-token',

  // Bug Management (Requirements: 3.1, 6.1, 6.3, 6.5)
  READ_BUGS: 'ipc:read-bugs',
  READ_BUG_DETAIL: 'ipc:read-bug-detail',
  START_BUGS_WATCHER: 'ipc:start-bugs-watcher',
  STOP_BUGS_WATCHER: 'ipc:stop-bugs-watcher',
  BUGS_CHANGED: 'ipc:bugs-changed',

  // Document Review Sync
  SYNC_DOCUMENT_REVIEW: 'ipc:sync-document-review',

  // Document Review Execution (Requirements: 6.1 - Document Review Workflow)
  EXECUTE_DOCUMENT_REVIEW: 'ipc:execute-document-review',
  EXECUTE_DOCUMENT_REVIEW_REPLY: 'ipc:execute-document-review-reply',
  EXECUTE_DOCUMENT_REVIEW_FIX: 'ipc:execute-document-review-fix',
  APPROVE_DOCUMENT_REVIEW: 'ipc:approve-document-review',
  SKIP_DOCUMENT_REVIEW: 'ipc:skip-document-review',
  // cc-sdd Workflow Install (cc-sdd-command-installer feature)
  CHECK_CC_SDD_WORKFLOW_STATUS: 'ipc:check-cc-sdd-workflow-status',
  INSTALL_CC_SDD_WORKFLOW: 'ipc:install-cc-sdd-workflow',

  // Menu Events - Unified Commandset Install (Requirement 10)
  MENU_INSTALL_COMMANDSET: 'menu:install-commandset',

  // Unified Commandset Install (Requirement 11)
  CHECK_COMMANDSET_STATUS: 'ipc:check-commandset-status',
  INSTALL_COMMANDSET_BY_PROFILE: 'ipc:install-commandset-by-profile',

  // Agent Folder Management (commandset-profile-agent-cleanup)
  CHECK_AGENT_FOLDER_EXISTS: 'ipc:check-agent-folder-exists',
  DELETE_AGENT_FOLDER: 'ipc:delete-agent-folder',

  // VSCode Integration
  OPEN_IN_VSCODE: 'ipc:open-in-vscode',

  // Layout Config (pane-layout-persistence feature)
  LOAD_LAYOUT_CONFIG: 'ipc:load-layout-config',
  SAVE_LAYOUT_CONFIG: 'ipc:save-layout-config',
  RESET_LAYOUT_CONFIG: 'ipc:reset-layout-config',

  // Skip Permissions Config (bug fix: persist-skip-permission-per-project)
  LOAD_SKIP_PERMISSIONS: 'ipc:load-skip-permissions',
  SAVE_SKIP_PERMISSIONS: 'ipc:save-skip-permissions',

  // Project Defaults Config (debatex-document-review Task 3.3)
  // Requirements: 4.1
  LOAD_PROJECT_DEFAULTS: 'ipc:load-project-defaults',
  SAVE_PROJECT_DEFAULTS: 'ipc:save-project-defaults',

  // Menu Events - Layout Reset
  MENU_RESET_LAYOUT: 'menu:reset-layout',

  // Experimental Tools Install (experimental-tools-installer feature)
  INSTALL_EXPERIMENTAL_DEBUG: 'ipc:install-experimental-debug',
  CHECK_EXPERIMENTAL_TOOL_EXISTS: 'ipc:check-experimental-tool-exists',

  // gemini-document-review Task 3.2: Gemini Document Review Install
  INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW: 'ipc:install-experimental-gemini-doc-review',
  CHECK_EXPERIMENTAL_GEMINI_DOC_REVIEW_EXISTS: 'ipc:check-experimental-gemini-doc-review-exists',

  // Menu Events - Experimental Tools
  MENU_INSTALL_EXPERIMENTAL_DEBUG: 'menu:install-experimental-debug',
  // gemini-document-review Task 3.3: Menu event for Gemini install
  MENU_INSTALL_EXPERIMENTAL_GEMINI_DOC_REVIEW: 'menu:install-experimental-gemini-doc-review',

  // Unified Project Selection (unified-project-selection feature)
  // Requirements: 1.1, 1.2, 1.6, 5.1-5.4, 6.1-6.4
  SELECT_PROJECT: 'ipc:select-project',

  // Multi-Window Support (Requirements: 1.1-1.5, 2.1-2.4, 3.1-3.4)
  CREATE_NEW_WINDOW: 'ipc:create-new-window',
  WINDOW_FOCUS_CHANGED: 'ipc:window-focus-changed',
  GET_WINDOW_PROJECT: 'ipc:get-window-project',
  SET_WINDOW_PROJECT: 'ipc:set-window-project',

  // Menu Events - New Window
  MENU_NEW_WINDOW: 'menu:new-window',

  // E2E Test Mode
  GET_IS_E2E_TEST: 'ipc:get-is-e2e-test',

  // Project Log (project-log-separation feature)
  // Requirements: 6.1, 6.2, 6.3
  GET_PROJECT_LOG_PATH: 'ipc:get-project-log-path',
  OPEN_LOG_IN_BROWSER: 'ipc:open-log-in-browser',

  // Cloudflare Tunnel (cloudflare-tunnel-integration feature)
  // Requirements: 1.2, 2.1, 2.2, 2.3, 3.1, 3.3
  CLOUDFLARE_GET_SETTINGS: 'cloudflare:get-settings',
  CLOUDFLARE_SET_TUNNEL_TOKEN: 'cloudflare:set-tunnel-token',
  CLOUDFLARE_REFRESH_ACCESS_TOKEN: 'cloudflare:refresh-access-token',
  CLOUDFLARE_ENSURE_ACCESS_TOKEN: 'cloudflare:ensure-access-token',
  CLOUDFLARE_CHECK_BINARY: 'cloudflare:check-binary',
  CLOUDFLARE_SET_PUBLISH_TO_CLOUDFLARE: 'cloudflare:set-publish-to-cloudflare',
  CLOUDFLARE_SET_CLOUDFLARED_PATH: 'cloudflare:set-cloudflared-path',
  CLOUDFLARE_START_TUNNEL: 'cloudflare:start-tunnel',
  CLOUDFLARE_STOP_TUNNEL: 'cloudflare:stop-tunnel',
  CLOUDFLARE_GET_TUNNEL_STATUS: 'cloudflare:get-tunnel-status',
  CLOUDFLARE_TUNNEL_STATUS_CHANGED: 'cloudflare:tunnel-status-changed',

  // Auto Execution (auto-execution-main-process feature)
  // Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
  AUTO_EXECUTION_START: 'auto-execution:start',
  AUTO_EXECUTION_STOP: 'auto-execution:stop',
  AUTO_EXECUTION_STATUS: 'auto-execution:status',
  AUTO_EXECUTION_ALL_STATUS: 'auto-execution:all-status',
  AUTO_EXECUTION_RETRY_FROM: 'auto-execution:retry-from',
  // E2E Test Support: Reset all coordinator state
  AUTO_EXECUTION_RESET: 'auto-execution:reset',
  // E2E Test Support: Set mock environment variable
  SET_MOCK_ENV: 'e2e:set-mock-env',
  // Events (Renderer -> Main)
  AUTO_EXECUTION_STATUS_CHANGED: 'auto-execution:status-changed',
  AUTO_EXECUTION_PHASE_COMPLETED: 'auto-execution:phase-completed',
  AUTO_EXECUTION_PHASE_STARTED: 'auto-execution:phase-started',
  AUTO_EXECUTION_ERROR: 'auto-execution:error',
  AUTO_EXECUTION_COMPLETED: 'auto-execution:completed',

  // Inspection Workflow (inspection-workflow-ui feature)
  // Requirements: 4.2, 4.3, 4.5
  EXECUTE_INSPECTION: 'ipc:execute-inspection',
  EXECUTE_INSPECTION_FIX: 'ipc:execute-inspection-fix',
  SET_INSPECTION_AUTO_EXECUTION_FLAG: 'ipc:set-inspection-auto-execution-flag',

  // Commandset Version Check (commandset-version-detection feature)
  // Requirements: 2.1
  CHECK_COMMANDSET_VERSIONS: 'ipc:check-commandset-versions',

  // Ask Agent Execution (agent-ask-execution feature)
  // Requirements: 2.5, 3.1-3.4, 4.1-4.5, 5.1-5.6
  EXECUTE_ASK_SPEC: 'ipc:execute-ask-spec',

  // release-button-api-fix: Project Command Execution
  // Requirements: 1.1
  EXECUTE_PROJECT_COMMAND: 'ipc:execute-project-command',

  // Renderer Logging (renderer-error-logging feature)
  // Fire-and-forget logging from renderer to main process
  LOG_RENDERER: 'ipc:log-renderer',

  // Git Worktree Support (git-worktree-support feature)
  // Requirements: 1.1, 1.3, 1.6 (design.md)
  WORKTREE_CHECK_MAIN: 'worktree:check-main',
  WORKTREE_CREATE: 'worktree:create',
  WORKTREE_REMOVE: 'worktree:remove',
  WORKTREE_RESOLVE_PATH: 'worktree:resolve-path',
  // Worktree impl start (git-worktree-support Task 4.1)
  // Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
  WORKTREE_IMPL_START: 'worktree:impl-start',
  // worktree-execution-ui Task 5.1: Normal mode impl start
  // Requirements: 9.1, 9.2
  NORMAL_MODE_IMPL_START: 'worktree:normal-mode-impl-start',
  // Spec merge execution (git-worktree-support Task 6.1)
  // Requirements: 5.1, 5.2
  EXECUTE_SPEC_MERGE: 'ipc:execute-spec-merge',

  // Bug Worktree Support (bugs-worktree-support feature)
  // Requirements: 3.1, 3.3, 4.6, 8.5
  BUG_WORKTREE_CREATE: 'bug-worktree:create',
  BUG_WORKTREE_REMOVE: 'bug-worktree:remove',
  // Settings: Default worktree mode for bugs
  // Requirements: 9.1, 9.2
  SETTINGS_BUGS_WORKTREE_DEFAULT_GET: 'settings:bugs-worktree-default:get',
  SETTINGS_BUGS_WORKTREE_DEFAULT_SET: 'settings:bugs-worktree-default:set',
  // Auto-execution worktree creation (Task 19.1)
  // Requirements: 12.1, 12.2, 12.3, 12.4
  BUG_WORKTREE_AUTO_EXECUTION: 'bug-worktree:auto-execution',

  // bug-deploy-phase: Phase update
  // Requirements: 2.4
  BUG_PHASE_UPDATE: 'bug-phase:update',

  // bugs-workflow-footer: Convert bug to worktree mode
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
  BUG_CONVERT_TO_WORKTREE: 'bug-worktree:convert',

  // Profile Badge (header-profile-badge feature)
  // Requirements: 1.1, 1.2, 1.3
  LOAD_PROFILE: 'ipc:load-profile',

  // Steering Verification (steering-verification-integration feature)
  // Requirements: 3.1, 3.2, 3.3
  CHECK_STEERING_FILES: 'ipc:check-steering-files',
  GENERATE_VERIFICATION_MD: 'ipc:generate-verification-md',

  // Release (steering-release-integration feature)
  // Requirements: 3.2, 3.4
  CHECK_RELEASE_MD: 'ipc:check-release-md',
  GENERATE_RELEASE_MD: 'ipc:generate-release-md',

  // Bug Auto Execution (bug fix: auto-execution-ui-state-dependency)
  // Main Process側でBug自動実行の状態を管理
  BUG_AUTO_EXECUTION_START: 'bug-auto-execution:start',
  BUG_AUTO_EXECUTION_STOP: 'bug-auto-execution:stop',
  BUG_AUTO_EXECUTION_STATUS: 'bug-auto-execution:status',
  BUG_AUTO_EXECUTION_ALL_STATUS: 'bug-auto-execution:all-status',
  BUG_AUTO_EXECUTION_RETRY_FROM: 'bug-auto-execution:retry-from',
  BUG_AUTO_EXECUTION_RESET: 'bug-auto-execution:reset',
  // Events (Main -> Renderer)
  BUG_AUTO_EXECUTION_STATUS_CHANGED: 'bug-auto-execution:status-changed',
  BUG_AUTO_EXECUTION_PHASE_STARTED: 'bug-auto-execution:phase-started',
  BUG_AUTO_EXECUTION_PHASE_COMPLETED: 'bug-auto-execution:phase-completed',
  BUG_AUTO_EXECUTION_ERROR: 'bug-auto-execution:error',
  BUG_AUTO_EXECUTION_COMPLETED: 'bug-auto-execution:completed',
  BUG_AUTO_EXECUTION_EXECUTE_PHASE: 'bug-auto-execution:execute-phase',

  // impl-start-unification: Unified impl start
  // Requirements: 4.2, 4.4
  START_IMPL: 'ipc:start-impl',

  // Convert Spec to Worktree (convert-spec-to-worktree feature)
  // Requirements: 3.1, 3.2, 3.3
  CONVERT_CHECK: 'convert-worktree:check',
  CONVERT_TO_WORKTREE: 'convert-worktree:execute',

  // Event Log (spec-event-log feature)
  // Requirements: 5.4
  EVENT_LOG_GET: 'ipc:event-log:get',

  // Agent Exit Error (agent-exit-robustness feature)
  // Requirements: 3.3 - Notify renderer when agent exit processing fails
  AGENT_EXIT_ERROR: 'ipc:agent-exit-error',

  // Common Commands Install (common-commands-installer feature)
  // Requirements: 3.4, 3.5
  CONFIRM_COMMON_COMMANDS: 'ipc:confirm-common-commands',

  // Parallel Task Execution (parallel-task-impl feature)
  // Requirements: 2.1 - Parse tasks.md for parallel execution
  PARSE_TASKS_FOR_PARALLEL: 'ipc:parse-tasks-for-parallel',

  // Metrics (spec-productivity-metrics feature)
  // Requirements: 1.1, 1.4, 2.12, 5.1
  RECORD_HUMAN_SESSION: 'metrics:record-human-session',
  GET_SPEC_METRICS: 'metrics:get-spec-metrics',
  GET_PROJECT_METRICS: 'metrics:get-project-metrics',
  METRICS_UPDATED: 'metrics:updated',

// MCP Server (mcp-server-integration feature)
  // Requirements: 6.3, 6.4, 6.5
  MCP_START: 'mcp:start',
  MCP_STOP: 'mcp:stop',
  MCP_GET_STATUS: 'mcp:get-status',
  MCP_GET_SETTINGS: 'mcp:get-settings',
  MCP_SET_ENABLED: 'mcp:set-enabled',
  MCP_SET_PORT: 'mcp:set-port',
  MCP_STATUS_CHANGED: 'mcp:status-changed',

  // Schedule Task (schedule-task-execution feature)
  // Requirements: All IPC (design.md API Contract)
  // Idle Time Sync (Task 7.1)
  // Requirements: 4.3 (アイドル検出時キュー追加)
  SCHEDULE_TASK_REPORT_IDLE_TIME: 'schedule-task:report-idle-time',
  // CRUD operations
  SCHEDULE_TASK_GET_ALL: 'schedule-task:get-all',
  SCHEDULE_TASK_GET: 'schedule-task:get',
  SCHEDULE_TASK_CREATE: 'schedule-task:create',
  SCHEDULE_TASK_UPDATE: 'schedule-task:update',
  SCHEDULE_TASK_DELETE: 'schedule-task:delete',
  // Execution control
  SCHEDULE_TASK_EXECUTE_IMMEDIATELY: 'schedule-task:execute-immediately',
  SCHEDULE_TASK_GET_QUEUE: 'schedule-task:get-queue',
  SCHEDULE_TASK_GET_RUNNING: 'schedule-task:get-running',
  // Events (Main -> Renderer)
  SCHEDULE_TASK_STATUS_CHANGED: 'schedule-task:status-changed',

  // Migration Service (runtime-agents-restructure feature)
  // Requirements: 5.1, 5.2, 5.4
  CHECK_MIGRATION_NEEDED: 'ipc:check-migration-needed',
  ACCEPT_MIGRATION: 'ipc:accept-migration',
  DECLINE_MIGRATION: 'ipc:decline-migration',

  // LLM Engine Config (llm-engine-abstraction feature)
  // Requirements: 6.1
  LOAD_ENGINE_CONFIG: 'ipc:load-engine-config',
  SAVE_ENGINE_CONFIG: 'ipc:save-engine-config',
  GET_AVAILABLE_LLM_ENGINES: 'ipc:get-available-llm-engines',

  // jj Support (jj-merge-support feature)
  // Task 12.2: IPC channels for jj installation and configuration
  CHECK_JJ_AVAILABILITY: 'ipc:check-jj-availability',
  INSTALL_JJ: 'ipc:install-jj',
  IGNORE_JJ_INSTALL: 'ipc:ignore-jj-install',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
