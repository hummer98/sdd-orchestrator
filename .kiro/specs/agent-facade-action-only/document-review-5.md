# Specification Review Report #5

**Feature**: agent-facade-action-only
**Review Date**: 2026-02-15
**Documents Reviewed**: spec.json, requirements.md, design.md, tasks.md, document-review-4.md, document-review-4-reply.md, steering/product.md, steering/tech.md, steering/structure.md, steering/design-principles.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0     |
| Warning  | 2     |
| Info     | 3     |

前回のReview #4で指摘された5件（Critical 2件 + Warning 3件）は全てReply #4で修正適用済みであることを確認。ソースコードとの照合を再実施した結果、Criticalは解消。新たに2件のWarning（細部の記載精度）と3件のInfo（実装時の注意点）を検出。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**全7要件がDesignに網羅されている**: ✅

| Requirement | Design Coverage | Status |
|-------------|----------------|--------|
| Req 1: ファサードから状態フィールド削除 | DD-001, Components and Interfaces | ✅ |
| Req 2: コンポーネントのSSOT直接読み取り | Architecture Pattern, Components Summary | ✅ |
| Req 3: AgentInfo型統一 | DD-002, Data Models | ✅ |
| Req 4: skipPermissionsのSSOT移行 | DD-003, State Management | ✅ |
| Req 5: runningAgentCountのSSOT移行 | DD-004, State Management | ✅ |
| Req 6: ファサードのアクション維持 | DD-001, AgentActionStore interface | ✅ |
| Req 7: テスト更新 | Testing Strategy | ✅ |

### 1.2 Design ↔ Tasks Alignment

**全コンポーネント変更がTasksに反映されている**: ✅

| Design Component | Task Coverage | Status |
|------------------|--------------|--------|
| useSharedAgentStore拡張 | Task 1.1, 1.2 | ✅ |
| AgentInfo型統一 | Task 2.1, 2.2 | ✅ |
| ファサード状態削除 | Task 3.1 | ✅ |
| コンポーネント移行 | Task 4.1-4.5 | ✅ |
| 関連ファイル更新 | Task 5.1, 5.2 | ✅ |
| テスト更新 | Task 6.1-6.5 | ✅ |

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| SSOT拡張 | skipPermissions, getRunningAgentCount | Task 1.1, 1.2 | ✅ |
| 型統一 | AgentInfo re-export, 変換関数削除 | Task 2.1, 2.2 | ✅ |
| ファサード縮小 | 状態フィールド全削除 | Task 3.1 | ✅ |
| コンポーネント移行 | 5コンポーネント + AgentInputPanelのagents移行 | Task 4.1-4.5 | ✅ |
| 関連ファイル | specStoreFacade（getState + subscribe + clearError）, import元変更 | Task 5.1, 5.2 | ✅ |
| テスト | 5種テスト更新 | Task 6.1-6.5 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | agents等の状態フィールド削除 | 3.1 | Feature | ✅ |
| 1.2 | subscribe-and-sync削除 | 3.1 | Feature | ✅ |
| 1.3 | 初期化時getAgentsFromShared()呼び出し削除 | 3.1 | Feature | ✅ |
| 1.4 | getAgentsFromShared(), calculateRunningCounts()削除 | 3.1 | Feature | ✅ |
| 2.1 | selectedAgentIdのSSOT直接読み取り | 4.1-4.4, 5.1 | Feature | ✅ |
| 2.2 | agentsのSSOT直接読み取り | 4.1, 4.2, 4.3, 4.4, 5.1 | Feature | ✅ |
| 2.3 | logsのSSOT直接読み取り | 4.2 | Feature | ✅ |
| 2.4 | skipPermissionsのSSOT直接読み取り | 4.1 | Feature | ✅ |
| 2.5 | 移行後のコンポーネント動作維持 | 6.5 | Feature | ✅ |
| 3.1 | SharedAgentInfoにretryCount追加（確認のみ） | 2.1 | Feature | ✅ |
| 3.2 | SharedAgentInfoにexecutionMode追加（確認のみ） | 2.1 | Feature | ✅ |
| 3.3 | Renderer固有AgentInfo型削除 | 2.1 | Feature | ✅ |
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
- [x] 全criterion IDがmapping済み
- [x] ユーザー向けcriteriaにFeature Implementation tasksが対応
- [x] Infrastructureのみのcriterionは存在しない

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| Store-Component統合 | Integration Test Strategy | 6.4 (モック更新) | ✅ |
| SSOT→コンポーネント伝播 | Testing Strategy | 6.4, 6.5 | ✅ |
| specStoreFacade連携 | Wiring Points | 5.1 | ✅ |

**Validation Results**:
- [x] コンポーネントテストのモック更新でStore-Component統合を検証
- [x] 全テストパスで回帰テストを検証

### 1.6 Refactoring Integrity Check

| Check | Validation | Status |
|-------|------------|--------|
| 削除タスク | Task 3.1で状態フィールド・ヘルパー関数・sync機構の削除を明記 | ✅ |
| Consumer更新 | Task 4.1-4.5, 5.1, 5.2でimport元・読み取り元の移行を明記 | ✅ |
| 並行実装の防止 | 新ファイル作成なし、既存ファイルの内容削減のみ | ✅ |

**Anti-Pattern Check**:
- [x] Design「replace X」に対してTaskが「create Y + delete X」を含む
- [x] 新規ファイル作成なし（削除対象ファイルもなし）
- [x] 全消費者ファイルの更新タスクが存在する

### 1.7 Cross-Document Contradictions

**前回Review #4のCritical修正確認**:

#### C-01修正確認: AgentInputPanelのagents読み取り移行

- design.md Requirements Traceability Criterion 2.2: Task 4.3が対象に含まれている ✅
- design.md Components and Interfaces: AgentInputPanel Req Coverage = `2.1, 2.2` ✅
- design.md コンポーネントSummaryセクション: AgentInputPanelのagents全走査パターン移行方針が記載 ✅
- tasks.md Task 4.3: `agents`全走査によるagent導出ロジックの移行が記載 ✅
- tasks.md Requirements Coverage Matrix Criterion 2.2: Task 4.3が含まれている ✅

#### C-02修正確認: specStoreFacadeのsubscribe移行

- design.md Wiring Points specStoreFacade.ts: 3箇所（getState + subscribe + clearError）として正確に記載 ✅
- design.md Interface Changes: subscribe移行が記載 ✅
- tasks.md Task 5.1: L162 `useAgentStore.subscribe()`→`useSharedAgentStore.subscribe()`の変更が記載 ✅

**新規矛盾検出**: なし

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### W-01 [WARNING]: AgentListPanelのAgentInfo型importの二重パターン

ソースコード確認の結果、AgentListPanel.tsx L13, L19:
```typescript
import { ... AgentInfo as RendererAgentInfo } from '../stores/agentStore';
import { AgentInfo as SharedAgentInfo } from '@shared/api/types';
```

AgentListPanelは現在`RendererAgentInfo`と`SharedAgentInfo`の両方をimportしており、`mapAgentInfoToItemInfo()`変換関数（L31-43）で`SharedAgentInfo`→表示用データへの変換を行っている。

Task 2.1で型統一後、`RendererAgentInfo`のimportが不要になるが、`mapAgentInfoToItemInfo()`内のフィールドアクセス（特に`startedAt`の`string | number`型への対応）について、以下のケースがTask 4.1で明示的にカバーされるか確認が必要:

- `startedAt`が`number`型の場合のISO文字列変換処理
- `sessionId`がoptionalになることへの対応

Design DD-002のConsequencesで「`startedAt`が`string | number`になるため、ISO文字列前提のコードは型ガードが必要」と記載されているが、具体的にどのコンポーネントでどのような型ガードが必要かのリストがない。

#### W-02 [WARNING]: Task 3.1の削除対象リストにgetLogsFromShared()の全呼び出し箇所が列挙されているが、行番号がソースコード変更で乖離するリスク

Task 3.1にgetLogsFromShared()の全8箇所の`set({ logs: getLogsFromShared() })`呼び出しの行番号が詳細に記載されている（初期state L369、ensureLogsLoaded L463等）。これは実装時の参考として有用だが、Task 2（型変換関数削除）の実装後にソースコードの行番号がシフトする。

実装時にはTask 1→2→4/5→3→6の順序で実行するため、Task 2完了後にTask 3.1の行番号は既に不正確になっている可能性が高い。Task 3.1の実装者は関数名・パターンで検索して削除箇所を特定する必要がある。

Task 3.1のVerifyコマンド（`Grep "subscribe\(.*useSharedAgentStore\|getAgentsFromShared\|calculateRunningCounts\|getLogsFromShared" in agentStore.ts — 0 matches expected`）は行番号に依存しない検証方法であり、この点は適切。

### 2.2 Operational Considerations

特に問題なし。リファクタリングはコード内部の変更であり、デプロイ・ロールバック・モニタリングに新たな考慮は不要。

---

## 3. Ambiguities and Unknowns

#### I-01 [INFO]: AgentLogPanelのログ読み取りセレクタで参照安定性への考慮

Design L308-316のAgentLogPanel移行パターン:
```typescript
const selectedAgentId = useSharedAgentStore(s => s.selectedAgentId);
const rawLogs = useSharedAgentStore(s => {
  if (!selectedAgentId) return EMPTY_LOGS;
  return s.logs.get(selectedAgentId) || EMPTY_LOGS;
});
```

このパターンでは`selectedAgentId`が外側のセレクタから取得されており、2つの独立したZustandセレクタを使用している。`selectedAgentId`が変更された際、第2セレクタの再実行はZustandのsubscribeWithSelectorメカニズムで正しく処理されるが、`EMPTY_LOGS`定数を使用して不要な再レンダリングを防ぐ設計は適切。実装時にこのパターンを正確に踏襲すること。

#### I-02 [INFO]: useRunningAgentCountフックは既にuseSharedAgentStore経由で実装済み

ソースコード確認の結果、`shared/hooks/useAgentsBySpec.ts` L109-115で`useRunningAgentCount`フックが既に存在し、`useAgentsBySpec()`（SSOTの`useSharedAgentStore`を直接参照）から導出されている。

Design DD-004のRequirement 5.1「SSOTに`getRunningAgentCount(specId)`メソッドを追加」はTask 1.2として計画されているが、`useRunningAgentCount`フックは既にSSOT経由で動作しているため、Task 1.2の`getRunningAgentCount()`メソッドの追加は、フックの代替ではなくSSOTのAPIの一貫性を保つための補完的な追加である。実装時にフックの既存動作を壊さないよう注意。

#### I-03 [INFO]: agentStoreAdapter.tsのRendererAgentInfo型とtoSharedAgentInfo()の削除スコープ

ソースコード確認の結果、`agentStoreAdapter.ts`にはRenderer側の`RendererAgentInfo`型（L55-70）と`toSharedAgentInfo()`変換関数（L33-49）が定義されている。Task 2.2で「`renderer/stores/agentStoreAdapter.ts`の`toSharedAgentInfo()`と`RendererAgentInfo`型を削除」と明記されており、スコープは正確。

ただし、アダプタ内の`startAgent()`（L89-118）が`RendererAgentInfo`型でtRPCのレスポンスを受け取った後`toSharedAgentInfo()`で変換してSSOTに格納するパターンを使用している。削除後は、tRPCレスポンスのフィールドマッピング（特に`prompt`→`args`のリネーム、L46）を別の方法で処理する必要がある。Task 2.2の「変換関数を呼んでいるアダプタ内の箇所を、`AgentInfo`（shared型）の直接使用に書き換え」の記載でカバーされているが、`prompt`→`args`マッピングの具体的な移行先が未記載。

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

✅ **State Management Rules (Strict)** との整合: SSOT原則に従い、ドメインデータを`shared/stores`に集約する方向性は`structure.md`のルールに完全に合致。

✅ **Electron Process Boundary Rules** との整合: ファサードの状態読み取り委譲メソッドは`structure.md`の「RendererはMainのキャッシュ」パターンに準拠。

✅ **Design Principles（DRY, SSOT, KISS）** との整合: 型統一（DRY）、状態一元管理（SSOT）、subscribe-and-sync削除による簡素化（KISS）は設計原則に合致。

### 4.2 Integration Concerns

✅ Review #4で検出されたspecStoreFacade連携の課題はReply #4で解決済み。3箇所のuseAgentStore使用箇所（getState, subscribe, clearError）の移行戦略が明確に文書化されている。

### 4.3 Migration Requirements

✅ ファイル名維持（DD-005）により、import変更の影響を最小化する方針はsteering/structure.mdのRe-export Patternと整合。

✅ タスク実行順序（Task 1→2→4/5→3→6）が明示されており、コンパイルエラーの一時的な発生を防ぐ段階的移行が計画されている。

---

## 5. Recommendations

### Critical Issues (Must Fix)

なし

### Warnings (Should Address)

**W-01**: `startedAt`が`string | number`に変わることへの型ガードが必要なコンポーネントのリストをDesignまたはTaskに追記することを推奨。少なくともAgentListPanel, AgentLogPanel, ProjectAgentPanelのTask 4.1, 4.2, 4.4で「`startedAt`が`string | number`になるため型ガードを追加」との注記があるが、具体的にどの箇所で型ガードが必要かが不明。ただし、これはコンパイル時に型エラーとして検出可能であるため、実装フェーズで自動的に対処可能。

**W-02**: Task 3.1内の行番号はTask 2実行後にシフトする。関数名・パターンベースの検索で対処可能であり、Verifyコマンドも行番号に依存しない形式のため、実質的な問題にはならない。注記として「行番号は参考値、実装時は関数名で検索すること」を追記することを推奨。

### Suggestions (Nice to Have)

**I-01**: AgentLogPanelのSSOTセレクタパターンはDesignに既に記載済み。実装時に踏襲すること。
**I-02**: useRunningAgentCountフックとgetRunningAgentCount()メソッドの共存は意図的。注意事項として認識すること。
**I-03**: `prompt`→`args`フィールドマッピングの移行先が未記載だが、Task 2.2の記述（「shared型の直接使用に書き換え」）でカバー可能。実装時にtRPCレスポンス型との整合性を確認すること。

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| Warning | W-01: startedAt型ガード箇所の不明確さ | Task 4.1, 4.2, 4.4の注記はあるため対応可。必要なら具体箇所リストを追記 | tasks.md |
| Warning | W-02: Task 3.1の行番号のシフトリスク | 「行番号は参考値」の注記追加を推奨 | tasks.md |
| Info | I-03: prompt→argsマッピング移行先 | Task 2.2実装時にtRPCレスポンス型を確認 | - |

---

## 7. Review #4 Fix Verification

前回Review #4の修正が全て正確に適用されていることを確認:

| Review #4 Issue | Fix Status | Verification |
|-----------------|------------|-------------|
| C-01: AgentInputPanel agents移行欠落 | ✅ Applied | design.md/tasks.md両方で修正確認済み |
| C-02: specStoreFacade subscribe移行欠落 | ✅ Applied | design.md/tasks.md両方で修正確認済み |
| W-01: subscribe移行戦略未定義 | ✅ Applied | C-02と同時に修正 |
| W-02: AgentInputPanel agent検索移行方針 | ✅ Applied | design.mdにパターン追記、tasks.mdに詳細追記 |
| W-03: SpecListContainer影響確認 | ✅ Applied | Task 4.5に方針明記 |

---

_This review was generated by the document-review command._
