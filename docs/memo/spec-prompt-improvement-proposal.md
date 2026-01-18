# Spec-* プロンプト改善提案

## 背景

### 発生した問題

`steering-verification-integration` spec の Task 6.2 で実装漏れが発生。

| 項目 | 内容 |
|------|------|
| **Task 6.2** | `executeProjectAgentを使用してエージェント起動` と明記 |
| **Requirements 3.4** | `ボタンをクリックすると、プロジェクトエージェントとして /kiro:steering-verification を起動すること` |
| **実際の実装** | テンプレートファイルのコピー（エージェント起動なし） |
| **元のコミットコメント** | `Requirements: 3.1, 3.2, 3.3` （3.4が欠落） |

### 問題の本質

- タスク記述に「どのように実装するか」が明記されていた
- しかし実装者はそれを無視して別の方法で実装
- document-review は仕様書間の整合性チェックのみで、コード実装を検証しない
- spec-inspection の TaskChecker はチェックボックス `[x]` のみを確認し、実装方法を検証しない

---

## 各プロンプトの問題点と改善案

### 1. spec-impl.md

#### 現状の問題

タスク記述の「どのように」実装するかを検証する仕組みがない。

```markdown
### Step 3: Execute with TDD

For each selected task, follow Kent Beck's TDD cycle:
1. RED - Write Failing Test
2. GREEN - Write Minimal Code
3. REFACTOR - Clean Up
4. VERIFY - Validate Quality
5. MARK COMPLETE
```

- タスクの「説明文」（例: `executeProjectAgentを使用`）を読み取って検証するステップがない
- テストは機能の動作確認であり、実装手法の検証ではない
- 今回のケース: テンプレートコピーでも「verification.mdが生成される」という機能テストはパスしうる

#### 改善案

```markdown
### Step 3: Execute with TDD (Enhanced)

**3.0 TASK ANALYSIS (NEW)**:
   - Read the full task description including implementation hints
   - Extract any explicit implementation requirements (e.g., "use X", "call Y", "via Z")
   - These requirements become test constraints alongside functional requirements

**Example**:
- Task: "executeProjectAgentを使用してエージェント起動"
- Extracted constraint: Must use `executeProjectAgent` function
- Test should verify: `executeProjectAgent` was called with correct parameters
```

---

### 2. spec-inspection.md

#### 現状の問題

```markdown
#### 2.3 Task Completion (TaskChecker)
For each task in tasks.md:
- Verify checkbox is `[x]` (completed)
- Verify implementation exists for task deliverables
- Verify tests exist and pass (if applicable)
- Flag incomplete tasks as Critical
```

- チェックボックスが `[x]` になっているかどうかのみを検証
- タスク記述に含まれる「実装方法の指定」を検証しない
- 「実装が存在する」の定義が曖昧（機能的に動けばOKになってしまう）

#### 改善案

```markdown
#### 2.3 Task Completion (TaskChecker) - Enhanced

For each task in tasks.md:
- Verify checkbox is `[x]` (completed)
- Verify implementation exists for task deliverables
- **NEW: Verify implementation method matches task description**:
  - Extract explicit method requirements from task description (keywords: "を使用", "use", "via", "call")
  - Search codebase for evidence of specified method/function/pattern
  - Flag method mismatch as Critical (task says "use X" but code doesn't use X)
- Verify tests exist and pass (if applicable)
- Flag incomplete tasks as Critical

**Example Check**:
- Task: "6.2 GENERATE_VERIFICATION_MDハンドラ実装 - executeProjectAgentを使用してエージェント起動"
- Required evidence: Code must contain call to `executeProjectAgent` or `startAgent` in the handler
- Grep pattern: `startAgent|executeProjectAgent` in relevant handler file
```

---

### 3. spec-tasks.md

#### 現状の問題

```markdown
**Generate task list following all rules**:
- Use language specified in spec.json
- Map all requirements to tasks and list numeric requirement IDs only
- Ensure all design components included
- Verify task progression is logical and incremental
```

- タスク記述の粒度や具体性に関するガイドラインがない
- 「何を実装するか」と「どのように実装するか」の両方を明記するルールがない

#### 改善案

```markdown
**Generate task list following all rules**:
- Use language specified in spec.json
- Map all requirements to tasks and list numeric requirement IDs only
- Ensure all design components included
- Verify task progression is logical and incremental
- **NEW: Include implementation method when specified in design.md**:
  - If design.md specifies "use X", "call Y", or "via Z", include it in task description
  - Format: `{task description} - {method specification}`
  - Example: "IPCハンドラ実装 - executeProjectAgentを使用してエージェント起動"
  - This makes method requirements explicit and verifiable during inspection
```

---

### 4. tasks.md テンプレート

#### 現状の問題

Requirements → Tasks → Impl → Inspection のトレーサビリティが不十分。

現在のフォーマット:
```markdown
- [ ] 6.2 GENERATE_VERIFICATION_MDハンドラ実装
  - executeProjectAgentを使用してエージェント起動
  - _Requirements: 3.4_
```

Inspection が「タスク記述どおりに実装されたか」を検証しない。

#### 改善案

```markdown
- [ ] 6.2 GENERATE_VERIFICATION_MDハンドラ実装
  - _Requirements: 3.4_
  - _Method: executeProjectAgent, startAgent_  ← NEW: 検証可能なキーワード
  - _Verify: Grep for "startAgent" in handlers.ts_  ← NEW: 検証方法
```

---

## 改善提案サマリー

| 対象 | 問題 | 改善案 |
|------|------|--------|
| **spec-impl.md** | タスク記述の実装方法を検証しない | Step 3.0 "TASK ANALYSIS" を追加し、実装方法の制約を抽出 |
| **spec-inspection.md** | TaskChecker がチェックボックスのみ検証 | 実装方法の検証ステップを追加（Grep で指定メソッドの使用確認） |
| **spec-tasks.md** | 実装方法の明記ルールがない | design.md の実装方法指定をタスクに転記するルールを追加 |
| **tasks.md テンプレート** | 検証可能な構造になっていない | `_Method:` と `_Verify:` フィールドを追加 |

---

## 優先度

### 1. 最優先: spec-inspection.md の TaskChecker 強化

**理由**: 最後の砦として機能すべき検証プロセス。今回の実装漏れはここで検出できるべきだった。

### 2. 次点: spec-tasks.md での実装方法明記ルール

**理由**: タスク生成時に検証可能な形式で記述すれば、inspection で検出しやすくなる。

### 3. 補助: spec-impl.md での TASK ANALYSIS ステップ

**理由**: 実装者（エージェント）が自己チェックできる仕組み。

---

## 関連ファイル

- `.claude/agents/kiro/spec-impl.md`
- `.claude/agents/kiro/spec-inspection.md`
- `.claude/agents/kiro/spec-tasks.md`
- `.kiro/settings/templates/specs/tasks.md`

## 関連 Issue

- steering-verification-integration Task 6.2 実装漏れ
