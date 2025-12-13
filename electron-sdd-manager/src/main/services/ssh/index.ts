/**
 * SSH Services - Export Index
 * Aggregates all SSH-related services for import convenience
 */

// URI Parser
export {
  SSHUriParser,
  sshUriParser,
  type SSHUri,
  type SSHUriError,
} from './sshUriParser';

// Authentication Service
export {
  SSHAuthService,
  sshAuthService,
  type AuthMethod,
  type NextAuthConfig,
  type AuthHandler,
} from './sshAuthService';

// Host Key Manager
export {
  HostKeyManager,
  hostKeyManager,
  type HostKeyVerificationResult,
} from './hostKeyManager';

// File System Provider
export {
  type FileSystemProvider,
  type DirEntry,
  type FileStat,
  type WatchEvent,
  type WatchHandle,
  type FSError,
  LocalFileSystemProvider,
  localFileSystemProvider,
} from './fileSystemProvider';

// SSH File System Provider
export {
  SSHFileSystemProvider,
  type SSHFileSystemProviderOptions,
} from './sshFileSystemProvider';

// Process Provider
export {
  type ProcessProvider,
  type SpawnOptions,
  type ExecOptions,
  type ExecResult,
  type ProcessHandle,
  type ProcessError,
  LocalProcessProvider,
  localProcessProvider,
} from './processProvider';

// SSH Process Provider
export { SSHProcessProvider } from './sshProcessProvider';

// Remote Agent Service
export {
  RemoteAgentService,
  type ClaudeCodeInfo,
  type AgentStartOptions,
  type AgentHandle,
  type RemoteAgentError,
} from './remoteAgentService';

// Provider Factory
export {
  ProviderFactory,
  providerFactory,
  type ProviderType,
} from './providerFactory';

// SSH Connection Service
export {
  SSHConnectionService,
  sshConnectionService,
  type ConnectionStatus,
  type SSHConnectionError,
  type ConnectionInfo,
  type SSHConnectionOptions,
} from './sshConnectionService';

// Recent Remote Projects Service
export {
  RecentRemoteProjectsService,
  getRecentRemoteProjectsService,
  type RecentRemoteProject,
} from './recentRemoteProjects';

// SSH Logger
export {
  SSHLogger,
  getSSHLogger,
  type SSHLogEntry,
  type SSHLogEntryType,
} from './sshLogger';
