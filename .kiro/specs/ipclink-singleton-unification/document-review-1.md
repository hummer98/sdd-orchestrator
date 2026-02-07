# Specification Review Report #1

**Feature**: ipclink-singleton-unification
**Review Date**: 2026-02-07
**Documents Reviewed**:
- `.kiro/specs/ipclink-singleton-unification/spec.json`
- `.kiro/specs/ipclink-singleton-unification/requirements.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`
- `.kiro/steering/logging.md`

## Executive Summary

| 種別 | 件数 |
|------|------|
| **CRITICAL** | 2 |
| **WARNING** | 3 |
| **INFO** | 2 |

**主要な問題**: spec.json が `design-generated`（design承認済み）と記録しているが、`design.md` ファイルが存在しない重大な不整合がある。また、design.md と tasks.md が未作成のため、要件↔設計↔タスク間の整合性チェックは実施不可。本レビューは requirements.md 単体の品質と steering との整合性に集中する。

## 1. Document Consistency Analysis

### 1.1 spec.json ↔ ファイル存在の不整合

| フィールド | spec.json の値 | ファイル存在 | 状態 |
|-----------|---------------|------------|------|
| `phase` | `design-generated` | - | - |
| `approvals.requirements.generated` | `true` | `requirements.md` あり | ✅ |
| `approvals.requirements.approved` | `true` | - | ✅ |
| `approvals.design.generated` | `true` | **`design.md` なし** | ❌ **CRITICAL** |
| `approvals.design.approved` | `true` | **`design.md` なし** | ❌ **CRITICAL** |
| `approvals.tasks.generated` | `false` | `tasks.md` なし | ✅ |

**CRITICAL-1**: `spec.json` が `design.generated: true, design.approved: true` と記録しているが、`design.md` ファイルが物理的に存在しない。ワークフローの整合性が破壊されており、このまま `spec-tasks` を実行しても design.md を参照できずエラーになる可能性が高い。

### 1.2 Requirements ↔ Design Alignment

**実施不可**: design.md が存在しないため、要件と設計の整合性チェックは不可能。

### 1.3 Design ↔ Tasks Alignment

**実施不可**: design.md、tasks.md ともに存在しないため、チェック不可能。

### 1.4 Acceptance Criteria → Tasks Coverage

**実施不可**: tasks.md が存在しないため、チェック不可能。

### 1.5 Integration Test Coverage

**実施不可**: design.md、tasks.md が存在しないため、チェック不可能。

### 1.6 Cross-Document Contradictions

**steering/logging.md ↔ requirements.md の矛盾予告**:

| 項目 | steering/logging.md の記述 | requirements.md の要件 |
|------|---------------------------|----------------------|
| consoleHook | レイヤー構成として `consoleHook.ts` を現行アーキテクチャとして説明 | 要件3-7: `consoleHook.ts` および `noiseFilter.ts` を削除 |
| consoleHook有効環境 | 「development, e2e のみ」と記載 | 要件3: 廃止して `console-message` native方式に統一 |
| rendererLogger | 「全環境で有効」として推奨 | Out of Scope: `rendererLogger.ts` の廃止は対象外 |

**注**: これは実装完了後に steering/logging.md の更新が必要であることを示す。要件4（steering更新）は tech.md のみを対象としているが、logging.md のアーキテクチャ説明も更新が必要。

## 2. Gap Analysis

### 2.1 Technical Considerations

**WARNING-1: consoleHook 削除後の rendererLogger 動作への影響が未分析**

requirements.md の Out of Scope に「`rendererLogger.ts` の廃止（notificationStore が依存しており、ipcLink 修正後は正常動作する）」と記載されているが、以下の点が曖昧：
- `rendererLogger` は `window.electronAPI.logRenderer()` を使用する（IPC直接呼び出し）
- `consoleHook` は `getVanillaClient()` 経由の tRPC mutation を使用する
- 両者は異なる IPC 経路を使用しているため、ipcLink 修正は rendererLogger には直接影響しないはず
- しかし `contextProvider.ts` の廃止が Out of Scope とされており、rendererLogger が contextProvider に依存している場合の影響確認が必要

**WARNING-2: logging.md の steering 更新が要件に含まれていない**

要件4の Acceptance Criteria は `tech.md` の vanillaClient セクション更新のみ。consoleHook セクションを含む `logging.md` の更新が要件から漏れている。

**INFO-1: `ipcLink()` 複数呼び出し検出メカニズムの具体性**

要件1-4「ビルドまたはテストで検出可能であること」は、検出方法が曖昧。以下のいずれかを design フェーズで明確にすべき：
- ESLint カスタムルール
- ユニットテストでの import カウント検証
- ランタイムアサーション（シングルトンパターンの enforce）

### 2.2 Operational Considerations

**INFO-2: E2E テストの影響評価不足**

Out of Scope に「E2Eテストの追加・修正（既存テストの互換性確保のみ）」とあるが、consoleHook 削除により E2E テストのログキャプチャ方式が変わる可能性がある。requirements.md の要件3-1 で「全環境で `console-message` リスナーを登録」としているため、E2E 環境でのログ取得は native 方式に統一されるが、既存 E2E テストがこの変更に影響を受けないかの確認が必要。

## 3. Ambiguities and Unknowns

### 3.1 Open Questions の未解決

requirements.md に以下の Open Question が記載されているが、未解決のまま design フェーズに進んだ形跡がある：

> `createTRPCClientProxy` が `trpc.createClient()` の返り値を受け入れるか、型レベルで互換性の確認が必要（設計フェーズで検証）

design.md が存在しないため、この検証が行われたか不明。

### 3.2 `console-message` イベントのレベルマッピング

要件3-3〜3-6 で Renderer console レベル（数値 0-3）から logger レベルへのマッピングを定義しているが、Electron の `console-message` イベントは `level` を数値（0=verbose, 1=info, 2=warning, 3=error）で提供する。要件3-3 では「DEBUG (0)」としているが、Electron の仕様では level 0 は "verbose" である。命名の不一致が混乱を招く可能性がある。

### 3.3 diagnostic コードの位置づけ

Decision Log で「そのまま残す」と決定された diagnostic コードについて、requirements.md の Acceptance Criteria には含まれていない。これは意図的（既存コードを触らない）と理解できるが、明示的に記載があると明確になる。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**良好**: 要件は既存アーキテクチャ（tRPC、EventBus パターン、Zustand stores）と整合している。`getVanillaClient()` の API 互換性維持は95ファイルへの影響を回避する妥当な判断。

### 4.2 Integration Concerns

**WARNING-3: Remote UI への影響明記は良好だが、shared/trpc/ ディレクトリの変更影響**

requirements.md の Out of Scope に「Remote UI は `ipcLink` を使用しない」と明記されているのは良い。ただし、`shared/trpc/vanillaClient.ts` は `src/shared/` に配置されており、Remote UI のビルド対象に含まれる。vanillaClient の内部実装変更が Remote UI ビルドに影響しないことの確認が design フェーズで必要。

### 4.3 Migration Requirements

特になし。本仕様は既存 API（`getVanillaClient()`）の内部実装変更であり、データマイグレーションは不要。

## 5. Recommendations

### Critical Issues (Must Fix)

| # | 問題 | 推奨アクション |
|---|------|--------------|
| CRITICAL-1 | `spec.json` が design 承認済みと記録しているが `design.md` が存在しない | `spec.json` を `requirements-approved` に戻すか、`design.md` を再生成する |
| CRITICAL-2 | design.md 不在により仕様の完全なレビューが不可能 | design.md を生成・承認してから再レビュー |

### Warnings (Should Address)

| # | 問題 | 推奨アクション |
|---|------|--------------|
| WARNING-1 | consoleHook 削除後の rendererLogger/contextProvider の動作確認不足 | design フェーズで依存関係を図示し、影響範囲を明確化 |
| WARNING-2 | `logging.md` の steering 更新が要件に含まれていない | 要件4 に `logging.md` 更新の Acceptance Criteria を追加、または design/tasks で対応 |
| WARNING-3 | shared/trpc/ 変更の Remote UI ビルドへの影響 | design フェーズで Remote UI ビルド互換性を確認 |

### Suggestions (Nice to Have)

| # | 提案 | 理由 |
|---|------|------|
| INFO-1 | `ipcLink()` 複数呼び出し検出の具体方式を design で明確化 | 要件1-4 の実現方法が不明確 |
| INFO-2 | E2E テストのログキャプチャ方式変更の影響を評価 | consoleHook 廃止による間接的影響 |

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| **CRITICAL** | design.md 不在 | spec.json を修正するか design.md を再生成 | `spec.json` |
| **CRITICAL** | 完全なレビュー不可 | design.md + tasks.md 完成後に再レビュー実施 | 全ドキュメント |
| **WARNING** | logging.md 更新漏れ | 要件4 の Acceptance Criteria 拡張 | `requirements.md` |
| **WARNING** | rendererLogger 影響分析 | design.md で依存グラフ作成 | `design.md`（未作成） |
| **WARNING** | Remote UI ビルド互換性 | design.md で確認事項追加 | `design.md`（未作成） |
| **INFO** | ipcLink 検出方式 | design フェーズで具体化 | `design.md`（未作成） |
| **INFO** | E2E ログ影響 | tasks フェーズで検証タスク追加 | `tasks.md`（未作成） |

---

_This review was generated by the document-review command._
