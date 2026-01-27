# Light Discovery Process for Extensions

## Objective
Quickly analyze existing system and integration requirements for feature extensions.

## Focused Discovery Steps

### 1. Extension Point Analysis
**Identify Integration Approach**:
- Locate existing extension points or interfaces
- Determine modification scope (files, components)
- Check for existing patterns to follow
- Identify backward compatibility requirements

### 2. Dependency Check
**Verify Compatibility**:
- Check version compatibility of new dependencies
- Validate API contracts haven't changed
- Ensure no breaking changes in pipeline

### 3. Quick Technology Verification
**For New Libraries Only**:
- Use WebSearch for official documentation
- Verify basic usage patterns
- Check for known compatibility issues
- Confirm licensing compatibility
- Record key findings in `research.md` (technology alignment section)

### 4. Integration Risk Assessment
**Quick Risk Check**:
- Impact on existing functionality
- Performance implications
- Security considerations
- Testing requirements

## When to Escalate to Full Discovery
Switch to full discovery if you find:
- Significant architectural changes needed
- Complex external service integrations
- Security-sensitive implementations
- Performance-critical components
- Unknown or poorly documented dependencies

## Output Requirements
- Clear integration approach (note boundary impacts in `research.md`)
- List of files/components to modify
- New dependencies with versions
- Integration risks and mitigations
- Testing focus areas

## design.md vs research.md Separation

### design.md (Design Decisions - WHAT & HOW)
- **Architecture pattern selected** (1-2 sentences: "We chose X because Y")
- **Component interfaces** (type definitions only)
- **Data models** (schema definitions)
- **Integration points** (which systems connect, via what contracts)
- **Design decisions** (DD-NNN format: Context, Decision, Rationale)

### research.md (Discovery Process - WHY & ALTERNATIVES)
- **Discovery investigation log** (sources consulted, findings)
- **Architecture pattern evaluation table** (all options considered with pros/cons)
- **Detailed trade-off analysis** (performance benchmarks, cost analysis)
- **Implementation guidance** (code examples, operational procedures)
- **External dependency deep-dive** (API investigation details, version compatibility)

### Rule of Thumb
If a reviewer asks "Why did you choose X over Y?":
- **Brief answer (2-3 sentences)**: Include in design.md Design Decisions section
- **Detailed investigation**: Reference research.md for complete analysis