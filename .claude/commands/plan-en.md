---
description: Specification Planning
allowed-tools: Read, Write, WebSearch, WebFetch, Glob, Grep, Task, SlashCommand
---

# Specification Planning Workflow

<background_information>
- **Mission**: Organize and examine user ideas/requirements, connecting them to the Spec-Driven Development (SDD) workflow
- **Goal**: Reach a state where `/kiro:spec-init` can be executed
- **Success Criteria**:
  - User requirements are clarified
  - Feasibility has been examined
  - Appropriate route to SDD workflow is determined
</background_information>

<instructions>
## ⚠️ Critical Constraints

- **Do NOT use Claude Code's Plan Mode (EnterPlanMode)**
- **Do NOT implement** - Specification planning phase only
- Goal is execution of `/kiro:spec-init`
- **Do NOT rely on assumptions or predictions** - Always ask about unclear points

## Workflow

### Phase 1: Understanding Requirements and Asking Questions

**⚠️ Most Important**: Even if the user doesn't say "do you have any questions", **proactively ask questions**. Do not proceed based on assumptions.

1. **Analyze User Input**
   - What do they want to achieve?
   - What problem are they trying to solve?
   - What deliverables do they expect?

2. **Identify Unclear Points and Ask Questions**

   Check for unclear points from the following perspectives, and **ask questions if even one point is unclear**:

   - **Scope**: Is the feature scope clear? Where are the boundaries?
   - **Users**: Who will use it? What operations do they expect?
   - **Technical Constraints**: Are there technologies that must be used or avoided?
   - **Relationship with Existing System**: Where will it integrate? What's the impact scope?
   - **Priority**: What's the distinction between must-have and nice-to-have?
   - **Non-functional Requirements**: Performance, security, accessibility requirements?

3. **Question Output Format**

   Use **numbered items with sub-numbers** to make it easy for users to respond:

   ```
   ## Questions

   To clarify the specification, please answer the following:

   ### 1. About Scope
   1-1. [question]
   1-2. [question]

   ### 2. About Technical Constraints
   2-1. [question]

   ### 3. About Priority
   3-1. [question]
   3-2. [question]

   ---
   Response format example: "1-1: XX, 1-2: YY, 2-1: None, 3-1: ..."
   ```

   **Always include response format guidance** - Enable users to respond concisely using numbers.

**Note**: Get answers to questions before proceeding to Phase 2. Do not proceed based on assumptions without answers.

### Phase 2: Research and Examination

Perform the following as needed:

1. **Existing Codebase Research**
   - Check related existing features
   - Understand impact scope
   - Identify reusable components

2. **Technical Research** (if needed)
   - Research technical best practices with WebSearch
   - Research similar implementation patterns

3. **Feasibility Examination**
   - Identify technical challenges
   - Consider alternative approaches

### Phase 3: Specification Organization

1. **Create Project Description**
   - Create a concise description to serve as SDD input (`<project-description>`)
   - Describe feature overview in 1-3 sentences

2. **Determine Workflow**

   | Condition | Recommended Command |
   |-----------|---------------------|
   | Feature addition/improvement | `/kiro:spec-init "description"` → Standard workflow |
   | Bug fix (no design changes) | `/kiro:bug-create` |

### Phase 4: Present Specification Planning Results

Output in the following format:

```
## Specification Planning Results

### Project Overview
[1-2 sentence summary]

### Examination Summary
- [Summary of research and examination]

### Recommended Approach
[Recommended workflow and rationale]

### Notes
[Any caveats or additional considerations]

---
Shall I execute `/kiro:spec-init` with the above content?
```

### Phase 5: Execute Spec Initialization

**After obtaining user approval**, execute `/kiro:spec-init "project description"` using the SlashCommand tool.

- If approved: Execute `/kiro:spec-init` → Proceed to Phase 6
- If modification requested: Re-execute Phase 3-4 following instructions
- If rejected: End

### Phase 6: Save Specification Planning Record

After `/kiro:spec-init` completes, create `.kiro/specs/<feature-name>/planning.md` using the Write tool to save the Q&A record.

**File Format**:

```markdown
# Specification Planning Record

## Basic Information
- **Created**: YYYY-MM-DD
- **Feature Name**: <feature-name>

## Initial Request
[User's initial input content]

## Q&A

### Q1. [Question Category]
**Questions**:
- 1-1. [question content]
- 1-2. [question content]

**Answers**:
- 1-1: [answer content]
- 1-2: [answer content]

### Q2. [Question Category]
...

## Research and Examination Results
- [Summary of research]
- [Technical considerations]

## Decisions Made
- [Confirmed specifications and policies]

## Notes
- [Additional caveats or future considerations]
```

**Note**: Accurately record the Q&A content for future reference.

</instructions>

## Tool Guidance

- **Read/Glob/Grep**: Existing codebase research
- **WebSearch/WebFetch**: Technical research, best practices confirmation
- **Task**: When extensive research is needed (Explore agent)
- **SlashCommand**: Execute `/kiro:spec-init`
- **Write**: Create `planning.md` (Phase 6)

## Safety & Fallback

- **Requirements unclear**: Always ask questions to clarify (**do not proceed based on assumptions**)
- **Any ambiguous points**: Ask questions (do not proceed thinking "it's probably this")
- **Scope too large**: Suggest splitting and ask about priorities
- **Bug fix case**: Guide to `/kiro:bug-create`
- **Existing Spec exists**: Avoid duplication, suggest utilizing existing Spec

## Principles About Questions

1. **Questions are welcome** - Users want accurate specification development
2. **Cost of assumptions is high** - Wrong premises lead to rework
3. **Consolidate questions** - Ask multiple unclear points at once
4. **Question granularity** - Ask at an appropriate level, neither too abstract nor too specific
