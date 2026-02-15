# Specification Review Report #1

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `steering/product.md`
- `steering/tech.md`
- `steering/structure.md`
- `steering/design-principles.md`
- ソースコード（実装状態確認）: `renderer/stores/agentStore.ts`, `shared/stores/agentStore.ts`, `shared/api/types.ts`, `renderer/stores/agentStoreAdapter.ts`, `renderer/stores/index.ts`, `shared/hooks/useAgentsBySpec.ts`

## Executive Summary

**全体評価**: 高品質な仕様 — Critical: 0件 / Warning: 4件 / Info: 3件

Requirements, Design, Tasksの3文書間は非常に高い整合性を持つ。全受入基準にFeature Implementationタスクが対応しており、Requirements Coverage Matrixも正確。ソースコード調査により、仕様に記載された既存インターフェースの確認（`AgentInfo`型の`retryCount`/`executionMode`の存在、`useRunningAgentCount`フックの存在等）も事実と一致する。

主な指摘はWarningレベルで、補足説明の追加やテスト戦略の明確化で対応可能。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**結果: 良好** ✅

全7 Requirementsがデザインに反映されている。Requirements Traceabilityテーブル（design.md）に全criterion ID（1.1〜7.4）が含まれ、各criterionに具体的なコンポーネント名とimplementation approachが記載されている。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: ファサード状態フィールド削除 | Architecture Pattern, Components, DD-001 | ✅ |
| Req 2: コンポーネントSSOT直接読み取り | System Flows, Wiring Points | ✅ |
| Req 3: AgentInfo型統一 | Data Models, DD-002 | ✅ |
| Req 4: skipPermissionsのSSOT移行 | Components (SharedAgentStore拡張), DD-003 | ✅ |
| Req 5: runningAgentCountのSSOT移行 | Components (SharedAgentStore拡張), DD-004 | ✅ |
| Req 6: ファサードアクション維持 | Components (useAgentStoreリファクタリング) | ✅ |
| Req 7: テスト更新 | Testing Strategy | ✅ |

**Open Questions解決**: requirements.mdのOpen Questions（型名リネーム、ファイル名変更）はdesign.mdのDD-002, DD-005で明確に決定済み。

### 1.2 Design ↔ Tasks Alignment

**結果: 良好** ✅

Designの全コンポーネント（useSharedAgentStore拡張、useAgentStoreリファクタリング、5コンポーネント移行、型統一、テスト更新）にタスクが対応している。

| Design Component | Task | Status |
|------------------|------|--------|
| useSharedAgentStore拡張 | Task 1.1, 1.2 | ✅ |
| AgentInfo型統一 | Task 2.1, 2.2 | ✅ |
| useAgentStoreアクション専用化 | Task 3.1 | ✅ |
| AgentListPanel移行 | Task 4.1 | ✅ |
| AgentLogPanel移行 | Task 4.2 | ✅ |
| AgentInputPanel移行 | Task 4.3 | ✅ |
| ProjectAgentPanel移行 | Task 4.4 | ✅ |
| SpecList移行 | Task 4.5 | ✅ |
| specStoreFacade更新 | Task 5.1 | ✅ |
| AgentInfo import更新 | Task 5.2 | ✅ |
| テスト更新 | Task 6.1〜6.5 | ✅ |

### 1.3 Design ↔ Tasks Completeness

**結果: 良好** ✅

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| UI Components | 5コンポーネント（AgentListPanel, AgentLogPanel, AgentInputPanel, ProjectAgentPanel, SpecList） | Task 4.1〜4.5 | ✅ |
| Services/Stores | useSharedAgentStore拡張, useAgentStoreリファクタリング | Task 1.1, 1.2, 3.1 | ✅ |
| Types/Models | AgentInfo統一, RendererAgentInfo削除 | Task 2.1, 2.2 | ✅ |
| Adapter | agentStoreAdapter変換関数削除 | Task 2.2 | ✅ |
| Related files | specStoreFacade, CreateSpecDialog等 | Task 5.1, 5.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

**結果: 良好** ✅

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | agents等の状態フィールド削除 | 3.1 | Feature | ✅ |
| 1.2 | subscribe-and-sync削除 | 3.1 | Feature | ✅ |
| 1.3 | 初期化時のgetAgentsFromShared()呼び出し削除 | 3.1 | Feature | ✅ |
| 1.4 | getAgentsFromShared(), calculateRunningCounts()削除 | 3.1 | Feature | ✅ |
| 2.1 | selectedAgentIdのSSOT直接読み取り | 4.1, 4.2, 4.3, 4.4, 5.1 | Feature | ✅ |
| 2.2 | agentsのSSOT直接読み取り | 4.1, 4.2, 4.4, 5.1 | Feature | ✅ |
| 2.3 | logsのSSOT直接読み取り | 4.2 | Feature | ✅ |
| 2.4 | skipPermissionsのSSOT直接読み取り | 4.1 | Feature | ✅ |
| 2.5 | 移行後のコンポーネント動作維持 | 6.5 | Feature | ✅ |
| 3.1 | SharedAgentInfoにretryCount追加 | 2.1（確認のみ） | Feature | ✅ |
| 3.2 | SharedAgentInfoにexecutionMode追加 | 2.1（確認のみ） | Feature | ✅ |
| 3.3 | Renderer固有AgentInfo型の削除 | 2.1 | Feature | ✅ |
| 3.4 | toRendererAgentInfo(), toSharedAgentInfo()削除 | 2.2 | Feature | ✅ |
| 3.5 | 全コンポーネントでSharedAgentInfo使用 | 2.1, 5.2 | Feature | ✅ |
| 4.1 | useSharedAgentStoreにskipPermissions追加 | 1.1 | Feature | ✅ |
| 4.2 | useSharedAgentStoreにsetSkipPermissions追加 | 1.1 | Feature | ✅ |
| 4.3 | ファサードからskipPermissions削除 | 3.1 | Feature | ✅ |
| 4.4 | AgentListPanelがSSOTからskipPermissions読み取り | 4.1 | Feature | ✅ |
| 5.1 | SSOTにgetRunningAgentCount()追加 | 1.2 | Feature | ✅ |
| 5.2 | SpecListがSSOTのgetRunningAgentCount()使用 | 4.5 | Feature | ✅ |
| 5.3 | ファサードからrunningAgentCounts削除 | 3.1 | Feature | ✅ |
| 6.1 | アクションがファサードに残る | 3.1 | Feature | ✅ |
| 6.2 | アクション内部でSSOTメソッド呼び出し | 3.1 | Feature | ✅ |
| 6.3 | setupEventListeners()のtRPC初期化維持 | 3.1 | Feature | ✅ |
| 7.1 | agentStore.test.ts更新 | 6.2, 6.3 | Testing | ✅ |
| 7.2 | コンポーネントテストのモック更新 | 6.4 | Testing | ✅ |
| 7.3 | 全テストパス | 6.5 | Testing | ✅ |
| 7.4 | 共有ストアテスト拡張 | 6.1 | Testing | ✅ |

**Validation Results**:
- [x] 全criterion IDがtasks.mdのRequirements Coverage Matrixに含まれている
- [x] ユーザー向けcriteriaにFeature Implementationタスクが対応
- [x] Infrastructureのみに依存するcriterionはなし

### 1.5 Integration Test Coverage

**結果: 概ね良好（Warning 1件）**

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| SSOT → コンポーネント（Zustandリアクティビティ） | System Flows: 状態読み取りフロー | Task 6.4（コンポーネントテストモック更新） | ✅ |
| ファサード → アダプタ → tRPC → SSOT | System Flows: アクション実行フロー | Task 6.2（ファサードテスト更新） | ✅ |
| SpecList → useRunningAgentCount | Design: SpecList Summary | Task 6.4（SpecList.test.tsx更新） | ✅ |

**⚠️ WARNING W-01: Design.mdのIntegration Test Strategyは「Store-Component統合テスト」を定義しているが、tasks.mdに対応する統合テストタスクが明示的に存在しない**

Design.mdのIntegration Test Strategy（末尾セクション）では「SSOT状態変更 -> Zustandリアクティビティ -> コンポーネント再レンダリング」の統合テストと`waitFor`パターンの使用を記載している。しかしtasks.mdのTask 6.4は「モック構造をuseSharedAgentStore対応に更新する」という既存テスト更新であり、Design.mdが定義する「tRPC vanillaClientをモック。`useSharedAgentStore`はリアル実装を使用」の新規統合テスト作成とは異なる。

既存のコンポーネントテスト更新（Task 6.4）で実質的にカバーされる可能性が高いが、Design.mdとTasks.mdの記述レベルに差異がある。

### 1.6 Cross-Document Contradictions

**結果: 軽微な不整合あり（Warning 2件）**

**⚠️ WARNING W-02: requirements.md Req 3 vs design.md DD-002の型名に関する記述のずれ**

- requirements.md Criterion 3.5: 「全コンポーネントが統一された`SharedAgentInfo`型（**またはリネーム後の`AgentInfo`**）を使用すること」
- design.md DD-002: 「`shared/api/types.ts`の`AgentInfo`をSSOTとし...型名は`AgentInfo`のまま維持（SharedAgentInfoからのリネームはしない）」

実際のソースコード確認の結果、`shared/api/types.ts`では**既に`AgentInfo`として定義**されている（`SharedAgentInfo`ではない）。requirements.mdの「SharedAgentInfo型（またはリネーム後のAgentInfo）」という表現は、型名が既に`AgentInfo`である事実と矛盾する。

**影響**: 実装上の問題は発生しない（design.mdの決定が正確）。requirements.mdの用語がやや misleading。

**⚠️ WARNING W-03: requirements.md「SSOT」vs「SSSOT」の表記揺れ**

- requirements.md Introduction: 「SSSOT」（3つのS）
- requirements.md Req 4タイトル: 「SSSOTの方向性」
- design.md全体: 「SSOT」（2つのS）で統一

「SSOT」(Single Source of Truth) が正しい。requirements.mdの一部で「SSSOT」と余分なSが入っている。

## 2. Gap Analysis

### 2.1 Technical Considerations

**ℹ️ INFO I-01: `startedAt`型変更に伴うコンポーネント側の対応が未記載**

Design.md DD-002のConsequencesで「`startedAt`が`string | number`になるため、ISO文字列前提のコードは型ガードが必要」と記載されているが、tasks.mdのコンポーネント移行タスク（4.1〜4.4）にこの型ガード対応が明示されていない。

実装時に`startedAt`のstring/number判定が必要な箇所を特定する必要がある可能性がある。ただし、現在のRenderer固有`AgentInfo`では`startedAt: string`に制限しており、`shared/api/types.ts`の`AgentInfo`では`startedAt: string | number`であるため、既存コンポーネントが`startedAt`をstring前提で使用している場合は型エラーが検出されるので、コンパイル時に発見可能。

**ℹ️ INFO I-02: `getLogsFromShared()`の削除対象が明示されていない**

ソースコード調査により、ファサードの`setupEventListeners`内のsubscribe-and-syncでは`getAgentsFromShared()`に加え、`getLogsFromShared()`相当のログ同期も含まれている。Task 3.1では`getAgentsFromShared()`と`calculateRunningCounts()`の削除は明示されているが、ログ同期部分については暗黙的にsubscribe-and-sync全体の削除に含まれる。明示性の向上が望ましい。

### 2.2 Operational Considerations

特に問題なし。リファクタリングであり、デプロイ・ロールバック・モニタリングの変更は不要。

## 3. Ambiguities and Unknowns

**ℹ️ INFO I-03: Design.mdのAgentActionStore interfaceにある`setSkipPermissions`と`loadSkipPermissions`の責務境界**

Design.md Components (useAgentStoreリファクタリング) のStateManagementセクションで、AgentActionStore interfaceに`setSkipPermissions(enabled: boolean): void`と`loadSkipPermissions(projectPath: string): Promise<void>`が残されている。

DD-003のConsequencesで「`setSkipPermissions`内でのプロジェクト設定永続化ロジック（tRPC呼び出し）は、ファサードのアクションとして残す」と説明されている。つまり:
- **SSOT**: インメモリ状態（`skipPermissions: boolean`）の管理
- **ファサード**: tRPC経由での永続化と、SSOTの`setSkipPermissions()`を呼び出すラッパー

この責務分担は論理的に妥当だが、ファサードの`setSkipPermissions`がSSOTの`setSkipPermissions`を呼ぶのか、独自に状態を更新するのかが明示されていない。Design.mdの「アクション内部でSSOTのメソッドを呼び出すパターンが維持される」(Req 6.2)に従えば、ファサードからSSOTのメソッドを呼ぶのが正しいパターン。

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**結果: 完全に整合** ✅

- **State Management Rules**: `structure.md`の「Domain State (SSOT)は`src/shared/stores/`に配置」に準拠。ファサードの状態フィールド削除によりSSOT原則がより厳格に適用される
- **Electron Process Boundary Rules**: `structure.md`の「Rendererは状態のキャッシュであり、真実の情報源にならない」原則と完全に一致。subscribe-and-sync廃止はこの原則のより純粋な実装
- **Design Principles**: `design-principles.md`の「根本原因への対処の徹底」に合致。過去2度のバグの構造的原因（状態の二重管理）を排除する設計

### 4.2 Integration Concerns

- **Remote UI**: requirements.mdのOut of Scopeで「Remote UIの`useAgentStore`相当のリファクタリング（Electron Renderer限定）」と明記。Remote UIは`shared/stores/`のSSOTを直接使用しているため、今回の変更はRemote UIに好影響（SSOTの`skipPermissions`追加によりRemote UIでも共有可能）
- **他のファサードストア**: Out of Scopeで除外済み

### 4.3 Migration Requirements

特になし。ランタイムデータの移行は不要（インメモリ状態のリファクタリングのみ）。

## 5. Recommendations

### Critical Issues (Must Fix)

なし。

### Warnings (Should Address)

**W-01**: Design.mdのIntegration Test StrategyとTasks.mdの記述レベルを合わせる。Task 6.4の説明に「リアルuseSharedAgentStore使用の統合テスト」を含めるか、または既存テスト更新で十分であれば、Design.mdのIntegration Test Strategyをそれに合わせて修正する。

**W-02**: requirements.md Criterion 3.5の「SharedAgentInfo型（またはリネーム後のAgentInfo）」を「`AgentInfo`型（`shared/api/types`の統一型）」に修正する。実装コードでは既に`AgentInfo`として定義されており、SharedAgentInfoという名前は使われていない。

**W-03**: requirements.md内の「SSSOT」表記を「SSOT」に統一する。

**W-04（追加）**: Design.md AgentActionStore interfaceに`getAgentById(agentId: string): AgentInfo | undefined`が残されているが、このメソッドは状態読み取りであり「アクション専用」の原則と矛盾する可能性がある。ただし、SSOTの`getAgentById()`への委譲としてファサードに残す判断は実用的であり、Req 6.1のアクションリストにも含まれている。実装時にSSOTへの委譲パターン（`useSharedAgentStore.getState().getAgentById()`）であることを明確にすべき。

### Suggestions (Nice to Have)

**I-01**: tasks.md 4.1〜4.4に「`startedAt: string | number`への型対応が必要な場合は型ガードを追加」の注記を追加。

**I-02**: Task 3.1に`getLogsFromShared()`相当のログ同期コードの削除を明示的に記載。

**I-03**: Design.mdにファサードの`setSkipPermissions`→SSOTの`setSkipPermissions`呼び出しパターンを明示。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | W-01: 統合テスト記述レベル不一致 | Task 6.4の説明を拡充、またはDesign.mdのIntegration Test Strategyを既存テスト更新の文脈に合わせる | `tasks.md` or `design.md` |
| Warning | W-02: SharedAgentInfo型名の用語不整合 | Criterion 3.5を「`AgentInfo`型（`shared/api/types`の統一型）」に修正 | `requirements.md` |
| Warning | W-03: SSSOT表記揺れ | 「SSSOT」→「SSOT」に統一（Introduction, Req 4タイトル） | `requirements.md` |
| Warning | W-04: getAgentByIdの位置づけ明確化 | SSOT委譲パターンであることをDesign.mdのImplementation Notesに追記 | `design.md` |
| Info | I-01: startedAt型変更の注記 | コンポーネント移行タスクに型ガード対応の注記追加 | `tasks.md` |
| Info | I-02: getLogsFromShared()削除の明示 | Task 3.1にログ同期削除を明示 | `tasks.md` |
| Info | I-03: setSkipPermissions委譲パターン | DD-003 ConsequencesにSSOT呼び出しパターンを明示 | `design.md` |

---

_This review was generated by the document-review command._
