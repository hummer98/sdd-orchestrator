#!/usr/bin/env npx ts-node
/**
 * Vitest JSON結果パーサー
 * vitest JSON reporter出力から失敗テストのみのMarkdownレポートを生成
 *
 * Usage:
 *   npx ts-node scripts/parse-unit-test-results.ts
 *   task electron:test:report:parse
 */

import * as fs from 'fs';
import * as path from 'path';

// --- Types ---

interface VitestResult {
  numTotalTestSuites: number;
  numPassedTestSuites: number;
  numFailedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  startTime: number;
  success: boolean;
  testResults: TestSuiteResult[];
}

interface TestSuiteResult {
  assertionResults: AssertionResult[];
  startTime: number;
  endTime: number;
  status: string;
  message: string;
  name: string;
}

interface AssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: string;
  title: string;
  failureMessages: string[];
  location?: { line: number; column: number };
}

// --- Constants ---

const PROJECT_DIR = path.resolve(__dirname, '../electron-sdd-manager');
const INPUT_FILE = path.join(PROJECT_DIR, 'test-results/vitest-results.json');
const OUTPUT_FILE = path.join(PROJECT_DIR, 'test-results/unit-test-report.md');
const STACK_TRACE_MAX_LINES = 5;

// --- Main ---

function main(): void {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Error: ${INPUT_FILE} not found.`);
    console.error('Run "task electron:test:run" first to generate vitest JSON output.');
    process.exit(2);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  let data: VitestResult;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`Error: Failed to parse ${INPUT_FILE}`);
    process.exit(2);
  }

  const report = generateReport(data);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');

  // Print summary to stdout
  const resultLabel = data.success ? 'PASS' : 'FAIL';
  console.log(`[${resultLabel}] Total: ${data.numTotalTests} | Passed: ${data.numPassedTests} | Failed: ${data.numFailedTests}`);
  console.log(`Report: ${OUTPUT_FILE}`);

  process.exit(data.success ? 0 : 1);
}

function generateReport(data: VitestResult): string {
  const lines: string[] = [];
  const resultLabel = data.success ? 'PASS' : 'FAIL';

  // Duration: endTime of last suite - startTime
  const maxEndTime = data.testResults.reduce((max, s) => Math.max(max, s.endTime), 0);
  const durationSec = maxEndTime > 0 ? ((maxEndTime - data.startTime) / 1000).toFixed(1) : '?';

  lines.push('# Unit Test Report');
  lines.push(`**Result**: ${resultLabel} | **Total**: ${data.numTotalTests} | **Passed**: ${data.numPassedTests} | **Failed**: ${data.numFailedTests} | **Suites**: ${data.numTotalTestSuites} | **Duration**: ${durationSec}s`);
  lines.push('');

  // Collect failed suites
  const failedSuites = data.testResults.filter(
    (s) => s.status === 'failed'
  );

  if (failedSuites.length === 0) {
    lines.push('All tests passed.');
    return lines.join('\n');
  }

  // Count total failed tests (including suite-level failures)
  let totalFailedCount = 0;
  for (const suite of failedSuites) {
    const failedAssertions = suite.assertionResults.filter((a) => a.status === 'failed');
    // Suite-level failure (e.g. import error) counts as 1
    totalFailedCount += failedAssertions.length > 0 ? failedAssertions.length : 1;
  }

  lines.push(`## Failed Tests (${totalFailedCount})`);
  lines.push('');

  let fileIndex = 0;
  for (const suite of failedSuites) {
    fileIndex++;
    const relativePath = toRelativePath(suite.name);
    const failedAssertions = suite.assertionResults.filter((a) => a.status === 'failed');
    const totalInSuite = suite.assertionResults.length;

    if (failedAssertions.length > 0) {
      // Normal test failures
      lines.push(`### ${fileIndex}. ${relativePath} (${failedAssertions.length} failed / ${totalInSuite} total)`);
      lines.push('');

      for (const assertion of failedAssertions) {
        const testPath = [...assertion.ancestorTitles, assertion.title].join(' > ');
        lines.push(`#### ${testPath}`);
        lines.push('');
        if (assertion.failureMessages.length > 0) {
          lines.push('```');
          lines.push(truncateStackTrace(assertion.failureMessages.join('\n')));
          lines.push('```');
          lines.push('');
        }
      }
    } else if (suite.message) {
      // Suite-level failure (import error, syntax error, etc.)
      lines.push(`### ${fileIndex}. ${relativePath} (suite error)`);
      lines.push('');
      lines.push('```');
      lines.push(truncateStackTrace(suite.message));
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function toRelativePath(absolutePath: string): string {
  // Convert absolute path to relative from electron-sdd-manager
  const marker = 'electron-sdd-manager/';
  const idx = absolutePath.indexOf(marker);
  if (idx !== -1) {
    return absolutePath.substring(idx + marker.length);
  }
  return path.basename(absolutePath);
}

function truncateStackTrace(text: string): string {
  // Strip ANSI escape codes
  const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = clean.split('\n');
  if (lines.length <= STACK_TRACE_MAX_LINES) {
    return clean.trimEnd();
  }
  return lines.slice(0, STACK_TRACE_MAX_LINES).join('\n') + '\n... (truncated)';
}

main();
