/**
 * Agent Resume Log Display E2E Test
 *
 * Tests for verifying that agent logs are accumulated correctly
 * when resuming an agent with additional instructions.
 *
 * Test scenarios:
 * 1. Initial agent execution produces logs
 * 2. Resume agent with additional instruction
 * 3. Previous logs are preserved after resume
 * 4. New stdin log entry is added for the additional instruction
 * 5. New "Session Started" log entry is added for the resumed session
 *
 * Related files:
 * - SessionInfoBlock.tsx: Renders "Claude Session Started" message
 * - agentStoreAdapter.ts: resumeAgent adds stdin log entry
 * - claudeParser.ts: Parses init event for session info
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
  resumeAgentViaStore,
  getAgentLogs,
  getSelectedAgentId,
  waitForAgentComplete,
  waitForSpecDetailReady,
  getFirstAgentForSpec,
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
    description: 'E2E test for agent resume log display',
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
E2E test for agent resume log display.

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

describe('Agent Resume Log Display E2E Test', () => {
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

    // Wait for spec detail to be fully loaded before proceeding
    await waitForSpecDetailReady(SPEC_NAME, 15000);
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
  // 1. Resume preserves previous logs
  // ============================================================
  describe('Resume preserves previous logs', () => {
    it('should preserve previous logs when resuming agent with additional instruction', async () => {
      // Enable only requirements phase
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      // Click auto-execute button to start agent
      const autoButton = await $('[data-testid="auto-execution-button"]');
      expect(await autoButton.isExisting()).toBe(true);
      await autoButton.click();

      // Wait for agent to start
      const hasAgent = await waitForAgentInStore(SPEC_NAME, 10000);
      console.log(`[E2E] Agent in store: ${hasAgent}`);
      expect(hasAgent).toBe(true);

      // Get agent ID
      const agent = await getFirstAgentForSpec(SPEC_NAME);
      expect(agent).not.toBeNull();
      const agentId = agent.agentId;
      console.log(`[E2E] Agent ID: ${agentId}`);

      // Wait for agent to complete
      const completed = await waitForAgentComplete(agentId, 60000);
      console.log(`[E2E] Agent completed: ${completed}`);

      // Record initial log count
      const initialLogs = await getAgentLogs(agentId);
      const initialLogCount = initialLogs.length;
      console.log(`[E2E] Initial log count: ${initialLogCount}`);
      expect(initialLogCount).toBeGreaterThan(0);

      // Check for initial Session Started log
      const hasInitialSessionStarted = initialLogs.some(
        (log: any) => log.type === 'system' && log.session
      );
      console.log(`[E2E] Has initial Session Started: ${hasInitialSessionStarted}`);
      expect(hasInitialSessionStarted).toBe(true);

      // Resume agent with additional instruction
      const additionalInstruction = 'テスト追加指示';
      const resumeSuccess = await resumeAgentViaStore(agentId, additionalInstruction);
      console.log(`[E2E] Resume initiated: ${resumeSuccess}`);
      expect(resumeSuccess).toBe(true);

      // Wait for resumed agent to start running
      await browser.pause(1000);
      const hasRunning = await waitForRunningAgent(SPEC_NAME, 10000);
      console.log(`[E2E] Running agent after resume: ${hasRunning}`);

      // Wait for resumed agent to complete
      const resumeCompleted = await waitForAgentComplete(agentId, 60000);
      console.log(`[E2E] Resumed agent completed: ${resumeCompleted}`);

      // Get final logs
      const finalLogs = await getAgentLogs(agentId);
      const finalLogCount = finalLogs.length;
      console.log(`[E2E] Final log count: ${finalLogCount}`);

      // Verify logs are accumulated (not cleared)
      expect(finalLogCount).toBeGreaterThan(initialLogCount);

      // Log browser console for debugging
      await logBrowserConsole();
    });
  });

  // ============================================================
  // 2. Stdin log entry is added
  // ============================================================
  describe('Stdin log entry is added', () => {
    it('should add stdin log entry for additional instruction', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execution-button"]');
      await autoButton.click();

      const hasAgent = await waitForAgentInStore(SPEC_NAME, 10000);
      expect(hasAgent).toBe(true);

      const agent = await getFirstAgentForSpec(SPEC_NAME);
      const agentId = agent.agentId;

      await waitForAgentComplete(agentId, 60000);

      // Resume with specific instruction
      const additionalInstruction = 'stdin_test_instruction_12345';
      await resumeAgentViaStore(agentId, additionalInstruction);

      // Wait a bit for stdin log to be added
      await browser.pause(500);

      // Check for stdin log entry
      // main-process-log-parser: LogEntry.stream -> ParsedLogEntry.type
      // stdin logs now have type: 'input' and text.content instead of stream/data
      const logs = await getAgentLogs(agentId);
      const stdinLogs = logs.filter((log: any) => log.type === 'input');
      console.log(`[E2E] Stdin log count: ${stdinLogs.length}`);

      const hasStdinEntry = stdinLogs.some(
        (log: any) => log.text?.content?.includes(additionalInstruction)
      );
      console.log(`[E2E] Has stdin entry with instruction: ${hasStdinEntry}`);
      expect(hasStdinEntry).toBe(true);

      // Wait for completion
      await waitForAgentComplete(agentId, 60000);
    });
  });

  // ============================================================
  // 3. New Session Started log is added
  // ============================================================
  describe('New Session Started log is added', () => {
    it('should add new Session Started log for resumed session', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execution-button"]');
      await autoButton.click();

      const hasAgent = await waitForAgentInStore(SPEC_NAME, 10000);
      expect(hasAgent).toBe(true);

      const agent = await getFirstAgentForSpec(SPEC_NAME);
      const agentId = agent.agentId;

      await waitForAgentComplete(agentId, 60000);

      // Count initial Session Started logs
      const initialLogs = await getAgentLogs(agentId);
      const initialSessionCount = initialLogs.filter(
        (log: any) => log.type === 'system' && log.session
      ).length;
      console.log(`[E2E] Initial Session Started count: ${initialSessionCount}`);

      // Resume agent
      await resumeAgentViaStore(agentId, 'session_test_instruction');

      // Wait for resumed session to start
      await browser.pause(1000);
      await waitForRunningAgent(SPEC_NAME, 10000);

      // Wait for resumed agent to produce logs
      const hasMoreSessionLogs = await waitForCondition(async () => {
        const logs = await getAgentLogs(agentId);
        const sessionCount = logs.filter(
          (log: any) => log.type === 'system' && log.session
        ).length;
        console.log(`[E2E] Current Session Started count: ${sessionCount}`);
        return sessionCount > initialSessionCount;
      }, 30000, 1000, 'new-session-started-log');

      console.log(`[E2E] Has new Session Started log: ${hasMoreSessionLogs}`);
      expect(hasMoreSessionLogs).toBe(true);

      // Wait for completion
      await waitForAgentComplete(agentId, 60000);
    });
  });

  // ============================================================
  // 4. Multiple resumes accumulate logs
  // ============================================================
  describe('Multiple resumes accumulate logs', () => {
    it('should accumulate logs across multiple resume operations', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execution-button"]');
      await autoButton.click();

      const hasAgent = await waitForAgentInStore(SPEC_NAME, 10000);
      expect(hasAgent).toBe(true);

      const agent = await getFirstAgentForSpec(SPEC_NAME);
      const agentId = agent.agentId;

      await waitForAgentComplete(agentId, 60000);

      // Record log count after first execution
      const logs1 = await getAgentLogs(agentId);
      const count1 = logs1.length;
      console.log(`[E2E] Log count after first execution: ${count1}`);

      // First resume
      await resumeAgentViaStore(agentId, 'first_resume_instruction');
      await browser.pause(500);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      const logs2 = await getAgentLogs(agentId);
      const count2 = logs2.length;
      console.log(`[E2E] Log count after first resume: ${count2}`);
      expect(count2).toBeGreaterThan(count1);

      // Second resume
      await resumeAgentViaStore(agentId, 'second_resume_instruction');
      await browser.pause(500);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      const logs3 = await getAgentLogs(agentId);
      const count3 = logs3.length;
      console.log(`[E2E] Log count after second resume: ${count3}`);
      expect(count3).toBeGreaterThan(count2);

      // Verify we have multiple stdin entries
      // main-process-log-parser: LogEntry.stream -> ParsedLogEntry.type
      const stdinCount = logs3.filter((log: any) => log.type === 'input').length;
      console.log(`[E2E] Total stdin entries: ${stdinCount}`);
      expect(stdinCount).toBeGreaterThanOrEqual(2);

      // Verify we have multiple Session Started entries
      const sessionCount = logs3.filter(
        (log: any) => log.type === 'system' && log.session
      ).length;
      console.log(`[E2E] Total Session Started entries: ${sessionCount}`);
      expect(sessionCount).toBeGreaterThanOrEqual(3); // 1 initial + 2 resumes
    });
  });

  // ============================================================
  // 5. UI displays accumulated logs correctly
  // ============================================================
  describe('UI displays accumulated logs', () => {
    it('should display accumulated logs in AgentLogPanel after resume', async () => {
      await setAutoExecutionPermissions({
        requirements: true,
        design: false,
        tasks: false,
        impl: false,
        inspection: false,
        deploy: false,
      });

      const autoButton = await $('[data-testid="auto-execution-button"]');
      await autoButton.click();

      const hasAgent = await waitForAgentInStore(SPEC_NAME, 10000);
      expect(hasAgent).toBe(true);

      const agent = await getFirstAgentForSpec(SPEC_NAME);
      const agentId = agent.agentId;

      // Wait for log panel to show content
      await waitForCondition(async () => {
        const logPanel = await $('[data-testid="agent-log-panel"]');
        if (!await logPanel.isExisting()) return false;
        const logEntries = await logPanel.$$('.space-y-2 > div');
        return logEntries.length > 0;
      }, 10000, 300, 'initial-log-content');

      await waitForAgentComplete(agentId, 60000);

      // Count UI log entries before resume
      const logPanel = await $('[data-testid="agent-log-panel"]');
      const initialUiEntries = await logPanel.$$('.space-y-2 > div');
      const initialUiCount = initialUiEntries.length;
      console.log(`[E2E] Initial UI log entries: ${initialUiCount}`);

      // Resume agent
      await resumeAgentViaStore(agentId, 'ui_test_instruction');
      await browser.pause(500);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      // Wait for UI to update
      await browser.pause(1000);

      // Count UI log entries after resume
      const finalUiEntries = await logPanel.$$('.space-y-2 > div');
      const finalUiCount = finalUiEntries.length;
      console.log(`[E2E] Final UI log entries: ${finalUiCount}`);

      // UI should show more entries (accumulated)
      expect(finalUiCount).toBeGreaterThan(initialUiCount);

      // Check for Session Started text in UI
      const logPanelText = await logPanel.getText();
      const hasSessionStartedText =
        logPanelText.includes('Session Started') ||
        logPanelText.includes('セッション');
      console.log(`[E2E] UI contains Session Started: ${hasSessionStartedText}`);
    });
  });
});
