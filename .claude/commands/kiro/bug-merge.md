---
description: Merge bug fix from worktree branch to main and cleanup
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: <bug-name>
---

# Bug Merge

<background_information>
- **Mission**: Merge bug fix from worktree branch to main and cleanup worktree
- **Success Criteria**:
  - Bug fix is merged to main branch (squash merge)
  - Worktree is removed
  - bug.json worktree field is removed
  - Conflicts are resolved (auto or with user guidance)
- **Workflow Position**: Report → Analyze → Fix → Verify → **Merge** (worktree mode only)
</background_information>

<instructions>
## Core Task
Merge the bug fix from worktree branch `bugfix/{bug-name}` to main branch.

## Parse Arguments
- Bug name: `$1` (required)

## Preconditions Check
1. **Verify Worktree Mode**: Read `.kiro/bugs/$1/bug.json`
   - If `worktree` field is missing, abort with error: "This bug is not in worktree mode"
2. **Verify Current Branch**: Must be on main/master branch
   - Run `git branch --show-current`
   - If not on main/master, abort with error

## Execution Steps

### Step 1: Prepare Worktree for Merge
Before merging, update bug.json in the worktree so it's included in the squash merge.

**merge-helper-scripts**: Use the helper script to ensure reliable execution in the worktree directory.

1. **Derive worktree path**:
   ```bash
   PROJECT_ROOT=$(pwd)
   WORKTREE_ABSOLUTE_PATH="${PROJECT_ROOT}/.kiro/worktrees/bugs/$1"
   ```
2. **Update bug.json in worktree** using the helper script:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && .kiro/scripts/update-bug-for-deploy.sh $1
   ```
   The script will:
   - Remove the `worktree` property from bug.json
   - Update `updated_at` to current UTC timestamp
   - Stage and commit the changes
3. **Return to main project**:
   ```bash
   cd "$PROJECT_ROOT"
   ```

### Step 2: Fetch and Merge
1. **Fetch Latest Changes**:
   - `git fetch origin`
2. **Perform Squash Merge**:
   - `git merge --squash bugfix/{bug-name}`

### Step 3: Handle Conflicts (if any)
- Attempt auto-resolution up to 7 times
- For each conflict:
  - Read conflicting files
  - Analyze both versions
  - Choose appropriate resolution
  - `git add {resolved-file}`
- If auto-resolution fails after 7 attempts:
  - Report conflicting files to user
  - Provide guidance for manual resolution
  - Abort merge process

### Step 4: Commit Merge
- `git commit -m "fix({bug-name}): {bug summary from report.md}"`

### Step 5: Cleanup Worktree
- Remove worktree directory: `git worktree remove {worktree-path} --force`
- Delete branch: `git branch -d bugfix/{bug-name}` (or -D if necessary)

## Important Constraints
- This command is ONLY for bugs in worktree mode
- Always use squash merge to keep history clean
- Worktree cleanup happens AFTER successful merge
- If merge fails, worktree is preserved for manual resolution
</instructions>

## Tool Guidance
- Use **Bash** for git operations (merge, worktree, branch)
- Use **Read** to examine bug.json and conflict files
- Use **Write** to update bug.json after cleanup
- Use **Edit** for conflict resolution

## Output Description
Provide output with the following structure:

1. **Merge Status**: SUCCESS / CONFLICT / ABORTED
2. **Branch**: bugfix/{bug-name} → main
3. **Commit**: Commit hash and message (if successful)
4. **Cleanup**: Worktree and branch removal status
5. **Next Step**:
   - If SUCCESS: Bug is ready for deployment
   - If CONFLICT: Manual resolution instructions

**Format Requirements**:
- Use clear status indicators
- Show git command output for transparency
- Include conflict details if applicable

## Safety & Fallback
- **Not in Worktree Mode**: If bug.json has no worktree field, suggest using normal commit
- **Not on Main Branch**: Abort and instruct user to checkout main first
- **Merge Conflicts**: After 7 auto-resolution attempts, provide detailed conflict report
- **Worktree Removal Failure**: Continue with merge completion, warn about manual cleanup needed
