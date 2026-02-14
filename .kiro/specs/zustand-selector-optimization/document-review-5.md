# Specification Review Report #5

**Feature**: zustand-selector-optimization
**Review Date**: 2026-02-13
**Documents Reviewed**:
- `spec.json`
- `requirements.md`（Review #1〜#4の修正適用済み）
- `design.md`（Review #1〜#4の修正適用済み）
- `tasks.md`（Review #1〜#4の修正適用済み）
- `research.md`
- `document-review-4.md`, `document-review-4-reply.md`
- `.kiro/steering/product.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/design-principles.md`

**Previous Reviews**:
- Review #1: Critical 2件、Warning 4件、Info 3件 → 全修正適用済み
- Review #2: Critical 1件、Warning 3件、Info 2件 → 全修正適用済み
- Review #3: Critical 1件、Warning 2件、Info 1件 → Fix Required 2件適用済み
- Review #4: Critical 1件、Warning 1件 → Fix Required 1件適用済み、No Fix Needed 1件

## Executive Summary

| 重要度 | 件数 |
|--------|------|
| Critical | 0 |
| Warning | 1 |
| Info | 1 |

Review #4で修正が必要とされた1件（C-005 useSharedAgentStore除外判定の矛盾）の適用を確認した。ソースコードとの完全照合の結果、design.mdおよびtasks.mdの変更対象ファイル一覧がソースコードの実態と完全に一致していることを確認した。

唯一のWarningは、「アクション専用→Req 1.2対象外」としてセレクター化を免除している3箇所（App.tsx内のuseWorkflowStore, useToolPathStore, useProjectEditorStore）について、技術的にはセレクターなし全購読であるため不要な再レンダリングが発生する可能性がある点。ただし、design.md DD-004で決定済みの方針であり、App.tsxの他のストア購読がセレクター化されることで再レンダリング頻度自体が大幅に低下するため、実質的なパフォーマンス影響は極めて限定的。

## 0. Review #4 修正適用状況の検証

Review #4で修正が必要とされた1件（Fix Required）の適用状況を検証した。

| Issue | Status | 詳細 |
|-------|--------|------|
| C-005 useSharedAgentStore除外判定の矛盾 | ✅ 修正済み | requirements.md Req 1.1 AC5の記述を修正。「BugList, SpecsView, BugsView等では既にセレクターパターンを使用済みのため修正不要。ただしremote-ui/App.tsxの3箇所（LeftSidebar, RightSidebar, FooterContent）ではセレクターなし全購読のため、Req 1.4の修正対象とする」と明記 |
| W-010 3ドキュメント間SSOT不一致 | ✅ C-005修正で解消 | requirements.mdの記述がdesign.md/tasks.mdと整合するようになった |

**結論**: Review #4の全修正項目が適切に適用されている。

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design 整合性

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: Zustandセレクターパターン統一 | Architecture Pattern + Selector Migration + ファイル一覧（全37ファイル記載） | ✅ |
| Req 2: リストアイテムメモ化 | ListItem Memoization + DD-002, DD-005 | ✅ |
| Req 3: App.tsxルート最適化 | Requirements Traceability 3.1, 3.2 + 全12ストア記載（Renderer App.tsx） | ✅ |
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

前回までに検出された矛盾は全て解消済み。新たな矛盾は検出されなかった。

## 2. Gap Analysis

### 2.1 技術的考慮事項

#### WARNING: App.tsxの「アクション専用」セレクターなし全購読が不要な再レンダリングを引き起こす可能性（W-011）

design.md 324行目で以下の3つのストア購読を「アクション専用→Req 1.2対象外」としてセレクター化を免除している：

- `useWorkflowStore（setCommandPrefix: アクション専用）` - App.tsx:110
- `useToolPathStore（fetchStatuses: アクション専用）` - App.tsx:523
- `useProjectEditorStore（clearEditor: アクション専用）` - App.tsx:153

**技術的分析**:
- `useStore()`（セレクターなし）はZustand内部で`useSyncExternalStore`を使用し、`getSnapshot`は全stateオブジェクトを返す
- stateフィールドが更新されるたびに新しいstateオブジェクトが生成され、`Object.is`比較で`false`となり再レンダリングがトリガーされる
- デストラクチャリング後にアクションのみを使用していても、`useStore()`の呼び出し自体が全stateを購読している

research.md 49行目の記述：
> アクション*のみ*を取得する場合（`const { action1, action2 } = useStore()`）は、実質的にstateの変更で再レンダリングは起きない（アクション参照は不変のため、React側のbailoutが機能する）

**この記述は技術的に不正確**。`useStore()`はセレクターなしでコンポーネントレベルの購読を行うため、stateの変更で再レンダリングの**トリガー**は発生する。React 19のbailoutにより仮想DOMの差分が空であれば実DOMの更新はスキップされるが、**関数コンポーネント自体は実行される**。

**影響度**:
- App.tsxは最も重いルートコンポーネントであり、不要な再実行のコストは相対的に高い
- ただし、本specの主要な変更（App.tsxの他の9+ストアのセレクター化）により、App.tsxの再レンダリング頻度自体が大幅に低下する
- 3つの「アクション専用」ストアのstateフィールドが変更される頻度も限定的（workflowStore、toolPathStore、projectEditorStoreは高頻度更新ストアではない）

**結論**: 実装時に`const action = useStore(s => s.action)`パターンへの変更を検討する価値はあるが、DD-004で決定済みの方針と整合しており、パフォーマンス影響は限定的であるため、Critical判定ではなくWarning判定とする。

### 2.2 運用上の考慮事項

追加の懸念なし。

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

なし。

### Warnings (Should Address)

1. **W-011: App.tsxの「アクション専用」セレクターなし全購読が技術的に再レンダリングをトリガーする**
   - design.md DD-004で「アクションのみの場合はセレクター化不要」と決定済みだが、research.mdの「React側のbailoutが機能する」という根拠は技術的に不正確
   - **推奨アクション**: research.mdの該当記述を修正し、「セレクターなし全購読はstateの変更で再レンダリングがトリガーされるが、アクション専用の3箇所はストアの更新頻度が低く影響は限定的」と正確な記述に更新する
   - または、実装時にアクション専用の3箇所も`const action = useStore(s => s.action)`に変更することで、再レンダリングを完全に防止する（Task 1.1の実装判断に委ねる）

### Suggestions (Nice to Have)

1. **S-007: research.md 49行目の技術的不正確な記述の修正**
   - 「アクション*のみ*を取得する場合...は、実質的にstateの変更で再レンダリングは起きない（アクション参照は不変のため、React側のbailoutが機能する）」→ Zustand v5の`useSyncExternalStore`ベースの実装では、セレクターなしの全購読はstateの変更で必ず再レンダリングをトリガーする
   - 正確な記述: 「セレクターなし全購読は、stateの変更で再レンダリングがトリガーされる。アクション参照は不変だが、`useStore()`は全stateオブジェクトの参照変更を検知する。ただし、React 19のbailoutにより仮想DOMの差分が空であれば実DOMの更新はスキップされるため、パフォーマンス影響は限定的」

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| Warning | W-011 アクション専用セレクターなし全購読 | research.mdの技術的不正確な記述を修正。実装時にアクション専用箇所も`s => s.action`パターンへの変更を検討 | research.md（記述修正）, tasks.md Task 1.1（実装判断） |
| Info | S-007 research.md技術的不正確 | 49行目の「再レンダリングは起きない」を正確な記述に修正 | research.md |

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
| useProjectEditorStore | 4箇所（うちApp.tsx 1箇所はアクション専用でReq 1.2対象外） | ✅ 全記載 | ✅ 全カバー | ✅ |
| useRemoteAccessStore | 3箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useConnectionStore | 1箇所 | ✅ 記載 | ✅ カバー | ✅ |
| useWorkflowStore | 2箇所（うちApp.tsx 1箇所はアクション専用でReq 1.2対象外） | ✅ 全記載 | ✅ 全カバー | ✅ |
| useMcpStore | 2箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useToolPathStore | 2箇所（うちApp.tsx 1箇所はアクション専用でReq 1.2対象外） | ✅ 全記載 | ✅ 全カバー | ✅ |
| useSharedGitViewStore | 3箇所 | ✅ 全記載 | ✅ 全カバー | ✅ |
| useDocsTreeExpandedStore | 1箇所 | ✅ 記載 | ✅ カバー | ✅ |
| useScheduleTaskStore | 1箇所 | ✅ 記載 | ✅ カバー | ✅ |

**結論**: design.mdおよびtasks.mdはソースコード上のセレクターなし全購読箇所を全てカバーしている。Criticalな矛盾はない。

---

_This review was generated by the document-review command._
