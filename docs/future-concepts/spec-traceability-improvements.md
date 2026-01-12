# Spec Traceability Improvements

## 背景

`remote-ui-react-migration` specで発生した問題の分析から、要件からタスクへの追跡性（トレーサビリティ）に重大な欠陥があることが判明した。

### 発生した問題

- **Requirement 7「全機能実装（Electron版と同等）」** が7つのAcceptance Criteriaを持っていたが、実際に実装されたのは「共有コンポーネントの抽出」（準備作業）のみ
- Remote UIの実際のUI画面（SpecsView, BugsView, ProjectAgentView等）を実装するタスクが漏れた
- Document Reviewでも検出されず、Inspectionで「go」判定が出てしまった

### 根本原因

1. **Acceptance Criteriaに一意IDがない**: 下流ドキュメントで参照困難
2. **Design Traceabilityが要件単位**: 大きな要件が「全SharedComponents」のような曖昧な記述で済まされた
3. **Tasks生成時の検証不足**: 「準備タスク」と「実装タスク」の区別がなく、カバレッジチェックが甘い
4. **Document Reviewの観点不足**: Requirements → Tasks の直接検証がない

---

## 改善案

### 1. Requirements: Acceptance Criteria ID必須化

**対象ファイル**: `.kiro/settings/templates/specs/requirements.md`

**現状**:
```markdown
#### Acceptance Criteria

1. When ユーザーがSpecsタブを選択した時, Remote UI shall Spec一覧を表示する
2. When ユーザーがBugsタブを選択した時, Remote UI shall Bug一覧を表示する
```

**改善後**:
```markdown
#### Acceptance Criteria

<!-- MANDATORY: Each criterion MUST have a unique ID in format {Req#}.{Criterion#} -->
<!-- These IDs are used for traceability in design.md and tasks.md -->

- **7.1** When ユーザーがSpecsタブを選択した時, Remote UI shall Spec一覧を表示する
- **7.2** When ユーザーがBugsタブを選択した時, Remote UI shall Bug一覧を表示する
- **7.3** When ユーザーがProject Agentタブを選択した時, Remote UI shall Project Agent一覧を表示する
```

**ルール追加** (ears-format.md):
```markdown
## Criterion ID Format

Every acceptance criterion MUST have a unique identifier:
- Format: `{RequirementNumber}.{CriterionNumber}`
- Example: `7.1`, `7.2`, `7.3`
- IDs must be sequential within each requirement
- IDs are referenced in design.md (Traceability) and tasks.md (Requirements mapping)
```

---

### 2. Design: Requirements Traceabilityを Criterion単位に変更

**対象ファイル**: `.kiro/settings/templates/specs/design.md`

**現状**:
```markdown
## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 7 | 全機能実装 | 全SharedComponents | - | 全フロー |
```

**改善後**:
```markdown
## Requirements Traceability

Map **each acceptance criterion** (not just requirement) to design elements.
Generic references like "全SharedComponents" or "all flows" are NOT acceptable.

| Criterion ID | Summary | Components | Implementation Approach |
|--------------|---------|------------|------------------------|
| 7.1 | Specsタブ機能 | SpecsView, SpecDetailView | src/remote-ui/views/ に新規実装 |
| 7.2 | Bugsタブ機能 | BugsView, BugDetailView | src/remote-ui/views/ に新規実装 |
| 7.3 | Project Agentタブ | ProjectAgentView | src/remote-ui/views/ に新規実装 |
| 7.4 | ファイル編集 | FileEditor (shared) | WebSocket経由でサーバー保存 |

### Coverage Validation

**MANDATORY CHECK before completing design.md**:
- [ ] Every criterion ID from requirements.md appears in the table above
- [ ] Each criterion has specific component names (not generic references)
- [ ] Implementation approach distinguishes "reuse existing" vs "new implementation"
```

---

### 3. Tasks: Coverage Matrix必須化 + 準備vs実装の区別

**対象ファイル**: `.kiro/settings/rules/tasks-generation.md`

**追加セクション**:

```markdown
## Task Type Classification

Every task must be classified as one of:

### Infrastructure/Preparation Tasks
Setting up foundations that don't directly deliver user-facing functionality:
- "Create shared directory structure"
- "Extract component to shared/"
- "Define interface types"
- "Set up build configuration"

### Feature Implementation Tasks
Delivering user-facing functionality:
- "Implement SpecsView displaying spec list with search and filter"
- "Add Bug detail panel with phase execution buttons"
- "Create Agent control UI with stop/resume/delete actions"

### Validation Rule

**CRITICAL**: A requirement with user-facing acceptance criteria MUST have at least one Feature Implementation Task, not just Infrastructure Tasks.

**Anti-pattern to detect and reject**:
```
Requirement 7: "全機能実装（Electron版と同等）"
  ↓
Task 4.2: "Spec関連コンポーネントを共有化する"  ← Infrastructure only!
  ↓
MISSING: "SpecsViewを実装しRemote UIにSpec一覧を表示する"  ← Feature task required!
```

When this pattern is detected:
1. STOP task generation
2. Add missing Feature Implementation Tasks
3. Resume generation

---

## Requirements Coverage Matrix (MANDATORY)

At the END of tasks.md, generate a coverage matrix:

```markdown
---

## Appendix: Requirements Coverage Matrix

| Criterion ID | Summary | Task(s) | Task Type |
|--------------|---------|---------|-----------|
| 1.1 | Viteビルド設定 | 1.1 | Infrastructure |
| 1.2 | shared/構造作成 | 1.2 | Infrastructure |
| 7.1 | Specsタブ機能 | 13.1, 13.2 | Feature |
| 7.2 | Bugsタブ機能 | 13.5, 13.6 | Feature |
| 7.3 | Project Agentタブ | 13.7 | Feature |

### Validation Checklist
- [ ] Every criterion ID from requirements.md appears above
- [ ] Tasks are leaf tasks (e.g., 13.1), not container tasks (e.g., 13)
- [ ] User-facing criteria have at least one Feature task
- [ ] No criterion is covered only by Infrastructure tasks
```

### Validation Rules

1. **Completeness**: Every criterion ID from requirements.md MUST appear
2. **Specificity**: Tasks must be leaf tasks (e.g., `13.1`), not container tasks (e.g., `13`)
3. **Feature Coverage**: Criteria describing user-facing functionality MUST have Feature Implementation Tasks
4. **No False Coverage**: Infrastructure tasks alone do NOT satisfy user-facing criteria
```

---

### 4. Document Review: Criterion-Task Coverage Check追加

**対象ファイル**: `.claude/commands/kiro/document-review.md`

**追加セクション**:

```markdown
### 1.5 Acceptance Criteria → Tasks Coverage (CRITICAL CHECK)

**Purpose**: Ensure every acceptance criterion has concrete implementation tasks, not just preparation tasks.

**Process**:

1. Extract all criterion IDs from requirements.md (format: X.Y)
2. For each criterion:
   a. Find corresponding task(s) in tasks.md
   b. Classify each task as Infrastructure or Feature
   c. Verify user-facing criteria have Feature tasks

**Red Flags to Report as CRITICAL**:

| Pattern | Problem | Example |
|---------|---------|---------|
| Criterion → Infrastructure only | Preparation ≠ Implementation | 7.1 → "共有化する" only |
| Criterion → Container task | No concrete work defined | 7.1 → "4." without subtasks |
| Criterion → Generic reference | Unverifiable coverage | 7.1 → "全SharedComponents" |
| Multiple criteria → Same task | Likely incomplete | 7.1, 7.2, 7.3 → all "Task 4" |
| Criterion → No task | Complete omission | 7.4 → (not found) |

**Report Format**:

```markdown
### 1.5 Acceptance Criteria → Tasks Coverage

| Criterion | Summary | Mapped Task(s) | Task Type | Status |
|-----------|---------|----------------|-----------|--------|
| 7.1 | Specsタブ | 4.2 | Infrastructure | ❌ CRITICAL: Feature task missing |
| 7.2 | Bugsタブ | 4.3 | Infrastructure | ❌ CRITICAL: Feature task missing |
| 7.3 | Project Agent | 4.8 | Infrastructure | ❌ CRITICAL: Feature task missing |

**Critical Finding**: Requirement 7 acceptance criteria are mapped only to Infrastructure tasks.
User-facing functionality requires Feature Implementation tasks (e.g., "Implement SpecsView").
```
```

---

### 5. spec-tasks-agent: 生成後の自動検証

**対象**: spec-tasks-agent のプロンプト

**追加指示**:

```markdown
## Post-Generation Validation (MANDATORY)

After generating tasks.md, perform the following checks:

### Check 1: Coverage Matrix Validation
1. Parse the Coverage Matrix at the end of tasks.md
2. Verify all criterion IDs from requirements.md are present
3. If any missing: Add tasks and regenerate matrix

### Check 2: Feature Task Validation
1. Identify criteria describing user-facing functionality (UI, user actions, visible behavior)
2. Verify each has at least one Feature Implementation task
3. Infrastructure-only coverage is INVALID for user-facing criteria

### Check 3: Task Specificity Validation
1. Verify criterion → task mappings use leaf task IDs (X.Y format)
2. Container task references (X. format) are INVALID
3. Generic references ("全コンポーネント", "all") are INVALID

### Failure Handling
If any check fails:
1. DO NOT mark tasks.md as complete
2. Add missing tasks
3. Regenerate Coverage Matrix
4. Re-run validation
```

---

## 実装優先順位

| 優先度 | 改善項目 | 効果 | 工数 |
|--------|----------|------|------|
| **P0** | Tasks: Coverage Matrix必須化 | 漏れを即座に可視化 | 小 |
| **P0** | Tasks: 準備vs実装の区別ルール | 今回の問題を直接防止 | 小 |
| **P1** | Requirements: Criterion ID必須化 | 追跡可能性の基盤 | 小 |
| **P1** | Document Review: Criterion-Task Check | 最終防衛ライン | 中 |
| **P2** | Design: Criterion単位Traceability | 設計段階での早期検出 | 中 |

---

## 期待される効果

### Before（現状）
```
Requirements: "7. 全機能実装"
    ↓ (曖昧なトレース)
Design: "| 7 | 全SharedComponents |"
    ↓ (準備と実装の混同)
Tasks: "4.x 共有化する" のみ
    ↓ (検出されない)
Document Review: ✅ 整合性良好
    ↓
Implementation: 実際のUI画面が未実装
```

### After（改善後）
```
Requirements: "7.1 Specsタブ", "7.2 Bugsタブ", "7.3 Project Agent"
    ↓ (明示的なID)
Design: "| 7.1 | SpecsView | 新規実装 |"
    ↓ (具体的なコンポーネント)
Tasks: Coverage Matrix で全criterion確認
    ↓ (Infrastructure vs Feature チェック)
Document Review: ❌ 7.1-7.3 に Feature task がない
    ↓ (CRITICAL として検出)
Fix: Task 13 を追加して Feature Implementation を定義
```

---

## 関連ファイル

- `.kiro/settings/templates/specs/requirements.md`
- `.kiro/settings/templates/specs/design.md`
- `.kiro/settings/rules/tasks-generation.md`
- `.kiro/settings/rules/ears-format.md`
- `.claude/commands/kiro/document-review.md`
