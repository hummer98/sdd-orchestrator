/**
 * CLI Args Parser Tests
 *
 * Task 10.1-10.3: CLI起動オプションの実装
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 11.9
 *
 * このテストはE2Eテスト用のCLI引数解析を検証する。
 */

import { describe, it, expect } from 'vitest';
import { parseCLIArgs, printHelp, type CLIOptions } from './cliArgsParser';

describe('Task 10.1: CLIArgsParser', () => {
  describe('parseCLIArgs', () => {
    it('should return default values when no arguments', () => {
      const result = parseCLIArgs([]);

      expect(result).toEqual<CLIOptions>({
        projectPath: null,
        remoteUIAuto: false,
        remotePort: 8765,
        headless: false,
        remoteToken: null,
        noAuth: false,
        e2eTest: false,
        help: false,
      });
    });

    it('should parse --project=<path>', () => {
      const result = parseCLIArgs(['--project=/path/to/project']);

      expect(result.projectPath).toBe('/path/to/project');
    });

    it('should parse --project <path>', () => {
      const result = parseCLIArgs(['--project', '/path/to/project']);

      expect(result.projectPath).toBe('/path/to/project');
    });

    it('should parse --remote-ui=auto', () => {
      const result = parseCLIArgs(['--remote-ui=auto']);

      expect(result.remoteUIAuto).toBe(true);
    });

    it('should parse --remote-port=<port>', () => {
      const result = parseCLIArgs(['--remote-port=3000']);

      expect(result.remotePort).toBe(3000);
    });

    it('should parse --remote-port <port>', () => {
      const result = parseCLIArgs(['--remote-port', '8888']);

      expect(result.remotePort).toBe(8888);
    });

    it('should validate port range (1-65535)', () => {
      // Port out of range should use default
      const result1 = parseCLIArgs(['--remote-port=0']);
      expect(result1.remotePort).toBe(8765);

      const result2 = parseCLIArgs(['--remote-port=70000']);
      expect(result2.remotePort).toBe(8765);

      // Valid port should be used
      const result3 = parseCLIArgs(['--remote-port=8080']);
      expect(result3.remotePort).toBe(8080);
    });

    it('should parse --headless', () => {
      const result = parseCLIArgs(['--headless']);

      expect(result.headless).toBe(true);
    });

    it('should parse --remote-token=<token>', () => {
      const result = parseCLIArgs(['--remote-token=my-secret-token']);

      expect(result.remoteToken).toBe('my-secret-token');
    });

    it('should parse --remote-token <token>', () => {
      const result = parseCLIArgs(['--remote-token', 'another-token']);

      expect(result.remoteToken).toBe('another-token');
    });

    it('should parse --no-auth', () => {
      const result = parseCLIArgs(['--no-auth']);

      expect(result.noAuth).toBe(true);
    });

    it('should parse --e2e-test', () => {
      const result = parseCLIArgs(['--e2e-test']);

      expect(result.e2eTest).toBe(true);
    });

    it('should parse --help', () => {
      const result = parseCLIArgs(['--help']);

      expect(result.help).toBe(true);
    });

    it('should parse -h as help', () => {
      const result = parseCLIArgs(['-h']);

      expect(result.help).toBe(true);
    });

    it('should parse multiple options', () => {
      const result = parseCLIArgs([
        '--project=/my/project',
        '--remote-ui=auto',
        '--remote-port=9000',
        '--headless',
        '--remote-token=test-token',
        '--e2e-test',
      ]);

      expect(result.projectPath).toBe('/my/project');
      expect(result.remoteUIAuto).toBe(true);
      expect(result.remotePort).toBe(9000);
      expect(result.headless).toBe(true);
      expect(result.remoteToken).toBe('test-token');
      expect(result.e2eTest).toBe(true);
    });

    it('should handle invalid port gracefully', () => {
      const result = parseCLIArgs(['--remote-port=invalid']);

      // Invalid port should use default
      expect(result.remotePort).toBe(8765);
    });
  });

  describe('Task 10.3: printHelp', () => {
    it('should return help text with all options', () => {
      const help = printHelp();

      // Check that all options are documented
      expect(help).toContain('--project');
      expect(help).toContain('--remote-ui=auto');
      expect(help).toContain('--remote-port');
      expect(help).toContain('--headless');
      expect(help).toContain('--remote-token');
      expect(help).toContain('--no-auth');
      expect(help).toContain('--e2e-test');
      expect(help).toContain('--help');
    });

    it('should include usage example', () => {
      const help = printHelp();

      expect(help).toContain('Usage:');
    });

    it('should include description for E2E testing', () => {
      const help = printHelp();

      expect(help).toMatch(/E2E|e2e|test/i);
    });
  });
});
