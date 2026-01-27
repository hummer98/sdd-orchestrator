---
description: Merge worktree branch to main and cleanup worktree
allowed-tools: Bash, Read, Write, Edit, Glob
argument-hint: <feature-name>
---

# Spec Merge

<background_information>
- **Mission**: Merge the worktree branch to main branch and cleanup the worktree
- **Success Criteria**:
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

#### 1.1: Verify Main Branch
1. Verify current directory is the main project (not the worktree)
   - Run `git rev-parse --show-toplevel` and compare with pwd
2. Check current branch:
   - Run `git branch --show-current`
   - If branch is `dev`, `main`, or `master`: proceed to Step 1.2
   - If branch is any other name:
     - **PAUSE EXECUTION** and ask user for confirmation:
       ```
       ## Warning: Non-standard Base Branch

       現在のブランチ: {current_branch}

       通常、spec-mergeは `dev`, `main`, `master` から実行されます。
       このブランチにマージしてよろしいですか？

       **Yes** を選択すると、このブランチにマージを実行します。
       **No** を選択すると、操作をキャンセルします。
       ```
     - Wait for user response
     - If user confirms: proceed to Step 1.2
     - If user declines: **EXIT** with message "Operation cancelled by user"

#### 1.2: Resolve Worktree Path and Read spec.json
**spec-worktree-early-creation**: In early worktree creation mode, spec.json exists ONLY in the worktree, not in main.

1. Derive worktree path from convention:
   - Relative path: `.kiro/worktrees/specs/$1`
   - Absolute path: `$(pwd)/.kiro/worktrees/specs/$1`
2. Verify worktree directory exists:
   ```bash
   ls -d ".kiro/worktrees/specs/$1" 2>/dev/null
   ```
   - If not found, error: "Worktree not found at .kiro/worktrees/specs/$1. This command is only for worktree mode."
3. Read spec.json from worktree:
   - Path: `.kiro/worktrees/specs/$1/.kiro/specs/$1/spec.json`
4. Verify `worktree` field exists in spec.json
   - If not found, error: "No worktree configured for this spec. This command is only for worktree mode."
5. Extract worktree information:
   - `worktree.path`: relative path to worktree (should match convention)
   - `worktree.branch`: feature branch name (e.g., `feature/$1`)

### Step 1.5: Validate Inspection Completion

**remove-inspection-phase-auto-update**: This validation is REQUIRED before merge.
spec-merge can only merge specs that have passed inspection (phase = inspection-complete).

#### 1.5.1: Use Worktree Path from Step 1.2
```bash
# Already resolved in Step 1.2
WORKTREE_ABSOLUTE_PATH=$(pwd)/.kiro/worktrees/specs/$1
```

#### 1.5.2: Read spec.json from Worktree (already done in Step 1.2)
Use the spec.json already read in Step 1.2: `.kiro/worktrees/specs/$1/.kiro/specs/$1/spec.json`

#### 1.5.3: Validate Phase
Check the `phase` field in spec.json:

**IF** `phase` is NOT `inspection-complete`:
- **ABORT** with error message:
  ```
  ## Error: Inspection Not Complete

  spec-mergeはinspection-complete状態のspecのみマージ可能です。
  現在のphase: {phase}

  ### Next Steps
  1. Run `/kiro:spec-inspection $1` to inspect the implementation
  2. Ensure inspection result is GO
  3. Re-run `/kiro:spec-merge $1`
  ```
- **EXIT** (do not continue to Step 2)

#### 1.5.4: Validate Inspection Result
Check the `inspection.rounds` array in spec.json:

1. If `inspection.rounds` does not exist or is empty:
   - **ABORT** with error message:
     ```
     ## Error: No Inspection Record

     Inspection結果が記録されていません。

     ### Next Steps
     1. Run `/kiro:spec-inspection $1` to inspect the implementation
     2. Re-run `/kiro:spec-merge $1`
     ```
   - **EXIT**

2. Get the latest round (last element in `inspection.rounds` array)
3. Check if `result` is `"go"`:
   - **IF** `result` is NOT `"go"`:
     - **ABORT** with error message:
       ```
       ## Error: Inspection GO Required

       Inspection GO判定が必要です。
       最新のInspection結果: {result}

       ### Next Steps
       1. Run `/kiro:spec-inspection $1` to re-inspect
       2. Or run `/kiro:spec-inspection $1 --fix` to fix issues
       3. Re-run `/kiro:spec-merge $1`
       ```
     - **EXIT**

**IF** both validations pass:
- Log: "Inspection validation passed (phase: inspection-complete, result: go)"
- Proceed to Step 2

### Step 2: Prepare Worktree for Merge
Before merging, commit all changes including spec.json update in the worktree.

#### 2.1: Use Worktree Path from Step 1.2
```bash
# Already resolved in Step 1.2
PROJECT_ROOT=$(pwd)
WORKTREE_ABSOLUTE_PATH="${PROJECT_ROOT}/.kiro/worktrees/specs/$1"
```

#### 2.2: Commit Pending Implementation Changes (if any)
```bash
cd "${WORKTREE_ABSOLUTE_PATH}" && git status --porcelain
```

**IF** output is not empty (uncommitted changes exist):
1. Stage and commit:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && git add . && git commit -m "feat($1): implementation complete"
   ```
2. Log: "Worktree内の未コミット変更をコミットしました"

#### 2.3: Update spec.json in Worktree
Update spec.json to deploy-complete state **in the worktree** using the helper script, so it's included in the squash merge.

**merge-helper-scripts**: Use the helper script to ensure reliable execution in the worktree directory.

1. Change directory to worktree and execute the script:
   ```bash
   cd "${WORKTREE_ABSOLUTE_PATH}" && .kiro/scripts/update-spec-for-deploy.sh $1
   ```

The script will:
- Remove the `worktree` property from spec.json
- Set `phase` to `"deploy-complete"`
- Update `updated_at` to current UTC timestamp
- Stage and commit the changes

#### 2.4: Return to Main Project
```bash
cd "$PROJECT_ROOT"
```

### Step 3: Perform Merge

> **Note**: All changes (implementation + spec.json update) are already committed in the worktree.
> Squash merge will include everything - no `git add` needed on main branch.

**jj-merge-support**: Use the helper script to execute merge with jj/git fallback.

#### 3.1: Check Script Existence
Verify merge-spec.sh script is installed:
```bash
[ -f ".kiro/scripts/merge-spec.sh" ] && echo "OK" || echo "NOT_FOUND"
```

**IF** script not found:
- **Error**: "merge-spec.sh not found at .kiro/scripts/merge-spec.sh"
- **Suggested Action**: "Run commandset install to deploy helper scripts"
- **EXIT** (do not proceed)

#### 3.2: Execute Merge Script
Run the merge script with feature name:
```bash
bash .kiro/scripts/merge-spec.sh $1
```

The script will:
- Check if jj is available
- If jj exists: Use `jj squash --from {branch} --into {main}` for merge
- If jj not found: Fallback to `git merge --squash {branch}`
- If merge succeeds: Commit, remove worktree, delete branch
- Return exit code: 0 (success), 1 (conflict), 2+ (error)

#### 3.3: Check Exit Code
Capture the exit code and handle accordingly:

**Exit Code 0 (Success)**:
- Log: "Merge completed successfully"
- **Go to Step 6** (Report Success)

**Exit Code 1 (Conflict)**:
- Log: "Merge has conflicts - attempting AI-powered resolution"
- **Go to Step 4** (Conflict Resolution)

**Exit Code 2+ (Error)**:
- **Error**: "Merge script failed with exit code {exit_code}"
- Display script error output (stderr)
- **Suggested Action**:
  - If jq missing: "Install jq: brew install jq"
  - If spec.json missing: "spec.json not found in expected location"
  - If permission denied: "Grant execute permission: chmod +x .kiro/scripts/merge-spec.sh"
- **EXIT** (do not proceed)


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

#### 4.3: Post-Resolution
**IF** all conflicts resolved (no conflicted files remain):
- Generate commit message by analyzing staged changes:
  - Get changed files: `git diff --cached --name-only`
  - Determine change type (usually `feat` for spec implementations)
  - Format: `feat($1): <description>`
- Create merge commit with generated message
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
  6. Run: `git commit -m "feat($1): merge implementation from worktree"`
  7. Re-run this command to complete cleanup: `/kiro:spec-merge $1`
  ```
- **EXIT** (do not continue to Step 5)

### Step 5: Cleanup Worktree
**jj-merge-support**: Cleanup is handled by merge-spec.sh script in Step 3.

**IF** Step 3 returned exit code 0:
- Script already cleaned up worktree and deleted branch
- **Skip this step** (Go to Step 6)

**IF** Step 4 (Conflict Resolution) succeeded:
- Conflicts resolved manually, need to cleanup
- Use `WORKTREE_ABSOLUTE_PATH` resolved in Step 2.1

#### 5.1: Remove Worktree Directory
```bash
git worktree remove "{WORKTREE_ABSOLUTE_PATH}" --force
```
- The `--force` flag is needed to remove even if there are untracked files
- If this fails, log warning but continue to next step

#### 5.2: Delete Feature Branch
```bash
git branch -D {worktree.branch}
```
- Use `-D` for force delete (squash-merge does not mark branch as "merged")
- If this fails, log warning but continue to next step

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

**Phase is not inspection-complete** (remove-inspection-phase-auto-update):
- Error: "spec-mergeはinspection-complete状態のspecのみマージ可能です"
- Suggested Action: "Run `/kiro:spec-inspection {feature}` to inspect the implementation first"
- **Do not proceed with merge**

**Inspection result is not GO** (remove-inspection-phase-auto-update):
- Error: "Inspection GO判定が必要です"
- Suggested Action: "Run `/kiro:spec-inspection {feature} --fix` to fix issues and re-inspect"
- **Do not proceed with merge**

**Not on main branch**:
- Error: "spec-merge must be run from the main branch"
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
