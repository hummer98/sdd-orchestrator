# Response to Document Review #1

**Feature**: worktree-execution-ui
**Review Date**: 2026-01-17
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C-1: Remote UI対応の明記漏れ

**Issue**: tech.mdでは「requirements.md に『Remote UI対応: 要/不要』を記載」と規定されているが、本仕様には記載がない。Design Non-Goalsには「Remote UIへの対応（本仕様はElectron UI専用）」とあるが、requirements.mdへの明記が必要。

**Judgment**: **Fix Required** ✅

**Evidence**:
tech.md (176-193行) では「新規Spec作成時の確認事項」として以下を規定:
```
1. **Remote UIへの影響有無**
   - この機能はRemote UIからも利用可能にするか？
   - Desktop専用機能か？
...
3. **要件定義での明記**
   - `requirements.md` に「Remote UI対応: 要/不要」を記載
```

requirements.mdを確認したところ、確かにRemote UI対応についての記載がない。design.mdのNon-Goalsには記載があるが、tech.mdの規定に従いrequirements.mdにも明記すべき。

**Action Items**:
- requirements.mdの「Out of Scope」セクションに「Remote UI対応: 不要（Electron UI専用）」を追記

---

## Response to Warnings

### W-1: 「自動実行ボタン横のチェックボックス」のUI配置未定義

**Issue**: Requirements 4.1で「実装フロー枠内のチェックボックスと自動実行ボタン横のチェックボックスが連動」と記載されているが、「自動実行ボタン横のチェックボックス」の具体的なUI配置がDesignに未記載。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存コードを確認したところ、BugWorkflowViewには自動実行ボタン横にworktreeチェックボックスが存在する:
```typescript
// electron-sdd-manager/src/renderer/components/BugWorkflowView.tsx:276-281
<input
  type="checkbox"
  id="workflow-use-worktree"
  checked={useWorktree}
  onChange={(e) => setUseWorktree(e.target.checked)}
  data-testid="workflow-use-worktree-checkbox"
/>
```

しかし、本仕様の目的は「ImplFlowFrame内に統合されたチェックボックス」であり、Design DD-006で明確に記載されている:
> workflowStoreに単一のisWorktreeModeSelected状態を持ち、両方のチェックボックスがこれを参照・更新する

Requirements 4.1の「自動実行ボタン横のチェックボックス」は、既存のspec側WorkflowViewへの追加を意図しているのではなく、ImplFlowFrame内のチェックボックスが実質的に自動実行ボタンの近くに配置されることを指していると解釈できる。

ただし、将来的に明確化が必要であれば、Requirements 4.1を「ImplFlowFrameヘッダー内のチェックボックスが状態管理を通じてUI全体と連動する」に修正することを推奨する（本仕様の範囲では現状維持で問題なし）。

### W-2: workflowStoreの配置（shared vs renderer）

**Issue**: Designでは`workflowStore`に`isWorktreeModeSelected`を追加と記載。structure.mdによると、Domain StateはShared、UI StateはRendererに配置。Remote UI対応不要であればrenderer/stores、必要であればshared/storesが適切。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存コードを確認したところ、workflowStoreは`renderer/stores/workflowStore.ts`に配置されている:
```
electron-sdd-manager/src/renderer/stores/workflowStore.ts
```

Design 353行で明記されている通り、`isWorktreeModeSelected`は「UIの一時状態」であり、本仕様はElectron UI専用（C-1で対応）であるため、renderer/storesに配置するのが適切。既存のworkflowStoreを拡張するDesignは正しい。

### W-3: 通常モード開始時のブランチ名取得失敗時の処理

**Issue**: Requirements 9.1〜9.3で通常モード永続化を定義、Design Section 7でエラーカテゴリを記載。しかし「カレントブランチ名取得失敗」時の具体的な処理が未定義。

**Judgment**: **Fix Required** ✅

**Evidence**:
worktreeService.tsを確認したところ、`getCurrentBranch()`はResult型でエラーを返す設計になっている:
```typescript
// electron-sdd-manager/src/main/services/worktreeService.ts:132-134
async getCurrentBranch(): Promise<WorktreeServiceResult<string>> {
  return this.execGit('git branch --show-current');
}
```

エラー時の戻り値は`{ ok: false, error: string }`であり、呼び出し側でエラーハンドリングが必要。Design Section 7の「Error Categories and Responses」に「ブランチ名取得失敗」時の処理を追記すべき。

**Action Items**:
- design.mdのError Handling > System Errorsセクションに「カレントブランチ名取得失敗: `getCurrentBranch`のResult.errorを`notify.error()`で表示、処理中断」を追記

### W-4: Criterion 6.3（検査パネル従来表示）のテスト

**Issue**: Criterion 6.3「検査パネルは従来通りの表示であること」にテストによる検証が必要。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.mdを確認したところ、Requirements Traceability表に6.3は「変更なし」と記載されているが、Feature Implementationタスクが紐づいていない。

検査パネル（InspectionPanel）が変更されていないことを確認するテストを追加すべき。ただし、これは「何も変更しない」ことの確認であり、既存テストで十分なケースもある。

Task 9.1（統合テスト）に「InspectionPanelがworktreeモード時も従来通りの表示であることを確認」を追加することを推奨。

**Action Items**:
- tasks.mdのTask 9.1に「InspectionPanelが変更されていないことの確認（worktreeモード時も従来表示維持）」を追記
- またはRequirements Traceability表の6.3に対応タスク(9.1)を追記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-1 | 背景色の具体値 | No Fix Needed | 「実装委任」と明記されており、既存worktree情報表示のTailwindクラスを参照すればよい。Designへの追記は過剰 |
| I-2 | 判定関数テストケース詳細 | No Fix Needed | Task 1.1で「各関数のユニットテスト作成」と記載されており、実装時に境界値テストを含めれば十分 |
| I-3 | 「即座反映」の技術的根拠明記 | No Fix Needed | Design DD-006でZustand reactivityについて説明済み。追加補足は不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | Out of Scopeセクションに「Remote UI対応: 不要（Electron UI専用）」を追記 |
| design.md | Error Handling > System Errorsに「カレントブランチ名取得失敗」時の処理を追記 |
| tasks.md | Task 9.1に6.3検証テストを追記、またはRequirements Traceabilityの6.3にTask 9.1を追記 |

---

## Conclusion

6件の指摘事項のうち、3件が「Fix Required」、3件が「No Fix Needed」と判断した。

**Fix Requiredの修正内容**:
1. **C-1**: requirements.mdにRemote UI対応の明記
2. **W-3**: design.mdにブランチ名取得失敗時のエラー処理追記
3. **W-4**: tasks.mdに6.3検証テストの明記

**No Fix Neededの理由**:
1. **W-1**: Design DD-006で状態管理の連動が明確に設計されており、現状の記載で実装可能
2. **W-2**: workflowStoreはrenderer/storesに配置されており、UIの一時状態としてDesignは正しい

修正を適用後、仕様は実装可能な状態となる。

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Out of Scopeセクションに「Remote UI対応: 不要」を追記 |
| design.md | Error Handling > System Errorsに「カレントブランチ名取得失敗」時の処理を追記 |
| tasks.md | Task 9.1に6.3検証テストを追記、Requirements Traceabilityの6.3にTask 9.1を追記 |

### Details

#### requirements.md

**Issue(s) Addressed**: C-1

**Changes**:
- Out of Scopeセクションに「Remote UI対応: 不要（本仕様はElectron UI専用）」を追記

**Diff Summary**:
```diff
 ## Out of Scope

 - worktreeの自動削除・クリーンアップ機能
 - worktreeモードと通常モードの途中切り替え（実装開始後）
 - 複数worktreeの同時管理
 - worktreeパスのカスタマイズ
+- Remote UI対応: 不要（本仕様はElectron UI専用）
```

#### design.md

**Issue(s) Addressed**: W-3

**Changes**:
- Error Handling > System Errorsセクションに「カレントブランチ名取得失敗」時のエラー処理を追記

**Diff Summary**:
```diff
 **System Errors**
 - spec.json書き込み失敗: notify.error() + ロールバック
 - ファイル監視の遅延: 既存のspec.json監視機構に依存
+- カレントブランチ名取得失敗: `getCurrentBranch()`のResult.errorを`notify.error()`で表示し、処理を中断。ユーザーにはgit環境の確認を促す
```

#### tasks.md

**Issue(s) Addressed**: W-4

**Changes**:
- Task 9.1に「worktreeモード時もInspectionPanelが従来通りの表示であることを確認（6.3検証）」を追記
- Requirements Coverageテーブルの6.3にTask 9.1を追記

**Diff Summary**:
```diff
 - [ ] 9.1 WorkflowView統合テスト
   - ImplFlowFrame統合後のUI表示テスト
   - チェックボックス連動テスト
   - ロック状態テスト
+  - worktreeモード時もInspectionPanelが従来通りの表示であることを確認（6.3検証）
-  - _Requirements: 3.1, 4.1, 4.2, 5.1_
+  - _Requirements: 3.1, 4.1, 4.2, 5.1, 6.3_

-| 6.3 | 検査パネル従来表示 | - | Infrastructure (変更なし) |
+| 6.3 | 検査パネル従来表示 | 9.1 | Feature (テストで確認) |
```

---

_Fixes applied by document-review-reply command._

