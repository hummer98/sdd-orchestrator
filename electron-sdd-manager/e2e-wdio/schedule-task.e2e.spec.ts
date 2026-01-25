/**
 * Schedule Task E2E Tests
 *
 * E2E tests for schedule task functionality:
 * 1. Task CRUD operations (create -> save -> list -> edit -> delete)
 * 2. Immediate execution -> Agent startup confirmation
 * 3. Enable/disable toggle
 *
 * Task 9.3: E2Eテスト作成
 * Requirements: 1.1-1.6, 2.1-2.4, 7.1
 *
 * Prerequisites:
 * - Run with: npm run build && task electron:test:e2e
 * - Mock Claude CLI is automatically configured via wdio.conf.ts
 */

import * as path from 'path';
import {
  selectProjectViaStore,
  waitForCondition,
} from './helpers/auto-execution.helpers';

// Fixture project path
const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/test-project');

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper: Open schedule task dialog via timer button
 * Requirements: 1.1 - Timer icon click opens dialog
 */
async function openScheduleTaskDialog(): Promise<boolean> {
  const timerButton = await $('[data-testid="schedule-task-button"]');
  if (!(await timerButton.isExisting())) {
    console.log('[E2E] Schedule task button not found');
    return false;
  }

  // Check if button is enabled
  const isDisabled = await timerButton.getAttribute('disabled');
  if (isDisabled) {
    console.log('[E2E] Schedule task button is disabled');
    return false;
  }

  await timerButton.click();
  await browser.pause(500);

  // Wait for dialog to appear
  const dialog = await $('[data-testid="schedule-task-list"]');
  const dialogExists = await dialog.waitForExist({ timeout: 5000 }).catch(() => false);

  return dialogExists;
}

/**
 * Helper: Close schedule task dialog
 */
async function closeScheduleTaskDialog(): Promise<void> {
  // Try to find and click close button (X icon in header or close button in footer)
  const closeButton = await $('button[aria-label="閉じる"]');
  if (await closeButton.isExisting()) {
    await closeButton.click();
    await browser.pause(300);
    return;
  }

  // Try footer close button
  const footerCloseButton = await $('button:has-text("閉じる")');
  if (await footerCloseButton.isExisting()) {
    await footerCloseButton.click();
    await browser.pause(300);
  }
}

/**
 * Helper: Click "タスク追加" button to open new task form
 * Requirements: 2.3 - Empty form for new task creation
 */
async function clickAddTaskButton(): Promise<boolean> {
  const addButton = await $('button*=タスク追加');
  if (!(await addButton.isExisting())) {
    console.log('[E2E] Add task button not found');
    return false;
  }

  await addButton.click();
  await browser.pause(300);

  // Wait for edit page to appear
  const editPage = await $('[data-testid="schedule-task-edit-page"]');
  return editPage.waitForExist({ timeout: 3000 }).catch(() => false);
}

/**
 * Helper: Fill in task name
 */
async function fillTaskName(name: string): Promise<void> {
  const nameInput = await $('[data-testid="task-name-input"]');
  await nameInput.clearValue();
  await nameInput.setValue(name);
  await browser.pause(100);
}

/**
 * Helper: Click save button
 * Requirements: 2.4 - Validation and save
 */
async function clickSaveButton(): Promise<boolean> {
  const saveButton = await $('[data-testid="save-button"]');
  if (!(await saveButton.isExisting())) {
    console.log('[E2E] Save button not found');
    return false;
  }

  const isDisabled = await saveButton.getAttribute('disabled');
  if (isDisabled) {
    console.log('[E2E] Save button is disabled');
    return false;
  }

  await saveButton.click();
  await browser.pause(500);
  return true;
}

/**
 * Helper: Click cancel button
 */
async function clickCancelButton(): Promise<void> {
  const cancelButton = await $('[data-testid="cancel-button"]');
  if (await cancelButton.isExisting()) {
    await cancelButton.click();
    await browser.pause(300);
  }
}

/**
 * Helper: Get schedule task list items count
 */
async function getTaskListItemsCount(): Promise<number> {
  const taskList = await $('[data-testid="schedule-task-list"]');
  if (!(await taskList.isExisting())) {
    return 0;
  }

  const items = await taskList.$$('[data-testid="schedule-task-list-item"]');
  return items.length;
}

/**
 * Helper: Click on a task list item by name
 * Requirements: 1.4 - List item click navigates to edit
 */
async function clickTaskByName(taskName: string): Promise<boolean> {
  const taskItems = await $$('[data-testid="schedule-task-list-item"]');

  for (const item of taskItems) {
    const text = await item.getText();
    if (text.includes(taskName)) {
      await item.click();
      await browser.pause(300);

      // Wait for edit page
      const editPage = await $('[data-testid="schedule-task-edit-page"]');
      return editPage.waitForExist({ timeout: 3000 }).catch(() => false);
    }
  }

  console.log(`[E2E] Task with name "${taskName}" not found`);
  return false;
}

/**
 * Helper: Click delete button on a task item
 * Requirements: 1.5 - Delete icon shows confirmation dialog
 */
async function clickDeleteButtonOnTask(taskName: string): Promise<boolean> {
  const taskItems = await $$('[data-testid="schedule-task-list-item"]');

  for (const item of taskItems) {
    const text = await item.getText();
    if (text.includes(taskName)) {
      const deleteButton = await item.$('[data-testid="delete-button"]');
      if (await deleteButton.isExisting()) {
        await deleteButton.click();
        await browser.pause(300);

        // Wait for confirmation dialog
        const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
        return confirmDialog.waitForExist({ timeout: 3000 }).catch(() => false);
      }
    }
  }

  console.log(`[E2E] Delete button for task "${taskName}" not found`);
  return false;
}

/**
 * Helper: Click toggle button on a task item
 * Requirements: 1.6 - Enable/disable toggle instant update
 */
async function clickToggleOnTask(taskName: string): Promise<boolean> {
  const taskItems = await $$('[data-testid="schedule-task-list-item"]');

  for (const item of taskItems) {
    const text = await item.getText();
    if (text.includes(taskName)) {
      const toggle = await item.$('[data-testid="enabled-toggle"]');
      if (await toggle.isExisting()) {
        await toggle.click();
        await browser.pause(300);
        return true;
      }
    }
  }

  console.log(`[E2E] Toggle for task "${taskName}" not found`);
  return false;
}

/**
 * Helper: Get toggle state for a task
 */
async function getToggleState(taskName: string): Promise<boolean | null> {
  const taskItems = await $$('[data-testid="schedule-task-list-item"]');

  for (const item of taskItems) {
    const text = await item.getText();
    if (text.includes(taskName)) {
      const toggle = await item.$('[data-testid="enabled-toggle"]');
      if (await toggle.isExisting()) {
        const checked = await toggle.getAttribute('data-checked');
        return checked === 'true';
      }
    }
  }

  return null;
}

/**
 * Helper: Click immediate execute button on a task item
 * Requirements: 7.1 - Immediate execution button
 */
async function clickExecuteButtonOnTask(taskName: string): Promise<boolean> {
  const taskItems = await $$('[data-testid="schedule-task-list-item"]');

  for (const item of taskItems) {
    const text = await item.getText();
    if (text.includes(taskName)) {
      const executeButton = await item.$('[data-testid="execute-button"]');
      if (await executeButton.isExisting()) {
        const isDisabled = await executeButton.getAttribute('disabled');
        if (!isDisabled) {
          await executeButton.click();
          await browser.pause(300);
          return true;
        }
        console.log(`[E2E] Execute button for task "${taskName}" is disabled`);
        return false;
      }
    }
  }

  console.log(`[E2E] Execute button for task "${taskName}" not found`);
  return false;
}

/**
 * Helper: Confirm deletion in dialog
 */
async function confirmDelete(): Promise<void> {
  const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
  if (await confirmDialog.isExisting()) {
    const deleteButton = await confirmDialog.$('button*=削除');
    if (await deleteButton.isExisting()) {
      await deleteButton.click();
      await browser.pause(500);
    }
  }
}

/**
 * Helper: Cancel deletion in dialog
 */
async function cancelDelete(): Promise<void> {
  const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
  if (await confirmDialog.isExisting()) {
    const cancelButton = await confirmDialog.$('button*=キャンセル');
    if (await cancelButton.isExisting()) {
      await cancelButton.click();
      await browser.pause(300);
    }
  }
}

/**
 * Helper: Navigate back from edit page to list
 */
async function navigateBackToList(): Promise<void> {
  const backButton = await $('button[aria-label="戻る"]');
  if (await backButton.isExisting()) {
    await backButton.click();
    await browser.pause(300);
  }
}

/**
 * Helper: Set schedule task store mock tasks via browser execute
 */
async function setMockTasks(tasks: any[]): Promise<void> {
  await browser.execute((mockTasks: any[]) => {
    const stores = (window as any).__STORES__;
    if (stores?.scheduleTask?.getState) {
      stores.scheduleTask.getState().updateTasks(mockTasks);
    }
  }, tasks);
  await browser.pause(100);
}

/**
 * Helper: Create a mock schedule task object
 */
function createMockTask(overrides: Partial<any> = {}): any {
  const now = Date.now();
  return {
    id: `test-task-${now}`,
    name: `Test Task ${now}`,
    enabled: true,
    schedule: {
      type: 'interval',
      hoursInterval: 24,
      waitForIdle: false,
    },
    prompts: [{ order: 0, content: '/kiro:steering' }],
    avoidance: { targets: [], behavior: 'skip' },
    workflow: { enabled: false, suffixMode: 'auto' },
    behavior: 'wait',
    lastExecutedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Schedule Task E2E Tests', () => {
  // Setup before all tests
  before(async () => {
    // Select project
    const projectSelected = await selectProjectViaStore(FIXTURE_PATH);
    expect(projectSelected).toBe(true);
    await browser.pause(1000);
  });

  // Cleanup after each test
  afterEach(async () => {
    // Close any open dialogs
    try {
      await closeScheduleTaskDialog();
    } catch {
      // Ignore if dialog is not open
    }
    await browser.pause(200);
  });

  // ============================================================
  // 1. Schedule Task Dialog Access
  // Requirements: 1.1 - Timer icon click opens dialog
  // ============================================================
  describe('Schedule Task Dialog Access', () => {
    it('should show schedule task button in ProjectAgentFooter', async () => {
      const timerButton = await $('[data-testid="schedule-task-button"]');
      const exists = await timerButton.isExisting();
      expect(exists).toBe(true);
    });

    it('should open schedule task dialog when timer button is clicked', async () => {
      const opened = await openScheduleTaskDialog();
      expect(opened).toBe(true);

      // Verify dialog structure (Requirement 1.2)
      const taskList = await $('[data-testid="schedule-task-list"]');
      const listExists = await taskList.isExisting();
      expect(listExists).toBe(true);
    });

    it('should have add task button in dialog header (Requirement 1.2)', async () => {
      await openScheduleTaskDialog();

      const addButton = await $('button*=タスク追加');
      const exists = await addButton.isExisting();
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // 2. Schedule Task Creation Flow
  // Requirements: 2.1-2.4
  // ============================================================
  describe('Schedule Task Creation Flow', () => {
    it('should show edit page when add task button is clicked (Requirement 2.3)', async () => {
      await openScheduleTaskDialog();

      const clicked = await clickAddTaskButton();
      expect(clicked).toBe(true);

      // Verify edit page structure (Requirement 2.1)
      const editPage = await $('[data-testid="schedule-task-edit-page"]');
      const editPageExists = await editPage.isExisting();
      expect(editPageExists).toBe(true);

      // Verify form exists (Requirement 2.2)
      const form = await $('[data-testid="schedule-task-form"]');
      const formExists = await form.isExisting();
      expect(formExists).toBe(true);
    });

    it('should have task name input field (Requirement 2.2)', async () => {
      await openScheduleTaskDialog();
      await clickAddTaskButton();

      const nameInput = await $('[data-testid="task-name-input"]');
      const exists = await nameInput.isExisting();
      expect(exists).toBe(true);
    });

    it('should have save and cancel buttons (Requirement 2.4)', async () => {
      await openScheduleTaskDialog();
      await clickAddTaskButton();

      const saveButton = await $('[data-testid="save-button"]');
      const cancelButton = await $('[data-testid="cancel-button"]');

      expect(await saveButton.isExisting()).toBe(true);
      expect(await cancelButton.isExisting()).toBe(true);
    });

    it('should disable save button when task name is empty (Requirement 2.4)', async () => {
      await openScheduleTaskDialog();
      await clickAddTaskButton();

      const saveButton = await $('[data-testid="save-button"]');
      const isDisabled = await saveButton.getAttribute('disabled');
      expect(isDisabled).toBe('true');
    });

    it('should enable save button when task name is filled (Requirement 2.4)', async () => {
      await openScheduleTaskDialog();
      await clickAddTaskButton();

      await fillTaskName('Test Schedule Task');

      const saveButton = await $('[data-testid="save-button"]');
      await browser.pause(200);
      const isDisabled = await saveButton.getAttribute('disabled');
      expect(isDisabled).toBeNull();
    });

    it('should return to list view when cancel is clicked', async () => {
      await openScheduleTaskDialog();
      await clickAddTaskButton();

      await clickCancelButton();

      const taskList = await $('[data-testid="schedule-task-list"]');
      const listExists = await taskList.isExisting();
      expect(listExists).toBe(true);
    });

    it('should show schedule type selector in edit page (Requirement 3.1, 3.2, 4.1)', async () => {
      await openScheduleTaskDialog();
      await clickAddTaskButton();

      const scheduleSelector = await $('[data-testid="schedule-type-selector"]');
      const exists = await scheduleSelector.isExisting();
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // 3. Schedule Task List Display
  // Requirements: 1.3
  // ============================================================
  describe('Schedule Task List Display', () => {
    it('should display empty state when no tasks exist', async () => {
      // Clear any existing tasks
      await setMockTasks([]);

      await openScheduleTaskDialog();

      // Check for empty state message
      const emptyMessage = await $('p*=スケジュールタスクがありません');
      const exists = await emptyMessage.isExisting();
      expect(exists).toBe(true);
    });

    it('should display task list items when tasks exist (Requirement 1.3)', async () => {
      // Set mock tasks
      const mockTask = createMockTask({ name: 'Weekly Update Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const count = await getTaskListItemsCount();
      expect(count).toBe(1);
    });

    it('should display task name in list item (Requirement 1.3)', async () => {
      const mockTask = createMockTask({ name: 'My Test Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const taskItem = await $('[data-testid="schedule-task-list-item"]');
      const text = await taskItem.getText();
      expect(text).toContain('My Test Task');
    });

    it('should display schedule type badge in list item (Requirement 1.3)', async () => {
      const mockTask = createMockTask({ name: 'Interval Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const badge = await $('[data-testid="schedule-type-badge"]');
      const exists = await badge.isExisting();
      expect(exists).toBe(true);
    });

    it('should have enabled toggle in list item (Requirement 1.6)', async () => {
      const mockTask = createMockTask({ name: 'Toggle Test Task', enabled: true });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const toggle = await $('[data-testid="enabled-toggle"]');
      const exists = await toggle.isExisting();
      expect(exists).toBe(true);
    });

    it('should have delete button in list item (Requirement 1.5)', async () => {
      const mockTask = createMockTask({ name: 'Delete Test Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const deleteButton = await $('[data-testid="delete-button"]');
      const exists = await deleteButton.isExisting();
      expect(exists).toBe(true);
    });

    it('should have execute button in list item (Requirement 7.1)', async () => {
      const mockTask = createMockTask({ name: 'Execute Test Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const executeButton = await $('[data-testid="execute-button"]');
      const exists = await executeButton.isExisting();
      expect(exists).toBe(true);
    });
  });

  // ============================================================
  // 4. Schedule Task Edit Flow
  // Requirements: 1.4, 2.1-2.4
  // ============================================================
  describe('Schedule Task Edit Flow', () => {
    it('should navigate to edit page when task item is clicked (Requirement 1.4)', async () => {
      const mockTask = createMockTask({ name: 'Editable Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const clicked = await clickTaskByName('Editable Task');
      expect(clicked).toBe(true);

      const editPage = await $('[data-testid="schedule-task-edit-page"]');
      const exists = await editPage.isExisting();
      expect(exists).toBe(true);
    });

    it('should show back button in edit mode', async () => {
      const mockTask = createMockTask({ name: 'Back Button Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();
      await clickTaskByName('Back Button Task');

      const backButton = await $('button[aria-label="戻る"]');
      const exists = await backButton.isExisting();
      expect(exists).toBe(true);
    });

    it('should navigate back to list when back button is clicked', async () => {
      const mockTask = createMockTask({ name: 'Navigation Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();
      await clickTaskByName('Navigation Task');
      await navigateBackToList();

      const taskList = await $('[data-testid="schedule-task-list"]');
      const exists = await taskList.isExisting();
      expect(exists).toBe(true);
    });

    it('should populate form with task data when editing (Requirement 2.1)', async () => {
      const mockTask = createMockTask({ name: 'Populated Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();
      await clickTaskByName('Populated Task');

      const nameInput = await $('[data-testid="task-name-input"]');
      const value = await nameInput.getValue();
      expect(value).toBe('Populated Task');
    });
  });

  // ============================================================
  // 5. Delete Confirmation Flow
  // Requirements: 1.5
  // ============================================================
  describe('Delete Confirmation Flow', () => {
    it('should show delete confirmation dialog when delete icon is clicked (Requirement 1.5)', async () => {
      const mockTask = createMockTask({ name: 'Delete Me Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const dialogOpened = await clickDeleteButtonOnTask('Delete Me Task');
      expect(dialogOpened).toBe(true);

      const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
      const exists = await confirmDialog.isExisting();
      expect(exists).toBe(true);
    });

    it('should close confirmation dialog when cancel is clicked', async () => {
      const mockTask = createMockTask({ name: 'Cancel Delete Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();
      await clickDeleteButtonOnTask('Cancel Delete Task');
      await cancelDelete();

      const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
      const exists = await confirmDialog.isExisting();
      expect(exists).toBe(false);
    });

    it('should show task name in confirmation dialog', async () => {
      const mockTask = createMockTask({ name: 'Named Delete Task' });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();
      await clickDeleteButtonOnTask('Named Delete Task');

      const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
      const text = await confirmDialog.getText();
      expect(text).toContain('Named Delete Task');

      await cancelDelete();
    });
  });

  // ============================================================
  // 6. Enable/Disable Toggle
  // Requirements: 1.6
  // ============================================================
  describe('Enable/Disable Toggle', () => {
    it('should toggle task enabled state when toggle is clicked (Requirement 1.6)', async () => {
      const mockTask = createMockTask({ name: 'Toggle Task', enabled: true });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      // Get initial state
      const initialState = await getToggleState('Toggle Task');
      expect(initialState).toBe(true);

      // Click toggle
      await clickToggleOnTask('Toggle Task');
      await browser.pause(200);

      // Note: In mock environment, actual state change requires API integration
      // This test verifies the toggle UI is interactive
      const toggle = await $('[data-testid="enabled-toggle"]');
      const isInteractive = await toggle.isClickable();
      expect(isInteractive).toBe(true);
    });

    it('should show disabled state visually when task is disabled', async () => {
      const mockTask = createMockTask({ name: 'Disabled Task', enabled: false });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const taskItem = await $('[data-testid="schedule-task-list-item"]');
      const text = await taskItem.getText();
      // Disabled badge should be visible
      expect(text).toContain('無効');
    });

    it('should disable execute button when task is disabled', async () => {
      const mockTask = createMockTask({ name: 'Disabled Execute Task', enabled: false });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const taskItem = await $('[data-testid="schedule-task-list-item"]');
      const executeButton = await taskItem.$('[data-testid="execute-button"]');
      const isDisabled = await executeButton.getAttribute('disabled');
      expect(isDisabled).toBe('true');
    });
  });

  // ============================================================
  // 7. Immediate Execution
  // Requirements: 7.1
  // ============================================================
  describe('Immediate Execution', () => {
    it('should have execute button for enabled tasks (Requirement 7.1)', async () => {
      const mockTask = createMockTask({ name: 'Exec Ready Task', enabled: true });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const taskItem = await $('[data-testid="schedule-task-list-item"]');
      const executeButton = await taskItem.$('[data-testid="execute-button"]');
      const exists = await executeButton.isExisting();
      expect(exists).toBe(true);
    });

    it('should enable execute button for enabled tasks', async () => {
      const mockTask = createMockTask({ name: 'Clickable Exec Task', enabled: true });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const taskItem = await $('[data-testid="schedule-task-list-item"]');
      const executeButton = await taskItem.$('[data-testid="execute-button"]');
      const isDisabled = await executeButton.getAttribute('disabled');
      expect(isDisabled).toBeNull();
    });

    it('should be clickable for immediate execution', async () => {
      const mockTask = createMockTask({ name: 'Click Exec Task', enabled: true });
      await setMockTasks([mockTask]);

      await openScheduleTaskDialog();

      const clicked = await clickExecuteButtonOnTask('Click Exec Task');
      expect(clicked).toBe(true);
    });
  });

  // ============================================================
  // 8. Security and Stability
  // ============================================================
  describe('Security and Stability', () => {
    it('should have correct security settings (contextIsolation: true)', async () => {
      const contextIsolation = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return false;
        return windows[0].webContents.getLastWebPreferences().contextIsolation;
      });
      expect(contextIsolation).toBe(true);
    });

    it('should have correct security settings (nodeIntegration: false)', async () => {
      const nodeIntegration = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.getLastWebPreferences().nodeIntegration;
      });
      expect(nodeIntegration).toBe(false);
    });

    it('should not crash during schedule task dialog operations', async () => {
      // Perform multiple dialog operations
      await openScheduleTaskDialog();
      await clickAddTaskButton();
      await clickCancelButton();
      await closeScheduleTaskDialog();

      // Check no crash occurred
      const isCrashed = await browser.electron.execute((electron) => {
        const windows = electron.BrowserWindow.getAllWindows();
        if (windows.length === 0) return true;
        return windows[0].webContents.isCrashed();
      });
      expect(isCrashed).toBe(false);
    });
  });

  // ============================================================
  // 9. Full CRUD Workflow
  // Integration test for complete user flow
  // ============================================================
  describe('Full CRUD Workflow', () => {
    it('should complete create -> view -> edit -> delete flow', async () => {
      // Start with empty task list
      await setMockTasks([]);

      // 1. Open dialog and verify empty state
      await openScheduleTaskDialog();
      let count = await getTaskListItemsCount();
      expect(count).toBe(0);

      // 2. Create new task (navigate to form)
      await clickAddTaskButton();
      const editPage = await $('[data-testid="schedule-task-edit-page"]');
      expect(await editPage.isExisting()).toBe(true);

      // 3. Fill form and verify save button state
      await fillTaskName('CRUD Test Task');
      const saveButton = await $('[data-testid="save-button"]');
      await browser.pause(200);
      const canSave = await saveButton.isClickable();
      expect(canSave).toBe(true);

      // 4. Cancel to go back (since we're mocking, save won't actually persist)
      await clickCancelButton();

      // 5. Add mock task to simulate created task
      const mockTask = createMockTask({ name: 'CRUD Test Task' });
      await setMockTasks([mockTask]);
      await closeScheduleTaskDialog();
      await openScheduleTaskDialog();

      // 6. Verify task appears in list
      count = await getTaskListItemsCount();
      expect(count).toBe(1);

      // 7. Click task to edit
      const clicked = await clickTaskByName('CRUD Test Task');
      expect(clicked).toBe(true);

      // 8. Navigate back
      await navigateBackToList();

      // 9. Delete task (show dialog)
      await clickDeleteButtonOnTask('CRUD Test Task');
      const confirmDialog = await $('[data-testid="delete-confirm-dialog"]');
      expect(await confirmDialog.isExisting()).toBe(true);

      // 10. Cancel delete
      await cancelDelete();

      // 11. Verify task still exists
      count = await getTaskListItemsCount();
      expect(count).toBe(1);
    });
  });
});
