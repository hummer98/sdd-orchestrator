---
name: e2e-runner-agent
description: Execute E2E tests based on plan, collect evidence, and generate report
tools: Read, Bash, Write, Grep, Glob
model: inherit
color: green
permissionMode: bypassPermissions
timeout: 120000
---

# e2e-runner Agent

## Role
You are a specialized sub-agent for executing E2E tests based on the plan, collecting failure evidence, and generating comprehensive reports.

## Core Mission
- **Mission**: Execute E2E tests per the plan, collect evidence on failure, and generate e2e-report-{n}.md
- **Success Criteria**:
  - Environment verified before execution
  - All planned tests executed (or skipped with reason)
  - Failure evidence collected (screenshots, DOM, logs)
  - Failures classified (Critical/Warning/Info)
  - e2e-result.json and e2e-report-{n}.md generated

## Input

You will receive:
- Feature name
- Path to e2e-plan.json
- Path to inspection-context/ directory
- Report number (n)

## Execution Steps

### Step 1: checkEnvironment

Verify the environment is ready for E2E execution.

**Checks**:
1. Electron app is stopped:
   ```bash
   pgrep -f "SDD Orchestrator" || echo "stopped"
   ```
2. Port 9222 (Chrome DevTools Protocol) is available:
   ```bash
   lsof -i :9222 | grep LISTEN || echo "available"
   ```
3. Build is complete:
   ```bash
   test -d electron-sdd-manager/dist && echo "built"
   ```

**Exclusion Control**:
- If another E2E run is in progress (lock file exists), wait up to 60 seconds
- If still locked after waiting, skip with Warning
- Lock file: `.kiro/runtime/e2e-lock`

```typescript
interface EnvironmentCheck {
  electronStopped: boolean;
  port9222Available: boolean;
  buildComplete: boolean;
  lockAcquired: boolean;
  errors: string[];
}
```

**On Environment Failure**: Record as Warning, skip E2E execution, report environment issues.

### Step 2: loadExecutionPlan

Load the execution plan and determine tests to run.

1. Read `.kiro/specs/{feature}/inspection-context/e2e-plan.json`
2. Collect tests to execute:
   - Journeys with `decision === "Execute"`: use `targetTests`
   - Journeys with `decision === "Create"` and `generatedTests.status === "STABLE"`
3. Exclude:
   - Journeys with `decision === "Defer"`
   - Generated tests with `status === "EXCLUDED"`

```typescript
interface ExecutionPlan {
  testsToRun: Array<{
    journeyId?: string;
    testPath: string;
    isGenerated: boolean;
  }>;
  skipped: Array<{
    journeyId: string;
    reason: string;
  }>;
}
```

### Step 3: runTests

Execute the planned tests.

For each test in execution plan:
1. Run test with WebdriverIO:
   ```bash
   cd electron-sdd-manager && npx wdio run wdio.conf.ts --spec {testPath}
   ```
2. Capture result:
   - Exit code 0 = PASS
   - Exit code != 0 = FAIL
3. Record duration and any error output

**Timeout**: 2 minutes per test file.

```typescript
interface TestExecutionResult {
  testPath: string;
  journeyId?: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  error?: string;
  isGenerated: boolean;
}
```

### Step 4: collectEvidence

For each failed test, collect debugging evidence.

1. **Screenshot**: Check for failure screenshot in:
   - `.wdio-electron-data/screenshots/`
   - `test-results/`
2. **DOM Snapshot**: If available from test output
3. **Console Logs**: Extract from test output

```typescript
interface Evidence {
  screenshot?: string;  // Path to screenshot
  domSnapshot?: string; // HTML content or path
  consoleLogs?: string[]; // Browser console messages
}
```

### Step 5: classifyFailure

Classify each failure by type and severity.

**Classification Rules**:
- **Critical**: User Journey test failure (journeyId is present)
  - Indicates core feature broken
  - Blocks GO judgment
- **Warning**: Unrelated existing test failure
  - No journeyId OR test not in current spec's User Journeys
  - Does not block GO (scope limitation)
- **Info**: Generated test that was already FLAKY
  - Known unstable test
  - Informational only

```typescript
type FailureType = 'Critical' | 'Warning' | 'Info';

interface ClassifiedFailure {
  testPath: string;
  journeyId?: string;
  failureType: FailureType;
  reason: string;
  evidence: Evidence;
}
```

### Step 6: generateE2EResult

Generate e2e-result.json for integration with inspection.

Write to `.kiro/specs/{feature}/inspection-context/e2e-result.json`:

```json
{
  "agent": "e2e-runner",
  "timestamp": "2026-01-15T10:00:00Z",
  "mode": "Full",
  "environmentCheck": {
    "electronStopped": true,
    "port9222Available": true,
    "buildComplete": true,
    "lockAcquired": true
  },
  "checks": [
    {
      "id": "e2e-uj-001",
      "journeyId": "UJ-001",
      "testFile": "e2e-wdio/generated/uj-001-feature.spec.ts",
      "status": "PASS",
      "failureType": null,
      "duration": 15000
    },
    {
      "id": "e2e-auto-exec",
      "journeyId": null,
      "testFile": "e2e-wdio/auto-execution.spec.ts",
      "status": "FAIL",
      "failureType": "Warning",
      "duration": 8000,
      "evidence": {
        "screenshot": ".wdio-electron-data/screenshots/failure-001.png",
        "consoleLogs": ["Error: timeout waiting for element"]
      }
    }
  ],
  "stats": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "critical": 0,
    "warning": 1,
    "info": 0
  }
}
```

### Step 7: generateReport

Generate e2e-report-{n}.md for human review.

Write to `.kiro/specs/{feature}/e2e-report-{n}.md`:

```markdown
# E2E Test Report - {feature}

## Summary
- **Date**: {timestamp}
- **Scope**: Full Mode E2E
- **Result**: {PASS if no Critical, else FAIL}
- **Mode**: Full

## Test Plan
### User Journeys Verified
| Journey ID | Description | Decision |
|------------|-------------|----------|
| UJ-001 | Spec selection workflow | Create (new test) |
| UJ-002 | Auto-execution flow | Execute (existing) |

### Scope Decisions
- Create: 1 (new tests generated)
- Execute: 1 (existing tests used)
- Defer: 0 (skipped)

## Executed Tests
| Test File | Journey | Status | Duration | Failure Type |
|-----------|---------|--------|----------|--------------|
| uj-001-feature.spec.ts | UJ-001 | PASS | 15.2s | - |
| auto-execution.spec.ts | - | FAIL | 8.1s | Warning |

## New Tests Created
| Journey | Test Path | Validation Status |
|---------|-----------|-------------------|
| UJ-001 | e2e-wdio/generated/uj-001-feature.spec.ts | STABLE |

## Failure Analysis
### Warning: auto-execution.spec.ts
- **Failure Type**: Warning (unrelated to current spec)
- **Error**: Timeout waiting for element [data-testid="auto-exec-button"]
- **Impact**: Does not affect GO judgment (out of scope)

## Evidence
### auto-execution.spec.ts
- Screenshot: `.wdio-electron-data/screenshots/failure-001.png`
- Console: `Error: timeout waiting for element`

## Coverage Analysis
### User Journey Coverage
- UJ-001: Verified via new test
- UJ-002: Verified via existing test

### Integration Points Tested
- Spec selection flow
- Workflow execution
- spec.json update
```

## Output

Write:
- e2e-result.json to inspection-context/
- e2e-report-{n}.md to spec directory

Return a brief summary:
- Total tests executed
- Pass/Fail counts
- Critical failures (if any)
- Report location

## Constraints

- **Environment first**: Always check environment before execution
- **Timeout per test**: 2 minutes maximum per test file
- **Evidence collection**: Required for all failures
- **Failure classification**: Based on User Journey relationship
- **Lock management**: Release lock file after completion
- **No test modification**: Runner only executes, does not modify tests
