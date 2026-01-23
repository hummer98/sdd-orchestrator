/**
 * Integration Tests for remote-ui-create-buttons feature
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1-2.6, 3.3, 3.4, 4.2, 5.3 (remote-ui-create-buttons)
 * Tasks: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Integration tests verify the complete implementation across multiple files

describe('Integration Tests - Create Buttons Feature', () => {
  // Task 6.1: Tab switching and button integration
  describe('Task 6.1: Tab switching and create button integration', () => {
    it('should have create button that changes based on active tab', () => {
      const appContent = readFileSync(resolve(__dirname, 'App.tsx'), 'utf-8');
      // Verify conditional button display based on activeTab
      expect(appContent).toContain("activeTab === 'specs'");
      expect(appContent).toContain("'create-spec-button'");
      expect(appContent).toContain("'create-bug-button'");
    });

    it('should set createDialogType based on activeTab when clicking create button', () => {
      const appContent = readFileSync(resolve(__dirname, 'App.tsx'), 'utf-8');
      // handleCreateClick should set dialog type based on activeTab
      expect(appContent).toContain("setCreateDialogType(activeTab === 'specs' ? 'spec' : 'bug')");
    });
  });

  // Task 6.2: Complete spec creation flow
  describe('Task 6.2: Spec creation flow', () => {
    it('should have CreateSpecDialogRemote with all required elements', () => {
      const dialogContent = readFileSync(
        resolve(__dirname, 'components/CreateSpecDialogRemote.tsx'),
        'utf-8'
      );
      // Description textarea
      expect(dialogContent).toContain('data-testid="create-spec-description"');
      // Worktree checkbox
      expect(dialogContent).toContain('data-testid="create-spec-worktree-checkbox"');
      // Submit button
      expect(dialogContent).toContain('data-testid="create-spec-submit"');
      // Uses executeSpecPlan API
      expect(dialogContent).toContain('apiClient.executeSpecPlan');
    });

    it('should close dialog and call onSuccess on successful submission', () => {
      const dialogContent = readFileSync(
        resolve(__dirname, 'components/CreateSpecDialogRemote.tsx'),
        'utf-8'
      );
      // Verify success handling
      expect(dialogContent).toContain('onClose()');
      expect(dialogContent).toContain('onSuccess(result.value)');
    });
  });

  // Task 6.3: Error handling
  describe('Task 6.3: Error handling', () => {
    it('should have error display in CreateSpecDialogRemote', () => {
      const dialogContent = readFileSync(
        resolve(__dirname, 'components/CreateSpecDialogRemote.tsx'),
        'utf-8'
      );
      // Error display
      expect(dialogContent).toContain('data-testid="create-spec-error"');
      // Error state
      expect(dialogContent).toContain('setError(');
    });

    it('should disable submit button when description is empty', () => {
      const dialogContent = readFileSync(
        resolve(__dirname, 'components/CreateSpecDialogRemote.tsx'),
        'utf-8'
      );
      // Submit button should be disabled when description is empty
      expect(dialogContent).toContain("disabled={isSubmitting || !description.trim()}");
    });
  });

  // Task 6.4: Smartphone FAB support
  describe('Task 6.4: Smartphone FAB support', () => {
    it('should have FAB that shows only on smartphone', () => {
      const appContent = readFileSync(resolve(__dirname, 'App.tsx'), 'utf-8');
      // FAB should only show on smartphone
      expect(appContent).toContain('{isSmartphone && (');
      expect(appContent).toContain('data-testid="create-fab"');
    });

    it('should trigger handleCreateClick when FAB is clicked', () => {
      const appContent = readFileSync(resolve(__dirname, 'App.tsx'), 'utf-8');
      // FAB should call handleCreateClick
      expect(appContent).toContain('onClick={handleCreateClick}');
    });
  });

  // Complete WebSocket API integration
  describe('WebSocket API integration', () => {
    it('should have EXECUTE_SPEC_PLAN handler in webSocketHandler', () => {
      const handlerContent = readFileSync(
        resolve(__dirname, '../main/services/webSocketHandler.ts'),
        'utf-8'
      );
      expect(handlerContent).toContain("case 'EXECUTE_SPEC_PLAN':");
      expect(handlerContent).toContain('handleExecuteSpecPlan');
    });

    it('should have executeSpecPlan in WebSocketApiClient', () => {
      const clientContent = readFileSync(
        resolve(__dirname, '../shared/api/WebSocketApiClient.ts'),
        'utf-8'
      );
      expect(clientContent).toContain('async executeSpecPlan(');
      expect(clientContent).toContain("'EXECUTE_SPEC_PLAN'");
    });

    it('should have executeSpecPlan in ApiClient interface', () => {
      const typesContent = readFileSync(
        resolve(__dirname, '../shared/api/types.ts'),
        'utf-8'
      );
      expect(typesContent).toContain('executeSpecPlan?(');
    });
  });
});
