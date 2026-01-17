/**
 * ExecuteOptions Type Tests
 *
 * execute-method-unification: Task 1.1, 1.2, 1.3
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * Tests for the ExecuteOptions Union type and related interfaces.
 * These tests validate compile-time type safety using TypeScript type assertions.
 */

import { describe, it, expect } from 'vitest';
import type {
  ExecutePhaseBase,
  ExecuteRequirements,
  ExecuteDesign,
  ExecuteTasks,
  ExecuteDeploy,
  ExecuteImpl,
  ExecuteDocumentReview,
  ExecuteDocumentReviewReply,
  ExecuteDocumentReviewFix,
  ExecuteInspection,
  ExecuteInspectionFix,
  ExecuteSpecMerge,
  ExecuteOptions,
} from './executeOptions';

describe('ExecuteOptions', () => {
  describe('ExecutePhaseBase', () => {
    it('should have required fields: specId, featureName', () => {
      // Type assertion test - this validates the interface at compile time
      const base: ExecutePhaseBase = {
        specId: 'test-spec',
        featureName: 'test-feature',
      };

      expect(base.specId).toBe('test-spec');
      expect(base.featureName).toBe('test-feature');
    });

    it('should have optional commandPrefix field', () => {
      const baseWithPrefix: ExecutePhaseBase = {
        specId: 'test-spec',
        featureName: 'test-feature',
        commandPrefix: 'kiro',
      };

      expect(baseWithPrefix.commandPrefix).toBe('kiro');
    });

    it('should accept spec-manager as commandPrefix', () => {
      const base: ExecutePhaseBase = {
        specId: 'test-spec',
        featureName: 'test-feature',
        commandPrefix: 'spec-manager',
      };

      expect(base.commandPrefix).toBe('spec-manager');
    });
  });

  describe('ExecuteRequirements', () => {
    it('should have type discriminant "requirements"', () => {
      const options: ExecuteRequirements = {
        type: 'requirements',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('requirements');
    });
  });

  describe('ExecuteDesign', () => {
    it('should have type discriminant "design"', () => {
      const options: ExecuteDesign = {
        type: 'design',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('design');
    });
  });

  describe('ExecuteTasks', () => {
    it('should have type discriminant "tasks"', () => {
      const options: ExecuteTasks = {
        type: 'tasks',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('tasks');
    });
  });

  describe('ExecuteDeploy', () => {
    it('should have type discriminant "deploy"', () => {
      const options: ExecuteDeploy = {
        type: 'deploy',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('deploy');
    });
  });

  describe('ExecuteImpl', () => {
    it('should have type discriminant "impl" and taskId field', () => {
      const options: ExecuteImpl = {
        type: 'impl',
        specId: 'my-feature',
        featureName: 'my-feature',
        taskId: '1.1',
      };

      expect(options.type).toBe('impl');
      expect(options.taskId).toBe('1.1');
    });
  });

  describe('ExecuteDocumentReview', () => {
    it('should have type discriminant "document-review"', () => {
      const options: ExecuteDocumentReview = {
        type: 'document-review',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('document-review');
    });

    it('should have optional scheme field', () => {
      const options: ExecuteDocumentReview = {
        type: 'document-review',
        specId: 'my-feature',
        featureName: 'my-feature',
        scheme: 'gemini-cli',
      };

      expect(options.scheme).toBe('gemini-cli');
    });
  });

  describe('ExecuteDocumentReviewReply', () => {
    it('should have type discriminant "document-review-reply" and reviewNumber', () => {
      const options: ExecuteDocumentReviewReply = {
        type: 'document-review-reply',
        specId: 'my-feature',
        featureName: 'my-feature',
        reviewNumber: 1,
      };

      expect(options.type).toBe('document-review-reply');
      expect(options.reviewNumber).toBe(1);
    });

    it('should have optional autofix field', () => {
      const options: ExecuteDocumentReviewReply = {
        type: 'document-review-reply',
        specId: 'my-feature',
        featureName: 'my-feature',
        reviewNumber: 2,
        autofix: true,
      };

      expect(options.autofix).toBe(true);
    });
  });

  describe('ExecuteDocumentReviewFix', () => {
    it('should have type discriminant "document-review-fix" and reviewNumber', () => {
      const options: ExecuteDocumentReviewFix = {
        type: 'document-review-fix',
        specId: 'my-feature',
        featureName: 'my-feature',
        reviewNumber: 1,
      };

      expect(options.type).toBe('document-review-fix');
      expect(options.reviewNumber).toBe(1);
    });
  });

  describe('ExecuteInspection', () => {
    it('should have type discriminant "inspection"', () => {
      const options: ExecuteInspection = {
        type: 'inspection',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('inspection');
    });
  });

  describe('ExecuteInspectionFix', () => {
    it('should have type discriminant "inspection-fix" and roundNumber', () => {
      const options: ExecuteInspectionFix = {
        type: 'inspection-fix',
        specId: 'my-feature',
        featureName: 'my-feature',
        roundNumber: 1,
      };

      expect(options.type).toBe('inspection-fix');
      expect(options.roundNumber).toBe(1);
    });
  });

  describe('ExecuteSpecMerge', () => {
    it('should have type discriminant "spec-merge"', () => {
      const options: ExecuteSpecMerge = {
        type: 'spec-merge',
        specId: 'my-feature',
        featureName: 'my-feature',
      };

      expect(options.type).toBe('spec-merge');
    });
  });

  describe('ExecuteOptions Union', () => {
    it('should accept all phase types', () => {
      const cases: ExecuteOptions[] = [
        { type: 'requirements', specId: 'test', featureName: 'test' },
        { type: 'design', specId: 'test', featureName: 'test' },
        { type: 'tasks', specId: 'test', featureName: 'test' },
        { type: 'deploy', specId: 'test', featureName: 'test' },
        { type: 'impl', specId: 'test', featureName: 'test', taskId: '1' },
        { type: 'document-review', specId: 'test', featureName: 'test' },
        { type: 'document-review-reply', specId: 'test', featureName: 'test', reviewNumber: 1 },
        { type: 'document-review-fix', specId: 'test', featureName: 'test', reviewNumber: 1 },
        { type: 'inspection', specId: 'test', featureName: 'test' },
        { type: 'inspection-fix', specId: 'test', featureName: 'test', roundNumber: 1 },
        { type: 'spec-merge', specId: 'test', featureName: 'test' },
      ];

      expect(cases).toHaveLength(11);
    });

    it('should support discriminated union pattern with type narrowing', () => {
      const processOptions = (options: ExecuteOptions): string => {
        switch (options.type) {
          case 'requirements':
          case 'design':
          case 'tasks':
          case 'deploy':
          case 'document-review':
          case 'inspection':
          case 'spec-merge':
            return `${options.type}:${options.featureName}`;
          case 'impl':
            return `impl:${options.featureName}:${options.taskId}`;
          case 'document-review-reply':
            return `review-reply:${options.reviewNumber}`;
          case 'document-review-fix':
            return `review-fix:${options.reviewNumber}`;
          case 'inspection-fix':
            return `inspection-fix:${options.roundNumber}`;
        }
      };

      const implOpts: ExecuteOptions = { type: 'impl', specId: 'a', featureName: 'b', taskId: '1.1' };
      expect(processOptions(implOpts)).toBe('impl:b:1.1');

      const reqOpts: ExecuteOptions = { type: 'requirements', specId: 'a', featureName: 'b' };
      expect(processOptions(reqOpts)).toBe('requirements:b');
    });
  });
});
