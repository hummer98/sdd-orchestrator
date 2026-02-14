# Specification Review Report #2

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Documents Reviewed**:
- `spec.json`
- `requirements.md`（Review #1の修正適用済み）
- `design.md`（Review #1の修正適用済み）
- `tasks.md`（Review #1の修正適用済み）
- `research.md`
- `document-review-1.md`
- `document-review-1-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`
- `.kiro/steering/logging.md`

**Previous Review**: Review #1（2件Critical、4件Warning、3件Info）→ 修正適用済み（5件Fix Required）

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| Critical | 1 |
| Warning | 3 |
| Info | 2 |

Review #1で指摘されたCritical Issue（コールバック安定化漏れ、セレクター対象ファイル漏れ）は全て修正適用済み。本Round 2では、ソースコード実態との詳細照合により、design.mdの変更対象ファイル一覧に**追加のストア購読漏れ**が発見された。主にApp.tsxが購読しているrenderer/stores系ストアと、一部のコンポーネントが購読しているshared/stores系ストアに関するものである。

## 0. Review #1 修正適用状況の検証

Review #1で修正が必要とされた5件の適用状況を検証した。

| Issue | Status | 詳細 |
|-------|--------|------|
| C-001 コールバック安定化漏れ | ✅ 修正済み | design.md 367-371行にAgentList.tsx、ScheduleTaskSettingView.tsx内ScheduleTaskListを追加。tasks.md Task 5.5追加 |
| C-002 セレクター対象ファイル漏れ | ✅ 修正済み | design.md 348行にRemoteAccessDialog.tsx追加、357-358行にDocsTreeSection.tsx追加。tasks.md Task 2.4にRemoteAccessDialog追加、Task 4.2追加 |
| W-002 ScheduleTaskSettingView曖昧性 | ✅ 修正済み | design.md 357行に「14フィールドを全購読、tRPCヘルパーとは別にストアを直接購読」を補記 |
| W-004 Req 1.3記述の明確化 | ✅ 修正済み | requirements.md 55行のuseSharedAgentStore記述を明確化 |
| S-002 タイポ修正 | ✅ 修正済み | requirements.md「App.txs」→「App.tsx」修正 |

**結論**: Review #1の全修正項目が適切に適用されている。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design 整合性

Review #1修正後、全Requirementに対するDesign Coverageは良好。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: Zustandセレクターパターン統一 | Architecture Pattern + Selector Migration + ファイル一覧 | ⚠️ 一部ストア漏れ |
| Req 2: リストアイテムメモ化 | ListItem Memoization + DD-002, DD-005 | ✅ |
| Req 3: App.tsxルート最適化 | Requirements Traceability 3.1, 3.2 | ⚠️ App.tsxの全ストア未列挙 |
| Req 4: useShallowユーティリティ導入 | DD-001, DD-003 + Code Patterns | ✅ |
| Req 5: テスト・リグレッション検証 | Testing Strategy + Integration Test Strategy | ✅ |

### 1.2 Design ↔ Tasks 整合性

Review #1修正後、DesignのコンポーネントとTasksの対応は改善された。

| Design Component | Task Coverage | Status |
|-----------------|---------------|--------|
| Selector Migration (24+ files) | Tasks 1.1-1.5, 2.1-2.6, 3.1-3.2, 4.1-4.2 | ⚠️ 追加コンポーネント未対応 |
| BugListItem memo | Task 5.1 | ✅ |
| SpecListItem memo | Task 5.1 | ✅ |
| AgentListItem memo | Task 5.2 | ✅ |
| EventLogListItem memo | Task 5.2 | ✅ |
| ScheduleTaskListItem memo | Task 5.2 | ✅ |
| BugListContainer コールバック安定化 | Task 5.3 | ✅ |
| SpecListContainer コールバック安定化 | Task 5.3 | ✅ |
| AgentList コールバック安定化 | Task 5.4 | ✅ |
| ScheduleTaskList コールバック安定化 | Task 5.5 | ✅ |
| テストモック更新 | Task 6.1 | ✅ |
| TypeScriptチェック | Task 6.2 | ✅ |
| ユニットテスト | Task 6.3 | ✅ |
| ビルド確認 | Task 6.4 | ✅ |

### 1.3 Design ↔ Tasks 完全性チェック

| カテゴリ | Design定義 | Task Coverage | Status |
|----------|-----------|---------------|--------|
| セレクター適用（Renderer） | 25ファイル記載 | Tasks 1.1-2.6 | ⚠️ 追加ファイル・ストア未対応 |
| セレクター適用（Remote UI） | 4ファイル記載 | Tasks 3.1-3.2 | ⚠️ 1ファイル漏れ |
| セレクター適用（Shared） | 2ファイル記載 | Tasks 4.1-4.2 | ✅ |
| React.memo適用 | 5コンポーネント | Tasks 5.1-5.2 | ✅ |
| コールバック安定化 | 4コンテナ記載 | Tasks 5.3-5.5 | ✅ |

### 1.4 Acceptance Criteria → Tasks カバレッジ

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | セレクターなし全購読の解消 | 1.1-1.5, 2.1-2.6, 4.1-4.2 | Feature | ⚠️ 追加コンポーネント未対応 |
| 1.2 | アクション関数のセレクター化対象外 | 1.1, 1.4, 2.1, 2.2, 2.5, 2.6 | Feature | ✅ |
| 1.3 | useSharedBugStore全購読箇所の修正 | 1.1, 1.2, 1.4 | Feature | ✅ |
| 1.4 | Remote UIコンポーネントの修正 | 3.1, 3.2 | Feature | ⚠️ 1ファイル漏れ |
| 2.1 | 5コンポーネントのReact.memo適用 | 5.1, 5.2 | Feature | ✅ |
| 2.2 | インラインコールバックの排除 | 5.3, 5.4, 5.5 | Feature | ✅ |
| 2.3 | shallow equalでのprops比較 | 5.1, 5.2 | Feature | ✅ |
| 3.1 | renderer/App.tsxのセレクター最適化 | 1.1 | Feature | ⚠️ ストア一覧不完全 |
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
- [ ] Criterion 1.1の「セレクターなしの全購読パターンが解消されること」に対し、追加ストア購読の未対応あり

### 1.5 統合テストカバレッジ

本変更はRenderer内部の最適化であり、IPC/イベント/ストア同期の境界を越えた新しい統合パスは導入しない。Review #1と同じ評価。

| Integration Point | Design Section | Test Strategy | Status |
|-------------------|----------------|---------------|--------|
| Store → Selector → Component | Selector Migration Pattern | 既存E2Eテストで担保 | ✅ |
| React.memo → props比較 | ListItem Memoization | 既存ユニットテスト + E2E | ✅ |

### 1.6 クロスドキュメント矛盾

| # | 箇所 | 矛盾内容 | 重要度 |
|---|------|---------|--------|
| 1 | design.md:324 vs ソースコード | App.tsxのストア一覧に6つのストアが未記載（後述C-003） | Critical |
| 2 | requirements.md Req 1.1 vs design.md | Req 1.1は「全コンポーネント」のセレクター化を要求しているが、design.mdの一覧に含まれていないコンポーネント/ストアがある | Warning |

## 2. Gap Analysis

### 2.1 技術的考慮事項

#### CRITICAL: App.tsxの購読ストア一覧の不完全性（C-003）

ソースコード調査の結果、`src/renderer/App.tsx`は以下の**12ストア**を購読しているが、design.md 324行のストア一覧には6ストアのみ記載されている。

**design.mdに記載されているストア（6個）**:
- `useProjectStore` ✅
- `useSpecStore` ✅
- `useSharedBugStore` ✅
- `useAgentStore` ✅
- `useMcpStore` ✅
- `useNotificationStore` ✅

**design.mdに記載されていないストア（6個）**:
1. `useEditorStore()` → `const { isDirty } = useEditorStore();`（renderer/stores - UI State）
2. `useWorkflowStore()` → `const { setCommandPrefix } = useWorkflowStore();`（renderer/stores - UI State）
3. `useConnectionStore()` → 複数フィールドを分割代入（renderer/stores - UI State）
4. `useToolPathStore()` → `const { fetchStatuses: fetchToolStatuses } = useToolPathStore();`（shared/stores）
5. `useProjectEditorStore()` → `const { clearEditor } = useProjectEditorStore();`（shared/stores）
6. `useRemoteAccessStore()` → 4フィールドを分割代入（renderer/stores - UI State）

**分析**:
- `useEditorStore`, `useWorkflowStore`, `useConnectionStore` は **renderer/stores**（UI State）に配置されたストアである
- `useToolPathStore`, `useProjectEditorStore` は **shared/stores**（Domain State SSOT）に配置されたストアである
- `useRemoteAccessStore` は **renderer/stores** に配置されたストアである

Req 1.1は「セレクターなしの全購読パターンが解消されること」を要求しており、UI Stateストアも含めて全てのセレクターなし購読が対象に含まれるはずである。ただし、アクション関数のみ使用するケース（Req 1.2: `setCommandPrefix`, `clearEditor`, `fetchStatuses`等）は対象外とする判定が可能。

#### WARNING: App.tsx以外の追加コンポーネントの漏れ（W-005）

ソースコード調査の結果、以下のコンポーネントもストアをセレクターなしで購読しているが、design.mdの変更対象ファイル一覧に含まれていない:

| ファイル | ストア | 使用フィールド |
|----------|--------|---------------|
| `src/renderer/components/ArtifactEditor.tsx` | `useEditorStore()` | 7+フィールド分割代入 |
| `src/renderer/components/ToolSettingsPanel.tsx` | `useToolPathStore()` | 複数フィールド分割代入 |
| `src/renderer/components/ProjectPane.tsx` | `useProjectEditorStore()` | 複数フィールド分割代入 |
| `src/renderer/components/ProjectFileEditor.tsx` | `useProjectEditorStore()` | 複数フィールド分割代入 |
| `src/remote-ui/components/RemoteProjectEditor.tsx` | `useProjectEditorStore()` | 複数フィールド分割代入 |
| `src/renderer/components/RemoteAccessPanel.tsx` | `useRemoteAccessStore()` | 複数フィールド分割代入 |

**Note**: ProjectPane.tsxはuseProjectStore購読としてdesign.mdに記載されているが、useProjectEditorStore購読は未記載。RemoteAccessPanel.tsxはuseProjectStore購読として記載されているが、useRemoteAccessStore購読は未記載。

#### WARNING: Remote UI追加コンポーネントの漏れ（W-006）

design.mdのセレクター適用対象（Remote UI）セクションに以下が含まれていない:

| ファイル | ストア | 使用フィールド |
|----------|--------|---------------|
| `src/remote-ui/components/RemoteProjectEditor.tsx` | `useProjectEditorStore()` | 複数フィールド分割代入 |

Req 1.4は「Remote UIコンポーネントも同様に修正されること」を要求している。

#### WARNING: useElectronWorkflowState内のuseWorkflowStore全購読（W-007）

`src/renderer/hooks/useElectronWorkflowState.ts`の66行目:
```typescript
const workflowStore = useWorkflowStore();
```

design.md 347行には `useSpecStore` のみ記載されているが、`useWorkflowStore` もセレクターなしで全購読されている。

### 2.2 運用上の考慮事項

Review #1から変更なし。

- **ロールバック戦略**: git revertで対応可能。問題は軽微
- **ドキュメント更新**: セレクターパターンの基準をsteering文書に反映する計画は、実装完了後に対応（Review #1 W-003の判断維持）

## 3. Ambiguities and Unknowns

| # | 箇所 | 曖昧性 | 影響 |
|---|------|--------|------|
| 1 | requirements.md Req 1.1 | 「全コンポーネント」の範囲にrenderer/stores（UI State）のストアが含まれるか不明確。共有ストア（shared/stores）のみを対象とするのか、renderer固有のUI Stateストアも含めるのか | Warning: スコープの明確化が必要 |
| 2 | design.md DD-005 | Review #1 W-001と同じ。コールバックパターンの最終選択は実装時判断。既にNo Fix Neededと判断済み | Info: 維持 |

## 4. Steering 整合性

### 4.1 アーキテクチャ互換性

| Steering原則 | 整合性 | Status |
|-------------|--------|--------|
| DRY | useShallowパターンの統一使用基準を確立 | ✅ |
| SSOT | shared/storesのSSOT原則を維持 | ✅ |
| KISS | 既存パターンの拡張、新しい複雑性なし | ✅ |
| YAGNI | カスタム等価比較関数を不要と判断 | ✅ |
| State Management Rules | shared/storesをSSOTとして維持、購読方法のみ変更 | ✅ |
| Electron Process Boundary | Renderer内部の最適化、境界に影響なし | ✅ |
| AI設計判断原則 | プロジェクト全体を対象とする根本解決 | ✅ |

### 4.2 統合上の懸念

- Review #1と同じ評価。追加の懸念なし。

### 4.3 マイグレーション要件

- Review #1と同じ評価。追加の要件なし。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **C-003: App.tsxの購読ストア一覧が不完全**
   - design.md 324行のApp.tsxストア一覧に6つのストアが未記載
   - **最低限の修正**: design.md 324行に `useEditorStore, useWorkflowStore, useConnectionStore, useToolPathStore, useProjectEditorStore, useRemoteAccessStore` を追加
   - **判断が必要**: これらのストアのうちアクション関数のみ使用しているもの（`useWorkflowStore`: setCommandPrefix、`useProjectEditorStore`: clearEditor、`useToolPathStore`: fetchStatuses）はReq 1.2に基づきセレクター化対象外と明示できる。stateフィールドを含むもの（`useEditorStore`: isDirty、`useConnectionStore`: 複数フィールド、`useRemoteAccessStore`: 複数フィールド）はセレクター適用が必要
   - tasks.md Task 1.1の記述にも追加ストアの言及が必要

### Warnings (Should Address)

1. **W-005: App.tsx以外の追加コンポーネント/ストアの漏れ**
   - `ArtifactEditor.tsx`（useEditorStore）、`ToolSettingsPanel.tsx`（useToolPathStore）、`ProjectPane.tsx`（useProjectEditorStore）、`ProjectFileEditor.tsx`（useProjectEditorStore）、`RemoteAccessPanel.tsx`（useRemoteAccessStore）が変更対象ファイル一覧に未記載
   - **推奨**: design.mdの変更対象ファイル一覧に各ファイルの追加ストア購読を記載。tasks.mdの該当タスクにも反映

2. **W-006: Remote UIコンポーネントの漏れ**
   - `RemoteProjectEditor.tsx`（useProjectEditorStore）がRemote UIセクションに未記載
   - **推奨**: design.md 350行以降のRemote UIセクションに追加。tasks.md Task 3.2にも追加

3. **W-007: useElectronWorkflowState内のuseWorkflowStore購読未記載**
   - design.md 347行には`useSpecStore`のみ記載だが、`useWorkflowStore`も全購読している
   - **推奨**: design.md 347行に`useWorkflowStore`を追加。tasks.md Task 1.5にも反映

### Suggestions (Nice to Have)

1. **S-004: renderer/stores vs shared/storesのスコープ明確化**
   - requirements.md Req 1.1の「セレクターなしの全購読パターンが解消されること」が、renderer/stores（UI State）のストアも対象に含むかを明示すべき
   - **参考**: renderer/storesはUI専用状態（editorStore, modalStore等）であり、stateフィールドが少ないケースもある。しかしReq 1.1の文言は「全購読パターンの解消」を要求しており、UI Stateも対象に含まれると解釈可能

2. **S-005: design.mdのストア分類の整理**
   - design.mdの変更対象ファイル一覧が「ストアの所在」（shared/stores vs renderer/stores）を区別していない。セレクター適用の必要性判断にはストアの種類が重要
   - **参考**: 各ファイルの購読ストアを「shared/stores（Domain State）」と「renderer/stores（UI State）」に分類して記載することで、実装時の判断が容易になる

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-003 App.tsxストア一覧不完全 | design.md 324行に6つの追加ストアを記載、アクション専用ストアの除外判定を明記。tasks.md Task 1.1に反映 | design.md, tasks.md |
| Warning | W-005 追加コンポーネント/ストア漏れ | design.mdの変更対象リストとtasks.mdに追加コンポーネントの購読ストアを記載 | design.md, tasks.md |
| Warning | W-006 Remote UI追加ファイル漏れ | design.mdのRemote UIセクションにRemoteProjectEditor.tsxを追加、tasks.md Task 3.2に反映 | design.md, tasks.md |
| Warning | W-007 useWorkflowStore購読未記載 | design.md 347行にuseWorkflowStoreを追加、tasks.md Task 1.5に反映 | design.md, tasks.md |
| Info | S-004 スコープ明確化 | requirements.md Req 1.1にrenderer/storesの対象範囲を明記 | requirements.md |
| Info | S-005 ストア分類の整理 | design.mdの変更対象リストにストア所在の分類を追加 | design.md |

---

_This review was generated by the document-review command._
