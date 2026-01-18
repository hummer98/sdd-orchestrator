---
description: Merge worktree branch to main and cleanup worktree
allowed-tools: Bash, Read, Write, Edit, Glob
argument-hint: <feature-name>
---

# Spec Merge

<background_information>
- **Mission**: Merge the worktree branch to main branch and cleanup the worktree
- **Success Criteria**:
  - Spec symlink removed and git reset/checkout executed (worktree-spec-symlink)
  - Feature branch successfully merged to main (squash merge)
  - Worktree directory removed
  - spec.json worktree field removed
  - No conflicts remaining (auto-resolved or reported)
- **Workflow Position**: Implementation (worktree) -> Inspection -> **Spec Merge** -> Done
</background_information>

<instructions>
## Core Task
Merge the feature branch from worktree to main branch, then cleanup the worktree.

## Parse Arguments
- Feature name: `$1` (required)

## Execution Steps

### Step 1: Validate Prerequisites
1. Read `.kiro/specs/$1/spec.json`
2. Verify `worktree` field exists in spec.json
   - If not found, error: "No worktree configured for this spec. This command is only for worktree mode."
3. Extract worktree information:
   - `worktree.path`: relative path to worktree
   - `worktree.branch`: feature branch name (e.g., `feature/$1`)
4. Verify current directory is the main project (not the worktree)
   - Run `git rev-parse --show-toplevel` and compare with pwd
5. Verify current branch is main or master
   - Run `git branch --show-current`
   - If not main/master, error: "spec-merge must be run from the main branch"

### Step 1.5: Prepare Worktree for Merge (worktree-spec-symlink)
Before merging, prepare the worktree to avoid conflicts with spec files.

#### 1.5.1: Resolve Worktree Path and Restore Spec Directory
Resolve the worktree path and restore spec directory from git in a single operation:
```bash
WORKTREE_ABSOLUTE_PATH=$(cd "{worktree.path}" && pwd) && rm -f "${WORKTREE_ABSOLUTE_PATH}/.kiro/specs/$1" && cd "${WORKTREE_ABSOLUTE_PATH}" && git reset ".kiro/specs/$1" && git checkout ".kiro/specs/$1"
```

This command:
1. Resolves the worktree absolute path from spec.json's relative path
2. Removes the spec symlink (if exists) - `rm -f` safely ignores non-symlinks
3. Unstages any spec directory changes (`git reset`)
4. Restores spec directory to HEAD state (`git checkout`)

After execution, the worktree's spec directory matches the committed state in the feature branch, avoiding merge conflicts (spec changes exist only in main repo via symlink during implementation).

### Step 1.6: Commit Pending Changes in Worktree
Before merging, ensure all implementation changes in worktree are committed.

#### 1.6.1: Check for Uncommitted Changes
```bash
cd "${WORKTREE_ABSOLUTE_PATH}" && git status --porcelain
```

#### 1.6.2: Commit All Changes (if any)
**IF** output is not empty (uncommitted changes exist):
1. Stage all changes:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && git add .
   ```
2. Commit with message:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && git commit -m "feat($1): implementation complete"
   ```
3. Log: "Worktree内の未コミット変更をコミットしました"

**ELSE** (no uncommitted changes):
- Log: "Worktree内に未コミット変更はありません"

#### 1.6.3: Return to Main Project
```bash
cd "$PROJECT_ROOT"
```

### Step 2: Perform Merge
1. Ensure working directory is clean:
   - Run `git status --porcelain`
   - If there are uncommitted changes, warn but continue (per requirements)
2. Merge the feature branch with squash:
   ```bash
   git merge --squash {worktree.branch}
   ```
3. If merge succeeds without conflicts:
   - Create merge commit:
     ```bash
     git commit -m "feat($1): merge implementation from worktree"
     ```
4. If merge has conflicts:
   - Attempt AI-powered conflict resolution (see Step 3)

### Step 3: Conflict Resolution (if needed)
**Maximum 7 attempts** - Track attempt count and exit after 7 failures.

#### 3.1: Detect Conflicted Files
Run the following command to get list of conflicted files:
```bash
git diff --name-only --diff-filter=U
```
- If output is empty, no conflicts exist - proceed to commit
- Parse output to get list of file paths (one per line)

#### 3.2: Resolution Loop
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
        2. **Feature branch priority**: For true conflicts (same line modified), prefer "theirs" (feature branch changes) as newer implementation
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

#### 3.3: Post-Resolution
**IF** all conflicts resolved (no conflicted files remain):
- Create merge commit:
  ```bash
  git commit -m "feat($1): merge implementation from worktree (conflicts resolved)"
  ```
- Proceed to Step 4

**ELSE IF** `attempt_count >= max_attempts`:
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
  5. Run: `git add .`
  6. Run: `git commit -m "feat($1): merge implementation from worktree"`
  7. Re-run this command to complete cleanup: `/kiro:spec-merge $1`
  ```
- **EXIT** (do not continue to Step 4)

### Step 4: Cleanup Worktree
Only proceed if merge was successful (Step 2 or Step 3 completed).

#### 4.1: Resolve Worktree Path
Convert the relative path from spec.json to absolute path:
```bash
# Get project root
PROJECT_ROOT=$(pwd)
# Resolve relative path to absolute
WORKTREE_ABSOLUTE_PATH=$(cd "$PROJECT_ROOT" && cd "{worktree.path}" && pwd)
```
Alternative using path manipulation:
- If `worktree.path` is `../project-worktrees/feature-name`
- And `PROJECT_ROOT` is `/path/to/project`
- Then absolute path is `/path/to/project-worktrees/feature-name`

#### 4.2: Remove Worktree Directory
```bash
git worktree remove "{WORKTREE_ABSOLUTE_PATH}" --force
```
- The `--force` flag is needed to remove even if there are untracked files
- If this fails, log warning but continue to next step

#### 4.3: Delete Feature Branch
```bash
git branch -d {worktree.branch}
```
- Use `-d` for safe delete (only if merged)
- If `-d` fails with "not fully merged" error, use `-D` to force delete:
  ```bash
  git branch -D {worktree.branch}
  ```
- If this fails, log warning but continue to next step

### Step 5: Update spec.json
Remove the worktree field from spec.json.

#### 5.1: Read Current spec.json
Read `.kiro/specs/$1/spec.json` to get current content.

#### 5.2: Remove worktree Field
Parse the JSON and remove the `worktree` property:
- Keep all other fields intact
- Ensure valid JSON formatting with proper indentation (2 spaces)

#### 5.3: Write Updated spec.json
Write the modified JSON back to `.kiro/specs/$1/spec.json`.

Example transformation:
```json
// Before
{
  "feature_name": "my-feature",
  "phase": "implementation-complete",
  "worktree": {
    "path": "../project-worktrees/my-feature",
    "branch": "feature/my-feature",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "approvals": { ... }
}

// After
{
  "feature_name": "my-feature",
  "phase": "implementation-complete",
  "approvals": { ... }
}
```

### Step 6: Report Success
Display completion message with the following format:

```markdown
## Spec Merge Complete

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
- **spec.json updated**: success (worktree field removed)

### Next Steps
The feature has been merged to main. You can now:
1. Push changes: `git push origin main`
2. Start a new feature: `/kiro:spec-plan "description"`
```

</instructions>

## Tool Guidance
- Use **Read** to read spec.json and conflicted files
- Use **Bash** for git commands (merge, worktree remove, branch delete)
- Use **Edit** to resolve conflicts in files
- Use **Write** to update spec.json

## Output Description
Provide output with the following structure:

1. **Merge Summary**: Branch merged, commit hash
2. **Conflict Resolution**: List of resolved conflicts (if any)
3. **Cleanup**: Worktree and branch removal status
4. **spec.json Update**: Confirmation of worktree field removal

**Format Requirements**:
- Use Markdown headings
- Show git command outputs where relevant
- Clearly indicate success or failure

## Safety & Fallback

### Error Scenarios

**No worktree field in spec.json**:
- Error: "No worktree configured for this spec"
- Suggested Action: "This command is for worktree mode only. Use `/commit` for normal mode."

**Not on main branch**:
- Error: "spec-merge must be run from the main branch"
- Suggested Action: "Run `git checkout main` first"

**Merge conflicts unresolvable (after 7 attempts)**:
- Error: "Unable to automatically resolve conflicts"
- List conflicted files
- Suggested Action: "Manually resolve conflicts and run `git add . && git commit`"
- **Do not proceed with cleanup**

**Worktree removal fails**:
- Warning: "Failed to remove worktree"
- Still proceed with spec.json update
- Suggested Action: "Manually remove: `git worktree remove {path} --force`"

**Branch deletion fails**:
- Warning: "Failed to delete branch"
- Still proceed with spec.json update
- Suggested Action: "Manually delete: `git branch -D {branch}`"
