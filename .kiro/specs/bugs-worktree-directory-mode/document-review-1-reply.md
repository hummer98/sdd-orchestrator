# Response to Document Review #1

**Feature**: bugs-worktree-directory-mode
**Review Date**: 2026-01-19
**Reply Date**: 2026-01-19

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 3      | 1            | 2             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

なし

---

## Response to Warnings

### W1: 部分失敗時のロールバック手順が未定義

**Issue**: bugWorktreeHandlers Implementation Notesにロールバック手順の具体的な追記が推奨されている

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存の`bugWorktreeHandlers.ts`には既にロールバック処理が実装されている：

```typescript
// electron-sdd-manager/src/main/ipc/bugWorktreeHandlers.ts:54-67
const updateResult = await bugService.addWorktreeField(bugPath, worktreeConfig);
if (!updateResult.ok) {
  // Rollback: remove the worktree we just created
  logger.warn('[bugWorktreeHandlers] Failed to update bug.json, rolling back worktree', {
    error: updateResult.error,
  });
  await worktreeService.removeBugWorktree(bugName).catch(() => {
    logger.error('[bugWorktreeHandlers] Rollback failed', { bugName });
  });
  return {
    ok: false,
    error: { type: 'GIT_ERROR', message: 'Failed to update bug.json' },
  };
}
```

Design文書のImplementation Notesに「Risks: コピー失敗時のロールバック処理」と記載があり、これは既存パターンの踏襲で対応される。新規実装（ディレクトリ方式）でも同様のパターンを適用すればよく、Design文書への追記は不要。

**Action Items**: なし

---

### W2: 大量Worktree時のパフォーマンス対策が未定義

**Issue**: worktreeHelpers実装ノートに「大量のWorktreeディレクトリ存在時のパフォーマンス」リスクが記載あり、具体的な対策は未定義

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存の`FileService.readSpecs`（fileService.ts:111-191）のWorktreeスキャン実装を確認：

```typescript
// fileService.ts:147-179
const worktreeSpecsBasePath = join(projectPath, '.kiro', 'worktrees', 'specs');
try {
  await access(worktreeSpecsBasePath);
  const worktreeDirs = await readdir(worktreeSpecsBasePath, { withFileTypes: true });

  for (const worktreeDir of worktreeDirs) {
    if (!worktreeDir.isDirectory()) continue;
    // ... spec.json存在確認のみ
  }
}
```

現在のスキャンロジックは：
1. `readdir`でディレクトリ一覧を取得（非同期、効率的）
2. 各ディレクトリで`access`による存在確認のみ（ファイル内容読み込みなし）
3. ファイルシステムI/Oを最小限に抑えた設計

実運用では1プロジェクトあたり数十〜百程度のWorktreeが上限。キャッシュやページング対応は過剰な最適化（YAGNI違反）。

**Action Items**: なし

---

### W3: 手動マイグレーション手順のドキュメント化が未計画

**Issue**: 旧フラグ方式からの手動マイグレーション手順の提供は計画に含まれていない

**Judgment**: **Fix Required** ✅

**Evidence**:
DD-005で「自動マイグレーションを提供せず、旧フラグ方式を完全に削除する」と決定しており、影響を受けるユーザーへの移行ガイダンスは必要。

ただし、これは「実装完了後」の作業として適切であり、Design/Tasks文書への追記ではなくOut of Scopeまたはtasks.mdの最終タスクとして扱うのが妥当。

**Action Items**:

- tasks.mdにマイグレーション手順ドキュメント作成タスクを追加
- 内容: 旧フラグ方式使用中のユーザー向け移行手順（Worktree再作成の手順）

---

## Response to Info (Low Priority)

| #   | Issue                        | Judgment      | Reason                                                                 |
| --- | ---------------------------- | ------------- | ---------------------------------------------------------------------- |
| S1  | worktreeHelpersの配置先を明記  | No Fix Needed | 既存パターン（`src/main/utils/`）に従う。Design文書への明記は不要 |
| S2  | 新規ヘルパー関数のログ出力レベル | No Fix Needed | 既存のlogger使用パターン（info/warn/error）に従う。明示的な定義不要 |

---

## Files to Modify

| File      | Changes                                                |
| --------- | ------------------------------------------------------ |
| tasks.md  | タスク9.xの後にマイグレーション手順ドキュメント作成タスクを追加 |

---

## Conclusion

3件のWarningのうち、W1とW2は既存実装の確認により「問題なし」と判断。W3のみ対応が必要で、tasks.mdにマイグレーション手順ドキュメント作成タスクを追加する。

全体として、仕様書の品質は高く、実装に向けて大きな問題はない。

---

## Applied Fixes

**Applied Date**: 2026-01-19
**Applied By**: --autofix

### Summary

| File     | Changes Applied                              |
| -------- | -------------------------------------------- |
| tasks.md | Task 10.1（マイグレーション手順ドキュメント作成）を追加 |

### Details

#### tasks.md

**Issue(s) Addressed**: W3

**Changes**:
- Task 10セクション「ドキュメント」を追加
- Task 10.1としてマイグレーション手順ドキュメント作成タスクを追加

**Diff Summary**:
```diff
 - [ ] 9.4 Bug-mergeフロー統合テスト
   - Worktreeディレクトリ削除、ブランチ削除の確認
   - worktreeフィールドクリーンアップの確認
   - _Requirements: 7.1, 7.2, 7.3_

+### 10. ドキュメント
+
+- [ ] 10.1 マイグレーション手順ドキュメント作成
+  - 旧フラグ方式使用ユーザー向けの移行ガイダンス
+  - Worktree再作成の具体的な手順を記載
+  - リリースノートまたはREADMEへの追記
+  - _Note: 実装完了後に作成_

 ---
```

---

_Fixes applied by document-review-reply command._
