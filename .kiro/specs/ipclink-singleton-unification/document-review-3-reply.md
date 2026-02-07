# Response to Document Review #3

**Feature**: ipclink-singleton-unification
**Review Date**: 2026-02-07
**Reply Date**: 2026-02-07

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 1            | 0             | 0                |
| Warning  | 1      | 0            | 1             | 0                |
| Info     | 2      | 2            | 0             | 0                |

---

## Response to Critical Issues

### C1: logging.md の rendererLogger IPC 経路が不正確

**Issue**: logging.md（L130-145）は rendererLogger の IPC 経路を `window.electronAPI.logRenderer()` → IPC: `'log:renderer'` と記載しているが、実際のソースコード（rendererLogger.ts:136）では `getVanillaClient().misc.logRenderer.mutate()` を使用している。要件4-3 で logging.md を更新する際にこの不整合も修正しないと新たな矛盾が生まれる。

**Judgment**: **Fix Required** ✅

**Evidence**:

ソースコード `rendererLogger.ts:128-140`:
```typescript
function sendToMain(
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  context: Record<string, unknown>
): void {
  // trpc-full-migration Task 10.6: Use tRPC for logRenderer (fire-and-forget)
  try {
    getVanillaClient().misc.logRenderer.mutate({ level, message, context }).catch(() => {});
  } catch {
    // Silent fallback when tRPC client is not available
  }
}
```

logging.md L130-145 の IPC 経路図:
```
Renderer (console.* or rendererLogger)
  → window.electronAPI.logRenderer(level, message, context)
    → IPC: 'log:renderer'
      → Main process ProjectLogger
```

レビュー指摘は正確。logging.md の記述はソースコード実態と一致していない。`trpc-full-migration` で tRPC 経由に移行されたが、logging.md が更新されていなかった。

要件4-3 の Acceptance Criteria は「consoleHook 廃止と console-message native 方式を反映」のみを対象としているが、logging.md 更新時に rendererLogger の IPC 経路も正確にしないと新たな矛盾が生まれる。

**Action Items**:

- 要件4-3 の Acceptance Criteria を拡張: 「rendererLogger の IPC 経路記述もソースコード実態（tRPC `getVanillaClient().misc.logRenderer.mutate()` 経由）と一致させる」を追加
- レビュー推奨の選択肢A を採用

---

## Response to Warnings

### W1: consoleHook 廃止後の console-message と consoleHook の機能差分未整理

**Issue**: consoleHook 廃止後、console-message native 方式では `getAutoContext()`（specId/bugName 自動付与）が利用不可。機能差分が未整理。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

レビュー自身が Section 3.2 で指摘している通り:
> console-message は **consoleHook の代替**（開発/E2E 時のグローバルフック）であり、**rendererLogger の代替ではない**。rendererLogger は明示的な API として残るため、構造化ログは rendererLogger で引き続きサポートされる。

つまり:
1. `getAutoContext()` を使った構造化ログ → `rendererLogger`（Out of Scope として維持、変更なし）
2. `console.*` のグローバルフック → `console-message` native 方式（`getAutoContext()` は元々 consoleHook でのみ使用、本番では無効）

consoleHook は production では無効（`import.meta.env.PROD` 判定）であり、production 環境で `getAutoContext()` が console.* フックに付与されることは元々なかった。console-message で `getAutoContext()` が失われるのは dev/E2E 環境のみだが、これは「受容する機能劣化」として自然。

この点は design フェーズで明確化すべきとのレビュー指摘には同意するが、**requirements.md の修正は不要**。design フェーズの考慮事項として適切に対応される。

---

## Response to Info (Low Priority)

| #    | Issue                                            | Judgment        | Reason                                       |
| ---- | ------------------------------------------------ | --------------- | --------------------------------------------- |
| I1   | Out of Scope に rendererLogger の getVanillaClient() 依存を補足 | Fix Required ✅  | レビュアーの理解を助け、ipcLink 修正が rendererLogger にも恩恵をもたらすことを明確化 |
| I2   | Open Question に createTRPCClientProxy の deprecated 注記を追加  | Fix Required ✅  | design フェーズで代替方式の検討が必要であることを明示化 |

---

## Files to Modify

| File               | Changes                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `requirements.md`  | 要件4-3 AC を拡張（rendererLogger IPC 経路修正を含める）                                    |
| `requirements.md`  | Out of Scope: rendererLogger の記述に `getVanillaClient()` 依存の補足を追加                  |
| `requirements.md`  | Open Question: `createTRPCClientProxy` の deprecated (@internal) 情報を追加                  |

---

## Conclusion

CRITICAL-1 は実コードとの照合で logging.md の記述が不正確であることが確認でき、要件4-3 の AC 拡張で対応する。WARNING-1 は design フェーズの考慮事項であり requirements.md の修正は不要。INFO-1, INFO-2 は明確化のための軽微な追記。

修正対象は `requirements.md` のみ（3箇所）。

---

## Applied Fixes

**Applied Date**: 2026-02-07
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| `requirements.md` | 要件4-3 AC 拡張、Out of Scope 補足、Open Question deprecated 注記追加 |

### Details

#### requirements.md

**Issue(s) Addressed**: C1, I1, I2

**Changes**:
- 要件4-3 AC3 を拡張: rendererLogger の IPC 経路記述もソースコード実態と一致させる旨を追記
- Out of Scope: rendererLogger の記述に `getVanillaClient()` 経由 tRPC 通信の依存関係を明記
- Open Question: `createTRPCClientProxy` が deprecated (`@internal`) である情報を追記

**Diff Summary**:
```diff
- 3. When この仕様が完了した時, the system shall `.kiro/steering/logging.md` の Renderer ロギングアーキテクチャセクションが consoleHook 廃止と console-message native 方式を反映した記述に更新されている
+ 3. When この仕様が完了した時, the system shall `.kiro/steering/logging.md` の Renderer ロギングアーキテクチャセクションが consoleHook 廃止と console-message native 方式を反映した記述に更新されている（rendererLogger の IPC 経路記述もソースコード実態 `getVanillaClient().misc.logRenderer.mutate()` と一致させること）
```

```diff
- - `rendererLogger.ts` の廃止（notificationStore が依存しており、ipcLink 修正後は正常動作する）
+ - `rendererLogger.ts` の廃止（notificationStore が依存しており、`getVanillaClient()` 経由で tRPC 通信するため、ipcLink シングルトン化の恩恵を受け正常動作する）
```

```diff
- - `createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか、型レベルで互換性の確認が必要（設計フェーズで検証）
+ - `createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか、型レベルで互換性の確認が必要（設計フェーズで検証）。なお、`createTRPCClientProxy` は `@trpc/client` v10.45.4 で deprecated（`@internal`）API であり、設計フェーズで代替方式の検討も必要
```

---

_Fixes applied by document-review-reply command._
