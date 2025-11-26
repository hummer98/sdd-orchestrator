/**
 * Validation utilities
 * Requirements: 4.2, 4.3, 4.4
 */

import { z } from 'zod';

// Spec name pattern: lowercase letters, numbers, and hyphens only
const SPEC_NAME_PATTERN = /^[a-z0-9-]+$/;

interface ValidationResult {
  success: boolean;
  error?: string;
}

/**
 * Validate spec name
 */
export function validateSpecName(name: string): ValidationResult {
  if (!name || name.length === 0) {
    return {
      success: false,
      error: '仕様名を入力してください',
    };
  }

  if (!SPEC_NAME_PATTERN.test(name)) {
    return {
      success: false,
      error: '仕様名は小文字・数字・ハイフンのみ使用できます',
    };
  }

  if (name.includes('..')) {
    return {
      success: false,
      error: '無効な仕様名です',
    };
  }

  return { success: true };
}

/**
 * Validate description
 */
export function validateDescription(description: string): ValidationResult {
  if (!description) {
    return {
      success: false,
      error: '説明を入力してください',
    };
  }

  // Use spread operator to correctly count Unicode characters
  const charCount = [...description].length;

  if (charCount < 10) {
    return {
      success: false,
      error: '説明は10文字以上で入力してください',
    };
  }

  return { success: true };
}

/**
 * Zod schema for spec name
 */
export const specNameSchema = z
  .string()
  .min(1, '仕様名を入力してください')
  .regex(SPEC_NAME_PATTERN, '仕様名は小文字・数字・ハイフンのみ使用できます')
  .refine((val) => !val.includes('..'), '無効な仕様名です');

/**
 * Zod schema for description
 */
export const descriptionSchema = z
  .string()
  .min(1, '説明を入力してください')
  .refine((val) => [...val].length >= 10, '説明は10文字以上で入力してください');

/**
 * Zod schema for creating a new spec
 */
export const createSpecSchema = z.object({
  name: specNameSchema,
  description: descriptionSchema,
});

export type CreateSpecInput = z.infer<typeof createSpecSchema>;
