/**
 * LeftSidebar Tests for remote-ui-create-buttons feature
 *
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 5.2, 5.3 (remote-ui-create-buttons)
 *
 * Additional: Project Agent Panel ResizeHandle tests (Electron parity)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const appPath = resolve(__dirname, 'App.tsx');

describe('LeftSidebar - Create Buttons Feature', () => {
  describe('Dialog state management (Task 3.1)', () => {
    it('should have createDialogType state for dialog management', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('createDialogType');
    });
  });

  describe('Create button in tab header (Task 3.2)', () => {
    it('should have create button with Plus icon', () => {
      const content = readFileSync(appPath, 'utf-8');
      // Check for Plus icon import
      expect(content).toContain('Plus');
      // Check for conditional create button (shows spec or bug based on active tab)
      expect(content).toContain("'create-spec-button'");
      // create-bug-button replaced with create-issue-button (github-issue-integration)
      expect(content).toContain("'create-issue-button'");
    });
  });

  describe('CreateSpecDialogRemote integration (Task 3.3)', () => {
    it('should import CreateSpecDialogRemote', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('CreateSpecDialogRemote');
    });
  });

  describe('CreateIssueDialogRemote integration (github-issue-integration)', () => {
    it('should import CreateIssueDialogRemote', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('CreateIssueDialogRemote');
    });
  });

  describe('Device type detection (Task 4.1)', () => {
    it('should use deviceType in LeftSidebar', () => {
      const content = readFileSync(appPath, 'utf-8');
      // Check deviceType is used in LeftSidebar
      expect(content).toContain('deviceType:');
    });
  });

  describe('Smartphone FAB support (Task 4.2)', () => {
    it('should have FAB with data-testid for smartphone', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('data-testid="create-fab"');
    });
  });

  describe('Project Agent Panel ResizeHandle (Electron parity)', () => {
    it('should have ResizeHandle between SpecList and ProjectAgentPanel', () => {
      const content = readFileSync(appPath, 'utf-8');
      // ResizeHandle import should exist
      expect(content).toContain('ResizeHandle');
      // ResizeHandle should be used in LeftSidebar with vertical direction
      // Pattern: ResizeHandle followed by project-agent-panel
      expect(content).toMatch(/ResizeHandle.*direction.*vertical.*onResize.*handleProjectAgentPanelResize/s);
    });

    it('should have projectAgentPanelHeight state for resizable height', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('projectAgentPanelHeight');
      expect(content).toContain('setProjectAgentPanelHeight');
    });

    it('should have resize handler function for ProjectAgentPanel', () => {
      const content = readFileSync(appPath, 'utf-8');
      // Handler function should exist
      expect(content).toContain('handleProjectAgentPanelResize');
    });

    it('should have min/max constants for ProjectAgentPanel height', () => {
      const content = readFileSync(appPath, 'utf-8');
      expect(content).toContain('PROJECT_AGENT_PANEL_MIN');
      expect(content).toContain('PROJECT_AGENT_PANEL_MAX');
    });

    it('should apply dynamic height style to ProjectAgentPanel container', () => {
      const content = readFileSync(appPath, 'utf-8');
      // Style with height should be applied to project agent panel
      expect(content).toMatch(/style=\{\{.*height:.*projectAgentPanelHeight/s);
    });
  });
});
