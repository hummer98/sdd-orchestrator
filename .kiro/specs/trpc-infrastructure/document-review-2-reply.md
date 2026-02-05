# Response to Document Review #2

**Feature**: trpc-infrastructure
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-06

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Warning  | 2      | 2            | 0             | 0                |
| Info     | 4      | 2            | 2             | 0                |

---

## Response to Warnings

### W1: Main Process統合（createIPCHandler）の検証手段が限定的

**Issue**: Task 5.1で実装するcreateIPCHandler統合の自動テストが存在せず、ランタイム動作検証が手動に依存する。Task 6.2にスモークテスト項目の追記を推奨。

**Judgment**: **Fix Required** ✅

**Evidence**:
Task 6.2の現在の記述は「`npm run test`で全テストがpass」「`npm run build`で本番ビルドが成功」の2項目のみ。callerパターンテスト（Task 6.1）はRouter/Procedureロジックの検証に限定され、createIPCHandlerの呼び出し正当性（引数、タイミング、ウィンドウ参照）は検証対象外。ビルド成功は構造的正しさを担保するが、ランタイムの接続動作は確認できない。

スモークテスト項目の追記はコスト極小で品質保証に寄与する。Verification Contract UJ-001で「E2E Not Required」としているため、手動確認を明示するのが適切。

**Action Items**:
- tasks.md Task 6.2に「アプリ起動後、devtoolsのConsoleでtRPC関連エラーが出力されないことを確認（手動スモークテスト）」を追記

---

### W2: Remote UI TRPCProvider初期化時のエラーハンドリング

**Issue**: ipcLink未対応環境でTRPCProvider初期化時にエラーが発生する可能性が未調査。Design DD-003で「Provider配置のみ」方針だが、初期化自体の副作用が不明。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design DD-003で「Remote UIでのtRPC API呼び出しは本Specでは行わない。Providerの配置のみ」と方針決定済み。しかし、`trpc.createClient({ links: [ipcLink()] })`の実行がProvider初期化時に発生し、ipcLinkがcontextBridge経由のIPC通信を前提としているため、Remote UI環境（WebSocket経由）ではipcLink初期化自体がエラーを投げる可能性がある。

Research.mdでも「electron-trpcのipcLinkはRenderer（contextBridge経由）専用でWebSocket環境では動作しない」と明記されており、Provider初期化の副作用確認は実装時の重要な検討事項。

**Action Items**:
- tasks.md Task 5.3に「ipcLink初期化がRemote UI環境でエラーを発生させないことを確認。エラーが発生する場合はtry-catchまたは条件分岐で対応する」を追記
- design.md DD-003のConsequencesに「ipcLink初期化の副作用確認が必要」を追記

---

## Response to Info (Low Priority)

### I1: DD-002のDecision文の表現改善

**Issue**: DD-002のDecision冒頭「既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加する」は、実際の結論（分離モジュール + import）と微妙にずれている。

**Judgment**: **Fix Required** ✅

**Evidence**:
DD-002のDecision文（design.md L618）: 「既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加する。`preload/trpc.ts`は分離モジュールとしてexportし、`preload/index.ts`からimportする」

冒頭の「`exposeElectronTRPC()`呼び出しを追加する」は、preload/index.tsに直接コードを書くと誤読される可能性がある。DD-002の後続テキストおよびRationaleで方式は明確に説明されているが、Decision文の第一文が結論を正確に反映していないのは修正コスト極小で改善できる。

**Action Items**:
- design.md DD-002のDecision文を「`preload/trpc.ts`を分離モジュールとして作成し、既存の`preload/index.ts`から`import './trpc'`で読み込む。`exposeElectronTRPC()`は分離モジュール内で呼び出す」に更新

---

### I2: TRPCPreload Implementation Notesの更新

**Issue**: Design TRPCPreloadのImplementation Notesが「選択する」という未決定口調のままだが、DD-002で方式は決定済み。

**Judgment**: **Fix Required** ✅

**Evidence**:
TRPCPreload Implementation Notes（design.md L380）: 「BrowserWindow作成時に`webPreferences.preload`は単一ファイルのみ指定可能。electron-trpcの`exposeElectronTRPC`は既存preloadスクリプト内で呼び出すか、Viteのpreloadビルドで結合する方式を**選択する**。」

DD-002で「分離モジュール + import」方式が決定済みであるため、Implementation Notesの未決定口調は文書の一貫性を損なう。決定済みの内容に更新すべき。

**Action Items**:
- design.md TRPCPreload Implementation Notesを「DD-002で決定済み: `preload/trpc.ts`を分離モジュールとして作成し、`preload/index.ts`から`import './trpc'`で読み込む方式」に更新

---

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I3 | createIPCHandlerのウィンドウ再作成時の挙動 | No Fix Needed ❌ | 基盤構築Specのスコープ外。macOSのdock再起動等でのウィンドウ再作成はアプリ全体のライフサイクル管理の問題であり、本Specでは初回構築に集中すべき。将来のSpecで検討する対象 |
| I4 | Task 4.1の並行実行可能性の注記 | No Fix Needed ❌ | TDD実装パターンでは型定義ファイルを先に作成するのが標準。Task 4.1のPマークは「Task 2.3と並行して着手可能」を意味し、`import type`の依存はファイル存在時点で解消される。既存のタスク説明「AppRouter型をimport type経由で参照する」で依存関係は暗黙的に伝達されており、追加注記は過剰 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| tasks.md | Task 6.2にスモークテスト項目追記、Task 5.3にipcLink初期化確認事項追記 |
| design.md | DD-002 Decision文の表現修正、DD-003 ConsequencesにipcLink初期化副作用の記述追加、TRPCPreload Implementation Notes更新 |

---

## Conclusion

Review #2の6件のissueに対して、Warning 2件・Info 2件を**Fix Required**、Info 2件を**No Fix Needed**と判定した。

主要な修正ポイント：
1. Task 6.2にアプリ起動スモークテスト項目を追記（手動検証の明示化）
2. Task 5.3にipcLink初期化のRemote UI環境確認事項を追記
3. DD-002 Decision文を実際の結論と一致する表現に修正
4. DD-003にipcLink初期化副作用の確認必要性を追記
5. TRPCPreload Implementation Notesを決定済み内容に更新

I3（ウィンドウ再作成）とI4（Task 4.1並行実行注記）は基盤構築Specのスコープおよびタスク記述の詳細度として適切であり、修正不要と判定した。

---

## Applied Fixes

**Applied Date**: 2026-02-06
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| tasks.md | Task 6.2にスモークテスト項目追記、Task 5.3にipcLink初期化確認事項追記 |
| design.md | DD-002 Decision文修正、DD-003 Consequences更新、TRPCPreload Implementation Notes更新 |

### Details

#### tasks.md

**Issue(s) Addressed**: W1, W2

**Changes**:
- Task 6.2に手動スモークテスト項目を追記
- Task 5.3にipcLink初期化のRemote UI環境確認事項を追記

**Diff Summary**:
```diff
 - [ ] 6.2 全テストの実行と本番ビルドの検証を行う
   - `npm run test`で全テストがpassすることを確認する
   - 開発モードでHMRが正常に動作することを確認する
   - `npm run build`で本番ビルドが成功することを確認する
+  - アプリ起動後、devtoolsのConsoleでtRPC関連エラーが出力されないことを確認（手動スモークテスト）
   - _Requirements: 5.4, 5.5, 7.5_
```
```diff
 - [ ] 5.3 Remote UI版App.tsxにTRPCProviderを統合する
   - 既存のProviderチェーンにTRPCProviderを追加してコンポーネントツリーをラップする
   - ipcLinkがRemote UI環境では動作しないことに留意（構造のみの統合）
+  - ipcLink初期化がRemote UI環境でエラーを発生させないことを確認。エラーが発生する場合はtry-catchまたは条件分岐で対応する
   - _Requirements: 4.6_
```

#### design.md

**Issue(s) Addressed**: I1, I2, W2

**Changes**:
- DD-002 Decision文を分離モジュール+import方式を正確に反映する表現に修正
- DD-003 ConsequencesにipcLink初期化副作用の確認必要性を追記
- TRPCPreload Implementation Notesを決定済み内容に更新

**Diff Summary**:
```diff
-| Decision | 既存の`preload/index.ts`内に`exposeElectronTRPC()`呼び出しを追加する。`preload/trpc.ts`は分離モジュールとしてexportし、`preload/index.ts`からimportする |
+| Decision | `preload/trpc.ts`を分離モジュールとして作成し、既存の`preload/index.ts`から`import './trpc'`で読み込む。`exposeElectronTRPC()`は分離モジュール内で呼び出す |
```
```diff
-| Consequences | Remote UIではtRPCのipcLinkは動作しない（WebSocketトランスポートが必要）。本Specでは構造のみ共有し、Remote UIでのtRPC有効化は将来Specで対応 |
+| Consequences | Remote UIではtRPCのipcLinkは動作しない（WebSocketトランスポートが必要）。本Specでは構造のみ共有し、Remote UIでのtRPC有効化は将来Specで対応。ipcLink初期化がRemote UI環境で副作用（エラー）を発生させないか実装時に確認が必要 |
```
```diff
-**Implementation Notes**
-- BrowserWindow作成時に`webPreferences.preload`は単一ファイルのみ指定可能。electron-trpcの`exposeElectronTRPC`は既存preloadスクリプト内で呼び出すか、Viteのpreloadビルドで結合する方式を選択する。詳細は`research.md`参照
+**Implementation Notes**
+- DD-002で決定済み: `preload/trpc.ts`を分離モジュールとして作成し、`preload/index.ts`から`import './trpc'`で読み込む方式。BrowserWindow作成時に`webPreferences.preload`は単一ファイルのみ指定可能であるため、分離モジュール+importパターンで単一preload制約と関心の分離を両立する。詳細は`research.md`参照
```

---

_Fixes applied by document-review-reply command._
