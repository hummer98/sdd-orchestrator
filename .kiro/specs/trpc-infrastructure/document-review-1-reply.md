# Response to Document Review #1

**Feature**: trpc-infrastructure
**Review Date**: 2026-02-06
**Reply Date**: 2026-02-05

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 4      | 4            | 0             | 0                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: spec.jsonのタイムスタンプ不整合

**Issue**: `created_at`（2026-02-06T12:00:00Z）が`updated_at`（2026-02-05T20:45:48.631Z）より後の時刻になっている。

**Judgment**: **Fix Required** ✅

**Evidence**:
events.jsonlの記録により、Specの実際の作成時刻を確認：
```jsonl
{"type":"worktree:create","timestamp":"2026-02-05T20:35:29.957Z"}
{"type":"approval:update","phase":"requirements","timestamp":"2026-02-05T20:35:37.521Z"}
```
Worktree作成が`2026-02-05T20:35:29.957Z`であり、`created_at`の`2026-02-06T12:00:00Z`は明らかに手動設定による不正確な値。`updated_at`（2026-02-05T20:45:48.631Z）がcreated_atより前になっている矛盾も確認。

**Action Items**:
- spec.jsonの`created_at`をworktree作成時刻`2026-02-05T20:35:29.957Z`に修正

---

### C2: Vite設定ファイル名の不一致

**Issue**: Requirements 5.3で`vite.config.preload.ts`を参照しているが、実際のプロジェクト構成では存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:
プロジェクト内のVite設定ファイルをGlobで確認：
- `electron-sdd-manager/vite.config.ts` - 存在（Electron Renderer + Preload用）
- `electron-sdd-manager/vite.config.remote.ts` - 存在（Remote UI用）
- `vite.config.preload.ts` - **存在しない**

tech.mdにも「`vite.config.ts`（Electron Renderer + Preload）と`vite.config.remote.ts`（Remote UI）の2ファイル体制」と記載。Design DD-002でも「Viteのelectron pluginでpreloadエントリーを追加」と記載されており、独立した`vite.config.preload.ts`は設計に含まれていない。

**Action Items**:
- requirements.md Requirement 5のAcceptance Criteria 3を修正：`vite.config.preload.ts`→`vite.config.ts`のelectronプラグインpreloadエントリー設定

---

## Response to Warnings

### W1: Requirement 3.3の文言とDesign DD-002の矛盾

**Issue**: Req 3.3「既存preloadに影響を与えない（分離された設定）」とDesign DD-002の「preload/index.tsにimport文1行追加」の解釈ギャップ。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design DD-002で明確に「既存の`preload/index.ts`内に`import './trpc'`追加」と設計されている。Research.mdでも「preload/index.tsへの変更は`import './trpc'`の1行のみ」と記載。Electronの単一preload制約のため、完全非影響は技術的に不可能であることがresearch.mdで確認されている。

Requirements 3.3の文言がDesignの実際の設計と矛盾しており、Requirementの文言を修正して技術的実態と整合させるべき。

**Action Items**:
- requirements.md Req 3.3を「既存の`src/preload/index.ts`の公開API（`window.electronAPI`）に機能的影響を与えないこと（import文追加のみ許容）」に修正

---

### W2: Criterion 6.6 Remote UI検証方法の曖昧さ

**Issue**: Remote UIからのhealthCheck呼び出しはipcLink非動作のため実行時検証不可。Requirementの期待値と実際の検証可能範囲にギャップ。

**Judgment**: **Fix Required** ✅

**Evidence**:
Design DD-003で「Remote UIではipcLinkは動作しない」と明確に記載。Research.mdでも「electron-trpcのipcLinkはRenderer（contextBridge経由）専用でWebSocket環境では動作しない」と確認。

Requirements 6.6の「Remote UIから同様に呼び出せること」は実行時の動作検証が不可能であり、誤った期待を生む文言。Tasks 7でも「ipcLinkの制約により実行時の動作確認はスコープ外」と認識されている。

**Action Items**:
- requirements.md Req 6.6を「Remote UIにおいて`trpc.system.healthCheck.useQuery()`の型レベルでの呼び出し構造が利用可能であること（ipcLink非動作のため実行時検証はスコープ外）」に修正

---

### W3: Provider統合の検証手段未定義

**Issue**: TRPCProviderをrenderer/App.tsxとremote-ui/App.tsxに統合した際の検証方法が不明確。

**Judgment**: **Fix Required** ✅

**Evidence**:
Tasks 7の記述が「確認する」のみで具体的な手順が不明。Design.mdのVerification Contract UJ-001は「Rendererが`trpc.system.healthCheck.useQuery()`を呼び出す」だが、これはE2E Not Requiredとされており、検証方法が明示されていない。

ビルド成功（Task 6.2）でProviderのインポートと構造的正しさは担保されるが、Task 7に具体的な検証方法を追記すべき。

**Action Items**:
- tasks.md Task 7に具体的な検証手順を追記：「TypeScriptコンパイル成功でtrpc hooks呼び出しの型安全性を確認、ビルド成功でProvider統合の構造的正しさを確認」

---

### W4: @tanstack/react-query v5 と tRPC v10 の互換性

**Issue**: tRPC v10の`@trpc/react-query`がReact Query v5を正式サポートしているか要確認。

**Judgment**: **Fix Required** ✅

**Evidence**:
Web調査の結果、**tRPC v10は@tanstack/react-query v5と互換性がない**ことが確認された。

- [GitHub Issue #4218](https://github.com/trpc/trpc/issues/4218): tRPC v10ではReact Query v5をサポートしていない
- [tRPC v10→v11 Migration Guide](https://trpc.io/docs/migrate-from-v10-to-v11): React Query v5対応はtRPC v11で提供
- [tRPC公式ブログ](https://trpc.io/blog/introducing-tanstack-react-query-client): 新しいTanStack React Query統合はtRPC v11用

Design.mdで`@tanstack/react-query ^5.x`を指定しているが、tRPC v10の`@trpc/react-query ^10.x`は`@tanstack/react-query ^4.x`を要求する。

**Action Items**:
- design.md Technology Stackの`@tanstack/react-query`バージョンを`^5.x`から`^4.x`に修正
- requirements.md Req 1.5の記述は「dependenciesにインストールされていること」のみなのでバージョン修正不要
- research.md Implementation Guidanceのnpm installコマンドを`@tanstack/react-query@^4`に修正

---

## Response to Info (Low Priority)

| #    | Issue     | Judgment      | Reason         |
| ---- | --------- | ------------- | -------------- |
| I1 | electron-trpcのimport元の確認 | No Fix Needed ❌ | Research.mdで「exposeElectronTRPCはelectron-trpc/mainからimport」と記載済み。実装時にAPIドキュメントで最終確認すれば十分 |
| I2 | createIPCHandler APIシグネチャの確認 | No Fix Needed ❌ | Research.mdで`createIPCHandler({ router, windows })`パターンを記載済み。実装時の確認で十分対応可能 |
| I3 | Remote UIでのipcLink初期化エラーの調査 | No Fix Needed ❌ | Design DD-003で「Remote UIでtRPC API呼び出しは行わない。Providerの配置のみ」と方針決定済み。初期化エラーの調査は実装時に対応すれば十分 |

---

## Files to Modify

| File | Changes |
| ---- | ------- |
| spec.json | `created_at`を`2026-02-05T20:35:29.957Z`に修正 |
| requirements.md | Req 3.3の文言修正（公開APIへの機能的影響に限定）、Req 5.3の`vite.config.preload.ts`→`vite.config.ts`のpreloadエントリー設定に修正、Req 6.6の検証範囲明確化 |
| design.md | Technology Stack表の`@tanstack/react-query`を`^4.x`に修正 |
| tasks.md | Task 7に具体的な検証手順を追記 |
| research.md | Implementation Guidanceのnpm installコマンドの`@tanstack/react-query`バージョンを`^4`に修正 |

---

## Conclusion

9件のレビューissueに対して、Critical 2件・Warning 4件を**Fix Required**、Info 3件を**No Fix Needed**と判定した。

主要な修正ポイント：
1. spec.jsonのタイムスタンプ修正（事実誤認の修正）
2. Vite設定ファイル名のRequirements整合（実態との不一致）
3. Requirement 3.3の文言明確化（設計との整合）
4. @tanstack/react-query v5→v4への修正（**技術的互換性の問題**）
5. Requirement 6.6の検証範囲明確化（実現可能性との整合）
6. Task 7の検証手順追記（検証方法の明確化）

特にW4（React Query v5互換性）は技術的に重要で、tRPC v10は@tanstack/react-query v4のみをサポートしている。実装前に修正が必須。

---

## Applied Fixes

**Applied Date**: 2026-02-05
**Applied By**: --autofix

### Summary

| File | Changes Applied |
| ---- | --------------- |
| spec.json | `created_at`を正しい値に修正 |
| requirements.md | Req 3.3文言修正、Req 5.3ファイル名修正、Req 6.6検証範囲明確化 |
| design.md | @tanstack/react-queryバージョンを^5.x→^4.xに修正 |
| tasks.md | Task 7に検証手順を追記 |
| research.md | npm installコマンドの@tanstack/react-queryバージョンを^4に修正 |

### Details

#### spec.json

**Issue(s) Addressed**: C1

**Changes**:
- `created_at`をworktree作成時刻に修正

**Diff Summary**:
```diff
-  "created_at": "2026-02-06T12:00:00Z",
+  "created_at": "2026-02-05T20:35:29.957Z",
```

#### requirements.md

**Issue(s) Addressed**: C2, W1, W2

**Changes**:
- Req 3.3: 「影響を与えない」→「公開APIに機能的影響を与えない（import文追加のみ許容）」
- Req 5.3: `vite.config.preload.ts`→`vite.config.ts`のelectronプラグインpreloadエントリー設定
- Req 6.6: 「同様に呼び出せる」→「型レベルでの呼び出し構造が利用可能（実行時検証はスコープ外）」

**Diff Summary**:
```diff
-3. 既存の`src/preload/index.ts`に影響を与えないこと（分離された設定）
+3. 既存の`src/preload/index.ts`の公開API（`window.electronAPI`）に機能的影響を与えないこと（import文追加のみ許容）
```
```diff
-3. `vite.config.preload.ts`でtRPC Preloadのビルドが正しく行われること
+3. `vite.config.ts`のelectronプラグインpreloadエントリー設定でtRPC Preloadのビルドが正しく行われること
```
```diff
-6. Remote UIから同様に呼び出せること
+6. Remote UIにおいて`trpc.system.healthCheck.useQuery()`の型レベルでの呼び出し構造が利用可能であること（ipcLink非動作のため実行時検証はスコープ外）
```

#### design.md

**Issue(s) Addressed**: W4

**Changes**:
- Technology Stack表の@tanstack/react-queryバージョンを^5.x→^4.xに修正

**Diff Summary**:
```diff
-| Data Fetching | @tanstack/react-query ^5.x | QueryClient、キャッシュ管理 | dependencies配置 |
+| Data Fetching | @tanstack/react-query ^4.x | QueryClient、キャッシュ管理 | dependencies配置。tRPC v10は@tanstack/react-query v4のみサポート |
```

#### tasks.md

**Issue(s) Addressed**: W3

**Changes**:
- Task 7に具体的な検証手順（typecheck + build）を追記

**Diff Summary**:
```diff
 - [ ] 7. RendererおよびRemote UIからhealthCheck APIを呼び出せることを確認する
   - Renderer側で`trpc.system.healthCheck.useQuery()`が型安全に呼び出せることを確認する
   - Remote UI側で同様の呼び出し構造が利用可能であることを確認する（ipcLinkの制約により実行時の動作確認はスコープ外）
+  - 検証方法: TypeScriptコンパイル成功（`npm run typecheck`）でtrpc hooks呼び出しの型安全性を確認、ビルド成功（`npm run build`）でProvider統合の構造的正しさを確認
   - _Requirements: 6.5, 6.6_
```

#### research.md

**Issue(s) Addressed**: W4

**Changes**:
- Implementation Guidanceのnpm installコマンドの@tanstack/react-queryバージョンを^5→^4に修正

**Diff Summary**:
```diff
-npm install @trpc/server@^10 @trpc/client@^10 @trpc/react-query@^10 @tanstack/react-query@^5
+npm install @trpc/server@^10 @trpc/client@^10 @trpc/react-query@^10 @tanstack/react-query@^4
```

---

_Fixes applied by document-review-reply command._
