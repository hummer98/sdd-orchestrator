# Specification Review Report #4

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Documents Reviewed**:
- `spec.json`
- `requirements.md`（Review #1, #2, #3の修正適用済み）
- `design.md`（Review #1, #2, #3の修正適用済み）
- `tasks.md`（Review #1, #2, #3の修正適用済み）
- `research.md`
- `document-review-1.md`, `document-review-1-reply.md`
- `document-review-2.md`, `document-review-2-reply.md`
- `document-review-3.md`, `document-review-3-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`

**Previous Reviews**:
- Review #1: Critical 2件、Warning 4件、Info 3件 → 全修正適用済み
- Review #2: Critical 1件、Warning 3件、Info 2件 → 全修正適用済み
- Review #3: Critical 1件、Warning 2件、Info 1件 → Fix Required 2件適用済み、No Fix Needed 2件

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| Critical | 1 |
| Warning | 1 |
| Info | 0 |

Review #3で修正が必要とされた2件（C-004 GitView3ファイル追加、W-008 BugsView Req 1.3追加）の適用を確認した。ソースコード実態との完全照合により、**requirements.mdのuseSharedAgentStoreの除外判定がremote-ui/App.tsxの実態と矛盾**していることが判明した（design.mdとtasks.mdでは修正対象として正しく記載済み）。

全ドキュメントを通じた包括的な照合の結果、ソースコード上の全セレクターなし全購読箇所がdesign.mdおよびtasks.mdにカバーされていることを確認した。

## 0. Review #3 修正適用状況の検証

Review #3で修正が必要とされた2件（Fix Required）の適用状況を検証した。

| Issue | Status | 詳細 |
|-------|--------|------|
| C-004 GitView3ファイル欠落 | ✅ 修正済み | design.md Sharedセクションに GitView.tsx, GitDiffViewer.tsx, GitFileTree.tsx + useSharedGitViewStore を追加。tasks.md Task 4.3にGitView関連3ファイルのセレクター適用タスクを追加。Requirements Coverage MatrixにTask 4.3を追加 |
| W-008 BugsView Req 1.3リスト漏れ | ✅ 修正済み | requirements.md Req 1.3 AC3のuseSharedBugStoreコンポーネントリストに`BugsView`を追加 |
| W-009 EventLogListItem親コンテナ | ✅ No Fix Needed確定 | EventLogListItemにコールバックpropsがないため安定化不要 |
| S-006 Req 1.1 AC3の明確化 | ✅ C-004と同時解消 | gitViewStoreがReq 1.1 AC3のストアリストに追加済み |

**結論**: Review #3の全修正項目が適切に適用されている。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design 整合性

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: Zustandセレクターパターン統一 | Architecture Pattern + Selector Migration + ファイル一覧（全修正適用済み） | ⚠️ Req 1.1 AC5のuseSharedAgentStore除外判定に矛盾 |
| Req 2: リストアイテムメモ化 | ListItem Memoization + DD-002, DD-005 | ✅ |
| Req 3: App.tsxルート最適化 | Requirements Traceability 3.1, 3.2 + 全12ストア記載 | ✅ |
| Req 4: useShallowユーティリティ導入 | DD-001, DD-003 + Code Patterns | ✅ |
| Req 5: テスト・リグレッション検証 | Testing Strategy + Integration Test Strategy | ✅ |

### 1.2 Design ↔ Tasks 整合性

| Design Component | Task Coverage | Status |
|-----------------|---------------|--------|
| Selector Migration (Renderer 27ファイル) | Tasks 1.1-1.5, 2.1-2.6 | ✅ |
| Selector Migration (Remote UI 5ファイル) | Tasks 3.1-3.2 | ✅ |
| Selector Migration (Shared 5ファイル) | Tasks 4.1-4.3 | ✅ |
| BugListItem-ScheduleTaskListItem memo | Tasks 5.1-5.2 | ✅ |
| コールバック安定化 (4コンテナ) | Tasks 5.3-5.5 | ✅ |
| テスト・検証 | Tasks 6.1-6.4 | ✅ |

### 1.3 Design ↔ Tasks 完全性チェック

| カテゴリ | Design定義 | Task Coverage | Status |
|----------|-----------|---------------|--------|
| セレクター適用（Renderer） | 27ファイル記載 | Tasks 1.1-2.6 | ✅ |
| セレクター適用（Remote UI） | 5ファイル記載 | Tasks 3.1-3.2 | ✅ |
| セレクター適用（Shared） | 5ファイル記載 | Tasks 4.1-4.3 | ✅ |
| React.memo適用 | 5コンポーネント | Tasks 5.1-5.2 | ✅ |
| コールバック安定化 | 4コンテナ記載 | Tasks 5.3-5.5 | ✅ |

### 1.4 Acceptance Criteria → Tasks カバレッジ

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | セレクターなし全購読の解消 | 1.1-1.5, 2.1-2.6, 4.1-4.3 | Feature | ✅ |
| 1.2 | アクション関数のセレクター化対象外 | 1.1, 1.4, 2.1, 2.2, 2.5, 2.6 | Feature | ✅ |
| 1.3 | useSharedBugStore全購読箇所の修正 | 1.1, 1.2, 1.4, 3.2 | Feature | ✅ |
| 1.4 | Remote UIコンポーネントの修正 | 3.1, 3.2 | Feature | ✅ |
| 2.1 | 5コンポーネントのReact.memo適用 | 5.1, 5.2 | Feature | ✅ |
| 2.2 | インラインコールバックの排除 | 5.3, 5.4, 5.5 | Feature | ✅ |
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

### 1.5 統合テストカバレッジ

本変更はRenderer内部の最適化であり、IPC/イベント/ストア同期の境界を越えた新しい統合パスは導入しない。

| Integration Point | Design Section | Test Strategy | Status |
|-------------------|----------------|---------------|--------|
| Store → Selector → Component | Selector Migration Pattern | 既存E2Eテストで担保 | ✅ |
| React.memo → props比較 | ListItem Memoization | 既存ユニットテスト + E2E | ✅ |

### 1.6 クロスドキュメント矛盾

| # | 箇所 | 矛盾内容 | 重要度 |
|---|------|---------|--------|
| 1 | requirements.md Req 1.1 AC5 vs design.md / tasks.md | useSharedAgentStoreについてReq 1.1 AC5は「既にセレクターパターンを使用済みのため本spec修正対象外」と記載しているが、remote-ui/App.tsxの3箇所ではuseSharedAgentStore()がセレクターなしで全購読されている。design.md 353行およびtasks.md Task 3.1ではこれらを修正対象として正しく記載している | Critical |

## 2. Gap Analysis

### 2.1 技術的考慮事項

#### CRITICAL: requirements.md Req 1.1 AC5のuseSharedAgentStore除外判定の矛盾（C-005）

requirements.md Req 1.1 Acceptance Criterion 5の記述:
> `useSharedAgentStore` (shared): BugList, SpecsView 等で使用されるが、既に`(state) => state.agents`セレクターパターンを使用済みのため本spec修正対象外

**ソースコード実態**:
- `src/remote-ui/views/SpecsView.tsx:60` - `useSharedAgentStore((state) => state.agents)` ✅ セレクター使用済み
- `src/remote-ui/views/BugsView.tsx:67` - `useSharedAgentStore((state) => state.agents)` ✅ セレクター使用済み
- `src/renderer/components/BugList.tsx:40` - `useSharedAgentStore((state) => state.agents)` ✅ セレクター使用済み
- `src/remote-ui/App.tsx:149` - `useSharedAgentStore()` ❌ **セレクターなし全購読**
- `src/remote-ui/App.tsx:502` - `useSharedAgentStore()` ❌ **セレクターなし全購読**
- `src/remote-ui/App.tsx:668` - `useSharedAgentStore()` ❌ **セレクターなし全購読**（agentStore変数に代入）

**分析**:
- requirements.mdの除外判定「既にセレクターパターンを使用済み」は、BugList/SpecsView/BugsViewの3箇所については正確だが、remote-ui/App.tsxの3箇所には当てはまらない
- design.md 353行（`src/remote-ui/App.tsx - useSharedAgentStore（LeftSidebar, RightSidebar, FooterContent）`）およびtasks.md Task 3.1はremote-ui/App.tsxのuseSharedAgentStore全購読を修正対象として正しく記載している
- **矛盾の本質**: requirements.mdの除外判定が過度に広い。useSharedAgentStoreの「一部の」使用箇所はセレクター済みだが「全て」がセレクター済みではない。design/tasksは実態を正確に反映しているが、requirementsの記述と矛盾している

#### WARNING: requirements.md Req 1.1 AC5の「修正対象外」とdesign.md/tasks.mdの「修正対象」の不一致（W-010）

C-005の矛盾が存在する結果、実装者がrequirements.mdを参照した場合に混乱が生じる可能性がある。requirements.mdは「対象外」と記載しているが、design.md/tasks.mdは「対象」と記載している。3ドキュメント間のSSOTが崩れている。

design.mdのRequirements Traceabilityテーブル（110行）のCriterion 1.4にremote-ui/App.tsxが含まれているため、実装上の影響は限定的だが、ドキュメントの信頼性の観点から修正が望ましい。

### 2.2 運用上の考慮事項

前回レビューから変更なし。

## 3. Ambiguities and Unknowns

前回レビューの指摘事項は全て解決済み。新規の曖昧性なし。

## 4. Steering 整合性

### 4.1 アーキテクチャ互換性

| Steering原則 | 整合性 | Status |
|-------------|--------|--------|
| DRY | useShallowパターンの統一使用基準を確立 | ✅ |
| SSOT | shared/storesのSSOT原則を維持 | ✅ |
| KISS | 既存パターンの拡張、新しい複雑性なし | ✅ |
| YAGNI | カスタム等価比較関数を不要と判断 | ✅ |
| State Management Rules | shared/storesをSSOTとして維持。全ストアが対象 | ✅ |
| Electron Process Boundary | Renderer内部の最適化、境界に影響なし | ✅ |
| AI設計判断原則 | プロジェクト全体を対象とする根本解決 | ✅ |

### 4.2 統合上の懸念

追加の懸念なし。

### 4.3 マイグレーション要件

追加の要件なし。

## 5. Recommendations

### Critical Issues (Must Fix)

1. **C-005: requirements.md Req 1.1 AC5のuseSharedAgentStore除外判定がremote-ui/App.tsxの実態と矛盾**
   - requirements.md Req 1.1 AC5の記述を修正し、useSharedAgentStoreの除外はBugList/SpecsView/BugsView等の「既にセレクターを使用している箇所」に限定し、remote-ui/App.tsxの3箇所はReq 1.4で修正対象であることを明記する
   - または、AC5のスコープを「shared stores層でのuseSharedAgentStoreの定義・構造」に限定し、コンポーネント側の購読パターンはReq 1.1 AC1の包括要件およびReq 1.4で対応する旨を追記する

### Warnings (Should Address)

1. **W-010: 3ドキュメント間のSSOT不一致（requirements vs design/tasks）**
   - C-005を修正すれば自動的に解消される
   - requirements.mdの除外判定を修正し、design.md/tasks.mdの修正対象記載との整合性を確保する

### Suggestions (Nice to Have)

なし。

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Critical | C-005 useSharedAgentStore除外判定の矛盾 | Req 1.1 AC5の記述を修正。「BugList, SpecsView等ではセレクター使用済みだが、remote-ui/App.tsxの3箇所はセレクターなし全購読のためReq 1.4の修正対象」と明記 | requirements.md |
| Warning | W-010 3ドキュメント間SSOT不一致 | C-005の修正で自然に解消 | requirements.md |

## 7. ソースコード完全照合結果

本レビューではソースコード上のセレクターなし全購読パターンとspecドキュメントの記載を完全照合した。

### 照合結果サマリー

| ストア | ソースコード上の全購読箇所数 | design.md記載 | tasks.md記載 | Status |
|--------|---------------------------|-------------|-------------|--------|
| useProjectStore | 14箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useSpecStore | 6箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useSharedBugStore | 7箇所（Renderer+Remote UI） | ✅ 全記載 | ✅ 全カバー | ✅ |
| useAgentStore | 8箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useSharedAgentStore（全購読） | 3箇所（remote-ui/App.tsx） | ✅ 全記載 | ✅ 全カバー | ✅ |
| useNotificationStore | 4箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useEditorStore | 2箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useProjectEditorStore | 4箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useRemoteAccessStore | 3箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useConnectionStore | 1箇所 | ✅ 記載 | ✅ カバー | ✅ |
| useWorkflowStore | 2箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useMcpStore | 2箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useToolPathStore | 2箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useSharedGitViewStore | 3箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useDocsTreeExpandedStore | 1箇所 | ✅ 記載 | ✅ カバー | ✅ |
| useScheduleTaskStore | 1箇所 | ✅ 記載 | ✅ カバー | ✅ |

**結論**: design.mdおよびtasks.mdはソースコード上のセレクターなし全購読箇所を全てカバーしている。唯一の問題はrequirements.md Req 1.1 AC5のuseSharedAgentStore除外判定の記述がdesign.md/tasks.mdの記載内容と矛盾していること（C-005）。

---

_This review was generated by the document-review command._
