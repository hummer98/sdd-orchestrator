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
  CREATE_SPEC: 'ipc:create-spec',
  WRITE_FILE: 'ipc:write-file',
  UPDATE_APPROVAL: 'ipc:update-approval',

  // Command Execution
  EXECUTE_COMMAND: 'ipc:execute-command',
  CANCEL_EXECUTION: 'ipc:cancel-execution',
  COMMAND_OUTPUT: 'ipc:command-output',
  COMMAND_COMPLETE: 'ipc:command-complete',

  // Agent Management (Task 27.1)
  START_AGENT: 'ipc:start-agent',
  STOP_AGENT: 'ipc:stop-agent',
  RESUME_AGENT: 'ipc:resume-agent',
  GET_AGENTS: 'ipc:get-agents',
  GET_ALL_AGENTS: 'ipc:get-all-agents',
  SEND_AGENT_INPUT: 'ipc:send-agent-input',
  GET_AGENT_LOGS: 'ipc:get-agent-logs',

  // Phase Execution (high-level commands)
  EXECUTE_PHASE: 'ipc:execute-phase',
  EXECUTE_VALIDATION: 'ipc:execute-validation',
  EXECUTE_SPEC_STATUS: 'ipc:execute-spec-status',
  EXECUTE_TASK_IMPL: 'ipc:execute-task-impl',
  EXECUTE_SPEC_INIT: 'ipc:execute-spec-init',

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
  MENU_FORCE_REINSTALL: 'menu:force-reinstall',
  MENU_OPEN_PROJECT: 'menu:open-project',
  MENU_INSTALL_CLAUDE_MD: 'menu:install-claude-md',

  // Phase Sync
  SYNC_SPEC_PHASE: 'ipc:sync-spec-phase',

  // Permissions
  ADD_SHELL_PERMISSIONS: 'ipc:add-shell-permissions',
  CHECK_REQUIRED_PERMISSIONS: 'ipc:check-required-permissions',

  // Menu Events - Add Shell Permissions
  MENU_ADD_SHELL_PERMISSIONS: 'menu:add-shell-permissions',

  // CLI Install
  INSTALL_CLI_COMMAND: 'ipc:install-cli-command',
  GET_CLI_INSTALL_STATUS: 'ipc:get-cli-install-status',

  // Menu Events - CLI Install
  MENU_INSTALL_CLI_COMMAND: 'menu:install-cli-command',

  // Menu Events - Command Prefix
  MENU_SET_COMMAND_PREFIX: 'menu:set-command-prefix',

  // Menu Events - Remote Access
  MENU_TOGGLE_REMOTE_SERVER: 'menu:toggle-remote-server',

  // Menu Events - Bug Workflow
  MENU_INSTALL_BUG_WORKFLOW: 'menu:install-bug-workflow',

  // Bug Workflow Install
  CHECK_BUG_WORKFLOW_STATUS: 'ipc:check-bug-workflow-status',
  INSTALL_BUG_WORKFLOW: 'ipc:install-bug-workflow',

  // Remote Access Server (Requirements: 1.1, 1.2, 1.6)
  START_REMOTE_SERVER: 'remote-access:start',
  STOP_REMOTE_SERVER: 'remote-access:stop',
  GET_REMOTE_SERVER_STATUS: 'remote-access:get-status',
  REMOTE_SERVER_STATUS_CHANGED: 'remote-access:status-changed',
  REMOTE_CLIENT_COUNT_CHANGED: 'remote-access:client-count-changed',

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

  // CC-SDD Workflow Install (cc-sdd-command-installer feature)
  CHECK_CC_SDD_WORKFLOW_STATUS: 'ipc:check-cc-sdd-workflow-status',
  INSTALL_CC_SDD_WORKFLOW: 'ipc:install-cc-sdd-workflow',

  // Menu Events - CC-SDD Workflow
  MENU_INSTALL_CC_SDD_WORKFLOW: 'menu:install-cc-sdd-workflow',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
