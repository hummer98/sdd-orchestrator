# [Open] スケジュールタスク作成でプロンプト入力ができない問題

> **Status:** Open
> **Root Cause:** `PromptListEditor`コンポーネントが`ScheduleTaskEditPage`に統合されていない
> **Impact:** スケジュールタスクの新規作成が不可能（バリデーションエラー）

## 発見日
2026-01-30

## 概要
スケジュールタスク作成ダイアログで「作成」ボタンを押すと、以下のバリデーションエラーが発生する：

```
prompts.0.content: String must contain at least 1 character(s)
```

プロンプト入力UIが存在しないため、ユーザーがプロンプトを入力する手段がなく、空文字列のプロンプトがバリデーションに違反している。

## 症状
- スケジュールタスク作成ダイアログにプロンプト入力フィールドが存在しない
- 「プロンプト、回避ルール等はTask 6.3-6.4で実装予定」というプレースホルダーが表示される
- 「作成」ボタンを押すと必ずバリデーションエラーが発生
- タスクの新規作成が完全に不可能

## 根本原因

### タスク定義の粒度問題

**Spec:** `schedule-task-execution`
**Task:** 6.3 "PromptListEditorを作成"

tasks.md 131-135行目:
```markdown
- [x] 6.3 (P) PromptListEditorを作成
  - 複数プロンプトの登録UI
  - プロンプトの追加・編集・削除
  - 順序変更（ドラッグ&ドロップまたは上下ボタン）
  - _Requirements: 5.1, 5.2, 5.3_
```

**タスクの完了判定が不適切:**
- タスク6.3は「PromptListEditorを**作成**」と定義されていた
- 実装者は`PromptListEditor.tsx`の作成をもって完了とマークした
- しかし、実際には「作成」と「`ScheduleTaskEditPage`への**統合**」は別の作業
- 統合作業が暗黙的にタスク6.3に含まれると想定されていたが、明示されていなかった

### 実装状況

| コンポーネント | 状態 | 詳細 |
|--------------|------|-----|
| PromptListEditor.tsx | ✅ 実装済み | 307行のコンポーネント、テストも完備 |
| PromptListEditor.test.tsx | ✅ 実装済み | 460行のテストファイル |
| ScheduleTaskEditPage.tsx | ❌ 統合漏れ | プレースホルダーのみ（285-289行目） |

### 問題の詳細

`ScheduleTaskEditPage.tsx:285-289`:
```tsx
{/* Placeholder for future form fields (Tasks 6.3-6.4) */}
<div className="p-4 rounded-md bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600">
  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
    プロンプト、回避ルール等はTask 6.3-6.4で実装予定
  </p>
</div>
```

`ScheduleTaskEditPage.tsx:108` (デフォルト値):
```typescript
prompts: [{ order: 0, content: '' }],  // 空のプロンプト
```

バリデーションスキーマ (`scheduleTask.ts:179`):
```typescript
export const PromptSchema = z.object({
  order: z.number().int().min(0),
  content: z.string().min(1),  // ← 最低1文字必要
});
```

**結果:**
1. UIにプロンプト入力フィールドがない
2. デフォルトで空文字列 `''` のプロンプトが設定される
3. 「作成」ボタンを押すとバリデーションエラー

## なぜInspectionで検出されなかったか

`inspection-1.md` 23行目:
```
| 5.1-5.5 | PASS | - | 複数プロンプト管理、順序変更UI実装済み |
```

**Inspectionの検証範囲:**
- ✅ `PromptListEditor.tsx`ファイルの存在確認
- ✅ ユニットテストの存在確認
- ❌ 実際の統合状況（import、使用箇所）は未検証
- ❌ プレースホルダーコメント（"実装予定"）の検出漏れ

**検出できなかった理由:**
- Inspectionはファイルの存在とテストの実行結果を確認したが、実際にコンポーネントがどこで使用されているかまで検証しなかった
- `ScheduleTaskEditPage`のプレースホルダーコメントを見逃した
- E2Eテストがプロンプト必須のフローをカバーしていなかった

## 影響範囲

### 機能への影響
- **Critical:** スケジュールタスクの新規作成が完全に不可能
- 既存タスクの編集は可能（prompts配列が既に存在するため）
- タスク実行、一覧表示などの他機能は影響なし

### ユーザー体験
- ユーザーはダイアログを開いてもプロンプトを入力できない
- エラーメッセージが技術的すぎる（Zodバリデーションエラー）
- 機能が未完成であることが明確にわからない

## 根本原因の分析

### 1. タスク粒度の定義不足

**問題:**
- "PromptListEditorを作成" は曖昧
- コンポーネント作成と親コンポーネントへの統合を区別していない

**本来あるべき定義:**
```markdown
- [ ] 6.3a (P) PromptListEditorコンポーネントを実装
  - 複数プロンプトの登録UI
  - プロンプトの追加・編集・削除
  - 順序変更（上下ボタン）

- [ ] 6.3b (P) ScheduleTaskEditPageにPromptListEditorを統合
  - プレースホルダーを削除
  - PromptListEditorをimport・配置
  - formStateとの連携
```

### 2. Inspectionの検証不足

**現状の検証:**
```
ファイル存在 → テスト実行 → PASS
```

**必要な検証:**
```
ファイル存在 → import確認 → 使用箇所確認 → プレースホルダー検出 → PASS
```

### 3. E2Eテストのカバレッジ不足

**現状のE2Eテスト:**
- タスク一覧表示
- タスク削除
- 有効/無効トグル

**カバーしていないフロー:**
- タスク新規作成（プロンプト必須）
- プロンプト編集
- バリデーションエラーのハンドリング

## 修正方針

### 即座の修正
1. `PromptListEditor`を`ScheduleTaskEditPage`に統合
2. プレースホルダーを削除
3. `formState.prompts`の管理を追加
4. 新規作成時のデフォルトプロンプトを適切に設定

### 長期的な改善

#### 1. タスク定義の改善
- コンポーネント作成と統合を明示的に分離
- "作成"、"統合"、"配線"などの用語を明確化
- チェックリストに統合確認項目を追加

#### 2. Inspectionの強化
```markdown
## 新規コンポーネント統合確認

| Component | File Exists | Imported By | Used In JSX | No Placeholder |
|-----------|-------------|-------------|-------------|----------------|
| PromptListEditor | ✅ | ❌ | ❌ | ❌ |
```

**検出すべき項目:**
- 新規コンポーネントがどこからもimportされていない
- プレースホルダーコメント（"TODO", "実装予定", "Task X.X"）の残存
- 未使用のexport

#### 3. E2Eテストの拡充
```typescript
describe('Schedule Task Creation', () => {
  it('should require at least one prompt', async () => {
    // タスク作成ダイアログを開く
    // プロンプトを空で保存
    // バリデーションエラーを確認
  });

  it('should allow creating task with prompt', async () => {
    // タスク作成ダイアログを開く
    // プロンプトを入力
    // 保存成功を確認
  });
});
```

## 再発防止策

### プロセス改善

1. **タスク完了の定義を明確化**
   - [ ] コード実装
   - [ ] ユニットテスト
   - [ ] 統合（親コンポーネントへの組み込み）
   - [ ] E2Eテスト
   - [ ] プレースホルダー削除

2. **Inspectionチェックリストに追加**
   ```markdown
   - [ ] 新規コンポーネントが実際に使用されているか
   - [ ] プレースホルダーコメントが残存していないか
   - [ ] 関連する親コンポーネントが完成しているか
   ```

3. **E2Eテストの必須カバレッジ**
   - CRUD操作の完全なフロー
   - バリデーションエラーのハンドリング
   - 必須項目の入力漏れ検出

### ツール改善

1. **静的解析の追加**
   - 未使用exportの検出
   - プレースホルダーコメントの検出
   - import/使用の一貫性チェック

2. **Inspection自動化**
   - コンポーネント使用グラフの生成
   - 孤立コンポーネントの検出
   - プレースホルダーパターンマッチング

## 参考情報

### 関連ファイル
- `electron-sdd-manager/src/shared/components/schedule/ScheduleTaskEditPage.tsx`
- `electron-sdd-manager/src/shared/components/schedule/PromptListEditor.tsx`
- `electron-sdd-manager/src/shared/types/scheduleTask.ts`
- `.kiro/specs/schedule-task-execution/tasks.md`
- `.kiro/specs/schedule-task-execution/inspection-1.md`

### 関連Spec
- Feature: `schedule-task-execution`
- Phase: `deploy-complete`
- Commit: `298779e` (feat(schedule-task-execution): スケジュールタスク実行機能を追加)

### タイムライン
- 2026-01-24: schedule-task-execution機能実装開始
- 2026-01-24 21:54: Inspection実施、GO判定
- 2026-01-25 06:40: masterにマージ、deploy-complete
- 2026-01-30: ユーザーからバグ報告、問題発見

## 次のアクション

- [ ] `PromptListEditor`を`ScheduleTaskEditPage`に統合
- [ ] E2Eテストに新規作成フローを追加
- [ ] Inspectionチェックリストを更新
- [ ] プロセスドキュメントに再発防止策を反映
