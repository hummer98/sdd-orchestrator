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

## Execution Steps

### Step 1: Validate Prerequisites

#### 1.1: Verify Main Branch
1. Verify current directory is the main project (not the worktree)
   - Run `git rev-parse --show-toplevel` and compare with pwd
2. Verify current branch is main or master
   - Run `git branch --show-current`
   - If not main/master, error: "bug-merge must be run from the main branch"

#### 1.2: Resolve Worktree Path and Read bug.json
**bugs-worktree-directory-mode**: In worktree mode, bug.json exists ONLY in the worktree, not in main.

1. Derive worktree path from convention:
   - Relative path: `.kiro/worktrees/bugs/$1`
   - Absolute path: `$(pwd)/.kiro/worktrees/bugs/$1`
2. Verify worktree directory exists:
   ```bash
   ls -d ".kiro/worktrees/bugs/$1" 2>/dev/null
   ```
   - If not found, error: "Worktree not found at .kiro/worktrees/bugs/$1. This command is only for worktree mode."
3. Read bug.json from worktree:
   - Path: `.kiro/worktrees/bugs/$1/.kiro/bugs/$1/bug.json`
4. Verify `worktree` field exists in bug.json
   - If not found, error: "No worktree configured for this bug. This command is only for worktree mode."
5. Extract worktree information:
   - `worktree.path`: relative path to worktree (should match convention)
   - `worktree.branch`: bugfix branch name (e.g., `bugfix/$1`)

### Step 2: Prepare Worktree for Merge
Before merging, commit all changes including bug.json update in the worktree.

#### 2.1: Use Worktree Path from Step 1.2
```bash
# Already resolved in Step 1.2
PROJECT_ROOT=$(pwd)
WORKTREE_ABSOLUTE_PATH="${PROJECT_ROOT}/.kiro/worktrees/bugs/$1"
```

#### 2.2: Commit Pending Implementation Changes (if any)
```bash
cd "${WORKTREE_ABSOLUTE_PATH}" && git status --porcelain
```

**IF** output is not empty (uncommitted changes exist):
1. Stage and commit:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && git add . && git commit -m "fix($1): bug fix complete"
   ```
2. Log: "Worktree内の未コミット変更をコミットしました"

#### 2.3: Update bug.json in Worktree
Update bug.json to remove worktree field **in the worktree** using the helper script, so it's included in the squash merge.

**merge-helper-scripts**: Use the helper script to ensure reliable execution in the worktree directory.

1. Change directory to worktree and execute the script:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && .kiro/scripts/update-bug-for-deploy.sh $1
   ```

The script will:
- Remove the `worktree` property from bug.json
- Update `updated_at` to current UTC timestamp
- Stage and commit the changes

#### 2.4: Return to Main Project
```bash
cd "$PROJECT_ROOT"
```

### Step 3: Perform Merge

> **Note**: All changes (implementation + bug.json update) are already committed in the worktree.
> Squash merge will include everything - no `git add` needed on main branch.

1. Fetch latest changes:
   ```bash
   git fetch origin
   ```
2. Verify main branch is clean:
   ```bash
   git status --porcelain
   ```
   - If there are uncommitted changes, warn and continue (they will NOT be included in merge)
3. Merge the bugfix branch with squash:
   ```bash
   git merge --squash {worktree.branch}
   ```
4. If merge succeeds without conflicts:
   - Create merge commit:
     ```bash
     git commit -m "fix($1): {bug summary from report.md}"
     ```
5. If merge has conflicts:
   - Attempt AI-powered conflict resolution (see Step 4)

### Step 4: Conflict Resolution (if needed)
**Maximum 7 attempts** - Track attempt count and exit after 7 failures.

#### 4.1: Detect Conflicted Files
Run the following command to get list of conflicted files:
```bash
git diff --name-only --diff-filter=U
```
- If output is empty, no conflicts exist - proceed to commit
- Parse output to get list of file paths (one per line)

#### 4.2: Resolution Loop
Initialize: `attempt_count = 0`, `max_attempts = 7`

**WHILE** conflicted files exist **AND** `attempt_count < max_attempts`:
1. Increment `attempt_count`
2. Log: "Conflict resolution attempt {attempt_count}/{max_attempts}"

3. **FOR EACH** conflicted file:
   a. Read the file content using **Read** tool
   b. Identify conflict markers:
      - Start marker: `<<<<<<< HEAD` (or `<<<<<<< ours`)
      - Separator: `=======`
      - End marker: `>>>>>>> {branch}` (or `>>>>>>> theirs`)
   c. For each conflict block found:
      - Extract "ours" section (between start marker and separator)
      - Extract "theirs" section (between separator and end marker)
      - Apply resolution strategy:
        1. **Additive merge preferred**: If changes are in different locations (e.g., different functions, different lines), keep both
        2. **Bugfix branch priority**: For true conflicts (same line modified), prefer "theirs" (bugfix branch changes) as newer fix
        3. **Semantic analysis**: Read surrounding context to understand intent
      - Remove ALL conflict markers (`<<<<<<<`, `=======`, `>>>>>>>` lines)
   d. Write the resolved file using **Edit** tool (replace entire file content if needed)
   e. Stage the file:
      ```bash
      git add {file_path}
      ```

4. Re-check for remaining conflicts:
   ```bash
   git diff --name-only --diff-filter=U
   ```
   - If empty, all conflicts resolved - **EXIT LOOP**

**END WHILE**

#### 4.3: Post-Resolution
**IF** all conflicts resolved (no conflicted files remain):
- Create merge commit:
  ```bash
  git commit -m "fix($1): {bug summary from report.md} (conflicts resolved)"
  ```
- Proceed to Step 5

**ELSE IF** `attempt_count >= max_attempts`:
- **Abort merge**:
  ```bash
  git merge --abort
  ```
- **STOP EXECUTION** - Do not proceed to cleanup
- Report failure to user:
  ```
  ## Conflict Resolution Failed

  Unable to automatically resolve merge conflicts after 7 attempts.
  Manual intervention is required.

  ### Remaining Conflicted Files:
  {list each file path}

  ### Manual Resolution Steps:
  1. Open each conflicted file
  2. Search for conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
  3. Resolve each conflict by keeping the desired changes
  4. Remove all conflict markers
  5. Stage only the resolved files: `git add <resolved-file-path>` (repeat for each file)
  6. Run: `git commit -m "fix($1): {bug summary}"`
  7. Re-run this command to complete cleanup: `/kiro:bug-merge $1`
  ```
- **EXIT** (do not continue to Step 5)

### Step 5: Cleanup Worktree
Only proceed if merge was successful (Step 3 or Step 4 completed).

Use `WORKTREE_ABSOLUTE_PATH` resolved in Step 2.1.

#### 5.1: Remove Worktree Directory
```bash
git worktree remove "{WORKTREE_ABSOLUTE_PATH}" --force
```
- The `--force` flag is needed to remove even if there are untracked files
- If this fails, log warning but continue to next step

#### 5.2: Delete Bugfix Branch
```bash
git branch -D {worktree.branch}
```
- Use `-D` for force delete (squash-merge does not mark branch as "merged")
- If this fails, log warning but continue to next step

### Step 6: Report Success
Display completion message with the following format:

```markdown
## Bug Merge Complete

### Merge Summary
- **Branch merged**: {worktree.branch}
- **Merge type**: squash
- **Commit**: {commit_hash} (run `git log -1 --oneline` to get this)

### Conflict Resolution
- **Conflicts detected**: {yes/no}
- **Resolution attempts**: {attempt_count} (if conflicts occurred)
- **Files resolved**: {list of resolved files, if any}

### Cleanup Status
- **Worktree removed**: {success/failed} - {worktree.path}
- **Branch deleted**: {success/failed} - {worktree.branch}
- **bug.json updated**: success (worktree field removed)

### Next Steps
The bug fix has been merged to main. You can now:
1. Push changes: `git push origin main`
2. Start a new bug fix: `/kiro:bug-create <name> "description"`
```

</instructions>

## Tool Guidance
- Use **Read** to read bug.json and conflicted files
- Use **Bash** for git commands (merge, worktree remove, branch delete)
- Use **Edit** to resolve conflicts in files
- Use **Write** to update bug.json

## Output Description
Provide output with the following structure:

1. **Merge Summary**: Branch merged, commit hash
2. **Conflict Resolution**: List of resolved conflicts (if any)
3. **Cleanup**: Worktree and branch removal status
4. **bug.json Update**: Confirmation of worktree field removal

**Format Requirements**:
- Use Markdown headings
- Show git command outputs where relevant
- Clearly indicate success or failure

## Safety & Fallback

### Error Scenarios

**No worktree field in bug.json**:
- Error: "No worktree configured for this bug"
- Suggested Action: "This command is for worktree mode only. Use `/commit` for normal mode."

**Not on main branch**:
- Error: "bug-merge must be run from the main branch"
- Suggested Action: "Run `git checkout main` first"

**Merge conflicts unresolvable (after 7 attempts)**:
- Error: "Unable to automatically resolve conflicts"
- List conflicted files
- Suggested Action: "Manually resolve conflicts, stage each file with `git add <file>`, then run `git commit`"
- **Do not proceed with cleanup**

**Worktree removal fails**:
- Warning: "Failed to remove worktree"
- Suggested Action: "Manually remove: `git worktree remove {path} --force`"

**Branch deletion fails**:
- Warning: "Failed to delete branch"
- Suggested Action: "Manually delete: `git branch -D {branch}`"
