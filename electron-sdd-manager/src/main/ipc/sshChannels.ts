/**
 * SSH IPC Channel Constants
 * Defines IPC channels for SSH connection and remote project management
 * Requirements: 1.1, 2.1, 6.1, 7.1, 7.2, 8.1, 8.2, 8.5
 */

export const SSH_IPC_CHANNELS = {
  // SSH Connection (Requirements: 1.1, 2.1)
  SSH_CONNECT: 'ssh:connect',
  SSH_DISCONNECT: 'ssh:disconnect',

  // SSH Status (Requirements: 6.1)
  SSH_GET_STATUS: 'ssh:get-status',
  SSH_GET_CONNECTION_INFO: 'ssh:get-connection-info',
  SSH_STATUS_CHANGED: 'ssh:status-changed',

  // Recent Remote Projects (Requirements: 8.1, 8.2, 8.5)
  SSH_GET_RECENT_REMOTE_PROJECTS: 'ssh:get-recent-remote-projects',
  SSH_ADD_RECENT_REMOTE_PROJECT: 'ssh:add-recent-remote-project',
  SSH_REMOVE_RECENT_REMOTE_PROJECT: 'ssh:remove-recent-remote-project',

  // SSH URI Validation (Requirements: 1.3, 1.5)
  SSH_VALIDATE_URI: 'ssh:validate-uri',
  SSH_PARSE_URI: 'ssh:parse-uri',
} as const;

export type SSHIpcChannel = (typeof SSH_IPC_CHANNELS)[keyof typeof SSH_IPC_CHANNELS];
