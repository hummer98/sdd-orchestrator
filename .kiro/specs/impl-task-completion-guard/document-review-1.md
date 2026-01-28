# Specification Review Report #1

**Feature**: impl-task-completion-guard
**Review Date**: 2026-01-29
**Documents Reviewed**:
- spec.json
- requirements.md
- design.md
- tasks.md
- research.md
- steering/product.md
- steering/tech.md
- steering/structure.md

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| Warning | 2 |
| Info | 1 |

**Overall Assessment**: 実装前にCritical課題の解決が必要です。特にdesign.mdとresearch.mdの間のEventType戦略の矛盾、およびファイルパスの誤りを解決してください。

---

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

**Status**: ✅ 良好

全てのRequirementがDesignで対応されています：

| Requirement | Design Coverage |
|-------------|-----------------|
| 1.1-1.3 Tasks完了度チェック | AutoExecutionCoordinator.handleAgentCompleted拡張 |
| 2.1-2.3 Impl再実行 | execute-next-phase(impl)イベント発火 |
| 3.1-3.4 再実行上限とエラー状態 | MAX_IMPL_RETRY_COUNT定数、status='error'遷移 |
| 4.1-4.4 ユーザー通知 | EventLogService + NotificationStore |

### 1.2 Design ↔ Tasks Alignment

**Status**: ✅ 良好

Design ComponentsとTasksの対応が明確です。Tasks Coverage Matrixも含まれています。

### 1.3 Design ↔ Tasks Completeness

| Category | Design Definition | Task Coverage | Status |
|----------|-------------------|---------------|--------|
| 型定義 | AutoExecutionState拡張、EventType追加 | Task 1.1, 1.2 | ✅ |
| コア機能 | tasks.mdパース、リトライ制御 | Task 2.1, 2.2, 3.1, 3.2 | ✅ |
| IPC/API | resetImplRetryCount | Task 4.1, 4.2 | ✅ |
| 通知 | EventLog + Toast | Task 5.1, 5.2 | ✅ |
| テスト | ユニット + 統合 | Task 6.1-6.3, 7.1-7.2 | ✅ |

### 1.4 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 1.1 | impl完了時にtasks.md完了度を判定 | 2.1 | Feature | ✅ |
| 1.2 | 全チェックボックス完了なら次フェーズ許可 | 2.2 | Feature | ✅ |
| 1.3 | 未完了なら移行ブロック | 2.2 | Feature | ✅ |
| 2.1 | 未完了時にimpl再実行 | 3.1 | Feature | ✅ |
| 2.2 | 再実行回数をカウント | 1.1, 3.1 | Infra+Feature | ✅ |
| 2.3 | Electron再起動でカウントリセット | 1.1 | Infrastructure | ✅ |
| 3.1 | 最大再実行回数7回 | 3.1 | Feature | ✅ |
| 3.2 | 上限到達でエラー状態 | 3.2 | Feature | ✅ |
| 3.3 | エラー状態中は継続しない | 3.2 | Feature | ✅ |
| 3.4 | リセット操作でエラー解除 | 4.1, 4.2 | Feature | ✅ |
| 4.1 | 再実行をイベントログに記録 | 1.2, 5.1 | Infra+Feature | ✅ |
| 4.2 | 再実行をUIトーストで通知 | 5.1 | Feature | ✅ |
| 4.3 | 上限到達をイベントログに記録 | 1.2, 5.2 | Infra+Feature | ✅ |
| 4.4 | 上限到達をUIエラートーストで通知 | 5.2 | Feature | ✅ |

**Validation Results**:
- [x] All criterion IDs from requirements.md are mapped
- [x] User-facing criteria have Feature Implementation tasks
- [x] No criterion relies solely on Infrastructure tasks

### 1.5 Integration Test Coverage

| Integration Point | Design Section | Test Task | Status |
|-------------------|----------------|-----------|--------|
| tasks.mdパース→リトライ発火 | System Flows | 7.1 | ✅ |
| リトライ7回→エラー状態 | System Flows | 7.2 | ✅ |
| EventLog統合 | Testing Strategy | 7.1 | ✅ |
| 通知統合 | Testing Strategy | (implicit) | ⚠️ |

**Note**: 通知（NotificationStore）の統合テストが明示的にタスク化されていませんが、Unit Test 6.1-6.3でカバーされる可能性があります。

### 1.6 Cross-Document Contradictions

#### ❌ CRITICAL-001: EventType戦略の矛盾

**Location**: design.md vs research.md

**design.md記載**（Task 1.2）:
```
EventLog型にimpl:retryとimpl:max-retry-exceededイベントを追加する
- src/shared/types/eventLog.ts にイベント型を定義
- ImplRetryEventData: retryCount, maxRetries, incompleteTasks, totalTasks
- ImplMaxRetryEventData: retryCount, maxRetries
```

**research.md記載**:
```
Selected Approach: 既存の'auto-execution:fail'と'auto-execution:complete'を活用し、messageフィールドでリトライを識別
Rationale: EventType追加はeventLog.tsとEventLogEntryの変更が必要で影響範囲が大きい
```

**Impact**: 実装者はどちらの戦略を採用すべきか判断できません。

**Recommendation**: research.mdの決定を反映してdesign.mdとtasks.mdを更新するか、design.mdの新規EventType追加を優先する場合はresearch.mdを更新してください。

---

#### ❌ CRITICAL-002: 型定義ファイルパスの誤り

**Location**: design.md Task 1.1

**design.md記載**:
```
- `src/shared/types/autoExecution.ts`にオプショナルフィールドを追加
```

**実際の構造**:
- `src/shared/types/autoExecution.ts` は存在しません
- `AutoExecutionState`型は`src/main/services/autoExecutionCoordinator.ts`内で定義されています（line 58-83）
- Renderer側の型は`src/renderer/stores/spec/types.ts`にあります

**Impact**: Task 1.1は存在しないファイルを参照しており、実装者は正しいファイルを見つけるのに時間を要します。

**Recommendation**: design.mdとtasks.mdのファイルパスを正しいパスに修正してください：
- Main側: `src/main/services/autoExecutionCoordinator.ts`
- 共有型が必要な場合: 新規作成または`src/shared/types/index.ts`への追加

---

## 2. Gap Analysis

### 2.1 Technical Considerations

#### ⚠️ WARNING-001: parseTasksCompletion関数の再利用可否が未確認

**requirements.md Open Questions記載**:
> tasks.mdのパースロジックは既存のユーティリティ（parseTasksCompletion等）を再利用できるか、設計時に確認が必要

**research.md記載**:
> specsWatcherServiceでは `^- \[x\]/gim` と `^- \[ \]/gm` の正規表現でcheckbox数をカウント

**現状**: research.mdで正規表現パターンは調査済みですが、design.mdには「既存のcheckbox正規表現パターンを使用」とあり、具体的にどのモジュールから取得するかが不明確です。

**Recommendation**: 実装時にspecsWatcherServiceの正規表現パターンをインポートするか、定数として共有化するかを明確にしてください。

#### ⚠️ WARNING-002: E2Eテストの記載不足

**design.md Testing Strategy記載**:
```
### E2E Tests
1. 正常完了パス: tasks 100%完了時にinspectionへ遷移
2. リトライパス: 1回目未完了、2回目完了でinspectionへ遷移
3. 上限到達パス: 7回未完了でエラー状態、リセット後に再開可能
```

**tasks.md記載**: E2Eテストタスクなし

**Impact**: E2Eテストは設計に記載されていますが、tasks.mdには含まれていません。

**Recommendation**: E2Eテストが必要な場合はtasks.mdに追加するか、統合テストでカバーする旨を明記してください。

### 2.2 Operational Considerations

- ✅ ログ出力: EventLogServiceで記録（設計済み）
- ✅ エラー回復: resetImplRetryCount（設計済み）
- ✅ 監視: UIトースト通知（設計済み）

---

## 3. Ambiguities and Unknowns

#### ℹ️ INFO-001: NotificationStore.showNotificationの引数仕様

**design.md記載**:
```
NotificationStore.showNotification でinfoトーストを表示
メッセージ: 「impl再実行中（{retryCount}/{maxRetries}回目）：未完了タスク{incompleteTasks}件」
```

**確認事項**: NotificationStore.showNotificationのAPIシグネチャ（第2引数の型、durationオプション等）は既存コードを参照して実装してください。

---

## 4. Steering Alignment

### 4.1 Architecture Compatibility

**Status**: ✅ 良好

- **Electron Process Boundary**: リトライロジックはMain Process内で完結（structure.md準拠）
- **State Management**: executionStates MapはMain側で管理（SSOT原則準拠）
- **IPC Pattern**: resetImplRetryCountのIPCハンドラ追加は既存パターンに従う

### 4.2 Integration Concerns

- **Remote UI**: design.mdで「Remote UI対応: 不要」と明記済み（✅）
- **既存機能への影響**: handleAgentCompletedの拡張は既存フローに影響を与える可能性があるが、条件分岐で制御

### 4.3 Migration Requirements

- 特になし（インメモリ管理のため永続化不要）

---

## 5. Recommendations

### Critical Issues (Must Fix)

| ID | Issue | Action |
|----|-------|--------|
| CRITICAL-001 | EventType戦略の矛盾 | design.mdとresearch.mdの整合性を確保 |
| CRITICAL-002 | 型定義ファイルパスの誤り | 正しいファイルパスに修正 |

### Warnings (Should Address)

| ID | Issue | Action |
|----|-------|--------|
| WARNING-001 | parseTasksCompletion再利用可否 | 実装方針を明確化 |
| WARNING-002 | E2Eテストの記載不足 | tasks.mdへの追加またはスコープ外の明記 |

### Suggestions (Nice to Have)

| ID | Issue | Action |
|----|-------|--------|
| INFO-001 | NotificationStore API仕様 | 実装時に既存コードを参照 |

---

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
|----------|-------|--------------------|--------------------|
| P0 | CRITICAL-001 | EventType戦略を統一（新規追加 or 既存活用） | design.md, tasks.md, research.md |
| P0 | CRITICAL-002 | 型定義ファイルパスを`autoExecutionCoordinator.ts`に修正 | design.md, tasks.md |
| P1 | WARNING-001 | パース関数の共有化方針を明記 | design.md |
| P1 | WARNING-002 | E2Eテストのスコープを明確化 | tasks.md または Out of Scope |

---

_This review was generated by the document-review command._
