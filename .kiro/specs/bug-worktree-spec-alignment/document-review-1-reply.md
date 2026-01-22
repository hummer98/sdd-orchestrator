# Response to Document Review #1

**Feature**: bug-worktree-spec-alignment
**Review Date**: 2026-01-22
**Reply Date**: 2026-01-22

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 3            | 0             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Warnings

### W-001: ロギング仕様の不足

**Issue**: Design/Tasksにログ出力の詳細仕様なし

**Judgment**: **Fix Required** ✅

**Evidence**:
既存の`ConvertWorktreeService`を確認した結果、以下のログ出力パターンが確認された：

```typescript
// convertWorktreeService.ts:144
logger.debug('[ConvertWorktreeService] getSpecStatus called', { specPath });

// convertWorktreeService.ts:309
logger.info('[ConvertWorktreeService] Spec can be converted', { specPath, status: statusResult.value });

// convertWorktreeService.ts:338-342
logger.info('[ConvertWorktreeService] convertToWorktree started', {
  projectPath,
  specPath,
  featureName,
});

// convertWorktreeService.ts:366-369
logger.error('[ConvertWorktreeService] Failed to create worktree', {
  featureName,
  error: createResult.error,
});
```

`ConvertBugWorktreeService`でも同様のログ出力パターンを踏襲すべきであり、Design文書にログ出力ポイントを明記することで実装の一貫性を保証する必要がある。

**Action Items**:
- design.mdの「Error Handling」セクション内「Monitoring」に具体的なログ出力ポイントを追記

---

### W-002: Integration Testsの具体計画なし

**Issue**: Integration Testの具体的なテストケースがTasksに定義されていない

**Judgment**: **Fix Required** ✅

**Evidence**:
現在のtasks.mdではTask 4.1、4.2でユニットテストのみを定義している。Design文書の「Testing Strategy」セクションにはIntegration Testの記載があるが、tasks.mdには対応するタスクがない。

Design文書（design.md:385-390）より：
```markdown
### Integration Tests
- untracked Bugの変換フロー（コピー→削除→シンボリックリンク→bug.json更新）
- committed-clean Bugの変換フロー（スキップ→検証→シンボリックリンク→bug.json更新）
- committed-dirty Bugのエラー処理
- 各種エラー時のロールバック動作
```

これらのIntegration Testケースを具体的なタスクとしてtasks.mdに追加する必要がある。

**Action Items**:
- tasks.mdに「5. Integration Testsの実装」セクションを追加
- 具体的なテストシナリオをタスクとして定義

---

### W-003: copyBugToWorktreeの非推奨化確認

**Issue**: `bugService.copyBugToWorktree`が非推奨化されるが、他の呼び出し元の確認が必要

**Judgment**: **Fix Required** ✅

**Evidence**:
`copyBugToWorktree`の呼び出し元をGrepで確認した結果：

```
electron-sdd-manager/src/main/ipc/bugWorktreeHandlers.ts:61:
  const copyResult = await bugService.copyBugToWorktree(bugPath, worktreeBugPath.absolute, bugName);
```

**呼び出し元は`bugWorktreeHandlers.ts`のみ**である。このハンドラは今回の変更で`ConvertBugWorktreeService.convertToWorktree`に置き換えられるため、`copyBugToWorktree`を直接使用している箇所は新実装でカバーされる。

ただし、実装時に他の呼び出し元がないことを再確認するタスクを追加することで、将来的な変更に対するセーフティネットとする。

**Action Items**:
- tasks.mdの3.1の前提として、copyBugToWorktreeの呼び出し元確認タスクを追加
- 確認の結果をタスク完了時に記録

---

## Response to Info (Low Priority)

| #    | Issue                                   | Judgment      | Reason                                                |
| ---- | --------------------------------------- | ------------- | ----------------------------------------------------- |
| S-001 | シンボリックリンク失敗時のリカバリ     | No Fix Needed | Requirements 5.4で「部分的セットアップ済み」と明記、リカバリ手順は運用ドキュメントの範囲 |
| S-002 | committed-dirtyのファイルリスト表示    | No Fix Needed | ConvertError型にfiles配列が既に定義済み（design.md:233） |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| design.md | Monitoringセクションに具体的なログ出力ポイントを追記 |
| tasks.md | Integration Testタスク（5.1）を追加、3.1の前提タスクとしてcopyBugToWorktree呼び出し元確認を追加 |

---

## Conclusion

3件のWarningすべてに対して「Fix Required」と判断した。いずれもドキュメントの補完であり、技術的な設計変更は不要。

- W-001: ログ出力仕様の明記（既存実装パターンを踏襲）
- W-002: Integration Testタスクの追加（Design文書との整合性確保）
- W-003: 呼び出し元確認タスクの追加（安全性確保）

Info（S-001、S-002）については、現状の設計で十分カバーされているため修正不要と判断。

**次のステップ**: `--autofix`フラグにより、上記の修正を自動適用後、新しいレビューラウンドで修正内容を検証。

---

## Applied Fixes

**Applied Date**: 2026-01-22
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | Monitoringセクションにログ出力ポイント表を追加 |
| tasks.md | Task 3.0（copyBugToWorktree呼び出し元確認）を追加 |
| tasks.md | Task 5.1（Integration Test）を追加 |

### Details

#### design.md

**Issue(s) Addressed**: W-001

**Changes**:
- 「Error Handling」→「Monitoring」セクションにログ出力ポイントの詳細テーブルを追加
- `ConvertWorktreeService`の既存ログパターンを参照し、一貫した出力形式を定義

**Diff Summary**:
```diff
 ### Monitoring

 - `logger.error`でエラー詳細をログ出力
 - エラー型により適切なユーザーメッセージを生成（`getConvertBugErrorMessage`関数）
+
+**ログ出力ポイント（ConvertBugWorktreeService）**:
+
+| メソッド | レベル | タイミング | 出力内容 |
+|----------|--------|-----------|----------|
+| getBugStatus | debug | 開始時 | `[ConvertBugWorktreeService] getBugStatus called`, bugPath |
+| getBugStatus | debug | 終了時 | `[ConvertBugWorktreeService] Bug status: {status}`, bugPath |
+| canConvert | debug | 開始時 | `[ConvertBugWorktreeService] canConvert called`, projectPath, bugPath |
+| canConvert | warn | エラー時 | `[ConvertBugWorktreeService] {エラー理由}`, 詳細情報 |
+| canConvert | info | 成功時 | `[ConvertBugWorktreeService] Bug can be converted`, bugPath, status |
+| convertToWorktree | info | 開始時 | `[ConvertBugWorktreeService] convertToWorktree started`, projectPath, bugPath, bugName |
+| convertToWorktree | info | ステップ完了時 | `[ConvertBugWorktreeService] {ステップ名} completed`, 詳細情報 |
+| convertToWorktree | error | エラー時 | `[ConvertBugWorktreeService] Failed to {操作}`, error詳細 |
+| convertToWorktree | warn | ロールバック時 | `[ConvertBugWorktreeService] Rolling back worktree`, bugName |
+| convertToWorktree | info | 成功時 | `[ConvertBugWorktreeService] Conversion completed successfully`, bugName, worktreePath |
+
+※既存の`ConvertWorktreeService`のログ出力パターンを踏襲
```

#### tasks.md

**Issue(s) Addressed**: W-002, W-003

**Changes**:
- Task 3.0を追加: copyBugToWorktreeの呼び出し元確認（前提タスク）
- Task 5.1を追加: Integration Testの実装

**Diff Summary (Task 3.0)**:
```diff
 - [ ] 3. IPCハンドラの統合
+- [ ] 3.0 (P) copyBugToWorktreeの呼び出し元を確認する
+  - `grep -r "copyBugToWorktree" --include="*.ts"`で呼び出し元を検索
+  - bugWorktreeHandlers.ts以外の呼び出し元がないことを確認
+  - 確認結果を記録（他の呼び出し元があれば対応方針を検討）
+  - _Requirements: 2.1, 2.2_
+  - _Verify: No other callers found outside bugWorktreeHandlers.ts_
+
 - [ ] 3.1 bugWorktreeHandlersをConvertBugWorktreeServiceに置き換える
```

**Diff Summary (Task 5.1)**:
```diff
 - [ ] 4.2 (P) WorktreeService.checkUncommittedBugChangesのユニットテストを作成する
   ...
   - _Requirements: 1.1_

+- [ ] 5. Integration Testsの実装
+- [ ] 5.1 (P) Bug worktree変換のIntegration Testを作成する
+  - untracked Bugの変換フロー（コピー→削除→シンボリックリンク→bug.json更新）
+  - committed-clean Bugの変換フロー（スキップ→検証→シンボリックリンク→bug.json更新）
+  - committed-dirty Bugのエラー処理（エラーメッセージにファイルリスト含む）
+  - 各種エラー時のロールバック動作（worktree削除、ブランチ削除）
+  - _Requirements: 1.1-1.4, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4_
+
 ---
```

---

_Fixes applied by document-review-reply command._
