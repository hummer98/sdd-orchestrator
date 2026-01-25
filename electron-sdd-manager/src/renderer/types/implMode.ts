/**
 * ImplMode Types
 * impl-mode-toggle: Task 1.1
 *
 * Type definitions for implementation mode selection (Sequential / Parallel)
 * Requirements: 1.1, 1.2, 1.3
 */

// =============================================================================
// Requirement 1.2: impl.mode が 'sequential' または 'parallel' を持つ
// =============================================================================

/**
 * 実装モード
 * - 'sequential': spec-impl を使用した順次実行
 * - 'parallel': spec-auto-impl を使用した並列バッチ実行
 * Requirements: 1.2
 */
export type ImplMode = 'sequential' | 'parallel';

// =============================================================================
// Requirement 1.1: spec.json に impl オブジェクトを追加
// =============================================================================

/**
 * spec.json の impl フィールド
 * Requirements: 1.1
 */
export interface ImplConfig {
  mode: ImplMode;
}

// =============================================================================
// Requirement 1.3: フィールド未存在時のデフォルト 'sequential'
// =============================================================================

/**
 * デフォルトの実装モード
 * 従来の spec-impl の動作を維持するため 'sequential' をデフォルトとする
 * Requirements: 1.3
 */
export const DEFAULT_IMPL_MODE: ImplMode = 'sequential';

// =============================================================================
// Type Guards and Helpers
// =============================================================================

/**
 * 値が有効な ImplMode かどうかを判定する型ガード
 * @param value 検証する値
 * @returns ImplMode であれば true
 */
export function isImplMode(value: unknown): value is ImplMode {
  return value === 'sequential' || value === 'parallel';
}

/**
 * spec.json オブジェクトから impl.mode を取得するヘルパー
 * フィールドが存在しない場合やinvalidな場合はデフォルト値を返す
 * Requirements: 1.3
 *
 * @param specJson spec.json オブジェクト（部分的）
 * @returns ImplMode値
 */
export function getImplMode(specJson: { impl?: { mode?: unknown } }): ImplMode {
  const mode = specJson?.impl?.mode;
  if (isImplMode(mode)) {
    return mode;
  }
  return DEFAULT_IMPL_MODE;
}
