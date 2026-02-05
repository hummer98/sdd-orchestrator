#!/bin/bash
# merge-bug.sh
# Bugマージスクリプト: bugfix worktreeブランチをmainブランチにマージ
# vcs-scheme-switching: bug.jsonからvcsSchemeを読み取り、適切なVCSコマンドを使用
#
# Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
# vcs-scheme-switching: Requirements 5.5, 5.6
#
# Usage: merge-bug.sh <bug-name>
# Exit codes:
#   0 - Success (マージ完了、worktree削除、ブランチ削除)
#   1 - Conflict (マージ中断、worktree削除せず)
#   2 - Error (jq不在、bug.json不在、引数不足、非標準ブランチ)

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: bug-name is required" >&2
  echo "Usage: merge-bug.sh <bug-name>" >&2
  exit 2
fi

BUG_NAME="$1"
WORKTREE_PATH=".kiro/worktrees/bugs/${BUG_NAME}"
WORKTREE_BUG_JSON="${WORKTREE_PATH}/.kiro/bugs/${BUG_NAME}/bug.json"
MAIN_BUG_JSON=".kiro/bugs/${BUG_NAME}/bug.json"

# Preconditions: Check if jq is installed (Requirement 6.1)
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is not installed. Install with: brew install jq (macOS) or apt install jq (Linux)" >&2
  exit 2
fi

# Preconditions: Check current branch is main/master/dev (Requirement 2.2, 6.4)
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "dev" ]; then
  echo "Error: Must be on main/master/dev branch. Current: $CURRENT_BRANCH" >&2
  exit 2
fi

# Preconditions: Check if bug.json exists (Requirement 6.2)
if [ -f "$WORKTREE_BUG_JSON" ]; then
  BUG_JSON="$WORKTREE_BUG_JSON"
  echo "Using bug.json from worktree: $BUG_JSON"
elif [ -f "$MAIN_BUG_JSON" ]; then
  BUG_JSON="$MAIN_BUG_JSON"
  echo "Using bug.json from main: $BUG_JSON"
else
  echo "Error: bug.json not found at $WORKTREE_BUG_JSON" >&2
  exit 2
fi

# Phase 1: Read worktree.branch BEFORE updating JSON (Requirement 2.1, 6.3)
BUGFIX_BRANCH=$(jq -r '.worktree.branch' "$BUG_JSON")
if [ -z "$BUGFIX_BRANCH" ] || [ "$BUGFIX_BRANCH" = "null" ]; then
  echo "Error: worktree.branch not found in $BUG_JSON" >&2
  exit 2
fi

# vcs-scheme-switching: Read worktree.vcsScheme from bug.json
# Requirements: 5.5 - Default to "git" if not present
VCS_SCHEME=$(jq -r '.worktree.vcsScheme // "git"' "$BUG_JSON")
echo "VCS Scheme: $VCS_SCHEME"

echo "Bugfix branch: $BUGFIX_BRANCH"
echo "Current branch: $CURRENT_BRANCH"

# Phase 2: Update bug.json in worktree (Requirement 2.3)
# Note: bug.json does not have a phase field, only worktree deletion and updated_at
if [ -f "$WORKTREE_BUG_JSON" ]; then
  echo "Updating bug.json in worktree..."
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  jq --arg ts "$TIMESTAMP" '
    del(.worktree) |
    .updated_at = $ts
  ' "$WORKTREE_BUG_JSON" > "${WORKTREE_BUG_JSON}.tmp" && mv "${WORKTREE_BUG_JSON}.tmp" "$WORKTREE_BUG_JSON"
  echo "bug.json updated: worktree field removed, updated_at set"

  # Phase 2.5: Commit the changes in worktree (Requirement 2.4)
  echo "Committing bug.json changes in worktree..."
  (cd "$WORKTREE_PATH" && git add ".kiro/bugs/${BUG_NAME}/bug.json" && git commit -m "chore(${BUG_NAME}): update bug.json for deploy-complete") || {
    echo "Warning: Failed to commit bug.json changes in worktree (may already be committed)" >&2
  }
fi

# Phase 3: Perform merge based on recorded vcsScheme
# vcs-scheme-switching: Requirements 5.5, 5.6 - Use recorded scheme instead of auto-detection
echo "Merging branch $BUGFIX_BRANCH into $CURRENT_BRANCH..."

if [ "$VCS_SCHEME" = "jj" ]; then
  echo "Using jj for merge (recorded in bug.json)..."

  # Check if jj is available
  if ! command -v jj >/dev/null 2>&1; then
    echo "Error: jj is not installed but bug was created with jj. Please install jj." >&2
    exit 2
  fi

  # Use jj squash to merge
  if jj squash --from "$BUGFIX_BRANCH" --into "$CURRENT_BRANCH" 2>&1; then
    echo "jj squash completed"
  else
    EXIT_CODE=$?
    # Check if it's a conflict or other error
    if jj log --limit 1 2>&1 | grep -q "conflict"; then
      echo "Conflict detected during jj squash" >&2
      exit 1
    else
      echo "jj squash failed with exit code $EXIT_CODE" >&2
      exit 2
    fi
  fi

  # Commit the squashed changes
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "fix(${BUG_NAME}): merge from worktree branch ${BUGFIX_BRANCH}"
    echo "Changes committed to $CURRENT_BRANCH"
  fi

  # Phase 4: Cleanup for jj mode
  # jj bookmark delete and workspace forget
  echo "Cleaning up jj workspace..."
  jj bookmark delete "$BUGFIX_BRANCH" 2>&1 || echo "Warning: Failed to delete jj bookmark $BUGFIX_BRANCH" >&2
  jj workspace forget "$WORKTREE_PATH" 2>&1 || echo "Warning: Failed to forget jj workspace $WORKTREE_PATH" >&2

else
  # git mode (default)
  echo "Using git for merge (recorded in bug.json or default)..."

  # Use git merge --squash as fallback
  if git merge --squash "$BUGFIX_BRANCH" 2>&1; then
    echo "git merge --squash completed"
  else
    EXIT_CODE=$?
    # Check if it's a conflict (Requirement 6.5)
    if git status | grep -q "You have unmerged paths"; then
      echo "Conflict detected during git merge" >&2
      exit 1
    else
      echo "git merge failed with exit code $EXIT_CODE" >&2
      exit 2
    fi
  fi

  # Commit the merged changes
  if [ -n "$(git status --porcelain)" ]; then
    git commit -m "fix(${BUG_NAME}): merge from worktree branch ${BUGFIX_BRANCH}"
    echo "Changes committed to $CURRENT_BRANCH"
  fi

  # Phase 4: Cleanup worktree for git mode (Requirement 2.7, 6.6)
  if [ -d "$WORKTREE_PATH" ]; then
    if git worktree remove "$WORKTREE_PATH" 2>&1; then
      echo "Worktree removed: $WORKTREE_PATH"
    else
      echo "Warning: Failed to remove worktree $WORKTREE_PATH (you may need to clean up manually)" >&2
      # Continue execution (non-fatal)
    fi
  else
    echo "Worktree path not found: $WORKTREE_PATH (may already be removed)"
  fi

  # Phase 5: Cleanup bugfix branch for git mode (Requirement 2.8, 6.7)
  if git show-ref --verify --quiet "refs/heads/$BUGFIX_BRANCH"; then
    if git branch -D "$BUGFIX_BRANCH" 2>&1; then
      echo "Bugfix branch deleted: $BUGFIX_BRANCH"
    else
      echo "Warning: Failed to delete branch $BUGFIX_BRANCH (you may need to clean up manually)" >&2
      # Continue execution (non-fatal)
    fi
  else
    echo "Bugfix branch not found: $BUGFIX_BRANCH (may already be deleted)"
  fi
fi

echo "Success: Merge completed, worktree and branch cleaned up"
exit 0
