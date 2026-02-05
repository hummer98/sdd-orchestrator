/**
 * MermaidService
 *
 * Task 2.1: MermaidServiceを実装する
 * Requirements: 1.1, 1.2, 2.1
 *
 * Provides:
 * - Lazy initialization of mermaid library
 * - Dark mode theme support
 * - Rendering with error handling
 */

import mermaid from 'mermaid';

// =============================================================================
// Types
// =============================================================================

export interface MermaidRenderResult {
  success: true;
  svg: string;
}

export interface MermaidRenderError {
  success: false;
  error: string;
  rawCode: string;
}

export type MermaidResult = MermaidRenderResult | MermaidRenderError;

// =============================================================================
// Service
// =============================================================================

/**
 * MermaidService - Wrapper around mermaid library for rendering diagrams
 *
 * Features:
 * - Lazy initialization (first render triggers init)
 * - Dark mode support via theme configuration
 * - Error handling with raw code preservation
 */
export class MermaidService {
  private initialized = false;
  private lastDarkMode: boolean | null = null;

  /**
   * Initialize mermaid with the specified theme
   * Re-initializes if darkMode changes
   */
  private initialize(darkMode: boolean): void {
    // Only reinitialize if darkMode changed or not initialized
    if (this.initialized && this.lastDarkMode === darkMode) {
      return;
    }

    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      // Suppress console errors from mermaid
      logLevel: 'fatal',
    });

    this.initialized = true;
    this.lastDarkMode = darkMode;
  }

  /**
   * Render mermaid diagram code to SVG
   *
   * @param code - Mermaid diagram code
   * @param id - Unique ID for the rendered element
   * @param darkMode - Whether to use dark theme
   * @returns Promise resolving to SVG string or error
   */
  async render(code: string, id: string, darkMode: boolean): Promise<MermaidResult> {
    // Handle empty code
    if (!code || code.trim() === '') {
      return {
        success: false,
        error: 'Empty mermaid code',
        rawCode: code,
      };
    }

    // Initialize with current theme
    this.initialize(darkMode);

    try {
      const { svg } = await mermaid.render(id, code);
      return {
        success: true,
        svg,
      };
    } catch (error) {
      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String((error as { message: unknown }).message);
      } else {
        errorMessage = String(error);
      }

      return {
        success: false,
        error: errorMessage,
        rawCode: code,
      };
    }
  }
}

// Export singleton instance for convenience
export const mermaidService = new MermaidService();
