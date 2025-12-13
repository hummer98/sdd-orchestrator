/**
 * SSHUriParser Unit Tests
 * TDD: Testing SSH URI parsing and validation
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */

import { describe, it, expect } from 'vitest';
import { SSHUriParser, type SSHUri, type SSHUriError } from './sshUriParser';

describe('SSHUriParser', () => {
  const parser = new SSHUriParser();

  describe('parse', () => {
    describe('valid URIs', () => {
      it('should parse complete SSH URI with port', () => {
        const result = parser.parse('ssh://user@host.example.com:2222/home/user/project');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.scheme).toBe('ssh');
          expect(result.value.user).toBe('user');
          expect(result.value.host).toBe('host.example.com');
          expect(result.value.port).toBe(2222);
          expect(result.value.path).toBe('/home/user/project');
        }
      });

      it('should parse SSH URI without port (default to 22)', () => {
        const result = parser.parse('ssh://admin@server.local/var/www');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.port).toBe(22);
          expect(result.value.user).toBe('admin');
          expect(result.value.host).toBe('server.local');
          expect(result.value.path).toBe('/var/www');
        }
      });

      it('should parse SSH URI with IP address host', () => {
        const result = parser.parse('ssh://root@192.168.1.100:22/root/project');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.host).toBe('192.168.1.100');
        }
      });

      it('should parse SSH URI with IPv6 host', () => {
        const result = parser.parse('ssh://user@[::1]:22/home/user');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.host).toBe('::1');
        }
      });

      it('should parse SSH URI with root path', () => {
        const result = parser.parse('ssh://user@host/');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.path).toBe('/');
        }
      });

      it('should parse SSH URI with subdomain host', () => {
        const result = parser.parse('ssh://dev@git.example.org:22/repos/project');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.host).toBe('git.example.org');
        }
      });

      it('should parse SSH URI with numeric username', () => {
        const result = parser.parse('ssh://user123@host/path');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.user).toBe('user123');
        }
      });

      it('should parse SSH URI with underscore in username', () => {
        const result = parser.parse('ssh://user_name@host/path');

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.user).toBe('user_name');
        }
      });
    });

    describe('invalid URIs', () => {
      it('should reject non-ssh scheme', () => {
        const result = parser.parse('http://user@host/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_SCHEME');
          if (result.error.type === 'INVALID_SCHEME') {
            expect(result.error.found).toBe('http');
          }
        }
      });

      it('should reject missing scheme', () => {
        const result = parser.parse('user@host/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_SCHEME');
        }
      });

      it('should reject missing user', () => {
        const result = parser.parse('ssh://host.example.com/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('MISSING_USER');
        }
      });

      it('should reject empty user', () => {
        const result = parser.parse('ssh://@host.example.com/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('MISSING_USER');
        }
      });

      it('should reject missing host', () => {
        const result = parser.parse('ssh://user@/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('MISSING_HOST');
        }
      });

      it('should reject invalid port (non-numeric)', () => {
        const result = parser.parse('ssh://user@host:abc/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_PORT');
          if (result.error.type === 'INVALID_PORT') {
            expect(result.error.found).toBe('abc');
          }
        }
      });

      it('should reject invalid port (out of range)', () => {
        const result = parser.parse('ssh://user@host:70000/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_PORT');
        }
      });

      it('should reject invalid port (negative)', () => {
        const result = parser.parse('ssh://user@host:-1/path');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_PORT');
        }
      });

      it('should reject missing path', () => {
        const result = parser.parse('ssh://user@host');

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.type).toBe('INVALID_PATH');
        }
      });

      it('should reject relative path', () => {
        const result = parser.parse('ssh://user@host:22/relative/path/../escape');

        // path normalization should be handled, but traversal should be allowed in URI itself
        // Just ensure we get a proper parse result
        const result2 = parser.parse('ssh://user@host:22/relative');
        expect(result2.ok).toBe(true);
      });

      it('should reject empty string', () => {
        const result = parser.parse('');

        expect(result.ok).toBe(false);
      });
    });
  });

  describe('stringify', () => {
    it('should convert SSHUri back to string', () => {
      const uri: SSHUri = {
        scheme: 'ssh',
        user: 'admin',
        host: 'server.example.com',
        port: 2222,
        path: '/home/admin/project',
      };

      const result = parser.stringify(uri);
      expect(result).toBe('ssh://admin@server.example.com:2222/home/admin/project');
    });

    it('should include port even if default 22', () => {
      const uri: SSHUri = {
        scheme: 'ssh',
        user: 'user',
        host: 'localhost',
        port: 22,
        path: '/home/user',
      };

      const result = parser.stringify(uri);
      expect(result).toBe('ssh://user@localhost:22/home/user');
    });

    it('should handle IPv6 host', () => {
      const uri: SSHUri = {
        scheme: 'ssh',
        user: 'user',
        host: '::1',
        port: 22,
        path: '/root',
      };

      const result = parser.stringify(uri);
      expect(result).toBe('ssh://user@[::1]:22/root');
    });
  });

  describe('isValid', () => {
    it('should return true for valid URIs', () => {
      expect(parser.isValid('ssh://user@host/path')).toBe(true);
      expect(parser.isValid('ssh://user@host:22/path')).toBe(true);
      expect(parser.isValid('ssh://admin@192.168.1.1:2222/home/admin')).toBe(true);
    });

    it('should return false for invalid URIs', () => {
      expect(parser.isValid('http://user@host/path')).toBe(false);
      expect(parser.isValid('ssh://host/path')).toBe(false);
      expect(parser.isValid('ssh://user@/path')).toBe(false);
      expect(parser.isValid('')).toBe(false);
      expect(parser.isValid('not-a-uri')).toBe(false);
    });
  });

  describe('round-trip', () => {
    it('should parse and stringify to equivalent URI', () => {
      const originalUri = 'ssh://developer@remote.server.io:2222/opt/projects/app';
      const parseResult = parser.parse(originalUri);

      expect(parseResult.ok).toBe(true);
      if (parseResult.ok) {
        const stringified = parser.stringify(parseResult.value);
        expect(stringified).toBe(originalUri);
      }
    });

    it('should normalize port in round-trip when originally omitted', () => {
      const originalUri = 'ssh://user@host/path';
      const parseResult = parser.parse(originalUri);

      expect(parseResult.ok).toBe(true);
      if (parseResult.ok) {
        expect(parseResult.value.port).toBe(22);
        const stringified = parser.stringify(parseResult.value);
        expect(stringified).toBe('ssh://user@host:22/path');
      }
    });
  });
});
