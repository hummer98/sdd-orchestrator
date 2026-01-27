# Research & Design Decisions: Git Diff Viewer

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Feature**: git-diff-viewer
**Discovery Scope**: Complex Integration (New Feature with External Dependencies)
**Key Findings**:
  - react-diff-view requires refractor (Prism-based) for syntax highlighting, not PrismJS directly
  - Chokidar lacks built-in debounce; wrapper implementation needed
  - Electron IPC requires careful sender validation for git operations security
  - Git worktree HEAD detection via `.git/worktrees/{name}/HEAD` parsing is reliable
  - Untracked files require `git add -N` (intent-to-add) or Git 2.44+ `--include-untracked` flag

---

## Research Log

### React Diff Viewer Library Selection

**Context**: Requirements 8.1-8.3 specify syntax-highlighted diff display with unified/split mode toggle.

**Sources Consulted**:
- [react-diff-view npm package](https://www.npmjs.com/package/react-diff-view)
- [React-Diff-View GitHub repository](https://github.com/otakustay/react-diff-view)
- [React Diff Viewer comparison](https://www.dhiwise.com/post/exploring-the-power-of-react-diff-viewer-comprehensive-guide)

**Findings**:
- **react-diff-view** (by otakustay) is the recommended library for professional diff visualization
- Uses **refractor** (Prism-based) for syntax highlighting, not PrismJS directly
- Provides tokenization API with `markEdits()` enhancer for inline diff highlighting
- Supports web workers for non-blocking tokenization
- Requires explicit language specification (e.g., 'javascript', 'typescript')
- **oldSource** parameter improves accuracy for multiline comments and template strings

**Implications**:
- Add `react-diff-view` and `refractor` as dependencies
- Implement tokenization with language detection based on file extension
- Use `markEdits()` enhancer to highlight character-level changes within lines
- Import Prism theme CSS for syntax highlighting styles

### File Watching with Chokidar

**Context**: Requirement 2 specifies automatic git diff refresh on file changes with 300ms debounce.

**Sources Consulted**:
- [Chokidar GitHub repository](https://github.com/paulmillr/chokidar)
- [chokidar-debounced wrapper](https://github.com/samhuk/chokidar-debounced/)
- [Chokidar performance best practices](https://www.gyata.ai/nodejs/chokidar)

**Findings**:
- Chokidar v5 (Nov 2025) is ESM-only, requires Node.js 20+
- **No built-in debounce** — requires custom implementation or wrapper
- Uses `fs.watch` (non-polling) for efficient CPU usage
- Initiates watchers recursively; scope should be limited to project root
- Recommended patterns: `ignored: ['**/node_modules/**', '**/.git/**']` to avoid excessive watches

**Implications**:
- Implement custom debounce wrapper around Chokidar events (300ms)
- Watch entire project directory but ignore `.git/`, `node_modules/`, `.kiro/runtime/`
- Start/stop watching based on GitView mount/unmount lifecycle
- Use `awaitWriteFinish` option to avoid partial file read issues

### Electron IPC Security for Git Operations

**Context**: Requirement 3 specifies IPC layer for git operations. Main Process must execute shell commands securely.

**Sources Consulted**:
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron Safe IPC patterns](https://github.com/seanchas116/electron-safe-ipc)
- [Penetration Testing of Electron Apps](https://deepstrike.io/blog/penetration-testing-of-electron-based-applications)

**Findings**:
- **Validate sender frame** in all IPC handlers to prevent untrusted renderers from executing privileged actions
- **Avoid synchronous IPC** (`sendSync`) — use `invoke()` async pattern
- **Sanitize file paths** before passing to `child_process.spawn` to prevent command injection
- Never expose raw `ipcRenderer` to renderer; use preload with explicit API surface

**Implications**:
- Implement sender validation in git IPC handlers
- Use `child_process.spawn` with argument array (not shell string) for git commands
- Validate project path exists and is within expected boundaries
- Return structured errors (type, message, code) for security-relevant failures

### Git Worktree Branch Detection

**Context**: Requirement 1.4 specifies automatic detection of worktree base branch.

**Sources Consulted**:
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Worktrunk CLI for worktree management](https://github.com/max-sixty/worktrunk)
- [Git worktree HEAD parsing](https://gist.github.com/GeorgeLyon/ff5a42cb24c1de09e4139266a7689543)

**Findings**:
- Worktree HEAD location: `.git/worktrees/{name}/HEAD`
- Parse HEAD file to extract branch ref (e.g., `ref: refs/heads/feature/branch`)
- Use `git worktree list --porcelain` for structured worktree information
- Detached HEAD state: HEAD contains commit SHA directly (no `ref:` prefix)

**Implications**:
- Parse `.git/worktrees/{name}/HEAD` to detect current branch
- Fall back to `git branch --show-current` if parsing fails
- Detect base branch via `git merge-base HEAD origin/master` (or configured main branch)
- Handle detached HEAD gracefully (show SHA instead of branch name)

### Git Diff for Untracked Files

**Context**: Requirement 1.5 specifies untracked files (`??` status) should be shown as "all lines added".

**Sources Consulted**:
- [Git diff untracked files guide](https://copyprogramming.com/howto/can-i-use-git-diff-on-untracked-files)
- [Git documentation on intent-to-add](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)

**Findings**:
- `git diff` ignores untracked files by default
- **Traditional method**: `git add -N <file>` (intent-to-add) stages file without content, making it visible to `git diff`
- **Modern method (Git 2.44+)**: `git diff --include-untracked` shows untracked files directly
- Untracked files require manual patch generation: read file content, generate unified diff with all lines as additions

**Implications**:
- Use `git add -N` approach for compatibility with older Git versions
- For each untracked file, generate synthetic diff: `+` prefix on all lines
- Include file header: `diff --git a/<path> b/<path>`, `new file mode 100644`, `--- /dev/null`, `+++ b/<path>`

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Main Process Git Service + Renderer Store | Main process owns git operations, chokidar watching. Renderer has gitViewStore (UI state) + ApiClient for git data | Clean separation of concerns, aligns with Electron best practices | Slightly more IPC overhead | **Selected** — follows structure.md Electron Process Boundary Rules |
| Renderer-only with IPC passthrough | All git logic in renderer, Main Process just forwards git commands | Simpler IPC surface | Violates Electron security model, renderer crash loses state | Rejected — violates steering principle |
| Shared Service Layer | Move git logic to `shared/services/`, callable from both Main and Renderer | Code reuse | Node.js APIs (fs, child_process) unavailable in Renderer | Rejected — incompatible with Electron architecture |

## Design Decisions

### Decision: Use react-diff-view with Refractor for Syntax Highlighting

**Context**: Requirements 8.1-8.2 specify syntax-highlighted diff display with unified/split mode support.

**Alternatives Considered**:
1. **react-diff-viewer** (by praneshr) — simpler API, works with PrismJS directly, but less control over tokenization
2. **react-diff-view** (by otakustay) — lower-level API, requires refractor integration, supports web workers
3. **Custom implementation** with `diff` library + PrismJS — full control, but significant development effort

**Selected Approach**: react-diff-view with refractor

**Rationale (Why)**:
- **Professional-grade diff rendering**: Used in production by major platforms (GitHub-style)
- **Advanced tokenization**: `markEdits()` enhancer provides character-level inline diff highlighting
- **Performance**: Web worker support for non-blocking syntax highlighting
- **Extensibility**: Refractor supports 200+ languages with consistent API
- **Maintainability**: Active maintenance, comprehensive documentation

**Trade-offs**:
- **Benefit**: Superior visual quality and extensibility
- **Compromise**: Slightly steeper learning curve than react-diff-viewer

**Follow-up**:
- Verify refractor language pack inclusion for project's primary languages (JS/TS/Python/Go)
- Test tokenization performance with large diffs (>1000 lines)

### Decision: Custom Debounce Implementation for Chokidar

**Context**: Requirement 2.3 specifies 300ms debounce for file watch events to reduce git operation frequency.

**Alternatives Considered**:
1. **chokidar-debounced npm package** — pre-built solution, but adds dependency
2. **Custom debounce utility** — lightweight, project-specific control
3. **No debounce** — rely on Chokidar's `awaitWriteFinish` option only

**Selected Approach**: Custom debounce utility in Main Process service

**Rationale (Why)**:
- **Simplicity**: Single-purpose utility (~20 lines), no external dependency
- **Control**: Adjust debounce timing per event type (e.g., shorter for single file changes)
- **Integration**: Direct integration with existing service patterns in `main/services/`

**Trade-offs**:
- **Benefit**: Zero external dependencies, full control over behavior
- **Compromise**: Requires unit testing for debounce logic

**Follow-up**:
- Implement debounce with timer reset on rapid events
- Emit single aggregated event after 300ms silence

### Decision: ApiClient Pattern for Remote UI Compatibility

**Context**: Requirement 10 specifies Remote UI support for GitView. All git operations must work via WebSocket.

**Alternatives Considered**:
1. **Dual implementation** — separate IPC handlers for Electron, separate WebSocket handlers for Remote UI
2. **ApiClient abstraction** — unified interface, IpcApiClient vs WebSocketApiClient
3. **Remote UI unsupported** — Electron-only feature

**Selected Approach**: ApiClient abstraction with IpcApiClient and WebSocketApiClient

**Rationale (Why)**:
- **Consistency**: Aligns with existing pattern for specs/bugs APIs (see `shared/api/types.ts`)
- **Code reuse**: GitView component code can be shared 100% between platforms
- **Maintainability**: Single source of truth for git operation contracts

**Trade-offs**:
- **Benefit**: Zero code duplication for GitView UI components
- **Compromise**: Requires WebSocket handler implementation in Main Process

**Follow-up**:
- Define `git:get-status`, `git:get-diff`, `git:watch-changes` in `shared/api/types.ts`
- Implement WebSocket handlers in `main/services/webSocketHandler.ts`

### Decision: Segmented Control for Artifacts/Git Diff Toggle

**Context**: Requirement 5 specifies UI for switching between ArtifactEditor and GitView within CenterPane.

**Alternatives Considered**:
1. **Tab-based navigation** — horizontal tabs like requirements/design/tasks
2. **Toggle button** — single button to switch modes
3. **Segmented control** — iOS-style segmented button (2 options, mutually exclusive)

**Selected Approach**: Segmented control (2-segment: "Artifacts" | "Git Diff")

**Rationale (Why)**:
- **Visual distinction**: Avoids confusion with ArtifactEditor's internal tabs (requirements/design/tasks)
- **Appropriate for binary choice**: Only 2 options, always one active
- **Consistency**: Matches existing mode toggles in project (Edit/Preview buttons)

**Trade-offs**:
- **Benefit**: Clear visual hierarchy, avoids nested tabs
- **Compromise**: Less extensible if future views are added (but YAGNI applies)

**Follow-up**:
- Implement segmented control as reusable component (`shared/components/ui/SegmentedControl.tsx`)
- Store selection state in gitViewStore or layoutStore

### Decision: Main Process Owns Git Operations and File Watching

**Context**: Requirements 1-3 specify git operations and file watching. Must decide where state is managed.

**Alternatives Considered**:
1. **Renderer-side management** — renderer initiates git commands, manages chokidar
2. **Main Process management** — Main owns git operations, chokidar, broadcasts updates
3. **Hybrid** — git operations in Main, file watching in Renderer

**Selected Approach**: Main Process owns both git operations and file watching

**Rationale (Why)**:
- **Electron best practices**: Node.js APIs (child_process, chokidar) belong in Main Process
- **State durability**: File watcher survives renderer crashes/reloads
- **Remote UI compatibility**: WebSocket can subscribe to same git change events
- **Security**: Git operations isolated from renderer process

**Trade-offs**:
- **Benefit**: Correct Electron architecture, supports multi-window scenarios
- **Compromise**: Requires IPC channel for watch start/stop

**Follow-up**:
- Implement `GitService` in `main/services/gitService.ts`
- Implement `GitFileWatcherService` in `main/services/gitFileWatcherService.ts`
- Broadcast `git:changes-detected` event to all renderers on file change

## Risks & Mitigations

- **Risk**: Large diffs (>10,000 lines) may cause UI lag during tokenization
  - **Mitigation**: Implement web worker for tokenization, use react-window for virtual scrolling in diff viewer
- **Risk**: Git operations may fail in non-git directories
  - **Mitigation**: Validate `.git` directory existence before executing git commands, return user-friendly error
- **Risk**: File watcher may trigger excessive git operations on bulk changes (e.g., `git checkout`)
  - **Mitigation**: 300ms debounce + aggregate multiple file changes into single git status refresh
- **Risk**: Syntax highlighting for unknown file types may fail
  - **Mitigation**: Fallback to plain text rendering, detect language via file extension with comprehensive mapping
- **Risk**: Worktree base branch detection may fail in detached HEAD state
  - **Mitigation**: Show commit SHA instead of branch name, provide manual base branch selection option (future enhancement)

## References

- [react-diff-view GitHub](https://github.com/otakustay/react-diff-view) — Primary diff rendering library
- [Refractor (Prism-based syntax highlighting)](https://github.com/wooorm/refractor) — Syntax highlighting engine
- [Chokidar File Watcher](https://github.com/paulmillr/chokidar) — Cross-platform file watching
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security) — IPC validation patterns
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree) — Worktree branch detection
- [Git Diff Untracked Files Guide](https://copyprogramming.com/howto/can-i-use-git-diff-on-untracked-files) — Untracked file handling
