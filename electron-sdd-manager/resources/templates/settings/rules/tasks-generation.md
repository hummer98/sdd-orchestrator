# Task Generation Rules

## Core Principles

### 1. Natural Language Descriptions
Focus on capabilities and outcomes, not code structure.

**Describe**:
- What functionality to achieve
- Business logic and behavior
- Features and capabilities
- Domain language and concepts
- Data relationships and workflows

**Avoid**:
- File paths and directory structure
- Function/method names and signatures
- Type definitions and interfaces
- Class names and API contracts
- Specific data structures

**Rationale**: Implementation details (files, methods, types) are defined in design.md. Tasks describe the functional work to be done.

### 2. Task Integration & Progression

**Every task must**:
- Build on previous outputs (no orphaned code)
- Connect to the overall system (no hanging features)
- Progress incrementally (no big jumps in complexity)
- Validate core functionality early in sequence
- Respect architecture boundaries defined in design.md (Architecture Pattern & Boundary Map)
- Honor interface contracts documented in design.md
- Use major task summaries sparingly—omit detail bullets if the work is fully captured by child tasks.

**End with integration tasks** to wire everything together.

### 3. Flexible Task Sizing

**Guidelines**:
- **Major tasks**: As many sub-tasks as logically needed (group by cohesion)
- **Sub-tasks**: 1-3 hours each, 3-10 details per sub-task
- Balance between too granular and too broad

**Don't force arbitrary numbers** - let logical grouping determine structure.

### 4. Requirements Mapping

**End each task detail section with**:
- `_Requirements: X.X, Y.Y_` listing **only numeric requirement IDs** (comma-separated). Never append descriptive text, parentheses, translations, or free-form labels.
- For cross-cutting requirements, list every relevant requirement ID. All requirements MUST have numeric IDs in requirements.md. If an ID is missing, stop and correct requirements.md before generating tasks.
- Reference components/interfaces from design.md when helpful (e.g., `_Contracts: AuthService API`)

### 5. Code-Only Focus

**Include ONLY**:
- Coding tasks (implementation)
- Testing tasks (unit, integration, E2E)
- Technical setup tasks (infrastructure, configuration)

**Exclude**:
- Deployment tasks
- Documentation tasks
- User testing
- Marketing/business activities

### Optional Test Coverage Tasks

- When the design already guarantees functional coverage and rapid MVP delivery is prioritized, mark purely test-oriented follow-up work (e.g., baseline rendering/unit tests) as **optional** using the `- [ ]*` checkbox form.
- Only apply the optional marker when the sub-task directly references acceptance criteria from requirements.md in its detail bullets.
- Never mark implementation work or integration-critical verification as optional—reserve `*` for auxiliary/deferrable test coverage that can be revisited post-MVP.

## Task Hierarchy Rules

### Maximum 2 Levels
- **Level 1**: Major tasks (1, 2, 3, 4...)
- **Level 2**: Sub-tasks (1.1, 1.2, 2.1, 2.2...)
- **No deeper nesting** (no 1.1.1)
- If a major task would contain only a single actionable item, collapse the structure and promote the sub-task to the major level (e.g., replace `1.1` with `1.`).
- When a major task exists purely as a container, keep the checkbox description concise and avoid duplicating detailed bullets—reserve specifics for its sub-tasks.

### Sequential Numbering
- Major tasks MUST increment: 1, 2, 3, 4, 5...
- Sub-tasks reset per major task: 1.1, 1.2, then 2.1, 2.2...
- Never repeat major task numbers

### Parallel Analysis (default)
- Assume parallel analysis is enabled unless explicitly disabled (e.g. `--sequential` flag).
- Identify tasks that can run concurrently when **all** conditions hold:
  - No data dependency on other pending tasks
  - No shared file or resource contention
  - No prerequisite review/approval from another task
- Validate that identified parallel tasks operate within separate boundaries defined in the Architecture Pattern & Boundary Map.
- Confirm API/event contracts from design.md do not overlap in ways that cause conflicts.
- Append `(P)` immediately after the task number for each parallel-capable task:
  - Example: `- [ ] 2.1 (P) Build background worker`
  - Apply to both major tasks and sub-tasks when appropriate.
- If sequential mode is requested, omit `(P)` markers entirely.
- Group parallel tasks logically (same parent when possible) and highlight any ordering caveats in detail bullets.
- Explicitly call out dependencies that prevent `(P)` even when tasks look similar.

### Checkbox Format
```markdown
- [ ] 1. Major task description
- [ ] 1.1 Sub-task description
  - Detail item 1
  - Detail item 2
  - _Requirements: X.X_

- [ ] 1.2 Sub-task description
  - Detail items...
  - _Requirements: Y.Y_

- [ ] 1.3 Sub-task description
  - Detail items...
  - _Requirements: Z.Z, W.W_

- [ ] 2. Next major task (NOT 1 again!)
- [ ] 2.1 Sub-task...
```

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

### Integration Test Tasks (Required for Cross-Boundary)
Verifying interaction between components (IPC, Store sync, Event chains):
- "Integration test: MCP status broadcast to Renderer"
- "Integration test: Store state propagation on event emission"

**Generation Criteria**:
| Design Element | Required Test |
|----------------|---------------|
| IPC channel definition | IPC delivery test |
| Store synchronization flow | State propagation test |
| Event/callback chains | Chain execution test |

**Task Format Example**:
```markdown
- [ ] 8.1 Integration test: MCP status broadcast
  - Verify McpServerService.onStatusChange triggers IPC
  - Verify Renderer receives mcp:status-changed event
  - _Requirements: 6.9_
  - _Integration Point: Design.md "Remote UI Synchronization Flow"_
```

**Testing Best Practices (MANDATORY)**:
- **No Flaky Tests**: Never use fixed delays (`sleep(1000)`). Use `waitFor` patterns or event listeners to detect state changes.
- **Prerequisites**: If project lacks test helpers for IPC/Store mocking, create a "Test Infrastructure" task BEFORE the integration test task.
- **Mock Boundaries**: Follow the "Integration Test Strategy" in design.md.

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

## Requirements Coverage

**Mandatory Check**:
- ALL acceptance criteria from requirements.md MUST be covered
- Cross-reference every criterion ID (e.g., 7.1, 7.2) with task mappings
- If gaps found: Return to requirements or design phase
- No criterion should be left without corresponding tasks
- User-facing criteria MUST have Feature Implementation tasks (not just Infrastructure)

Use `N.M`-style numeric criterion IDs where `N` is the top-level requirement number from requirements.md (for example, Requirement 1 → 1.1, 1.2; Requirement 2 → 2.1, 2.2), and `M` is a local index within that requirement group.

Document any intentionally deferred requirements with rationale.

---

## Requirements Coverage Matrix (MANDATORY)

At the **END** of tasks.md, generate a coverage matrix to ensure no criterion is missed:

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

### Coverage Validation Checklist
- [ ] Every criterion ID from requirements.md appears above
- [ ] Tasks are leaf tasks (e.g., 13.1), not container tasks (e.g., 13)
- [ ] User-facing criteria have at least one Feature task
- [ ] No criterion is covered only by Infrastructure tasks
```

### Validation Rules for Coverage Matrix

1. **Completeness**: Every criterion ID from requirements.md MUST appear
2. **Specificity**: Tasks must be leaf tasks (e.g., `13.1`), not container tasks (e.g., `13`)
3. **Feature Coverage**: Criteria describing user-facing functionality MUST have Feature Implementation Tasks
4. **No False Coverage**: Infrastructure tasks alone do NOT satisfy user-facing criteria

### Failure Handling

If any validation rule fails:
1. DO NOT mark tasks.md as complete
2. Add missing Feature Implementation tasks
3. Regenerate Coverage Matrix
4. Re-run validation
