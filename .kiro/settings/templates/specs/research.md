# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `<feature-name>`
- **Discovery Scope**: New Feature / Extension / Simple Addition / Complex Integration
- **Key Findings**:
  - Finding 1
  - Finding 2
  - Finding 3

## Research Log
Document notable investigation steps and their outcomes. Group entries by topic for readability.

### [Topic or Question]
- **Context**: What triggered this investigation?
- **Sources Consulted**: Links, documentation, API references, benchmarks
- **Findings**: Concise bullet points summarizing the insights
- **Implications**: How this affects architecture, contracts, or implementation

_Repeat the subsection for each major topic._

## Architecture Pattern Evaluation
List candidate patterns or approaches that were considered. Use the table format where helpful.

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Hexagonal | Ports & adapters abstraction around core domain | Clear boundaries, testable core | Requires adapter layer build-out | Aligns with existing steering principle X |

## Design Decisions
Record major decisions that influence `design.md`. Focus on choices with significant trade-offs.

### Decision: `<Title>`
- **Context**: Problem or requirement driving the decision
- **Alternatives Considered**:
  1. Option A — short description
  2. Option B — short description
- **Selected Approach**: What was chosen and how it works
- **Rationale (Why)**:
  - Technical reasons (performance, maintainability, scalability, etc.)
  - Context considerations (token efficiency, API limits, latency, etc.)
  - Constraints that ruled out alternatives
- **Trade-offs**: Benefits vs. compromises
- **Follow-up**: Items to verify during implementation or testing

_Repeat the subsection for each decision._

## Execution Model Decision (Claude Code features only)

_Document this section when the feature involves `.claude/commands/` or MCP tool integration. Omit for non-Claude Code projects._

### Considered Approaches

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| CLI Invocation | External process, file-based exchange | Low context load, cacheable results | Process overhead, file I/O |
| MCP Direct Call | Claude Code → MCP tools via allowed-tools | Simpler flow, no file management | High context load for large responses |
| Hybrid | Mix based on operation characteristics | Optimized per use case | Complexity, potential for inconsistency |

### Selected Approach

**Choice**: [selected approach]

**Rationale**:
- Primary reason (e.g., "Context window efficiency: response data can be 100KB+, too large for MCP response")
- Secondary considerations (e.g., "Enables offline caching for repeated queries")

**Implications for design.md**:
- All sequence diagrams MUST use this execution model consistently
- Component interfaces MUST align with this data flow
- allowed-tools in command prompts MUST match the selected approach

## Risks & Mitigations
- Risk 1 — Proposed mitigation
- Risk 2 — Proposed mitigation
- Risk 3 — Proposed mitigation

## References
Provide canonical links and citations (official docs, standards, ADRs, internal guidelines).
- [Title](https://example.com) — brief note on relevance
- ...
