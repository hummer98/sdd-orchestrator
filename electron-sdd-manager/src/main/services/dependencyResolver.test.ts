/**
 * DependencyResolver Tests
 * TDD: コマンドセット間の依存関係解決のテスト
 * Requirements: 3.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyResolver, DependencyError, CircularDependency } from './dependencyResolver';
import { CommandsetName } from './unifiedCommandsetInstaller';

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('resolveInstallOrder', () => {
    it('should return commandsets in correct order when no dependencies', () => {
      const commandsets: CommandsetName[] = ['cc-sdd', 'bug'];
      const result = resolver.resolveInstallOrder(commandsets);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['cc-sdd', 'bug']);
      }
    });

    it('should handle empty commandsets list', () => {
      const commandsets: CommandsetName[] = [];
      const result = resolver.resolveInstallOrder(commandsets);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual([]);
      }
    });

    it('should handle single commandset', () => {
      const commandsets: CommandsetName[] = ['cc-sdd'];
      const result = resolver.resolveInstallOrder(commandsets);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['cc-sdd']);
      }
    });

    it('should resolve dependencies in topological order', () => {
      // In current design, bug depends on nothing, cc-sdd depends on nothing
      // This test validates the topological sort works
      const commandsets: CommandsetName[] = ['bug', 'cc-sdd'];
      const result = resolver.resolveInstallOrder(commandsets);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Order should be preserved when no dependencies
        expect(result.value.length).toBe(2);
        expect(result.value).toContain('bug');
        expect(result.value).toContain('cc-sdd');
      }
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect no circular dependencies when none exist', () => {
      const commandsets: CommandsetName[] = ['cc-sdd', 'bug'];
      const result = resolver.detectCircularDependencies(commandsets);

      expect(result).toEqual([]);
    });

    it('should handle empty commandsets list', () => {
      const commandsets: CommandsetName[] = [];
      const result = resolver.detectCircularDependencies(commandsets);

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle spec-manager as alias for cc-sdd', () => {
      const commandsets: CommandsetName[] = ['spec-manager'];
      const result = resolver.resolveInstallOrder(commandsets);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['spec-manager']);
      }
    });

    it('should deduplicate commandsets', () => {
      const commandsets: CommandsetName[] = ['cc-sdd', 'cc-sdd', 'bug'];
      const result = resolver.resolveInstallOrder(commandsets);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(2);
        expect(result.value).toContain('cc-sdd');
        expect(result.value).toContain('bug');
      }
    });
  });
});
