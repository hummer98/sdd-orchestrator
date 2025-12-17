---
description: Review spec documents for consistency, gaps, and alignment with steering
allowed-tools: Read, Write, Glob, Grep
argument-hint: <feature-name>
---

# Spec Document Review

Review specification documents for consistency, identify contradictions, gaps, and ambiguities, then generate a comprehensive report.

**Output Language**: Follow the language configuration in CLAUDE.md. Generate the review report in the target language specified there.

## Parse Arguments

- Feature name: `$1`

## Validate

Verify review target exists:

- Verify `.kiro/specs/$1/` exists
- Verify at least one of the following exists:
  - `.kiro/specs/$1/requirements.md`
  - `.kiro/specs/$1/design.md`
  - `.kiro/specs/$1/tasks.md`

If validation fails, inform user that the specification does not exist.

## Collect Documents

### Spec Documents

Collect all `.md` and `.json` files from `.kiro/specs/$1/` directory:

- `spec.json` - Spec configuration
- `requirements.md` - Requirements definition
- `design.md` - Technical design
- `tasks.md` - Implementation tasks
- `research.md` - Research findings (if exists)
- `STATUS.md` - Status (if exists)
- Other markdown files

### Steering Documents

Collect all `.md` files from `.kiro/steering/` directory:

- `product.md` - Product context
- `tech.md` - Technology stack
- `structure.md` - Project structure
- Other custom steering documents

## Review Process

Conduct review from the following perspectives:

### 1. Spec Document Consistency Check

**Requirements ↔ Design Alignment**:

- All requirements covered in Design
- Design features traced back to requirements
- Requirement ID traceability

**Design ↔ Tasks Alignment**:

- All Design components reflected in Tasks
- Task implementation items consistent with Design
- Technology choice consistency

**Design ↔ Tasks Completeness Check**:

- All UI components defined in Design have corresponding Tasks
- Tasks mentioning "UI連携" or "設定UI" have matching UI component definitions in Design
- Requirements containing "設定", "オプション", "UI" keywords have corresponding UI components in Design
- All service interfaces in Design have implementation tasks
- All data types/models in Design have definition tasks

**Cross-Document Contradiction Detection**:

- Terminology inconsistencies
- Numeric/specification conflicts
- Dependency misalignments

### 2. Gap Detection

**Technical Considerations**:

- Error handling coverage
- Security considerations
- Performance requirements
- Scalability
- Testing strategy

**Operational Considerations**:

- Deployment procedures
- Rollback strategy
- Monitoring/logging
- Documentation updates

### 3. Ambiguity Extraction

- Vague descriptions
- Undefined dependencies
- Pending decisions
- External integration details

### 4. Steering Alignment Check

**Existing Specification Conflicts**:

- Architecture compatibility
- Technology stack/convention compliance
- Naming convention/directory structure adherence

**Integration Concerns**:

- Impact on existing features
- Shared resource conflicts
- API compatibility

**Migration Considerations**:

- Data migration requirements
- Phased rollout planning
- Backward compatibility

## Generate Report

Determine review number:

1. Search for `document-review-*.md` files in `.kiro/specs/$1/`
2. Get maximum existing review number
3. Determine next sequential number (start with `1` if none exist)

Report file: `.kiro/specs/$1/document-review-{n}.md`

### Report Structure

```markdown
# Specification Review Report #{n}

**Feature**: {feature-name}
**Review Date**: {YYYY-MM-DD}
**Documents Reviewed**: {list of reviewed files}

## Executive Summary

{Review result summary: Critical/Warning/Info counts}

## 1. Document Consistency Analysis

### 1.1 Requirements ↔ Design Alignment

{Contradictions and gaps detail}

### 1.2 Design ↔ Tasks Alignment

{Contradictions and gaps detail}

### 1.3 Design ↔ Tasks Completeness

{Missing components analysis}

| Category | Design Definition | Task Coverage | Status |
| -------- | ----------------- | ------------- | ------ |
| UI Components | ... | ... | ✅/❌ |
| Services | ... | ... | ✅/❌ |
| Types/Models | ... | ... | ✅/❌ |

### 1.4 Cross-Document Contradictions

{List of contradictions between documents}

## 2. Gap Analysis

### 2.1 Technical Considerations

{List of technical gaps}

### 2.2 Operational Considerations

{List of operational gaps}

## 3. Ambiguities and Unknowns

{List of vague descriptions and undefined items}

## 4. Steering Alignment

### 4.1 Architecture Compatibility

{Analysis of alignment with existing architecture}

### 4.2 Integration Concerns

{Concerns during integration}

### 4.3 Migration Requirements

{Migration requirements and considerations}

## 5. Recommendations

### Critical Issues (Must Fix)

{List of critical issues}

### Warnings (Should Address)

{List of issues that should be addressed}

### Suggestions (Nice to Have)

{List of improvement suggestions}

## 6. Action Items

| Priority | Issue | Recommended Action | Affected Documents |
| -------- | ----- | ------------------ | ------------------ |
| ...      | ...   | ...                | ...                |

---

_This review was generated by the document-review command._
```

## Output

After review completion, display:

1. **Report Location**: `.kiro/specs/$1/document-review-{n}.md`
2. **Review Summary**: Critical/Warning/Info counts
3. **Next Action Suggestions**:
   - If Critical exists: Recommend requirements/design fixes
   - If Warnings only: Recommend addressing before implementation
   - If Info only: Safe to proceed with implementation

### Next Steps Guidance

**If Critical Issues Found**:

- Address critical issues before proceeding
- Update relevant specification documents
- Re-run `/document-review $1` to verify fixes

**If Warnings Only**:

- Consider addressing warnings before implementation
- Or document accepted risks and proceed
- Run `/kiro:spec-impl $1` when ready

**If Clean Review**:

- Specification is ready for implementation
- Run `/kiro:spec-impl $1` to start development
