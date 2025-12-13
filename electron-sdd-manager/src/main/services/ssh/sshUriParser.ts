/**
 * SSH URI Parser
 * Parses and validates ssh://user@host[:port]/path format URIs
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */

import type { Result } from '../../../renderer/types';

/**
 * Parsed SSH URI structure
 */
export interface SSHUri {
  readonly scheme: 'ssh';
  readonly user: string;
  readonly host: string;
  readonly port: number;
  readonly path: string;
}

/**
 * SSH URI parsing errors
 */
export type SSHUriError =
  | { type: 'INVALID_SCHEME'; found: string }
  | { type: 'MISSING_USER' }
  | { type: 'MISSING_HOST' }
  | { type: 'INVALID_PORT'; found: string }
  | { type: 'INVALID_PATH'; found: string };

/**
 * Default SSH port
 */
const DEFAULT_SSH_PORT = 22;

/**
 * Maximum valid port number
 */
const MAX_PORT = 65535;

/**
 * SSH URI Parser class
 * Handles parsing, validation, and stringification of SSH URIs
 */
export class SSHUriParser {
  /**
   * Parse an SSH URI string into structured components
   * Format: ssh://user@host[:port]/path
   *
   * @param uri - The URI string to parse
   * @returns Result containing SSHUri or SSHUriError
   */
  parse(uri: string): Result<SSHUri, SSHUriError> {
    if (!uri) {
      return {
        ok: false,
        error: { type: 'INVALID_SCHEME', found: '' },
      };
    }

    // Extract scheme
    const schemeMatch = uri.match(/^([a-z][a-z0-9+.-]*):\/\//i);
    if (!schemeMatch) {
      return {
        ok: false,
        error: { type: 'INVALID_SCHEME', found: '' },
      };
    }

    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'ssh') {
      return {
        ok: false,
        error: { type: 'INVALID_SCHEME', found: scheme },
      };
    }

    // Remove scheme from uri
    const withoutScheme = uri.substring(schemeMatch[0].length);

    // Find the path separator (first / after authority)
    const pathIndex = withoutScheme.indexOf('/');
    if (pathIndex === -1) {
      return {
        ok: false,
        error: { type: 'INVALID_PATH', found: '' },
      };
    }

    const authority = withoutScheme.substring(0, pathIndex);
    const path = withoutScheme.substring(pathIndex);

    // Parse authority: user@host[:port]
    const atIndex = authority.indexOf('@');
    if (atIndex === -1) {
      return {
        ok: false,
        error: { type: 'MISSING_USER' },
      };
    }

    const user = authority.substring(0, atIndex);
    if (!user) {
      return {
        ok: false,
        error: { type: 'MISSING_USER' },
      };
    }

    // Parse host and port
    let hostPort = authority.substring(atIndex + 1);
    let host: string;
    let port: number = DEFAULT_SSH_PORT;

    // Handle IPv6 addresses [::1]
    if (hostPort.startsWith('[')) {
      const closeBracket = hostPort.indexOf(']');
      if (closeBracket === -1) {
        return {
          ok: false,
          error: { type: 'MISSING_HOST' },
        };
      }
      host = hostPort.substring(1, closeBracket);
      const afterHost = hostPort.substring(closeBracket + 1);

      if (afterHost.startsWith(':')) {
        const portStr = afterHost.substring(1);
        const portResult = this.parsePort(portStr);
        if (!portResult.ok) {
          return portResult;
        }
        port = portResult.value;
      }
    } else {
      // Handle IPv4 or hostname
      const colonIndex = hostPort.lastIndexOf(':');
      if (colonIndex === -1) {
        host = hostPort;
      } else {
        host = hostPort.substring(0, colonIndex);
        const portStr = hostPort.substring(colonIndex + 1);
        const portResult = this.parsePort(portStr);
        if (!portResult.ok) {
          return portResult;
        }
        port = portResult.value;
      }
    }

    if (!host) {
      return {
        ok: false,
        error: { type: 'MISSING_HOST' },
      };
    }

    // Validate path (must be absolute)
    if (!path.startsWith('/')) {
      return {
        ok: false,
        error: { type: 'INVALID_PATH', found: path },
      };
    }

    return {
      ok: true,
      value: {
        scheme: 'ssh',
        user,
        host,
        port,
        path,
      },
    };
  }

  /**
   * Parse port string to number with validation
   */
  private parsePort(portStr: string): Result<number, SSHUriError> {
    if (!portStr || !/^\d+$/.test(portStr)) {
      return {
        ok: false,
        error: { type: 'INVALID_PORT', found: portStr },
      };
    }

    const port = parseInt(portStr, 10);
    if (port < 1 || port > MAX_PORT) {
      return {
        ok: false,
        error: { type: 'INVALID_PORT', found: portStr },
      };
    }

    return { ok: true, value: port };
  }

  /**
   * Convert SSHUri back to string format
   *
   * @param uri - The SSHUri object to stringify
   * @returns The URI string
   */
  stringify(uri: SSHUri): string {
    const host = uri.host.includes(':') ? `[${uri.host}]` : uri.host;
    return `ssh://${uri.user}@${host}:${uri.port}${uri.path}`;
  }

  /**
   * Validate if a string is a valid SSH URI
   *
   * @param uri - The URI string to validate
   * @returns true if valid, false otherwise
   */
  isValid(uri: string): boolean {
    return this.parse(uri).ok;
  }
}

// Export singleton instance for convenience
export const sshUriParser = new SSHUriParser();
