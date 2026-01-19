---
description: Initialize a new specification with detailed project description
allowed-tools: Bash, Read, Write, Glob
argument-hint: <project-description> [--worktree]
---

# Spec Initialization

<background_information>
- **Mission**: Initialize the first phase of spec-driven development by creating directory structure and metadata for a new specification
- **Success Criteria**:
  - Generate appropriate feature name from project description
  - Create unique spec structure without conflicts
  - (If --worktree) Create git worktree for isolated development
  - Provide clear path to next phase (requirements generation)
</background_information>

<instructions>
## Core Task
Generate a unique feature name from the project description ($ARGUMENTS) and initialize the specification structure.

**If `--worktree` flag is present**: Create a git worktree for isolated feature development.

## Execution Steps

### Phase 0: Parse Arguments and Validate (--worktree only)

If `--worktree` flag is present in $ARGUMENTS:

1. **Remove flag from description**: Extract the project description without `--worktree`
2. **Check current branch**: Run `git branch --show-current`
   - If NOT on `main` or `master`: Display error "Worktreeモードはmain/masterブランチでのみ使用できます。現在のブランチ: {branch}" and STOP
3. Continue to Phase 1 with worktree mode enabled

### Phase 1: Feature Name Generation
1. **Check Uniqueness**: Verify `.kiro/specs/` for naming conflicts (append number suffix if needed)
2. Generate kebab-case feature name from description

### Phase 2: Worktree Creation (--worktree only)

If worktree mode is enabled:

1. **Create branch**: `git branch feature/{feature-name}`
   - If branch already exists: Display error "ブランチ feature/{feature-name} は既に存在します" and STOP
2. **Create worktree**: `git worktree add .kiro/worktrees/specs/{feature-name} feature/{feature-name}`
   - If worktree already exists: Display error and STOP
   - **Rollback on failure**: If worktree creation fails, delete the branch with `git branch -d feature/{feature-name}`
3. **Change working directory**: `cd .kiro/worktrees/specs/{feature-name}`

### Phase 3: Initialize Spec Files

1. **Create Directory**:
   - Normal mode: `.kiro/specs/{feature-name}/`
   - Worktree mode: `.kiro/specs/{feature-name}/` (within the worktree)

2. **Initialize Files Using Templates**:
   - Read `.kiro/settings/templates/specs/init.json`
   - Read `.kiro/settings/templates/specs/requirements-init.md`
   - Replace placeholders:
     - `{{FEATURE_NAME}}` → generated feature name
     - `{{TIMESTAMP}}` → current ISO 8601 UTC timestamp
     - `{{PROJECT_DESCRIPTION}}` → description (without --worktree flag)

3. **Add worktree field to spec.json** (--worktree only):
   ```json
   "worktree": {
     "enabled": true,
     "path": ".kiro/worktrees/specs/{feature-name}",
     "branch": "feature/{feature-name}",
     "created_at": "{timestamp}"
   }
   ```

4. **Write files**: `spec.json` and `requirements.md` to spec directory

## Important Constraints
- DO NOT generate requirements/design/tasks at this stage
- Follow stage-by-stage development principles
- Maintain strict phase separation
- Only initialization is performed in this phase
- **Worktree mode requires main/master branch**
</instructions>

## Tool Guidance
- Use **Glob** to check existing spec directories for name uniqueness
- Use **Bash** for git operations (branch check, worktree creation)
- Use **Read** to fetch templates: `init.json` and `requirements-init.md`
- Use **Write** to create spec.json and requirements.md after placeholder replacement
- Perform validation before any file write operation

## Output Description
Provide output in the language specified in `spec.json` with the following structure:

1. **Generated Feature Name**: `feature-name` format with 1-2 sentence rationale
2. **Project Summary**: Brief summary (1 sentence)
3. **Mode**: Normal or Worktree (if --worktree was specified)
4. **Created Files**: Bullet list with full paths
5. **Next Step**: Command block showing `/kiro:spec-requirements <feature-name>`
6. **Notes**: Explain why only initialization was performed (2-3 sentences on phase separation)

**Worktree Mode Additional Output**:
- Branch name: `feature/{feature-name}`
- Worktree path: `.kiro/worktrees/specs/{feature-name}`
- Note that subsequent commands will execute in the worktree directory

**Format Requirements**:
- Use Markdown headings (##, ###)
- Wrap commands in code blocks
- Keep total output concise (under 250 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Ambiguous Feature Name**: If feature name generation is unclear, propose 2-3 options and ask user to select
- **Template Missing**: If template files don't exist in `.kiro/settings/templates/specs/`, report error with specific missing file path and suggest checking repository setup
- **Directory Conflict**: If feature name already exists, append numeric suffix (e.g., `feature-name-2`) and notify user of automatic conflict resolution
- **Write Failure**: Report error with specific path and suggest checking permissions or disk space
- **Not on main/master (--worktree)**: Display error message indicating that worktree mode requires main/master branch
- **Branch exists (--worktree)**: Display error message indicating that the branch already exists
- **Worktree creation failure**: Rollback by deleting the created branch, then display error message