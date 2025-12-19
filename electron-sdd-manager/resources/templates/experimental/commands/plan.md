---
description: Plan and design a feature before implementing
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch
---

# Feature Planning

## Mission

Before diving into implementation, create a comprehensive plan for the feature/task. This helps ensure:
- Clear understanding of requirements
- Proper architectural decisions
- Identification of edge cases and risks
- Realistic scope and timeline

## Workflow

### Phase 1: Requirements Clarification

1. **Understand the Request**
   - What is the user trying to achieve?
   - What problem does this solve?
   - Who will use this feature?

2. **Gather Context**
   - Read relevant existing code
   - Check documentation
   - Identify dependencies

### Phase 2: Technical Analysis

1. **Architecture Review**
   - How does this fit into existing architecture?
   - What patterns should be followed?
   - Are there similar implementations to reference?

2. **Risk Assessment**
   - What could go wrong?
   - What are the edge cases?
   - What needs to be backward compatible?

### Phase 3: Implementation Plan

1. **Break Down Tasks**
   - List concrete implementation steps
   - Estimate complexity
   - Identify blockers

2. **Define Success Criteria**
   - What tests are needed?
   - What documentation updates are required?
   - How will this be validated?

## Output Format

Provide a structured plan with:

```markdown
## Feature: [Feature Name]

### Summary
[1-2 sentence description]

### Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Technical Approach
[Architecture decisions and rationale]

### Implementation Tasks
1. [ ] Task 1 - [description]
2. [ ] Task 2 - [description]

### Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| ... | ... | ... |

### Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

## Notes

- This is a planning phase only - do not implement anything
- Ask clarifying questions if requirements are unclear
- Consider using `/kiro:spec-init` for formal spec-driven development
