# Specification Review Report #2

**Feature**: ipclink-singleton-unification
**Review Date**: 2026-02-07
**Documents Reviewed**:
- `.kiro/specs/ipclink-singleton-unification/spec.json`
- `.kiro/specs/ipclink-singleton-unification/requirements.md`
- `.kiro/specs/ipclink-singleton-unification/document-review-1.md`
- `.kiro/specs/ipclink-singleton-unification/document-review-1-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`
- `.kiro/steering/logging.md`
- ソースコード: `shared/trpc/vanillaClient.ts`, `shared/trpc/provider.tsx`, `shared/trpc/client.ts`, `renderer/utils/consoleHook.ts`, `renderer/utils/noiseFilter.ts`, `main/trpc/routers/misc.ts`, `main/trpc/handler.ts`

## Executive Summary

| 種別 | 件数 |
|------|------|
| **CRITICAL** | 0 |
| **WARNING** | 2 |
| **INFO** | 3 |

**概要**: レビュー#1 で指摘された CRITICAL-1（spec.json 不整合）と WARNING-2（logging.md 更新漏れ）は適切に修正済み。現在のフェーズは `requirements-approved` であり、design.md / tasks.md は未作成のため、本レビューは requirements.md 単体の品質検証とソースコード照合に集中する。重大な問題はなく、design フェーズへ進行可能だが、いくつかの技術的不正確さと steering 更新範囲の不足を指摘する。

## 0. レビュー#1 修正適用確認

| #1 Issue | Status | 確認結果 |
|----------|--------|----------|
| CRITICAL-1: spec.json 不整合 | ✅ 修正済み | `phase: "requirements-approved"`, `design.generated: false`, `design.approved: false` |
| WARNING-2: logging.md 更新漏れ | ✅ 修正済み | 要件4-3 に `logging.md` 更新の Acceptance Criteria 追加済み |
| CRITICAL-2: 完全レビュー不可 | ⏳ 未解決（設計上の前提） | design.md / tasks.md 作成後に再レビューで対応 |

## 1. Document Consistency Analysis

### 1.1 spec.json ↔ ファイル存在の整合性

| フィールド | spec.json の値 | ファイル存在 | 状態 |
|-----------|---------------|------------|------|
| `phase` | `requirements-approved` | - | ✅ |
| `approvals.requirements.generated` | `true` | `requirements.md` あり | ✅ |
| `approvals.requirements.approved` | `true` | - | ✅ |
| `approvals.design.generated` | `false` | `design.md` なし | ✅ |
| `approvals.tasks.generated` | `false` | `tasks.md` なし | ✅ |

**結果**: spec.json とファイル存在の整合性は完全に一致。

### 1.2 Requirements ↔ Design Alignment

**実施不可**: design.md が未作成のため。

### 1.3 Design ↔ Tasks Alignment

**実施不可**: design.md、tasks.md ともに未作成のため。

### 1.4 Acceptance Criteria → Tasks Coverage

**実施不可**: tasks.md が未作成のため。

### 1.5 Integration Test Coverage

**実施不可**: design.md、tasks.md が未作成のため。

### 1.6 Requirements ↔ ソースコード技術的正確性

requirements.md の記述をソースコードと照合した結果:

| 記述 | ソースコード | 状態 |
|------|------------|------|
| `provider.tsx` と `vanillaClient.ts` で `ipcLink()` が2回呼ばれる | 両ファイルで `ipcLink()` を独立呼出し確認 | ✅ |
| `getVanillaClient()` API を95ファイルが参照 | 未カウントだが広く使用されている | ✅（概算として妥当） |
| `consoleHook.ts` が `getVanillaClient()` に依存 | `consoleHook.ts` で `getVanillaClient().misc.logRenderer.mutate()` を使用 | ✅ |
| `rendererLogger.ts` は `window.electronAPI.logRenderer()` を使用 | **未確認**（レビュー#1 reply で指摘済み） | ⚠️ 設計フェーズで確認 |
| Open Question: `createTRPCClientProxy` の互換性 | **API名が不正確**: 正しくは `createTRPCProxyClient` | ⚠️ WARNING |
| Decision Log: vanillaClient の設計経緯（DD-006） | `structure.md` L342 に DD-006 パターン記載 | ✅ |
| Decision Log: 「前セッションで native 方式を追加した経緯」 | Main プロセスに `console-message` リスナーは**未実装** | ⚠️ INFO |

### 1.7 Cross-Document Contradictions

**steering/logging.md ↔ requirements.md の矛盾（要件4-3で解決予定）**:

レビュー#1 で指摘済み、要件4-3 の追加で対応方針は明確。実装完了後に logging.md が更新される。

**steering/structure.md ↔ requirements.md の潜在的乖離**:

| 項目 | structure.md の記述 | requirements.md の要件 |
|------|--------------------|-----------------------|
| vanillaClient パターン | L342-353: `getVanillaClient()` を `import { getVanillaClient } from '@shared/trpc/vanillaClient'` として使用する例を記載 | 要件1: 内部実装を変更（React client の proxy ラッパーに） |

内部実装のみの変更で API は維持されるため、`structure.md` の使用例は変更不要の可能性が高いが、design フェーズで `vanillaClient.ts` の内部実装が大きく変わる場合（例: `vanillaClient.ts` ファイル自体の移動や統合）は更新が必要になる。

## 2. Gap Analysis

### 2.1 Technical Considerations

**WARNING-1: Open Question の API 名が不正確**

requirements.md の Open Questions に以下の記述がある:

> `createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか、型レベルで互換性の確認が必要

しかし `@trpc/client` に `createTRPCClientProxy` という API は存在しない。正しくは:
- `createTRPCProxyClient` — 現在 `vanillaClient.ts` で既に使用中
- `createTRPCClientProxy` — 存在しない名前

Decision Log でも「`createTRPCClientProxy` は既存 TRPCClient インスタンスをラップ可能」と記述されているが、`createTRPCProxyClient` は `links` 配列を受け取って新規クライアントを作成する API であり、**既存の TRPCClient インスタンスをラップする機能は持っていない**。

この技術的前提は design フェーズの実装方式選択に直接影響するため、明確化が必要。具体的には:
- `trpc.createClient()` が返す内部 `TRPCClient` を `createTRPCProxyClient` でラップできるのか
- ラップ不可の場合、ipcLink シングルトンを共有する別の方式が必要

**INFO-1: console-message リスナーの現状**

Decision Log に「前セッションで native 方式を追加した経緯がある」と記載されているが、ソースコードを調査した結果、Main プロセスに `webContents.on('console-message')` リスナーは存在しない。

考えられる解釈:
1. 前セッションの作業が未コミット/未マージである
2. Decision Log の記述が「追加する方針を決定した」という意味である

いずれの場合も、要件3（console-message native 方式への統一）は**新規実装**として正しく定義されているため、要件自体に問題はない。ただし design フェーズでは「既存の console-message リスナーの拡張」ではなく「新規実装」として設計すべき。

**INFO-2: E2E テストのログキャプチャ影響**

レビュー#1 で INFO-2 として指摘済み（No Fix Needed 判定）。本レビューでも同様の判断を維持する。

### 2.2 Operational Considerations

特に新規の指摘事項なし。

## 3. Ambiguities and Unknowns

### 3.1 Open Question の技術的妥当性

前述の WARNING-1 と重複するが、Open Question の核心部分を再掲:

> `createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか

この質問自体が、不正確な API 名に基づいている。design フェーズでは以下のいずれかの方式を検討する必要がある:

1. **ipcLink シングルトンの共有**: `ipcLink()` を1回だけ呼び、その結果を `vanillaClient` と `provider` の両方で再利用
2. **TRPCClient インスタンスの共有**: `provider.tsx` で作成された TRPCClient を `vanillaClient` から参照
3. **vanillaClient の内部実装変更**: `vanillaClient` が独自の `ipcLink()` を呼ばず、provider の client を参照

### 3.2 Electron console-message イベントのレベル仕様

レビュー#1 で指摘済み（INFO）。要件3-3 で「DEBUG (0)」と記載しているが、Electron の公式仕様では level 0 は "verbose"。design フェーズでマッピング定義を明確にすべき。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好**: 要件は既存アーキテクチャと整合しており、レビュー#1 から変更なし。

### 4.2 Integration Concerns

**WARNING-2: steering 更新範囲の不足（structure.md）**

要件4の Acceptance Criteria は `tech.md`（4-1, 4-2）と `logging.md`（4-3）を対象としている。しかし `structure.md` にも vanillaClient パターンの記述（L342-353）があり、内部実装変更に伴って更新が必要になる可能性がある。

現時点では API 互換を維持するため `structure.md` の使用例自体は変更不要の可能性が高いが、design フェーズで vanillaClient の実装方式が確定した後に判断すべき。design.md または tasks.md で structure.md 更新の要否を明示的に検討することを推奨する。

### 4.3 Migration Requirements

特になし。レビュー#1 と同様。

## 5. Recommendations

### Critical Issues (Must Fix)

なし。

### Warnings (Should Address)

| # | 問題 | 推奨アクション |
|---|------|--------------|
| WARNING-1 | Open Question の API 名不正確（`createTRPCClientProxy` → 正しくは `createTRPCProxyClient`）。かつ、Decision Log の「既存 TRPCClient をラップ可能」の前提が技術的に正確か未検証 | requirements.md の Open Question を修正。design フェーズでの技術検証項目として明確化 |
| WARNING-2 | steering 更新対象に `structure.md` が含まれていない | design フェーズで structure.md 更新の要否を検討し、必要なら tasks に含める |

### Suggestions (Nice to Have)

| # | 提案 | 理由 |
|---|------|------|
| INFO-1 | Decision Log の「前セッションで native 方式を追加」を「native 方式への移行を決定」に修正 | ソースコードに console-message リスナーが存在しないため、誤解を招く可能性 |
| INFO-2 | E2E テストのログキャプチャ影響評価 | レビュー#1 から引き継ぎ。tasks フェーズで対応可能 |
| INFO-3 | 要件3-3 の「DEBUG (0)」を「verbose/DEBUG (0)」に修正 | Electron 公式仕様の level 0 は "verbose"。命名の明確化 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| **WARNING** | Open Question の API 名不正確 | `createTRPCClientProxy` → `createTRPCProxyClient` に修正。技術的前提を design フェーズの検証項目に明記 | `requirements.md` |
| **WARNING** | structure.md 更新の検討漏れ | design フェーズで vanillaClient パターン記述の更新要否を判断 | `design.md`（未作成） |
| **INFO** | Decision Log の記述精度 | 「追加した経緯」→「移行を決定した経緯」に修正を検討 | `requirements.md` |
| **INFO** | verbose/DEBUG レベル名 | 要件3-3 の修正を検討 | `requirements.md` |

---

_This review was generated by the document-review command._
