# Specワークフローにおける検証ギャップの分析

**Date**: 2026-01-31
**Status**: 分析完了・改善提案

## 概要

schedule-task-execution機能のInspectionにおいて、「`startScheduler()`が呼び出されていない」という重大な実装漏れが検出されなかった問題を調査。Specワークフロー全体の構造的な問題を分析し、改善提案をまとめる。

---

## 発端：検出されなかった実装漏れ

### 問題の概要

schedule-task-execution機能において、以下の実装漏れがあった：

```typescript
// scheduleTaskHandlers.ts
export async function initScheduleTaskCoordinator(projectPath: string): Promise<void> {
  scheduleTaskCoordinator = createScheduleTaskCoordinator(projectPath, { ... });

  await scheduleTaskCoordinator.initialize();  // ← これは呼ばれる
  // startScheduler() が呼ばれていない！← ここが欠落
}
```

**影響**: スケジューラーループが開始されず、間隔指定タスクのキュー処理が動作しない。

### Inspectionの結果

```markdown
# Inspection Report - schedule-task-execution

## Summary
- **Judgment**: GO  ← 問題を検出できずGO判定
- Total checks: 68
- Passed: 68 (100%)
- Critical: 0
```

---

## 調査経緯

### Step 1: 間隔指定スケジュールタスクの実行シーケンス調査

Exploreエージェントでコードベースを調査し、以下が判明：

1. `processQueue()` は**実装されている**
2. `startScheduler()` も**実装されている**（1分間隔で`checkScheduleConditions()`を呼ぶ）
3. しかし `initScheduleTaskCoordinator()` で `startScheduler()` が**呼ばれていない**

さらに、以下のTODOコメントが残存：

```typescript
// scheduleTaskHandlers.ts:135-138
getIdleTimeMs: () => {
  // TODO: Task 7.1 - Integrate with humanActivityTracker
  return 0;  // ← スタブのまま
},

// scheduleTaskHandlers.ts:188
// TODO: Task 2.5 - Add createScheduleWorktree and startScheduleAgent dependencies
```

tasks.mdではこれらは「完了」(`[x]`)マークになっていた。

### Step 2: Inspectionで検出できなかった理由の分析

Inspection結果の検査項目を分析：

| 検査項目 | 実際の確認内容 | 見逃した問題 |
|---------|---------------|-------------|
| Task 2.3 コーディネーター | 「ScheduleTaskCoordinator実装」 | `startScheduler()`が呼ばれるかは未確認 |
| Task 7.1 アイドル同期 | 「useIdleTimeSync + idleTimeTracker実装」 | TODOスタブが残っていることは未確認 |
| Integration Verification | 「ScheduleTaskCoordinator → humanActivityTracker」 | 関数が存在するか確認、実際の統合は未確認 |

**問題の本質**: 「部品が存在するか」は確認するが、「部品が正しく組み立てられているか」は確認していない。

### Step 3: spec-inspectionの責務分析

spec-inspection-agentの定義を確認。8つの検査カテゴリを持つ：

1. Requirements Compliance
2. Design Alignment
3. Task Completion
4. Steering Consistency
5. Design Principles
6. Dead Code Detection
7. Integration Verification
8. Logging Compliance

**責務定義自体は妥当**だが、「呼び出しチェーン検証」は `_Verify:` フィールドに依存している。

### Step 4: `_Verify:` フィールドの生成フロー調査

spec-tasks-agentの定義（75-86行目）：

```markdown
- **Include implementation method when specified in design.md**:
  - If design.md specifies "use X", "call Y", or "via Z" for a component, include it in task description
  - Add `_Method:` field listing function/class/pattern names that MUST be used
  - Add `_Verify:` field with Grep pattern to confirm method usage during inspection
```

**条件付き**: design.mdに明示されている場合のみ `_Verify:` を生成。

### Step 5: design.mdテンプレートの確認

design.mdテンプレートには以下のセクションがある：

| セクション | 内容 | 「呼び出しチェーン」の記述欄 |
|-----------|------|--------------------------|
| Components and Interfaces | 責務、依存関係、インターフェース | **なし** |
| Service Interface | メソッドシグネチャ | **なし** |
| System Flows | Mermaidダイアグラム | あるが自然言語記述なし |
| Dependencies | Inbound/Outbound依存 | コンポーネント間の依存のみ |

**「初期化時にAがBを呼ぶべき」という Lifecycle Contract を書く欄がない**。

---

## 根本原因の特定

問題は複数のレイヤーにまたがる：

```
design.md テンプレート
    ↓ 「Lifecycle Contract」セクションがない
    ↓ 「初期化時の呼び出し」を記述する欄がない
spec-design-agent
    ↓ 呼び出しチェーンを書くよう指示されていない
design.md (生成物)
    ↓ 「use startScheduler」という記述がない
spec-tasks-agent
    ↓ design.mdに記述がないので _Verify: を生成しない
tasks.md (生成物)
    ↓ _Verify: フィールドがない
spec-inspection-agent
    ↓ 検証パターンがないので検出できない
inspection-1.md (見逃し)
```

### 責務の問題

| ファイル | 本来の責務 | 現在の追加責務 |
|---------|-----------|--------------|
| tasks.md | 実装タスク定義（What to implement） | 検証ロジック定義（`_Verify:`） |
| テストコード | 検証ロジック | - |
| verification-commands.md | プロジェクト検証コマンド | - |

`_Verify:` をtasks.mdに持たせることは**関心の分離違反**。

さらに、「書き忘れ」が致命的：

```markdown
# _Verifyがある場合
- [x] 2.3 コーディネーター実装
  - _Verify: Grep "startScheduler" in scheduleTaskHandlers.ts_
  → 検出可能

# _Verifyがない場合（今回）
- [x] 2.3 コーディネーター実装
  - _Method: ScheduleTaskCoordinator_
  → 検出不可能
```

---

## 議論のまとめ

### Q1: Inspectionで検出できなかったのはなぜか？

1. **存在確認のみ**: 「コンポーネントが存在する」「メソッドが定義されている」レベルの確認
2. **呼び出しチェーン未検証**: 「正しく呼び出されているか」は確認していない
3. **`_Verify:` フィールド依存**: tasks.mdに記述がなければ検出不可能
4. **TODOコメント見落とし**: コード内のTODO残存を検出する仕組みがない

### Q2: spec-inspectionの責務として妥当か？

**責務定義は妥当**だが、実行可能性に問題がある：

- 8カテゴリの検査は実装品質の異なる側面をカバー
- ただし「呼び出しチェーン検証」は事前の `_Verify:` 定義に依存
- `--fix` と `--autofix` まで含めると責務過多の可能性

### Q3: `_Verify:` がtasks.mdにあることへの依存は妥当か？

**責務違反**:

- tasks.mdは「何を作るか」を定義するファイル
- 検証は「テスト」または「設計」の責務
- 書き忘れで検証が機能しない構造的欠陥

### Q4: design.mdで確実に記述されるようになっているか？

**なっていない**:

- design.mdテンプレートに「Lifecycle Contract」セクションがない
- 「初期化時の呼び出し」を記述する欄がない
- したがってspec-tasksも `_Verify:` を生成できない

---

## 改善提案

### 案1: design.mdテンプレートに「Lifecycle Contract」セクションを追加

```markdown
#### [Component Name]

##### Lifecycle Contract

| Phase | Required Calls | Caller |
|-------|----------------|--------|
| Initialization | `initialize()`, `startScheduler()` | `initScheduleTaskCoordinator()` |
| Disposal | `stopScheduler()`, `dispose()` | `disposeScheduleTaskCoordinator()` |
```

**利点**: 設計段階で「何が呼ばれるべきか」が明示される
**課題**: テンプレート変更、既存設計への遡及適用

### 案2: spec-inspectionにTODO検出を追加

```markdown
#### 2.9 TODO/FIXME Detection (TodoChecker)
- Grep for TODO, FIXME, HACK, XXX in implementation files
- Flag as Critical if found in completed task's target files
```

**利点**: 実装が簡単、即効性がある
**課題**: 根本解決ではない（TODOがなくても呼び出し漏れは起きうる）

### 案3: 統合テストの強化

verification-commands.mdに「機能動作確認」を追加：

```markdown
## 機能動作確認

| Feature | Command | Expected |
|---------|---------|----------|
| スケジュール機能 | `task electron:start && sleep 120 && ...` | 1分後にcheckScheduleConditions実行 |
```

**利点**: 実際の動作を検証
**課題**: 実行時間、テスト環境の複雑さ

### 案4: `_Verify:` をtasks.mdから分離

新しいファイル `verification.md` または design.mdの「Verification Points」セクションに移動：

```markdown
## Verification Points

| Component | Verification | Pattern |
|-----------|--------------|---------|
| ScheduleTaskCoordinator | 初期化時にstartScheduler呼び出し | Grep "startScheduler" in handlers |
```

**利点**: 関心の分離、設計者が検証観点を明示
**課題**: ワークフロー変更、既存Specへの影響

### 推奨アプローチ

**短期**: 案2（TODO検出）を即座に実装
**中期**: 案1（Lifecycle Contract）をdesign.mdテンプレートに追加
**長期**: 案4（検証ポイントの分離）を検討

---

## 関連ファイル

### 分析対象

- `.kiro/specs/schedule-task-execution/` - 問題が発生したSpec
- `.claude/agents/kiro/spec-inspection.md` - Inspectionエージェント定義
- `.claude/agents/kiro/spec-tasks.md` - Tasksエージェント定義
- `.claude/agents/kiro/spec-design.md` - Designエージェント定義
- `.kiro/settings/templates/specs/design.md` - Designテンプレート

### 問題のあったコード

- `electron-sdd-manager/src/main/ipc/scheduleTaskHandlers.ts:127-192` - `startScheduler()` 呼び出し漏れ
- `electron-sdd-manager/src/main/services/scheduleTaskCoordinator.ts:368-383` - `startScheduler()` 実装

---

## 結論

今回の問題は単なる実装漏れではなく、**Specワークフロー全体の構造的な問題**を露呈した：

1. **design.md**: 呼び出しチェーンを記述する仕組みがない
2. **tasks.md**: 検証責務を持たされているが、依存するdesign.mdに記述がなければ機能しない
3. **spec-inspection**: 存在確認は行うが、統合検証は `_Verify:` に依存

これらは個別の修正ではなく、ワークフロー全体の設計見直しが必要。
