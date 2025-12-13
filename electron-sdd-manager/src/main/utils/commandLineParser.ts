/**
 * Command Line Parser
 * Parses command line arguments for project paths and SSH URIs
 * Requirements: 1.4, 10.2
 */

/**
 * Initial connection type
 */
export type InitialConnection =
  | { type: 'local'; path: string }
  | { type: 'ssh'; uri: string };

/**
 * Check if a string is an SSH URI
 */
export function isSSHUri(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('ssh://');
}

/**
 * Parse project argument from command line or environment
 *
 * Priority:
 * 1. SDD_SSH_URI environment variable
 * 2. SDD_PROJECT_PATH environment variable
 * 3. --project=<path> or --project <path> command line argument
 *
 * @returns Project path (local or SSH URI) or null
 */
export function parseProjectArg(): string | null {
  // First check SSH URI environment variable (highest priority)
  const sshUri = process.env.SDD_SSH_URI;
  if (sshUri) {
    return sshUri;
  }

  // Then check local project path environment variable
  const envPath = process.env.SDD_PROJECT_PATH;
  if (envPath) {
    return envPath;
  }

  // Parse command line arguments
  const args = process.argv.slice(2); // Remove node and app path

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // --project=<path> format
    if (arg.startsWith('--project=')) {
      const path = arg.substring('--project='.length);
      return path || null;
    }

    // --project <path> format
    if (arg === '--project' && i + 1 < args.length) {
      return args[i + 1];
    }
  }

  return null;
}

/**
 * Parse initial connection from command line or environment
 *
 * @returns InitialConnection object or null if no argument
 */
export function parseInitialConnection(): InitialConnection | null {
  const projectArg = parseProjectArg();

  if (!projectArg) {
    return null;
  }

  if (isSSHUri(projectArg)) {
    return {
      type: 'ssh',
      uri: projectArg,
    };
  }

  return {
    type: 'local',
    path: projectArg,
  };
}
