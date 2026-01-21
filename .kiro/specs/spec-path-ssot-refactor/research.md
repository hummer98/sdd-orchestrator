# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `spec-path-ssot-refactor`
- **Discovery Scope**: Extension (refactoring internal architecture)
- **Key Findings**:
  - Finding 1: Existing watcher services (specs/bugs) have parallel but duplicated implementations
  - Finding 2: Current API design uses path-based parameters, violating SSOT principle
  - Finding 3: Metadata types contain path field leading to state inconsistencies

## Research Log

### Existing Watcher Service Architecture

- **Context**: Need to understand current implementation to design 2-tier watching pattern
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/specsWatcherService.ts`
  - `electron-sdd-manager/src/main/services/bugsWatcherService.ts`
- **Findings**:
  - Both services use chokidar for file system watching
  - Current implementation watches only `.kiro/specs/` and `.kiro/bugs/` directories
  - Worktree support added in specs watcher but static (lists all worktrees at start time)
  - Path extraction logic duplicated between specs and bugs
  - Event debouncing (300ms) already implemented
  - Callback-based notification pattern to IPC handlers
- **Implications**:
  - Common watcher pattern can be extracted
  - Need dynamic worktree addition/removal support
  - 2-tier watching means: watch worktree parent directory + dynamically add inner paths

### Path Resolution Current Implementation

- **Context**: How are spec/bug paths currently resolved?
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/services/fileService.ts` (readSpecs, readBugs methods)
- **Findings**:
  - FileService.readSpecs() already scans both main and worktree locations
  - Uses scanWorktreeEntities helper for worktree scanning
  - Priority: worktree path > main path (implicit in scan order)
  - File existence checked via fs.access()
  - Returns SpecMetadata/BugMetadata with both name and path
- **Implications**:
  - Path resolution logic exists but scattered
  - Can be centralized into resolveEntityPath method
  - Same priority logic should be applied consistently

### API Parameter Patterns

- **Context**: Identify all spec/bug-related APIs to refactor
- **Sources Consulted**:
  - `electron-sdd-manager/src/main/ipc/channels.ts`
  - `electron-sdd-manager/src/main/ipc/handlers.ts`
- **Findings**:
  - IPC channels: READ_SPEC_JSON, UPDATE_SPEC_JSON, READ_BUG_DETAIL, etc.
  - Current signature pattern: handlers receive (projectPath, specPath) or similar
  - Path passed from Renderer side (computed from metadata.path)
  - FileService methods also use path parameter
- **Implications**:
  - Need to change both IPC handler signatures and FileService methods
  - Renderer side needs to stop storing/computing paths
  - Channel names can remain same (only parameter changes)

### Metadata Type Usage

- **Context**: Where are SpecMetadata/BugMetadata types used?
- **Sources Consulted**:
  - `electron-sdd-manager/src/renderer/types/index.ts` (SpecMetadata)
  - `electron-sdd-manager/src/renderer/types/bug.ts` (BugMetadata)
  - Grep search across renderer components
- **Findings**:
  - SpecMetadata: `{ name: string, path: string }`
  - BugMetadata: includes path, phase, updatedAt, reportedAt, worktree, worktreeBasePath
  - Used in stores: specStore, bugStore, specDetailStore, specListStore
  - Used in components: SpecListItem, BugListItem, SpecDetailView, BugDetailView
  - SelectProjectResult.specs returns SpecMetadata[]
- **Implications**:
  - SpecMetadata.path can be safely removed (only name needed)
  - BugMetadata.path should be removed, but other fields (phase, updatedAt, worktree) stay
  - Need to update all stores and components to stop referencing .path
  - SelectProjectResult can return name-only metadata

### TypeScript Type Safety Constraints

- **Context**: Ensure type changes don't break existing contracts
- **Sources Consulted**:
  - `electron-sdd-manager/src/shared/api/types.ts`
  - `electron-sdd-manager/src/preload/index.ts`
- **Findings**:
  - Shared API types use Result<T, E> pattern consistently
  - ApiClient abstraction already separates IPC and WebSocket implementations
  - Type changes will cause compile errors in affected components (good - catches all usages)
- **Implications**:
  - Type system will help identify all places needing updates
  - No runtime migration needed (pure refactoring)
  - Tests will need mock updates

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 2-Tier Watching | Watch `.kiro/worktrees/{type}/` for directory creation, dynamically add inner paths | Automatic worktree detection, no manual refresh needed | Slightly more complex watcher logic, potential race conditions on fast creates | Aligns with dynamic worktree lifecycle |
| Watcher Restart | Restart watcher when worktree created | Simple implementation | Inefficient, loses in-flight events, not scalable | Rejected - poor user experience |
| Static List | List all worktrees at startup | Current approach | Doesn't detect new worktrees until restart | Already implemented but insufficient |

## Design Decisions

### Decision: 2-Tier Watching Pattern for Dynamic Worktree Support

- **Context**: Worktree conversion creates new directories at runtime. Current watcher doesn't detect these new paths, causing UI staleness.
- **Alternatives Considered**:
  1. Restart watcher on conversion → Too disruptive, loses events
  2. Manual refresh API → Poor UX, requires user action
  3. 2-tier watching (parent + dynamic children) → Automatic, reactive
- **Selected Approach**: 2-tier watching
  - Tier 1: Watch `.kiro/worktrees/specs/` and `.kiro/worktrees/bugs/` for directory additions
  - Tier 2: When `{worktree-name}` directory added, watch `.kiro/worktrees/{type}/{name}/.kiro/{type}/{name}/`
- **Rationale (Why)**:
  - Technical reasons: Reactive to filesystem changes, no polling needed
  - Context considerations: Worktree lifecycle is directory-based, natural fit
  - Constraints that ruled out alternatives: Restart loses events, manual refresh requires user intervention
- **Trade-offs**:
  - Benefits: Automatic detection, no user action needed, scalable to many worktrees
  - Compromises: Slightly more complex watcher logic, need to handle directory creation timing
- **Follow-up**: Ensure directory structure is fully created before adding to watch list (debouncing)

### Decision: specName/bugName-Based API Design

- **Context**: Renderer currently computes and stores path, leading to stale paths after worktree conversion
- **Alternatives Considered**:
  1. Keep path-based API, add "refresh path" mechanism → Band-aid solution, doesn't fix root cause
  2. nameベースAPI with Main-side path resolution → Clean separation of concerns
- **Selected Approach**: nameベースAPI (projectPath, entityName) → Main resolves to path
- **Rationale (Why)**:
  - Technical reasons: SSOT principle - Main owns filesystem knowledge, Renderer owns UI state
  - Context considerations: Path is filesystem detail, should not leak to UI layer
  - Constraints that ruled out alternatives: Refresh mechanism is reactive, not preventive
- **Trade-offs**:
  - Benefits: Single source of truth, no path staleness possible, simpler Renderer logic
  - Compromises: One extra path resolution step (negligible performance impact)
- **Follow-up**: Ensure all IPC handlers and FileService methods updated consistently

### Decision: Common Path Resolution Logic

- **Context**: Specs and bugs both need path resolution with same logic (worktree priority)
- **Alternatives Considered**:
  1. Duplicate resolveSpecPath and resolveBugPath → Code duplication
  2. Single resolveEntityPath(entityType) → DRY, extensible
- **Selected Approach**: resolveEntityPath with entityType parameter
- **Rationale (Why)**:
  - Technical reasons: DRY principle, single place to maintain priority logic
  - Context considerations: Future entity types (e.g., steering) can reuse
  - Constraints that ruled out alternatives: Duplication violates DRY
- **Trade-offs**:
  - Benefits: Single source of truth, easier to test, future-proof
  - Compromises: Slightly more generic (but minimal complexity)
- **Follow-up**: Provide convenience methods (resolveSpecPath, resolveBugPath) as wrappers

### Decision: Extract Common Watcher Utilities (Not Base Class)

- **Context**: Specs and bugs watcher services have 80% identical logic
- **Alternatives Considered**:
  1. Base class with template method pattern → OOP approach
  2. Shared utility functions → Functional approach
- **Selected Approach**: Shared utility functions
- **Rationale (Why)**:
  - Technical reasons: TypeScript/JavaScript favor composition over inheritance
  - Context considerations: Services have different event processing logic, inheritance adds coupling
  - Constraints that ruled out alternatives: Base class forces rigid structure
- **Trade-offs**:
  - Benefits: Flexibility, easier testing, no inheritance complexity
  - Compromises: Need to call utilities explicitly (but clearer data flow)
- **Follow-up**: Create worktreeWatcherUtils.ts with reusable functions

### Decision: Metadata Type Simplification (Remove path, Keep Other Fields)

- **Context**: SpecMetadata and BugMetadata contain path field causing staleness
- **Alternatives Considered**:
  1. Remove all metadata, use only name → Too minimal, loses useful info
  2. Remove path only → Balances SSOT with convenience
  3. Add "refresh" method to metadata → Reactive, not preventive
- **Selected Approach**: Remove path field only
- **Rationale (Why)**:
  - Technical reasons: Path is derived from name, violates SSOT to store both
  - Context considerations: Other fields (phase, updatedAt) are useful for UI
  - Constraints that ruled out alternatives: Full removal loses valuable metadata
- **Trade-offs**:
  - Benefits: No path staleness possible, still have useful metadata
  - Compromises: Components need to use name instead of path
- **Follow-up**:
  - SpecMetadata: `{ name: string }`
  - BugMetadata: `{ name, phase, updatedAt, reportedAt, worktree?, worktreeBasePath? }`

## Risks & Mitigations

- Risk 1: Race condition on worktree directory creation → Proposed mitigation: Debounce worktree add detection (500ms)
- Risk 2: Breaking change to Renderer components → Proposed mitigation: TypeScript compile errors will identify all affected code
- Risk 3: Remote UI WebSocket API also needs updates → Proposed mitigation: Apply same nameベース changes to WebSocket handlers

## References

- [Chokidar Documentation](https://github.com/paulmillr/chokidar) — File watcher library used in services
- [TypeScript Result Type Pattern](https://www.meziantou.net/typescript-result-type.htm) — Error handling pattern used in codebase
- Internal: `.kiro/steering/design-principles.md` — SSOT, DRY principles
- Internal: `.kiro/steering/structure.md` — State management rules (Main vs Renderer responsibilities)
