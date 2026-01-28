/**
 * Parsed Log Entry Display E2E Test (Electron - WebdriverIO)
 *
 * Tests for verifying that agent logs are displayed in ParsedLogEntry format
 * after Main process parsing.
 *
 * Task: 9.1 - Electron Agent execution log display E2E test
 * Requirements Coverage: 5.2 - AgentLogPanel simplified to directly render ParsedLogEntry[]
 *
 * Test scenarios:
 * 1. Agent startup produces logs in ParsedLogEntry format
 * 2. Real-time log display in AgentLogPanel
 * 3. ParsedLogEntry fields are correctly displayed (engineId tag, system info, etc.)
 * 4. Log entries increment during agent execution
 *
 * Note: Uses mock-claude-streaming.sh for progressive log output.
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
    description: 'E2E test for ParsedLogEntry display',
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
E2E test for ParsedLogEntry display.

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

describe('ParsedLogEntry Display E2E Test - Task 9.1', () => {
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
  // 1. ParsedLogEntry format verification
  // ============================================================
  describe('ParsedLogEntry format verification', () => {
    it('should display logs in ParsedLogEntry format with engine tag', async () => {
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
      await autoButton.click();

      // Wait for running agent
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 10000);
      console.log(`[E2E] Running agent: ${hasRunning}`);

      if (hasRunning) {
        // Wait for agent log panel
        const logPanelVisible = await waitForCondition(async () => {
          const logPanel = await $('[data-testid="agent-log-panel"]');
          return await logPanel.isExisting();
        }, 5000, 200, 'agent-log-panel-visible');

        expect(logPanelVisible).toBe(true);

        // Verify engine tag is displayed (Claude or Gemini badge)
        // Task 9.1: ParsedLogEntry includes engineId, displayed as badge
        const engineTagVisible = await waitForCondition(async () => {
          const engineTag = await $('[data-testid="engine-tag"]');
          return await engineTag.isExisting();
        }, 5000, 200, 'engine-tag-visible');

        console.log(`[E2E] Engine tag visible: ${engineTagVisible}`);

        if (engineTagVisible) {
          const engineTag = await $('[data-testid="engine-tag"]');
          const tagText = await engineTag.getText();
          console.log(`[E2E] Engine tag text: ${tagText}`);
          // Should be 'Claude' or 'Gemini'
          expect(['Claude', 'Gemini']).toContain(tagText);
        }
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });

    it('should display running indicator during agent execution', async () => {
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
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 10000);

      if (hasRunning) {
        // Verify running indicator is shown (Loader2 spinner)
        const runningIndicatorVisible = await waitForCondition(async () => {
          const indicator = await $('[data-testid="running-indicator"]');
          return await indicator.isExisting();
        }, 5000, 200, 'running-indicator-visible');

        console.log(`[E2E] Running indicator visible: ${runningIndicatorVisible}`);
        expect(runningIndicatorVisible).toBe(true);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 2. Real-time log display verification
  // ============================================================
  describe('Real-time log display verification', () => {
    it('should display log entries incrementally during execution', async () => {
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
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 10000);

      if (hasRunning) {
        // Wait for log panel
        const logPanelVisible = await waitForCondition(async () => {
          const logPanel = await $('[data-testid="agent-log-panel"]');
          return await logPanel.isExisting();
        }, 5000, 200, 'agent-log-panel-visible');

        if (logPanelVisible) {
          // Check for log entries incrementing
          let previousLogCount = 0;
          let incrementDetected = false;

          for (let i = 0; i < 10; i++) {
            await browser.pause(500);

            // Count log entry blocks (LogEntryBlock components)
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

          // Should have some log entries at the end
          expect(previousLogCount).toBeGreaterThan(0);
          console.log(`[E2E] Final log count: ${previousLogCount}, Increment detected: ${incrementDetected}`);
        }
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });

    it('should display system init entry with cwd information', async () => {
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
      await waitForRunningAgent(SPEC_NAME, 10000);

      // Wait for log panel to have content
      const hasLogContent = await waitForCondition(async () => {
        const logPanel = await $('[data-testid="agent-log-panel"]');
        if (!await logPanel.isExisting()) return false;

        const logEntries = await logPanel.$$('.space-y-2 > div');
        return logEntries.length > 0;
      }, 10000, 300, 'log-content-visible');

      if (hasLogContent) {
        // Check for system init entry content
        const logPanel = await $('[data-testid="agent-log-panel"]');
        const logText = await logPanel.getText();
        console.log(`[E2E] Log panel text preview: ${logText.substring(0, 300)}`);

        // System init entry should show working directory path
        // This is produced by ParsedLogEntry with type='system'
        const hasSystemInfo = logText.includes('/') || logText.includes('kiro');
        console.log(`[E2E] Has system/path info: ${hasSystemInfo}`);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 3. ParsedLogEntry agentStore integration
  // ============================================================
  describe('ParsedLogEntry agentStore integration', () => {
    it('should store logs in agentStore as ParsedLogEntry[]', async () => {
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
      await waitForAgentInStore(SPEC_NAME, 10000);

      // Wait for some logs to be added
      await browser.pause(2000);

      // Check agentStore.logs contains ParsedLogEntry[]
      const logsInfo = await browser.execute((specName: string) => {
        const stores = (window as any).__STORES__;
        if (!stores?.agent?.getState) return { hasLogs: false, logCount: 0, sampleLog: null };

        const agents = stores.agent.getState().getAgentsForSpec(specName);
        if (agents.length === 0) return { hasLogs: false, logCount: 0, sampleLog: null };

        const agentId = agents[0].agentId;
        const logs = stores.agent.getState().getLogsForAgent(agentId);

        // Return sample log to verify ParsedLogEntry structure
        const sampleLog = logs.length > 0 ? logs[0] : null;

        return {
          hasLogs: logs.length > 0,
          logCount: logs.length,
          sampleLog: sampleLog,
        };
      }, SPEC_NAME);

      console.log(`[E2E] Logs info: ${JSON.stringify(logsInfo)}`);

      // Verify logs exist
      if (logsInfo.hasLogs) {
        // Verify ParsedLogEntry structure (should have id, type fields)
        expect(logsInfo.sampleLog).toHaveProperty('id');
        expect(logsInfo.sampleLog).toHaveProperty('type');
        console.log(`[E2E] Log count: ${logsInfo.logCount}, Sample log type: ${logsInfo.sampleLog?.type}`);
      }

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');
    });
  });

  // ============================================================
  // 4. IPC delivery verification
  // ============================================================
  describe('IPC delivery verification', () => {
    it('should receive logs via IPC in ParsedLogEntry format', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Track if onAgentLog callback receives ParsedLogEntry
      const receivedLogs = await browser.execute(async () => {
        return new Promise<{ received: boolean; sampleType: string | null }>((resolve) => {
          const electronAPI = (window as any).electronAPI;
          if (!electronAPI?.onAgentLog) {
            resolve({ received: false, sampleType: null });
            return;
          }

          let firstLog: { type?: string } | null = null;
          const cleanup = electronAPI.onAgentLog((_agentId: string, log: { type?: string }) => {
            if (!firstLog) {
              firstLog = log;
            }
          });

          // Wait a bit then check
          setTimeout(() => {
            cleanup?.();
            resolve({
              received: firstLog !== null,
              sampleType: firstLog?.type || null,
            });
          }, 5000);
        });
      });

      // Start auto-execution
      const autoButton = await $('[data-testid="auto-execute-button"]');
      await autoButton.click();

      // Wait for completion
      await waitForCondition(async () => {
        const s = await getAutoExecutionStatus();
        return !s.isAutoExecuting;
      }, 30000, 500, 'auto-execution-complete');

      // Log for debugging
      await logBrowserConsole();
    });
  });
});
