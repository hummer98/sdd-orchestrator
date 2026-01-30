# Bug Analysis: schedule-task-prompt-editor-missing

## Summary
スケジュールタスク作成ダイアログで「作成」ボタンを押すとバリデーションエラー（`prompts.0.content: String must contain at least 1 character(s)`）が発生する。原因は、PromptListEditorコンポーネントがScheduleTaskEditPageに統合されておらず、ユーザーがプロンプト内容を編集できないこと。

## Root Cause

### Technical Details
- **Location**:
  - `electron-sdd-manager/src/shared/components/schedule/ScheduleTaskEditPage.tsx:108`
  - `electron-sdd-manager/src/shared/components/schedule/ScheduleTaskEditPage.tsx:285-289`
- **Component**: ScheduleTaskEditPage
- **Trigger**:
  1. 新規タスク作成時、デフォルトで空プロンプト `prompts: [{ order: 0, content: '' }]` が生成される（108行目）
  2. PromptListEditorが未統合のため、プレースホルダーテキストが表示されるだけでプロンプトを編集できない（285-289行目）
  3. 保存時、Zodスキーマ `PromptSchema = z.object({ content: z.string().min(1) })` が空文字を拒否（scheduleTask.ts:179行目）

**根本原因**: PromptListEditorコンポーネントが実装済みだが、ScheduleTaskEditPageに統合されていない（Task 6.3未完了）

## Impact Assessment
- **Severity**: High
- **Scope**: スケジュールタスクの新規作成機能が完全に使用不可
- **Risk**: 既存タスクの編集も、プロンプトフィールドを変更しない限りは可能だが、プロンプト編集が必要な場合は同様にブロックされる

## Related Code

**ScheduleTaskEditPage.tsx (問題箇所1: 空プロンプトのデフォルト生成)**
```typescript
// Line 108
prompts: [{ order: 0, content: '' }],
```

**ScheduleTaskEditPage.tsx (問題箇所2: PromptListEditor未統合)**
```typescript
// Lines 285-289
<div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
    プロンプト、回避ルール等はTask 6.3-6.4で実装予定
  </p>
</div>
```

**scheduleTask.ts (バリデーション定義)**
```typescript
// Line 179
export const PromptSchema = z.object({
  order: z.number().int().min(0),
  content: z.string().min(1),  // 空文字を拒否
});
```

**PromptListEditor.tsx (実装済みだが未使用)**
```typescript
// PromptListEditorコンポーネントは完全に実装されているが、
// ScheduleTaskEditPageから参照されていない
export function PromptListEditor({
  prompts,
  onChange,
  disabled = false,
}: PromptListEditorProps) { ... }
```

## Proposed Solution

### Recommended Approach: PromptListEditorを統合（アーキテクチャ上正しい）

**実装内容**:
1. ScheduleTaskEditPageにPromptListEditorをimport
2. FormStateに `prompts` フィールドを追加
3. プレースホルダー（285-289行目）をPromptListEditorコンポーネントに置換
4. `handleSave` でフォームのpromptsを使用（現在はtask.promptsまたはデフォルト値を使用）
5. プロンプトのバリデーション追加（空プロンプトがある場合はエラー表示）

**技術的正しさ**:
- DRY: PromptListEditorは既に実装済み。再実装は不要
- SSOT: promptsはFormStateで管理し、保存時にのみScheduleTaskInputに変換
- Cohesion: プロンプト編集UIとロジックはPromptListEditorに集約済み

**Pros**:
- 既存の実装を活用（コード重複なし）
- Task 6.3の元々の設計意図に沿う
- テスト済みのPromptListEditorを使用

**Cons**:
- なし（本来実装されるべき機能を完成させるだけ）

### Alternative (却下): デフォルトプロンプトに仮の値を設定

空文字の代わりに「プロンプトを編集してください」などのプレースホルダーテキストをデフォルト値として設定する案。

**却下理由**: ユーザーが不要なプレースホルダーテキストを削除する手間が発生し、UIとしても不適切。根本的な解決ではない。

## Dependencies
- **Modified Files**:
  - `electron-sdd-manager/src/shared/components/schedule/ScheduleTaskEditPage.tsx`
  - `electron-sdd-manager/src/shared/components/schedule/ScheduleTaskEditPage.test.tsx` (テストの更新が必要になる可能性)

- **No Changes Required**:
  - PromptListEditor.tsx（既に完成）
  - scheduleTask.ts（バリデーションは正しい）

## Testing Strategy
- **Unit Test**:
  - ScheduleTaskEditPageでpromptsの初期値が正しく設定されることを確認
  - PromptListEditorでpromptsが変更されたときにFormStateが更新されることを確認
  - 空プロンプトがある場合に保存ボタンが無効化されることを確認
- **E2E Test**:
  - スケジュールタスク作成画面を開く
  - プロンプトを入力
  - タスクを保存
  - 保存されたタスクにプロンプトが含まれていることを確認
