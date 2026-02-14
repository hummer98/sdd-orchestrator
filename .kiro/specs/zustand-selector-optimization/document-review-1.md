# Specification Review Report #1

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Documents Reviewed**:
- `spec.json`
- `requirements.md`
- `design.md`
- `tasks.md`
- `research.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`
- `.kiro/steering/logging.md`

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| Critical | 2 |
| Warning | 4 |
| Info | 3 |

全体として非常に良く構造化されたspecであり、Requirements → Design → Tasks のトレーサビリティが確保されている。主な問題は、コールバック安定化対象の一部漏れと、セレクター適用対象ファイルの網羅性に関するものである。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design 整合性

全体的に良好な整合性を保っている。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: Zustandセレクターパターン統一 | Architecture Pattern + Selector Migration Pattern | ✅ |
| Req 2: リストアイテムメモ化 | ListItem Memoization + DD-002, DD-005 | ✅ |
| Req 3: App.tsxルート最適化 | Requirements Traceability 3.1, 3.2 | ✅ |
| Req 4: useShallowユーティリティ導入 | DD-001, DD-003 + Code Patterns | ✅ |
| Req 5: テスト・リグレッション検証 | Testing Strategy + Integration Test Strategy | ✅ |

**軽微な問題**:
- requirements.md 83行目: `Requirement 3: App.txs` → `App.tsx` のタイポ（Info）

### 1.2 Design ↔ Tasks 整合性

Design の全コンポーネントに対応するタスクが存在する。

| Design Component | Task Coverage | Status |
|-----------------|---------------|--------|
| Selector Migration (24+ files) | Tasks 1.1-1.5, 2.1-2.6, 3.1-3.2, 4.1 | ✅ |
| BugListItem memo | Task 5.1 | ✅ |
| SpecListItem memo | Task 5.1 | ✅ |
| AgentListItem memo | Task 5.2 | ✅ |
| EventLogListItem memo | Task 5.2 | ✅ |
| ScheduleTaskListItem memo | Task 5.2 | ✅ |
| BugListContainer コールバック安定化 | Task 5.3 | ✅ |
| SpecListContainer コールバック安定化 | Task 5.3 | ✅ |
| テストモック更新 | Task 6.1 | ✅ |
| TypeScriptチェック | Task 6.2 | ✅ |
| ユニットテスト | Task 6.3 | ✅ |
| ビルド確認 | Task 6.4 | ✅ |

### 1.3 Design ↔ Tasks 完全性チェック

| カテゴリ | Design定義 | Task Coverage | Status |
|----------|-----------|---------------|--------|
| セレクター適用（Renderer） | 24ファイル記載 | Tasks 1.1-2.6 | ⚠️ 2ファイル漏れ |
| セレクター適用（Remote UI） | 4ファイル記載 | Tasks 3.1-3.2 | ✅ |
| セレクター適用（Shared） | 1ファイル記載 | Task 4.1 | ✅ |
| React.memo適用 | 5コンポーネント | Tasks 5.1-5.2 | ✅ |
| コールバック安定化 | 2コンテナ記載 | Tasks 5.3-5.4 | ⚠️ 1コンテナ漏れ |

**問題詳細**: 1.3節の詳細は下記のCritical Issuesセクションを参照。

### 1.4 Acceptance Criteria → Tasks カバレッジ

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | セレクターなし全購読の解消 | 1.1-1.5, 2.1-2.6, 4.1 | Feature | ✅ |
| 1.2 | アクション関数のセレクター化対象外 | 1.1, 1.4, 2.1, 2.2, 2.5, 2.6 | Feature | ✅ |
| 1.3 | useSharedBugStore全購読箇所の修正 | 1.1, 1.2, 1.4 | Feature | ✅ |
| 1.4 | Remote UIコンポーネントの修正 | 3.1, 3.2 | Feature | ✅ |
| 2.1 | 5コンポーネントのReact.memo適用 | 5.1, 5.2 | Feature | ✅ |
| 2.2 | インラインコールバックの排除 | 5.3, 5.4 | Feature | ⚠️ 一部漏れ |
| 2.3 | shallow equalでのprops比較 | 5.1, 5.2 | Feature | ✅ |
| 3.1 | renderer/App.tsxのセレクター最適化 | 1.1 | Feature | ✅ |
| 3.2 | remote-ui/App.tsxの最適化 | 3.1 | Feature | ✅ |
| 4.1 | useShallowインポートパターン確立 | 1.1 | Feature | ✅ |
| 4.2 | useShallow使用基準の明確化 | 1.1 | Feature | ✅ |
| 5.1 | 既存ユニットテストの通過 | 6.1, 6.3 | Validation | ✅ |
| 5.2 | 既存E2Eテストの通過 | (E2Eは動作変更なしで既存テストが担保) | Validation | ✅ |
| 5.3 | TypeScript型チェックの通過 | 6.2, 6.4 | Validation | ✅ |

**Validation Results**:
- [x] 全criterion IDがtasks.mdのRequirements Coverage Matrixに記載済み
- [x] User-facing criteriaにFeature Implementation tasksあり
- [x] Infrastructure-onlyのcriterionなし
- [ ] Criterion 2.2のコールバック安定化対象に一部漏れ（Warning参照）

### 1.5 統合テストカバレッジ

本変更はRenderer内部の最適化であり、IPC/イベント/ストア同期の境界を越えた新しい統合パスは導入しない。

| Integration Point | Design Section | Test Strategy | Status |
|-------------------|----------------|---------------|--------|
| Store → Selector → Component | Selector Migration Pattern | 既存E2Eテストで担保 | ✅ |
| React.memo → props比較 | ListItem Memoization | 既存ユニットテスト + E2E | ✅ |

**Validation Results**:
- [x] 新しいIPC通信パスなし（統合テスト不要と判断）
- [x] 既存E2Eテスト（Electron 70+件、Web 18件）をリグレッションガードとして使用
- [x] 新規統合テスト不要の判断は妥当（内部最適化のため）

### 1.6 クロスドキュメント矛盾

| # | 箇所 | 矛盾内容 | 重要度 |
|---|------|---------|--------|
| 1 | requirements.md:83 | `App.txs` → `App.tsx` のタイポ | Info |
| 2 | design.md:74 | `Zustand 5.0.8` と記載あるが、research.mdでは「Zustand v5」と一般的に言及。バージョン表記は一致しており実質的な矛盾なし | Info |

## 2. Gap Analysis

### 2.1 技術的考慮事項

#### CRITICAL: セレクター適用対象ファイルの網羅性不足

ソースコード調査の結果、design.mdの「変更対象ファイル一覧」に以下のファイルが含まれていない:

1. **`src/renderer/components/RemoteAccessDialog.tsx`** - `useRemoteAccessStore`を分割代入で使用
2. **`src/shared/components/project/DocsTreeSection.tsx`** - ストアを分割代入で使用

これらのファイルがセレクター適用対象から漏れている場合、最適化の網羅性が損なわれる。

#### CRITICAL: コールバック安定化対象の漏れ

design.mdの「インラインコールバック安定化対象」セクション（365-368行）には`BugListContainer`と`SpecListContainer`の2つのみが記載されている。しかし、ソースコード調査の結果、以下の追加コンテナでもインラインコールバックが使用されている:

1. **`AgentList.tsx`** - `AgentListItem`に対して3つのインラインコールバック:
   - `onSelect={() => onSelect(agent.agentId)}`
   - `onStop={(e) => onStop(e, agent.agentId)}`
   - `onRemove={(e) => onRemove(e, agent.agentId)}`

2. **`ScheduleTaskSettingView.tsx`（ScheduleTaskListサブコンポーネント）** - `ScheduleTaskListItem`に対して:
   - `onClick={() => onTaskClick(task)}`

**Note**: tasks.mdにはTask 5.4として`AgentListのインラインコールバック安定化`が既に含まれている。しかしdesign.mdの対象一覧には記載がない。`ScheduleTaskSettingView`はdesign.mdにもtasks.mdにも安定化対象として記載がない。

**Note**: `EventLogListItem`はコールバックpropsを受け取らないため（データpropsのみ）、コールバック安定化は不要。

#### ScheduleTaskSettingViewのストア使用状況の曖昧性

design.mdはこのファイルを`useScheduleTaskStore`のセレクター適用対象として記載しているが、実際のコードではtRPCベースのAPIヘルパー関数（`getScheduleTaskAPI()`）を使用しており、ストアの直接的な分割代入使用の程度が不明確。実装時に確認が必要。

### 2.2 運用上の考慮事項

- **ロールバック戦略**: 明示的なロールバック戦略は記載されていないが、git revertで対応可能なリファクタリングであり、問題は軽微
- **ドキュメント更新**: セレクターパターンの使用基準（3+フィールド: useShallow、1-2フィールド: 個別セレクター）をsteering文書に反映する計画が未記載

## 3. Ambiguities and Unknowns

| # | 箇所 | 曖昧性 | 影響 |
|---|------|--------|------|
| 1 | design.md DD-005 | `onSelect: (id: string) => void`パターンへの変更と`onSelect: () => void`維持の両方が選択肢として記載。最終的にどちらを採用するかは「実装時に判断」となっている | Warning: propsインターフェース変更の有無が実装時まで未確定 |
| 2 | design.md:356 | `ScheduleTaskSettingView`のストア使用パターンがtRPCベースのAPIヘルパー経由であり、セレクター適用の必要性が不明確 | Info: 実装時に確認すれば対応可能 |
| 3 | tasks.md:5.2 | `EventLogListItem`のReact.memo適用は記載されているが、親コンポーネント（`EventLogViewerModal`）がコールバックを渡していないため、memo化の効果が限定的な可能性 | Info: 害はないがmemo化のオーバーヘッドのみ |

## 4. Steering 整合性

### 4.1 アーキテクチャ互換性

| Steering原則 | 整合性 | Status |
|-------------|--------|--------|
| DRY | useShallowパターンの統一使用基準を確立 | ✅ |
| SSOT | shared/storesのSSOT原則を維持（ストア自体は変更なし） | ✅ |
| KISS | 既存パターンの拡張であり、新しい複雑性を導入しない | ✅ |
| YAGNI | カスタム等価比較関数を不要と判断（スコープ外に明記） | ✅ |
| State Management Rules | shared/storesをSSOTとして維持、Renderer側の購読方法のみ変更 | ✅ |
| Electron Process Boundary | Renderer内部の最適化であり、Main/Renderer境界に影響なし | ✅ |
| AI設計判断原則 | プロジェクト全体を対象とする根本解決を選択（場当たり的修正を回避） | ✅ |

### 4.2 統合上の懸念

- **既存セレクター使用箇所との一貫性**: `useSharedAgentStore((state) => state.agents)` が既に3箇所で使用されており、新パターンとの一貫性は保たれる
- **`subscribeWithSelector`ミドルウェアとの競合**: design.mdで明確に「競合なし」と記載されており、research.mdでも確認済み

### 4.3 マイグレーション要件

- **データマイグレーション**: 不要（UIのみの内部変更）
- **段階的ロールアウト**: design.mdの段階的修正戦略（ストアごと）がresearch.mdのDesign Decisionsとも一致
- **後方互換性**: propsインターフェースの変更は原則なし（DD-005でのonSelect変更は内部変更に留まる）

## 5. Recommendations

### Critical Issues (Must Fix)

1. **C-001: コールバック安定化対象の漏れ（design.md + tasks.md）**
   - design.mdの「インラインコールバック安定化対象」セクションに`AgentList.tsx`が記載されていない（tasks.mdにはTask 5.4として存在するが、design.mdとの不一致）
   - `ScheduleTaskSettingView.tsx`のScheduleTaskListサブコンポーネントがdesign.mdにもtasks.mdにも安定化対象として記載されていない
   - **修正**: design.md 365-368行に`AgentList.tsx`と`ScheduleTaskSettingView.tsx`を追加。tasks.mdにScheduleTaskSettingViewのコールバック安定化タスクを追加

2. **C-002: セレクター適用対象ファイルの漏れ（design.md）**
   - `RemoteAccessDialog.tsx`と`DocsTreeSection.tsx`がdesign.mdの変更対象ファイル一覧に含まれていない
   - **修正**: design.mdの変更対象ファイル一覧に追加するか、対象外である理由を明記

### Warnings (Should Address)

1. **W-001: DD-005のコールバックパターン未確定**
   - `onSelect: (id: string) => void`パターンへの変更か`onSelect: () => void`維持かが未確定。実装時に判断するとされているが、propsインターフェースの変更有無はdesignフェーズで確定すべき
   - **推奨**: design.mdで具体的な採用パターンを決定し記載

2. **W-002: ScheduleTaskSettingViewのストア使用状況の曖昧性**
   - tRPCベースのAPIヘルパー使用のため、`useScheduleTaskStore`のセレクター適用が本当に必要かが不明確
   - **推奨**: 実際のストア購読パターンを確認し、design.mdの対象ファイルリストを更新

3. **W-003: セレクターパターン基準のsteering文書への未反映**
   - 3+フィールド: useShallow、1-2フィールド: 個別セレクターの使用基準が確立されるが、steering文書（`structure.md`や`tech.md`）への反映計画がない
   - **推奨**: 実装完了後にsteering文書をSync更新すること

4. **W-004: requirements.md Req 1.3のリスト正確性**
   - `useSharedAgentStore (shared): BugList, BugsView, SpecsView 等（agents Map購読は既にセレクター使用のため対象外）` の記述で、SpecsViewはuseSharedBugStoreではなくuseSharedAgentStoreを使用しており、「対象外」の括弧書きの意図が不明確
   - **推奨**: requirements.md 55行の記述を明確化

### Suggestions (Nice to Have)

1. **S-001: EventLogListItemのmemo化効果の限定性**
   - `EventLogListItem`はコールバックpropsを受け取らず、データpropsのみ。React.memo適用は害はないが、効果が限定的な可能性がある。判断自体は妥当
   - **参考**: 統一的なリストアイテムの最適化方針として、5コンポーネント全てへの適用は一貫性の観点から妥当

2. **S-002: requirements.mdタイポ修正**
   - 83行目: `App.txs` → `App.tsx`

3. **S-003: E2Eテストのリグレッション検証タイミング**
   - tasks.mdにはE2Eテスト実行のタスクが含まれていない（Req 5.2は「動作変更なしのため既存テストで担保」と記載）。実装完了後のE2Eテスト実行はVerification Commandsで対応可能だが、tasks.mdに明示的なE2Eテスト実行タスクの追加を検討

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-001 コールバック安定化漏れ | design.mdに`AgentList.tsx`と`ScheduleTaskSettingView.tsx`を追加、tasks.mdにScheduleTaskSettingView安定化タスクを追加 | design.md, tasks.md |
| Critical | C-002 セレクター対象ファイル漏れ | `RemoteAccessDialog.tsx`と`DocsTreeSection.tsx`をdesign.mdの対象リストに追加するか対象外理由を明記 | design.md |
| Warning | W-001 コールバックパターン未確定 | DD-005で具体的な採用パターンを確定 | design.md |
| Warning | W-002 ScheduleTaskSettingView曖昧性 | 実際のストア購読パターンを確認しdesign.mdを更新 | design.md |
| Warning | W-003 Steering未反映 | 実装完了後にsteering文書をSync更新 | steering/ |
| Warning | W-004 Req 1.3記述の明確化 | 対象外の括弧書きの意図を明確化 | requirements.md |
| Info | S-002 タイポ修正 | `App.txs` → `App.tsx` | requirements.md |
| Info | S-003 E2Eテストタスク | tasks.mdにE2Eテスト実行タスクの追加を検討 | tasks.md |

---

_This review was generated by the document-review command._
