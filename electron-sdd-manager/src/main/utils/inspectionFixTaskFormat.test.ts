import { describe, it, expect } from 'vitest';

/**
 * inspection-fix-task-format Task 5.1: Fix Tasks生成フローの統合テスト
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.4, 4.1, 4.3, 4.4, 4.5
 *
 * This test suite verifies the rules defined in spec-inspection.md template
 * for generating fix tasks with sequential numbering and proper section structure.
 */

// ============================================================
// Task 1.1: 既存タスクから最大番号を特定するロジック
// Requirements: 4.1, 4.2
// ============================================================
describe('Task number extraction logic', () => {
  /**
   * Extract maximum task group number from tasks.md content
   * Pattern: /^- \[.\] (\d+)\.(\d+)/gm
   */
  function extractMaxTaskGroupNumber(content: string): number {
    const pattern = /^- \[.\] (\d+)\.(\d+)/gm;
    let maxN = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const n = parseInt(match[1], 10);
      if (n > maxN) {
        maxN = n;
      }
    }

    return maxN;
  }

  it('should extract maximum task group number from N.M format tasks', () => {
    const content = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1
- [x] 1.2 サブタスク2
- [x] 2. タスクグループ2
- [x] 2.1 サブタスク
- [ ] 3. タスクグループ3
- [ ] 3.1 サブタスク1
- [ ] 3.2 サブタスク2`;

    const maxN = extractMaxTaskGroupNumber(content);
    expect(maxN).toBe(3);
  });

  it('should return 0 when no tasks found', () => {
    const content = `# Implementation Plan

No tasks here yet.`;

    const maxN = extractMaxTaskGroupNumber(content);
    expect(maxN).toBe(0);
  });

  it('should handle tasks with high numbers', () => {
    const content = `- [x] 10.1 タスク
- [x] 10.2 タスク
- [x] 15.1 タスク`;

    const maxN = extractMaxTaskGroupNumber(content);
    expect(maxN).toBe(15);
  });

  it('should handle mixed format (ignore FIX-N, extract from N.M)', () => {
    // Requirement 3.2: FIX-N is legacy format, should be ignored for numbering
    const content = `- [x] 1.1 サブタスク
- [x] 1.2 サブタスク
- [x] FIX-1 修正タスク
- [x] FIX-2 修正タスク`;

    const maxN = extractMaxTaskGroupNumber(content);
    expect(maxN).toBe(1); // Only count N.M format
  });
});

// ============================================================
// Task 1.2: 新規Fix Tasksの番号を連番で生成
// Requirements: 1.1, 1.2, 1.3, 4.3
// ============================================================
describe('Fix task numbering generation', () => {
  /**
   * Generate new fix task ID based on max existing number
   */
  function generateFixTaskId(maxN: number, sequence: number): string {
    const groupNumber = maxN + 1;
    return `${groupNumber}.${sequence}`;
  }

  it('should generate next group number for fix tasks', () => {
    // If max existing is 3, new fix tasks should be 4.1, 4.2, ...
    expect(generateFixTaskId(3, 1)).toBe('4.1');
    expect(generateFixTaskId(3, 2)).toBe('4.2');
    expect(generateFixTaskId(3, 3)).toBe('4.3');
  });

  it('should start from 1.1 when no existing tasks', () => {
    expect(generateFixTaskId(0, 1)).toBe('1.1');
    expect(generateFixTaskId(0, 2)).toBe('1.2');
  });

  it('should handle high existing numbers', () => {
    expect(generateFixTaskId(99, 1)).toBe('100.1');
  });

  it('should NOT use FIX-N format', () => {
    // Requirement 1.3: FIX-N format must NOT be used
    const taskId = generateFixTaskId(5, 1);
    expect(taskId).not.toMatch(/^FIX-/);
    expect(taskId).toMatch(/^\d+\.\d+$/);
  });
});

// ============================================================
// Task 2.1: セクション挿入位置の判定ロジック
// Requirements: 2.4, 4.4, 4.5
// ============================================================
describe('Section insertion position detection', () => {
  /**
   * Determine where to insert Inspection Fixes section
   */
  function determineInsertionPosition(
    content: string
  ): { position: 'before_appendix' | 'end_of_file' | 'append_to_existing'; insertIndex: number } {
    const inspectionFixesIndex = content.indexOf('## Inspection Fixes');
    if (inspectionFixesIndex !== -1) {
      // Find the end of Inspection Fixes section (before next ## or end)
      const afterInspection = content.slice(inspectionFixesIndex);
      const nextSectionMatch = afterInspection.match(/\n## (?!Inspection Fixes)/);
      if (nextSectionMatch && nextSectionMatch.index) {
        return {
          position: 'append_to_existing',
          insertIndex: inspectionFixesIndex + nextSectionMatch.index,
        };
      }
      return {
        position: 'append_to_existing',
        insertIndex: content.length,
      };
    }

    const appendixIndex = content.indexOf('## Appendix');
    if (appendixIndex !== -1) {
      // Requirement 2.4, 4.5: Insert before Appendix
      return { position: 'before_appendix', insertIndex: appendixIndex };
    }

    // Requirement 4.4: Append after --- separator at end
    return { position: 'end_of_file', insertIndex: content.length };
  }

  it('should insert before Appendix section when it exists', () => {
    const content = `# Implementation Plan

- [x] 1.1 Task

---

## Appendix: Requirements Coverage Matrix

| Criterion | Task |
|-----------|------|`;

    const result = determineInsertionPosition(content);
    expect(result.position).toBe('before_appendix');
    expect(content.slice(result.insertIndex)).toContain('## Appendix');
  });

  it('should append to end when no Appendix section', () => {
    const content = `# Implementation Plan

- [x] 1.1 Task

---`;

    const result = determineInsertionPosition(content);
    expect(result.position).toBe('end_of_file');
    expect(result.insertIndex).toBe(content.length);
  });

  it('should append to existing Inspection Fixes section', () => {
    const content = `# Implementation Plan

- [x] 1.1 Task

---

## Inspection Fixes

### Round 1 (2026-01-15)

- [x] 2.1 Fix Task

---

## Appendix`;

    const result = determineInsertionPosition(content);
    expect(result.position).toBe('append_to_existing');
    // Should insert before ## Appendix but after ## Inspection Fixes content
    expect(result.insertIndex).toBeGreaterThan(content.indexOf('## Inspection Fixes'));
    expect(result.insertIndex).toBeLessThanOrEqual(content.indexOf('## Appendix'));
  });

  it('should append to existing Inspection Fixes section at end of file', () => {
    const content = `# Implementation Plan

- [x] 1.1 Task

---

## Inspection Fixes

### Round 1 (2026-01-15)

- [x] 2.1 Fix Task`;

    const result = determineInsertionPosition(content);
    expect(result.position).toBe('append_to_existing');
    expect(result.insertIndex).toBe(content.length);
  });
});

// ============================================================
// Task 2.2: Inspection Fixesセクションとラウンドサブセクション生成
// Requirements: 2.1, 2.2
// ============================================================
describe('Inspection Fixes section generation', () => {
  /**
   * Generate Round subsection header
   */
  function generateRoundHeader(roundNumber: number, date: string): string {
    return `### Round ${roundNumber} (${date})`;
  }

  /**
   * Generate Inspection Fixes section header
   */
  function generateInspectionFixesHeader(): string {
    return '## Inspection Fixes';
  }

  it('should generate proper Round header with ISO date', () => {
    const header = generateRoundHeader(1, '2026-01-17');
    expect(header).toBe('### Round 1 (2026-01-17)');
  });

  it('should generate Inspection Fixes section header', () => {
    const header = generateInspectionFixesHeader();
    expect(header).toBe('## Inspection Fixes');
  });

  it('should increment round number for subsequent rounds', () => {
    const header1 = generateRoundHeader(1, '2026-01-17');
    const header2 = generateRoundHeader(2, '2026-01-18');
    const header3 = generateRoundHeader(3, '2026-01-19');

    expect(header1).toContain('Round 1');
    expect(header2).toContain('Round 2');
    expect(header3).toContain('Round 3');
  });
});

// ============================================================
// Task 2.3: Fix Taskに関連情報を付記
// Requirements: 2.3
// ============================================================
describe('Fix task related information', () => {
  /**
   * Generate fix task with related information
   */
  function generateFixTask(
    taskId: string,
    description: string,
    relatedTask: string,
    relatedRequirement: string
  ): string {
    return `- [ ] ${taskId} ${description}
  - 関連: ${relatedTask}, ${relatedRequirement}`;
  }

  it('should generate fix task with related task and requirement', () => {
    const task = generateFixTask(
      '7.1',
      'エラーハンドリングを追加',
      'Task 2.3',
      'Requirement 1.2'
    );

    expect(task).toContain('7.1');
    expect(task).toContain('エラーハンドリングを追加');
    expect(task).toContain('関連: Task 2.3, Requirement 1.2');
  });

  it('should format with proper indentation', () => {
    const task = generateFixTask('8.1', 'Fix description', 'Task 1.1', 'Requirement 2.1');
    const lines = task.split('\n');

    expect(lines[0]).toMatch(/^- \[ \] 8\.1/);
    expect(lines[1]).toMatch(/^  - 関連:/);
  });
});

// ============================================================
// Integration test: Complete Fix Tasks generation flow
// Requirements: 1.1, 1.2, 2.1, 2.2, 2.4, 4.1, 4.3, 4.4, 4.5
// ============================================================
describe('Complete Fix Tasks generation flow', () => {
  function extractMaxTaskGroupNumber(content: string): number {
    const pattern = /^- \[.\] (\d+)\.(\d+)/gm;
    let maxN = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const n = parseInt(match[1], 10);
      if (n > maxN) {
        maxN = n;
      }
    }

    return maxN;
  }

  it('should generate complete Fix Tasks section for new inspection', () => {
    const existingContent = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1
- [x] 1.2 サブタスク2
- [x] 2. タスクグループ2
- [x] 2.1 サブタスク

---

## Appendix: Requirements Coverage Matrix

| Criterion | Task |
|-----------|------|`;

    // Step 1: Extract max task number
    const maxN = extractMaxTaskGroupNumber(existingContent);
    expect(maxN).toBe(2);

    // Step 2: Generate new task IDs
    const newGroupNumber = maxN + 1;
    expect(newGroupNumber).toBe(3);

    // Step 3: Generate section content
    const date = '2026-01-17';
    const fixTasksSection = `
## Inspection Fixes

### Round 1 (${date})

- [ ] ${newGroupNumber}.1 Fix Task 1
  - 関連: Task 1.2, Requirement 1.1

- [ ] ${newGroupNumber}.2 Fix Task 2
  - 関連: Task 2.1, Requirement 2.3

`;

    // Step 4: Determine insertion position (before Appendix)
    const appendixIndex = existingContent.indexOf('## Appendix');
    expect(appendixIndex).toBeGreaterThan(0);

    // Step 5: Insert content
    const newContent =
      existingContent.slice(0, appendixIndex) +
      fixTasksSection +
      existingContent.slice(appendixIndex);

    // Verify structure
    expect(newContent).toContain('## Inspection Fixes');
    expect(newContent).toContain('### Round 1 (2026-01-17)');
    expect(newContent).toContain('- [ ] 3.1 Fix Task 1');
    expect(newContent).toContain('- [ ] 3.2 Fix Task 2');
    expect(newContent).toContain('関連: Task');
    expect(newContent).toContain('関連: Task 2.1, Requirement 2.3');

    // Verify insertion is before Appendix
    const inspectionFixesIndex = newContent.indexOf('## Inspection Fixes');
    const newAppendixIndex = newContent.indexOf('## Appendix');
    expect(inspectionFixesIndex).toBeLessThan(newAppendixIndex);

    // Verify no FIX-N format
    expect(newContent).not.toMatch(/FIX-\d+/);
  });

  it('should append to existing Inspection Fixes section with new round', () => {
    const existingContent = `# Implementation Plan

- [x] 1. タスクグループ1
- [x] 1.1 サブタスク1
- [x] 1.2 サブタスク2

---

## Inspection Fixes

### Round 1 (2026-01-15)

- [x] 2.1 既存の修正タスク
  - 関連: Task 1.1, Requirement 1.1

---

## Appendix: Requirements Coverage Matrix`;

    // Step 1: Extract max task number (including existing fix tasks)
    const maxN = extractMaxTaskGroupNumber(existingContent);
    expect(maxN).toBe(2); // 2.1 is the highest

    // Step 2: Generate new task IDs for Round 2
    const newGroupNumber = maxN + 1;
    expect(newGroupNumber).toBe(3);

    // Step 3: Generate Round 2 content
    const round2Content = `
### Round 2 (2026-01-17)

- [ ] ${newGroupNumber}.1 新しい修正タスク
  - 関連: Task 2.1, Requirement 2.1

`;

    // Step 4: Find insertion point (before --- before Appendix)
    const inspectionFixesIndex = existingContent.indexOf('## Inspection Fixes');
    const appendixIndex = existingContent.indexOf('## Appendix');
    const separatorBeforeAppendix = existingContent.lastIndexOf('---', appendixIndex);

    // Step 5: Insert content
    const newContent =
      existingContent.slice(0, separatorBeforeAppendix) +
      round2Content +
      existingContent.slice(separatorBeforeAppendix);

    // Verify structure
    expect(newContent).toContain('### Round 1 (2026-01-15)');
    expect(newContent).toContain('### Round 2 (2026-01-17)');
    expect(newContent).toContain('- [x] 2.1 既存の修正タスク');
    expect(newContent).toContain('- [ ] 3.1 新しい修正タスク');

    // Verify order: Round 1 before Round 2
    const round1Index = newContent.indexOf('### Round 1');
    const round2Index = newContent.indexOf('### Round 2');
    expect(round1Index).toBeLessThan(round2Index);

    // Verify Round 2 is before Appendix
    const newAppendixIndex = newContent.indexOf('## Appendix');
    expect(round2Index).toBeLessThan(newAppendixIndex);
  });
});
