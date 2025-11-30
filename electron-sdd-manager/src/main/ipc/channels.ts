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

  // Menu Events
  MENU_FORCE_REINSTALL: 'menu:force-reinstall',

  // Phase Sync
  SYNC_SPEC_PHASE: 'ipc:sync-spec-phase',

  // Permissions
  ADD_SHELL_PERMISSIONS: 'ipc:add-shell-permissions',

  // Menu Events - Add Shell Permissions
  MENU_ADD_SHELL_PERMISSIONS: 'menu:add-shell-permissions',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
