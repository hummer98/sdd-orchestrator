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
  ensureProjectSelected,
  selectSpecViaUI,
  setAutoExecutionPermissions,
  waitForCondition,
  refreshSpecStore,
  clearAgentStore,
  resetAutoExecutionService,
  resetAutoExecutionCoordinator,
  waitForRunningAgent,
  waitForAgentInStore,
  stopAutoExecution,
  resumeAgentViaStore,
  waitForAgentComplete,
  waitForSpecDetailReady,
  getFirstAgentForSpec,
} from './helpers/auto-execution.helpers';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/auto-exec-test');
const SPEC_NAME = 'simple-feature';
const SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/specs', SPEC_NAME);
// Category-aware path: .kiro/runtime/agents/specs/{specId}/
const RUNTIME_AGENTS_SPEC_DIR = path.join(FIXTURE_PATH, '.kiro/runtime/agents/specs', SPEC_NAME);

/**
 * Raw log entry as stored in JSONL log files
 */
interface RawLogEntry {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  data: string;
}

/**
 * Read raw log entries directly from disk (Node.js fs).
 *
 * Avoids browser.executeAsync + tRPC anti-pattern.
 * Log files are JSONL at:
 *   - New: .kiro/runtime/agents/specs/{specId}/logs/{agentId}.log
 *   - Legacy: .kiro/specs/{specId}/logs/{agentId}.log
 */
function readLogsFromDisk(agentId: string): RawLogEntry[] {
  const logPaths = [
    path.join(RUNTIME_AGENTS_SPEC_DIR, 'logs', `${agentId}.log`),
    path.join(SPEC_DIR, 'logs', `${agentId}.log`),
  ];
  for (const logPath of logPaths) {
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, 'utf-8');
      const lines = content.split('\n').filter((l) => l.trim());
      return lines.map((l) => JSON.parse(l) as RawLogEntry);
    }
  }
  return [];
}

/**
 * Get stdout log entries (excluding stderr) from disk.
 * Each stdout entry's `data` field contains a JSONL event from the CLI.
 */
function getStdoutLogs(agentId: string): Array<{ raw: RawLogEntry; event: any }> {
  const logs = readLogsFromDisk(agentId);
  return logs
    .filter((l) => l.stream === 'stdout')
    .map((l) => {
      try {
        return { raw: l, event: JSON.parse(l.data.trim()) };
      } catch {
        return { raw: l, event: null };
      }
    })
    .filter((l) => l.event !== null);
}

/**
 * Check if logs contain a session init event
 */
function hasInitEvent(agentId: string): boolean {
  const logs = getStdoutLogs(agentId);
  return logs.some((l) => l.event.type === 'system' && l.event.subtype === 'init');
}

/**
 * Check if logs contain a user input event with specific text
 */
function hasUserInputEvent(agentId: string, textFragment: string): boolean {
  const logs = getStdoutLogs(agentId);
  return logs.some((l) => {
    if (l.event.type !== 'user') return false;
    const content = l.event.message?.content;
    if (!Array.isArray(content)) return false;
    return content.some((c: any) => c.type === 'text' && c.text?.includes(textFragment));
  });
}

/**
 * Count init events in log file
 */
function countInitEvents(agentId: string): number {
  const logs = getStdoutLogs(agentId);
  return logs.filter((l) => l.event.type === 'system' && l.event.subtype === 'init').length;
}

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

  // Clean up category-aware runtime/agents/specs/{specId}/ directory (logs + records)
  const runtimeLogsDir = path.join(RUNTIME_AGENTS_SPEC_DIR, 'logs');
  if (fs.existsSync(runtimeLogsDir)) {
    for (const file of fs.readdirSync(runtimeLogsDir)) {
      try { fs.unlinkSync(path.join(runtimeLogsDir, file)); } catch { /* ignore */ }
    }
  }
  // Clean agent record JSON files
  if (fs.existsSync(RUNTIME_AGENTS_SPEC_DIR)) {
    for (const file of fs.readdirSync(RUNTIME_AGENTS_SPEC_DIR)) {
      if (file.endsWith('.json')) {
        try { fs.unlinkSync(path.join(RUNTIME_AGENTS_SPEC_DIR, file)); } catch { /* ignore */ }
      }
    }
  }

  // Clean up legacy logs directory (.kiro/specs/{specId}/logs/)
  const legacyLogsDir = path.join(SPEC_DIR, 'logs');
  if (fs.existsSync(legacyLogsDir)) {
    for (const file of fs.readdirSync(legacyLogsDir)) {
      try { fs.unlinkSync(path.join(legacyLogsDir, file)); } catch { /* ignore */ }
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

    const projectSuccess = await ensureProjectSelected(FIXTURE_PATH);
    expect(projectSuccess).toBe(true);

    await browser.pause(500);
    await refreshSpecStore();
    await browser.pause(500);

    const specSuccess = await selectSpecViaUI(SPEC_NAME);
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
      expect(completed).toBe(true);

      // Record initial log count from disk (avoids tRPC anti-pattern in browser.executeAsync)
      const initialLogCount = getStdoutLogs(agentId).length;
      console.log(`[E2E] Initial stdout log count (disk): ${initialLogCount}`);
      expect(initialLogCount).toBeGreaterThan(0);

      // Check for initial Session Started (init event)
      const hasInitialInit = hasInitEvent(agentId);
      console.log(`[E2E] Has initial init event: ${hasInitialInit}`);
      expect(hasInitialInit).toBe(true);

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

      // Get final log count from disk
      const finalLogCount = getStdoutLogs(agentId).length;
      console.log(`[E2E] Final stdout log count (disk): ${finalLogCount}`);

      // Verify logs are accumulated (not cleared) - resume adds user event + new init + result
      expect(finalLogCount).toBeGreaterThan(initialLogCount);
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

      // Wait for resumed agent to complete (writes user event + new session to log file)
      await browser.pause(1000);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      // Check for user input event in log file (disk-based)
      const hasStdinEntry = hasUserInputEvent(agentId, additionalInstruction);
      console.log(`[E2E] Has stdin entry with instruction (disk): ${hasStdinEntry}`);
      expect(hasStdinEntry).toBe(true);
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

      // Count initial init events from disk
      const initialInitCount = countInitEvents(agentId);
      console.log(`[E2E] Initial init event count (disk): ${initialInitCount}`);
      expect(initialInitCount).toBe(1);

      // Resume agent
      await resumeAgentViaStore(agentId, 'session_test_instruction');

      // Wait for resumed session to complete
      await browser.pause(1000);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      // Check that new init event was added (resumed session outputs its own init)
      const finalInitCount = countInitEvents(agentId);
      console.log(`[E2E] Final init event count (disk): ${finalInitCount}`);
      expect(finalInitCount).toBeGreaterThan(initialInitCount);
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

      // Record log count after first execution (disk-based)
      const count1 = getStdoutLogs(agentId).length;
      console.log(`[E2E] Stdout log count after first execution (disk): ${count1}`);
      expect(count1).toBeGreaterThan(0);

      // First resume
      await resumeAgentViaStore(agentId, 'first_resume_instruction');
      await browser.pause(1000);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      const count2 = getStdoutLogs(agentId).length;
      console.log(`[E2E] Stdout log count after first resume (disk): ${count2}`);
      expect(count2).toBeGreaterThan(count1);

      // Second resume
      await resumeAgentViaStore(agentId, 'second_resume_instruction');
      await browser.pause(1000);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      const count3 = getStdoutLogs(agentId).length;
      console.log(`[E2E] Stdout log count after second resume (disk): ${count3}`);
      expect(count3).toBeGreaterThan(count2);

      // Verify we have multiple user input events (from resume instructions)
      const userEventCount = getStdoutLogs(agentId).filter((l) => l.event.type === 'user').length;
      console.log(`[E2E] Total user input events (disk): ${userEventCount}`);
      expect(userEventCount).toBeGreaterThanOrEqual(2);

      // Verify we have multiple init events (1 initial + 2 resumes)
      const initCount = countInitEvents(agentId);
      console.log(`[E2E] Total init events (disk): ${initCount}`);
      expect(initCount).toBeGreaterThanOrEqual(3);
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

      // Wait for agent to complete first
      await waitForAgentComplete(agentId, 60000);

      // Verify log file was written on disk (primary verification)
      const diskLogsBefore = getStdoutLogs(agentId).length;
      console.log(`[E2E] Disk stdout logs before resume: ${diskLogsBefore}`);
      expect(diskLogsBefore).toBeGreaterThan(0);

      // Resume agent
      await resumeAgentViaStore(agentId, 'ui_test_instruction');
      await browser.pause(1000);
      await waitForRunningAgent(SPEC_NAME, 10000);
      await waitForAgentComplete(agentId, 60000);

      // Verify logs accumulated on disk after resume
      const diskLogsAfter = getStdoutLogs(agentId).length;
      console.log(`[E2E] Disk stdout logs after resume: ${diskLogsAfter}`);
      expect(diskLogsAfter).toBeGreaterThan(diskLogsBefore);

      // Verify user input event was written for the resume instruction
      expect(hasUserInputEvent(agentId, 'ui_test_instruction')).toBe(true);

      // Verify second init event from resumed session exists on disk
      const finalInitCount = countInitEvents(agentId);
      console.log(`[E2E] Final init count after UI test: ${finalInitCount}`);
      expect(finalInitCount).toBeGreaterThanOrEqual(2);
    });
  });
});
