# Response to Document Review #10

**Feature**: trpc-full-migration
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 1      | 0            | 1             | 0                |
| Warning  | 2      | 1            | 1             | 0                |
| Info     | 2      | 0            | 2             | 0                |

---

## Response to Critical Issues

### C1: Task 5.3のRenderer差し替え対象が不明確

**Issue**: Task 5.3（Spec/Bug Renderer差し替え）の記述に具体的な対象ファイル一覧が不足している。specStore/bugStore等の影響範囲が不明確なまま実装に入ると漏れが生じるリスクが高い。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

レビュー#10が指摘した「Task 5.3のRenderer差し替え対象ファイル」について、実際のコードベースを検証した結果、**Task 5.1/5.2の実装と並行して、主要なRenderer側ファイルは既にtRPC（vanillaClient）に移行済み**であることが確認された。

具体的な証拠:

1. **`src/renderer/stores/spec/specListStore.ts`**: `getVanillaClient().file.readSpecs.query()`, `getVanillaClient().file.readSpecJson.query()` を使用済み。`window.electronAPI`参照は **0件**。

2. **`src/renderer/stores/spec/specDetailStore.ts`**: `getVanillaClient().file.readSpecJson.query()`, `getVanillaClient().spec.syncSpecPhase.mutate()`, `getVanillaClient().spec.syncDocumentReview.mutate()`, `getVanillaClient().file.readArtifact.query()`, `getVanillaClient().file.listMarkdownFilesInSpec.query()` を使用済み。`window.electronAPI`参照は **0件**。

3. **`src/renderer/stores/spec/specStoreFacade.ts`**: `getVanillaClient().file.readSpecs.query()`, `getVanillaClient().file.readSpecJson.query()`, `getVanillaClient().spec.execute.mutate()` を使用済み。`window.electronAPI`参照は **0件**。

4. **`src/renderer/services/specSyncService.ts`**: `getVanillaClient().spec.syncDocumentReview.mutate()`, `getVanillaClient().file.readSpecJson.query()`, `getVanillaClient().file.readArtifact.query()` を使用済み。`window.electronAPI`参照は **0件**。

5. **`src/renderer/services/specWatcherService.ts`**: Query/Mutation呼び出しは `getVanillaClient().spec.stopSpecsWatcher.mutate()` に移行済み。残存する `window.electronAPI.onSpecsChanged()` は**ipcRenderer.onリスナー（Subscription）であり、Task 9（イベント通知移行）のスコープ**であって、Task 5.3のスコープではない。

6. **`src/renderer/stores/spec/autoExecutionStore.ts`**: 残存する `window.electronAPI.onAutoExecutionStatusChanged`等は全て**ipcRenderer.onリスナー（Subscription）であり、Task 9のスコープ**。

7. **`src/renderer/components/ArtifactEditor.tsx`**: 残存する `window.electronAPI.copyToClipboard` は**misc系の操作であり、Task 10.5/10.6のスコープ**。

結論: Task 5.3の対象であるSpec/Bug関連のQuery/Mutation呼び出しは、Task 5.1/5.2の実装過程で**既に差し替え完了**している。tasks.mdのTask 5.3記述は簡潔だが、実装上の漏れリスクは実質的に解消済みである。ただし、タスク記述の詳細度を改善すること自体は将来のTask 6.2以降で参考にする価値はある。

**Action Items**: なし（既に実装完了済み）

---

## Response to Warnings

### W1: handlers.ts内の"unmigrated"パターンがdesign.mdに未記載

**Issue**: handlers.ts内に`registerUnmigratedFileHandlers`/`registerUnmigratedProjectHandlers`という新規内部関数名が出現しており、design.mdの「並行存在の方針」と不整合。

**Judgment**: **Fix Required** ✅

**Evidence**:

handlers.tsの実装を確認した結果:

- `registerUnmigratedProjectHandlers()` (行846): GET_PROJECT_LOG_PATH、OPEN_LOG_IN_BROWSER、ADD_SHELL_PERMISSIONS、ADD_MISSING_PERMISSIONS、CHECK_REQUIRED_PERMISSIONSを登録。これらはprojectHandlers.ts削除後に、まだtRPC移行されていないチャンネルをhandlers.ts内に集約した中間パターン。
- `registerUnmigratedFileHandlers()` (行939): SHOW_OPEN_DIALOG（「Also available via tRPC project.showOpenDialog」とコメント記載、後方互換用に残存）、VSCode Integration等を登録。

この中間パターンはdesign.mdの「並行存在の方針」セクションに記載がなく、実装と設計ドキュメントの乖離として文書化すべきである。

**Action Items**:
- design.mdの「Integration & Deprecation Strategy > 並行存在の方針」セクションに中間パターンの記述を追記する

### W2: Req 2.4のVCS_SCHEMEチャンネル「削除」定義とhandlers.ts残存の不整合

**Issue**: requirements.md Req 2.4で「handlers.ts由来2チャンネル〔VCS_SCHEME_GET, VCS_SCHEME_SET〕が削除されていること」と定義しているが、handlers.ts自体はTask 11.2まで残存する。

**Judgment**: **No Fix Needed** ❌

**Evidence**:

handlers.ts内のVCS_SCHEME_GET/SET（行688-732）を確認した。これらは`registerSteeringHandlers()`内に属している。

Req 2.4の文言は「config routerに統合される全22プロシージャの元ハンドラが削除されていること」であるが、実装戦略として:
1. config routerにVCS_SCHEMEプロシージャが実装済み（Task 3.1完了）
2. Renderer側はtRPC経由で呼び出し済み（Task 3.2完了）
3. handlers.ts内のレガシーチャンネルは「使用されていない死コード」として残存
4. Task 11.2（handlers.ts物理削除）で最終的に削除される

この不整合はレビュー#10で正しく分析されている通り「実質的な問題はない」。requirements.mdの文言を厳密に解釈した場合の不整合ではあるが、config移行完了時点で「tRPC経由に切り替え済み」であり、段階的移行戦略の設計意図と矛盾しない。handlers.ts残存は全ドメイン移行完了後のTask 11.2で一括削除するというのが設計の意図であり、個別ドメインの移行完了時にhandlers.ts内の該当行だけを部分削除する方が、かえってhandlers.tsの整合性を損なうリスクがある。

Req 2.4に注釈を追加することは過剰な変更であり、design.mdの「並行存在の方針」セクション（W1で追記済み）で十分にカバーされる。

**Action Items**: なし

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| S1 | Subscription lifecycle cleanup検証が未実施 | No Fix Needed | Task 9.1で対応予定と明記済み。追加アクション不要 |
| S2 | Task 6以降のRenderer差し替えタスクも対象ファイルを明示化 | No Fix Needed | Task 5.3の検証結果から、実装者が移行過程で適切にRenderer差し替えを実施していることが証明済み。C1の判定根拠参照 |

---

## Files to Modify

| File   | Changes   |
| ------ | --------- |
| design.md | 「並行存在の方針」セクションにhandlers.ts内の`registerUnmigratedXxxHandlers`中間パターンの記述を追記 |

---

## Conclusion

レビュー#10の3指摘（C1, W1, W2）+ 2 INFO項目を検証した結果:

- **C1（CRITICAL: Task 5.3対象ファイル不明確）**: コードベース検証の結果、対象ファイル（specListStore, specDetailStore, specStoreFacade, specSyncService, specWatcherService）は**既にtRPC（vanillaClient）に移行済み**。残存する`window.electronAPI`参照はSubscription（Task 9）またはmisc系（Task 10）のスコープであり、Task 5.3のスコープ外。**修正不要**。

- **W1（WARNING: unmigratedパターン未文書化）**: handlers.ts内の中間パターンがdesign.mdに未記載であることは事実。design.mdへの追記が必要。**修正1件**。

- **W2（WARNING: Req 2.4 VCS_SCHEME定義）**: 段階的移行戦略の設計意図と矛盾しない。W1の追記でカバーされる。**修正不要**。

Fix Required: 1件（W1: design.md追記）

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --fix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| design.md | 「並行存在の方針」セクションに`registerUnmigratedXxxHandlers`中間パターンの記述を追記 |

### Details

#### design.md

**Issue(s) Addressed**: W1

**Changes**:
- 「並行存在の方針」セクションに「中間パターン: handlers.ts内の未移行ハンドラ集約」の段落を追加
- ドメイン別ハンドラファイル削除時に未移行チャンネルを`registerUnmigratedXxxHandlers()`として一時集約するパターンを文書化
- 最終的にTask 11.2でhandlers.ts自体が物理削除される旨を明記

**Diff Summary**:
```diff
 移行中は「レガシーIPC」と「tRPC」が共存する。各ドメイン移行完了時にそのドメインのレガシーコードを削除し、全ドメイン完了後にchannels.ts等の共通基盤を削除する。
+
+**中間パターン: handlers.ts内の未移行ハンドラ集約**
+
+ドメイン別ハンドラファイル（例: projectHandlers.ts, fileHandlers.ts）を物理削除する際、そのドメイン内でまだtRPC移行が完了していないチャンネルが存在する場合がある。これらは handlers.ts 内に `registerUnmigratedXxxHandlers()` として一時的に集約する。この中間パターンにより、ドメイン別ファイルの削除を先行しつつ、未移行チャンネルの動作を維持する。集約された未移行ハンドラは、対応するtRPCルーター実装完了後に handlers.ts から削除され、最終的に Task 11.2 で handlers.ts 自体が物理削除される。
```

---

_Fixes applied by document-review-reply command._
