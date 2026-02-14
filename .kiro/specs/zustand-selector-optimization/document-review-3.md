# Specification Review Report #3

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Documents Reviewed**:
- `spec.json`
- `requirements.md`（Review #1, #2の修正適用済み）
- `design.md`（Review #1, #2の修正適用済み）
- `tasks.md`（Review #1, #2の修正適用済み）
- `research.md`
- `document-review-1.md`, `document-review-1-reply.md`
- `document-review-2.md`, `document-review-2-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`

**Previous Reviews**:
- Review #1: Critical 2件、Warning 4件、Info 3件 → 全修正適用済み
- Review #2: Critical 1件、Warning 3件、Info 2件 → 全修正適用済み

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| Critical | 1 |
| Warning | 2 |
| Info | 1 |

Review #2で指摘された全修正項目が正しく適用されていることを確認した。ソースコード実態との詳細照合により、design.mdの変更対象ファイル一覧に**useSharedGitViewStoreの全購読コンポーネント3件**が完全に欠落していることが判明した。これはshared/storesのドメインステートストアであり、Req 1.1のスコープに含まれる。また、BugsView.tsx（Remote UI）のuseSharedBugStore全購読がdesign.mdのRemote UIセクションに未記載であること、EventLogListItemの親コンテナのインラインコールバック安定化が未確認であることを発見した。

## 0. Review #2 修正適用状況の検証

Review #2で修正が必要とされた4件（Fix Required）の適用状況を検証した。

| Issue | Status | 詳細 |
|-------|--------|------|
| C-003 App.tsxストア一覧不完全 | ✅ 修正済み | design.md 324行に6つの追加ストア（useEditorStore, useWorkflowStore, useRemoteAccessStore, useConnectionStore, useToolPathStore, useProjectEditorStore）を記載。アクション専用の除外判定を明記 |
| W-005 追加コンポーネント/ストア漏れ | ✅ 修正済み | design.md Rendererセクションに ArtifactEditor.tsx, ToolSettingsPanel.tsx 新規追加。ProjectPane.tsx, ProjectFileEditor.tsx, RemoteAccessPanel.tsx に追加ストア購読を追記 |
| W-006 Remote UI追加ファイル漏れ | ✅ 修正済み | design.md Remote UIセクションに RemoteProjectEditor.tsx を追加。tasks.md Task 3.2にも反映 |
| W-007 useWorkflowStore購読未記載 | ✅ 修正済み | design.md 347行に useWorkflowStore（セレクターなし全購読）を追記。tasks.md Task 1.5にも反映 |

**結論**: Review #2の全修正項目が適切に適用されている。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design 整合性

Review #2修正後、全Requirementに対するDesign Coverageは大幅に改善された。

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: Zustandセレクターパターン統一 | Architecture Pattern + Selector Migration + ファイル一覧（拡充済み） | ⚠️ GitViewStore関連3ファイル欠落 |
| Req 2: リストアイテムメモ化 | ListItem Memoization + DD-002, DD-005 | ✅ |
| Req 3: App.tsxルート最適化 | Requirements Traceability 3.1, 3.2 + 全12ストア記載 | ✅ |
| Req 4: useShallowユーティリティ導入 | DD-001, DD-003 + Code Patterns | ✅ |
| Req 5: テスト・リグレッション検証 | Testing Strategy + Integration Test Strategy | ✅ |

### 1.2 Design ↔ Tasks 整合性

Review #2修正後、DesignのコンポーネントとTasksの対応はほぼ完全に一致。

| Design Component | Task Coverage | Status |
|-----------------|---------------|--------|
| Selector Migration (Renderer 27ファイル) | Tasks 1.1-1.5, 2.1-2.6 | ✅ |
| Selector Migration (Remote UI 5ファイル) | Tasks 3.1-3.2 | ⚠️ BugsView.tsx未記載 |
| Selector Migration (Shared 2ファイル) | Tasks 4.1-4.2 | ⚠️ GitView関連3ファイル欠落 |
| BugListItem-ScheduleTaskListItem memo | Tasks 5.1-5.2 | ✅ |
| コールバック安定化 (4コンテナ) | Tasks 5.3-5.5 | ⚠️ EventLogListItem親コンテナ未確認 |
| テスト・検証 | Tasks 6.1-6.4 | ✅ |

### 1.3 Design ↔ Tasks 完全性チェック

| カテゴリ | Design定義 | Task Coverage | Status |
|----------|-----------|---------------|--------|
| セレクター適用（Renderer） | 27ファイル記載 | Tasks 1.1-2.6 | ✅ |
| セレクター適用（Remote UI） | 5ファイル記載 | Tasks 3.1-3.2 | ⚠️ BugsView.tsx漏れ |
| セレクター適用（Shared） | 2ファイル記載 | Tasks 4.1-4.2 | ❌ GitView関連3ファイル欠落 |
| React.memo適用 | 5コンポーネント | Tasks 5.1-5.2 | ✅ |
| コールバック安定化 | 4コンテナ記載 | Tasks 5.3-5.5 | ⚠️ EventLogListItem確認要 |

### 1.4 Acceptance Criteria → Tasks カバレッジ

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | セレクターなし全購読の解消 | 1.1-1.5, 2.1-2.6, 4.1-4.2 | Feature | ⚠️ GitView3ファイル未対応 |
| 1.2 | アクション関数のセレクター化対象外 | 1.1, 1.4, 2.1, 2.2, 2.5, 2.6 | Feature | ✅ |
| 1.3 | useSharedBugStore全購読箇所の修正 | 1.1, 1.2, 1.4, 3.2 | Feature | ⚠️ BugsView.tsx漏れ |
| 1.4 | Remote UIコンポーネントの修正 | 3.1, 3.2 | Feature | ⚠️ BugsView.tsx漏れ |
| 2.1 | 5コンポーネントのReact.memo適用 | 5.1, 5.2 | Feature | ✅ |
| 2.2 | インラインコールバックの排除 | 5.3, 5.4, 5.5 | Feature | ⚠️ EventLogListItem親確認要 |
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
- [ ] Criterion 1.1: useSharedGitViewStoreの全購読3ファイルが未対応
- [ ] Criterion 1.3/1.4: BugsView.tsx（Remote UI）のuseSharedBugStore全購読が未対応

### 1.5 統合テストカバレッジ

本変更はRenderer内部の最適化であり、IPC/イベント/ストア同期の境界を越えた新しい統合パスは導入しない。前回レビューと同じ評価。

| Integration Point | Design Section | Test Strategy | Status |
|-------------------|----------------|---------------|--------|
| Store → Selector → Component | Selector Migration Pattern | 既存E2Eテストで担保 | ✅ |
| React.memo → props比較 | ListItem Memoization | 既存ユニットテスト + E2E | ✅ |

### 1.6 クロスドキュメント矛盾

| # | 箇所 | 矛盾内容 | 重要度 |
|---|------|---------|--------|
| 1 | design.md Sharedセクション vs ソースコード | useSharedGitViewStore を使用する3つのSharedコンポーネント（GitDiffViewer, GitView, GitFileTree）が変更対象一覧に完全欠落 | Critical |
| 2 | design.md Remote UIセクション vs ソースコード | BugsView.tsx の useSharedBugStore 全購読がRemote UIセクションに未記載 | Warning |
| 3 | requirements.md Req 1.3 vs design.md | Req 1.3は「useSharedBugStoreの全購読箇所」の修正を要求。BugsView.tsx はuseSharedBugStoreをセレクターなし全購読しているがReq 1.3の対象リストに含まれていない | Warning |

## 2. Gap Analysis

### 2.1 技術的考慮事項

#### CRITICAL: useSharedGitViewStoreの全購読コンポーネント欠落（C-004）

ソースコード調査の結果、`src/shared/components/git/`配下の3つのコンポーネントが`useSharedGitViewStore()`をセレクターなしで全購読しているが、design.mdの変更対象ファイル一覧にもtasks.mdにも一切記載されていない。

**欠落コンポーネント**:

| ファイル | ストア | 使用フィールド数 | state/action分類 |
|----------|--------|-----------------|------------------|
| `src/shared/components/git/GitDiffViewer.tsx` | `useSharedGitViewStore()` | 6フィールド（selectedFilePath, cachedDiffContent, isLoading, error: state、diffMode: state、setDiffMode: action） | state+action混在 |
| `src/shared/components/git/GitView.tsx` | `useSharedGitViewStore()` | 11フィールド（isLoading, error, cachedStatus, fileTreeWidth, diffMode, selectedFilePath, cachedFileContent: state、setFileTreeWidth, refreshStatus, clearError, setDiffMode: action） | state+action混在 |
| `src/shared/components/git/GitFileTree.tsx` | `useSharedGitViewStore()` | 5フィールド（cachedStatus, selectedFilePath, expandedDirs: state、selectFile, toggleDir: action） | state+action混在 |

**分析**:
- `useSharedGitViewStore`は`src/shared/stores/gitViewStore.ts`に定義されたドメインステートストア（shared/stores）
- steering/structure.mdのState Management Rulesに従い、shared/storesはDomain State SSOTであり、Req 1.1「セレクターなしの全購読パターンが解消されること」の対象に含まれる
- requirements.md Req 1.1のAcceptance Criterion 3は「その他関連ストア: notificationStore, executionStore, scheduleTaskStore 等」を列挙しているが、gitViewStoreは「等」に含まれると解釈可能
- 3つのコンポーネントは全てstateフィールドを含む全購読パターンであり、セレクター化が必要

#### WARNING: BugsView.tsx（Remote UI）のuseSharedBugStore全購読（W-008）

`src/remote-ui/views/BugsView.tsx`の61行目:
```typescript
const {
  bugs, selectedBugId, isLoading, error,
  loadBugs, selectBug, startWatching, stopWatching,
} = useSharedBugStore();
```

design.mdのセレクター適用対象（Remote UI）セクション（352-357行）には `BugsView.tsx - useSharedBugStore` が記載されているが、tasks.md Task 3.2の記述を確認すると、BugsViewのuseSharedBugStore購読は正しく記載されている。

**ただし、requirements.md Req 1.3のリストには BugsView が含まれていない**:
> `useSharedBugStore`: BugList, BugPane, BugWorkflowView, App.tsx, BugDetailView, CreateBugDialogRemote, BugsView 等

実際にはdesign.md 109行のRequirements Traceability Table Criterion 1.3には `BugsView` が記載されている。よって、design.md内の整合性は問題ないが、requirements.mdの Req 1.3 Acceptance Criterion 3のコンポーネントリストに `BugsView` が明示されていない。

#### WARNING: EventLogListItemの親コンテナのインラインコールバック確認（W-009）

Req 2.2「インラインコールバックの排除」はReact.memoでラップする5つのListItemの親コンテナに対するコールバック安定化を要求している。design.mdのインラインコールバック安定化対象（371-374行）には以下の4コンテナが記載されている:

1. `BugListContainer.tsx` → BugListItemへのonSelect
2. `SpecListContainer.tsx` → SpecListItemへのonSelect
3. `AgentList.tsx` → AgentListItemへのonSelect, onStop, onRemove
4. `ScheduleTaskSettingView.tsx`内ScheduleTaskList → ScheduleTaskListItemへのonClick

**EventLogListItemの親コンテナ（EventLogViewerModal.tsx）がこのリストに含まれていない**。EventLogListItemがReact.memoでラップされる場合、その親コンテナがインラインコールバックを使用していればメモ化が無効化される可能性がある。

### 2.2 運用上の考慮事項

前回レビューから変更なし。

- **ロールバック戦略**: git revertで対応可能
- **ドキュメント更新**: セレクターパターンの基準をsteering文書に反映する計画は実装完了後

## 3. Ambiguities and Unknowns

| # | 箇所 | 曖昧性 | 影響 |
|---|------|--------|------|
| 1 | requirements.md Req 1.1 AC3 | 「その他関連ストア: notificationStore, executionStore, scheduleTaskStore 等」の「等」にgitViewStoreが含まれるか文言上は曖昧。ただしReq 1.1 AC1の「セレクターなしの全購読パターンが解消されること」は全ストアを対象とする包括的要件のため、gitViewStoreも対象に含まれると解釈すべき | Info: 「等」の明示化が望ましいが、AC1の包括要件で十分カバー |

## 4. Steering 整合性

### 4.1 アーキテクチャ互換性

| Steering原則 | 整合性 | Status |
|-------------|--------|--------|
| DRY | useShallowパターンの統一使用基準を確立 | ✅ |
| SSOT | shared/storesのSSOT原則を維持 | ✅ |
| KISS | 既存パターンの拡張、新しい複雑性なし | ✅ |
| YAGNI | カスタム等価比較関数を不要と判断 | ✅ |
| State Management Rules | shared/storesをSSOTとして維持。**gitViewStoreもshared/storesに属するため対象** | ⚠️ C-004で漏れ |
| Electron Process Boundary | Renderer内部の最適化、境界に影響なし | ✅ |
| AI設計判断原則 | プロジェクト全体を対象とする根本解決 | ✅ |

### 4.2 統合上の懸念

追加の懸念なし。

### 4.3 マイグレーション要件

追加の要件なし。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **C-004: useSharedGitViewStoreの全購読コンポーネント3件が完全欠落**
   - design.mdの変更対象ファイル一覧（Sharedセクション）にGitDiffViewer.tsx, GitView.tsx, GitFileTree.txを追加
   - tasks.mdにSharedコンポーネントのセレクター適用タスク（Task 4に追加 or 新規タスク）を追加
   - 各ファイルの使用フィールド数に基づきuseShallow/個別セレクターの適用を明記

### Warnings (Should Address)

1. **W-008: BugsView.tsx（Remote UI）のrequirements.md Req 1.3リスト漏れ**
   - design.mdとtasks.mdにはBugsViewが記載されており実装には影響しない
   - 推奨: requirements.md Req 1.3 Acceptance Criterion 3のコンポーネントリストに`BugsView`を追加（トレーサビリティの完全性向上）

2. **W-009: EventLogListItemの親コンテナのインラインコールバック未確認**
   - EventLogListItem（5つのメモ化対象の1つ）の親コンテナ（EventLogViewerModal.tsx）がdesign.mdのインラインコールバック安定化対象に含まれていない
   - 推奨: EventLogViewerModal.tsxのEventLogListItemへのコールバック渡しパターンを確認し、インラインコールバックが使用されている場合はdesign.mdとtasks.mdに安定化対象として追加

### Suggestions (Nice to Have)

1. **S-006: requirements.md Req 1.1 AC3の「等」の明確化**
   - 「notificationStore, executionStore, scheduleTaskStore 等」にgitViewStoreが含まれることを明示的に列挙することで、トレーサビリティが向上する
   - ただしAC1の包括要件「セレクターなしの全購読パターンが解消されること」で十分にカバーされているため、対応は任意

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-004 GitView3ファイル欠落 | design.mdのSharedセクションにGitDiffViewer.tsx, GitView.tsx, GitFileTree.tsxとuseSharedGitViewStore全購読を追加。tasks.mdにセレクター適用タスクを追加 | design.md, tasks.md |
| Warning | W-008 BugsView Req 1.3リスト | requirements.md Req 1.3 AC3のコンポーネントリストにBugsViewを追加 | requirements.md |
| Warning | W-009 EventLogListItem親コンテナ | EventLogViewerModal.tsxのコールバックパターンを確認し、必要に応じてdesign.mdとtasks.mdに追加 | design.md, tasks.md |
| Info | S-006 Req 1.1 AC3の明確化 | gitViewStoreをストアリストに追加 | requirements.md |

---

_This review was generated by the document-review command._
