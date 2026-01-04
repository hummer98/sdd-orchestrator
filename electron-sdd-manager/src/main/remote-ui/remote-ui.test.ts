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
      // UI uses single "next action" button instead of individual phase buttons
      expect(htmlContent).toContain('btn-next-action');
      expect(htmlContent).toContain('btn-auto-execute');
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
      // Phase badges now use Tailwind classes matching Electron version
      expect(componentsContent).toContain('rounded-full');
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

  describe('Hash-based Router', () => {
    let appContent: string;

    beforeAll(async () => {
      appContent = await readFile(join(REMOTE_UI_DIR, 'app.js'), 'utf-8');
    });

    it('should define Router class', () => {
      expect(appContent).toContain('class Router');
    });

    it('should implement route registration with on() method', () => {
      expect(appContent).toContain('on(pattern, handler)');
    });

    it('should implement navigation with navigate() method', () => {
      expect(appContent).toContain('navigate(path)');
      expect(appContent).toContain('window.location.hash');
    });

    it('should listen to hashchange events', () => {
      expect(appContent).toContain("window.addEventListener('hashchange'");
    });

    it('should implement route matching with params extraction', () => {
      expect(appContent).toContain('matchRoute(pattern, path)');
      expect(appContent).toContain("patternParts[i].startsWith(':')");
    });

    it('should define list view route (/)' , () => {
      expect(appContent).toContain("this.router.on('/'");
    });

    it('should define spec detail route (/spec/:name)', () => {
      expect(appContent).toContain("this.router.on('/spec/:name'");
    });

    it('should define bug detail route (/bug/:name)', () => {
      expect(appContent).toContain("this.router.on('/bug/:name'");
    });

    it('should implement back() method for returning to list', () => {
      expect(appContent).toContain('back()');
      expect(appContent).toContain("this.navigate('/')");
    });
  });

  describe('View Management', () => {
    let appContent: string;
    let htmlContent: string;

    beforeAll(async () => {
      appContent = await readFile(join(REMOTE_UI_DIR, 'app.js'), 'utf-8');
      htmlContent = await readFile(join(REMOTE_UI_DIR, 'index.html'), 'utf-8');
    });

    it('should have view-list wrapper in HTML', () => {
      expect(htmlContent).toContain('id="view-list"');
    });

    it('should implement showView() method', () => {
      expect(appContent).toContain('showView(viewName)');
    });

    it('should support list, spec-detail, and bug-detail views', () => {
      expect(appContent).toContain("case 'list':");
      expect(appContent).toContain("case 'spec-detail':");
      expect(appContent).toContain("case 'bug-detail':");
    });

    it('should hide all views before showing requested view', () => {
      expect(appContent).toContain("this.viewList.classList.add('hidden')");
      expect(appContent).toContain("this.specDetail.sectionEl.classList.add('hidden')");
      expect(appContent).toContain("this.bugDetail.sectionEl.classList.add('hidden')");
    });

    it('should scroll to top when changing views', () => {
      expect(appContent).toContain('window.scrollTo(0, 0)');
    });

    it('should not use fixed positioning for detail sections', () => {
      // Detail sections should not have fixed inset-0 (old overlay pattern)
      const specDetailMatch = htmlContent.match(/id="spec-detail-section"[^>]*>/);
      const bugDetailMatch = htmlContent.match(/id="bug-detail-section"[^>]*>/);

      expect(specDetailMatch?.[0]).not.toContain('fixed');
      expect(specDetailMatch?.[0]).not.toContain('inset-0');
      expect(bugDetailMatch?.[0]).not.toContain('fixed');
      expect(bugDetailMatch?.[0]).not.toContain('inset-0');
    });

    it('should use router.navigate() for spec selection', () => {
      expect(appContent).toContain("this.router.navigate(`/spec/");
    });

    it('should use router.navigate() for bug selection', () => {
      expect(appContent).toContain("this.router.navigate(`/bug/");
    });

    it('should use router.back() for back button handlers', () => {
      expect(appContent).toContain('this.router.back()');
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

  // ============================================================
  // getPhaseStatusFromSpec Logic Tests
  // Tests the phase status logic extracted from components.js
  // Matches Electron version's getPhaseStatus (workflow.ts)
  // ============================================================
  describe('getPhaseStatusFromSpec Logic', () => {
    /**
     * Extracted getPhaseStatusFromSpec logic for testing
     * This mirrors the implementation in components.js
     */
    function getPhaseStatusFromSpec(spec: {
      inspection?: { passed?: boolean };
      impl_completed?: boolean;
      approvals?: {
        requirements?: { generated?: boolean; approved?: boolean };
        design?: { generated?: boolean; approved?: boolean };
        tasks?: { generated?: boolean; approved?: boolean };
      };
      phase?: string;
    }) {
      const result: Record<string, string> = {
        requirements: 'pending',
        design: 'pending',
        tasks: 'pending',
        impl: 'pending',
        inspection: 'pending',
        deploy: 'pending',
      };

      // Inspection phase: check inspection.passed
      if (spec.inspection?.passed) {
        result.inspection = 'approved';
      }

      // Deploy phase: check phase === 'deploy-complete'
      if (spec.phase === 'deploy-complete') {
        result.deploy = 'approved';
      }

      // Implementation phase: check impl_completed
      if (spec.impl_completed) {
        result.impl = 'approved';
      }

      // If approvals object is available, use it for requirements/design/tasks
      if (spec.approvals) {
        const approvals = spec.approvals;
        if (approvals.requirements) {
          result.requirements = approvals.requirements.approved ? 'approved' :
                                approvals.requirements.generated ? 'generated' : 'pending';
        }
        if (approvals.design) {
          result.design = approvals.design.approved ? 'approved' :
                          approvals.design.generated ? 'generated' : 'pending';
        }
        if (approvals.tasks) {
          result.tasks = approvals.tasks.approved ? 'approved' :
                         approvals.tasks.generated ? 'generated' : 'pending';
        }
        return result;
      }

      // Fallback: derive from phase string
      const phaseString = spec.phase || 'initialized';
      switch (phaseString) {
        case 'implementation-complete':
          result.requirements = 'approved';
          result.design = 'approved';
          result.tasks = 'approved';
          break;
        case 'tasks-generated':
          result.requirements = 'approved';
          result.design = 'approved';
          result.tasks = 'generated';
          break;
        case 'design-generated':
          result.requirements = 'approved';
          result.design = 'generated';
          break;
        case 'requirements-generated':
          result.requirements = 'generated';
          break;
      }

      return result;
    }

    describe('requirements phase', () => {
      it('should return pending when not generated', () => {
        const spec = { approvals: { requirements: { generated: false, approved: false } } };
        expect(getPhaseStatusFromSpec(spec).requirements).toBe('pending');
      });

      it('should return generated when generated but not approved', () => {
        const spec = { approvals: { requirements: { generated: true, approved: false } } };
        expect(getPhaseStatusFromSpec(spec).requirements).toBe('generated');
      });

      it('should return approved when approved', () => {
        const spec = { approvals: { requirements: { generated: true, approved: true } } };
        expect(getPhaseStatusFromSpec(spec).requirements).toBe('approved');
      });
    });

    describe('design phase', () => {
      it('should return pending when not generated', () => {
        const spec = { approvals: { design: { generated: false, approved: false } } };
        expect(getPhaseStatusFromSpec(spec).design).toBe('pending');
      });

      it('should return generated when generated but not approved', () => {
        const spec = { approvals: { design: { generated: true, approved: false } } };
        expect(getPhaseStatusFromSpec(spec).design).toBe('generated');
      });

      it('should return approved when approved', () => {
        const spec = { approvals: { design: { generated: true, approved: true } } };
        expect(getPhaseStatusFromSpec(spec).design).toBe('approved');
      });
    });

    describe('tasks phase', () => {
      it('should return pending when not generated', () => {
        const spec = { approvals: { tasks: { generated: false, approved: false } } };
        expect(getPhaseStatusFromSpec(spec).tasks).toBe('pending');
      });

      it('should return generated when generated but not approved', () => {
        const spec = { approvals: { tasks: { generated: true, approved: false } } };
        expect(getPhaseStatusFromSpec(spec).tasks).toBe('generated');
      });

      it('should return approved when approved', () => {
        const spec = { approvals: { tasks: { generated: true, approved: true } } };
        expect(getPhaseStatusFromSpec(spec).tasks).toBe('approved');
      });
    });

    describe('impl phase', () => {
      it('should return pending when impl_completed is not set', () => {
        const spec = {};
        expect(getPhaseStatusFromSpec(spec).impl).toBe('pending');
      });

      it('should return pending when impl_completed is false', () => {
        const spec = { impl_completed: false };
        expect(getPhaseStatusFromSpec(spec).impl).toBe('pending');
      });

      it('should return approved when impl_completed is true', () => {
        const spec = { impl_completed: true };
        expect(getPhaseStatusFromSpec(spec).impl).toBe('approved');
      });
    });

    describe('inspection phase', () => {
      it('should return pending when inspection is undefined', () => {
        const spec = {};
        expect(getPhaseStatusFromSpec(spec).inspection).toBe('pending');
      });

      it('should return pending when inspection.passed is false', () => {
        const spec = { inspection: { passed: false } };
        expect(getPhaseStatusFromSpec(spec).inspection).toBe('pending');
      });

      it('should return approved when inspection.passed is true', () => {
        const spec = { inspection: { passed: true } };
        expect(getPhaseStatusFromSpec(spec).inspection).toBe('approved');
      });
    });

    describe('deploy phase', () => {
      it('should return pending when phase is not deploy-complete', () => {
        const spec = {};
        expect(getPhaseStatusFromSpec(spec).deploy).toBe('pending');
      });

      it('should return pending when phase is other than deploy-complete', () => {
        const spec = { phase: 'implementation-complete' };
        expect(getPhaseStatusFromSpec(spec).deploy).toBe('pending');
      });

      it('should return approved when phase is deploy-complete', () => {
        const spec = { phase: 'deploy-complete' };
        expect(getPhaseStatusFromSpec(spec).deploy).toBe('approved');
      });
    });

    describe('fallback from phase string (no approvals object)', () => {
      it('should return all pending for initialized phase', () => {
        const spec = { phase: 'initialized' };
        const result = getPhaseStatusFromSpec(spec);
        expect(result.requirements).toBe('pending');
        expect(result.design).toBe('pending');
        expect(result.tasks).toBe('pending');
      });

      it('should return requirements generated for requirements-generated phase', () => {
        const spec = { phase: 'requirements-generated' };
        const result = getPhaseStatusFromSpec(spec);
        expect(result.requirements).toBe('generated');
        expect(result.design).toBe('pending');
        expect(result.tasks).toBe('pending');
      });

      it('should return design generated for design-generated phase', () => {
        const spec = { phase: 'design-generated' };
        const result = getPhaseStatusFromSpec(spec);
        expect(result.requirements).toBe('approved');
        expect(result.design).toBe('generated');
        expect(result.tasks).toBe('pending');
      });

      it('should return tasks generated for tasks-generated phase', () => {
        const spec = { phase: 'tasks-generated' };
        const result = getPhaseStatusFromSpec(spec);
        expect(result.requirements).toBe('approved');
        expect(result.design).toBe('approved');
        expect(result.tasks).toBe('generated');
      });

      it('should return all approved for implementation-complete phase', () => {
        const spec = { phase: 'implementation-complete' };
        const result = getPhaseStatusFromSpec(spec);
        expect(result.requirements).toBe('approved');
        expect(result.design).toBe('approved');
        expect(result.tasks).toBe('approved');
      });
    });

    describe('6-phase workflow coverage', () => {
      it('should return all 6 phases in result', () => {
        const spec = {};
        const result = getPhaseStatusFromSpec(spec);
        expect(result).toHaveProperty('requirements');
        expect(result).toHaveProperty('design');
        expect(result).toHaveProperty('tasks');
        expect(result).toHaveProperty('impl');
        expect(result).toHaveProperty('inspection');
        expect(result).toHaveProperty('deploy');
      });

      it('should correctly handle all phases being approved', () => {
        const spec = {
          approvals: {
            requirements: { generated: true, approved: true },
            design: { generated: true, approved: true },
            tasks: { generated: true, approved: true },
          },
          impl_completed: true,
          inspection: { passed: true },
          phase: 'deploy-complete',
        };
        const result = getPhaseStatusFromSpec(spec);
        expect(result.requirements).toBe('approved');
        expect(result.design).toBe('approved');
        expect(result.tasks).toBe('approved');
        expect(result.impl).toBe('approved');
        expect(result.inspection).toBe('approved');
        expect(result.deploy).toBe('approved');
      });
    });
  });

  // ============================================================
  // Task 5.1: autoExecution Store Implementation
  // Requirements: 6.1, 6.2
  // ============================================================
  describe('Task 5.1: AutoExecution Store', () => {
    let appJsContent: string;

    beforeAll(async () => {
      appJsContent = await readFile(join(REMOTE_UI_DIR, 'app.js'), 'utf-8');
    });

    it('should have autoExecutionStatuses property in App class', () => {
      // The App class should track auto-execution status per spec
      expect(appJsContent).toContain('autoExecutionStatuses');
    });

    it('should have startAutoExecution method', () => {
      // Method to start auto-execution via WebSocket
      expect(appJsContent).toContain('startAutoExecution');
    });

    it('should have stopAutoExecution method', () => {
      // Method to stop auto-execution via WebSocket
      expect(appJsContent).toContain('stopAutoExecution');
    });
  });

  // ============================================================
  // Task 5.2: WebSocket Event Handlers
  // Requirements: 6.4, 6.5, 6.6
  // ============================================================
  describe('Task 5.2: WebSocket Auto-Execution Event Handlers', () => {
    let appJsContent: string;

    beforeAll(async () => {
      appJsContent = await readFile(join(REMOTE_UI_DIR, 'app.js'), 'utf-8');
    });

    it('should handle AUTO_EXECUTION_STATUS message', () => {
      expect(appJsContent).toContain('AUTO_EXECUTION_STATUS');
    });

    it('should handle AUTO_EXECUTION_PHASE_COMPLETED message', () => {
      expect(appJsContent).toContain('AUTO_EXECUTION_PHASE_COMPLETED');
    });

    it('should handle AUTO_EXECUTION_ERROR message', () => {
      expect(appJsContent).toContain('AUTO_EXECUTION_ERROR');
    });

    it('should have handleAutoExecutionStatusUpdate method', () => {
      expect(appJsContent).toContain('handleAutoExecutionStatusUpdate');
    });

    it('should have handleAutoExecutionPhaseCompleted method', () => {
      expect(appJsContent).toContain('handleAutoExecutionPhaseCompleted');
    });

    it('should have handleAutoExecutionError method', () => {
      expect(appJsContent).toContain('handleAutoExecutionError');
    });
  });

  // ============================================================
  // Task 5.3: Remote UI Auto-Execution Component
  // Requirements: 6.1, 6.2, 6.3
  // ============================================================
  describe('Task 5.3: Remote UI Auto-Execution Component', () => {
    let componentsJsContent: string;
    let htmlContent: string;

    beforeAll(async () => {
      componentsJsContent = await readFile(join(REMOTE_UI_DIR, 'components.js'), 'utf-8');
      htmlContent = await readFile(join(REMOTE_UI_DIR, 'index.html'), 'utf-8');
    });

    it('should have auto-execute button in SpecDetail', () => {
      // Auto-execute button should be present
      expect(htmlContent).toContain('btn-auto-execute');
    });

    it('should have renderAutoExecutionStatus method in SpecDetail', () => {
      // Method to render auto-execution status display
      expect(componentsJsContent).toContain('renderAutoExecutionStatus');
    });

    it('should have updateAutoExecutionStatus method in SpecDetail', () => {
      // Method to update auto-execution status
      expect(componentsJsContent).toContain('updateAutoExecutionStatus');
    });

    it('should display current executing phase indicator', () => {
      // The component should show which phase is currently executing
      expect(componentsJsContent).toContain('currentPhase');
    });

    it('should display progress states (pending/executing/completed/error)', () => {
      // Status indicators for different states
      expect(componentsJsContent).toContain('running');
      expect(componentsJsContent).toContain('completed');
      expect(componentsJsContent).toContain('error');
    });
  });

  // ============================================================
  // Task 5.2 (continued): WebSocket message sending functions
  // Requirements: 5.1, 5.2, 5.3
  // ============================================================
  describe('Task 5.2: WebSocket Auto-Execution Message Sending', () => {
    let websocketJsContent: string;

    beforeAll(async () => {
      websocketJsContent = await readFile(join(REMOTE_UI_DIR, 'websocket.js'), 'utf-8');
    });

    it('should have startAutoExecution function in WebSocketManager', () => {
      expect(websocketJsContent).toContain('startAutoExecution');
    });

    it('should have stopAutoExecution function in WebSocketManager', () => {
      expect(websocketJsContent).toContain('stopAutoExecution');
    });

    it('should have getAutoExecutionStatus function in WebSocketManager', () => {
      expect(websocketJsContent).toContain('getAutoExecutionStatus');
    });
  });
});
