---
description: Interactive planning and requirements generation through dialogue
allowed-tools: Bash, Read, Write, Glob, Grep, WebSearch, WebFetch, Task
argument-hint: <initial-idea> [--worktree]
---

# Spec Plan - Dialogue-Driven Requirements Generation

<background_information>
- **Mission**: Transform user's initial idea into structured requirements through dialogue
- **Key Difference from spec-init + spec-requirements**:
  - Combines planning dialogue and requirements generation into a single flow
  - Requirements emerge from conversation, not from a pre-written description
  - Decision rationale is captured as part of requirements document
- **Success Criteria**:
  - User's idea is clarified through focused questions
  - Technical decisions are made with documented rationale
  - requirements.md is generated with Decision Log section
  - (If --worktree) Git worktree created for isolated development
  - Spec is ready for design phase (`/kiro:spec-design`)
</background_information>

<instructions>

## Critical Constraints

- **DO NOT use EnterPlanMode** - this command IS the planning phase
- **DO NOT implement anything** - only produce requirements.md
- **DO NOT assume** - always ask when unclear
- **DO NOT rush to generate** - ensure sufficient discussion first

## Workflow

### Phase 0: Parse Arguments (--worktree only)

If `--worktree` flag is present in $ARGUMENTS:

1. **Remove flag from input**: Extract the initial idea without `--worktree`
2. **Check current branch**: Run `git branch --show-current`
   - If NOT on `main` or `master`: Display error "Worktreeモードはmain/masterブランチでのみ使用できます。現在のブランチ: {branch}" and STOP
3. **Set worktree mode flag** for Phase 4

### Phase 1: Initial Understanding

1. **Acknowledge the input**: `$ARGUMENTS` (without --worktree flag if present)
2. **Quick analysis**:
   - What is the user trying to achieve?
   - What domain/area does this touch?
   - What are obvious questions that need answers?

3. **Load context**:
   - Read `.kiro/steering/*.md` for project context
   - Check `.kiro/specs/` for related existing specs
   - Identify relevant existing code if mentioned

### Phase 2: Dialogue Loop

**Goal**: Build shared understanding through conversation.

**Question Categories** (ask what's relevant, not all):

| Category | Example Questions |
|----------|-------------------|
| Scope | What's in/out? MVP vs full vision? |
| Users | Who uses this? What workflows? |
| Technical | Constraints? Integration points? |
| Behavior | Edge cases? Error handling? |
| Priority | Must-have vs nice-to-have? |

**Dialogue Rules**:
- Ask 2-5 focused questions at a time (not overwhelming lists)
- Use numbered format for easy reference (1-1, 1-2, etc.)
- Propose hypotheses and ask for confirmation
- Summarize understanding periodically
- Track decisions made during discussion

**Decision Tracking** (internal):
```
Decision: [topic]
- Discussion: [what was considered]
- Conclusion: [what was decided]
- Rationale: [why]
```

**Convergence Signals**:
- User says "let's write the spec" / "これで仕様にして"
- All critical questions are answered
- AI judges sufficient clarity for requirements

### Phase 3: Feature Name Generation

When dialogue converges:

1. **Propose feature name**:
   - kebab-case format
   - 2-4 words, descriptive
   - Check `.kiro/specs/` for conflicts

2. **Confirm with user** (if ambiguous)

### Phase 4: Spec Directory Creation

**Worktree Mode (if --worktree was specified)**:

Before creating any files, create the worktree:

1. **Create branch**: `git branch feature/{feature-name}`
   - If branch already exists: Display error "ブランチ feature/{feature-name} は既に存在します" and STOP
2. **Create worktree**: `git worktree add .kiro/worktrees/specs/{feature-name} feature/{feature-name}`
   - If worktree already exists: Display error and STOP
   - **Rollback on failure**: If worktree creation fails, delete the branch with `git branch -d feature/{feature-name}`
3. **Change working directory**: `cd .kiro/worktrees/specs/{feature-name}`

**Directory Creation**:

1. **Create directory**:
   - Normal mode: `.kiro/specs/{feature-name}/`
   - Worktree mode: `.kiro/specs/{feature-name}/` (within the worktree)

2. **Generate spec.json** (get current UTC timestamp first):

**Normal mode spec.json**:
```json
{
  "feature_name": "{feature-name}",
  "created_at": "{timestamp-from-step-1}",
  "updated_at": "{timestamp-from-step-1}",
  "language": "ja",
  "phase": "requirements-generated",
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": false
    },
    "design": {
      "generated": false,
      "approved": false
    },
    "tasks": {
      "generated": false,
      "approved": false
    }
  }
}
```

**Worktree mode spec.json** (add worktree field):
```json
{
  "feature_name": "{feature-name}",
  "created_at": "{timestamp-from-step-1}",
  "updated_at": "{timestamp-from-step-1}",
  "language": "ja",
  "phase": "requirements-generated",
  "approvals": {
    "requirements": {
      "generated": true,
      "approved": false
    },
    "design": {
      "generated": false,
      "approved": false
    },
    "tasks": {
      "generated": false,
      "approved": false
    }
  },
  "worktree": {
    "enabled": true,
    "path": ".kiro/worktrees/specs/{feature-name}",
    "branch": "feature/{feature-name}",
    "created_at": "{timestamp-from-step-1}"
  }
}
```

### Phase 5: Requirements Generation

Generate `.kiro/specs/{feature-name}/requirements.md` with the following structure:

```markdown
# Requirements: {Feature Name}

## Decision Log

<!-- Structured record of planning dialogue -->

### {Decision Topic 1}
- **Discussion**: {What options/concerns were raised}
- **Conclusion**: {What was decided}
- **Rationale**: {Why this decision}

### {Decision Topic 2}
...

## Introduction

{Brief overview of the feature - 2-3 sentences}

## Requirements

### Requirement 1: {Area}

**Objective:** As a {role}, I want {capability}, so that {benefit}

#### Acceptance Criteria
1. When {event}, the system shall {response}
2. If {condition}, then the system shall {action}
...

### Requirement 2: {Area}
...

## Out of Scope

- {Explicitly excluded items from dialogue}

## Open Questions

- {Any remaining uncertainties for design phase}
```

**EARS Format Reference**:
- Ubiquitous: "The system shall {response}"
- Event-driven: "When {event}, the system shall {response}"
- State-driven: "While {state}, the system shall {response}"
- Conditional: "If {condition}, then the system shall {response}"
- Complex: "Where {feature}, if {condition}, the system shall {response}"

### Phase 6: Output and Next Steps

After file generation:

**Normal Mode Output**:
```
## 完了

### 生成されたファイル
- `.kiro/specs/{feature-name}/spec.json`
- `.kiro/specs/{feature-name}/requirements.md`

### Decision Log サマリー
- {decision-1}: {conclusion}
- {decision-2}: {conclusion}
...

### 次のステップ

1. requirements.md を確認してください
2. 承認後、設計フェーズへ進みます:

\`\`\`
/kiro:spec-design {feature-name}
\`\`\`

### オプション
- Gap分析（既存コードとの差分確認）: `/kiro:validate-gap {feature-name}`
```

**Worktree Mode Output**:
```
## 完了

### モード
Worktreeモード

### Worktree情報
- ブランチ: `feature/{feature-name}`
- パス: `.kiro/worktrees/specs/{feature-name}`
- 以降のコマンドはworktreeディレクトリで実行されます

### 生成されたファイル
- `.kiro/specs/{feature-name}/spec.json` (worktree内)
- `.kiro/specs/{feature-name}/requirements.md` (worktree内)

### Decision Log サマリー
- {decision-1}: {conclusion}
- {decision-2}: {conclusion}
...

### 次のステップ

1. requirements.md を確認してください
2. 承認後、設計フェーズへ進みます:

\`\`\`
/kiro:spec-design {feature-name}
\`\`\`

### オプション
- Gap分析（既存コードとの差分確認）: `/kiro:validate-gap {feature-name}`
```

</instructions>

## Tool Guidance

- **Read**: Load steering files, check existing specs
- **Glob**: Find related code, check spec name conflicts
- **Grep**: Search for relevant patterns in codebase
- **WebSearch/WebFetch**: Technical research when needed
- **Task**: Deep exploration via Explore agent if needed
- **Write**: Create spec.json and requirements.md

## Safety & Fallback

- **Idea too vague**: Ask clarifying questions, don't guess
- **Scope too large**: Propose splitting into multiple specs
- **Name conflict**: Append suffix or propose alternative
- **User wants to stop early**: Save partial discussion as draft
- **Technical uncertainty**: Note in "Open Questions" section
- **Not on main/master (--worktree)**: Display error message indicating that worktree mode requires main/master branch
- **Branch exists (--worktree)**: Display error message indicating that the branch already exists
- **Worktree creation failure**: Rollback by deleting the created branch, then display error message

## Language

- Conduct dialogue in user's language (detect from $ARGUMENTS or default to Japanese)
- Write requirements.md in spec.json.language (default: Japanese)
- Decision Log should match requirements language
