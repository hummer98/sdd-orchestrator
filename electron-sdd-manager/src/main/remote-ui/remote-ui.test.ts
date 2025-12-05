/**
 * Mobile UI Static Files Tests
 * Tests for ensuring mobile UI files are properly structured
 * Requirements: 6.1-6.5, 7.1-7.6
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, access, stat } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

const REMOTE_UI_DIR = join(__dirname);

describe('Mobile UI Static Files', () => {
  describe('Task 6.1: Basic Structure', () => {
    it('should have index.html file', async () => {
      await expect(access(join(REMOTE_UI_DIR, 'index.html'), constants.R_OK)).resolves.toBeUndefined();
    });

    it('should have styles.css file', async () => {
      await expect(access(join(REMOTE_UI_DIR, 'styles.css'), constants.R_OK)).resolves.toBeUndefined();
    });

    it('should have app.js file', async () => {
      await expect(access(join(REMOTE_UI_DIR, 'app.js'), constants.R_OK)).resolves.toBeUndefined();
    });

    it('should have websocket.js file', async () => {
      await expect(access(join(REMOTE_UI_DIR, 'websocket.js'), constants.R_OK)).resolves.toBeUndefined();
    });

    it('should have components.js file', async () => {
      await expect(access(join(REMOTE_UI_DIR, 'components.js'), constants.R_OK)).resolves.toBeUndefined();
    });
  });

  describe('Task 6.1: HTML Structure', () => {
    let htmlContent: string;

    beforeAll(async () => {
      htmlContent = await readFile(join(REMOTE_UI_DIR, 'index.html'), 'utf-8');
    });

    it('should include Tailwind CSS CDN', () => {
      expect(htmlContent).toContain('cdn.tailwindcss.com');
    });

    it('should have responsive viewport meta tag', () => {
      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toContain('width=device-width');
    });

    it('should have theme-color meta tags for dark/light mode', () => {
      expect(htmlContent).toContain('theme-color');
      expect(htmlContent).toContain('prefers-color-scheme: dark');
      expect(htmlContent).toContain('prefers-color-scheme: light');
    });

    it('should include all required scripts', () => {
      expect(htmlContent).toContain('websocket.js');
      expect(htmlContent).toContain('components.js');
      expect(htmlContent).toContain('app.js');
    });

    it('should have connection status element', () => {
      expect(htmlContent).toContain('connection-status');
    });

    it('should have spec list section', () => {
      expect(htmlContent).toContain('spec-list');
    });

    it('should have spec detail section', () => {
      expect(htmlContent).toContain('spec-detail-section');
    });

    it('should have workflow control buttons', () => {
      expect(htmlContent).toContain('btn-requirements');
      expect(htmlContent).toContain('btn-design');
      expect(htmlContent).toContain('btn-tasks');
      expect(htmlContent).toContain('btn-implementation');
    });

    it('should have stop/resume buttons', () => {
      expect(htmlContent).toContain('btn-stop');
      expect(htmlContent).toContain('btn-resume');
    });

    it('should have log viewer section', () => {
      expect(htmlContent).toContain('log-container');
      expect(htmlContent).toContain('log-content');
    });

    it('should have toast container', () => {
      expect(htmlContent).toContain('toast-container');
    });

    it('should have reconnect overlay', () => {
      expect(htmlContent).toContain('reconnect-overlay');
      expect(htmlContent).toContain('btn-manual-reconnect');
    });
  });

  describe('Task 6.1: CSS Styles', () => {
    let cssContent: string;

    beforeAll(async () => {
      cssContent = await readFile(join(REMOTE_UI_DIR, 'styles.css'), 'utf-8');
    });

    it('should define touch-target class with min 44px size', () => {
      expect(cssContent).toContain('.touch-target');
      expect(cssContent).toContain('min-width: 44px');
      expect(cssContent).toContain('min-height: 44px');
    });

    it('should have dark mode styles', () => {
      expect(cssContent).toContain('prefers-color-scheme: dark');
    });

    it('should have safe area insets for notched devices', () => {
      expect(cssContent).toContain('safe-area-inset');
    });

    it('should have log entry styles', () => {
      expect(cssContent).toContain('.log-entry');
    });

    it('should have log type color classes', () => {
      expect(cssContent).toContain('.log-info');
      expect(cssContent).toContain('.log-warning');
      expect(cssContent).toContain('.log-error');
      expect(cssContent).toContain('.log-agent');
    });

    it('should have phase badge styles', () => {
      expect(cssContent).toContain('.phase-badge');
      expect(cssContent).toContain('.phase-badge-pending');
      expect(cssContent).toContain('.phase-badge-generated');
      expect(cssContent).toContain('.phase-badge-approved');
    });

    it('should have spec card styles', () => {
      expect(cssContent).toContain('.spec-card');
    });

    it('should have toast styles', () => {
      expect(cssContent).toContain('.toast');
      expect(cssContent).toContain('.toast-success');
      expect(cssContent).toContain('.toast-error');
      expect(cssContent).toContain('.toast-info');
    });

    it('should have connection status styles', () => {
      expect(cssContent).toContain('.status-connected');
      expect(cssContent).toContain('.status-disconnected');
      expect(cssContent).toContain('.status-connecting');
    });
  });

  describe('Task 6.2: WebSocket Connection Manager', () => {
    let wsContent: string;

    beforeAll(async () => {
      wsContent = await readFile(join(REMOTE_UI_DIR, 'websocket.js'), 'utf-8');
    });

    it('should define WebSocketManager class', () => {
      expect(wsContent).toContain('class WebSocketManager');
    });

    it('should implement connect method', () => {
      expect(wsContent).toContain('connect()');
    });

    it('should implement disconnect method', () => {
      expect(wsContent).toContain('disconnect()');
    });

    it('should implement auto-reconnect with exponential backoff', () => {
      expect(wsContent).toContain('scheduleReconnect');
      expect(wsContent).toContain('Math.pow');
    });

    it('should have maxReconnectAttempts set to 5', () => {
      expect(wsContent).toContain('maxReconnectAttempts = 5');
    });

    it('should implement manual reconnect', () => {
      expect(wsContent).toContain('manualReconnect');
    });

    it('should emit connection events', () => {
      expect(wsContent).toContain("emit('connected')");
      expect(wsContent).toContain("emit('disconnected'");
      expect(wsContent).toContain("emit('reconnecting'");
      expect(wsContent).toContain("emit('reconnectFailed')");
    });

    it('should request initial specs on connect', () => {
      expect(wsContent).toContain("type: 'GET_SPECS'");
    });

    it('should export singleton instance', () => {
      expect(wsContent).toContain('window.wsManager');
    });
  });

  describe('Task 6.3: Spec List Component', () => {
    let componentsContent: string;

    beforeAll(async () => {
      componentsContent = await readFile(join(REMOTE_UI_DIR, 'components.js'), 'utf-8');
    });

    it('should define SpecList class', () => {
      expect(componentsContent).toContain('class SpecList');
    });

    it('should implement update method for specs list', () => {
      expect(componentsContent).toContain('update(specs)');
    });

    it('should implement setSelected method', () => {
      expect(componentsContent).toContain('setSelected(specId)');
    });

    it('should render spec cards', () => {
      expect(componentsContent).toContain('renderSpecCard');
      expect(componentsContent).toContain('spec-card');
    });

    it('should show phase badges', () => {
      expect(componentsContent).toContain('renderPhaseBadge');
      expect(componentsContent).toContain('phase-badge');
    });

    it('should handle spec selection', () => {
      expect(componentsContent).toContain('onSelect');
    });
  });

  describe('Task 6.4: Workflow Control Component', () => {
    let componentsContent: string;

    beforeAll(async () => {
      componentsContent = await readFile(join(REMOTE_UI_DIR, 'components.js'), 'utf-8');
    });

    it('should define SpecDetail class', () => {
      expect(componentsContent).toContain('class SpecDetail');
    });

    it('should handle execute phase callback', () => {
      expect(componentsContent).toContain('onExecutePhase');
    });

    it('should handle stop callback', () => {
      expect(componentsContent).toContain('onStop');
    });

    it('should handle resume callback', () => {
      expect(componentsContent).toContain('onResume');
    });

    it('should manage running state', () => {
      expect(componentsContent).toContain('setRunning');
      expect(componentsContent).toContain('isRunning');
    });

    it('should update workflow buttons based on approval state', () => {
      expect(componentsContent).toContain('updateWorkflowButtons');
    });

    it('should define Toast class for notifications', () => {
      expect(componentsContent).toContain('class Toast');
    });

    it('should have success/error/info toast methods', () => {
      expect(componentsContent).toContain('success(message)');
      expect(componentsContent).toContain('error(message)');
      expect(componentsContent).toContain('info(message)');
    });
  });

  describe('Task 6.5: Log Viewer Component', () => {
    let componentsContent: string;

    beforeAll(async () => {
      componentsContent = await readFile(join(REMOTE_UI_DIR, 'components.js'), 'utf-8');
    });

    it('should define LogViewer class', () => {
      expect(componentsContent).toContain('class LogViewer');
    });

    it('should implement add method for log entries', () => {
      expect(componentsContent).toContain('add(');
    });

    it('should implement auto-scroll functionality', () => {
      expect(componentsContent).toContain('autoScroll');
      expect(componentsContent).toContain('scrollToBottom');
    });

    it('should pause auto-scroll when manually scrolled', () => {
      expect(componentsContent).toContain('isScrolledUp');
    });

    it('should resume auto-scroll when at bottom', () => {
      expect(componentsContent).toContain('isAtBottom');
    });

    it('should color-code log entries by type', () => {
      expect(componentsContent).toContain('log-');
    });

    it('should implement clear method', () => {
      expect(componentsContent).toContain('clear()');
    });

    it('should escape HTML in log content', () => {
      expect(componentsContent).toContain('escapeHtml');
    });
  });

  describe('Task 6.2: Connection Status Component', () => {
    let componentsContent: string;

    beforeAll(async () => {
      componentsContent = await readFile(join(REMOTE_UI_DIR, 'components.js'), 'utf-8');
    });

    it('should define ConnectionStatus class', () => {
      expect(componentsContent).toContain('class ConnectionStatus');
    });

    it('should support connected state', () => {
      expect(componentsContent).toContain("case 'connected'");
    });

    it('should support disconnected state', () => {
      expect(componentsContent).toContain("case 'disconnected'");
    });

    it('should support connecting state', () => {
      expect(componentsContent).toContain("case 'connecting'");
    });

    it('should support reconnecting state', () => {
      expect(componentsContent).toContain("case 'reconnecting'");
    });
  });

  describe('Task 6.2: Reconnect Overlay Component', () => {
    let componentsContent: string;

    beforeAll(async () => {
      componentsContent = await readFile(join(REMOTE_UI_DIR, 'components.js'), 'utf-8');
    });

    it('should define ReconnectOverlay class', () => {
      expect(componentsContent).toContain('class ReconnectOverlay');
    });

    it('should show reconnecting state', () => {
      expect(componentsContent).toContain('showReconnecting');
    });

    it('should show manual reconnect button', () => {
      expect(componentsContent).toContain('showManualReconnect');
    });

    it('should have hide method', () => {
      expect(componentsContent).toContain('hide()');
    });
  });

  describe('App Integration', () => {
    let appContent: string;

    beforeAll(async () => {
      appContent = await readFile(join(REMOTE_UI_DIR, 'app.js'), 'utf-8');
    });

    it('should define App class', () => {
      expect(appContent).toContain('class App');
    });

    it('should setup dark mode', () => {
      expect(appContent).toContain('setupDarkMode');
      expect(appContent).toContain('prefers-color-scheme: dark');
    });

    it('should setup WebSocket handlers', () => {
      expect(appContent).toContain('setupWebSocket');
    });

    it('should handle INIT message', () => {
      expect(appContent).toContain('handleInit');
      expect(appContent).toContain("wsManager.on('INIT'");
    });

    it('should handle SPECS_UPDATED message', () => {
      expect(appContent).toContain('handleSpecsUpdated');
      expect(appContent).toContain("wsManager.on('SPECS_UPDATED'");
    });

    it('should handle SPEC_CHANGED message', () => {
      expect(appContent).toContain('handleSpecChanged');
      expect(appContent).toContain("wsManager.on('SPEC_CHANGED'");
    });

    it('should handle AGENT_OUTPUT message', () => {
      expect(appContent).toContain('handleAgentOutput');
      expect(appContent).toContain("wsManager.on('AGENT_OUTPUT'");
    });

    it('should handle PHASE_STARTED message', () => {
      expect(appContent).toContain('handlePhaseStarted');
      expect(appContent).toContain("wsManager.on('PHASE_STARTED'");
    });

    it('should handle PHASE_COMPLETED message', () => {
      expect(appContent).toContain('handlePhaseCompleted');
      expect(appContent).toContain("wsManager.on('PHASE_COMPLETED'");
    });

    it('should handle ERROR message', () => {
      expect(appContent).toContain('handleError');
      expect(appContent).toContain("wsManager.on('ERROR'");
    });

    it('should handle RATE_LIMITED message', () => {
      expect(appContent).toContain('handleRateLimited');
      expect(appContent).toContain("wsManager.on('RATE_LIMITED'");
    });

    it('should execute phase commands', () => {
      expect(appContent).toContain('executePhase');
      expect(appContent).toContain("type: 'EXECUTE_PHASE'");
    });

    it('should stop workflow', () => {
      expect(appContent).toContain('stopWorkflow');
      expect(appContent).toContain("type: 'STOP_WORKFLOW'");
    });

    it('should resume workflow', () => {
      expect(appContent).toContain('resumeWorkflow');
      expect(appContent).toContain("type: 'RESUME_WORKFLOW'");
    });

    it('should initialize on DOMContentLoaded', () => {
      expect(appContent).toContain('DOMContentLoaded');
      expect(appContent).toContain('new App()');
    });
  });
});
