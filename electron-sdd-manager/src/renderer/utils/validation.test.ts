/**
 * Validation Logic Tests
 * TDD: Testing spec name and description validation
 * Requirements: 4.2, 4.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import {
  validateSpecName,
  validateDescription,
  specNameSchema,
  descriptionSchema,
  createSpecSchema,
} from './validation';

describe('Spec Name Validation', () => {
  describe('validateSpecName', () => {
    it('should accept valid spec names', () => {
      expect(validateSpecName('my-feature').success).toBe(true);
      expect(validateSpecName('feature123').success).toBe(true);
      expect(validateSpecName('my-cool-feature').success).toBe(true);
      expect(validateSpecName('a').success).toBe(true);
      expect(validateSpecName('1').success).toBe(true);
    });

    it('should reject uppercase letters', () => {
      const result = validateSpecName('MyFeature');
      expect(result.success).toBe(false);
      expect(result.error).toContain('小文字');
    });

    it('should reject underscores', () => {
      const result = validateSpecName('my_feature');
      expect(result.success).toBe(false);
    });

    it('should reject spaces', () => {
      const result = validateSpecName('my feature');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateSpecName('');
      expect(result.success).toBe(false);
    });

    it('should reject directory traversal attempts', () => {
      expect(validateSpecName('../hack').success).toBe(false);
      expect(validateSpecName('..').success).toBe(false);
      expect(validateSpecName('./test').success).toBe(false);
    });

    it('should reject special characters', () => {
      expect(validateSpecName('my@feature').success).toBe(false);
      expect(validateSpecName('my#feature').success).toBe(false);
      expect(validateSpecName('my/feature').success).toBe(false);
    });
  });

  describe('specNameSchema (zod)', () => {
    it('should validate correct spec names', () => {
      expect(specNameSchema.safeParse('valid-name').success).toBe(true);
    });

    it('should reject invalid spec names with proper error', () => {
      const result = specNameSchema.safeParse('Invalid');
      expect(result.success).toBe(false);
    });
  });
});

describe('Description Validation', () => {
  describe('validateDescription', () => {
    it('should accept descriptions with 10 or more characters', () => {
      expect(validateDescription('This is a valid description').success).toBe(true);
      expect(validateDescription('1234567890').success).toBe(true);
    });

    it('should reject descriptions with less than 10 characters', () => {
      const result = validateDescription('short');
      expect(result.success).toBe(false);
      expect(result.error).toContain('10文字');
    });

    it('should reject empty description', () => {
      const result = validateDescription('');
      expect(result.success).toBe(false);
    });

    it('should count multi-byte characters correctly', () => {
      // Japanese characters should count as characters
      expect(validateDescription('これは10文字以上の説明').success).toBe(true);
      expect(validateDescription('12345').success).toBe(false);
    });
  });

  describe('descriptionSchema (zod)', () => {
    it('should validate correct descriptions', () => {
      expect(descriptionSchema.safeParse('A valid description here').success).toBe(true);
    });

    it('should reject short descriptions', () => {
      const result = descriptionSchema.safeParse('short');
      expect(result.success).toBe(false);
    });
  });
});

describe('Create Spec Schema', () => {
  describe('createSpecSchema', () => {
    it('should validate complete valid input', () => {
      const result = createSpecSchema.safeParse({
        name: 'my-feature',
        description: 'This is a valid description for the feature',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid name', () => {
      const result = createSpecSchema.safeParse({
        name: 'Invalid Name',
        description: 'Valid description here',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid description', () => {
      const result = createSpecSchema.safeParse({
        name: 'valid-name',
        description: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject both invalid', () => {
      const result = createSpecSchema.safeParse({
        name: 'Invalid',
        description: 'short',
      });
      expect(result.success).toBe(false);
    });
  });
});
