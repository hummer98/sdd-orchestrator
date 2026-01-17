# Response to Document Review #1

**Feature**: execute-method-unification
**Review Date**: 2026-01-17
**Reply Date**: 2026-01-17

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 0      | 0            | 0             | 0                |
| Warning  | 4      | 2            | 2             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Warnings

### W-1: T-1: Type Export Strategy

**Issue**: `types/executeOptions.ts`の型を`types/index.ts`に集約するか、直接exportするかが不明確。tech.mdによると「型定義は`types/index.ts`に集約」がパターン。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
現在のコードベースを調査したところ、`electron-sdd-manager/src/main/types/`ディレクトリは存在しません。Main Processの型定義は以下のパターンで管理されています：

1. `src/renderer/types/index.ts` - Renderer側の型定義集約
2. `src/shared/registry/reviewEngineRegistry.ts` - 共有型は各モジュールで定義・export

Task 1.1は「types/ディレクトリに新規ファイルとして配置」と記載しており、これは`electron-sdd-manager/src/main/services/`または`electron-sdd-manager/src/shared/types/`への配置を意味します。実装時に適切な場所に配置し、必要に応じてre-exportするのが妥当です。この決定は実装フェーズで行うべき詳細であり、設計文書に明記する必要はありません。

---

### W-2: T-3: Missing Worktree Error

**Issue**: `group === 'impl'`で`getSpecWorktreeCwd(specId)`がnullを返す場合のエラーハンドリングが設計で明記されていない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
既存の`getSpecWorktreeCwd`メソッドを確認しました（`specManagerService.ts:461-475`）：

```typescript
private async getSpecWorktreeCwd(specId: string): Promise<string> {
  try {
    const specJsonPath = path.join(this.projectPath, '.kiro', 'specs', specId, 'spec.json');
    const content = await readFile(specJsonPath, 'utf-8');
    const specJson = JSON.parse(content);
    return getWorktreeCwd(this.projectPath, specJson);
  } catch (error) {
    // If spec.json cannot be read, fall back to project path
    logger.warn('[SpecManagerService] getSpecWorktreeCwd failed, using projectPath', {
      specId,
      error: error instanceof Error ? error.message : String(error),
    });
    return this.projectPath;
  }
}
```

このメソッドは**nullを返さず、エラー時は`projectPath`にフォールバック**します。つまり、設計上エラーハンドリングは既に実装されており、新たな対応は不要です。

---

### W-3: OQ-1: executeSpecManagerPhase

**Issue**: Remote UIの統一APIにより`executeSpecManagerPhase`が不要になるか、design.mdで明確化が推奨。

**Judgment**: **Fix Required** ✅

**Evidence**:
`executeSpecManagerPhase`メソッドを確認しました（`specManagerService.ts:1644-1689`）。このメソッドはspec-managerプロファイル専用で、以下の特徴があります：
- `SPEC_MANAGER_COMMANDS`マッピングを使用
- ロック機構（`acquireSpecManagerLock`/`releaseSpecManagerLock`）を持つ
- 主にElectron UI（spec-manager profile）から使用される

requirements.mdのOut of Scopeに「必要に応じて別途対応」と記載されていますが、この記述は曖昧です。新設計の`execute`メソッドとの関係を明確にすべきです。

**Action Items**:
- requirements.mdのOut of Scopeセクションに、`executeSpecManagerPhase`が維持される理由と`execute`メソッドとの関係を明記

---

### W-4: A-1: scheme Default Value

**Issue**: `ExecuteDocumentReview`のscheme未指定時のデフォルト動作を明記すべき。

**Judgment**: **Fix Required** ✅

**Evidence**:
既存実装を確認しました（`specManagerService.ts:1328`）：

```typescript
if (scheme === 'claude-code' || scheme === undefined) {
  // Claude Code slash command format
}
```

また、`reviewEngineRegistry.ts:22`にデフォルト値が定義されています：

```typescript
export const DEFAULT_REVIEWER_SCHEME: ReviewerScheme = 'claude-code';
```

デフォルト動作は明確ですが、design.mdの型定義セクションでは`scheme?: ReviewerScheme`とオプショナルになっているだけで、デフォルト値の記載がありません。実装の一貫性のため、明記すべきです。

**Action Items**:
- design.mdの`ExecuteDocumentReview`型定義にscheme未指定時のデフォルト値（`'claude-code'`）を明記

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I-1 (T-2) | Logging Format | No Fix Needed | 実装時に既存のlogging.mdパターンに準拠すれば十分。設計文書への追記は不要 |
| I-2 (O-1) | Migration Path | No Fix Needed | 後方互換性なしの一括変更はDD-003で決定済み。AIによる全ファイル一括更新で対応 |
| I-3 (O-2) | Rollback Strategy | No Fix Needed | Git revertで対応可能であり、特別な戦略は不要 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| requirements.md | Out of Scopeセクションに`executeSpecManagerPhase`と`execute`メソッドの関係を明記 |
| design.md | `ExecuteDocumentReview`型のscheme未指定時のデフォルト値を明記 |

---

## Conclusion

4件のWarningのうち、2件は既存実装により解決済みであり修正不要と判断しました。残り2件については、仕様書の明確化として修正が必要です。

- W-1（Type Export Strategy）: 実装詳細であり設計文書への追記不要
- W-2（Missing Worktree Error）: 既存実装でフォールバック処理済み
- W-3（executeSpecManagerPhase）: **要修正** - Out of Scopeの記載を明確化
- W-4（scheme Default Value）: **要修正** - デフォルト値を明記

`--autofix`フラグにより、上記の修正を自動適用します。

---

## Applied Fixes

**Applied Date**: 2026-01-17
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| requirements.md | Out of Scopeセクションの`executeSpecManagerPhase`記載を明確化、Open Questionsから重複項目を削除 |
| design.md | `ExecuteDocumentReview`型のschemeフィールドにデフォルト値のコメントを追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: W-3

**Changes**:
- Out of Scopeセクションの`executeSpecManagerPhase`の説明を拡充
- spec-managerプロファイル専用である理由を明記
- 将来的な統一検討の方針を追記
- Open QuestionsからW-3に対応する重複項目を削除（Out of Scopeで解決済み）

**Diff Summary**:
```diff
- executeSpecManagerPhaseメソッド（Remote UI専用、必要に応じて別途対応）
+ `executeSpecManagerPhase`メソッド: spec-managerプロファイル専用のメソッドであり、今回の統一対象外。理由：
+   - `SPEC_MANAGER_COMMANDS`マッピングを使用し、kiroコマンドとは異なるslashCommand体系
+   - 独自のロック機構（`acquireSpecManagerLock`/`releaseSpecManagerLock`）を持つ
+   - 主にElectron UI（spec-manager profile）から使用され、kiroプロファイルの`execute`メソッドとは呼び出し元が異なる
+   - 将来的な統一を検討する場合はプロファイル間の差異を考慮した別Specで対応
```

```diff
 ## Open Questions

-- `executeSpecManagerPhase`（Remote UI向け）も統一するか、別途検討が必要
 - `retryWithContinue`はsessionIdベースの再開なので、統一execute APIに含めるか別メソッドとするか
```

#### design.md

**Issue(s) Addressed**: W-4

**Changes**:
- `ExecuteDocumentReview`インタフェースのschemeフィールドにJSDocコメントを追加
- デフォルト値が`'claude-code'`であることを明記

**Diff Summary**:
```diff
 interface ExecuteDocumentReview extends ExecutePhaseBase {
   type: 'document-review';
-  scheme?: ReviewerScheme;
+  /** Reviewer scheme (default: 'claude-code' - 未指定時は既存実装に準拠) */
+  scheme?: ReviewerScheme;
 }
```

---

_Fixes applied by document-review-reply command._

---

_This reply was generated by the document-review-reply command._
