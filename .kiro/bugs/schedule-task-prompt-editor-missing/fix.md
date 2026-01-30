# Bug Fix: schedule-task-prompt-editor-missing

## Summary
PromptListEditorコンポーネントをScheduleTaskEditPageに統合し、スケジュールタスク作成時のバリデーションエラーを解決しました。

## Changes Made

### Files Modified
| File | Change Description |
|------|-------------------|
| electron-sdd-manager/src/shared/components/schedule/ScheduleTaskEditPage.tsx | PromptListEditorコンポーネントの統合、プロンプト編集機能の追加、バリデーションロジックの実装 |

### Code Changes

**1. Importの追加 (28-44行目)**
```diff
 import { Button } from '../ui/Button';
 import { ScheduleTypeSelector } from './ScheduleTypeSelector';
 import { WorkflowModeEditor } from './WorkflowModeEditor';
 import { AgentBehaviorEditor } from './AgentBehaviorEditor';
+import { PromptListEditor } from './PromptListEditor';
 import type {
   ScheduleTask,
   ScheduleTaskInput,
   ScheduleWorkflowConfig,
   ScheduleCondition,
   AgentBehavior,
+  Prompt,
 } from '../../types/scheduleTask';
```

**2. FormStateとFormErrorsの型定義を拡張 (63-72行目)**
```diff
 interface FormState {
   name: string;
   schedule: ScheduleCondition;
   workflow: ScheduleWorkflowConfig;
   behavior: AgentBehavior;
+  prompts: Prompt[];
 }

 interface FormErrors {
   name?: string;
+  prompts?: string;
 }
```

**3. FormStateの初期化にpromptsを追加 (128-134, 142-150行目)**
```diff
 const [formState, setFormState] = useState<FormState>({
   name: task?.name ?? '',
   schedule: task?.schedule ?? DEFAULT_SCHEDULE,
   workflow: task?.workflow ?? DEFAULT_WORKFLOW_CONFIG,
   behavior: task?.behavior ?? DEFAULT_AGENT_BEHAVIOR,
+  prompts: task?.prompts ?? [{ order: 0, content: '' }],
 });
```

**4. プロンプトのバリデーション追加 (154-170行目)**
```diff
 const validateForm = useCallback((): boolean => {
   const errors: FormErrors = {};

   if (!formState.name.trim()) {
     errors.name = 'タスク名を入力してください';
   }

+  // Validate prompts (at least one non-empty prompt required)
+  const hasValidPrompt = formState.prompts.some((p) => p.content.trim().length > 0);
+  if (!hasValidPrompt) {
+    errors.prompts = '少なくとも1つのプロンプトを入力してください';
+  }

   setFormErrors(errors);
   return Object.keys(errors).length === 0;
-}, [formState.name]);
+}, [formState.name, formState.prompts]);
```

**5. プロンプト変更ハンドラの追加 (195-203行目)**
```diff
 const handleBehaviorChange = useCallback((behavior: AgentBehavior) => {
   setFormState((prev) => ({ ...prev, behavior }));
 }, []);

+// Handle prompts change
+const handlePromptsChange = useCallback((prompts: Prompt[]) => {
+  setFormState((prev) => ({ ...prev, prompts }));
+  // Clear error when user edits prompts
+  if (formErrors.prompts) {
+    setFormErrors((prev) => ({ ...prev, prompts: undefined }));
+  }
+}, [formErrors.prompts]);
```

**6. 保存処理でプロンプトを使用するように修正 (205-234行目)**
```diff
 const handleSave = useCallback(() => {
   if (!validateForm()) return;

+  // Filter out empty prompts before saving
+  const validPrompts = formState.prompts.filter((p) => p.content.trim().length > 0);

   if (isNew) {
-    // Create new task with default values
-    const newTask = createDefaultTaskInput(
-      formState.name.trim(),
-      formState.schedule,
-      formState.workflow,
-      formState.behavior
-    );
+    // Create new task
+    const newTask: ScheduleTaskInput = {
+      name: formState.name.trim(),
+      enabled: true,
+      schedule: formState.schedule,
+      prompts: validPrompts,
+      avoidance: { targets: [], behavior: 'skip' },
+      workflow: formState.workflow,
+      behavior: formState.behavior,
+    };
     onSave(newTask);
   } else if (task) {
     // Update existing task
     const updatedTask: ScheduleTaskInput = {
       name: formState.name.trim(),
       enabled: task.enabled,
       schedule: formState.schedule,
-      prompts: [...task.prompts],
+      prompts: validPrompts,
       avoidance: task.avoidance,
       workflow: formState.workflow,
       behavior: formState.behavior,
     };
     onSave(updatedTask);
   }
-}, [validateForm, isNew, task, formState.name, formState.schedule, formState.workflow, formState.behavior, onSave]);
+}, [validateForm, isNew, task, formState, onSave]);
```

**7. フォームのバリデーション条件を更新 (236-238行目)**
```diff
-const isFormValid = formState.name.trim().length > 0;
+const hasValidPrompt = formState.prompts.some((p) => p.content.trim().length > 0);
+const isFormValid = formState.name.trim().length > 0 && hasValidPrompt;
```

**8. UIにPromptListEditorを統合 (285-306行目)**
```diff
 <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
   <ScheduleTypeSelector
     value={formState.schedule}
     onChange={handleScheduleChange}
     disabled={isSaving}
   />
 </div>

-{/* Placeholder for future form fields (Tasks 6.3-6.4) */}
-<div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
-  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
-    プロンプト、回避ルール等はTask 6.3-6.4で実装予定
-  </p>
-</div>
+{/* Prompt List Editor (Task 6.3) */}
+<div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
+  <PromptListEditor
+    prompts={formState.prompts}
+    onChange={handlePromptsChange}
+    disabled={isSaving}
+  />
+  {formErrors.prompts && (
+    <p
+      data-testid="prompts-error"
+      className="mt-2 text-sm text-red-500"
+    >
+      {formErrors.prompts}
+    </p>
+  )}
+</div>
+
+{/* Placeholder for avoidance rules (Task 6.4) */}
+<div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
+  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
+    回避ルール設定はTask 6.4で実装予定
+  </p>
+</div>
```

**9. 不要な関数の削除**
```diff
-/**
- * Create default schedule task input for new tasks
- */
-function createDefaultTaskInput(
-  name: string,
-  schedule: ScheduleCondition,
-  workflow: ScheduleWorkflowConfig,
-  behavior: AgentBehavior
-): ScheduleTaskInput {
-  return {
-    name,
-    enabled: true,
-    schedule,
-    prompts: [{ order: 0, content: '' }],
-    avoidance: { targets: [], behavior: 'skip' },
-    workflow,
-    behavior,
-  };
-}
```

## Implementation Notes

### 実装方針
- 既存の`PromptListEditor`コンポーネントを活用（DRY原則に従う）
- FormStateでpromptsを管理し、保存時にScheduleTaskInputに変換（SSOT原則に従う）
- 空プロンプトのバリデーションを追加し、少なくとも1つの有効なプロンプトを必須とする
- 保存時に空プロンプトを除外する処理を追加

### 設計判断
1. **Task 6.3の完了**: 本来実装されるべき機能を完成させる
2. **プレースホルダーの削除**: 「Task 6.3-6.4で実装予定」のプレースホルダーをPromptListEditorに置き換え
3. **バリデーションの追加**: Zodスキーマの要件（content.min(1)）に合わせたフロントエンドバリデーション

### 技術的詳細
- PromptListEditorはすでに実装済みのため、統合のみで動作する
- 空プロンプトは保存時に自動的にフィルタリングされる
- バリデーションエラーは即座にUI上で表示される

## Breaking Changes
- [x] No breaking changes
- [ ] Breaking changes (documented below)

## Rollback Plan
Git revertで以下のコミットを取り消す：
```bash
git revert <commit-hash>
```

## Related Commits
- 4df9cb9 fix: PromptListEditorをScheduleTaskEditPageに統合してバリデーションエラーを解決
