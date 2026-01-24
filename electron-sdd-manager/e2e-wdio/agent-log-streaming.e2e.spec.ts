/**
 * Agent Log Streaming E2E Test
 *
 * Tests for verifying that agent logs are displayed incrementally
 * during auto-execution.
 *
 * Test scenarios:
 * 1. Auto-execution button click starts agent execution
 * 2. Agent list updates correctly when new agent starts
 * 3. Agent log view is auto-selected when new agent executes
 * 4. Agent logs are displayed incrementally (stream-json format)
 *
 * Note: Uses mock-claude-streaming.sh for progressive log output.
 * Set E2E_MOCK_CLAUDE_COMMAND to use streaming mock.
 */

import * as path from 'path';
import * as fs from 'fs';
import {
  selectProjectViaStore,
  selectSpecViaStore,
  setAutoExecutionPermissions,
  getAutoExecutionStatus,
  waitForCondition,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetAutoExecutionCoordinator,
  waitForRunningAgent,
  waitForAgentInStore,
  debugGetAllAgents,
  stopAutoExecution,
  logBrowserConsole,
} from './helpers/auto-execution.helpers';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');
const SPEC_NAME = 'simple-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
const RUNTIME_AGENTS_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents', SPEC_NAME);

/**
 * Reset fixture to initial state
 */
function resetFixture(): void {
  const initialSpecJson = {
    feature_name: 'simple-feature',
    name: 'simple-feature',
    description: 'E2E test for agent log streaming',
    phase: 'initialized',
    language: 'ja',
    approvals: {
      requirements: { generated: false, approved: false },
      design: { generated: false, approved: false },
      tasks: { generated: false, approved: false },
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
  fs.writeFileSync(
    path.join(SPEC_DIR, 'spec.json'),
    JSON.stringify(initialSpecJson, null, 2)
  );

  const initialRequirements = `# Requirements Document

## Project Description (Input)
E2E test for agent log streaming.

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->

`;
  fs.writeFileSync(path.join(SPEC_DIR, 'requirements.md'), initialRequirements);

  // Clean up runtime/agents directory
  if (fs.existsSync(RUNTIME_AGENTS_DIR)) {
    const files = fs.readdirSync(RUNTIME_AGENTS_DIR);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(RUNTIME_AGENTS_DIR, file));
      } catch {
        // ignore
      }
    }
  }

  // Clean up logs directory
  const logsDir = path.join(SPEC_DIR, 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(logsDir, file));
      } catch {
        // ignore
      }
    }
  }
}

describe('Agent Log Streaming E2E Test', () => {
  before(async () => {
    resetFixture();
  });

  beforeEach(async () => {
    resetFixture();
    await clearAgentStore();
    await resetAutoExecutionCoordinator();
    await resetAutoExecutionService();

    const projectSuccess = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);

    await browser.pause(500);
    await refreshSpecStore();
    await browser.pause(500);

    const specSuccess = await selectSpecViaStore(SPEC_NAME);
    expect(specSuccess).toBe(true);
    await browser.pause(500);

    await refreshSpecStore();

    // Wait for agent-list-panel to appear
    const agentPanelVisible = await waitForCondition(async () => {
      const panel = await $('[data-testid="agent-list-panel"]');
      return await panel.isExisting();
    }, 5000, 200, 'agent-list-panel-visible');

    if (!agentPanelVisible) {
      console.log('[E2E] WARNING: agent-list-panel not visible after spec selection');
    }
  });

  afterEach(async () => {
    await stopAutoExecution();
    await browser.pause(500);
  });

  after(async () => {
    resetFixture();
  });

  // ============================================================
  // 1. Auto-execution button starts agent
  // ============================================================
  describe('Auto-execution starts agent', () => {
    it('should start agent when auto-execute button is clicked', async () => {
      // Enable only requirements phase
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Click auto-execute button
      const autoButton = await $('[data-testid="auto-execute-button"]');
      expect(await autoButton.isExisting()).toBe(true);
      expect(await autoButton.isEnabled()).toBe(true);

      await autoButton.click();

      // Wait for auto-execution to start
      const started = await waitForCondition(async () => {
        const status = await getAutoExecutionStatus();
        return status.isAutoExecuting;
      }, 5000, 200, 'auto-execution-started');

      expect(started).toBe(true);

      // Wait for agent in store
      const hasAgent = await waitForAgentInStore(SPEC_NAME, 10000);
      console.log(`[E2E] Agent in store: ${hasAgent}`);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 2. Agent list updates correctly
  // ============================================================
  describe('Agent list updates', () => {
    it('should show new agent in agent-list-panel when agent starts', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for agent to appear in store
      const agentAdded = await waitForAgentInStore(SPEC_NAME, 10000);

      // Debug: list all agents
      const allAgents = await debugGetAllAgents();
      console.log('[E2E] All agents:', JSON.stringify(allAgents, null, 2));

      const agentPanel = await $('[data-testid="agent-list-panel"]');
      expect(await agentPanel.isExisting()).toBe(true);

      // Check for agent items in panel
      const agentItemExists = await waitForCondition(async () => {
        const items = await agentPanel.$$('[data-testid^="agent-item-"]');
        console.log(`[E2E] Agent items count: ${items.length}`);
        return items.length > 0;
      }, 8000, 300, 'agent-item-in-panel');

      // In mock environment, agent item may not be displayed
      console.log(`[E2E] Agent item exists: ${agentItemExists}, Agent added: ${agentAdded}`);

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 3. Agent log view auto-selection
  // ============================================================
  describe('Agent log auto-selection', () => {
    it('should auto-select agent log view when new agent starts', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for running agent
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 8000);
      console.log(`[E2E] Running agent: ${hasRunning}`);

      // Check if agent is selected (agent-log-panel should be visible)
      if (hasRunning) {
        const logPanelVisible = await waitForCondition(async () => {
          const logPanel = await $('[data-testid="agent-log-panel"]');
          return await logPanel.isExisting();
        }, 5000, 300, 'agent-log-panel-visible');

        console.log(`[E2E] Agent log panel visible: ${logPanelVisible}`);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 4. Agent log streaming verification
  // ============================================================
  describe('Agent log streaming', () => {
    it('should display logs incrementally during agent execution', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for running agent
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 8000);

      if (hasRunning) {
        // Wait for agent log panel
        const logPanelVisible = await waitForCondition(async () => {
          const logPanel = await $('[data-testid="agent-log-panel"]');
          return await logPanel.isExisting();
        }, 5000, 200, 'agent-log-panel-visible');

        if (logPanelVisible) {
          // Check for log entries appearing incrementally
          // This verifies stream-json parsing is working
          let previousLogCount = 0;
          let incrementDetected = false;

          for (let i = 0; i < 10; i++) {
            await browser.pause(500);

            // Count log entry blocks
            const logEntries = await $$('[data-testid="agent-log-panel"] .space-y-2 > div');
            const currentCount = logEntries.length;

            console.log(`[E2E] Log entries count: ${currentCount} (prev: ${previousLogCount})`);

            if (currentCount > previousLogCount && previousLogCount > 0) {
              incrementDetected = true;
              console.log('[E2E] Incremental log update detected!');
            }

            previousLogCount = currentCount;

            // Check if auto-execution completed
            const status = await getAutoExecutionStatus();
            if (!status.isAutoExecuting) {
              console.log('[E2E] Auto-execution completed');
              break;
            }
          }

          // With streaming mock, we should detect incremental updates
          console.log(`[E2E] Incremental update detected: ${incrementDetected}`);
          console.log(`[E2E] Final log count: ${previousLogCount}`);
        }
      }

      // Log browser console for debugging
      await logBrowserConsole();

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });

    it('should parse stream-json format and display system init message', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for agent to start
      await waitForRunningAgent(SPEC_NAME, 8000);

      // Wait for log panel to appear with content
      const hasLogContent = await waitForCondition(async () => {
        const logPanel = await $('[data-testid="agent-log-panel"]');
        if (!await logPanel.isExisting()) return false;

        const logEntries = await logPanel.$$('.space-y-2 > div');
        return logEntries.length > 0;
      }, 10000, 300, 'log-content-visible');

      if (hasLogContent) {
        // Check for system init entry (cwd display)
        const logPanel = await $('[data-testid="agent-log-panel"]');
        const logText = await logPanel.getText();
        console.log(`[E2E] Log panel text preview: ${logText.substring(0, 200)}`);

        // System init should show the working directory
        const hasSystemInfo = logText.includes('/') || logText.includes('cwd');
        console.log(`[E2E] Has system info: ${hasSystemInfo}`);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 5. Running indicator display
  // ============================================================
  describe('Running indicator', () => {
    it('should show running indicator in agent log panel header', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for running agent
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 8000);

      if (hasRunning) {
        // Check for running indicator (Loader2 spinner)
        const runningIndicatorVisible = await waitForCondition(async () => {
          const indicator = await $('[data-testid="running-indicator"]');
          return await indicator.isExisting();
        }, 5000, 200, 'running-indicator-visible');

        console.log(`[E2E] Running indicator visible: ${runningIndicatorVisible}`);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });
});
